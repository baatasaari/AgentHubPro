#!/usr/bin/env python3
"""
Dashboard Service - Data Aggregation & Real-time Metrics
Efficient service for cross-service data aggregation and dashboard endpoints
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import aiohttp
import os

app = FastAPI(title="Dashboard Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Service URLs
SERVICES = {
    "my_agents": os.environ.get('MY_AGENTS_URL', 'http://localhost:8006'),
    "analytics": os.environ.get('ANALYTICS_URL', 'http://localhost:8002'),
    "billing": os.environ.get('BILLING_URL', 'http://localhost:8003'),
    "insights": os.environ.get('INSIGHTS_URL', 'http://localhost:8007'),
    "widget": os.environ.get('WIDGET_URL', 'http://localhost:8005')
}

# Models
class DashboardSummary(BaseModel):
    total_agents: int
    active_agents: int
    total_revenue: float
    total_conversations: int
    avg_satisfaction: float
    platform_distribution: Dict[str, int]
    recent_activity: int
    last_updated: datetime

class AgentPerformance(BaseModel):
    agent_id: str
    business_name: str
    industry: str
    conversations: int
    revenue: float
    satisfaction: float
    conversion_rate: float
    status: str

class DashboardAlert(BaseModel):
    id: str
    type: str  # "info", "warning", "error", "success"
    title: str
    message: str
    agent_id: Optional[str] = None
    created_at: datetime
    priority: int = 1  # 1=low, 2=medium, 3=high

# Storage
alerts_db: Dict[str, DashboardAlert] = {}
cached_summary: Optional[DashboardSummary] = None
cache_timestamp: Optional[datetime] = None

# Helper functions
async def fetch_service_data(service_url: str, endpoint: str, timeout: int = 5) -> Optional[Dict]:
    """Fetch data from a microservice with error handling"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{service_url}{endpoint}", timeout=timeout) as response:
                if response.status == 200:
                    return await response.json()
                return None
    except Exception:
        return None

async def aggregate_dashboard_data() -> DashboardSummary:
    """Aggregate data from all microservices"""
    
    # Fetch data from all services concurrently
    tasks = [
        fetch_service_data(SERVICES["my_agents"], "/api/agents"),
        fetch_service_data(SERVICES["analytics"], "/api/analytics/summary"),
        fetch_service_data(SERVICES["billing"], "/api/billing/summary"),
        fetch_service_data(SERVICES["insights"], "/api/insights/interactions"),
        fetch_service_data(SERVICES["widget"], "/api/widgets")
    ]
    
    agents_data, analytics_data, billing_data, insights_data, widgets_data = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process agents data
    total_agents = 0
    active_agents = 0
    if isinstance(agents_data, list):
        total_agents = len(agents_data)
        active_agents = len([a for a in agents_data if a.get("status") == "active"])
    
    # Process analytics data
    avg_satisfaction = 0.0
    recent_activity = 0
    if isinstance(analytics_data, dict):
        avg_satisfaction = analytics_data.get("platform_averages", {}).get("satisfaction", 0.0)
        recent_activity = analytics_data.get("recent_activity", 0)
    
    # Process billing data
    total_revenue = 0.0
    if isinstance(billing_data, dict):
        total_revenue = billing_data.get("total_revenue", 0.0)
    
    # Process insights data
    total_conversations = 0
    platform_distribution = {}
    if isinstance(insights_data, list):
        total_conversations = len(insights_data)
        for interaction in insights_data:
            platform = interaction.get("platform", "unknown")
            platform_distribution[platform] = platform_distribution.get(platform, 0) + 1
    
    return DashboardSummary(
        total_agents=total_agents,
        active_agents=active_agents,
        total_revenue=total_revenue,
        total_conversations=total_conversations,
        avg_satisfaction=avg_satisfaction,
        platform_distribution=platform_distribution,
        recent_activity=recent_activity,
        last_updated=datetime.now()
    )

