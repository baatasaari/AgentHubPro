#!/usr/bin/env python3
"""
Billing Service - Cost Tracking & Payment Management
Efficient service for tracking usage costs and managing billing with configurable pricing
"""

import sys
import os
from pathlib import Path

# Add shared directory to path
sys.path.append(str(Path(__file__).parent.parent / "shared"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import logging

# Import configuration manager
from config_manager import get_config

# Initialize configuration
config = get_config("billing", str(Path(__file__).parent.parent / "shared" / "config"))
service_config = config.get_service_config()

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.get_app_setting("monitoring.log_level", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Billing Service",
    version="1.0.0",
    debug=service_config.debug
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=service_config.cors_origins,
    allow_credentials=config.get_app_setting("api.cors.allow_credentials", True),
    allow_methods=config.get_app_setting("api.cors.allow_methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS").split(","),
    allow_headers=config.get_app_setting("api.cors.allow_headers", "*").split(",")
)

# Models
class UsageType(str, Enum):
    TOKEN_USAGE = "token_usage"
    API_CALL = "api_call"
    STORAGE = "storage"
    BANDWIDTH = "bandwidth"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class UsageRecord(BaseModel):
    id: str
    agent_id: str
    usage_type: UsageType
    quantity: float
    unit_cost: float
    total_cost: float
    timestamp: datetime
    metadata: Dict[str, Any] = {}

class Invoice(BaseModel):
    id: str
    agent_id: str
    period_start: datetime
    period_end: datetime
    total_amount: float
    status: PaymentStatus = PaymentStatus.PENDING
    line_items: List[Dict[str, Any]] = []
    created_at: datetime

class CostEstimate(BaseModel):
    agent_id: str
    estimated_monthly_cost: float
    usage_breakdown: Dict[str, float]
    based_on_days: int

# Storage
usage_records_db: Dict[str, UsageRecord] = {}
invoices_db: Dict[str, Invoice] = {}

# Get pricing configuration from config
pricing_config = config.get_pricing_config()
PRICING = {
    UsageType.TOKEN_USAGE: pricing_config.get("token_usage", {
        "gpt-4": 0.03,
        "gpt-3.5-turbo": 0.002,
        "claude-3": 0.025
    }),
    UsageType.API_CALL: float(pricing_config.get("api_calls", {}).get("base_rate", 0.001)),
    UsageType.STORAGE: pricing_config.get("storage", {}).get("bigquery_storage", 0.0001),
    UsageType.BANDWIDTH: 0.0005
}

# Sample data
def init_sample_usage():
    sample_agents = ["1", "2", "3"]
    base_time = datetime.now() - timedelta(days=30)
    
    for agent_id in sample_agents:
        for day in range(30):
            timestamp = base_time + timedelta(days=day)
            
            # Token usage
            model = "gpt-4" if agent_id == "1" else "gpt-3.5-turbo"
            tokens = 500 + (day * 10)
            unit_cost = PRICING[UsageType.TOKEN_USAGE][model]
            
            usage_id = f"{agent_id}-tokens-{day}"
            usage = UsageRecord(
                id=usage_id,
                agent_id=agent_id,
                usage_type=UsageType.TOKEN_USAGE,
                quantity=tokens,
                unit_cost=unit_cost,
                total_cost=tokens * unit_cost,
                timestamp=timestamp,
                metadata={"model": model, "conversations": day + 1}
            )
            usage_records_db[usage_id] = usage
            
            # API calls
            if day % 3 == 0:  # Every 3 days
                api_calls = 50 + (day * 2)
                api_id = f"{agent_id}-api-{day}"
                api_usage = UsageRecord(
                    id=api_id,
                    agent_id=agent_id,
                    usage_type=UsageType.API_CALL,
                    quantity=api_calls,
                    unit_cost=PRICING[UsageType.API_CALL],
                    total_cost=api_calls * PRICING[UsageType.API_CALL],
                    timestamp=timestamp,
                    metadata={"endpoint": "insights"}
                )
                usage_records_db[api_id] = api_usage

init_sample_usage()

# Helper functions
def get_agent_usage(agent_id: str, days: int = 30) -> List[UsageRecord]:
    """Get usage records for an agent within time period"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    return [
        record for record in usage_records_db.values()
        if record.agent_id == agent_id and record.timestamp >= cutoff_date
    ]

def calculate_usage_summary(usage_records: List[UsageRecord]) -> Dict[str, Any]:
    """Calculate usage summary from records"""
    summary = {
        "total_cost": 0.0,
        "by_type": {},
        "by_model": {},
        "total_tokens": 0,
        "total_api_calls": 0
    }
    
    for record in usage_records:
        summary["total_cost"] += record.total_cost
        
        # By usage type
        usage_type = record.usage_type
        if usage_type not in summary["by_type"]:
            summary["by_type"][usage_type] = {"cost": 0.0, "quantity": 0.0}
        
        summary["by_type"][usage_type]["cost"] += record.total_cost
        summary["by_type"][usage_type]["quantity"] += record.quantity
        
        # Specific tracking
        if usage_type == UsageType.TOKEN_USAGE:
            summary["total_tokens"] += record.quantity
            model = record.metadata.get("model", "unknown")
            if model not in summary["by_model"]:
                summary["by_model"][model] = {"cost": 0.0, "tokens": 0.0}
            summary["by_model"][model]["cost"] += record.total_cost
            summary["by_model"][model]["tokens"] += record.quantity
        
        elif usage_type == UsageType.API_CALL:
            summary["total_api_calls"] += record.quantity
    
    return summary

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "billing",
        "usage_records": len(usage_records_db),
        "environment": config.get_environment(),
        "storage_type": config.get_storage_config().type
    }

# Configuration endpoints
@app.get("/api/config/status")
async def get_config_status():
    """Get current configuration status"""
    return config.get_status()

@app.get("/api/config/reload")
async def reload_configuration():
    """Reload all configurations"""
    try:
        config.reload_all()
        return {"message": "Configuration reloaded successfully", "status": "success"}
    except Exception as e:
        logger.error(f"Error reloading configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload configuration")

@app.get("/api/config/pricing")
async def get_pricing_config():
    """Get current pricing configuration"""
    return config.get_pricing_config()

@app.post("/api/billing/usage")
async def track_usage(usage: UsageRecord):
    """Track usage and calculate cost"""
    usage.id = usage.id or str(uuid.uuid4())
    
    # Calculate cost based on pricing
    if usage.usage_type == UsageType.TOKEN_USAGE:
        model = usage.metadata.get("model", "gpt-3.5-turbo")
        usage.unit_cost = PRICING[UsageType.TOKEN_USAGE].get(model, PRICING[UsageType.TOKEN_USAGE]["gpt-3.5-turbo"])
    else:
        usage.unit_cost = PRICING.get(usage.usage_type, 0.001)
    
    usage.total_cost = usage.quantity * usage.unit_cost
    usage_records_db[usage.id] = usage
    
    return {"id": usage.id, "total_cost": usage.total_cost, "status": "tracked"}

@app.get("/api/billing/usage/{agent_id}")
async def get_usage(agent_id: str, days: int = Query(30, le=365)):
    """Get usage records for an agent"""
    usage_records = get_agent_usage(agent_id, days)
    summary = calculate_usage_summary(usage_records)
    
    return {
        "agent_id": agent_id,
        "period_days": days,
        "usage_records": sorted(usage_records, key=lambda x: x.timestamp, reverse=True),
        "summary": summary
    }

@app.get("/api/billing/costs/{agent_id}")
async def get_cost_breakdown(agent_id: str, days: int = Query(30, le=365)):
    """Get detailed cost breakdown for an agent"""
    usage_records = get_agent_usage(agent_id, days)
    summary = calculate_usage_summary(usage_records)
    
    # Calculate daily costs for trend analysis
    daily_costs = {}
    for record in usage_records:
        date_key = record.timestamp.strftime("%Y-%m-%d")
        if date_key not in daily_costs:
            daily_costs[date_key] = 0.0
        daily_costs[date_key] += record.total_cost
    
    return {
        "agent_id": agent_id,
        "total_cost": round(summary["total_cost"], 4),
        "breakdown": summary["by_type"],
        "model_costs": summary["by_model"],
        "daily_costs": daily_costs,
        "average_daily_cost": round(summary["total_cost"] / days if days > 0 else 0, 4)
    }

@app.post("/api/billing/estimate")
async def estimate_monthly_cost(agent_id: str, based_on_days: int = Query(7, le=30)):
    """Estimate monthly cost based on recent usage"""
    usage_records = get_agent_usage(agent_id, based_on_days)
    summary = calculate_usage_summary(usage_records)
    
    # Project to monthly
    daily_average = summary["total_cost"] / based_on_days if based_on_days > 0 else 0
    monthly_estimate = daily_average * 30
    
    usage_breakdown = {
        usage_type: data["cost"] / based_on_days * 30
        for usage_type, data in summary["by_type"].items()
    }
    
    estimate = CostEstimate(
        agent_id=agent_id,
        estimated_monthly_cost=round(monthly_estimate, 2),
        usage_breakdown=usage_breakdown,
        based_on_days=based_on_days
    )
    
    return estimate

@app.post("/api/billing/invoices/{agent_id}")
async def generate_invoice(agent_id: str, period_days: int = Query(30, le=365)):
    """Generate invoice for an agent"""
    period_end = datetime.now()
    period_start = period_end - timedelta(days=period_days)
    
    usage_records = get_agent_usage(agent_id, period_days)
    summary = calculate_usage_summary(usage_records)
    
    # Create line items
    line_items = []
    for usage_type, data in summary["by_type"].items():
        line_items.append({
            "description": f"{usage_type.replace('_', ' ').title()}",
            "quantity": data["quantity"],
            "unit_cost": data["cost"] / data["quantity"] if data["quantity"] > 0 else 0,
            "total_cost": data["cost"]
        })
    
    invoice_id = str(uuid.uuid4())[:8]
    invoice = Invoice(
        id=invoice_id,
        agent_id=agent_id,
        period_start=period_start,
        period_end=period_end,
        total_amount=round(summary["total_cost"], 2),
        line_items=line_items,
        created_at=datetime.now()
    )
    
    invoices_db[invoice_id] = invoice
    return invoice

@app.get("/api/billing/invoices/{agent_id}")
async def get_invoices(agent_id: str):
    """Get all invoices for an agent"""
    agent_invoices = [
        invoice for invoice in invoices_db.values()
        if invoice.agent_id == agent_id
    ]
    
    return sorted(agent_invoices, key=lambda x: x.created_at, reverse=True)

@app.get("/api/billing/summary")
async def get_billing_summary():
    """Get overall billing summary"""
    total_usage_records = len(usage_records_db)
    total_revenue = sum(record.total_cost for record in usage_records_db.values())
    unique_agents = len(set(record.agent_id for record in usage_records_db.values()))
    
    # Recent usage (last 24 hours)
    recent_cutoff = datetime.now() - timedelta(hours=24)
    recent_usage = [
        record for record in usage_records_db.values()
        if record.timestamp >= recent_cutoff
    ]
    recent_revenue = sum(record.total_cost for record in recent_usage)
    
    return {
        "total_usage_records": total_usage_records,
        "total_revenue": round(total_revenue, 2),
        "unique_agents": unique_agents,
        "recent_revenue_24h": round(recent_revenue, 4),
        "average_revenue_per_agent": round(total_revenue / unique_agents if unique_agents > 0 else 0, 2),
        "total_invoices": len(invoices_db)
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Billing Service on http://0.0.0.0:8003")
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")