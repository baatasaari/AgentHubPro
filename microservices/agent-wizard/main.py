"""
Agent Wizard Microservice
FastAPI-based independent service for agent creation and management
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional
import asyncio
from datetime import datetime
import uuid
import yaml
import os
from pathlib import Path
from config_manager import (
    get_config, 
    ModelConfig, 
    IndustryConfig, 
    InterfaceConfig,
    get_available_models,
    get_available_industries,
    get_available_interfaces,
    validate_model_interface,
    generate_system_prompt
)
from llm_client import LLMClient, LLMRequest

app = FastAPI(
    title="Agent Wizard Service",
    description="Independent microservice for AI agent creation and management",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class Industry(BaseModel):
    value: str
    label: str
    icon: str
    description: Optional[str] = None

class LLMModel(BaseModel):
    value: str
    label: str
    price: float
    provider: str
    features: List[str] = []
    max_tokens: int = 4096

class InterfaceType(BaseModel):
    value: str
    label: str
    description: str
    compatible_models: List[str] = []

class AgentCreate(BaseModel):
    business_name: str
    business_description: str
    business_domain: str
    industry: str
    llm_model: str
    interface_type: str

    @field_validator('business_name')
    @classmethod
    def validate_business_name(cls, v):
        config = get_config()
        is_valid, error_msg = config.validate_business_name(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v.strip()

    @field_validator('business_description')
    @classmethod
    def validate_description(cls, v):
        config = get_config()
        is_valid, error_msg = config.validate_business_description(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v.strip()

    @field_validator('business_domain')
    @classmethod
    def validate_domain(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('Domain must include protocol (http:// or https://)')
        return v

    @field_validator('industry')
    @classmethod
    def validate_industry(cls, v):
        config = get_config()
        if not config.is_industry_valid(v):
            valid_industries = [industry.value for industry in get_available_industries()]
            raise ValueError(f'Invalid industry. Must be one of: {", ".join(valid_industries)}')
        return v

    @field_validator('llm_model')
    @classmethod
    def validate_llm_model(cls, v):
        config = get_config()
        if not config.is_model_valid(v):
            valid_models = [model.model_id for model in get_available_models()]
            raise ValueError(f'Invalid model. Must be one of: {", ".join(valid_models)}')
        return v

    @field_validator('interface_type')
    @classmethod
    def validate_interface_type(cls, v):
        config = get_config()
        if not config.is_interface_valid(v):
            valid_interfaces = [interface.value for interface in get_available_interfaces()]
            raise ValueError(f'Invalid interface type. Must be one of: {", ".join(valid_interfaces)}')
        return v

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_domain: Optional[str] = None
    industry: Optional[str] = None
    llm_model: Optional[str] = None
    interface_type: Optional[str] = None
    status: Optional[str] = None

class Agent(BaseModel):
    id: str
    business_name: str
    business_description: str
    business_domain: str
    industry: str
    llm_model: str
    interface_type: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

# Storage configuration - BigQuery or in-memory
config = get_config()
USE_BIGQUERY = config.should_use_bigquery()

if USE_BIGQUERY:
    try:
        from bigquery_client import BigQueryClient
        bigquery_client = BigQueryClient()
        bigquery_client.ensure_tables_exist()
        print("BigQuery storage initialized successfully")
    except Exception as e:
        print(f"Failed to initialize BigQuery: {e}")
        if config.should_fallback_to_memory():
            print("Falling back to in-memory storage")
            USE_BIGQUERY = False
            bigquery_client = None
        else:
            raise
else:
    bigquery_client = None

# Initialize LLM client
llm_client = LLMClient()

# In-memory storage (fallback or development)
agents_db: List[Agent] = []

# Business Logic Functions
def validate_model_compatibility(model: str, interface_type: str) -> bool:
    """Validate if model is compatible with interface type using configuration"""
    return validate_model_interface(model, interface_type)

def get_industry_metadata(industry: str) -> dict:
    """Get industry metadata from configuration"""
    config = get_config()
    industry_config = config.get_industry_config(industry)
    
    if industry_config:
        return {
            "name": industry_config.name,
            "icon": industry_config.icon,
            "description": industry_config.description,
            "has_custom_prompt": bool(industry_config.system_prompt),
            "recommended_models": industry_config.recommended_models
        }
    else:
        return {
            "name": industry.title(),
            "icon": "help-circle",
            "description": None,
            "has_custom_prompt": False,
            "recommended_models": []
        }

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint with BigQuery status"""
    health_status = {
        "status": "healthy",
        "service": "agent-wizard",
        "version": "1.0.0",
        "storage": "in-memory" if not USE_BIGQUERY else "bigquery",
        "timestamp": datetime.now().isoformat()
    }
    
    if USE_BIGQUERY and bigquery_client:
        bq_health = bigquery_client.health_check()
        health_status["bigquery"] = bq_health
        if bq_health["status"] != "healthy":
            health_status["status"] = "degraded"
    
    return health_status

