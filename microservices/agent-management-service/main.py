#!/usr/bin/env python3
"""
Agent Management Service
Ultra-focused microservice for agent lifecycle management only
Extracted from routes.ts (lines 166-275)
Target: <120 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Management Service", description="Ultra-focused agent lifecycle management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Agent(BaseModel):
    id: int
    businessName: str
    businessDescription: str
    businessDomain: str
    industry: str
    llmModel: str
    interfaceType: str
    status: str
    createdAt: str

class AgentCreate(BaseModel):
    businessName: str
    businessDescription: str
    businessDomain: str
    industry: str
    llmModel: str
    interfaceType: str

class AgentUpdate(BaseModel):
    businessName: Optional[str] = None
    businessDescription: Optional[str] = None
    businessDomain: Optional[str] = None
    industry: Optional[str] = None
    llmModel: Optional[str] = None
    interfaceType: Optional[str] = None

# In-memory agent storage
agents = {}
agent_counter = 3

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent-management", "total_agents": len(agents)}

@app.get("/api/agents")
async def get_all_agents():
    """Get all agents"""
    return {"agents": list(agents.values()), "total": len(agents)}

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: int):
    """Get specific agent"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents[agent_id]

@app.post("/api/agents")
async def create_agent(agent_data: AgentCreate):
    """Create new agent"""
    try:
        global agent_counter
        agent_counter += 1
        
        agent = Agent(
            id=agent_counter,
            businessName=agent_data.businessName,
            businessDescription=agent_data.businessDescription,
            businessDomain=agent_data.businessDomain,
            industry=agent_data.industry,
            llmModel=agent_data.llmModel,
            interfaceType=agent_data.interfaceType,
            status="draft",
            createdAt=datetime.now().isoformat()
        )
        
        agents[agent_counter] = agent.model_dump()
        
        logger.info(f"Created agent {agent_counter}: {agent_data.businessName}")
        return {"success": True, "agent": agent}
        
    except Exception as e:
        logger.error(f"Agent creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/agents/{agent_id}")
async def update_agent(agent_id: int, updates: AgentUpdate):
    """Update agent"""
    try:
        if agent_id not in agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agents[agent_id]
        update_data = updates.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if value is not None:
                agent[key] = value
        
        logger.info(f"Updated agent {agent_id}")
        return {"success": True, "agent": agent}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/agents/{agent_id}/status")
async def update_agent_status(agent_id: int, status_data: dict):
    """Update agent status"""
    try:
        if agent_id not in agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        status = status_data.get("status")
        if status not in ["draft", "active", "paused"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        agents[agent_id]["status"] = status
        
        logger.info(f"Updated agent {agent_id} status to {status}")
        return {"success": True, "agent": agents[agent_id]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: int):
    """Delete agent"""
    try:
        if agent_id not in agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        del agents[agent_id]
        
        logger.info(f"Deleted agent {agent_id}")
        return {"success": True, "deleted_agent": agent_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8101))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)