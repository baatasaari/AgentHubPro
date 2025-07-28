#!/usr/bin/env python3
"""
Dashboard Service - Cross-Service Data Aggregation and Real-Time Metrics
Port: 8004
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import httpx
import asyncio
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(
    title="Dashboard Service",
    description="Cross-Service Data Aggregation and Real-Time Metrics",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs for cross-service communication
SERVICES = {
    "agent-wizard": "http://localhost:8001",
    "analytics": "http://localhost:8002",
    "billing": "http://localhost:8003",
    "widget": "http://localhost:8005",
    "my-agents": "http://localhost:8006"
}

@app.get("/health")
async def health_check():
    # Check connectivity to other services
    service_status = {}
    for service_name, url in SERVICES.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{url}/health", timeout=3.0)
                service_status[service_name] = "healthy" if response.status_code == 200 else "degraded"
        except:
            service_status[service_name] = "unavailable"
    
    overall_status = "healthy" if all(s != "unavailable" for s in service_status.values()) else "degraded"
    
    return {
        "service": "dashboard-service",
        "status": overall_status,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": service_status
    }

@app.get("/api/dashboard/summary")
async def get_dashboard_summary():
    """Aggregate data from all services for dashboard overview"""
    dashboard_data = {
        "overview": {
            "total_agents": 0,
            "active_agents": 0,
            "total_conversations": 0,
            "total_cost": 0,
            "total_widgets": 0
        },
        "services_status": {},
        "recent_activity": [],
        "last_updated": datetime.utcnow().isoformat()
    }
    
    # Get data from Agent Wizard Service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['agent-wizard']}/api/agents", timeout=5.0)
            if response.status_code == 200:
                agents = response.json()
                dashboard_data["overview"]["total_agents"] = len(agents)
                dashboard_data["overview"]["active_agents"] = len([a for a in agents if a.get("status") == "active"])
                dashboard_data["services_status"]["agent-wizard"] = "healthy"
            else:
                dashboard_data["services_status"]["agent-wizard"] = "degraded"
    except:
        dashboard_data["services_status"]["agent-wizard"] = "unavailable"
    
    # Get data from Analytics Service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['analytics']}/api/analytics/usage", timeout=5.0)
            if response.status_code == 200:
                analytics_data = response.json()
                dashboard_data["overview"]["total_conversations"] = analytics_data.get("total_conversations", 0)
                dashboard_data["services_status"]["analytics"] = "healthy"
            else:
                dashboard_data["services_status"]["analytics"] = "degraded"
    except:
        dashboard_data["services_status"]["analytics"] = "unavailable"
    
    # Get data from Billing Service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['billing']}/api/billing/summary", timeout=5.0)
            if response.status_code == 200:
                billing_data = response.json()
                dashboard_data["overview"]["total_cost"] = billing_data.get("total_cost", 0)
                dashboard_data["services_status"]["billing"] = "healthy"
            else:
                dashboard_data["services_status"]["billing"] = "degraded"
    except:
        dashboard_data["services_status"]["billing"] = "unavailable"
    
    # Get data from Widget Service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['widget']}/api/widgets", timeout=5.0)
            if response.status_code == 200:
                widgets = response.json()
                dashboard_data["overview"]["total_widgets"] = len(widgets)
                dashboard_data["services_status"]["widget"] = "healthy"
            else:
                dashboard_data["services_status"]["widget"] = "degraded"
    except:
        dashboard_data["services_status"]["widget"] = "unavailable"
    
    # Get data from My Agents Service  
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['my-agents']}/api/my-agents/dashboard", timeout=5.0)
            if response.status_code == 200:
                my_agents_data = response.json()
                # Use My Agents data as authoritative source
                overview = my_agents_data.get("overview", {})
                dashboard_data["overview"].update(overview)
                dashboard_data["recent_activity"] = my_agents_data.get("recent_activity", [])
                dashboard_data["services_status"]["my-agents"] = "healthy"
            else:
                dashboard_data["services_status"]["my-agents"] = "degraded"
    except:
        dashboard_data["services_status"]["my-agents"] = "unavailable"
    
    return dashboard_data

@app.get("/api/dashboard")
async def get_full_dashboard():
    """Get comprehensive dashboard with detailed metrics from all services"""
    
    dashboard = {
        "summary": {},
        "agent_performance": {},
        "billing_breakdown": {},
        "widget_analytics": {},
        "system_health": {},
        "generated_at": datetime.utcnow().isoformat()
    }
    
    # Concurrent requests to all services
    async def fetch_service_data():
        tasks = []
        
        # Agent Wizard data
        tasks.append(("agents", f"{SERVICES['agent-wizard']}/api/agents"))
        
        # Analytics data
        tasks.append(("analytics", f"{SERVICES['analytics']}/api/analytics/dashboard"))
        
        # Billing data
        tasks.append(("billing", f"{SERVICES['billing']}/api/billing/summary"))
        
        # Widget data
        tasks.append(("widgets", f"{SERVICES['widget']}/api/widgets"))
        
        # My Agents data
        tasks.append(("my_agents", f"{SERVICES['my-agents']}/api/my-agents/dashboard"))
        
        results = {}
        
        async with httpx.AsyncClient() as client:
            for service_name, url in tasks:
                try:
                    response = await client.get(url, timeout=5.0)
                    if response.status_code == 200:
                        results[service_name] = response.json()
                    else:
                        results[service_name] = {"error": f"HTTP {response.status_code}"}
                except Exception as e:
                    results[service_name] = {"error": str(e)}
        
        return results
    
    service_data = await fetch_service_data()
    
    # Process agent data
    if "agents" in service_data and "error" not in service_data["agents"]:
        agents = service_data["agents"]
        dashboard["summary"]["total_agents"] = len(agents)
        dashboard["summary"]["active_agents"] = len([a for a in agents if a.get("status") == "active"])
        
        # Industry breakdown
        industry_breakdown = {}
        for agent in agents:
            industry = agent.get("industry", "unknown")
            industry_breakdown[industry] = industry_breakdown.get(industry, 0) + 1
        dashboard["agent_performance"]["by_industry"] = industry_breakdown
    
    # Process analytics data
    if "analytics" in service_data and "error" not in service_data["analytics"]:
        analytics = service_data["analytics"]
        dashboard["summary"].update({
            "total_conversations": analytics.get("total_conversations", 0),
            "average_satisfaction": analytics.get("average_satisfaction", 0)
        })
        dashboard["agent_performance"]["top_agents"] = analytics.get("top_performing_agents", [])
    
    # Process billing data
    if "billing" in service_data and "error" not in service_data["billing"]:
        billing = service_data["billing"]
        dashboard["summary"]["total_cost"] = billing.get("total_cost", 0)
        dashboard["billing_breakdown"] = {
            "by_agent": billing.get("agent_breakdown", {}),
            "by_model": billing.get("model_breakdown", {})
        }
    
    # Process widget data
    if "widgets" in service_data and "error" not in service_data["widgets"]:
        widgets = service_data["widgets"]
        dashboard["summary"]["total_widgets"] = len(widgets)
        
        # Widget template usage
        template_usage = {}
        for widget in widgets:
            theme = widget.get("theme", {})
            position = theme.get("position", "bottom-right")
            template_usage[position] = template_usage.get(position, 0) + 1
        dashboard["widget_analytics"]["position_distribution"] = template_usage
    
    # Process My Agents data (authoritative)
    if "my_agents" in service_data and "error" not in service_data["my_agents"]:
        my_agents = service_data["my_agents"]
        # Override with My Agents authoritative data
        dashboard["summary"].update(my_agents.get("overview", {}))
        dashboard["recent_activity"] = my_agents.get("recent_activity", [])
    
    # System health
    dashboard["system_health"] = {
        "services_operational": len([d for d in service_data.values() if "error" not in d]),
        "total_services": len(service_data),
        "service_status": {name: "healthy" if "error" not in data else "error" for name, data in service_data.items()}
    }
    
    return dashboard

@app.get("/api/dashboard/activity")
async def get_real_time_activity():
    """Get real-time activity feed from all services"""
    activity_feed = []
    
    # Get recent activity from My Agents service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['my-agents']}/api/my-agents/dashboard", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                activity_feed.extend(data.get("recent_activity", []))
    except:
        pass
    
    # Get recent conversations from Analytics
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['analytics']}/api/analytics/conversations?limit=10", timeout=5.0)
            if response.status_code == 200:
                conversations = response.json()
                for conv in conversations[-5:]:  # Last 5 conversations
                    activity_feed.append({
                        "type": "conversation",
                        "message": f"New conversation with agent {conv.get('agent_id', 'unknown')}",
                        "timestamp": conv.get("tracked_at", datetime.utcnow().isoformat()),
                        "details": {
                            "agent_id": conv.get("agent_id"),
                            "tokens_used": conv.get("tokens_used"),
                            "cost": conv.get("cost")
                        }
                    })
    except:
        pass
    
    # Sort by timestamp
    activity_feed.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return activity_feed[:20]  # Return last 20 activities

@app.get("/api/dashboard/metrics/{agent_id}")
async def get_agent_metrics(agent_id: str):
    """Get comprehensive metrics for a specific agent across all services"""
    
    agent_metrics = {
        "agent_id": agent_id,
        "agent_info": {},
        "performance": {},
        "usage": {},
        "widgets": [],
        "generated_at": datetime.utcnow().isoformat()
    }
    
    # Get agent info from Agent Wizard
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['agent-wizard']}/api/agents/{agent_id}", timeout=5.0)
            if response.status_code == 200:
                agent_metrics["agent_info"] = response.json()
    except:
        pass
    
    # Get performance metrics from Analytics
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['analytics']}/api/analytics/agents/{agent_id}/performance", timeout=5.0)
            if response.status_code == 200:
                agent_metrics["performance"] = response.json()
    except:
        pass
    
    # Get usage data from Billing
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['billing']}/api/billing/agents/{agent_id}/usage", timeout=5.0)
            if response.status_code == 200:
                agent_metrics["usage"] = response.json()
    except:
        pass
    
    # Get widgets from Widget service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVICES['widget']}/api/widgets?agent_id={agent_id}", timeout=5.0)
            if response.status_code == 200:
                agent_metrics["widgets"] = response.json()
    except:
        pass
    
    return agent_metrics

if __name__ == "__main__":
    print("Starting Dashboard Service on http://0.0.0.0:8004")
    uvicorn.run(app, host="0.0.0.0", port=8004)