@app.get("/api/industries", response_model=List[Industry])
async def get_industries():
    """Get available industries from configuration"""
    industry_configs = get_available_industries()
    industry_list = []
    
    for industry_config in industry_configs:
        industry_list.append(Industry(
            value=industry_config.value,
            label=industry_config.name,
            icon=industry_config.icon,
            description=industry_config.description
        ))
    
    return industry_list

@app.get("/api/models", response_model=List[LLMModel])
async def get_llm_models():
    """Get available LLM models from configuration"""
    model_configs = get_available_models()
    model_list = []
    
    for model_config in model_configs:
        # Calculate price per 1K tokens (average of input/output if both available)
        pricing = model_config.pricing
        if "input_tokens" in pricing and "output_tokens" in pricing:
            price = (pricing["input_tokens"] + pricing["output_tokens"]) / 2
        elif "input_tokens" in pricing:
            price = pricing["input_tokens"]
        else:
            price = 0.001  # Default fallback
            
        model_list.append(LLMModel(
            value=model_config.model_id,
            label=model_config.display_name,
            price=price,
            provider=model_config.provider.title(),
            features=model_config.features,
            max_tokens=model_config.max_tokens
        ))
    
    return model_list

@app.get("/api/interfaces", response_model=List[InterfaceType])
async def get_interface_types():
    """Get available interface types from configuration"""
    interface_configs = get_available_interfaces()
    interface_list = []
    
    for interface_config in interface_configs:
        interface_list.append(InterfaceType(
            value=interface_config.value,
            label=interface_config.label,
            description=interface_config.description,
            compatible_models=interface_config.compatible_models
        ))
    
    return interface_list

