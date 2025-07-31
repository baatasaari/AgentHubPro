#!/usr/bin/env python3
"""
Usage Analytics Service
Ultra-focused microservice for usage statistics calculation only
Extracted from routes.ts usage stats logic
Target: <130 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any
import uvicorn
import logging
from datetime import datetime, timedelta
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Usage Analytics Service", description="Ultra-focused usage analytics", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class UsageRecord(BaseModel):
    agentId: int
    tokensUsed: int
    cost: float
    timestamp: str
    operation: str

class UsageStats(BaseModel):
    totalConversations: int
    totalCost: float
    activeAgents: int
    monthlyUsage: List[Dict[str, Any]]

# Usage data storage
usage_records = []
agent_stats = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "usage-analytics", "total_records": len(usage_records)}

@app.post("/api/usage/record")
async def record_usage(usage: UsageRecord):
    """Record usage statistics"""
    try:
        usage_data = usage.model_dump()
        usage_records.append(usage_data)
        
        # Update agent statistics
        agent_id = usage.agentId
        if agent_id not in agent_stats:
            agent_stats[agent_id] = {
                "conversations": 0,
                "totalTokens": 0,
                "totalCost": 0.0,
                "lastActivity": usage.timestamp
            }
        
        agent_stats[agent_id]["conversations"] += 1
        agent_stats[agent_id]["totalTokens"] += usage.tokensUsed
        agent_stats[agent_id]["totalCost"] += usage.cost
        agent_stats[agent_id]["lastActivity"] = usage.timestamp
        
        logger.info(f"Recorded usage for agent {agent_id}: {usage.tokensUsed} tokens, ${usage.cost}")
        return {"success": True, "recorded_usage": usage_data}
        
    except Exception as e:
        logger.error(f"Usage recording failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/usage/stats")
async def get_usage_stats():
    """Get comprehensive usage statistics"""
    try:
        total_conversations = len(usage_records)
        total_cost = sum(record["cost"] for record in usage_records)
        active_agents = len(agent_stats)
        
        # Calculate monthly usage per agent
        monthly_usage = []
        for agent_id, stats in agent_stats.items():
            monthly_usage.append({
                "agentId": agent_id,
                "conversations": stats["conversations"],
                "cost": round(stats["totalCost"], 4),
                "tokens": stats["totalTokens"]
            })
        
        # Sort by cost descending
        monthly_usage.sort(key=lambda x: x["cost"], reverse=True)
        
        usage_stats = UsageStats(
            totalConversations=total_conversations,
            totalCost=round(total_cost, 4),
            activeAgents=active_agents,
            monthlyUsage=monthly_usage
        )
        
        return usage_stats.model_dump()
        
    except Exception as e:
        logger.error(f"Usage stats calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/usage/agent/{agent_id}")
async def get_agent_usage(agent_id: int):
    """Get usage statistics for specific agent"""
    try:
        if agent_id not in agent_stats:
            return {
                "agentId": agent_id,
                "conversations": 0,
                "totalTokens": 0,
                "totalCost": 0.0,
                "averageCostPerConversation": 0.0,
                "lastActivity": None
            }
        
        stats = agent_stats[agent_id]
        avg_cost = stats["totalCost"] / stats["conversations"] if stats["conversations"] > 0 else 0
        
        return {
            "agentId": agent_id,
            "conversations": stats["conversations"],
            "totalTokens": stats["totalTokens"],
            "totalCost": round(stats["totalCost"], 4),
            "averageCostPerConversation": round(avg_cost, 4),
            "lastActivity": stats["lastActivity"]
        }
        
    except Exception as e:
        logger.error(f"Agent usage retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/usage/trends")
async def get_usage_trends():
    """Get usage trends over time"""
    try:
        # Group usage by day
        daily_usage = {}
        for record in usage_records:
            date = record["timestamp"][:10]  # Get YYYY-MM-DD
            if date not in daily_usage:
                daily_usage[date] = {"conversations": 0, "cost": 0.0, "tokens": 0}
            
            daily_usage[date]["conversations"] += 1
            daily_usage[date]["cost"] += record["cost"]
            daily_usage[date]["tokens"] += record["tokensUsed"]
        
        # Convert to sorted list
        trends = []
        for date, stats in sorted(daily_usage.items()):
            trends.append({
                "date": date,
                "conversations": stats["conversations"],
                "cost": round(stats["cost"], 4),
                "tokens": stats["tokens"]
            })
        
        return {"trends": trends, "total_days": len(trends)}
        
    except Exception as e:
        logger.error(f"Usage trends calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/usage/summary")
async def get_usage_summary():
    """Get usage summary metrics"""
    try:
        if not usage_records:
            return {"message": "No usage data available"}
        
        total_records = len(usage_records)
        total_cost = sum(record["cost"] for record in usage_records)
        total_tokens = sum(record["tokensUsed"] for record in usage_records)
        avg_cost_per_conversation = total_cost / total_records if total_records > 0 else 0
        
        return {
            "totalRecords": total_records,
            "totalCost": round(total_cost, 4),
            "totalTokens": total_tokens,
            "averageCostPerConversation": round(avg_cost_per_conversation, 4),
            "activeAgents": len(agent_stats)
        }
        
    except Exception as e:
        logger.error(f"Usage summary calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8103))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)