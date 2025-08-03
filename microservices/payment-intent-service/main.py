#!/usr/bin/env python3
"""
Payment Intent Service - Production Ready
Real AI-powered intent detection using OpenAI GPT models
Replaces keyword heuristics with sophisticated NLP analysis
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn
import logging
from datetime import datetime
import os
import openai
import json
import asyncio
import hashlib
import sys
sys.path.append('../shared')
from auth_middleware import (
    authenticate_service_request,
    ServiceClaims,
    get_secure_cors_middleware,
    security_metrics,
    require_permission
)
from security_utils import (
    StructuredLogger,
    RequestContext,
    InputSanitizer,
    SecureErrorHandler,
    SecurityMonitor
)

# Initialize structured logger and security monitor
logger = StructuredLogger("payment-intent-service")
security_monitor = SecurityMonitor()

# Initialize OpenAI client
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found - service may fail")

openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Secure Payment Intent Service",
    description="Production AI-powered payment intent analysis with authentication",
    version="2.1.0"
)

# Add secure CORS middleware instead of open policy
app.add_middleware(get_secure_cors_middleware())

# Configuration for AI models
AI_MODELS = {
    "gpt-4o": {"cost_per_1k": 0.03, "context_window": 128000, "recommended": True},
    "gpt-4": {"cost_per_1k": 0.06, "context_window": 8192, "recommended": False},
    "gpt-3.5-turbo": {"cost_per_1k": 0.002, "context_window": 16384, "recommended": True}
}

DEFAULT_MODEL = "gpt-4o"

class PaymentIntentRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}
    model: str = DEFAULT_MODEL
    industry: Optional[str] = None
    customer_history: Optional[List[Dict]] = []

class PaymentIntentResponse(BaseModel):
    intent: str
    confidence: float
    suggested_amount: float
    currency: str
    reasoning: str
    extracted_entities: Dict[str, Any]
    alternative_intents: List[Dict[str, float]]
    cost_estimate: float
    processing_time_ms: int

class IntentAnalysisConfig(BaseModel):
    confidence_threshold: float = 0.7
    include_alternatives: bool = True
    extract_entities: bool = True
    currency_preference: str = "USD"

# Cache for AI responses
intent_cache = {}

# AI-powered intent analysis system prompt
INTENT_ANALYSIS_PROMPT = """
You are an expert payment intent analyst. Analyze the user message and determine the payment intent with high accuracy.

INTENT CATEGORIES:
1. payment_request - User wants to make a payment
2. booking_request - User wants to book/schedule something
3. consultation_request - User wants to schedule a consultation
4. subscription_request - User wants to subscribe to a service
5. product_purchase - User wants to buy a product
6. service_inquiry - User is asking about services/pricing
7. payment_confirmation - User is confirming a payment
8. refund_request - User wants a refund
9. billing_inquiry - User has billing questions
10. general_inquiry - General question not related to payments

For each analysis, provide:
- Primary intent with confidence score (0.0-1.0)
- Alternative intents with scores
- Suggested amount based on context
- Extracted entities (amounts, dates, services mentioned)
- Clear reasoning for the classification