@app.post("/api/agents", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    """Create a new agent"""
    
    # Validate model compatibility
    if not validate_model_compatibility(agent_data.llm_model, agent_data.interface_type):
        raise HTTPException(
            status_code=400,
            detail=f"Model {agent_data.llm_model} is not compatible with {agent_data.interface_type} interface"
        )
    
    # Create agent
    agent = Agent(
        id=str(uuid.uuid4()),
        business_name=agent_data.business_name,
        business_description=agent_data.business_description,
        business_domain=agent_data.business_domain,
        industry=agent_data.industry,
        llm_model=agent_data.llm_model,
        interface_type=agent_data.interface_type,
        status="draft",
        created_at=datetime.now()
    )
    
    # Store in BigQuery or in-memory
    if USE_BIGQUERY and bigquery_client:
        agent_data = {
            "id": agent.id,
            "business_name": agent.business_name,
            "business_description": agent.business_description,
            "business_domain": agent.business_domain,
            "industry": agent.industry,
            "llm_model": agent.llm_model,
            "interface_type": agent.interface_type,
            "status": agent.status,
            "created_at": agent.created_at,
            "system_prompt": generate_system_prompt(agent.industry, agent.business_name),
            "metadata": {
                "created_via": "api",
                "validation_passed": True
            }
        }
        
        success = bigquery_client.insert_agent(agent_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save agent to BigQuery")
    else:
        agents_db.append(agent)
    
    return agent

@app.get("/api/agents", response_model=List[Agent])
async def get_agents():
    """Get all agents"""
    if USE_BIGQUERY and bigquery_client:
        agent_data_list = bigquery_client.get_all_agents()
        agents = []
        for data in agent_data_list:
            agents.append(Agent(
                id=data["id"],
                business_name=data["business_name"],
                business_description=data["business_description"],
                business_domain=data["business_domain"],
                industry=data["industry"],
                llm_model=data["llm_model"],
                interface_type=data["interface_type"],
                status=data["status"],
                created_at=data["created_at"],
                updated_at=data.get("updated_at")
            ))
        return agents
    else:
        return agents_db

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get specific agent"""
    if USE_BIGQUERY and bigquery_client:
        agent_data = bigquery_client.get_agent(agent_id)
        if not agent_data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return Agent(
            id=agent_data["id"],
            business_name=agent_data["business_name"],
            business_description=agent_data["business_description"],
            business_domain=agent_data["business_domain"],
            industry=agent_data["industry"],
            llm_model=agent_data["llm_model"],
            interface_type=agent_data["interface_type"],
            status=agent_data["status"],
            created_at=agent_data["created_at"],
            updated_at=agent_data.get("updated_at")
        )
    else:
        agent = next((a for a in agents_db if a.id == agent_id), None)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent

@app.patch("/api/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, update_data: AgentUpdate):
    """Update agent"""
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(agent, field, value)
    
    agent.updated_at = datetime.now()
    return agent

@app.patch("/api/agents/{agent_id}/status")
async def update_agent_status(agent_id: str, status_data: dict):
    """Update agent status"""
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    status = status_data.get("status")
    if status not in ["draft", "active", "paused"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    agent.status = status
    agent.updated_at = datetime.now()
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete agent"""
    global agents_db
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agents_db = [a for a in agents_db if a.id != agent_id]
    return {"message": "Agent deleted successfully"}

@app.post("/api/agents/{agent_id}/system-prompt")
async def generate_agent_prompt(agent_id: str):
    """Generate system prompt for agent"""
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    prompt = generate_system_prompt(agent.industry, agent.business_name)
    metadata = get_industry_metadata(agent.industry)
    
    return {
        "system_prompt": prompt,
        "industry_metadata": metadata,
        "agent_id": agent_id,
        "business_name": agent.business_name
    }

@app.post("/api/agents/{agent_id}/validate-deployment")
async def validate_deployment(agent_id: str):
    """Validate if agent is ready for deployment"""
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    issues = []
    
    if agent.status != "active":
        issues.append("Agent must be active to deploy")
    
    if not validate_model_compatibility(agent.llm_model, agent.interface_type):
        issues.append("Model is not compatible with selected interface")
    
    # Check if industry has custom prompt configuration
    metadata = get_industry_metadata(agent.industry)
    if not metadata.get("has_custom_prompt", False):
        issues.append("Industry prompt configuration missing")
    
    return {
        "ready": len(issues) == 0,
        "issues": issues,
        "industry_metadata": metadata
    }

@app.get("/api/models/recommend")
async def recommend_model(industry: str = None, use_case: str = None):
    """Get recommended model based on industry and use case"""
    config = get_config()
    recommended_model = config.get_recommended_model(industry, use_case)
    model_config = config.get_model_config(recommended_model)
    
    return {
        "recommended_model": recommended_model,
        "model_info": {
            "display_name": model_config.display_name if model_config else recommended_model,
            "provider": model_config.provider if model_config else "unknown",
            "pricing": model_config.pricing if model_config else {},
            "features": model_config.features if model_config else []
        }
    }

@app.post("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, chat_data: dict):
    """Chat with an agent using LLM"""
    # Get agent
    if USE_BIGQUERY and bigquery_client:
        agent_data = bigquery_client.get_agent(agent_id)
        if not agent_data:
            raise HTTPException(status_code=404, detail="Agent not found")
        agent_business_name = agent_data["business_name"]
        agent_industry = agent_data["industry"]
        agent_model = agent_data["llm_model"]
    else:
        agent = next((a for a in agents_db if a.id == agent_id), None)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        agent_business_name = agent.business_name
        agent_industry = agent.industry
        agent_model = agent.llm_model
    
    # Prepare LLM request
    user_message = chat_data.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    system_prompt = generate_system_prompt(agent_industry, agent_business_name)
    
    request = LLMRequest(
        model_id=agent_model,
        prompt=user_message,
        system_prompt=system_prompt,
        max_tokens=500,
        temperature=0.7
    )
    
    try:
        response = await llm_client.generate(request)
        
        if response.error:
            raise HTTPException(status_code=500, detail=f"LLM Error: {response.error}")
        
        return {
            "response": response.content,
            "model": response.model_id,
            "provider": response.provider,
            "tokens_used": response.tokens_used,
            "cost": response.cost,
            "response_time_ms": response.response_time_ms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

@app.get("/api/config/reload")
async def reload_configuration():
    """Reload all configurations"""
    try:
        from config_manager import reload_config
        reload_config()
        config = get_config()
        
        return {
            "message": "Configuration reloaded successfully",
            "models_loaded": len(config.get_available_models()),
            "industries_loaded": len(config.get_available_industries()),
            "enabled_providers": config.get_enabled_providers()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload configuration: {str(e)}")

@app.get("/api/config/status")
async def get_configuration_status():
    """Get configuration status and enabled features"""
    config = get_config()
    
    return {
        "environment": config.get_environment(),
        "storage": "bigquery" if config.should_use_bigquery() else "memory",
        "enabled_providers": config.get_enabled_providers(),
        "available_models_count": len(config.get_available_models()),
        "available_industries_count": len(config.get_available_industries()),
        "features": {
            "model_validation": config.is_feature_enabled("enable_model_validation"),
            "interface_validation": config.is_feature_enabled("enable_interface_validation"),
            "system_prompt_generation": config.is_feature_enabled("enable_system_prompt_generation")
        }
    }

@app.get("/api/config/industries/{industry_key}")
async def get_industry_config(industry_key: str):
    """Get specific industry configuration details"""
    config = get_config()
    industry_config = config.get_industry_config(industry_key)
    
    if not industry_config:
        raise HTTPException(status_code=404, detail="Industry configuration not found")
    
    return {
        "industry": industry_key,
        "name": industry_config.name,
        "icon": industry_config.icon,
        "description": industry_config.description,
        "has_system_prompt": bool(industry_config.system_prompt),
        "prompt_length": len(industry_config.system_prompt) if industry_config.system_prompt else 0,
        "recommended_models": industry_config.recommended_models,
        "keywords": industry_config.keywords
    }

@app.get("/api/models/{model_id}/info")
async def get_model_info(model_id: str):
    """Get detailed information about a specific model"""
    config = get_config()
    model_config = config.get_model_config(model_id)
    
    if not model_config:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return {
        "model_id": model_config.model_id,
        "display_name": model_config.display_name,
        "description": model_config.description,
        "provider": model_config.provider,
        "max_tokens": model_config.max_tokens,
        "max_output_tokens": model_config.max_output_tokens,
        "temperature_range": model_config.temperature_range,
        "top_p_range": model_config.top_p_range,
        "top_k_range": model_config.top_k_range,
        "pricing": model_config.pricing,
        "features": model_config.features,
        "safety_settings": model_config.safety_settings
    }

@app.post("/api/runtime/chat/{agent_id}")
async def runtime_chat_prompt(agent_id: str, user_message: dict):
    """Get runtime system prompt for chat interface"""
    agent = next((a for a in agents_db if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.status != "active":
        raise HTTPException(status_code=400, detail="Agent must be active for runtime operations")
    
    system_prompt = generate_system_prompt(agent.industry, agent.business_name)
    metadata = get_industry_metadata(agent.industry)
    
    return {
        "agent_id": agent_id,
        "system_prompt": system_prompt,
        "industry_metadata": metadata,
        "agent_config": {
            "business_name": agent.business_name,
            "industry": agent.industry,
            "llm_model": agent.llm_model,
            "interface_type": agent.interface_type
        },
        "message": user_message.get("message", ""),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Agent Wizard Service on http://0.0.0.0:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")