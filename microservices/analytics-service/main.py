#!/usr/bin/env python3
"""
Analytics Service - Performance Metrics & Reporting
Efficient service for tracking agent performance and generating reports
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid

app = FastAPI(title="Analytics Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Models
class MetricType(str, Enum):
    CONVERSATIONS = "conversations"
    REVENUE = "revenue"
    SATISFACTION = "satisfaction"
    RESPONSE_TIME = "response_time"

class AnalyticsMetric(BaseModel):
    id: str
    agent_id: str
    metric_type: MetricType
    value: float
    timestamp: datetime
    metadata: Dict[str, Any] = {}

class PerformanceReport(BaseModel):
    agent_id: str
    period_start: datetime
    period_end: datetime
    metrics: Dict[str, Any]
    trends: Dict[str, float]

# Storage
metrics_db: Dict[str, AnalyticsMetric] = {}
reports_cache: Dict[str, PerformanceReport] = {}

# Sample data
def init_sample_metrics():
    sample_agents = ["1", "2", "3"]
    base_time = datetime.now() - timedelta(days=30)
    
    for agent_id in sample_agents:
        for day in range(30):
            timestamp = base_time + timedelta(days=day)
            
            # Generate metrics for each day
            metrics = [
                (MetricType.CONVERSATIONS, float(15 + (day % 10)), {}),
                (MetricType.REVENUE, float(250 + (day * 10)), {"currency": "USD"}),
                (MetricType.SATISFACTION, 4.0 + (day % 10) * 0.1, {"scale": "1-5"}),
                (MetricType.RESPONSE_TIME, 2.5 + (day % 5) * 0.2, {"unit": "seconds"})
            ]
            
            for metric_type, value, metadata in metrics:
                metric_id = f"{agent_id}-{metric_type}-{day}"
                metric = AnalyticsMetric(
                    id=metric_id,
                    agent_id=agent_id,
                    metric_type=metric_type,
                    value=value,
                    timestamp=timestamp,
                    metadata=metadata
                )
                metrics_db[metric_id] = metric

init_sample_metrics()

# Helper functions
def calculate_trend(values: List[float]) -> float:
    """Calculate trend percentage (positive = improving)"""
    if len(values) < 2:
        return 0.0
    
    first_half = sum(values[:len(values)//2]) / (len(values)//2)
    second_half = sum(values[len(values)//2:]) / (len(values) - len(values)//2)
    
    if first_half == 0:
        return 0.0
    
    return round(((second_half - first_half) / first_half) * 100, 2)

def get_agent_metrics(agent_id: str, metric_type: MetricType, days: int = 30) -> List[AnalyticsMetric]:
    """Get metrics for an agent within time period"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    return [
        metric for metric in metrics_db.values()
        if metric.agent_id == agent_id 
        and metric.metric_type == metric_type
        and metric.timestamp >= cutoff_date
    ]

# Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics", "metrics_count": len(metrics_db)}

@app.post("/api/analytics/metrics")
async def track_metric(metric: AnalyticsMetric):
    """Track a new metric"""
    metric.id = metric.id or str(uuid.uuid4())
    metrics_db[metric.id] = metric
    
    # Invalidate cache for this agent
    cache_key = f"report-{metric.agent_id}"
    if cache_key in reports_cache:
        del reports_cache[cache_key]
    
    return {"id": metric.id, "status": "tracked"}

