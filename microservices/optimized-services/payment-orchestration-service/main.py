#!/usr/bin/env python3
"""
Optimized Payment Orchestration Service
Consolidates payment intent and payment link generation
Target: 62% latency reduction (400ms → 150ms)
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import asyncio
import uuid
from typing import Dict, Any, Optional, List
import uvicorn
import logging
from datetime import datetime, timedelta
import json
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Payment Orchestration Service", description="Optimized payment processing", version="2.0.0")

class PaymentMethod(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class PaymentRequest(BaseModel):
    customer_id: str
    amount: float
    currency: str = "USD"
    description: str
    payment_method: PaymentMethod
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentLinkRequest(BaseModel):
    payment_intent_id: str
    expires_in_minutes: int = 60
    custom_branding: Optional[Dict[str, str]] = None

class PaymentOrchestrator:
    def __init__(self):
        self.payment_intents = {}  # In-memory storage for payment intents
        self.payment_links = {}    # Generated payment links
        self.payment_cache = {}    # Cache for frequent operations
        
    async def create_payment_workflow(self, request: PaymentRequest) -> Dict[str, Any]:
        """Optimized workflow: intent creation + link generation in single operation"""
        start_time = datetime.now()
        
        try:
            # Step 1: Create payment intent
            intent_id = await self._create_payment_intent(request)
            
            # Step 2: Generate payment link immediately
            link_data = await self._generate_payment_link(intent_id, expires_in_minutes=60)
            
            # Step 3: Setup webhook handlers
            await self._setup_payment_monitoring(intent_id)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "payment_intent_id": intent_id,
                "payment_link": link_data["payment_url"],
                "expires_at": link_data["expires_at"],
                "processing_time_ms": processing_time * 1000,
                "status": "ready"
            }
            
        except Exception as e:
            logger.error(f"Payment workflow failed: {e}")
            raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)}")
    
    async def _create_payment_intent(self, request: PaymentRequest) -> str:
        """Optimized payment intent creation with caching"""
        intent_id = f"pi_{uuid.uuid4().hex[:16]}"
        
        # Check for duplicate prevention cache
        cache_key = f"{request.customer_id}_{request.amount}_{request.description[:20]}"
        if cache_key in self.payment_cache:
            recent_intent = self.payment_cache[cache_key]
            if (datetime.now() - recent_intent["created_at"]).seconds < 300:  # 5 min window
                logger.info(f"Returning cached payment intent for duplicate request")
                return recent_intent["intent_id"]
        
        intent_data = {
            "id": intent_id,
            "customer_id": request.customer_id,
            "amount": request.amount,
            "currency": request.currency,
            "description": request.description,
            "payment_method": request.payment_method,
            "status": PaymentStatus.PENDING,
            "created_at": datetime.now(),
            "metadata": request.metadata or {},
            "success_url": request.success_url,
            "cancel_url": request.cancel_url
        }
        
        # Store intent
        self.payment_intents[intent_id] = intent_data
        
        # Cache for duplicate prevention
        self.payment_cache[cache_key] = {
            "intent_id": intent_id,
            "created_at": datetime.now()
        }
        
        logger.info(f"Created payment intent {intent_id} for {request.amount} {request.currency}")
        return intent_id
    
    async def _generate_payment_link(self, intent_id: str, expires_in_minutes: int = 60) -> Dict[str, Any]:
        """Optimized payment link generation with secure token"""
        if intent_id not in self.payment_intents:
            raise ValueError(f"Payment intent {intent_id} not found")
        
        intent_data = self.payment_intents[intent_id]
        
        # Generate secure payment token
        payment_token = f"pt_{uuid.uuid4().hex}"
        expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)
        
        # Construct payment URL based on payment method
        base_url = "https://payments.agenthub.com"
        payment_url = f"{base_url}/pay/{payment_token}"
        
        link_data = {
            "payment_token": payment_token,
            "payment_intent_id": intent_id,
            "payment_url": payment_url,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        # Store payment link
        self.payment_links[payment_token] = link_data
        
        # Update intent with link reference
        self.payment_intents[intent_id]["payment_link"] = payment_url
        self.payment_intents[intent_id]["payment_token"] = payment_token
        
        return link_data
    
    async def _setup_payment_monitoring(self, intent_id: str):
        """Setup async monitoring for payment status updates"""
        # In production, this would setup webhook endpoints and monitoring
        logger.info(f"Payment monitoring setup for intent {intent_id}")
        pass
    
    async def process_payment(self, payment_token: str, payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Process payment with optimized validation and execution"""
        start_time = datetime.now()
        
        try:
            # Validate payment token
            if payment_token not in self.payment_links:
                raise HTTPException(status_code=404, detail="Invalid payment token")
            
            link_data = self.payment_links[payment_token]
            
            # Check expiration
            expires_at = datetime.fromisoformat(link_data["expires_at"])
            if datetime.now() > expires_at:
                raise HTTPException(status_code=400, detail="Payment link expired")
            
            intent_id = link_data["payment_intent_id"]
            intent_data = self.payment_intents[intent_id]
            
            # Update status to processing
            self.payment_intents[intent_id]["status"] = PaymentStatus.PROCESSING
            
            # Process payment based on method
            payment_result = await self._execute_payment(intent_data, payment_details)
            
            # Update final status
            final_status = PaymentStatus.COMPLETED if payment_result["success"] else PaymentStatus.FAILED
            self.payment_intents[intent_id]["status"] = final_status
            self.payment_intents[intent_id]["processed_at"] = datetime.now()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "payment_intent_id": intent_id,
                "status": final_status.value,
                "transaction_id": payment_result.get("transaction_id"),
                "processing_time_ms": processing_time * 1000,
                "success": payment_result["success"]
            }
            
        except Exception as e:
            logger.error(f"Payment processing failed: {e}")
            raise
    
    async def _execute_payment(self, intent_data: Dict[str, Any], payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute payment based on payment method"""
        payment_method = intent_data["payment_method"]
        
        if payment_method == PaymentMethod.STRIPE:
            return await self._process_stripe_payment(intent_data, payment_details)
        elif payment_method == PaymentMethod.UPI:
            return await self._process_upi_payment(intent_data, payment_details)
        elif payment_method == PaymentMethod.PAYPAL:
            return await self._process_paypal_payment(intent_data, payment_details)
        else:
            return await self._process_bank_transfer(intent_data, payment_details)
    
    async def _process_stripe_payment(self, intent_data: Dict[str, Any], payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized Stripe payment processing"""
        # Simulate Stripe API call
        await asyncio.sleep(0.1)  # Simulate API latency
        
        # In production, use actual Stripe SDK
        transaction_id = f"txn_stripe_{uuid.uuid4().hex[:12]}"
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "provider": "stripe",
            "amount_charged": intent_data["amount"]
        }
    
    async def _process_upi_payment(self, intent_data: Dict[str, Any], payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized UPI payment processing for Indian market"""
        # Simulate UPI processing
        await asyncio.sleep(0.05)  # UPI is typically faster
        
        transaction_id = f"upi_{uuid.uuid4().hex[:12]}"
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "provider": "upi",
            "amount_charged": intent_data["amount"]
        }
    
    async def _process_paypal_payment(self, intent_data: Dict[str, Any], payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized PayPal payment processing"""
        await asyncio.sleep(0.15)  # Simulate PayPal API
        
        transaction_id = f"pp_{uuid.uuid4().hex[:12]}"
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "provider": "paypal",
            "amount_charged": intent_data["amount"]
        }
    
    async def _process_bank_transfer(self, intent_data: Dict[str, Any], payment_details: Dict[str, Any]) -> Dict[str, Any]:
        """Process bank transfer payments"""
        await asyncio.sleep(0.2)  # Bank transfers are slower
        
        transaction_id = f"bt_{uuid.uuid4().hex[:12]}"
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "provider": "bank_transfer",
            "amount_charged": intent_data["amount"]
        }
    
    async def get_payment_status(self, intent_id: str) -> Dict[str, Any]:
        """Get real-time payment status with caching"""
        if intent_id not in self.payment_intents:
            raise HTTPException(status_code=404, detail="Payment intent not found")
        
        intent_data = self.payment_intents[intent_id]
        
        return {
            "payment_intent_id": intent_id,
            "status": intent_data["status"].value,
            "amount": intent_data["amount"],
            "currency": intent_data["currency"],
            "created_at": intent_data["created_at"].isoformat(),
            "processed_at": intent_data.get("processed_at", {}).isoformat() if intent_data.get("processed_at") else None
        }

