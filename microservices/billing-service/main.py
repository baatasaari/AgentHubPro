"""
Billing Service Microservice
FastAPI-based service for usage tracking, billing, and payment management
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import os

# Initialize FastAPI app
app = FastAPI(
    title="Billing Service",
    description="Microservice for usage tracking, billing, and payment management",
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
class UsageRecord(BaseModel):
    id: str
    agent_id: str
    conversation_id: str
    tokens_used: int
    model_used: str
    cost: float
    timestamp: datetime
    billing_period: str

class BillingPeriod(BaseModel):
    id: str
    start_date: datetime
    end_date: datetime
    total_conversations: int
    total_tokens: int
    total_cost: float
    status: str  # active, closed, pending_payment
    invoice_generated: bool

class Invoice(BaseModel):
    id: str
    billing_period_id: str
    agent_id: str
    business_name: str
    total_amount: float
    tax_amount: float
    subtotal: float
    currency: str
    status: str  # draft, sent, paid, overdue
    generated_date: datetime
    due_date: datetime
    paid_date: Optional[datetime] = None

class PaymentRecord(BaseModel):
    id: str
    invoice_id: str
    amount: float
    payment_method: str
    transaction_id: str
    status: str  # pending, completed, failed, refunded
    processed_date: datetime

class UsageCreate(BaseModel):
    agent_id: str
    conversation_id: str
    tokens_used: int
    model_used: str
    cost: float

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

class BillingSettings(BaseModel):
    tax_rate: float = 0.08  # 8% tax rate
    billing_cycle_days: int = 30
    payment_terms_days: int = 15
    currency: str = "USD"

# Storage configuration
USE_BIGQUERY = os.environ.get('USE_BIGQUERY', 'false').lower() == 'true'

# In-memory storage
usage_records_db: List[UsageRecord] = []
billing_periods_db: List[BillingPeriod] = []
invoices_db: List[Invoice] = []
payments_db: List[PaymentRecord] = []

# Pricing configuration
MODEL_PRICING = {
    "gpt-4-turbo": 0.01,
    "gpt-4": 0.03,
    "gpt-3.5-turbo": 0.002,
    "claude-3-opus": 0.015,
    "claude-3-sonnet": 0.003,
    "gemini-pro": 0.001
}

# Business logic functions
def get_current_billing_period() -> BillingPeriod:
    """Get or create current billing period"""
    current_date = datetime.now()
    
    # Check if there's an active billing period
    active_period = next((bp for bp in billing_periods_db if bp.status == "active"), None)
    
    if active_period and active_period.end_date > current_date:
        return active_period
    
    # Create new billing period
    start_date = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    new_period = BillingPeriod(
        id=str(uuid.uuid4()),
        start_date=start_date,
        end_date=end_date,
        total_conversations=0,
        total_tokens=0,
        total_cost=0.0,
        status="active",
        invoice_generated=False
    )
    
    billing_periods_db.append(new_period)
    return new_period

def calculate_cost(tokens_used: int, model_used: str) -> float:
    """Calculate cost based on tokens and model"""
    price_per_1k_tokens = MODEL_PRICING.get(model_used, 0.001)
    return (tokens_used / 1000) * price_per_1k_tokens

def update_billing_period_stats(period: BillingPeriod, tokens_used: int, cost: float):
    """Update billing period statistics"""
    period.total_conversations += 1
    period.total_tokens += tokens_used
    period.total_cost += cost

def generate_invoice(agent_id: str, billing_period: BillingPeriod, business_name: str) -> Invoice:
    """Generate invoice for an agent's usage in a billing period"""
    settings = BillingSettings()
    
    # Calculate agent's usage for the period
    agent_usage = [ur for ur in usage_records_db 
                   if ur.agent_id == agent_id and ur.billing_period == billing_period.id]
    
    subtotal = sum(ur.cost for ur in agent_usage)
    tax_amount = subtotal * settings.tax_rate
    total_amount = subtotal + tax_amount
    
    invoice = Invoice(
        id=str(uuid.uuid4()),
        billing_period_id=billing_period.id,
        agent_id=agent_id,
        business_name=business_name,
        total_amount=total_amount,
        tax_amount=tax_amount,
        subtotal=subtotal,
        currency=settings.currency,
        status="draft",
        generated_date=datetime.now(),
        due_date=datetime.now() + timedelta(days=settings.payment_terms_days),
        paid_date=None
    )
    
    invoices_db.append(invoice)
    return invoice

