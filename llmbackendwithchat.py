from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from azureModels import llm
import json
import asyncio
import base64
from pathlib import Path
from io import BytesIO
import PyPDF2
import re

app = FastAPI()

# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Simple LLM Graph (no tools)
# ---------------------------------------------------------
def call_model(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}

def route(_):
    return END

builder = StateGraph(MessagesState)
builder.add_node("agent", call_model)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route, {END: END})
graph = builder.compile()

# ---------------------------------------------------------
# Link extraction function
# ---------------------------------------------------------
# ---------------------------------------------------------
# Simulated Useful Links (no LLM)
# ---------------------------------------------------------
async def extract_useful_links(response_text: str, user_query: str) -> List[dict]:
    """
    Return 5 simulated useful links instead of asking an LLM.
    """
    return [
        {
            "title": "OpenAI Documentation",
            "url": "https://platform.openai.com/docs",
            "description": "Official OpenAI API documentation and usage examples."
        },
        {
            "title": "FastAPI Tutorial",
            "url": "https://fastapi.tiangolo.com/learn/",
            "description": "Learn how to build APIs using FastAPI."
        },
        {
            "title": "React Documentation",
            "url": "https://react.dev/",
            "description": "Official React documentation with guides and examples."
        },
        {
            "title": "MDN Web Docs – JavaScript Guide",
            "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            "description": "Comprehensive JavaScript reference and tutorials."
        },
        {
            "title": "Python AsyncIO Guide",
            "url": "https://docs.python.org/3/library/asyncio.html",
            "description": "Official Python guide to asynchronous programming."
        }
    ]


# ---------------------------------------------------------
# Thinking simulation
# ---------------------------------------------------------
async def simulate_thinking_steps(user_message: str, has_files: bool = False):
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
            "📊 Step 3: Referencing available context...",
            "⚙️ Step 4: Processing information...",
            "✨ Step 5: Formulating comprehensive response..."
        ]

    for step in steps:
        yield f"data: {json.dumps({'type': 'thinking', 'content': step + '\n'})}\n\n"
        await asyncio.sleep(0.3)


# ---------------------------------------------------------
# File Extractors
# ---------------------------------------------------------
async def extract_pdf_text(content: bytes) -> str:
    try:
        pdf = PyPDF2.PdfReader(BytesIO(content))
        result = []

        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            result.append(f"--- Page {i}/{len(pdf.pages)} ---\n{text}")

        return "\n\n".join(result).strip() or "Empty PDF"
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"


async def process_file(file: UploadFile) -> dict:
    content = await file.read()
    ext = Path(file.filename).suffix.lower()

    # Images
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
        base64_img = base64.b64encode(content).decode()
        return {
            "type": "image",
            "filename": file.filename,
            "mime_type": file.content_type,
            "content": base64_img
        }

    # Simple text
    if ext in ['.txt', '.md', '.csv', '.json']:
        try:
            return {
                "type": "text",
                "filename": file.filename,
                "content": content.decode('utf-8')
            }
        except:
            return {
                "type": "text",
                "filename": file.filename,
                "content": "Could not decode text file"
            }

    # PDF
    if ext == ".pdf":
        text = await extract_pdf_text(content)
        pdf = PyPDF2.PdfReader(BytesIO(content))
        return {
            "type": "text",
            "filename": file.filename,
            "content": text,
            "pages": len(pdf.pages)
        }

    # DOCX
    if ext == ".docx":
        try:
            import docx
            doc = docx.Document(BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return {
                "type": "text",
                "filename": file.filename,
                "content": "\n".join(paragraphs) or "No text found"
            }
        except:
            return {
                "type": "document",
                "filename": file.filename,
                "content": "Install python-docx to extract .docx"
            }

    return {
        "type": "unknown",
        "filename": file.filename,
        "content": "Unsupported file type"
    }


# ---------------------------------------------------------
# Construct message for LLM
# ---------------------------------------------------------
def create_message_with_files(user_message: str, files: List[dict]):
    if not files:
        return HumanMessage(content=user_message)

    parts = []

    if user_message:
        parts.append({"type": "text", "text": user_message})

    for f in files:
        if f["type"] == "image":
            parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{f['mime_type']};base64,{f['content']}"
                }
            })
        else:
            parts.append({
                "type": "text",
                "text": f"\n\n===== FILE: {f['filename']} =====\n{f['content']}\n==============================\n"
            })

    return HumanMessage(content=parts)


# ---------------------------------------------------------
# Chat Endpoint
# ---------------------------------------------------------
@app.post("/chat")
async def chat(
    message: str = Form(""),
    files: Optional[List[UploadFile]] = File(None)
):
    processed_files = []

    if files:
        for file in files:
            processed_files.append(await process_file(file))

    human_message = create_message_with_files(message, processed_files)

    async def generate():
        # Thinking Start
        yield f"data: {json.dumps({'type': 'thinking_start'})}\n\n"

        # Thinking steps
        async for event in simulate_thinking_steps(message, has_files=len(processed_files) > 0):
            yield event

        yield f"data: {json.dumps({'type': 'thinking_end'})}\n\n"
        yield f"data: {json.dumps({'type': 'answer_start'})}\n\n"

        # Collect the response text for link generation
        full_response = ""

        # Actual model output
        async for event in graph.astream_events({"messages": [human_message]}, version="v2"):
            if event.get("event") == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                text = chunk.content if hasattr(chunk, "content") else ""
                if text:
                    full_response += text
                    yield f"data: {json.dumps({'type': 'answer', 'content': text})}\n\n"
                    await asyncio.sleep(0.02)

        # Generate useful links based on the response
        links = await extract_useful_links(full_response, message)
        
        if links:
            yield f"data: {json.dumps({'type': 'links', 'links': links})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ---------------------------------------------------------
# Run
# ---------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
