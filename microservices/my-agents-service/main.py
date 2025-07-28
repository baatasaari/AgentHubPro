"""
My Agents Service Microservice
FastAPI-based service for comprehensive agent management (CRUD, enable, disable, lifecycle)
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import os
import asyncio
import aiohttp

# Initialize FastAPI app
app = FastAPI(
    title="My Agents Service",
    description="Microservice for comprehensive agent management and lifecycle operations",
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

# Service URLs for cross-service communication
AGENT_WIZARD_URL = os.environ.get('AGENT_WIZARD_URL', 'http://localhost:8001')
ANALYTICS_SERVICE_URL = os.environ.get('ANALYTICS_SERVICE_URL', 'http://localhost:8002')
BILLING_SERVICE_URL = os.environ.get('BILLING_SERVICE_URL', 'http://localhost:8003')
WIDGET_SERVICE_URL = os.environ.get('WIDGET_SERVICE_URL', 'http://localhost:8005')

# Data Models
class AgentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"
    ARCHIVED = "archived"

class AgentPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_domain: Optional[str] = None
    industry: Optional[str] = None
    llm_model: Optional[str] = None
    interface_type: Optional[str] = None
    status: Optional[AgentStatus] = None
    priority: Optional[AgentPriority] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class AgentStatusChange(BaseModel):
    status: AgentStatus
    reason: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class AgentFilter(BaseModel):
    status: Optional[AgentStatus] = None
    industry: Optional[str] = None
    priority: Optional[AgentPriority] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

class AgentMetrics(BaseModel):
    agent_id: str
    total_conversations: int
    total_cost: float
    avg_response_time: float
    satisfaction_score: float
    uptime_percentage: float
    last_conversation: Optional[datetime]
    performance_trend: str  # improving, stable, declining

class AgentSummary(BaseModel):
    id: str
    business_name: str
    industry: str
    status: AgentStatus
    priority: AgentPriority
    created_at: datetime
    last_active: Optional[datetime]
    conversation_count: int
    total_cost: float
    tags: List[str]
    has_widget: bool
    performance_score: float

class BulkOperation(BaseModel):
    agent_ids: List[str]
    operation: str  # enable, disable, archive, delete
    reason: Optional[str] = None

class AgentBackup(BaseModel):
    agent_id: str
    backup_data: Dict[str, Any]
    created_at: datetime
    version: str

# Storage
USE_BIGQUERY = os.environ.get('USE_BIGQUERY', 'false').lower() == 'true'

# In-memory storage for agent management metadata
agents_metadata_db: Dict[str, Dict[str, Any]] = {}
status_history_db: List[Dict[str, Any]] = []
agent_backups_db: List[AgentBackup] = []

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
            elif method == "PATCH":
                async with session.patch(full_url, json=data) as response:
                    if response.status == 200:
                        return await response.json()
                    return None
            elif method == "DELETE":
                async with session.delete(full_url) as response:
                    return response.status in [200, 204]
    except Exception as e:
        print(f"Error calling {url}{endpoint}: {e}")
        return None

# Business Logic Functions
def create_agent_metadata(agent_id: str, priority: AgentPriority = AgentPriority.MEDIUM):
    """Create metadata for agent management"""
    metadata = {
        "priority": priority,
        "tags": [],
        "notes": "",
        "created_at": datetime.now(),
        "last_modified": datetime.now(),
        "status_changes": 0,
        "performance_alerts": [],
        "maintenance_windows": [],
        "auto_scale_enabled": False,
        "monitoring_enabled": True
    }
    agents_metadata_db[agent_id] = metadata
    return metadata

def log_status_change(agent_id: str, old_status: str, new_status: str, reason: str = None):
    """Log agent status changes for audit trail"""
    status_change = {
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "old_status": old_status,
        "new_status": new_status,
        "reason": reason,
        "timestamp": datetime.now(),
        "user_id": "system"  # Would be actual user in production
    }
    status_history_db.append(status_change)
    
    # Update metadata
    if agent_id in agents_metadata_db:
        agents_metadata_db[agent_id]["status_changes"] += 1
        agents_metadata_db[agent_id]["last_modified"] = datetime.now()

async def get_agent_from_wizard(agent_id: str):
    """Get agent details from Agent Wizard service"""
    return await call_service(AGENT_WIZARD_URL, f"/api/agents/{agent_id}")

async def get_agent_metrics(agent_id: str) -> Optional[AgentMetrics]:
    """Get comprehensive agent metrics from analytics service"""
    performance = await call_service(ANALYTICS_SERVICE_URL, f"/api/agents/{agent_id}/performance")
    if not performance:
        return None
    
    return AgentMetrics(
        agent_id=agent_id,
        total_conversations=performance.get("conversation_count", 0),
        total_cost=performance.get("total_cost", 0.0),
        avg_response_time=performance.get("avg_response_time", 0.0),
        satisfaction_score=performance.get("satisfaction_score", 0.0),
        uptime_percentage=95.5,  # Would calculate from monitoring data
        last_conversation=datetime.now() - timedelta(hours=2),  # Sample data
        performance_trend="stable"
    )

async def get_all_agents_summary(filters: Optional[AgentFilter] = None) -> List[AgentSummary]:
    """Get summary of all agents with filtering"""
    # Get agents from Agent Wizard
    agents = await call_service(AGENT_WIZARD_URL, "/api/agents")
    if not agents:
        return []
    
    summaries = []
    for agent in agents:
        agent_id = agent["id"]
        
        # Get metadata
        metadata = agents_metadata_db.get(agent_id, {})
        
        # Get metrics
        metrics = await get_agent_metrics(agent_id)
        
        # Check if has widget
        widgets = await call_service(WIDGET_SERVICE_URL, f"/api/widgets?agent_id={agent_id}")
        has_widget = widgets and len(widgets) > 0
        
        summary = AgentSummary(
            id=agent_id,
            business_name=agent["business_name"],
            industry=agent["industry"],
            status=AgentStatus(agent.get("status", "draft")),
            priority=AgentPriority(metadata.get("priority", "medium")),
            created_at=datetime.fromisoformat(agent["created_at"].replace('Z', '+00:00')) if 'created_at' in agent else datetime.now(),
            last_active=metrics.last_conversation if metrics else None,
            conversation_count=metrics.total_conversations if metrics else 0,
            total_cost=metrics.total_cost if metrics else 0.0,
            tags=metadata.get("tags", []),
            has_widget=has_widget,
            performance_score=metrics.satisfaction_score if metrics else 0.0
        )
        
        # Apply filters
        if filters:
            if filters.status and summary.status != filters.status:
                continue
            if filters.industry and summary.industry != filters.industry:
                continue
            if filters.priority and summary.priority != filters.priority:
                continue
            if filters.tags and not any(tag in summary.tags for tag in filters.tags):
                continue
            if filters.created_after and summary.created_at < filters.created_after:
                continue
            if filters.created_before and summary.created_at > filters.created_before:
                continue
        
        summaries.append(summary)
    
    return summaries

def create_agent_backup(agent_id: str, agent_data: Dict[str, Any]) -> AgentBackup:
    """Create backup of agent configuration"""
    backup = AgentBackup(
        agent_id=agent_id,
        backup_data=agent_data,
        created_at=datetime.now(),
        version="1.0"
    )
    agent_backups_db.append(backup)
    return backup

# Initialize sample metadata
def create_sample_data():
    """Create sample agent metadata"""
    sample_agents = ["agent-1", "agent-2", "agent-3"]
    priorities = [AgentPriority.HIGH, AgentPriority.MEDIUM, AgentPriority.LOW]
    
    for i, agent_id in enumerate(sample_agents):
        metadata = create_agent_metadata(agent_id, priorities[i])
        metadata["tags"] = ["healthcare", "production"] if i == 0 else ["retail", "beta"] if i == 1 else ["test"]

create_sample_data()

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint with service connectivity"""
    service_health = {}
    
    # Check connectivity to other services
    wizard_health = await call_service(AGENT_WIZARD_URL, "/health")
    analytics_health = await call_service(ANALYTICS_SERVICE_URL, "/health")
    billing_health = await call_service(BILLING_SERVICE_URL, "/health")
    widget_health = await call_service(WIDGET_SERVICE_URL, "/health")
    
    service_health = {
        "agent_wizard": "healthy" if wizard_health else "unreachable",
        "analytics_service": "healthy" if analytics_health else "unreachable",
        "billing_service": "healthy" if billing_health else "unreachable",
        "widget_service": "healthy" if widget_health else "unreachable"
    }
    
    overall_status = "healthy" if all(status == "healthy" for status in service_health.values()) else "degraded"
    
    return {
        "status": overall_status,
        "service": "my-agents-service",
        "version": "1.0.0",
        "managed_agents": len(agents_metadata_db),
        "services": service_health,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/my-agents", response_model=List[AgentSummary])
async def get_my_agents(
    status: Optional[AgentStatus] = None,
    industry: Optional[str] = None,
    priority: Optional[AgentPriority] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get all managed agents with filtering and pagination"""
    filters = AgentFilter(
        status=status,
        industry=industry,
        priority=priority
    )
    
    summaries = await get_all_agents_summary(filters)
    
    # Apply pagination
    total = len(summaries)
    paginated = summaries[offset:offset + limit]
    
    return paginated

@app.get("/api/my-agents/{agent_id}")
async def get_agent_details(agent_id: str):
    """Get detailed information about a specific agent"""
    # Get agent from wizard service
    agent = await get_agent_from_wizard(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get metadata
    metadata = agents_metadata_db.get(agent_id, {})
    
    # Get metrics
    metrics = await get_agent_metrics(agent_id)
    
    # Get widgets
    widgets = await call_service(WIDGET_SERVICE_URL, f"/api/widgets?agent_id={agent_id}")
    
    # Get status history
    status_history = [sh for sh in status_history_db if sh["agent_id"] == agent_id]
    
    return {
        "agent": agent,
        "metadata": metadata,
        "metrics": metrics.dict() if metrics else None,
        "widgets": widgets or [],
        "status_history": status_history[-10:],  # Last 10 status changes
        "backups_available": len([b for b in agent_backups_db if b.agent_id == agent_id])
    }

@app.patch("/api/my-agents/{agent_id}")
async def update_agent(agent_id: str, update_data: AgentUpdate):
    """Update agent configuration and metadata"""
    # Get current agent
    current_agent = await get_agent_from_wizard(agent_id)
    if not current_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create backup before update
    create_agent_backup(agent_id, current_agent)
    
    # Prepare update for Agent Wizard
    agent_update = {}
    if update_data.business_name:
        agent_update["business_name"] = update_data.business_name
    if update_data.business_description:
        agent_update["business_description"] = update_data.business_description
    if update_data.business_domain:
        agent_update["business_domain"] = update_data.business_domain
    if update_data.industry:
        agent_update["industry"] = update_data.industry
    if update_data.llm_model:
        agent_update["llm_model"] = update_data.llm_model
    if update_data.interface_type:
        agent_update["interface_type"] = update_data.interface_type
    
    # Update agent in wizard service
    if agent_update:
        updated_agent = await call_service(
            AGENT_WIZARD_URL, 
            f"/api/agents/{agent_id}", 
            "PATCH", 
            agent_update
        )
        if not updated_agent:
            raise HTTPException(status_code=500, detail="Failed to update agent")
    
    # Update metadata
    if agent_id not in agents_metadata_db:
        create_agent_metadata(agent_id)
    
    metadata = agents_metadata_db[agent_id]
    
    if update_data.priority:
        metadata["priority"] = update_data.priority
    if update_data.tags is not None:
        metadata["tags"] = update_data.tags
    if update_data.notes is not None:
        metadata["notes"] = update_data.notes
    
    # Handle status change
    if update_data.status:
        old_status = current_agent.get("status", "draft")
        if old_status != update_data.status:
            # Update status in wizard service
            status_update = await call_service(
                AGENT_WIZARD_URL,
                f"/api/agents/{agent_id}",
                "PATCH",
                {"status": update_data.status}
            )
            
            if status_update:
                log_status_change(agent_id, old_status, update_data.status, "Manual update")
    
    metadata["last_modified"] = datetime.now()
    
    return {"message": "Agent updated successfully", "agent_id": agent_id}

@app.post("/api/my-agents/{agent_id}/status")
async def change_agent_status(agent_id: str, status_change: AgentStatusChange):
    """Change agent status with logging and scheduling"""
    # Get current agent
    current_agent = await get_agent_from_wizard(agent_id)
    if not current_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    old_status = current_agent.get("status", "draft")
    
    # Validate status transition
    valid_transitions = {
        "draft": ["active", "archived"],
        "active": ["paused", "disabled", "archived"],
        "paused": ["active", "disabled", "archived"],
        "disabled": ["active", "archived"],
        "archived": []  # No transitions from archived
    }
    
    if old_status == "archived":
        raise HTTPException(status_code=400, detail="Cannot change status of archived agent")
    
    if status_change.status not in valid_transitions.get(old_status, []):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status transition from {old_status} to {status_change.status}"
        )
    
    # Handle scheduled status change
    if status_change.scheduled_at and status_change.scheduled_at > datetime.now():
        # In production, this would be queued for later execution
        return {
            "message": f"Status change scheduled for {status_change.scheduled_at}",
            "scheduled": True,
            "agent_id": agent_id
        }
    
    # Update status immediately
    update_result = await call_service(
        AGENT_WIZARD_URL,
        f"/api/agents/{agent_id}",
        "PATCH",
        {"status": status_change.status}
    )
    
    if not update_result:
        raise HTTPException(status_code=500, detail="Failed to update agent status")
    
    # Log the change
    log_status_change(agent_id, old_status, status_change.status, status_change.reason)
    
    return {
        "message": f"Agent status changed from {old_status} to {status_change.status}",
        "agent_id": agent_id,
        "old_status": old_status,
        "new_status": status_change.status
    }

@app.post("/api/my-agents/{agent_id}/enable")
async def enable_agent(agent_id: str, reason: Optional[str] = None):
    """Enable an agent (set status to active)"""
    status_change = AgentStatusChange(status=AgentStatus.ACTIVE, reason=reason)
    return await change_agent_status(agent_id, status_change)

@app.post("/api/my-agents/{agent_id}/disable")
async def disable_agent(agent_id: str, reason: Optional[str] = None):
    """Disable an agent (set status to disabled)"""
    status_change = AgentStatusChange(status=AgentStatus.DISABLED, reason=reason)
    return await change_agent_status(agent_id, status_change)

@app.post("/api/my-agents/{agent_id}/pause")
async def pause_agent(agent_id: str, reason: Optional[str] = None):
    """Pause an agent (set status to paused)"""
    status_change = AgentStatusChange(status=AgentStatus.PAUSED, reason=reason)
    return await change_agent_status(agent_id, status_change)

@app.post("/api/my-agents/{agent_id}/archive")
async def archive_agent(agent_id: str, reason: Optional[str] = None):
    """Archive an agent (set status to archived)"""
    # Create final backup
    current_agent = await get_agent_from_wizard(agent_id)
    if current_agent:
        create_agent_backup(agent_id, current_agent)
    
    status_change = AgentStatusChange(status=AgentStatus.ARCHIVED, reason=reason)
    return await change_agent_status(agent_id, status_change)

@app.delete("/api/my-agents/{agent_id}")
async def delete_agent(agent_id: str, confirm: bool = False):
    """Delete an agent permanently"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Deletion requires explicit confirmation. Add ?confirm=true"
        )
    
    # Create final backup
    current_agent = await get_agent_from_wizard(agent_id)
    if current_agent:
        create_agent_backup(agent_id, current_agent)
    
    # Delete from wizard service
    deleted = await call_service(AGENT_WIZARD_URL, f"/api/agents/{agent_id}", "DELETE")
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete agent")
    
    # Clean up metadata
    if agent_id in agents_metadata_db:
        del agents_metadata_db[agent_id]
    
    # Log deletion
    log_status_change(agent_id, "any", "deleted", "Permanent deletion")
    
    return {"message": "Agent deleted permanently", "agent_id": agent_id}

@app.post("/api/my-agents/bulk")
async def bulk_operations(operation: BulkOperation):
    """Perform bulk operations on multiple agents"""
    results = []
    
    for agent_id in operation.agent_ids:
        try:
            if operation.operation == "enable":
                result = await enable_agent(agent_id, operation.reason)
            elif operation.operation == "disable":
                result = await disable_agent(agent_id, operation.reason)
            elif operation.operation == "archive":
                result = await archive_agent(agent_id, operation.reason)
            elif operation.operation == "delete":
                result = await delete_agent(agent_id, confirm=True)
            else:
                result = {"error": f"Unknown operation: {operation.operation}"}
            
            results.append({"agent_id": agent_id, "status": "success", "result": result})
        except Exception as e:
            results.append({"agent_id": agent_id, "status": "error", "error": str(e)})
    
    return {
        "operation": operation.operation,
        "total_agents": len(operation.agent_ids),
        "results": results,
        "successful": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "error"])
    }

@app.get("/api/my-agents/{agent_id}/metrics", response_model=AgentMetrics)
async def get_agent_performance_metrics(agent_id: str):
    """Get comprehensive performance metrics for an agent"""
    metrics = await get_agent_metrics(agent_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not found for agent")
    return metrics

@app.get("/api/my-agents/{agent_id}/status-history")
async def get_agent_status_history(agent_id: str, limit: int = 20):
    """Get status change history for an agent"""
    history = [sh for sh in status_history_db if sh["agent_id"] == agent_id]
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"agent_id": agent_id, "history": history[:limit]}

@app.get("/api/my-agents/{agent_id}/backups")
async def get_agent_backups(agent_id: str):
    """Get available backups for an agent"""
    backups = [b for b in agent_backups_db if b.agent_id == agent_id]
    backups.sort(key=lambda x: x.created_at, reverse=True)
    return {
        "agent_id": agent_id,
        "backups": [{"created_at": b.created_at, "version": b.version} for b in backups],
        "total": len(backups)
    }

@app.post("/api/my-agents/{agent_id}/restore")
async def restore_agent_backup(agent_id: str, backup_date: datetime):
    """Restore agent from backup"""
    # Find backup
    backup = next((b for b in agent_backups_db 
                   if b.agent_id == agent_id and b.created_at == backup_date), None)
    
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Restore agent in wizard service
    restored = await call_service(
        AGENT_WIZARD_URL,
        f"/api/agents/{agent_id}",
        "PATCH",
        backup.backup_data
    )
    
    if not restored:
        raise HTTPException(status_code=500, detail="Failed to restore agent")
    
    log_status_change(agent_id, "any", "restored", f"Restored from backup {backup_date}")
    
    return {
        "message": "Agent restored from backup",
        "agent_id": agent_id,
        "backup_date": backup_date
    }

