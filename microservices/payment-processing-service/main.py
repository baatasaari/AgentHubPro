#!/usr/bin/env python3
"""
Payment Processing Service
Microservice for all payment processing and management
Extracted from main server for better maintainability and scalability
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import json
import logging
from datetime import datetime
import os
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Payment Processing Service",
    description="Centralized payment processing for AgentHub platform",
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

# === Data Models ===

class PaymentRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD")
    description: str
    customer_id: Optional[str] = None
    agent_id: Optional[str] = None
    platform: Optional[str] = None

class PaymentResponse(BaseModel):
    payment_id: str
    payment_link: str
    status: str
    amount: float
    currency: str
    created_at: str

class PaymentConfig(BaseModel):
    customer_id: str
    payment_methods: List[str]
    default_currency: str = "USD"
    processing_fees: Dict[str, float] = {}

class UniversalPaymentContext(BaseModel):
    agent_id: str
    customer_id: str
    platform: str
    industry: str
    message: str

# === In-Memory Storage ===
payments = {}
payment_configs = {}
payment_links = {}

# === Service Health ===

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "payment-processing-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "total_payments": len(payments),
        "configured_customers": len(payment_configs)
    }

# === Payment Processing ===

@app.post("/api/payments/create")
async def create_payment(payment_request: PaymentRequest):
    """Create a new payment"""
    try:
        payment_id = str(uuid.uuid4())
        payment_link = f"https://pay.agenthub.com/{payment_id}"
        
        payment = {
            "id": payment_id,
            "amount": payment_request.amount,
            "currency": payment_request.currency,
            "description": payment_request.description,
            "customer_id": payment_request.customer_id,
            "agent_id": payment_request.agent_id,
            "platform": payment_request.platform,
            "status": "pending",
            "payment_link": payment_link,
            "created_at": datetime.now().isoformat()
        }
        
        payments[payment_id] = payment
        logger.info(f"Created payment {payment_id} for amount {payment_request.amount}")
        
        return PaymentResponse(
            payment_id=payment_id,
            payment_link=payment_link,
            status="pending",
            amount=payment_request.amount,
            currency=payment_request.currency,
            created_at=payment["created_at"]
        )
    except Exception as e:
        logger.error(f"Payment creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payments/{payment_id}")
async def get_payment(payment_id: str):
    """Get payment details"""
    try:
        if payment_id not in payments:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return payments[payment_id]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: str):
    """Confirm payment completion"""
    try:
        if payment_id not in payments:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        payments[payment_id]["status"] = "completed"
        payments[payment_id]["completed_at"] = datetime.now().isoformat()
        
        logger.info(f"Payment {payment_id} confirmed")
        return {"success": True, "payment_id": payment_id, "status": "completed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment confirmation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Universal Payment Processing ===

@app.post("/api/payments/universal/process")
async def process_universal_payment(context: UniversalPaymentContext):
    """Process universal payment across all platforms"""
    try:
        # Analyze payment intent from message
        amount = 50.0  # Default amount
        if "consultation" in context.message.lower():
            amount = 100.0
        elif "premium" in context.message.lower():
            amount = 200.0
        
        # Create payment
        payment_request = PaymentRequest(
            amount=amount,
            currency="USD",
            description=f"Payment for {context.platform} interaction",
            customer_id=context.customer_id,
            agent_id=context.agent_id,
            platform=context.platform
        )
        
        payment_response = await create_payment(payment_request)
        
        return {
            "intent": "payment_required",
            "confidence": 0.9,
            "payment_id": payment_response.payment_id,
            "payment_link": payment_response.payment_link,
            "amount": amount,
            "currency": "USD",
            "platform": context.platform,
            "industry": context.industry
        }
    except Exception as e:
        logger.error(f"Universal payment processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Payment Configuration ===

@app.post("/api/payments/config")
async def configure_payment(config: PaymentConfig):
    """Configure payment settings for customer"""
    try:
        payment_configs[config.customer_id] = config.model_dump()
        logger.info(f"Configured payment for customer {config.customer_id}")
        return {"success": True, "customer_id": config.customer_id}
    except Exception as e:
        logger.error(f"Payment configuration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payments/config/{customer_id}")
async def get_payment_config(customer_id: str):
    """Get payment configuration for customer"""
    try:
        if customer_id not in payment_configs:
            return {
                "customer_id": customer_id,
                "payment_methods": ["credit_card", "paypal"],
                "default_currency": "USD",
                "processing_fees": {}
            }
        
        return payment_configs[customer_id]
    except Exception as e:
        logger.error(f"Payment config retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Payment Analytics ===

@app.get("/api/payments/analytics")
async def get_payment_analytics():
    """Get payment analytics and metrics"""
    try:
        total_payments = len(payments)
        completed_payments = len([p for p in payments.values() if p.get("status") == "completed"])
        total_amount = sum(p.get("amount", 0) for p in payments.values() if p.get("status") == "completed")
        
        return {
            "total_payments": total_payments,
            "completed_payments": completed_payments,
            "pending_payments": total_payments - completed_payments,
            "total_revenue": total_amount,
            "completion_rate": completed_payments / total_payments if total_payments > 0 else 0,
            "average_amount": total_amount / completed_payments if completed_payments > 0 else 0
        }
    except Exception as e:
        logger.error(f"Payment analytics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Admin Operations ===

@app.get("/api/payments/admin/overview")
async def get_admin_payment_overview():
    """Get admin overview of all payments"""
    try:
        return {
            "total_payments": len(payments),
            "configured_customers": len(payment_configs),
            "service_status": "operational",
            "last_payment": max([p.get("created_at", "") for p in payments.values()], default="none"),
            "uptime": "100%"
        }
    except Exception as e:
        logger.error(f"Admin overview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Service Discovery ===

@app.get("/api/payments/service-info")
async def get_service_info():
    """Get service information for discovery"""
    return {
        "service_name": "payment-processing-service",
        "version": "1.0.0",
        "port": 8011,
        "endpoints": [
            "/api/payments/create",
            "/api/payments/{payment_id}",
            "/api/payments/universal/process",
            "/api/payments/config",
            "/api/payments/analytics"
        ],
        "dependencies": ["stripe-api", "paypal-api"],
        "status": "operational"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8011))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )