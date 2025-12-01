from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal, List, Optional
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode
from azureModels import llm
import json
import asyncio
import base64
from pathlib import Path
from io import BytesIO
import PyPDF2

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@tool
def get_weather(city: Literal["nyc", "sf"]) -> str:
    """Get weather for a city."""
    if city == "nyc":
        return "Cloudy in NYC"
    return "Sunny in SF"

# Setup graph
tools = [get_weather]
model = llm.bind_tools(tools)
tool_node = ToolNode(tools)

def route(state: MessagesState):
    if state["messages"][-1].tool_calls:
        return "tools"
    return END

def call_model(state: MessagesState):
    return {"messages": [model.invoke(state["messages"])]}

builder = StateGraph(MessagesState)
builder.add_node("agent", call_model)
builder.add_node("tools", tool_node)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route, {"tools": "tools", END: END})
builder.add_edge("tools", "agent")
graph = builder.compile()

async def simulate_thinking_steps(user_message: str, has_files: bool = False):
    """Simulate 5 thinking steps with delays"""
    if has_files:
        steps = [
            "🔍 Step 1: Processing uploaded files...",
            "🧠 Step 2: Analyzing file content and user query...",
            "📊 Step 3: Extracting relevant information...",
            "⚙️ Step 4: Correlating file data with request...",
            "✨ Step 5: Formulating comprehensive response..."
        ]
    else:
        steps = [
            "🔍 Step 1: Analyzing user query...",
            "🧠 Step 2: Understanding context and intent...",
            "📊 Step 3: Checking available tools and resources...",
            "⚙️ Step 4: Processing information...",
            "✨ Step 5: Formulating comprehensive response..."
        ]
    
    for step in steps:
        yield f"data: {json.dumps({'type': 'thinking', 'content': step + '\n'})}\n\n"
        await asyncio.sleep(0.8)

