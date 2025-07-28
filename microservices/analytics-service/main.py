"""
Analytics Service Microservice
FastAPI-based service for usage analytics, performance metrics, and reporting
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import yaml
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(
    title="Analytics Service",
    description="Microservice for agent usage analytics and performance metrics",
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

# Data Models
class ConversationEvent(BaseModel):
    id: str
    agent_id: str
    user_message: str
    agent_response: str
    tokens_used: int
    cost: float
    timestamp: datetime
    session_id: str
    response_time_ms: int
    satisfaction_score: Optional[int] = None

class UsageStats(BaseModel):
    total_conversations: int
    total_cost: float
    active_agents: int
    avg_response_time: float
    period_start: datetime
    period_end: datetime

class AgentPerformance(BaseModel):
    agent_id: str
    business_name: str
    industry: str
    conversation_count: int
    total_cost: float
    avg_response_time: float
    satisfaction_score: float
    active_sessions: int
    revenue_generated: float

class IndustryMetrics(BaseModel):
    industry: str
    agent_count: int
    conversation_count: int
    total_cost: float
    avg_satisfaction: float
    market_share: float

class ConversationCreate(BaseModel):
    agent_id: str
    user_message: str
    agent_response: str
    tokens_used: int
    cost: float
    session_id: str
    response_time_ms: int
    satisfaction_score: Optional[int] = None

    @field_validator('tokens_used')
    @classmethod
    def validate_tokens(cls, v):
        if v < 0:
            raise ValueError('Tokens used must be non-negative')
        return v

    @field_validator('cost')
    @classmethod
    def validate_cost(cls, v):
        if v < 0:
            raise ValueError('Cost must be non-negative')
        return v

    @field_validator('satisfaction_score')
    @classmethod
    def validate_satisfaction(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Satisfaction score must be between 1 and 5')
        return v

# Storage configuration
USE_BIGQUERY = os.environ.get('USE_BIGQUERY', 'false').lower() == 'true'

if USE_BIGQUERY:
    try:
        from bigquery_client import BigQueryClient
        bigquery_client = BigQueryClient()
        print("Analytics Service: BigQuery storage initialized")
    except Exception as e:
        print(f"Analytics Service: Failed to initialize BigQuery: {e}")
        USE_BIGQUERY = False
        bigquery_client = None
else:
    bigquery_client = None

# In-memory storage (fallback)
conversations_db: List[ConversationEvent] = []

# Sample data for development
def create_sample_data():
    """Create sample analytics data for development"""
    sample_conversations = [
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-1",
            "user_message": "I need help with my appointment",
            "agent_response": "I'd be happy to help you with your appointment. Let me check availability.",
            "tokens_used": 150,
            "cost": 0.015,
            "timestamp": datetime.now() - timedelta(hours=2),
            "session_id": "session-1",
            "response_time_ms": 1200,
            "satisfaction_score": 5
        },
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-2",
            "user_message": "What are your store hours?",
            "agent_response": "Our store is open Monday through Saturday from 9 AM to 8 PM, and Sunday from 11 AM to 6 PM.",
            "tokens_used": 80,
            "cost": 0.008,
            "timestamp": datetime.now() - timedelta(hours=1),
            "session_id": "session-2",
            "response_time_ms": 800,
            "satisfaction_score": 4
        },
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-1",
            "user_message": "Can you help me understand my billing?",
            "agent_response": "I can help explain your billing. Let me review your account details.",
            "tokens_used": 120,
            "cost": 0.012,
            "timestamp": datetime.now() - timedelta(minutes=30),
            "session_id": "session-3",
            "response_time_ms": 950,
            "satisfaction_score": 4
        }
    ]
    
    for conv_data in sample_conversations:
        conversation = ConversationEvent(**conv_data)
        conversations_db.append(conversation)

# Initialize sample data
create_sample_data()

# Business Logic Functions
def calculate_usage_stats(period_days: int = 30) -> UsageStats:
    """Calculate usage statistics for the specified period"""
    cutoff_date = datetime.now() - timedelta(days=period_days)
    period_conversations = [c for c in conversations_db if c.timestamp >= cutoff_date]
    
    if not period_conversations:
        return UsageStats(
            total_conversations=0,
            total_cost=0.0,
            active_agents=0,
            avg_response_time=0.0,
            period_start=cutoff_date,
            period_end=datetime.now()
        )
    
    total_conversations = len(period_conversations)
    total_cost = sum(c.cost for c in period_conversations)
    active_agents = len(set(c.agent_id for c in period_conversations))
    avg_response_time = sum(c.response_time_ms for c in period_conversations) / total_conversations
    
    return UsageStats(
        total_conversations=total_conversations,
        total_cost=total_cost,
        active_agents=active_agents,
        avg_response_time=avg_response_time,
        period_start=cutoff_date,
        period_end=datetime.now()
    )

def get_agent_performance(agent_id: str, period_days: int = 30) -> Optional[AgentPerformance]:
    """Get performance metrics for a specific agent"""
    cutoff_date = datetime.now() - timedelta(days=period_days)
    agent_conversations = [c for c in conversations_db 
                          if c.agent_id == agent_id and c.timestamp >= cutoff_date]
    
    if not agent_conversations:
        return None
    
    conversation_count = len(agent_conversations)
    total_cost = sum(c.cost for c in agent_conversations)
    avg_response_time = sum(c.response_time_ms for c in agent_conversations) / conversation_count
    
    # Calculate satisfaction score
    satisfaction_scores = [c.satisfaction_score for c in agent_conversations 
                          if c.satisfaction_score is not None]
    avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0.0
    
    # Count active sessions
    active_sessions = len(set(c.session_id for c in agent_conversations))
    
    # Estimate revenue (placeholder calculation)
    revenue_generated = total_cost * 10  # Assuming 10x markup for revenue estimation
    
    return AgentPerformance(
        agent_id=agent_id,
        business_name=f"Business for {agent_id}",
        industry="healthcare",  # This would come from agent service
        conversation_count=conversation_count,
        total_cost=total_cost,
        avg_response_time=avg_response_time,
        satisfaction_score=avg_satisfaction,
        active_sessions=active_sessions,
        revenue_generated=revenue_generated
    )

def get_industry_metrics() -> List[IndustryMetrics]:
    """Get metrics grouped by industry"""
    # This would typically query agent data from agent service
    # For now, return sample industry metrics
    return [
        IndustryMetrics(
            industry="healthcare",
            agent_count=2,
            conversation_count=15,
            total_cost=0.35,
            avg_satisfaction=4.2,
            market_share=0.3
        ),
        IndustryMetrics(
            industry="retail",
            agent_count=3,
            conversation_count=25,
            total_cost=0.45,
            avg_satisfaction=4.0,
            market_share=0.4
        ),
        IndustryMetrics(
            industry="finance",
            agent_count=1,
            conversation_count=8,
            total_cost=0.18,
            avg_satisfaction=4.5,
            market_share=0.2
        )
    ]

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "analytics-service",
        "version": "1.0.0",
        "storage": "bigquery" if USE_BIGQUERY else "in-memory",
        "conversations_count": len(conversations_db),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/conversations", response_model=ConversationEvent)
async def record_conversation(conversation: ConversationCreate):
    """Record a new conversation event"""
    conversation_event = ConversationEvent(
        id=str(uuid.uuid4()),
        agent_id=conversation.agent_id,
        user_message=conversation.user_message,
        agent_response=conversation.agent_response,
        tokens_used=conversation.tokens_used,
        cost=conversation.cost,
        timestamp=datetime.now(),
        session_id=conversation.session_id,
        response_time_ms=conversation.response_time_ms,
        satisfaction_score=conversation.satisfaction_score
    )
    
    # Store in BigQuery or in-memory
    if USE_BIGQUERY and bigquery_client:
        # TODO: Implement BigQuery storage for conversations
        pass
    else:
        conversations_db.append(conversation_event)
    
    return conversation_event

@app.get("/api/usage/stats", response_model=UsageStats)
async def get_usage_stats(period_days: int = 30):
    """Get usage statistics for the specified period"""
    return calculate_usage_stats(period_days)

@app.get("/api/agents/{agent_id}/performance", response_model=AgentPerformance)
async def get_agent_performance_metrics(agent_id: str, period_days: int = 30):
    """Get performance metrics for a specific agent"""
    performance = get_agent_performance(agent_id, period_days)
    if not performance:
        raise HTTPException(status_code=404, detail="No performance data found for agent")
    return performance

@app.get("/api/agents/performance", response_model=List[AgentPerformance])
async def get_all_agents_performance(period_days: int = 30):
    """Get performance metrics for all agents"""
    agent_ids = list(set(c.agent_id for c in conversations_db))
    performance_list = []
    
    for agent_id in agent_ids:
        performance = get_agent_performance(agent_id, period_days)
        if performance:
            performance_list.append(performance)
    
    return performance_list

@app.get("/api/industries/metrics", response_model=List[IndustryMetrics])
async def get_industry_analytics():
    """Get analytics grouped by industry"""
    return get_industry_metrics()

@app.get("/api/conversations", response_model=List[ConversationEvent])
async def get_conversations(
    agent_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get conversation events with optional filtering"""
    filtered_conversations = conversations_db
    
    if agent_id:
        filtered_conversations = [c for c in filtered_conversations if c.agent_id == agent_id]
    
    # Apply pagination
    end_index = offset + limit
    paginated_conversations = filtered_conversations[offset:end_index]
    
    return paginated_conversations

