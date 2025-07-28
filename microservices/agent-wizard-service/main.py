#!/usr/bin/env python3
"""
Agent Wizard Service - AI Agent Creation and Management
Port: 8001
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import asyncio
from datetime import datetime
import uvicorn

app = FastAPI(
    title="Agent Wizard Service",
    description="AI Agent Creation and Management Service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demonstration
agents_db = {}
conversations_db = {}

# Sample data
sample_agents = [
    {
        "id": "agent-1",
        "business_name": "HealthCare AI Assistant",
        "business_description": "AI assistant for patient inquiries and appointment scheduling",
        "business_domain": "https://healthcare-demo.com",
        "industry": "healthcare",
        "llm_model": "gpt-4-turbo",
        "interface_type": "webchat",
        "status": "active",
        "created_at": "2025-01-15T10:00:00Z",
        "system_prompt": "You are a helpful healthcare assistant..."
    },
    {
        "id": "agent-2", 
        "business_name": "Retail Support Bot",
        "business_description": "Customer support for e-commerce platform",
        "business_domain": "https://retail-demo.com",
        "industry": "retail",
        "llm_model": "gpt-3.5-turbo",
        "interface_type": "webchat",
        "status": "active",
        "created_at": "2025-01-10T14:30:00Z",
        "system_prompt": "You are a helpful retail customer service assistant..."
    }
]

# Initialize sample data
for agent in sample_agents:
    agents_db[agent["id"]] = agent

# Models
class AgentCreate(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=100)
    business_description: str = Field(..., min_length=1, max_length=500)
    business_domain: str = Field(..., pattern=r"https?://.*")
    industry: str = Field(..., pattern=r"^(healthcare|retail|finance|technology|education|legal|automotive|hospitality|real_estate|consulting|fitness|food_beverage)$")
    llm_model: str = Field(..., pattern=r"^(gpt-4-turbo|gpt-3.5-turbo|claude-3-sonnet|claude-3-haiku|gemini-pro)$")
    interface_type: str = Field(..., pattern=r"^(webchat|whatsapp|api)$")

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_domain: Optional[str] = None
    industry: Optional[str] = None
    llm_model: Optional[str] = None
    interface_type: Optional[str] = None
    status: Optional[str] = None

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None

class SystemPromptRequest(BaseModel):
    business_name: str
    business_description: str
    industry: str

# Health endpoint
@app.get("/health")
async def health_check():
    return {
        "service": "agent-wizard",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "agents_count": len(agents_db)
    }

# Agent CRUD operations
@app.post("/api/agents", status_code=201)
async def create_agent(agent_data: AgentCreate):
    agent_id = f"agent-{uuid.uuid4().hex[:8]}"
    
    # Generate system prompt
    system_prompt = generate_system_prompt(agent_data.business_name, agent_data.business_description, agent_data.industry)
    
    agent = {
        "id": agent_id,
        "business_name": agent_data.business_name,
        "business_description": agent_data.business_description,
        "business_domain": agent_data.business_domain,
        "industry": agent_data.industry,
        "llm_model": agent_data.llm_model,
        "interface_type": agent_data.interface_type,
        "status": "draft",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "system_prompt": system_prompt
    }
    
    agents_db[agent_id] = agent
    return agent

@app.get("/api/agents")
async def get_agents():
    return list(agents_db.values())

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents_db[agent_id]

@app.patch("/api/agents/{agent_id}")
async def update_agent(agent_id: str, agent_update: AgentUpdate):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    update_data = agent_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        agent[field] = value
    
    agent["updated_at"] = datetime.utcnow().isoformat()
    agents_db[agent_id] = agent
    
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    deleted_agent = agents_db.pop(agent_id)
    return {"message": "Agent deleted successfully", "agent_id": agent_id}

# System prompt generation
@app.post("/api/system-prompt")
async def generate_system_prompt_endpoint(request: SystemPromptRequest):
    system_prompt = generate_system_prompt(request.business_name, request.business_description, request.industry)
    return {"system_prompt": system_prompt}

def generate_system_prompt(business_name: str, business_description: str, industry: str) -> str:
    """Generate industry-specific system prompt"""
    industry_prompts = {
        "healthcare": f"You are an AI assistant for {business_name}. {business_description} You specialize in healthcare support, patient inquiries, and medical information. Always recommend consulting healthcare professionals for medical advice.",
        "retail": f"You are a customer service AI assistant for {business_name}. {business_description} You help customers with product inquiries, order status, returns, and general shopping assistance.",
        "finance": f"You are a financial AI assistant for {business_name}. {business_description} You provide information about financial services, account inquiries, and general financial guidance. Always recommend consulting financial advisors for major decisions.",
        "technology": f"You are a technical AI assistant for {business_name}. {business_description} You provide technical support, product information, and help users troubleshoot issues.",
        "education": f"You are an educational AI assistant for {business_name}. {business_description} You help with course information, enrollment, and educational guidance.",
    }
    
    return industry_prompts.get(industry, f"You are an AI assistant for {business_name}. {business_description} You provide helpful information and assistance to users.")

# Chat functionality
@app.post("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, chat_message: ChatMessage):
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    conversation_id = chat_message.conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
    
    # Simulate AI response based on agent's industry
    response = generate_response(agent, chat_message.message)
    
    # Store conversation
    if conversation_id not in conversations_db:
        conversations_db[conversation_id] = []
    
    conversations_db[conversation_id].append({
        "message": chat_message.message,
        "response": response,
        "timestamp": datetime.utcnow().isoformat(),
        "agent_id": agent_id
    })
    
    return {
        "response": response,
        "conversation_id": conversation_id,
        "agent_id": agent_id,
        "timestamp": datetime.utcnow().isoformat()
    }

def generate_response(agent: Dict[str, Any], message: str) -> str:
    """Generate contextual response based on agent's industry"""
    industry = agent.get("industry", "general")
    business_name = agent.get("business_name", "Our Business")
    
    responses = {
        "healthcare": f"Thank you for contacting {business_name}. I understand you need healthcare assistance. For specific medical concerns, please consult with a healthcare professional. How else can I help you today?",
        "retail": f"Hello! Welcome to {business_name}. I'm here to help with your shopping needs. What can I assist you with today?",
        "finance": f"Thank you for reaching out to {business_name}. I can help with general financial inquiries. For specific financial advice, please consult with our financial advisors. What would you like to know?",
        "technology": f"Hi there! I'm the technical assistant for {business_name}. I can help with technical questions and support. What technical issue can I help you resolve?",
    }
    
    return responses.get(industry, f"Hello! Thank you for contacting {business_name}. How can I assist you today?")