# Initialize orchestrator
orchestrator = PaymentOrchestrator()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "payment-orchestration-optimized",
        "active_intents": len(orchestrator.payment_intents),
        "active_links": len(orchestrator.payment_links)
    }

@app.post("/api/payments/create-workflow")
async def create_payment_workflow(request: PaymentRequest):
    """Create complete payment workflow (intent + link)"""
    return await orchestrator.create_payment_workflow(request)

@app.post("/api/payments/process/{payment_token}")
async def process_payment(payment_token: str, payment_details: Dict[str, Any]):
    """Process payment using payment token"""
    return await orchestrator.process_payment(payment_token, payment_details)

@app.get("/api/payments/status/{intent_id}")
async def get_payment_status(intent_id: str):
    """Get payment status with real-time updates"""
    return await orchestrator.get_payment_status(intent_id)

@app.get("/api/payments/stats")
async def get_payment_stats():
    """Get payment processing statistics"""
    total_intents = len(orchestrator.payment_intents)
    completed_payments = sum(1 for intent in orchestrator.payment_intents.values() 
                           if intent["status"] == PaymentStatus.COMPLETED)
    
    return {
        "total_payment_intents": total_intents,
        "completed_payments": completed_payments,
        "success_rate": completed_payments / max(total_intents, 1),
        "active_payment_links": len(orchestrator.payment_links)
    }

@app.delete("/api/payments/{intent_id}")
async def cancel_payment(intent_id: str):
    """Cancel payment intent"""
    if intent_id not in orchestrator.payment_intents:
        raise HTTPException(status_code=404, detail="Payment intent not found")
    
    orchestrator.payment_intents[intent_id]["status"] = PaymentStatus.CANCELLED
    
    return {"message": "Payment cancelled successfully"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8201))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)