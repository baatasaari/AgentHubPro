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

class LLMModel(BaseModel):
    value: str
    label: str
    price: float
    provider: str

class InterfaceType(BaseModel):
    value: str
    label: str
    description: str

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
        if not v or len(v.strip()) < 2:
            raise ValueError('Business name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Business name must be less than 100 characters')
        return v.strip()

    @field_validator('business_description')
    @classmethod
    def validate_description(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Description must be at least 10 characters')
        if len(v) > 500:
            raise ValueError('Description must be less than 500 characters')
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
        valid_industries = [
            'healthcare', 'retail', 'finance', 'realestate', 'education',
            'hospitality', 'legal', 'automotive', 'technology', 'consulting',
            'fitness', 'food'
        ]
        if v not in valid_industries:
            raise ValueError(f'Invalid industry. Must be one of: {", ".join(valid_industries)}')
        return v

    @field_validator('llm_model')
    @classmethod
    def validate_llm_model(cls, v):
        valid_models = [
            'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
            'claude-3-opus', 'claude-3-sonnet', 'gemini-pro'
        ]
        if v not in valid_models:
            raise ValueError(f'Invalid model. Must be one of: {", ".join(valid_models)}')
        return v

    @field_validator('interface_type')
    @classmethod
    def validate_interface_type(cls, v):
        if v not in ['webchat', 'whatsapp']:
            raise ValueError('Interface type must be either "webchat" or "whatsapp"')
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

# In-memory storage (replace with database in production)
agents_db: List[Agent] = []

# Load industry prompts configuration
def load_industry_prompts():
    """Load industry-specific system prompts from YAML configuration"""
    config_path = Path(__file__).parent / "config" / "industry_prompts.yaml"
    try:
        with open(config_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        print(f"Warning: Industry prompts file not found at {config_path}")
        return {"industries": {}}
    except yaml.YAMLError as e:
        print(f"Error parsing YAML configuration: {e}")
        return {"industries": {}}

# Global configuration
INDUSTRY_CONFIG = load_industry_prompts()

# Business Logic Functions
def validate_model_compatibility(model: str, interface_type: str) -> bool:
    """Validate if model is compatible with interface type"""
    whatsapp_compatible = ["gpt-3.5-turbo", "gpt-4", "claude-3-haiku"]
    webchat_compatible = [
        "gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", 
        "claude-3-sonnet", "claude-3-haiku", "gemini-pro"
    ]
    
    if interface_type == "whatsapp":
        return model in whatsapp_compatible
    return model in webchat_compatible

def generate_system_prompt(industry: str, business_name: str) -> str:
    """Generate industry-specific system prompt from YAML configuration"""
    industries = INDUSTRY_CONFIG.get("industries", {})
    industry_config = industries.get(industry)
    
    if industry_config and "system_prompt" in industry_config:
        # Format the prompt with the business name
        return industry_config["system_prompt"].format(business_name=business_name)
    else:
        # Fallback prompt if industry not found in configuration
        return f"You are a helpful assistant for {business_name}. Assist customers with their inquiries and provide excellent customer service. Be professional, friendly, and helpful in all interactions."

def get_industry_metadata(industry: str) -> dict:
    """Get industry metadata from YAML configuration"""
    industries = INDUSTRY_CONFIG.get("industries", {})
    industry_config = industries.get(industry, {})
    
    return {
        "name": industry_config.get("name", industry.title()),
        "icon": industry_config.get("icon", "help-circle"),
        "has_custom_prompt": "system_prompt" in industry_config
    }

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "agent-wizard", "version": "1.0.0"}

@app.get("/api/industries", response_model=List[Industry])
async def get_industries():
    """Get available industries from YAML configuration"""
    industries = INDUSTRY_CONFIG.get("industries", {})
    industry_list = []
    
    for industry_key, industry_config in industries.items():
        industry_list.append(Industry(
            value=industry_key,
            label=industry_config.get("name", industry_key.title()),
            icon=industry_config.get("icon", "help-circle")
        ))
    
    return industry_list

@app.get("/api/models", response_model=List[LLMModel])
async def get_llm_models():
    """Get available LLM models"""
    return [
        LLMModel(value="gpt-4-turbo", label="GPT-4 Turbo", price=0.01, provider="OpenAI"),
        LLMModel(value="gpt-4", label="GPT-4", price=0.03, provider="OpenAI"),
        LLMModel(value="gpt-3.5-turbo", label="GPT-3.5 Turbo", price=0.002, provider="OpenAI"),
        LLMModel(value="claude-3-opus", label="Claude 3 Opus", price=0.015, provider="Anthropic"),
        LLMModel(value="claude-3-sonnet", label="Claude 3 Sonnet", price=0.003, provider="Anthropic"),
        LLMModel(value="gemini-pro", label="Gemini Pro", price=0.001, provider="Google"),
    ]

@app.get("/api/interfaces", response_model=List[InterfaceType])
async def get_interface_types():
    """Get available interface types"""
    return [
        InterfaceType(value="webchat", label="Web Chat Widget", description="Embeddable chat interface for your website"),
        InterfaceType(value="whatsapp", label="WhatsApp Integration", description="Connect via WhatsApp Business API"),
    ]

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
    
    agents_db.append(agent)
    return agent

@app.get("/api/agents", response_model=List[Agent])
async def get_agents():
    """Get all agents"""
    return agents_db

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get specific agent"""
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

@app.get("/api/config/reload")
async def reload_configuration():
    """Reload industry prompts configuration from YAML file"""
    global INDUSTRY_CONFIG
    INDUSTRY_CONFIG = load_industry_prompts()
    
    industries_count = len(INDUSTRY_CONFIG.get("industries", {}))
    
    return {
        "message": "Configuration reloaded successfully",
        "industries_loaded": industries_count,
        "config_version": INDUSTRY_CONFIG.get("version", "unknown"),
        "last_updated": INDUSTRY_CONFIG.get("last_updated", "unknown")
    }

@app.get("/api/config/industries/{industry_key}")
async def get_industry_config(industry_key: str):
    """Get specific industry configuration details"""
    industries = INDUSTRY_CONFIG.get("industries", {})
    industry_config = industries.get(industry_key)
    
    if not industry_config:
        raise HTTPException(status_code=404, detail="Industry configuration not found")
    
    return {
        "industry": industry_key,
        "name": industry_config.get("name", industry_key.title()),
        "icon": industry_config.get("icon", "help-circle"),
        "has_system_prompt": "system_prompt" in industry_config,
        "prompt_length": len(industry_config.get("system_prompt", "")) if "system_prompt" in industry_config else 0,
        "configuration": industry_config
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