# Industries and models
@app.get("/api/industries")
async def get_industries():
    return {
        "healthcare": {"name": "Healthcare", "description": "Medical and healthcare services"},
        "retail": {"name": "Retail", "description": "E-commerce and retail businesses"},
        "finance": {"name": "Finance", "description": "Financial services and banking"},
        "technology": {"name": "Technology", "description": "Tech companies and IT services"},
        "education": {"name": "Education", "description": "Educational institutions and e-learning"},
        "legal": {"name": "Legal", "description": "Law firms and legal services"},
        "automotive": {"name": "Automotive", "description": "Car dealerships and automotive services"},
        "hospitality": {"name": "Hospitality", "description": "Hotels and hospitality services"},
        "real_estate": {"name": "Real Estate", "description": "Real estate and property services"},
        "consulting": {"name": "Consulting", "description": "Consulting and professional services"},
        "fitness": {"name": "Fitness", "description": "Gyms and fitness centers"},
        "food_beverage": {"name": "Food & Beverage", "description": "Restaurants and food services"}
    }

@app.get("/api/models")
async def get_models():
    return [
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "cost_per_1k_tokens": 0.01, "recommended_for": ["healthcare", "finance", "legal"]},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "cost_per_1k_tokens": 0.002, "recommended_for": ["retail", "hospitality", "food_beverage"]},
        {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "cost_per_1k_tokens": 0.015, "recommended_for": ["education", "consulting"]},
        {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "cost_per_1k_tokens": 0.0025, "recommended_for": ["technology", "automotive"]},
        {"id": "gemini-pro", "name": "Gemini Pro", "cost_per_1k_tokens": 0.0005, "recommended_for": ["fitness", "real_estate"]}
    ]

if __name__ == "__main__":
    print("Starting Agent Wizard Service on http://0.0.0.0:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)