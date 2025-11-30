from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode
from azureModels import llm
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins - change to specific URL in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
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

@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        async for event in graph.astream_events(
            {"messages": [HumanMessage(content=request.message)]},
            version="v2"
        ):
            kind = event.get("event")
            
            # Stream tokens from the model
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