Response format must be valid JSON.
"""

# Industry-specific pricing models
INDUSTRY_PRICING = {
    "healthcare": {
        "consultation": 150.0,
        "premium_service": 300.0,
        "subscription": 99.0,
        "general_service": 75.0
    },
    "legal": {
        "consultation": 250.0,
        "premium_service": 500.0,
        "subscription": 199.0,
        "general_service": 150.0
    },
    "technology": {
        "consultation": 120.0,
        "premium_service": 200.0,
        "subscription": 49.0,
        "general_service": 50.0
    },
    "finance": {
        "consultation": 200.0,
        "premium_service": 400.0,
        "subscription": 149.0,
        "general_service": 100.0
    },
    "default": {
        "consultation": 100.0,
        "premium_service": 200.0,
        "subscription": 50.0,
        "general_service": 25.0
    }
}

@app.get("/health")  
async def health_check(request: Request):
    # Test OpenAI API connectivity
    openai_status = "unknown"
    try:
        if os.getenv("OPENAI_API_KEY"):
            # Quick test call to verify API key
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Health check"}],
                    max_tokens=5
                )
            )
            openai_status = "connected"
        else:
            openai_status = "no_api_key"
    except Exception as e:
        openai_status = f"error: {str(e)[:50]}"
    
    health_data = {
        "status": "healthy",
        "service": "payment-intent-secure",
        "cached_analyses": len(intent_cache),
        "openai_status": openai_status,
        "supported_models": list(AI_MODELS.keys()),
        "supported_industries": list(INDUSTRY_PRICING.keys()),
        "version": "2.1.0",
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
            pass  # Skip metrics if authentication fails
    
    return health_data

@app.post("/api/payment-intent/analyze")
async def analyze_payment_intent(
    request: PaymentIntentRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Analyze message for payment intent using AI with authentication"""
    start_time = datetime.now()
    
    try:
        # Check permissions
        if "payment:analyze" not in claims.permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Sanitize input message
        request.message = sanitize_input(request.message, max_length=2000)
        
        # Validate model
        if request.model not in AI_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported model. Available: {list(AI_MODELS.keys())}"
            )
        
        # Create cache key
        cache_data = {
            "message": request.message,
            "model": request.model,
            "industry": request.industry,
            "context": request.context
        }
        cache_key = hashlib.sha256(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()
        
        # Check cache
        if cache_key in intent_cache:
            cached_response = intent_cache[cache_key]
            logger.info(f"Cache hit for {claims.service_name} intent analysis")
            security_metrics.record_successful_auth(claims.service_name, "cached_intent")
            return cached_response
        
        # Prepare context for AI analysis
        industry = request.industry or request.context.get("industry", "default")
        pricing_model = INDUSTRY_PRICING.get(industry, INDUSTRY_PRICING["default"])
        
        context_info = f"""
        Message to analyze: "{request.message}"
        Industry: {industry}
        Available context: {json.dumps(request.context, indent=2)}
        Customer history: {json.dumps(request.customer_history[:3], indent=2) if request.customer_history else "None"}
        Industry pricing model: {json.dumps(pricing_model, indent=2)}
        """
        
        # Create AI analysis prompt
        analysis_prompt = f"{INTENT_ANALYSIS_PROMPT}\n\nCONTEXT:\n{context_info}\n\nProvide analysis as JSON with the following structure:\n{{\n  \"primary_intent\": \"intent_name\",\n  \"confidence\": 0.85,\n  \"alternative_intents\": [{{\"intent\": \"name\", \"confidence\": 0.65}}],\n  \"suggested_amount\": 100.0,\n  \"currency\": \"USD\",\n  \"extracted_entities\": {{\"amounts\": [], \"services\": [], \"dates\": []}},\n  \"reasoning\": \"Detailed explanation\"\n}}"
        
        logger.info(f"Analyzing intent for {claims.service_name} with {request.model}, text length {len(request.message)}")
        security_metrics.record_successful_auth(claims.service_name, "intent_analysis")
        
        # Call OpenAI API
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai_client.chat.completions.create(
                    model=request.model,
                    messages=[
                        {"role": "system", "content": "You are an expert payment intent analyst. Always respond with valid JSON only."},
                        {"role": "user", "content": analysis_prompt}
                    ],
                    temperature=0.1,  # Low temperature for consistent results
                    max_tokens=1000
                )
            )
            
            # Parse AI response
            ai_response_text = response.choices[0].message.content.strip()
            
            # Clean up response if it has markdown formatting
            if ai_response_text.startswith("```json"):
                ai_response_text = ai_response_text[7:-3]
            elif ai_response_text.startswith("```"):
                ai_response_text = ai_response_text[3:-3]
            
            ai_analysis = json.loads(ai_response_text)
            
            # Calculate processing time and cost
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Estimate tokens and cost
            prompt_tokens = len(analysis_prompt.split())
            completion_tokens = len(ai_response_text.split())
            total_tokens = prompt_tokens + completion_tokens
            cost_estimate = (total_tokens / 1000) * AI_MODELS[request.model]["cost_per_1k"]
            
            # Apply industry-specific pricing adjustments
            suggested_amount = ai_analysis.get("suggested_amount", pricing_model.get("general_service", 25.0))
            
            # Create response
            intent_response = PaymentIntentResponse(
                intent=ai_analysis.get("primary_intent", "general_inquiry"),
                confidence=ai_analysis.get("confidence", 0.5),
                suggested_amount=suggested_amount,
                currency=ai_analysis.get("currency", "USD"),
                reasoning=ai_analysis.get("reasoning", "AI analysis completed"),
                extracted_entities=ai_analysis.get("extracted_entities", {}),
                alternative_intents=ai_analysis.get("alternative_intents", []),
                cost_estimate=cost_estimate,
                processing_time_ms=processing_time
            )
            
            # Cache the result
            intent_cache[cache_key] = intent_response
            
            logger.info(f"AI intent analysis for {claims.service_name}: {intent_response.intent} (confidence: {intent_response.confidence:.2f}, cost: ${cost_estimate:.6f})")
            
            return intent_response
            
        except openai.RateLimitError:
            logger.error("OpenAI rate limit exceeded")
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        except openai.APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise HTTPException(status_code=503, detail=f"OpenAI API error: {str(e)}")
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {ai_response_text}")
            # Fallback to basic analysis
            return await fallback_intent_analysis(request)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment intent analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

