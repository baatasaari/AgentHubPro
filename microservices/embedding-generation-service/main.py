#!/usr/bin/env python3
"""
Embedding Generation Service - Production Ready
Real OpenAI embedding generation with configurable parameters
Replaces mock implementation with actual AI models
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime
import os
import openai
import hashlib
import asyncio
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
    SecureTextInput,
    SecurityMonitor
)

# Initialize structured logger and security monitor
logger = StructuredLogger("embedding-generation-service")
security_monitor = SecurityMonitor()

# Initialize OpenAI client
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found - service may fail")

openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Secure Embedding Generation Service",
    description="Production AI-powered embedding generation with authentication",
    version="2.1.0"
)

# Add secure CORS middleware instead of open policy
app.add_middleware(get_secure_cors_middleware())

# Configuration for embedding models
EMBEDDING_MODELS = {
    "text-embedding-3-small": {"dimensions": 1536, "cost_per_1k": 0.00002},
    "text-embedding-3-large": {"dimensions": 3072, "cost_per_1k": 0.00013},
    "text-embedding-ada-002": {"dimensions": 1536, "cost_per_1k": 0.00010}
}

DEFAULT_MODEL = "text-embedding-3-small"

class EmbeddingRequest(BaseModel):
    text: str
    model: str = DEFAULT_MODEL
    dimensions: Optional[int] = None
    
    def validate_and_sanitize(self) -> 'EmbeddingRequest':
        """Validate and sanitize all inputs"""
        try:
            # Sanitize text input
            self.text = InputSanitizer.sanitize_string(self.text, max_length=8192)
            
            # Validate model
            if self.model not in EMBEDDING_MODELS:
                raise ValueError(f"Unsupported model: {self.model}")
            
            # Validate dimensions if provided
            if self.dimensions is not None:
                self.dimensions = int(InputSanitizer.sanitize_numeric(self.dimensions, min_val=1, max_val=5000))
            
            return self
        except Exception as e:
            raise ValueError(f"Input validation failed: {str(e)}")  # For custom dimension reduction
    
class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    model: str
    generated_at: str
    cost_estimate: float
    cache_hit: bool
    
class BatchEmbeddingRequest(BaseModel):
    texts: List[str]
    model: str = DEFAULT_MODEL
    max_batch_size: int = 100

# Embedding cache
embedding_cache = {}

@app.get("/health")
async def health_check(request: Request):
    # Test OpenAI API connectivity
    openai_status = "unknown"
    try:
        if os.getenv("OPENAI_API_KEY"):
            # Quick test call to verify API key
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai_client.embeddings.create(
                    model="text-embedding-3-small",
                    input="health check"
                )
            )
            openai_status = "connected"
        else:
            openai_status = "no_api_key"
    except Exception as e:
        openai_status = f"error: {str(e)[:50]}"
    
    health_data = {
        "status": "healthy", 
        "service": "embedding-generation-secure", 
        "cached_embeddings": len(embedding_cache),
        "openai_status": openai_status,
        "supported_models": list(EMBEDDING_MODELS.keys()),
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
            # This will be called without dependency injection for health checks
            health_data.update(security_metrics.get_metrics())
        except:
            pass  # Skip metrics if authentication fails
    
    return health_data

@app.post("/api/embeddings/generate")
async def generate_embedding(
    request: EmbeddingRequest,
    http_request: Request,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Generate real AI embedding using OpenAI with secure error handling"""
    request_context = RequestContext(http_request)
    
    try:
        # Check permissions
        if "embedding:generate" not in claims.permissions:
            raise PermissionError("Insufficient permissions for embedding generation")
        
        # Validate and sanitize input
        request = request.validate_and_sanitize()
        
        # Create cache key
        text_hash = hashlib.sha256(request.text.encode()).hexdigest()
        cache_key = f"{request.model}:{text_hash}"
        
        # Check cache first
        if cache_key in embedding_cache:
            cached_response = embedding_cache[cache_key]
            cached_response.cache_hit = True
            logger.info(
                f"Cache hit for embedding request",
                request_id=request_context.request_id,
                service_name=claims.service_name,
                text_length=len(request.text),
                model=request.model
            )
            security_metrics.record_successful_auth(claims.service_name, "cached")
            return cached_response
        
        logger.info(
            f"Generating embedding",
            request_id=request_context.request_id,
            service_name=claims.service_name,
            text_length=len(request.text),
            model=request.model
        )
        security_metrics.record_successful_auth(claims.service_name, "embedding_generation")
        
        # Generate real embedding using OpenAI
        try:
            embedding_response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai_client.embeddings.create(
                    model=request.model,
                    input=request.text,
                    dimensions=request.dimensions
                )
            )
            
            embedding = embedding_response.data[0].embedding
            actual_dimensions = len(embedding)
            
            # Calculate cost estimate
            token_count = len(request.text.split())  # Rough estimate
            cost_estimate = (token_count / 1000) * EMBEDDING_MODELS[request.model]["cost_per_1k"]
            
            response = EmbeddingResponse(
                embedding=embedding,
                dimensions=actual_dimensions,
                model=request.model,
                generated_at=datetime.now().isoformat(),
                cost_estimate=cost_estimate,
                cache_hit=False
            )
            
            # Cache the result
            embedding_cache[cache_key] = response
            logger.info(f"Generated {actual_dimensions}D embedding (cost: ${cost_estimate:.6f})")
            
            return response
            
        except openai.RateLimitError as e:
            logger.error(
                "OpenAI rate limit exceeded",
                request_id=request_context.request_id,
                error_details=str(e)
            )
            raise Exception("Rate limit exceeded")
        except openai.APIError as e:
            logger.error(
                "OpenAI API error",
                request_id=request_context.request_id,
                error_details=str(e)
            )
            raise Exception("External service unavailable")
            
    except Exception as e:
        # Record security event for suspicious errors
        if security_monitor.is_suspicious_ip(request_context.client_ip):
            security_monitor.record_failed_attempt(request_context.client_ip, request_context, logger)
        
        # Return secure error response
        error_response, status_code = SecureErrorHandler.create_error_response(
            e, request_context, logger, include_details=False
        )
        raise HTTPException(status_code=status_code, detail=error_response["error"]["message"])

