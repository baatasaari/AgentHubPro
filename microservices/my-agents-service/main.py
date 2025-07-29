#!/usr/bin/env python3
"""
My Agents Service - Efficient Agent Management
Streamlined FastAPI service for agent CRUD operations with configurable validation and limits
"""

import sys
import os
from pathlib import Path

# Add shared directory to path
sys.path.append(str(Path(__file__).parent.parent / "shared"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import logging

# Import configuration manager
from config_manager import get_config

# Initialize configuration
config = get_config("my-agents", str(Path(__file__).parent.parent / "shared" / "config"))
service_config = config.get_service_config()

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.get_app_setting("monitoring.log_level", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="My Agents Service",
    version="1.0.0",
    debug=service_config.debug
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=service_config.cors_origins,
    allow_credentials=config.get_app_setting("api.cors.allow_credentials", True),
    allow_methods=config.get_app_setting("api.cors.allow_methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS").split(","),
    allow_headers=config.get_app_setting("api.cors.allow_headers", "*").split(",")
)

# Models
class AgentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"

class Agent(BaseModel):
    id: str
    business_name: str
    industry: str
    llm_model: str
    interface_type: str
    status: AgentStatus = AgentStatus.DRAFT
    created_at: datetime
    updated_at: datetime
    performance_metrics: Dict[str, Any] = {}

class AgentCreate(BaseModel):
    business_name: str
    industry: str
    llm_model: str = "gpt-3.5-turbo"
    interface_type: str = "webchat"

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[AgentStatus] = None

# Storage
agents_db: Dict[str, Agent] = {}

# Sample data (only if enabled)
def init_sample_agents():
    if config.is_feature_enabled("enable_mock_data"):
        sample_agents = [
            {"business_name": "TechFlow Solutions", "industry": "technology", "llm_model": "gpt-4", "interface_type": "webchat"},
            {"business_name": "HealthCare Plus", "industry": "healthcare", "llm_model": "gpt-4", "interface_type": "whatsapp"},
            {"business_name": "Elite Fitness", "industry": "fitness", "llm_model": "gpt-3.5-turbo", "interface_type": "webchat"}
        ]
        
        for i, data in enumerate(sample_agents, 1):
            agent_id = str(i)
            agent = Agent(
                id=agent_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                status=AgentStatus.ACTIVE,
                performance_metrics={"conversations": i * 10, "satisfaction": 4.2 + (i * 0.1)},
                **data
            )
            agents_db[agent_id] = agent
        
        logger.info(f"Initialized {len(sample_agents)} sample agents")

# Initialize sample data if enabled
init_sample_agents()

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "my-agents",
        "agents_count": len(agents_db),
        "environment": config.get_environment(),
        "storage_type": config.get_storage_config().type
    }

# Configuration endpoints
@app.get("/api/config/status")
async def get_config_status():
    """Get current configuration status"""
    return config.get_status()

@app.get("/api/config/reload")
async def reload_configuration():
    """Reload all configurations"""
    try:
        config.reload_all()
        return {"message": "Configuration reloaded successfully", "status": "success"}
    except Exception as e:
        logger.error(f"Error reloading configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload configuration")

@app.get("/api/config/validation-rules")
async def get_validation_rules():
    """Get validation rules for agent creation"""
    return config.get_validation_rules()

@app.get("/api/agents", response_model=List[Agent])
async def get_agents(
    status: Optional[AgentStatus] = None,
    industry: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    agents = list(agents_db.values())
    
    if status:
        agents = [a for a in agents if a.status == status]
    if industry:
        agents = [a for a in agents if a.industry.lower() == industry.lower()]
    
    return agents[:limit]

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents_db[agent_id]

@app.post("/api/agents", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    agent_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    agent = Agent(
        id=agent_id,
        created_at=now,
        updated_at=now,
        **agent_data.dict()
    )
    
    agents_db[agent_id] = agent
    return agent

@app.put("/api/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, updates: AgentUpdate):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    update_data = updates.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(agent, field, value)
    
    agent.updated_at = datetime.now()
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    del agents_db[agent_id]
    return {"message": "Agent deleted successfully"}

@app.post("/api/agents/{agent_id}/status")
async def change_agent_status(agent_id: str, status: AgentStatus):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    agent.status = status
    agent.updated_at = datetime.now()
    
    return {"message": f"Agent status changed to {status}", "agent": agent}

@app.get("/api/agents/{agent_id}/performance")
async def get_agent_performance(agent_id: str):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    return {
        "agent_id": agent_id,
        "metrics": agent.performance_metrics,
        "status": agent.status,
        "last_updated": agent.updated_at
    }

@app.post("/api/agents/bulk/status")
async def bulk_status_change(agent_ids: List[str], status: AgentStatus):
    updated_agents = []
    
    for agent_id in agent_ids:
        if agent_id in agents_db:
            agents_db[agent_id].status = status
            agents_db[agent_id].updated_at = datetime.now()
            updated_agents.append(agent_id)
    
    return {"updated_agents": updated_agents, "new_status": status}

if __name__ == "__main__":
    import uvicorn
    print("Starting My Agents Service on http://0.0.0.0:8006")
    uvicorn.run(app, host="0.0.0.0", port=8006, log_level="info")