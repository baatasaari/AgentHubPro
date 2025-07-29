#!/usr/bin/env python3
"""
Agent Wizard Service - Agent Creation & Configuration
Efficient service for creating and configuring AI agents with industry specialization
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

app = FastAPI(title="Agent Wizard Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Models
class LLMModel(str, Enum):
    GPT_4 = "gpt-4"
    GPT_35_TURBO = "gpt-3.5-turbo"
    CLAUDE_3 = "claude-3"
    GEMINI_PRO = "gemini-pro"

class InterfaceType(str, Enum):
    WEBCHAT = "webchat"
    WHATSAPP = "whatsapp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"

class Industry(str, Enum):
    HEALTHCARE = "healthcare"
    TECHNOLOGY = "technology"
    FINANCE = "finance"
    RETAIL = "retail"
    REAL_ESTATE = "real_estate"
    EDUCATION = "education"
    HOSPITALITY = "hospitality"
    FITNESS = "fitness"
    FOOD_BEVERAGE = "food_beverage"
    LEGAL = "legal"
    AUTOMOTIVE = "automotive"
    CONSULTING = "consulting"

class Agent(BaseModel):
    id: str
    business_name: str
    business_description: str
    business_domain: str
    industry: Industry
    llm_model: LLMModel
    interface_type: InterfaceType
    system_prompt: str
    created_at: datetime
    updated_at: datetime
    configuration: Dict[str, Any] = {}

class AgentCreate(BaseModel):
    business_name: str
    business_description: str
    business_domain: str
    industry: Industry
    llm_model: LLMModel = LLMModel.GPT_35_TURBO
    interface_type: InterfaceType = InterfaceType.WEBCHAT

    @field_validator('business_domain')
    def validate_domain(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Business domain must be at least 3 characters')
        return v

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_domain: Optional[str] = None
    industry: Optional[Industry] = None
    llm_model: Optional[LLMModel] = None
    interface_type: Optional[InterfaceType] = None

# Storage
agents_db: Dict[str, Agent] = {}

# Industry-specific prompts
INDUSTRY_PROMPTS = {
    Industry.HEALTHCARE: """You are a helpful healthcare assistant for {business_name}. 
You provide information about healthcare services, appointment scheduling, and general health guidance. 
Always remind users to consult with healthcare professionals for medical advice.
Be empathetic, professional, and maintain patient confidentiality.""",
    
    Industry.TECHNOLOGY: """You are a technology support specialist for {business_name}.
You help users with technical questions, product information, and troubleshooting.
Provide clear, step-by-step solutions and explain technical concepts in simple terms.
Stay updated on the latest technology trends relevant to the business.""",
    
    Industry.FINANCE: """You are a financial advisor assistant for {business_name}.
You provide information about financial services, investment options, and general financial guidance.
Always emphasize the importance of consulting qualified financial advisors for major decisions.
Maintain strict confidentiality and follow financial compliance guidelines.""",
    
    Industry.RETAIL: """You are a retail customer service assistant for {business_name}.
Help customers with product information, availability, pricing, and purchase assistance.
Provide excellent customer service, handle complaints professionally, and promote relevant products.
Always be friendly, helpful, and focused on customer satisfaction.""",
    
    Industry.REAL_ESTATE: """You are a real estate assistant for {business_name}.
Help clients with property information, market insights, and real estate guidance.
Provide accurate property details, scheduling assistance, and market analysis.
Be knowledgeable about local real estate trends and regulations.""",
    
    Industry.FITNESS: """You are a fitness coach assistant for {business_name}.