async def extract_pdf_text(content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text_content = []
        total_pages = len(pdf_reader.pages)
        
        for page_num, page in enumerate(pdf_reader.pages, 1):
            page_text = page.extract_text()
            if page_text.strip():
                text_content.append(f"--- Page {page_num}/{total_pages} ---\n{page_text}")
        
        if text_content:
            return "\n\n".join(text_content)
        else:
            return "PDF content could not be extracted (possibly empty or scanned document)"
    
    except Exception as e:
        return f"Error extracting PDF content: {str(e)}"

async def process_file(file: UploadFile) -> dict:
    """Process uploaded file and return content"""
    content = await file.read()
    file_extension = Path(file.filename).suffix.lower()
    
    # Handle images
    if file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
        # Encode image to base64
        base64_image = base64.b64encode(content).decode('utf-8')
        return {
            "type": "image",
            "filename": file.filename,
            "content": base64_image,
            "mime_type": file.content_type
        }
    
    # Handle text files
    elif file_extension in ['.txt', '.md', '.csv', '.json']:
        try:
            text_content = content.decode('utf-8')
            return {
                "type": "text",
                "filename": file.filename,
                "content": text_content
            }
        except Exception as e:
            return {
                "type": "unknown",
                "filename": file.filename,
                "content": f"Could not read file content: {str(e)}"
            }
    
    # Handle PDFs
    elif file_extension == '.pdf':
        pdf_text = await extract_pdf_text(content)
        return {
            "type": "text",
            "filename": file.filename,
            "content": pdf_text,
            "pages": len(PyPDF2.PdfReader(BytesIO(content)).pages) if pdf_text else 0
        }
    
    # Handle Word documents (.docx)
    elif file_extension == '.docx':
        try:
            import docx
            doc = docx.Document(BytesIO(content))
            text_content = []
            
            for para in doc.paragraphs:
                if para.text.strip():
                    text_content.append(para.text)
            
            return {
                "type": "text",
                "filename": file.filename,
                "content": "\n\n".join(text_content) if text_content else "No text content found in document"
            }
        except ImportError:
            return {
                "type": "document",
                "filename": file.filename,
                "content": f"Document file: {file.filename} (Install python-docx to read .docx files)"
            }
        except Exception as e:
            return {
                "type": "document",
                "filename": file.filename,
                "content": f"Error reading .docx file: {str(e)}"
            }
    
    # Handle old Word documents (.doc) - requires additional library
    elif file_extension == '.doc':
        return {
            "type": "document",
            "filename": file.filename,
            "content": f"Legacy .doc format detected. Please convert to .docx or .pdf for text extraction. File size: {len(content)} bytes"
        }
    
    else:
        return {
            "type": "unknown",
            "filename": file.filename,
            "content": f"Unsupported file type: {file.filename}"
        }

def create_message_with_files(user_message: str, processed_files: List[dict]) -> HumanMessage:
    """Create a message with text and file content for the LLM"""
    
    if not processed_files:
        return HumanMessage(content=user_message if user_message else "")
    
    # Build message content with files
    content_parts = []
    
    # Add user text message
    if user_message:
        content_parts.append({
            "type": "text",
            "text": user_message
        })
    
    # Add file information
    for file_data in processed_files:
        if file_data["type"] == "image":
            # Add image for vision models
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{file_data['mime_type']};base64,{file_data['content']}"
                }
            })
        elif file_data["type"] == "text":
            # Add text file content (including PDF text)
            file_header = f"\n\n{'='*60}\n"
            file_header += f"FILE: {file_data['filename']}\n"
            if 'pages' in file_data:
                file_header += f"PAGES: {file_data['pages']}\n"
            file_header += f"{'='*60}\n\n"
            
            content_parts.append({
                "type": "text",
                "text": file_header + file_data['content'] + f"\n\n{'='*60}\n"
            })
        else:
            # Add file info for other types
            content_parts.append({
                "type": "text",
                "text": f"\n\nAttached file: {file_data['filename']}\n{file_data['content']}\n"
            })
    
    # If only one text part, return simple message
    if len(content_parts) == 1 and content_parts[0]["type"] == "text":
        return HumanMessage(content=content_parts[0]["text"])
    
    # Return multimodal message
    return HumanMessage(content=content_parts)

@app.post("/chat")
async def chat(
    message: str = Form(""),
    files: Optional[List[UploadFile]] = File(None)
):
    # IMPORTANT: Process files BEFORE creating the generator
    processed_files = []
    if files:
        for file in files:
            file_data = await process_file(file)
            processed_files.append(file_data)
    
    # Create the message with processed files
    human_message = create_message_with_files(message, processed_files)
    
    async def generate():
        # Start thinking phase
        yield f"data: {json.dumps({'type': 'thinking_start'})}\n\n"
        await asyncio.sleep(0.3)
        
        # Show simulated thinking steps
        async for step_event in simulate_thinking_steps(message, has_files=len(processed_files) > 0):
            yield step_event
        
        # Small pause before ending thinking
        await asyncio.sleep(0.5)
        
        # End thinking phase
        yield f"data: {json.dumps({'type': 'thinking_end'})}\n\n"
        yield f"data: {json.dumps({'type': 'answer_start'})}\n\n"
        await asyncio.sleep(0.2)
        
        # Now stream the actual answer
        messages = [human_message]
        
        async for event in graph.astream_events(
            {"messages": messages},
            version="v2"
        ):
            kind = event.get("event")
            
            # Track which node we're in
            if kind == "on_chain_start":
                node_name = event.get("name", "")
                if "agent" in node_name.lower():
                    current_node = "agent"
            
            # Stream tool invocation info (optional)
            if kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event.get("data", {}).get("input", {})
                # Silently process tools
                pass
            
            # Capture agent's response tokens
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk", {})
                content = chunk.content if hasattr(chunk, 'content') else ""
                
                if content:
                    # Stream as answer
                    yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"
                    await asyncio.sleep(0.02)
        
        # Signal completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