def get_agent_usage_summary(agent_id: str, period_days: int = 30) -> Dict[str, Any]:
    """Get usage summary for an agent"""
    cutoff_date = datetime.now() - timedelta(days=period_days)
    agent_usage = [ur for ur in usage_records_db 
                   if ur.agent_id == agent_id and ur.timestamp >= cutoff_date]
    
    if not agent_usage:
        return {
            "agent_id": agent_id,
            "period_days": period_days,
            "total_conversations": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "cost_by_model": {},
            "daily_usage": []
        }
    
    total_conversations = len(agent_usage)
    total_tokens = sum(ur.tokens_used for ur in agent_usage)
    total_cost = sum(ur.cost for ur in agent_usage)
    
    # Group by model
    cost_by_model = {}
    for usage in agent_usage:
        model = usage.model_used
        if model not in cost_by_model:
            cost_by_model[model] = {"tokens": 0, "cost": 0.0, "conversations": 0}
        cost_by_model[model]["tokens"] += usage.tokens_used
        cost_by_model[model]["cost"] += usage.cost
        cost_by_model[model]["conversations"] += 1
    
    return {
        "agent_id": agent_id,
        "period_days": period_days,
        "total_conversations": total_conversations,
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "cost_by_model": cost_by_model,
        "estimated_monthly_cost": (total_cost / period_days) * 30
    }

# Sample data initialization
def create_sample_data():
    """Create sample billing data"""
    current_period = get_current_billing_period()
    
    sample_usage = [
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-1",
            "conversation_id": "conv-1",
            "tokens_used": 150,
            "model_used": "gpt-4-turbo",
            "cost": 0.015,
            "timestamp": datetime.now() - timedelta(hours=2),
            "billing_period": current_period.id
        },
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-2",
            "conversation_id": "conv-2",
            "tokens_used": 80,
            "model_used": "gpt-3.5-turbo",
            "cost": 0.0016,
            "timestamp": datetime.now() - timedelta(hours=1),
            "billing_period": current_period.id
        },
        {
            "id": str(uuid.uuid4()),
            "agent_id": "agent-1",
            "conversation_id": "conv-3",
            "tokens_used": 200,
            "model_used": "claude-3-sonnet",
            "cost": 0.006,
            "timestamp": datetime.now() - timedelta(minutes=30),
            "billing_period": current_period.id
        }
    ]
    
    for usage_data in sample_usage:
        usage = UsageRecord(**usage_data)
        usage_records_db.append(usage)
        update_billing_period_stats(current_period, usage.tokens_used, usage.cost)

# Initialize sample data
create_sample_data()

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "billing-service",
        "version": "1.0.0",
        "storage": "bigquery" if USE_BIGQUERY else "in-memory",
        "usage_records": len(usage_records_db),
        "billing_periods": len(billing_periods_db),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/usage", response_model=UsageRecord)
async def record_usage(usage: UsageCreate):
    """Record usage for billing"""
    current_period = get_current_billing_period()
    
    usage_record = UsageRecord(
        id=str(uuid.uuid4()),
        agent_id=usage.agent_id,
        conversation_id=usage.conversation_id,
        tokens_used=usage.tokens_used,
        model_used=usage.model_used,
        cost=usage.cost,
        timestamp=datetime.now(),
        billing_period=current_period.id
    )
    
    usage_records_db.append(usage_record)
    update_billing_period_stats(current_period, usage.tokens_used, usage.cost)
    
    return usage_record

@app.get("/api/usage/agent/{agent_id}")
async def get_agent_usage(agent_id: str, period_days: int = 30):
    """Get usage summary for an agent"""
    return get_agent_usage_summary(agent_id, period_days)

@app.get("/api/usage/calculate")
async def calculate_usage_cost(tokens_used: int, model_used: str):
    """Calculate cost for given tokens and model"""
    if model_used not in MODEL_PRICING:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_used}")
    
    cost = calculate_cost(tokens_used, model_used)
    return {
        "tokens_used": tokens_used,
        "model_used": model_used,
        "price_per_1k_tokens": MODEL_PRICING[model_used],
        "calculated_cost": cost
    }

@app.get("/api/pricing/models")
async def get_model_pricing():
    """Get pricing for all available models"""
    return {
        "models": MODEL_PRICING,
        "currency": "USD",
        "unit": "per 1000 tokens",
        "last_updated": "2025-07-28"
    }

@app.get("/api/billing/periods", response_model=List[BillingPeriod])
async def get_billing_periods():
    """Get all billing periods"""
    return billing_periods_db

@app.get("/api/billing/periods/current", response_model=BillingPeriod)
async def get_current_period():
    """Get current active billing period"""
    return get_current_billing_period()

