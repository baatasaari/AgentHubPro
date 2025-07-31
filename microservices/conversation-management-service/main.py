#!/usr/bin/env python3
"""
Conversation Management Service
Ultra-focused microservice for conversation lifecycle only
Extracted from routes.ts (lines 323-370)
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Conversation Management Service", description="Ultra-focused conversation management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Conversation(BaseModel):
    id: int
    agentId: int
    tokensUsed: int
    cost: float
    timestamp: str

class ConversationCreate(BaseModel):
    agentId: int
    tokensUsed: int
    cost: float

# In-memory conversation storage
conversations = {}
conversation_counter = 10

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "conversation-management", "total_conversations": len(conversations)}

@app.get("/api/conversations/{agent_id}")
async def get_conversations_by_agent(agent_id: int):
    """Get all conversations for a specific agent"""
    try:
        agent_conversations = [conv for conv in conversations.values() 
                             if conv["agentId"] == agent_id]
        
        return {
            "agentId": agent_id,
            "conversations": agent_conversations,
            "total": len(agent_conversations)
        }
        
    except Exception as e:
        logger.error(f"Conversation retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations")
async def create_conversation(conversation_data: ConversationCreate):
    """Create new conversation record"""
    try:
        global conversation_counter
        conversation_counter += 1
        
        conversation = Conversation(
            id=conversation_counter,
            agentId=conversation_data.agentId,
            tokensUsed=conversation_data.tokensUsed,
            cost=conversation_data.cost,
            timestamp=datetime.now().isoformat()
        )
        
        conversations[conversation_counter] = conversation.model_dump()
        
        logger.info(f"Created conversation {conversation_counter} for agent {conversation_data.agentId}")
        return {"success": True, "conversation": conversation}
        
    except Exception as e:
        logger.error(f"Conversation creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/stats")
async def get_conversation_stats():
    """Get conversation statistics"""
    try:
        total_conversations = len(conversations)
        total_cost = sum(conv["cost"] for conv in conversations.values())
        total_tokens = sum(conv["tokensUsed"] for conv in conversations.values())
        
        agent_stats = {}
        for conv in conversations.values():
            agent_id = conv["agentId"]
            if agent_id not in agent_stats:
                agent_stats[agent_id] = {"conversations": 0, "cost": 0, "tokens": 0}
            
            agent_stats[agent_id]["conversations"] += 1
            agent_stats[agent_id]["cost"] += conv["cost"]
            agent_stats[agent_id]["tokens"] += conv["tokensUsed"]
        
        return {
            "totalConversations": total_conversations,
            "totalCost": round(total_cost, 4),
            "totalTokens": total_tokens,
            "agentStats": agent_stats
        }
        
    except Exception as e:
        logger.error(f"Stats calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: int):
    """Get specific conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversations[conversation_id]

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8102))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)