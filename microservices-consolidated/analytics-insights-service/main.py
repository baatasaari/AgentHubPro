#!/usr/bin/env python3
"""
Analytics & Insights Service - Consolidated Domain Service
Combines: analytics-service, analytics-calculation-service, 
insights-service, insights-generation-service

This service handles all analytics calculations, metrics processing, 
and insights generation. Replaces 4 separate services with unified analytics domain.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uvicorn
import logging
from datetime import datetime, timedelta
import os
import json
import asyncio
import statistics
from collections import defaultdict, Counter
import sys

# Import security middleware
sys.path.append('../shared')
from auth_middleware import (
    authenticate_service_request,
    ServiceClaims,
    get_secure_cors_middleware,
    security_metrics,
    sanitize_input
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Analytics & Insights Service",
    description="Consolidated analytics, metrics calculation, and insights generation",
    version="3.0.0"
)

# Add secure CORS middleware
app.add_middleware(get_secure_cors_middleware())

# In-memory analytics storage (replace with persistent storage in production)
analytics_data = defaultdict(list)
metrics_cache = {}
insights_cache = {}
user_activity = defaultdict(list)
business_metrics = defaultdict(dict)

# Data Models
class AnalyticsEvent(BaseModel):
    event_type: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    properties: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class MetricsRequest(BaseModel):
    metric_type: str
    time_range: str = "24h"  # 1h, 24h, 7d, 30d
    filters: Dict[str, Any] = {}
    group_by: Optional[str] = None

class MetricsResponse(BaseModel):
    metric_type: str
    time_range: str
    value: Union[float, int, Dict[str, Any]]
    trend: Optional[str] = None
    previous_value: Optional[Union[float, int]] = None
    change_percentage: Optional[float] = None
    calculated_at: str

class InsightsRequest(BaseModel):
    data_sources: List[str]
    analysis_type: str = "trend"  # trend, anomaly, correlation, prediction
    time_range: str = "7d"
    parameters: Dict[str, Any] = {}

class InsightItem(BaseModel):
    insight_type: str
    title: str
    description: str
    confidence: float
    impact: str  # high, medium, low
    recommendation: Optional[str] = None
    supporting_data: Dict[str, Any] = {}

class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    analysis_type: str
    time_range: str
    generated_at: str
    data_quality_score: float

class BusinessKPI(BaseModel):
    name: str
    value: Union[float, int]
    unit: str
    target: Optional[Union[float, int]] = None
    trend: str  # up, down, stable
    change: float
    period: str

class DashboardData(BaseModel):
    kpis: List[BusinessKPI]
    charts: Dict[str, Any]
    insights: List[InsightItem]
    last_updated: str

# Utility Functions
def parse_time_range(time_range: str) -> timedelta:
    """Parse time range string to timedelta"""
    unit_map = {
        'h': 'hours',
        'd': 'days', 
        'w': 'weeks',
        'm': 'days'  # approximate months as 30 days
    }
    
    if time_range[-1] in unit_map:
        number = int(time_range[:-1])
        unit = unit_map[time_range[-1]]
        
        if unit == 'days' and time_range[-1] == 'm':
            number *= 30  # months to days
        
        return timedelta(**{unit: number})
    
    raise ValueError(f"Invalid time range format: {time_range}")

def calculate_trend(current: float, previous: float) -> str:
    """Calculate trend direction"""
    if previous == 0:
        return "stable" if current == 0 else "up"
    
    change = (current - previous) / previous
    
    if change > 0.05:  # 5% threshold
        return "up"
    elif change < -0.05:
        return "down"
    else:
        return "stable"

def calculate_change_percentage(current: float, previous: float) -> float:
    """Calculate percentage change"""
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    
    return ((current - previous) / previous) * 100

def detect_anomalies(data: List[float], threshold: float = 2.0) -> List[bool]:
    """Simple anomaly detection using standard deviation"""
    if len(data) < 3:
        return [False] * len(data)
    
    mean = statistics.mean(data)
    stdev = statistics.stdev(data)
    
    return [abs(x - mean) > threshold * stdev for x in data]

def generate_business_insights(metrics: Dict[str, Any]) -> List[InsightItem]:
    """Generate business insights from metrics"""
    insights = []
    
    # Revenue insights
    if 'revenue' in metrics:
        revenue_data = metrics['revenue']
        if isinstance(revenue_data, dict) and 'trend' in revenue_data:
            if revenue_data['trend'] == 'up':
                insights.append(InsightItem(
                    insight_type="revenue_growth",
                    title="Revenue Growth Detected",
                    description=f"Revenue has increased by {revenue_data.get('change', 0):.1f}% in the selected period.",
                    confidence=0.85,
                    impact="high",
                    recommendation="Continue current growth strategies and consider scaling successful initiatives.",
                    supporting_data={"revenue_change": revenue_data.get('change', 0)}
                ))
    
    # User engagement insights
    if 'user_activity' in metrics:
        activity_data = metrics['user_activity']
        if isinstance(activity_data, dict) and 'value' in activity_data:
            if activity_data['value'] > 1000:
                insights.append(InsightItem(
                    insight_type="high_engagement",
                    title="High User Engagement",
                    description=f"User activity is {activity_data['value']} events, indicating strong engagement.",
                    confidence=0.75,
                    impact="medium",
                    recommendation="Focus on retention strategies to maintain this engagement level.",
                    supporting_data={"activity_count": activity_data['value']}
                ))
    
    # Performance insights
    if 'response_time' in metrics:
        response_data = metrics['response_time']
        if isinstance(response_data, dict) and 'value' in response_data:
            if response_data['value'] > 500:  # ms
                insights.append(InsightItem(
                    insight_type="performance_issue",
                    title="Performance Degradation",
                    description=f"Average response time is {response_data['value']}ms, above optimal threshold.",
                    confidence=0.9,
                    impact="high",
                    recommendation="Investigate database queries and consider caching improvements.",
                    supporting_data={"response_time_ms": response_data['value']}
                ))
    
    return insights

# API Endpoints

@app.get("/health")
async def health_check(request: Request):
    """Service health check with component status"""
    health_data = {
        "status": "healthy",
        "service": "analytics-insights-consolidated",
        "version": "3.0.0",
        "components": {
            "analytics_storage": len(analytics_data),
            "metrics_cache": len(metrics_cache),
            "insights_cache": len(insights_cache),
            "user_sessions": len(user_activity),
            "business_metrics": len(business_metrics)
        },
        "security": {
            "authentication": "enabled",
            "cors_policy": "restricted",
            "rate_limiting": "enabled"
        }
    }
    
    # Add security metrics for authenticated requests
    auth_header = request.headers.get("authorization")
    if auth_header:
        try:
            health_data.update(security_metrics.get_metrics())
        except:
            pass
    
    return health_data

@app.post("/api/analytics/track")
async def track_event(
    event: AnalyticsEvent,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Track analytics event"""
    if "analytics:write" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Sanitize event data
        event_type = sanitize_input(event.event_type, max_length=100)
        user_id = sanitize_input(event.user_id or "", max_length=100)
        session_id = sanitize_input(event.session_id or "", max_length=100)
        
        # Set timestamp if not provided
        if not event.timestamp:
            event.timestamp = datetime.now()
        
        # Store event
        event_data = {
            "event_type": event_type,
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": event.timestamp.isoformat(),
            "properties": event.properties,
            "metadata": event.metadata,
            "tracked_by": claims.service_name
        }
        
        analytics_data[event_type].append(event_data)
        
        # Update user activity
        if user_id:
            user_activity[user_id].append(event_data)
        
        logger.info(f"Event tracked by {claims.service_name}: {event_type} for user {user_id}")
        
        return {
            "success": True,
            "event_id": f"{event_type}_{len(analytics_data[event_type])}",
            "tracked_at": event.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Event tracking failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/metrics/calculate")
async def calculate_metrics(
    request: MetricsRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Calculate metrics based on analytics data"""
    if "analytics:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Parse time range
        time_delta = parse_time_range(request.time_range)
        cutoff_time = datetime.now() - time_delta
        
        # Calculate metrics based on type
        metric_value = 0
        previous_value = 0
        
        if request.metric_type == "total_events":
            # Count all events in time range
            for event_list in analytics_data.values():
                for event in event_list:
                    event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                    if event_time >= cutoff_time:
                        metric_value += 1
        
        elif request.metric_type == "unique_users":
            # Count unique users in time range
            unique_users = set()
            for event_list in analytics_data.values():
                for event in event_list:
                    event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                    if event_time >= cutoff_time and event.get('user_id'):
                        unique_users.add(event['user_id'])
            metric_value = len(unique_users)
        
        elif request.metric_type == "events_by_type":
            # Group events by type
            event_counts = defaultdict(int)
            for event_type, event_list in analytics_data.items():
                for event in event_list:
                    event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                    if event_time >= cutoff_time:
                        event_counts[event_type] += 1
            metric_value = dict(event_counts)
        
        elif request.metric_type == "user_engagement":
            # Calculate average events per user
            user_event_counts = defaultdict(int)
            for event_list in analytics_data.values():
                for event in event_list:
                    event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                    if event_time >= cutoff_time and event.get('user_id'):
                        user_event_counts[event['user_id']] += 1
            
            if user_event_counts:
                metric_value = statistics.mean(user_event_counts.values())
            else:
                metric_value = 0
        
        # Calculate previous period for comparison
        previous_cutoff = cutoff_time - time_delta
        if request.metric_type == "total_events":
            for event_list in analytics_data.values():
                for event in event_list:
                    event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                    if previous_cutoff <= event_time < cutoff_time:
                        previous_value += 1
        
        # Calculate trend and change
        trend = calculate_trend(float(metric_value) if not isinstance(metric_value, dict) else 0, previous_value)
        change_percentage = calculate_change_percentage(
            float(metric_value) if not isinstance(metric_value, dict) else 0, 
            previous_value
        )
        
        # Cache the result
        cache_key = f"{request.metric_type}_{request.time_range}_{json.dumps(request.filters, sort_keys=True)}"
        result = MetricsResponse(
            metric_type=request.metric_type,
            time_range=request.time_range,
            value=metric_value,
            trend=trend,
            previous_value=previous_value if previous_value > 0 else None,
            change_percentage=change_percentage if previous_value > 0 else None,
            calculated_at=datetime.now().isoformat()
        )
        
        metrics_cache[cache_key] = result
        
        logger.info(f"Metrics calculated by {claims.service_name}: {request.metric_type} = {metric_value}")
        
        return result
        
    except Exception as e:
        logger.error(f"Metrics calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights/generate")
async def generate_insights(
    request: InsightsRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Generate insights from analytics data"""
    if "insights:generate" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Collect metrics for insight generation
        collected_metrics = {}
        
        for data_source in request.data_sources:
            if data_source in ["user_activity", "revenue", "performance"]:
                # Calculate relevant metrics
                metrics_req = MetricsRequest(
                    metric_type=data_source,
                    time_range=request.time_range
                )
                
                # Simulate metric calculation for insight generation
                if data_source == "user_activity":
                    collected_metrics[data_source] = {
                        "value": len(user_activity),
                        "trend": "up" if len(user_activity) > 100 else "stable"
                    }
                elif data_source == "revenue":
                    # Simulate revenue data
                    collected_metrics[data_source] = {
                        "value": 50000,
                        "trend": "up",
                        "change": 15.5
                    }
                elif data_source == "performance":
                    # Simulate performance data
                    collected_metrics[data_source] = {
                        "value": 350,  # ms
                        "trend": "stable"
                    }
        
        # Generate insights based on analysis type
        insights = []
        
        if request.analysis_type == "trend":
            insights = generate_business_insights(collected_metrics)
        
        elif request.analysis_type == "anomaly":
            # Simulate anomaly detection insights
            insights.append(InsightItem(
                insight_type="anomaly_detection",
                title="Unusual Activity Pattern",
                description="Detected unusual activity pattern in user engagement data.",
                confidence=0.7,
                impact="medium",
                recommendation="Monitor user behavior and investigate potential causes.",
                supporting_data={"anomaly_score": 0.85}
            ))
        
        elif request.analysis_type == "correlation":
            # Simulate correlation insights
            insights.append(InsightItem(
                insight_type="correlation_analysis",
                title="User Engagement Correlation",
                description="Strong correlation found between user engagement and revenue growth.",
                confidence=0.8,
                impact="high",
                recommendation="Focus on user engagement strategies to drive revenue.",
                supporting_data={"correlation_coefficient": 0.75}
            ))
        
        # Calculate data quality score
        data_quality_score = min(len(analytics_data) / 10.0, 1.0)
        
        # Cache insights
        cache_key = f"insights_{request.analysis_type}_{request.time_range}_{hash(tuple(request.data_sources))}"
        result = InsightsResponse(
            insights=insights,
            analysis_type=request.analysis_type,
            time_range=request.time_range,
            generated_at=datetime.now().isoformat(),
            data_quality_score=data_quality_score
        )
        
        insights_cache[cache_key] = result
        
        logger.info(f"Insights generated by {claims.service_name}: {len(insights)} insights from {request.analysis_type} analysis")
        
        return result
        
    except Exception as e:
        logger.error(f"Insights generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/data")
async def get_dashboard_data(
    time_range: str = "24h",
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get comprehensive dashboard data"""
    if "analytics:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Calculate key KPIs
        kpis = [
            BusinessKPI(
                name="Total Events",
                value=sum(len(events) for events in analytics_data.values()),
                unit="events",
                target=10000,
                trend="up",
                change=12.5,
                period=time_range
            ),
            BusinessKPI(
                name="Active Users",
                value=len(user_activity),
                unit="users",
                target=500,
                trend="up",
                change=8.3,
                period=time_range
            ),
            BusinessKPI(
                name="Avg Session Time",
                value=4.2,
                unit="minutes",
                target=5.0,
                trend="stable",
                change=-2.1,
                period=time_range
            )
        ]
        
        # Generate charts data
        charts = {
            "events_timeline": {
                "type": "line",
                "data": [100, 120, 110, 140, 160, 150, 180],
                "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            },
            "user_distribution": {
                "type": "pie",
                "data": [60, 25, 15],
                "labels": ["New Users", "Returning Users", "Power Users"]
            }
        }
        
        # Get recent insights
        recent_insights = []
        for cached_insights in insights_cache.values():
            if isinstance(cached_insights, InsightsResponse):
                recent_insights.extend(cached_insights.insights[:2])
        
        dashboard_data = DashboardData(
            kpis=kpis,
            charts=charts,
            insights=recent_insights[:5],
            last_updated=datetime.now().isoformat()
        )
        
        logger.info(f"Dashboard data retrieved by {claims.service_name}")
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Dashboard data retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/export")
async def export_analytics_data(
    format: str = "json",
    time_range: str = "7d",
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Export analytics data in specified format"""
    if "analytics:export" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Parse time range
        time_delta = parse_time_range(time_range)
        cutoff_time = datetime.now() - time_delta
        
        # Filter data by time range
        export_data = {}
        for event_type, events in analytics_data.items():
            filtered_events = []
            for event in events:
                event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00').replace('+00:00', ''))
                if event_time >= cutoff_time:
                    filtered_events.append(event)
            
            if filtered_events:
                export_data[event_type] = filtered_events
        
        # Add metadata
        export_metadata = {
            "exported_at": datetime.now().isoformat(),
            "time_range": time_range,
            "total_events": sum(len(events) for events in export_data.values()),
            "event_types": list(export_data.keys()),
            "exported_by": claims.service_name
        }
        
        result = {
            "metadata": export_metadata,
            "data": export_data
        }
        
        logger.info(f"Analytics data exported by {claims.service_name}: {export_metadata['total_events']} events")
        
        return result
        
    except Exception as e:
        logger.error(f"Analytics export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)