@app.post("/api/invoices/generate")
async def generate_agent_invoice(agent_id: str, business_name: str):
    """Generate invoice for an agent"""
    current_period = get_current_billing_period()
    
    # Check if invoice already exists
    existing_invoice = next((inv for inv in invoices_db 
                            if inv.agent_id == agent_id and inv.billing_period_id == current_period.id), None)
    
    if existing_invoice:
        raise HTTPException(status_code=400, detail="Invoice already exists for this period")
    
    invoice = generate_invoice(agent_id, current_period, business_name)
    return invoice

@app.get("/api/invoices", response_model=List[Invoice])
async def get_invoices(agent_id: Optional[str] = None, status: Optional[str] = None):
    """Get invoices with optional filtering"""
    filtered_invoices = invoices_db
    
    if agent_id:
        filtered_invoices = [inv for inv in filtered_invoices if inv.agent_id == agent_id]
    
    if status:
        filtered_invoices = [inv for inv in filtered_invoices if inv.status == status]
    
    return filtered_invoices

@app.get("/api/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    """Get specific invoice"""
    invoice = next((inv for inv in invoices_db if inv.id == invoice_id), None)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.patch("/api/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str):
    """Update invoice status"""
    invoice = next((inv for inv in invoices_db if inv.id == invoice_id), None)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    valid_statuses = ["draft", "sent", "paid", "overdue"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    invoice.status = status
    if status == "paid":
        invoice.paid_date = datetime.now()
    
    return {"message": f"Invoice status updated to {status}"}

@app.post("/api/payments", response_model=PaymentRecord)
async def record_payment(invoice_id: str, amount: float, payment_method: str, transaction_id: str):
    """Record a payment"""
    invoice = next((inv for inv in invoices_db if inv.id == invoice_id), None)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment = PaymentRecord(
        id=str(uuid.uuid4()),
        invoice_id=invoice_id,
        amount=amount,
        payment_method=payment_method,
        transaction_id=transaction_id,
        status="completed",
        processed_date=datetime.now()
    )
    
    payments_db.append(payment)
    
    # Update invoice status if fully paid
    if amount >= invoice.total_amount:
        invoice.status = "paid"
        invoice.paid_date = datetime.now()
    
    return payment

@app.get("/api/payments", response_model=List[PaymentRecord])
async def get_payments(invoice_id: Optional[str] = None):
    """Get payment records"""
    if invoice_id:
        return [p for p in payments_db if p.invoice_id == invoice_id]
    return payments_db

@app.get("/api/billing/summary")
async def get_billing_summary():
    """Get overall billing summary"""
    current_period = get_current_billing_period()
    
    total_revenue = sum(inv.total_amount for inv in invoices_db if inv.status == "paid")
    pending_revenue = sum(inv.total_amount for inv in invoices_db if inv.status in ["sent", "overdue"])
    
    return {
        "current_period": current_period,
        "total_usage_records": len(usage_records_db),
        "total_invoices": len(invoices_db),
        "total_payments": len(payments_db),
        "total_revenue": total_revenue,
        "pending_revenue": pending_revenue,
        "active_agents": len(set(ur.agent_id for ur in usage_records_db)),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/reports/usage")
async def generate_usage_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[str] = None
):
    """Generate usage report"""
    filtered_usage = usage_records_db
    
    if start_date:
        filtered_usage = [ur for ur in filtered_usage if ur.timestamp >= start_date]
    
    if end_date:
        filtered_usage = [ur for ur in filtered_usage if ur.timestamp <= end_date]
    
    if agent_id:
        filtered_usage = [ur for ur in filtered_usage if ur.agent_id == agent_id]
    
    # Aggregate data
    total_tokens = sum(ur.tokens_used for ur in filtered_usage)
    total_cost = sum(ur.cost for ur in filtered_usage)
    model_breakdown = {}
    
    for usage in filtered_usage:
        model = usage.model_used
        if model not in model_breakdown:
            model_breakdown[model] = {"tokens": 0, "cost": 0.0, "conversations": 0}
        model_breakdown[model]["tokens"] += usage.tokens_used
        model_breakdown[model]["cost"] += usage.cost
        model_breakdown[model]["conversations"] += 1
    
    return {
        "report_period": {
            "start_date": start_date or "earliest",
            "end_date": end_date or "latest"
        },
        "filters": {
            "agent_id": agent_id
        },
        "summary": {
            "total_conversations": len(filtered_usage),
            "total_tokens": total_tokens,
            "total_cost": total_cost,
            "unique_agents": len(set(ur.agent_id for ur in filtered_usage))
        },
        "model_breakdown": model_breakdown,
        "generated_at": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Billing Service on http://0.0.0.0:8003")
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")