@app.get("/api/my-agents/dashboard")
async def get_agents_dashboard():
    """Get dashboard overview of all managed agents"""
    summaries = await get_all_agents_summary()
    
    # Calculate statistics
    total_agents = len(summaries)
    active_agents = len([s for s in summaries if s.status == AgentStatus.ACTIVE])
    paused_agents = len([s for s in summaries if s.status == AgentStatus.PAUSED])
    disabled_agents = len([s for s in summaries if s.status == AgentStatus.DISABLED])
    
    # Industry breakdown
    industries = {}
    for summary in summaries:
        industries[summary.industry] = industries.get(summary.industry, 0) + 1
    
    # Priority breakdown
    priorities = {}
    for summary in summaries:
        priorities[summary.priority] = priorities.get(summary.priority, 0) + 1
    
    # Performance metrics
    total_conversations = sum(s.conversation_count for s in summaries)
    total_cost = sum(s.total_cost for s in summaries)
    avg_performance = sum(s.performance_score for s in summaries) / len(summaries) if summaries else 0
    
    return {
        "overview": {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "paused_agents": paused_agents,
            "disabled_agents": disabled_agents,
            "total_conversations": total_conversations,
            "total_cost": total_cost,
            "avg_performance_score": avg_performance
        },
        "breakdown": {
            "by_industry": industries,
            "by_priority": priorities,
            "by_status": {
                "active": active_agents,
                "paused": paused_agents,
                "disabled": disabled_agents,
                "draft": len([s for s in summaries if s.status == AgentStatus.DRAFT]),
                "archived": len([s for s in summaries if s.status == AgentStatus.ARCHIVED])
            }
        },
        "recent_activity": status_history_db[-10:],  # Last 10 status changes
        "last_updated": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting My Agents Service on http://0.0.0.0:8006")
    uvicorn.run(app, host="0.0.0.0", port=8006, log_level="info")