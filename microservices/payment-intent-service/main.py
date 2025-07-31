#!/usr/bin/env python3
"""
Payment Intent Service
Ultra-focused microservice for payment intent analysis only
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn
import logging
from datetime import datetime
import os
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Payment Intent Service",
    description="Ultra-focused payment intent analysis",
    version="1.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class PaymentIntentRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}

class PaymentIntentResponse(BaseModel):
    intent: str
    confidence: float
    suggested_amount: float
    currency: str
    reasoning: str

# Intent patterns
intent_patterns = {
    "consultation": {"keywords": ["consultation", "appointment", "booking", "schedule"], "amount": 100.0},
    "premium_service": {"keywords": ["premium", "urgent", "priority", "express"], "amount": 200.0},
    "subscription": {"keywords": ["subscribe", "monthly", "plan", "membership"], "amount": 50.0},
    "general_service": {"keywords": ["service", "help", "support"], "amount": 25.0}
}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "payment-intent", "patterns_loaded": len(intent_patterns)}

@app.post("/api/payment-intent/analyze")
async def analyze_payment_intent(request: PaymentIntentRequest):
    """Analyze message for payment intent"""
    try:
        message_lower = request.message.lower()
        best_intent = "general_service"
        best_score = 0.0
        suggested_amount = 25.0
        
        # Pattern matching
        for intent_name, intent_data in intent_patterns.items():
            score = 0.0
            matched_keywords = []
            
            for keyword in intent_data["keywords"]:
                if keyword in message_lower:
                    score += 1.0
                    matched_keywords.append(keyword)
            
            # Normalize score
            score = score / len(intent_data["keywords"])
            
            if score > best_score:
                best_score = score
                best_intent = intent_name
                suggested_amount = intent_data["amount"]
        
        # Confidence calculation
        confidence = min(best_score + 0.3, 1.0)  # Base confidence boost
        
        # Context-based adjustments
        if request.context.get("industry") == "healthcare":
            suggested_amount *= 1.5
        elif request.context.get("industry") == "premium":
            suggested_amount *= 2.0
        
        reasoning = f"Detected '{best_intent}' intent with {confidence:.2f} confidence"
        
        response = PaymentIntentResponse(
            intent=best_intent,
            confidence=confidence,
            suggested_amount=suggested_amount,
            currency="USD",
            reasoning=reasoning
        )
        
        logger.info(f"Analyzed intent: {best_intent} (confidence: {confidence:.2f})")
        return response
        
    except Exception as e:
        logger.error(f"Payment intent analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payment-intent/patterns")
async def get_intent_patterns():
    """Get available payment intent patterns"""
    return {"patterns": intent_patterns, "total_patterns": len(intent_patterns)}

@app.post("/api/payment-intent/quick-analyze")
async def quick_analyze(message: str):
    """Quick payment intent analysis"""
    request = PaymentIntentRequest(message=message)
    return await analyze_payment_intent(request)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8014))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)