@app.get("/api/dashboard/summary")
async def get_dashboard_summary():
    """Get summary data for analytics dashboard"""
    stats = calculate_usage_stats(30)
    recent_conversations = conversations_db[-5:]  # Last 5 conversations
    top_agents = get_all_agents_performance(30)[:3]  # Top 3 agents
    
    return {
        "usage_stats": stats,
        "recent_conversations": recent_conversations,
        "top_performing_agents": top_agents,
        "industry_breakdown": get_industry_metrics(),
        "timestamp": datetime.now().isoformat()
    }

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation event"""
    global conversations_db
    
    conversation = next((c for c in conversations_db if c.id == conversation_id), None)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversations_db = [c for c in conversations_db if c.id != conversation_id]
    return {"message": "Conversation deleted successfully"}

@app.get("/api/analytics/export")
async def export_analytics(
    format: str = "json",
    agent_id: Optional[str] = None,
    period_days: int = 30
):
    """Export analytics data in various formats"""
    cutoff_date = datetime.now() - timedelta(days=period_days)
    filtered_conversations = [c for c in conversations_db if c.timestamp >= cutoff_date]
    
    if agent_id:
        filtered_conversations = [c for c in filtered_conversations if c.agent_id == agent_id]
    
    if format.lower() == "csv":
        # TODO: Implement CSV export
        return {"message": "CSV export not yet implemented"}
    
    return {
        "format": format,
        "period_days": period_days,
        "total_records": len(filtered_conversations),
        "conversations": filtered_conversations,
        "exported_at": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Analytics Service on http://0.0.0.0:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")