async def get_agent_performance_data() -> List[AgentPerformance]:
    """Get performance data for all agents"""
    agents_data = await fetch_service_data(SERVICES["my_agents"], "/api/agents")
    
    if not isinstance(agents_data, list):
        return []
    
    performance_data = []
    
    for agent in agents_data:
        agent_id = agent.get("id", "")
        
        # Fetch analytics and insights for this agent
        analytics_task = fetch_service_data(SERVICES["analytics"], f"/api/analytics/reports/{agent_id}")
        insights_task = fetch_service_data(SERVICES["insights"], f"/api/insights/conversion-rates/{agent_id}")
        
        analytics_result, insights_result = await asyncio.gather(analytics_task, insights_task, return_exceptions=True)
        
        # Extract metrics
        conversations = 0
        revenue = 0.0
        satisfaction = 0.0
        conversion_rate = 0.0
        
        if isinstance(analytics_result, dict):
            metrics = analytics_result.get("metrics", {})
            conversations = int(metrics.get("total_conversations", 0))
            revenue = float(metrics.get("total_revenue", 0))
            satisfaction = float(metrics.get("avg_satisfaction", 0))
        
        if isinstance(insights_result, dict):
            conversion_rate = float(insights_result.get("conversion_rate", 0))
        
        performance = AgentPerformance(
            agent_id=agent_id,
            business_name=agent.get("business_name", "Unknown"),
            industry=agent.get("industry", "general"),
            conversations=conversations,
            revenue=revenue,
            satisfaction=satisfaction,
            conversion_rate=conversion_rate,
            status=agent.get("status", "unknown")
        )
        
        performance_data.append(performance)
    
    return sorted(performance_data, key=lambda x: x.revenue, reverse=True)

def generate_alerts(summary: DashboardSummary, performance_data: List[AgentPerformance]) -> List[DashboardAlert]:
    """Generate alerts based on current metrics"""
    alerts = []
    now = datetime.now()
    
    # Low satisfaction alert
    if summary.avg_satisfaction < 3.5:
        alerts.append(DashboardAlert(
            id=f"satisfaction-{int(now.timestamp())}",
            type="warning",
            title="Low Customer Satisfaction",
            message=f"Platform average satisfaction is {summary.avg_satisfaction:.1f}/5.0",
            created_at=now,
            priority=2
        ))
    
    # High performing agent alert
    top_performer = max(performance_data, key=lambda x: x.revenue) if performance_data else None
    if top_performer and top_performer.revenue > 1000:
        alerts.append(DashboardAlert(
            id=f"top-performer-{int(now.timestamp())}",
            type="success",
            title="High Performing Agent",
            message=f"{top_performer.business_name} generated ${top_performer.revenue:.0f} in revenue",
            agent_id=top_performer.agent_id,
            created_at=now,
            priority=1
        ))
    
    # Low activity alert
    if summary.recent_activity == 0:
        alerts.append(DashboardAlert(
            id=f"activity-{int(now.timestamp())}",
            type="info",
            title="Low Recent Activity",
            message="No recent customer interactions in the last 24 hours",
            created_at=now,
            priority=1
        ))
    
    # Agent status alerts
    inactive_agents = [p for p in performance_data if p.status != "active"]
    if len(inactive_agents) > 0:
        alerts.append(DashboardAlert(
            id=f"inactive-{int(now.timestamp())}",
            type="warning",
            title="Inactive Agents",
            message=f"{len(inactive_agents)} agents are not currently active",
            created_at=now,
            priority=2
        ))
    
    return alerts

# Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dashboard", "services_configured": len(SERVICES)}

@app.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    """Get comprehensive dashboard summary"""
    global cached_summary, cache_timestamp
    
    # Use cache if less than 2 minutes old
    if cached_summary and cache_timestamp and (datetime.now() - cache_timestamp).total_seconds() < 120:
        return cached_summary
    
    summary = await aggregate_dashboard_data()
    
    # Update cache
    cached_summary = summary
    cache_timestamp = datetime.now()
    
    return summary

