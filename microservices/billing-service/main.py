#!/usr/bin/env python3
"""
Billing Service - Usage Tracking and Cost Management
Port: 8003
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(
    title="Billing Service",
    description="Usage Tracking and Cost Management",
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
usage_db = {}
billing_db = {}

# Model pricing (per 1K tokens)
MODEL_PRICING = {
    "gpt-4-turbo": 0.01,
    "gpt-3.5-turbo": 0.002,
    "claude-3-sonnet": 0.015,
    "claude-3-haiku": 0.0025,
    "gemini-pro": 0.0005
}

# Sample data
sample_usage = [
    {
        "id": "usage-1",
        "agent_id": "agent-1",
        "tokens_used": 245,
        "model": "gpt-4-turbo",
        "conversation_id": "healthcare-conv-123",
        "cost": 0.00245,
        "timestamp": "2025-01-20T09:15:00Z"
    },
    {
        "id": "usage-2", 
        "agent_id": "agent-2",
        "tokens_used": 180,
        "model": "gpt-3.5-turbo",
        "conversation_id": "retail-conv-456",
        "cost": 0.00036,
        "timestamp": "2025-01-20T14:30:00Z"
    }
]

for usage in sample_usage:
    usage_db[usage["id"]] = usage

class UsageData(BaseModel):
    agent_id: str
    tokens_used: int = Field(..., ge=0)
    model: str = Field(..., pattern=r"^(gpt-4-turbo|gpt-3.5-turbo|claude-3-sonnet|claude-3-haiku|gemini-pro)$")
    conversation_id: Optional[str] = None

class CostEstimation(BaseModel):
    tokens: int = Field(..., ge=0)
    model: str = Field(..., pattern=r"^(gpt-4-turbo|gpt-3.5-turbo|claude-3-sonnet|claude-3-haiku|gemini-pro)$")

@app.get("/health")
async def health_check():
    return {
        "service": "billing-service",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "usage_records": len(usage_db)
    }

@app.post("/api/billing/usage", status_code=201)
async def track_usage(usage_data: UsageData):
    usage_id = f"usage-{uuid.uuid4().hex[:8]}"
    
    # Calculate cost
    cost_per_1k = MODEL_PRICING.get(usage_data.model, 0)
    cost = (usage_data.tokens_used / 1000) * cost_per_1k
    
    usage = {
        "id": usage_id,
        "agent_id": usage_data.agent_id,
        "tokens_used": usage_data.tokens_used,
        "model": usage_data.model,
        "conversation_id": usage_data.conversation_id,
        "cost": cost,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    usage_db[usage_id] = usage
    return usage

@app.get("/api/billing/summary")
async def get_billing_summary():
    all_usage = list(usage_db.values())
    
    total_cost = sum(u["cost"] for u in all_usage)
    total_tokens = sum(u["tokens_used"] for u in all_usage)
    
    # Agent breakdown
    agent_costs = {}
    for usage in all_usage:
        agent_id = usage["agent_id"]
        if agent_id not in agent_costs:
            agent_costs[agent_id] = {"cost": 0, "tokens": 0, "conversations": 0}
        
        agent_costs[agent_id]["cost"] += usage["cost"]
        agent_costs[agent_id]["tokens"] += usage["tokens_used"]
        agent_costs[agent_id]["conversations"] += 1
    
    # Model breakdown
    model_costs = {}
    for usage in all_usage:
        model = usage["model"]
        if model not in model_costs:
            model_costs[model] = {"cost": 0, "tokens": 0, "usage_count": 0}
        
        model_costs[model]["cost"] += usage["cost"]
        model_costs[model]["tokens"] += usage["tokens_used"]
        model_costs[model]["usage_count"] += 1
    
    return {
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "total_usage_records": len(all_usage),
        "agent_breakdown": agent_costs,
        "model_breakdown": model_costs,
        "generated_at": datetime.utcnow().isoformat()
    }

@app.post("/api/billing/estimate")
async def estimate_cost(estimation: CostEstimation):
    cost_per_1k = MODEL_PRICING.get(estimation.model, 0)
    estimated_cost = (estimation.tokens / 1000) * cost_per_1k
    
    return {
        "tokens": estimation.tokens,
        "model": estimation.model,
        "cost_per_1k_tokens": cost_per_1k,
        "estimated_cost": estimated_cost
    }

@app.get("/api/billing/agents/{agent_id}/usage")
async def get_agent_usage(agent_id: str):
    agent_usage = [u for u in usage_db.values() if u["agent_id"] == agent_id]
    
    if not agent_usage:
        return {
            "agent_id": agent_id,
            "total_cost": 0,
            "total_tokens": 0,
            "usage_records": 0,
            "usage_history": []
        }
    
    total_cost = sum(u["cost"] for u in agent_usage)
    total_tokens = sum(u["tokens_used"] for u in agent_usage)
    
    return {
        "agent_id": agent_id,
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "usage_records": len(agent_usage),
        "usage_history": sorted(agent_usage, key=lambda x: x["timestamp"], reverse=True)
    }

@app.get("/api/billing/models")
async def get_model_pricing():
    return {
        "models": [
            {"id": model, "cost_per_1k_tokens": price}
            for model, price in MODEL_PRICING.items()
        ],
        "currency": "USD"
    }

if __name__ == "__main__":
    print("Starting Billing Service on http://0.0.0.0:8003")
    uvicorn.run(app, host="0.0.0.0", port=8003)