@app.get("/api/analytics/metrics/{agent_id}")
async def get_metrics(
    agent_id: str,
    metric_type: Optional[MetricType] = None,
    days: int = Query(30, le=365)
):
    """Get metrics for an agent"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    agent_metrics = [
        metric for metric in metrics_db.values()
        if metric.agent_id == agent_id and metric.timestamp >= cutoff_date
    ]
    
    if metric_type:
        agent_metrics = [m for m in agent_metrics if m.metric_type == metric_type]
    
    return sorted(agent_metrics, key=lambda x: x.timestamp, reverse=True)

@app.get("/api/analytics/reports/{agent_id}")
async def get_performance_report(agent_id: str, days: int = Query(30, le=365)):
    """Generate performance report for an agent"""
    cache_key = f"report-{agent_id}-{days}"
    
    # Check cache first
    if cache_key in reports_cache:
        cached_report = reports_cache[cache_key]
        if (datetime.now() - cached_report.period_end).total_seconds() < 3600:  # 1 hour cache
            return cached_report
    
    period_end = datetime.now()
    period_start = period_end - timedelta(days=days)
    
    # Calculate metrics
    conversations = get_agent_metrics(agent_id, MetricType.CONVERSATIONS, days)
    revenue = get_agent_metrics(agent_id, MetricType.REVENUE, days)
    satisfaction = get_agent_metrics(agent_id, MetricType.SATISFACTION, days)
    response_times = get_agent_metrics(agent_id, MetricType.RESPONSE_TIME, days)
    
    metrics = {
        "total_conversations": sum(m.value for m in conversations),
        "total_revenue": sum(m.value for m in revenue),
        "avg_satisfaction": round(sum(m.value for m in satisfaction) / len(satisfaction) if satisfaction else 0, 2),
        "avg_response_time": round(sum(m.value for m in response_times) / len(response_times) if response_times else 0, 2),
        "data_points": len(conversations) + len(revenue) + len(satisfaction) + len(response_times)
    }
    
    # Calculate trends
    trends = {
        "conversations_trend": calculate_trend([m.value for m in conversations]),
        "revenue_trend": calculate_trend([m.value for m in revenue]),
        "satisfaction_trend": calculate_trend([m.value for m in satisfaction]),
        "response_time_trend": calculate_trend([-m.value for m in response_times])  # Negative for improvement
    }
    
    report = PerformanceReport(
        agent_id=agent_id,
        period_start=period_start,
        period_end=period_end,
        metrics=metrics,
        trends=trends
    )
    
    # Cache the report
    reports_cache[cache_key] = report
    
    return report

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get overall analytics summary"""
    total_metrics = len(metrics_db)
    unique_agents = len(set(m.agent_id for m in metrics_db.values()))
    
    recent_metrics = [
        m for m in metrics_db.values()
        if (datetime.now() - m.timestamp).total_seconds() < 24 * 3600  # Last 24 hours
    ]
    
    # Calculate platform-wide averages
    satisfaction_metrics = [m for m in recent_metrics if m.metric_type == MetricType.SATISFACTION]
    revenue_metrics = [m for m in recent_metrics if m.metric_type == MetricType.REVENUE]
    
    return {
        "total_metrics": total_metrics,
        "unique_agents": unique_agents,
        "recent_activity": len(recent_metrics),
        "platform_averages": {
            "satisfaction": round(sum(m.value for m in satisfaction_metrics) / len(satisfaction_metrics) if satisfaction_metrics else 0, 2),
            "daily_revenue": round(sum(m.value for m in revenue_metrics), 2)
        },
        "last_updated": max(m.timestamp for m in metrics_db.values()) if metrics_db else None
    }

@app.get("/api/analytics/compare")
async def compare_agents(agent_ids: List[str] = Query(...), days: int = Query(30, le=365)):
    """Compare performance between multiple agents"""
    comparison = {}
    
    for agent_id in agent_ids:
        conversations = get_agent_metrics(agent_id, MetricType.CONVERSATIONS, days)
        revenue = get_agent_metrics(agent_id, MetricType.REVENUE, days)
        satisfaction = get_agent_metrics(agent_id, MetricType.SATISFACTION, days)
        
        comparison[agent_id] = {
            "total_conversations": sum(m.value for m in conversations),
            "total_revenue": sum(m.value for m in revenue),
            "avg_satisfaction": round(sum(m.value for m in satisfaction) / len(satisfaction) if satisfaction else 0, 2),
            "metrics_count": len(conversations) + len(revenue) + len(satisfaction)
        }
    
    return {
        "comparison": comparison,
        "period_days": days,
        "compared_at": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Analytics Service on http://0.0.0.0:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")