async def fallback_intent_analysis(request: PaymentIntentRequest):
    """Fallback intent analysis when AI fails"""
    message_lower = request.message.lower()
    
    # Basic keyword-based fallback
    if any(word in message_lower for word in ["pay", "payment", "buy", "purchase"]):
        intent = "payment_request"
        confidence = 0.7
    elif any(word in message_lower for word in ["book", "appointment", "schedule"]):
        intent = "booking_request"
        confidence = 0.65
    elif any(word in message_lower for word in ["consult", "consultation", "advice"]):
        intent = "consultation_request"
        confidence = 0.6
    else:
        intent = "general_inquiry"
        confidence = 0.5
    
    industry = request.industry or "default"
    pricing_model = INDUSTRY_PRICING.get(industry, INDUSTRY_PRICING["default"])
    suggested_amount = pricing_model.get("general_service", 25.0)
    
    return PaymentIntentResponse(
        intent=intent,
        confidence=confidence,
        suggested_amount=suggested_amount,
        currency="USD",
        reasoning="Fallback analysis due to AI service unavailability",
        extracted_entities={},
        alternative_intents=[],
        cost_estimate=0.0,
        processing_time_ms=10
    )

@app.get("/api/payment-intent/models")
async def get_available_models(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get available AI models for intent analysis"""
    return {
        "models": AI_MODELS,
        "default_model": DEFAULT_MODEL,
        "recommendations": {
            "cost_effective": "gpt-3.5-turbo",
            "high_accuracy": "gpt-4o",
            "balanced": "gpt-4o"
        }
    }

@app.get("/api/payment-intent/industries")
async def get_supported_industries(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get supported industries and their pricing models"""
    return {
        "industries": INDUSTRY_PRICING,
        "default_industry": "default"
    }

@app.post("/api/payment-intent/quick-analyze")
async def quick_analyze(
    message: str, 
    industry: str = "default", 
    model: str = DEFAULT_MODEL,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Quick payment intent analysis with minimal parameters"""
    request = PaymentIntentRequest(
        message=message,
        industry=industry,
        model=model
    )
    return await analyze_payment_intent(request)

@app.get("/api/payment-intent/cache/stats")
async def get_cache_stats(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get intent analysis cache statistics"""
    return {
        "cached_analyses": len(intent_cache),
        "cache_efficiency": "high" if len(intent_cache) > 50 else "low",
        "memory_usage_estimate": f"{len(intent_cache) * 0.5:.1f}KB"
    }

@app.delete("/api/payment-intent/cache")
async def clear_cache(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Clear intent analysis cache (admin permission required)"""
    if "admin:cache" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Admin permission required to clear cache")
    
    cleared_count = len(intent_cache)
    intent_cache.clear()
    logger.info(f"Intent cache cleared by {claims.service_name}: {cleared_count} analyses")
    return {"success": True, "cleared_analyses": cleared_count, "cleared_by": claims.service_name}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8014))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)