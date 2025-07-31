#!/usr/bin/env python3
"""
Response Generation Service
Ultra-focused microservice for LLM response generation only
Target: <140 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Response Generation Service", description="Ultra-focused LLM response generation", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ResponseRequest(BaseModel):
    query: str
    context: List[str]
    agent_id: str
    industry: str
    model: str = "gpt-4o"
    max_tokens: int = 500

class ResponseResult(BaseModel):
    response: str
    model_used: str
    tokens_used: int
    response_time_ms: float
    confidence_score: float

# Response cache
response_cache = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "response-generation", "cached_responses": len(response_cache)}

@app.post("/api/responses/generate")
async def generate_response(request: ResponseRequest):
    """Generate LLM response"""
    try:
        start_time = datetime.now()
        
        # Check cache
        cache_key = f"{request.model}:{hash(request.query + str(request.context))}"
        if cache_key in response_cache:
            logger.info("Returning cached response")
            return response_cache[cache_key]
        
        # Industry-specific response templates
        industry_templates = {
            "healthcare": "As a healthcare assistant, I'll help you with medical information and appointments.",
            "retail": "Welcome to our store! I'm here to help you find products and assist with purchases.",
            "finance": "I'm your financial advisor assistant, ready to help with banking and investment questions.",
            "real_estate": "Hello! I'm here to assist you with property searches and real estate inquiries."
        }
        
        # Generate response based on context
        context_summary = " ".join(request.context[:3]) if request.context else ""
        industry_intro = industry_templates.get(request.industry, "Hello! I'm here to assist you.")
        
        # Mock response generation (replace with actual LLM call)
        if "price" in request.query.lower() or "cost" in request.query.lower():
            response_text = f"{industry_intro} Regarding pricing, let me provide you with current information based on our knowledge base: {context_summary}"
        elif "appointment" in request.query.lower() or "booking" in request.query.lower():
            response_text = f"{industry_intro} I'd be happy to help you schedule an appointment. {context_summary}"
        elif "payment" in request.query.lower():
            response_text = f"{industry_intro} For payment options and processing, here's what I can tell you: {context_summary}"
        else:
            response_text = f"{industry_intro} Based on the information available: {context_summary}"
        
        # Simulate token usage and timing
        tokens_used = min(len(response_text.split()) * 1.3, request.max_tokens)
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        confidence_score = 0.85 if request.context else 0.65
        
        result = ResponseResult(
            response=response_text,
            model_used=request.model,
            tokens_used=int(tokens_used),
            response_time_ms=round(response_time, 2),
            confidence_score=confidence_score
        )
        
        # Cache the result
        response_cache[cache_key] = result
        
        logger.info(f"Generated response for {request.industry} agent ({tokens_used} tokens)")
        return result
        
    except Exception as e:
        logger.error(f"Response generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/responses/quick")
async def quick_response(query: str, industry: str = "general"):
    """Quick response generation with minimal context"""
    request = ResponseRequest(
        query=query,
        context=[],
        agent_id="quick",
        industry=industry
    )
    return await generate_response(request)

@app.post("/api/responses/contextual")
async def contextual_response(query: str, context_docs: List[str], agent_id: str, industry: str):
    """Generate response with rich context"""
    request = ResponseRequest(
        query=query,
        context=context_docs,
        agent_id=agent_id,
        industry=industry
    )
    return await generate_response(request)

@app.get("/api/responses/cache/stats")
async def get_cache_stats():
    """Get response cache statistics"""
    return {
        "cached_responses": len(response_cache),
        "cache_efficiency": "high" if len(response_cache) > 50 else "medium",
        "average_tokens": 350
    }

@app.delete("/api/responses/cache")
async def clear_response_cache():
    """Clear response cache"""
    cleared_count = len(response_cache)
    response_cache.clear()
    return {"success": True, "cleared_responses": cleared_count}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8012))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)