#!/usr/bin/env python3
"""
Payment Processing Service - Consolidated Domain Service
Combines: payment-intent-service, payment-link-service, payment-processing-service, billing-service

This service handles the complete payment workflow including intent analysis, 
payment processing, billing calculations, and payment analytics.
Replaces 4 separate payment-related services with unified payment domain.
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
import hashlib
import uuid
from decimal import Decimal
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
    title="Payment Processing Service",
    description="Consolidated payment processing, billing, and analytics",
    version="3.0.0"
)

# Add secure CORS middleware
app.add_middleware(get_secure_cors_middleware())

# In-memory storage (replace with persistent storage in production)
payment_intents = {}
payment_links = {}
transactions = {}
billing_records = {}
payment_analytics = {}

# Payment processing configuration
SUPPORTED_CURRENCIES = ["USD", "INR", "EUR", "GBP"]
PAYMENT_METHODS = ["card", "upi", "netbanking", "wallet", "bank_transfer"]
INDUSTRY_PRICING = {
    "healthcare": {"consultation": 150.0, "checkup": 75.0},
    "legal": {"consultation": 200.0, "document_review": 100.0},
    "finance": {"advisory": 250.0, "portfolio_review": 150.0},
    "technology": {"support": 100.0, "consulting": 300.0},
    "default": {"service": 50.0}
}

# Data Models
class PaymentIntentRequest(BaseModel):
    message: str
    industry: str = "default"
    context: Dict[str, Any] = {}
    currency: str = "USD"

class PaymentIntentResponse(BaseModel):
    intent: str
    confidence: float
    suggested_amount: float
    currency: str
    reasoning: str
    extracted_entities: Dict[str, List[str]]
    processing_time_ms: int

class PaymentLinkRequest(BaseModel):
    amount: float
    currency: str = "USD"
    description: str
    customer_email: Optional[str] = None
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = {}

class PaymentLinkResponse(BaseModel):
    link_id: str
    payment_url: str
    amount: float
    currency: str
    status: str
    created_at: str
    expires_at: Optional[str] = None

class PaymentRequest(BaseModel):
    payment_method: str
    amount: float
    currency: str = "USD"
    description: str
    customer_details: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class PaymentResponse(BaseModel):
    transaction_id: str
    status: str  # pending, completed, failed, cancelled
    amount: float
    currency: str
    payment_method: str
    processed_at: str
    gateway_response: Dict[str, Any] = {}

class BillingPeriod(BaseModel):
    start_date: datetime
    end_date: datetime
    period_type: str = "monthly"  # daily, weekly, monthly, yearly

class BillingRecord(BaseModel):
    customer_id: str
    period: BillingPeriod
    line_items: List[Dict[str, Any]]
    subtotal: float
    tax_amount: float
    total_amount: float
    currency: str = "USD"
    status: str = "draft"  # draft, sent, paid, overdue

class PaymentAnalytics(BaseModel):
    total_revenue: float
    transaction_count: int
    success_rate: float
    avg_transaction_value: float
    currency: str
    period: str
    top_payment_methods: List[Dict[str, Any]]

# Utility Functions
def analyze_payment_intent(message: str, industry: str = "default") -> Dict[str, Any]:
    """Analyze payment intent using rule-based approach with industry context"""
    message_lower = message.lower()
    
    # Intent classification
    intent = "general_inquiry"
    confidence = 0.5
    
    if any(word in message_lower for word in ["pay", "payment", "bill", "invoice", "charge"]):
        intent = "payment_request"
        confidence = 0.8
    elif any(word in message_lower for word in ["book", "appointment", "schedule", "consultation"]):
        intent = "consultation_request"
        confidence = 0.75
    elif any(word in message_lower for word in ["subscribe", "subscription", "plan", "upgrade"]):
        intent = "subscription_request"
        confidence = 0.85
    elif any(word in message_lower for word in ["refund", "cancel", "return"]):
        intent = "refund_request"
        confidence = 0.9
    
    # Suggest amount based on industry and intent
    industry_pricing = INDUSTRY_PRICING.get(industry, INDUSTRY_PRICING["default"])
    
    if intent == "consultation_request":
        suggested_amount = industry_pricing.get("consultation", 100.0)
    elif intent == "payment_request":
        suggested_amount = industry_pricing.get("service", 50.0)
    elif intent == "subscription_request":
        suggested_amount = industry_pricing.get("service", 50.0) * 12  # Annual
    else:
        suggested_amount = industry_pricing.get("service", 50.0)
    
    # Extract entities
    extracted_entities = {
        "amounts": [],
        "services": [],
        "dates": []
    }
    
    # Simple amount extraction
    import re
    amounts = re.findall(r'\$?(\d+(?:\.\d{2})?)', message)
    extracted_entities["amounts"] = amounts
    
    # Service extraction
    services = []
    for service in ["consultation", "checkup", "review", "support", "advisory"]:
        if service in message_lower:
            services.append(service)
    extracted_entities["services"] = services
    
    reasoning = f"Detected '{intent}' with {confidence:.0%} confidence based on keywords and industry context ({industry})."
    
    return {
        "intent": intent,
        "confidence": confidence,
        "suggested_amount": suggested_amount,
        "reasoning": reasoning,
        "extracted_entities": extracted_entities
    }

def generate_payment_link(amount: float, currency: str, description: str) -> str:
    """Generate secure payment link"""
    link_id = str(uuid.uuid4())[:16]
    # In production, this would be a real payment gateway URL
    return f"https://payments.agenthub.com/pay/{link_id}"

def process_payment_simulation(payment_method: str, amount: float) -> Dict[str, Any]:
    """Simulate payment processing (replace with real gateway integration)"""
    # Simulate different success rates by payment method
    success_rates = {
        "card": 0.95,
        "upi": 0.98,
        "netbanking": 0.92,
        "wallet": 0.96,
        "bank_transfer": 0.99
    }
    
    import random
    success_rate = success_rates.get(payment_method, 0.90)
    is_successful = random.random() < success_rate
    
    if is_successful:
        return {
            "status": "completed",
            "gateway_reference": f"gw_{uuid.uuid4().hex[:12]}",
            "processing_fee": amount * 0.029,  # 2.9% processing fee
            "net_amount": amount * 0.971
        }
    else:
        return {
            "status": "failed",
            "error_code": "PAYMENT_DECLINED",
            "error_message": "Payment was declined by the bank"
        }

def calculate_billing(transactions: List[Dict], period: BillingPeriod) -> Dict[str, Any]:
    """Calculate billing for a period"""
    line_items = []
    subtotal = 0.0
    
    for transaction in transactions:
        if transaction["status"] == "completed":
            transaction_date = datetime.fromisoformat(transaction["processed_at"].replace('Z', '+00:00').replace('+00:00', ''))
            
            if period.start_date <= transaction_date <= period.end_date:
                line_items.append({
                    "description": transaction["description"],
                    "amount": transaction["amount"],
                    "date": transaction["processed_at"]
                })
                subtotal += transaction["amount"]
    
    # Calculate tax (simplified - 10% for demo)
    tax_rate = 0.10
    tax_amount = subtotal * tax_rate
    total_amount = subtotal + tax_amount
    
    return {
        "line_items": line_items,
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "item_count": len(line_items)
    }

# API Endpoints

@app.get("/health")
async def health_check(request: Request):
    """Service health check with payment system status"""
    health_data = {
        "status": "healthy",
        "service": "payment-processing-consolidated",
        "version": "3.0.0",
        "components": {
            "payment_intents": len(payment_intents),
            "payment_links": len(payment_links),
            "transactions": len(transactions),
            "billing_records": len(billing_records),
            "supported_currencies": SUPPORTED_CURRENCIES,
            "supported_methods": PAYMENT_METHODS
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

@app.post("/api/payment-intent/analyze")
async def analyze_intent(
    request: PaymentIntentRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Analyze payment intent from user message"""
    if "payment:analyze" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    start_time = datetime.now()
    
    try:
        # Sanitize input
        message = sanitize_input(request.message, max_length=1000)
        industry = sanitize_input(request.industry, max_length=50)
        
        # Analyze intent
        analysis = analyze_payment_intent(message, industry)
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Store intent for analytics
        intent_id = hashlib.sha256(f"{message}:{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        payment_intents[intent_id] = {
            "message": message,
            "industry": industry,
            "analysis": analysis,
            "processed_at": start_time.isoformat(),
            "processed_by": claims.service_name
        }
        
        response = PaymentIntentResponse(
            intent=analysis["intent"],
            confidence=analysis["confidence"],
            suggested_amount=analysis["suggested_amount"],
            currency=request.currency,
            reasoning=analysis["reasoning"],
            extracted_entities=analysis["extracted_entities"],
            processing_time_ms=processing_time
        )
        
        logger.info(f"Payment intent analyzed by {claims.service_name}: {analysis['intent']} (confidence: {analysis['confidence']:.2f})")
        
        return response
        
    except Exception as e:
        logger.error(f"Payment intent analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payment-links/create")