Help members with workout guidance, nutrition tips, and fitness goal planning.
Promote healthy lifestyle choices and provide motivation and support.
Always recommend consulting fitness professionals for personalized training programs."""
}

# Sample data
def init_sample_agents():
    sample_agents = [
        {
            "business_name": "TechFlow Solutions",
            "business_description": "Enterprise software solutions and IT consulting",
            "business_domain": "techflow.com",
            "industry": Industry.TECHNOLOGY,
            "llm_model": LLMModel.GPT_4,
            "interface_type": InterfaceType.WEBCHAT
        },
        {
            "business_name": "HealthCare Plus",
            "business_description": "Comprehensive healthcare services and patient care",
            "business_domain": "healthcareplus.com",
            "industry": Industry.HEALTHCARE,
            "llm_model": LLMModel.GPT_4,
            "interface_type": InterfaceType.WHATSAPP
        },
        {
            "business_name": "Elite Fitness",
            "business_description": "Personal training and fitness coaching services",
            "business_domain": "elitefitness.com",
            "industry": Industry.FITNESS,
            "llm_model": LLMModel.GPT_35_TURBO,
            "interface_type": InterfaceType.WEBCHAT
        }
    ]
    
    for i, data in enumerate(sample_agents, 1):
        agent_id = str(i)
        now = datetime.now()
        
        agent = Agent(
            id=agent_id,
            created_at=now,
            updated_at=now,
            system_prompt=generate_system_prompt(data["business_name"], data["industry"]),
            configuration={
                "max_tokens": 1000,
                "temperature": 0.7,
                "response_format": "conversational"
            },
            **data
        )
        agents_db[agent_id] = agent

init_sample_agents()

# Helper functions
def generate_system_prompt(business_name: str, industry: Industry) -> str:
    """Generate industry-specific system prompt"""
    base_prompt = INDUSTRY_PROMPTS.get(industry, 
        f"You are a helpful assistant for {business_name}. Provide excellent customer service and accurate information.")
    
    return base_prompt.format(business_name=business_name)

def get_model_pricing(model: LLMModel) -> Dict[str, float]:
    """Get pricing information for LLM models"""
    pricing = {
        LLMModel.GPT_4: {"input": 0.00002, "output": 0.00004},
        LLMModel.GPT_35_TURBO: {"input": 0.000001, "output": 0.000002},
        LLMModel.CLAUDE_3: {"input": 0.000015, "output": 0.000025},
        LLMModel.GEMINI_PRO: {"input": 0.00001, "output": 0.00002}
    }
    return pricing.get(model, pricing[LLMModel.GPT_35_TURBO])

def validate_agent_configuration(agent_data: AgentCreate) -> List[str]:
    """Validate agent configuration and return any issues"""
    issues = []
    
    # Check business name
    if len(agent_data.business_name) < 3:
        issues.append("Business name must be at least 3 characters")
    
    # Check description
    if len(agent_data.business_description) < 10:
        issues.append("Business description should be at least 10 characters")
    
    # Check domain format
    if not ("." in agent_data.business_domain and len(agent_data.business_domain) > 4):
        issues.append("Business domain should be a valid domain format")
    
    return issues

# Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent-wizard", "agents_count": len(agents_db)}

@app.get("/api/agents", response_model=List[Agent])
async def get_agents(
    industry: Optional[Industry] = None,
    llm_model: Optional[LLMModel] = None,
    limit: int = Query(50, le=100)
):
    """Get all agents with optional filtering"""
    agents = list(agents_db.values())
    
    if industry:
        agents = [a for a in agents if a.industry == industry]
    
    if llm_model:
        agents = [a for a in agents if a.llm_model == llm_model]
    
    return sorted(agents, key=lambda x: x.updated_at, reverse=True)[:limit]

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get a specific agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents_db[agent_id]

@app.post("/api/agents", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    """Create a new agent"""
    # Validate configuration
    issues = validate_agent_configuration(agent_data)
    if issues:
        raise HTTPException(status_code=400, detail=f"Validation failed: {', '.join(issues)}")
    
    agent_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    # Generate system prompt
    system_prompt = generate_system_prompt(agent_data.business_name, agent_data.industry)
    
    agent = Agent(
        id=agent_id,
        created_at=now,
        updated_at=now,
        system_prompt=system_prompt,
        configuration={
            "max_tokens": 1000,
            "temperature": 0.7,
            "response_format": "conversational",
            "pricing": get_model_pricing(agent_data.llm_model)
        },
        **agent_data.dict()
    )
    
    agents_db[agent_id] = agent
    return agent

@app.put("/api/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, updates: AgentUpdate):
    """Update an existing agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    update_data = updates.dict(exclude_unset=True)
    
    # Update fields
    for field, value in update_data.items():
        setattr(agent, field, value)
    
    # Regenerate system prompt if business name or industry changed
    if 'business_name' in update_data or 'industry' in update_data:
        agent.system_prompt = generate_system_prompt(agent.business_name, agent.industry)
    
    # Update pricing if model changed
    if 'llm_model' in update_data:
        agent.configuration["pricing"] = get_model_pricing(agent.llm_model)
    
    agent.updated_at = datetime.now()
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    del agents_db[agent_id]
    return {"message": "Agent deleted successfully"}

