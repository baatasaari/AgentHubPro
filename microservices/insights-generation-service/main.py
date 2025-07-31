#!/usr/bin/env python3
"""
Insights Generation Service
Ultra-focused microservice for insights generation only
Extracted from routes.ts insights routes and enterprise-analytics.ts
Target: <140 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime, timedelta
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Insights Generation Service", description="Ultra-focused insights generation", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class InsightRequest(BaseModel):
    agent_id: str
    start_date: str
    end_date: str
    insight_types: List[str]

class PaymentInsight(BaseModel):
    consultation_id: str
    agent_id: str
    customer_id: str
    platform: str
    industry: str
    amount: float
    conversion_rate: float

class CustomerInsight(BaseModel):
    customer_id: str
    interaction_count: int
    conversion_rate: float
    lifetime_value: float
    segment: str

# Insights storage
payment_insights = []
customer_insights = {}
agent_insights = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "insights-generation", "payment_insights": len(payment_insights)}

@app.post("/api/insights/generate")
async def generate_insights(request: InsightRequest):
    """Generate comprehensive insights for agent"""
    try:
        start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
        
        insights = {
            "agent_id": request.agent_id,
            "period": {"start": request.start_date, "end": request.end_date},
            "generated_at": datetime.now().isoformat()
        }
        
        if "payment" in request.insight_types:
            insights["payment_insights"] = generate_payment_insights(request.agent_id, start_date, end_date)
        
        if "customer" in request.insight_types:
            insights["customer_insights"] = generate_customer_insights(request.agent_id, start_date, end_date)
        
        if "performance" in request.insight_types:
            insights["performance_insights"] = generate_performance_insights(request.agent_id, start_date, end_date)
        
        logger.info(f"Generated insights for agent {request.agent_id}")
        return insights
        
    except Exception as e:
        logger.error(f"Insights generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_payment_insights(agent_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Generate payment-related insights"""
    agent_payments = [p for p in payment_insights if p["agent_id"] == agent_id]
    
    total_revenue = sum(p["amount"] for p in agent_payments)
    total_consultations = len(agent_payments)
    avg_conversion_rate = sum(p["conversion_rate"] for p in agent_payments) / len(agent_payments) if agent_payments else 0
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_consultations": total_consultations,
        "average_conversion_rate": round(avg_conversion_rate, 3),
        "revenue_trend": "increasing",  # Mock trend
        "top_platforms": ["WhatsApp", "Web", "Instagram"]
    }

def generate_customer_insights(agent_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Generate customer behavior insights"""
    agent_customers = [c for c in customer_insights.values() if c.get("agent_id") == agent_id]
    
    total_customers = len(agent_customers)
    high_value_customers = len([c for c in agent_customers if c.get("lifetime_value", 0) > 1000])
    
    return {
        "total_customers": total_customers,
        "high_value_customers": high_value_customers,
        "customer_segments": {
            "high_value": high_value_customers,
            "regular": total_customers - high_value_customers,
            "at_risk": 0
        },
        "retention_rate": 0.85,  # Mock retention rate
        "churn_risk": 0.15
    }

def generate_performance_insights(agent_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Generate performance insights"""
    return {
        "response_time": {
            "average": 2.3,
            "median": 1.8,
            "95th_percentile": 5.2
        },
        "satisfaction_score": 4.2,
        "resolution_rate": 0.89,
        "escalation_rate": 0.05,
        "performance_grade": "A",
        "improvement_areas": ["response_time", "proactive_follow_up"]
    }

@app.get("/api/insights/report/{agent_id}")
async def get_insights_report(agent_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get comprehensive insights report for agent"""
    try:
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        request = InsightRequest(
            agent_id=agent_id,
            start_date=start_date,
            end_date=end_date,
            insight_types=["payment", "customer", "performance"]
        )
        
        return await generate_insights(request)
        
    except Exception as e:
        logger.error(f"Insights report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights/payment/record")
async def record_payment_insight(insight: Dict[str, Any]):
    """Record payment insight"""
    try:
        payment_insights.append({
            "consultation_id": insight.get("consultation_id"),
            "agent_id": insight.get("agent_id"),
            "customer_id": insight.get("customer_id"),
            "platform": insight.get("platform"),
            "industry": insight.get("industry"),
            "amount": insight.get("amount", 0),
            "conversion_rate": insight.get("conversion_rate", 0),
            "recorded_at": datetime.now().isoformat()
        })
        
        logger.info(f"Recorded payment insight for agent {insight.get('agent_id')}")
        return {"success": True, "recorded_insight": True}
        
    except Exception as e:
        logger.error(f"Payment insight recording failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/insights/customer/{customer_id}")
async def get_customer_insights(customer_id: str):
    """Get insights for specific customer"""
    if customer_id not in customer_insights:
        return {
            "customer_id": customer_id,
            "interaction_count": 0,
            "conversion_rate": 0,
            "lifetime_value": 0,
            "segment": "new"
        }
    
    return customer_insights[customer_id]

@app.get("/api/insights/platform/{agent_id}")
async def get_platform_comparison(agent_id: str):
    """Get platform performance comparison"""
    try:
        agent_payments = [p for p in payment_insights if p["agent_id"] == agent_id]
        
        platform_stats = {}
        for payment in agent_payments:
            platform = payment["platform"]
            if platform not in platform_stats:
                platform_stats[platform] = {"count": 0, "revenue": 0}
            platform_stats[platform]["count"] += 1
            platform_stats[platform]["revenue"] += payment["amount"]
        
        return {
            "agent_id": agent_id,
            "platform_comparison": platform_stats,
            "top_performing_platform": max(platform_stats.keys(), key=lambda k: platform_stats[k]["revenue"]) if platform_stats else None
        }
        
    except Exception as e:
        logger.error(f"Platform comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8125))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)