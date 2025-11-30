from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode
from azureModels import llm
import json
import asyncio

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

class ChatRequest(BaseModel):
    message: str

async def simulate_thinking_steps(user_message: str):
    """Simulate 5 thinking steps with delays"""
    steps = [
        "🔍 Step 1: Analyzing user query...",
        "🧠 Step 2: Understanding context and intent...",
        "📊 Step 3: Checking available tools and resources...",
        "⚙️ Step 4: Processing information...",
        "✨ Step 5: Formulating comprehensive response..."
    ]
    
    for step in steps:
        yield f"data: {json.dumps({'type': 'thinking', 'content': step + '\n'})}\n\n"
        await asyncio.sleep(0.8)  # Wait 0.8 seconds between each step

@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        # Start thinking phase
        yield f"data: {json.dumps({'type': 'thinking_start'})}\n\n"
        await asyncio.sleep(0.3)
        
        # Show simulated thinking steps
        async for step_event in simulate_thinking_steps(request.message):
            yield step_event
        
        # Small pause before ending thinking
        await asyncio.sleep(0.5)
        
        # End thinking phase
        yield f"data: {json.dumps({'type': 'thinking_end'})}\n\n"
        yield f"data: {json.dumps({'type': 'answer_start'})}\n\n"
        await asyncio.sleep(0.2)
        
        # Now stream the actual answer
        thinking_phase = False
        answer_started = True
        current_node = None
        
        messages = [
            HumanMessage(content=request.message)
        ]
        
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
            
            # Stream tool invocation info (optional, can be removed)
            if kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event.get("data", {}).get("input", {})
                # Silently process tools, already shown in thinking steps
                pass
            
            # Capture agent's response tokens
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk", {})
                content = chunk.content if hasattr(chunk, 'content') else ""
                
                if content:
                    # Stream as answer
                    yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"
                    await asyncio.sleep(0.02)  # Small delay for smooth streaming
        
        # Signal completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
