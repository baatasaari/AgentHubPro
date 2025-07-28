"""
Dashboard Service Microservice
FastAPI-based service for dashboard data aggregation and real-time updates
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import asyncio
import aiohttp

# Initialize FastAPI app
app = FastAPI(
    title="Dashboard Service",
    description="Microservice for dashboard data aggregation and real-time updates",
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

# Service URLs (configurable via environment variables)
AGENT_SERVICE_URL = os.environ.get('AGENT_SERVICE_URL', 'http://localhost:8001')
ANALYTICS_SERVICE_URL = os.environ.get('ANALYTICS_SERVICE_URL', 'http://localhost:8002')
BILLING_SERVICE_URL = os.environ.get('BILLING_SERVICE_URL', 'http://localhost:8003')

# Data Models
class DashboardSummary(BaseModel):
    total_agents: int
    active_agents: int
    total_conversations: int
    total_revenue: float
    monthly_cost: float
    top_performing_agents: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    industry_breakdown: List[Dict[str, Any]]
    last_updated: datetime

class AgentOverview(BaseModel):
    id: str
    business_name: str
    industry: str
    status: str
    conversation_count: int
    total_cost: float
    last_active: Optional[datetime]

class ActivityFeed(BaseModel):
    id: str
    type: str  # agent_created, conversation, payment, etc.
    title: str
    description: str
    timestamp: datetime
    metadata: Dict[str, Any]

class DashboardMetrics(BaseModel):
    period: str
    conversations: int
    revenue: float
    cost: float
    active_agents: int
    satisfaction_score: float

class RealtimeUpdate(BaseModel):
    event_type: str
    event_data: Dict[str, Any]
    timestamp: datetime

# HTTP Client for microservice communication
async def call_service(url: str, endpoint: str, method: str = "GET", data: Optional[Dict] = None):
    """Call another microservice"""
    try:
        async with aiohttp.ClientSession() as session:
            full_url = f"{url}{endpoint}"
            
            if method == "GET":
                async with session.get(full_url) as response:
                    if response.status == 200:
                        return await response.json()
                    return None
            elif method == "POST":
                async with session.post(full_url, json=data) as response:
                    if response.status in [200, 201]:
                        return await response.json()
                    return None
    except Exception as e:
        print(f"Error calling {url}{endpoint}: {e}")
        return None

# Business Logic Functions
async def get_agent_data():
    """Get agent data from Agent Service"""
    agents = await call_service(AGENT_SERVICE_URL, "/api/agents")
    if not agents:
        return []
    
    agent_overviews = []
    for agent in agents:
        # Get performance data for each agent
        performance = await call_service(ANALYTICS_SERVICE_URL, f"/api/agents/{agent['id']}/performance")
        
        overview = AgentOverview(
            id=agent['id'],
            business_name=agent['business_name'],
            industry=agent['industry'],
            status=agent['status'],
            conversation_count=performance.get('conversation_count', 0) if performance else 0,
            total_cost=performance.get('total_cost', 0.0) if performance else 0.0,
            last_active=datetime.now() if performance else None
        )
        agent_overviews.append(overview)
    
    return agent_overviews

async def get_analytics_data():
    """Get analytics data from Analytics Service"""
    usage_stats = await call_service(ANALYTICS_SERVICE_URL, "/api/usage/stats")
    industry_metrics = await call_service(ANALYTICS_SERVICE_URL, "/api/industries/metrics")
    agent_performance = await call_service(ANALYTICS_SERVICE_URL, "/api/agents/performance")
    
    return {
        "usage_stats": usage_stats or {},
        "industry_metrics": industry_metrics or [],
        "agent_performance": agent_performance or []
    }

async def get_billing_data():
    """Get billing data from Billing Service"""
    billing_summary = await call_service(BILLING_SERVICE_URL, "/api/billing/summary")
    return billing_summary or {}

async def generate_activity_feed() -> List[ActivityFeed]:
    """Generate recent activity feed"""
    activities = []
    
    # Get recent conversations from analytics
    conversations = await call_service(ANALYTICS_SERVICE_URL, "/api/conversations?limit=5")
    if conversations:
        for conv in conversations:
            activity = ActivityFeed(
                id=str(uuid.uuid4()),
                type="conversation",
                title="New Conversation",
                description=f"Agent handled conversation for {conv.get('agent_id', 'unknown')}",
                timestamp=datetime.fromisoformat(conv['timestamp'].replace('Z', '+00:00')) if 'timestamp' in conv else datetime.now(),
                metadata={"conversation_id": conv.get('id'), "agent_id": conv.get('agent_id')}
            )
            activities.append(activity)
    
    # Get recent agents
    agents = await call_service(AGENT_SERVICE_URL, "/api/agents")
    if agents:
        for agent in agents[-3:]:  # Last 3 agents
            activity = ActivityFeed(
                id=str(uuid.uuid4()),
                type="agent_created",
                title="Agent Created",
                description=f"New agent '{agent['business_name']}' created for {agent['industry']}",
                timestamp=datetime.fromisoformat(agent['created_at'].replace('Z', '+00:00')) if 'created_at' in agent else datetime.now(),
                metadata={"agent_id": agent['id'], "industry": agent['industry']}
            )
            activities.append(activity)
    
    # Sort by timestamp
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:10]  # Return last 10 activities

def create_sample_dashboard_data() -> DashboardSummary:
    """Create sample dashboard data for fallback"""
    return DashboardSummary(
        total_agents=5,
        active_agents=3,
        total_conversations=47,
        total_revenue=234.50,
        monthly_cost=89.30,
        top_performing_agents=[
            {"id": "agent-1", "name": "HealthFirst Medical", "conversations": 15, "satisfaction": 4.8},
            {"id": "agent-2", "name": "RetailPro Assistant", "conversations": 12, "satisfaction": 4.6},
            {"id": "agent-3", "name": "TechSupport Bot", "conversations": 8, "satisfaction": 4.4}
        ],
        recent_activity=[
            {"type": "conversation", "message": "New conversation handled", "timestamp": datetime.now()},
            {"type": "agent_created", "message": "Agent created for healthcare", "timestamp": datetime.now() - timedelta(hours=2)}
        ],
        industry_breakdown=[
            {"industry": "Healthcare", "count": 2, "percentage": 40},
            {"industry": "Retail", "count": 2, "percentage": 40},
            {"industry": "Technology", "count": 1, "percentage": 20}
        ],
        last_updated=datetime.now()
    )

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint with service connectivity status"""
    service_health = {}
    
    # Check connectivity to other services
    agent_health = await call_service(AGENT_SERVICE_URL, "/health")
    analytics_health = await call_service(ANALYTICS_SERVICE_URL, "/health")
    billing_health = await call_service(BILLING_SERVICE_URL, "/health")
    
    service_health = {
        "agent_service": "healthy" if agent_health else "unreachable",
        "analytics_service": "healthy" if analytics_health else "unreachable",
        "billing_service": "healthy" if billing_health else "unreachable"
    }
    
    overall_status = "healthy" if all(status == "healthy" for status in service_health.values()) else "degraded"
    
    return {
        "status": overall_status,
        "service": "dashboard-service",
        "version": "1.0.0",
        "services": service_health,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    """Get comprehensive dashboard summary"""
    try:
        # Fetch data from all services
        agent_data = await get_agent_data()
        analytics_data = await get_analytics_data()
        billing_data = await get_billing_data()
        activity_feed = await generate_activity_feed()
        
        # Calculate summary metrics
        total_agents = len(agent_data)
        active_agents = len([a for a in agent_data if a.status == "active"])
        
        usage_stats = analytics_data.get("usage_stats", {})
        total_conversations = usage_stats.get("total_conversations", 0)
        
        total_revenue = billing_data.get("total_revenue", 0.0)
        monthly_cost = billing_data.get("pending_revenue", 0.0)
        
        # Top performing agents
        agent_performance = analytics_data.get("agent_performance", [])
        top_agents = sorted(agent_performance, key=lambda x: x.get("conversation_count", 0), reverse=True)[:3]
        
        # Industry breakdown
        industry_metrics = analytics_data.get("industry_metrics", [])
        
        return DashboardSummary(
            total_agents=total_agents,
            active_agents=active_agents,
            total_conversations=total_conversations,
            total_revenue=total_revenue,
            monthly_cost=monthly_cost,
            top_performing_agents=top_agents,
            recent_activity=[{
                "type": activity.type,
                "title": activity.title,
                "description": activity.description,
                "timestamp": activity.timestamp,
                "metadata": activity.metadata
            } for activity in activity_feed],
            industry_breakdown=industry_metrics,
            last_updated=datetime.now()
        )
        
    except Exception as e:
        print(f"Error generating dashboard summary: {e}")
        return create_sample_dashboard_data()

@app.get("/api/dashboard/agents", response_model=List[AgentOverview])
async def get_agent_overview():
    """Get agent overview for dashboard"""
    agent_data = await get_agent_data()
    return agent_data

@app.get("/api/dashboard/activity", response_model=List[ActivityFeed])
async def get_activity_feed():
    """Get recent activity feed"""
    return await generate_activity_feed()

@app.get("/api/dashboard/metrics")
async def get_dashboard_metrics(period: str = "30d"):
    """Get dashboard metrics for specified period"""
    period_days = 30
    if period == "7d":
        period_days = 7
    elif period == "90d":
        period_days = 90
    
    # Fetch metrics from analytics service
    usage_stats = await call_service(ANALYTICS_SERVICE_URL, f"/api/usage/stats?period_days={period_days}")
    billing_summary = await call_service(BILLING_SERVICE_URL, "/api/billing/summary")
    
    if not usage_stats or not billing_summary:
        return {
            "period": period,
            "conversations": 0,
            "revenue": 0.0,
            "cost": 0.0,
            "active_agents": 0,
            "satisfaction_score": 0.0
        }
    
    return DashboardMetrics(
        period=period,
        conversations=usage_stats.get("total_conversations", 0),
        revenue=billing_summary.get("total_revenue", 0.0),
        cost=billing_summary.get("pending_revenue", 0.0),
        active_agents=usage_stats.get("active_agents", 0),
        satisfaction_score=4.2  # This would come from analytics in a real implementation
    )

@app.get("/api/dashboard/trends")
async def get_trend_data(metric: str = "conversations", period: str = "30d"):
    """Get trend data for charts"""
    # This would typically aggregate data over time
    # For now, return sample trend data
    
    days = 30 if period == "30d" else 7 if period == "7d" else 90
    
    trend_data = []
    for i in range(days):
        date = datetime.now() - timedelta(days=days-i)
        value = 5 + (i % 7) * 2  # Sample trending data
        
        trend_data.append({
            "date": date.isoformat(),
            "value": value,
            "metric": metric
        })
    
    return {
        "metric": metric,
        "period": period,
        "data": trend_data,
        "generated_at": datetime.now().isoformat()
    }

@app.get("/api/dashboard/alerts")
async def get_dashboard_alerts():
    """Get dashboard alerts and notifications"""
    alerts = []
    
    # Check service health
    agent_health = await call_service(AGENT_SERVICE_URL, "/health")
    if not agent_health:
        alerts.append({
            "type": "error",
            "title": "Agent Service Unavailable",
            "message": "Unable to connect to Agent Service",
            "timestamp": datetime.now().isoformat()
        })
    
    # Check for high costs (placeholder logic)
    billing_data = await get_billing_data()
    if billing_data.get("pending_revenue", 0) > 100:
        alerts.append({
            "type": "warning",
            "title": "High Pending Costs",
            "message": f"Pending costs: ${billing_data.get('pending_revenue', 0):.2f}",
            "timestamp": datetime.now().isoformat()
        })
    
    return {"alerts": alerts}

@app.post("/api/dashboard/refresh")
async def refresh_dashboard():
    """Trigger dashboard data refresh"""
    try:
        # Refresh data from all services
        summary = await get_dashboard_summary()
        return {
            "status": "success",
            "message": "Dashboard data refreshed",
            "last_updated": summary.last_updated,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh dashboard: {str(e)}")

@app.get("/api/dashboard/status")
async def get_system_status():
    """Get overall system status"""
    # Check all services
    services = {
        "agent_service": await call_service(AGENT_SERVICE_URL, "/health"),
        "analytics_service": await call_service(ANALYTICS_SERVICE_URL, "/health"),
        "billing_service": await call_service(BILLING_SERVICE_URL, "/health")
    }
    
    service_statuses = {}
    for service, health in services.items():
        service_statuses[service] = {
            "status": "healthy" if health else "unhealthy",
            "last_check": datetime.now().isoformat()
        }
    
    overall_status = "healthy" if all(health for health in services.values()) else "degraded"
    
    return {
        "overall_status": overall_status,
        "services": service_statuses,
        "checked_at": datetime.now().isoformat()
    }

@app.get("/api/dashboard/export")
async def export_dashboard_data(format: str = "json"):
    """Export dashboard data"""
    summary = await get_dashboard_summary()
    
    if format.lower() == "csv":
        # TODO: Implement CSV export
        return {"message": "CSV export not yet implemented"}
    
    return {
        "format": format,
        "data": summary,
        "exported_at": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Dashboard Service on http://0.0.0.0:8004")
    uvicorn.run(app, host="0.0.0.0", port=8004, log_level="info")