async def create_payment_link(
    request: PaymentLinkRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Create payment link for customer"""
    if "payment:links" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Validate currency
        if request.currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency: {request.currency}")
        
        # Sanitize inputs
        description = sanitize_input(request.description, max_length=200)
        
        # Generate payment link
        link_id = str(uuid.uuid4())
        payment_url = generate_payment_link(request.amount, request.currency, description)
        
        # Set expiration (default 24 hours)
        expires_at = request.expires_at or (datetime.now() + timedelta(hours=24))
        
        # Store payment link
        payment_links[link_id] = {
            "amount": request.amount,
            "currency": request.currency,
            "description": description,
            "customer_email": request.customer_email,
            "payment_url": payment_url,
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "expires_at": expires_at.isoformat(),
            "metadata": request.metadata,
            "created_by": claims.service_name
        }
        
        response = PaymentLinkResponse(
            link_id=link_id,
            payment_url=payment_url,
            amount=request.amount,
            currency=request.currency,
            status="active",
            created_at=datetime.now().isoformat(),
            expires_at=expires_at.isoformat()
        )
        
        logger.info(f"Payment link created by {claims.service_name}: {request.amount} {request.currency}")
        
        return response
        
    except Exception as e:
        logger.error(f"Payment link creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payments/process")
async def process_payment(
    request: PaymentRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Process payment transaction"""
    if "payment:process" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Validate inputs
        if request.payment_method not in PAYMENT_METHODS:
            raise HTTPException(status_code=400, detail=f"Unsupported payment method: {request.payment_method}")
        
        if request.currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency: {request.currency}")
        
        # Sanitize description
        description = sanitize_input(request.description, max_length=200)
        
        # Process payment (simulation)
        gateway_response = process_payment_simulation(request.payment_method, request.amount)
        
        # Generate transaction ID
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        
        # Store transaction
        transaction_data = {
            "transaction_id": transaction_id,
            "amount": request.amount,
            "currency": request.currency,
            "payment_method": request.payment_method,
            "description": description,
            "customer_details": request.customer_details,
            "metadata": request.metadata,
            "status": gateway_response["status"],
            "gateway_response": gateway_response,
            "processed_at": datetime.now().isoformat(),
            "processed_by": claims.service_name
        }
        
        transactions[transaction_id] = transaction_data
        
        response = PaymentResponse(
            transaction_id=transaction_id,
            status=gateway_response["status"],
            amount=request.amount,
            currency=request.currency,
            payment_method=request.payment_method,
            processed_at=datetime.now().isoformat(),
            gateway_response=gateway_response
        )
        
        logger.info(f"Payment processed by {claims.service_name}: {transaction_id} - {gateway_response['status']}")
        
        return response
        
    except Exception as e:
        logger.error(f"Payment processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/billing/generate")
async def generate_bill(
    customer_id: str,
    period: BillingPeriod,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Generate billing record for customer"""
    if "billing:generate" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Sanitize customer ID
        customer_id = sanitize_input(customer_id, max_length=100)
        
        # Get customer transactions for the period
        customer_transactions = []
        for transaction in transactions.values():
            if (transaction.get("customer_details", {}).get("customer_id") == customer_id or
                transaction.get("metadata", {}).get("customer_id") == customer_id):
                customer_transactions.append(transaction)
        
        # Calculate billing
        billing_data = calculate_billing(customer_transactions, period)
        
        # Generate billing record ID
        bill_id = f"bill_{uuid.uuid4().hex[:12]}"
        
        # Create billing record
        billing_record = BillingRecord(
            customer_id=customer_id,
            period=period,
            line_items=billing_data["line_items"],
            subtotal=billing_data["subtotal"],
            tax_amount=billing_data["tax_amount"],
            total_amount=billing_data["total_amount"],
            currency="USD",
            status="draft"
        )
        
        # Store billing record
        billing_records[bill_id] = {
            **billing_record.dict(),
            "bill_id": bill_id,
            "generated_at": datetime.now().isoformat(),
            "generated_by": claims.service_name
        }
        
        logger.info(f"Bill generated by {claims.service_name}: {bill_id} for {customer_id} - ${billing_data['total_amount']:.2f}")
        
        return {
            "bill_id": bill_id,
            "billing_record": billing_record,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Billing generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/payments")
async def get_payment_analytics(
    period: str = "30d",
    currency: str = "USD",
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get payment analytics for specified period"""
    if "analytics:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Parse time period
        if period.endswith('d'):
            days = int(period[:-1])
            cutoff_date = datetime.now() - timedelta(days=days)
        else:
            cutoff_date = datetime.now() - timedelta(days=30)
        
        # Filter transactions by period and currency
        period_transactions = []
        for transaction in transactions.values():
            transaction_date = datetime.fromisoformat(transaction["processed_at"].replace('Z', '+00:00').replace('+00:00', ''))
            if (transaction_date >= cutoff_date and 
                transaction["currency"] == currency):
                period_transactions.append(transaction)
        
        # Calculate analytics
        total_revenue = sum(t["amount"] for t in period_transactions if t["status"] == "completed")
        transaction_count = len(period_transactions)
        completed_count = len([t for t in period_transactions if t["status"] == "completed"])
        success_rate = (completed_count / transaction_count * 100) if transaction_count > 0 else 0
        avg_transaction_value = total_revenue / completed_count if completed_count > 0 else 0
        
        # Top payment methods
        method_counts = {}
        for transaction in period_transactions:
            method = transaction["payment_method"]
            method_counts[method] = method_counts.get(method, 0) + 1
        
        top_payment_methods = [
            {"method": method, "count": count, "percentage": (count / transaction_count * 100)}
            for method, count in sorted(method_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        analytics = PaymentAnalytics(
            total_revenue=total_revenue,
            transaction_count=transaction_count,
            success_rate=success_rate,
            avg_transaction_value=avg_transaction_value,
            currency=currency,
            period=period,
            top_payment_methods=top_payment_methods
        )
        
        logger.info(f"Payment analytics retrieved by {claims.service_name}: ${total_revenue:.2f} revenue, {transaction_count} transactions")
        
        return analytics
        
    except Exception as e:
        logger.error(f"Payment analytics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payments/transaction/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get transaction details"""
    if "payment:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if transaction_id not in transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transactions[transaction_id]

@app.get("/api/billing/records")
async def list_billing_records(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """List billing records with optional filters"""
    if "billing:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    filtered_records = []
    for bill_id, record in billing_records.items():
        if customer_id and record.get("customer_id") != customer_id:
            continue
        if status and record.get("status") != status:
            continue
        
        filtered_records.append({
            "bill_id": bill_id,
            **record
        })
    
    return {
        "records": filtered_records,
        "total": len(filtered_records)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)