@app.get("/api/dashboard/performance", response_model=List[AgentPerformance])
async def get_agent_performance(limit: int = Query(10, le=50)):
    """Get agent performance rankings"""
    performance_data = await get_agent_performance_data()
    return performance_data[:limit]

@app.get("/api/dashboard/alerts", response_model=List[DashboardAlert])
async def get_dashboard_alerts():
    """Get current dashboard alerts"""
    summary = await aggregate_dashboard_data()
    performance_data = await get_agent_performance_data()
    
    # Generate new alerts
    new_alerts = generate_alerts(summary, performance_data)
    
    # Store alerts (replace existing for simplicity)
    alerts_db.clear()
    for alert in new_alerts:
        alerts_db[alert.id] = alert
    
    return sorted(alerts_db.values(), key=lambda x: (x.priority, x.created_at), reverse=True)

@app.get("/api/dashboard/metrics/{agent_id}")
async def get_agent_metrics(agent_id: str):
    """Get detailed metrics for a specific agent"""
    # Fetch from multiple services
    tasks = [
        fetch_service_data(SERVICES["my_agents"], f"/api/agents/{agent_id}"),
        fetch_service_data(SERVICES["analytics"], f"/api/analytics/reports/{agent_id}"),
        fetch_service_data(SERVICES["billing"], f"/api/billing/costs/{agent_id}"),
        fetch_service_data(SERVICES["insights"], f"/api/insights/dashboard/{agent_id}"),
        fetch_service_data(SERVICES["widget"], f"/api/widgets?agent_id={agent_id}")
    ]
    
    agent_data, analytics_data, billing_data, insights_data, widgets_data = await asyncio.gather(*tasks, return_exceptions=True)
    
    if not isinstance(agent_data, dict):
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "agent": agent_data,
        "analytics": analytics_data if isinstance(analytics_data, dict) else {},
        "billing": billing_data if isinstance(billing_data, dict) else {},
        "insights": insights_data if isinstance(insights_data, dict) else {},
        "widgets": widgets_data if isinstance(widgets_data, list) else [],
        "retrieved_at": datetime.now()
    }

@app.get("/api/dashboard/trends")
async def get_platform_trends(days: int = Query(7, le=30)):
    """Get platform-wide trends over time"""
    # This would typically fetch historical data
    # For now, return sample trend data
    
    base_date = datetime.now() - timedelta(days=days)
    trends = {
        "conversations": [],
        "revenue": [],
        "satisfaction": [],
        "agents": []
    }
    
    for i in range(days):
        date = base_date + timedelta(days=i)
        trends["conversations"].append({
            "date": date.strftime("%Y-%m-%d"),
            "value": 50 + (i * 5) + (i % 3) * 10
        })
        trends["revenue"].append({
            "date": date.strftime("%Y-%m-%d"),
            "value": 1200 + (i * 100) + (i % 4) * 200
        })
        trends["satisfaction"].append({
            "date": date.strftime("%Y-%m-%d"),
            "value": 4.2 + (i % 5) * 0.1
        })
        trends["agents"].append({
            "date": date.strftime("%Y-%m-%d"),
            "value": 10 + (i // 2)
        })
    
    return {
        "period_days": days,
        "trends": trends,
        "generated_at": datetime.now()
    }

@app.get("/api/dashboard/realtime")
async def get_realtime_metrics():
    """Get real-time platform metrics"""
    # Fetch recent data from services
    summary = await aggregate_dashboard_data()
    
    return {
        "active_conversations": summary.recent_activity,
        "revenue_today": summary.total_revenue * 0.1,  # Estimate today's revenue
        "active_agents": summary.active_agents,
        "platform_health": "healthy" if summary.active_agents > 0 else "warning",
        "last_activity": summary.last_updated,
        "platform_status": {
            "agents_service": "up",
            "analytics_service": "up",
            "billing_service": "up",
            "insights_service": "up",
            "widget_service": "up"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Dashboard Service on http://0.0.0.0:8004")
    uvicorn.run(app, host="0.0.0.0", port=8004, log_level="info")