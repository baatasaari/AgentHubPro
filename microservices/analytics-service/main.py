#!/usr/bin/env python3
"""
Analytics Service - Conversation Tracking and Performance Metrics
Port: 8002
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(
    title="Analytics Service",
    description="Conversation Tracking and Performance Metrics",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
conversations_db = {}
metrics_db = {}

# Sample data
sample_conversations = [
    {
        "id": "conv-1",
        "agent_id": "agent-1",
        "conversation_id": "healthcare-conv-123",
        "message_count": 8,
        "tokens_used": 245,
        "cost": 0.00245,
        "response_time": 1.2,
        "user_satisfaction": 4.8,
        "conversation_type": "patient_inquiry",
        "started_at": "2025-01-20T09:15:00Z",
        "ended_at": "2025-01-20T09:25:00Z"
    },
    {
        "id": "conv-2",
        "agent_id": "agent-2",
        "conversation_id": "retail-conv-456",
        "message_count": 5,
        "tokens_used": 180,
        "cost": 0.00036,
        "response_time": 0.8,
        "user_satisfaction": 4.2,
        "conversation_type": "customer_support",
        "started_at": "2025-01-20T14:30:00Z",
        "ended_at": "2025-01-20T14:35:00Z"
    }
]

for conv in sample_conversations:
    conversations_db[conv["id"]] = conv

# Models
class ConversationData(BaseModel):
    agent_id: str
    conversation_id: str
    message_count: int = Field(..., ge=1)
    tokens_used: int = Field(..., ge=0)
    cost: float = Field(..., ge=0)
    response_time: Optional[float] = None
    user_satisfaction: Optional[float] = Field(None, ge=1, le=5)
    conversation_type: Optional[str] = None

@app.get("/health")
async def health_check():
    return {
        "service": "analytics-service",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "conversations_tracked": len(conversations_db)
    }

@app.post("/api/analytics/conversations", status_code=201)
async def track_conversation(conversation_data: ConversationData):
    conversation_id = f"conv-{uuid.uuid4().hex[:8]}"
    
    conversation = {
        "id": conversation_id,
        "agent_id": conversation_data.agent_id,
        "conversation_id": conversation_data.conversation_id,
        "message_count": conversation_data.message_count,
        "tokens_used": conversation_data.tokens_used,
        "cost": conversation_data.cost,
        "response_time": conversation_data.response_time,
        "user_satisfaction": conversation_data.user_satisfaction,
        "conversation_type": conversation_data.conversation_type,
        "tracked_at": datetime.utcnow().isoformat()
    }
    
    conversations_db[conversation_id] = conversation
    return conversation

@app.get("/api/analytics/conversations")
async def get_conversations(agent_id: Optional[str] = None, limit: int = 50):
    conversations = list(conversations_db.values())
    
    if agent_id:
        conversations = [c for c in conversations if c["agent_id"] == agent_id]
    
    return conversations[:limit]

@app.get("/api/analytics/agents/{agent_id}/performance")
async def get_agent_performance(agent_id: str):
    agent_conversations = [c for c in conversations_db.values() if c["agent_id"] == agent_id]
    
    if not agent_conversations:
        return {
            "agent_id": agent_id,
            "conversation_count": 0,
            "total_tokens": 0,
            "total_cost": 0,
            "avg_response_time": 0,
            "avg_satisfaction": 0,
            "performance_trend": "no_data"
        }
    
    total_conversations = len(agent_conversations)
    total_tokens = sum(c["tokens_used"] for c in agent_conversations)
    total_cost = sum(c["cost"] for c in agent_conversations)
    
    response_times = [c["response_time"] for c in agent_conversations if c["response_time"]]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    satisfactions = [c["user_satisfaction"] for c in agent_conversations if c["user_satisfaction"]]
    avg_satisfaction = sum(satisfactions) / len(satisfactions) if satisfactions else 0
    
    return {
        "agent_id": agent_id,
        "conversation_count": total_conversations,
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "avg_response_time": avg_response_time,
        "avg_satisfaction": avg_satisfaction,
        "performance_trend": "improving" if avg_satisfaction > 4.0 else "stable"
    }

@app.get("/api/analytics/usage")
async def get_usage_metrics():
    all_conversations = list(conversations_db.values())
    
    total_conversations = len(all_conversations)
    total_tokens = sum(c["tokens_used"] for c in all_conversations)
    total_cost = sum(c["cost"] for c in all_conversations)
    
    # Agent breakdown
    agent_stats = {}
    for conv in all_conversations:
        agent_id = conv["agent_id"]
        if agent_id not in agent_stats:
            agent_stats[agent_id] = {"conversations": 0, "tokens": 0, "cost": 0}
        
        agent_stats[agent_id]["conversations"] += 1
        agent_stats[agent_id]["tokens"] += conv["tokens_used"]
        agent_stats[agent_id]["cost"] += conv["cost"]
    
    return {
        "total_conversations": total_conversations,
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "agent_breakdown": agent_stats,
        "generated_at": datetime.utcnow().isoformat()
    }

@app.get("/api/analytics/dashboard")
async def get_analytics_dashboard():
    all_conversations = list(conversations_db.values())
    
    # Recent activity (last 24 hours)
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    
    recent_conversations = [
        c for c in all_conversations 
        if "tracked_at" in c and datetime.fromisoformat(c["tracked_at"].replace('Z', '+00:00')) > day_ago
    ]
    
    # Top performing agents
    agent_performance = {}
    for conv in all_conversations:
        agent_id = conv["agent_id"]
        if agent_id not in agent_performance:
            agent_performance[agent_id] = []
        
        if conv.get("user_satisfaction"):
            agent_performance[agent_id].append(conv["user_satisfaction"])
    
    top_agents = []
    for agent_id, satisfactions in agent_performance.items():
        if satisfactions:
            avg_satisfaction = sum(satisfactions) / len(satisfactions)
            top_agents.append({
                "agent_id": agent_id,
                "avg_satisfaction": avg_satisfaction,
                "conversation_count": len(satisfactions)
            })
    
    top_agents.sort(key=lambda x: x["avg_satisfaction"], reverse=True)
    
    return {
        "total_conversations": len(all_conversations),
        "recent_conversations": len(recent_conversations),
        "top_performing_agents": top_agents[:5],
        "average_satisfaction": sum(c.get("user_satisfaction", 0) for c in all_conversations if c.get("user_satisfaction")) / len([c for c in all_conversations if c.get("user_satisfaction")]) if all_conversations else 0,
        "last_updated": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print("Starting Analytics Service on http://0.0.0.0:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)