@app.get("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, message: str = Query(...)):
    """Test chat with an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    
    # Simulate agent response (in production, this would call the actual LLM)
    responses = {
        Industry.HEALTHCARE: f"Thank you for contacting {agent.business_name}. How can I assist you with your healthcare needs today?",
        Industry.TECHNOLOGY: f"Hello! I'm here to help you with {agent.business_name}'s technology solutions. What can I help you with?",
        Industry.FITNESS: f"Welcome to {agent.business_name}! Ready to achieve your fitness goals? How can I help you today?",
        Industry.FINANCE: f"Greetings from {agent.business_name}. I'm here to assist with your financial questions. How may I help?",
        Industry.RETAIL: f"Hi there! Welcome to {agent.business_name}. I'd be happy to help you find what you're looking for!",
        Industry.REAL_ESTATE: f"Hello! I'm your real estate assistant from {agent.business_name}. How can I help with your property needs?"
    }
    
    default_response = f"Hello! I'm the AI assistant for {agent.business_name}. How can I help you today?"
    response = responses.get(agent.industry, default_response)
    
    return {
        "agent_id": agent_id,
        "user_message": message,
        "agent_response": response,
        "model_used": agent.llm_model,
        "timestamp": datetime.now()
    }

@app.get("/api/industries")
async def get_industries():
    """Get available industries with descriptions"""
    industry_info = {
        Industry.HEALTHCARE: "Medical services, hospitals, clinics, telehealth",
        Industry.TECHNOLOGY: "Software, IT services, SaaS, tech support", 
        Industry.FINANCE: "Banking, investments, insurance, financial advisory",
        Industry.RETAIL: "E-commerce, stores, product sales, customer service",
        Industry.REAL_ESTATE: "Property sales, rentals, real estate services",
        Industry.FITNESS: "Gyms, personal training, health and wellness",
        Industry.EDUCATION: "Schools, online learning, educational services",
        Industry.HOSPITALITY: "Hotels, restaurants, travel, entertainment",
        Industry.FOOD_BEVERAGE: "Restaurants, food delivery, catering",
        Industry.LEGAL: "Law firms, legal services, consultation",
        Industry.AUTOMOTIVE: "Car dealerships, auto repair, automotive services",
        Industry.CONSULTING: "Business consulting, professional services"
    }
    
    return [
        {"value": industry, "label": industry.replace("_", " ").title(), "description": desc}
        for industry, desc in industry_info.items()
    ]

@app.get("/api/models")
async def get_models():
    """Get available LLM models with pricing"""
    models_info = []
    
    for model in LLMModel:
        pricing = get_model_pricing(model)
        models_info.append({
            "value": model,
            "label": model.replace("_", " ").upper(),
            "pricing": pricing,
            "recommended_for": {
                LLMModel.GPT_4: "High-quality conversations, complex reasoning",
                LLMModel.GPT_35_TURBO: "Cost-effective, good performance",
                LLMModel.CLAUDE_3: "Long conversations, detailed responses",
                LLMModel.GEMINI_PRO: "Multimodal capabilities, competitive pricing"
            }.get(model, "General purpose AI assistant")
        })
    
    return models_info

@app.get("/api/agents/{agent_id}/system-prompt")
async def get_system_prompt(agent_id: str):
    """Get the generated system prompt for an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    return {
        "agent_id": agent_id,
        "system_prompt": agent.system_prompt,
        "industry": agent.industry,
        "generated_at": agent.updated_at
    }

@app.post("/api/agents/{agent_id}/regenerate-prompt")
async def regenerate_system_prompt(agent_id: str):
    """Regenerate system prompt for an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    agent.system_prompt = generate_system_prompt(agent.business_name, agent.industry)
    agent.updated_at = datetime.now()
    
    return {
        "agent_id": agent_id,
        "new_system_prompt": agent.system_prompt,
        "regenerated_at": agent.updated_at
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Agent Wizard Service on http://0.0.0.0:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")