@app.post("/api/embeddings/batch")
async def generate_batch_embeddings(
    request: BatchEmbeddingRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Generate embeddings for multiple texts efficiently with authentication"""
    try:
        # Check permissions
        if "embedding:batch" not in claims.permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions for batch processing")
        
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > request.max_batch_size:
            raise HTTPException(
                status_code=400, 
                detail=f"Too many texts. Max batch size: {request.max_batch_size}"
            )
        
        # Sanitize all input texts
        sanitized_texts = []
        for text in request.texts:
            sanitized_texts.append(sanitize_input(text, max_length=8192))
        request.texts = sanitized_texts
        
        # Process in batches for efficiency
        batch_size = min(len(request.texts), 50)  # OpenAI batch limit
        all_embeddings = []
        total_cost = 0.0
        cache_hits = 0
        
        for i in range(0, len(request.texts), batch_size):
            batch_texts = request.texts[i:i + batch_size]
            
            # Check for cached embeddings first
            batch_results = []
            uncached_texts = []
            uncached_indices = []
            
            for j, text in enumerate(batch_texts):
                text_hash = hashlib.sha256(text.encode()).hexdigest()
                cache_key = f"{request.model}:{text_hash}"
                
                if cache_key in embedding_cache:
                    batch_results.append((j, embedding_cache[cache_key].embedding))
                    cache_hits += 1
                else:
                    uncached_texts.append(text)
                    uncached_indices.append(j)
            
            # Generate embeddings for uncached texts
            if uncached_texts:
                try:
                    embedding_response = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: openai_client.embeddings.create(
                            model=request.model,
                            input=uncached_texts
                        )
                    )
                    
                    # Process results and cache them
                    for k, (text, embedding_data) in enumerate(zip(uncached_texts, embedding_response.data)):
                        embedding = embedding_data.embedding
                        original_index = uncached_indices[k]
                        
                        # Cache the embedding
                        text_hash = hashlib.sha256(text.encode()).hexdigest()
                        cache_key = f"{request.model}:{text_hash}"
                        
                        cached_response = EmbeddingResponse(
                            embedding=embedding,
                            dimensions=len(embedding),
                            model=request.model,
                            generated_at=datetime.now().isoformat(),
                            cost_estimate=0.0,  # Will calculate total cost below
                            cache_hit=False
                        )
                        embedding_cache[cache_key] = cached_response
                        
                        batch_results.append((original_index, embedding))
                    
                    # Calculate cost for this batch
                    total_tokens = sum(len(text.split()) for text in uncached_texts)
                    batch_cost = (total_tokens / 1000) * EMBEDDING_MODELS[request.model]["cost_per_1k"]
                    total_cost += batch_cost
                    
                except openai.APIError as e:
                    logger.error(f"OpenAI API error in batch processing: {e}")
                    raise HTTPException(status_code=503, detail=f"OpenAI API error: {str(e)}")
            
            # Sort results by original index and add to all_embeddings
            batch_results.sort(key=lambda x: x[0])
            all_embeddings.extend([result[1] for result in batch_results])
        
        logger.info(f"Batch processed for {claims.service_name}: {len(request.texts)} texts, {cache_hits} cache hits, cost: ${total_cost:.6f}")
        security_metrics.record_successful_auth(claims.service_name, "batch_processing")
        
        return {
            "embeddings": all_embeddings,
            "count": len(all_embeddings),
            "model": request.model,
            "cache_hits": cache_hits,
            "total_cost_estimate": total_cost,
            "processed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/embeddings/models")
async def get_available_models(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get available embedding models and their specifications"""
    return {
        "models": EMBEDDING_MODELS,
        "default_model": DEFAULT_MODEL,
        "recommendations": {
            "cost_effective": "text-embedding-3-small",
            "high_performance": "text-embedding-3-large",
            "legacy_compatible": "text-embedding-ada-002"
        }
    }

@app.get("/api/embeddings/cache/stats") 
async def get_cache_stats(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get embedding cache statistics"""
    total_memory_mb = 0
    model_breakdown = {}
    
    for key, response in embedding_cache.items():
        model = response.model
        dimensions = response.dimensions
        memory_mb = dimensions * 4 / 1024 / 1024  # float32 = 4 bytes
        
        total_memory_mb += memory_mb
        if model not in model_breakdown:
            model_breakdown[model] = {"count": 0, "memory_mb": 0}
        model_breakdown[model]["count"] += 1
        model_breakdown[model]["memory_mb"] += memory_mb
    
    return {
        "cached_embeddings": len(embedding_cache),
        "total_memory_mb": round(total_memory_mb, 2),
        "model_breakdown": model_breakdown,
        "cache_efficiency": "high" if len(embedding_cache) > 100 else "low"
    }

@app.delete("/api/embeddings/cache")
async def clear_cache(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Clear embedding cache (admin permission required)"""
    if "admin:cache" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Admin permission required to clear cache")
    
    cleared_count = len(embedding_cache)
    embedding_cache.clear()
    logger.info(f"Cache cleared by {claims.service_name}: {cleared_count} embeddings")
    return {"success": True, "cleared_embeddings": cleared_count, "cleared_by": claims.service_name}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8009))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)