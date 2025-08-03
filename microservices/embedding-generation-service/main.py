#!/usr/bin/env python3
"""
Embedding Generation Service - Production Ready
Real OpenAI embedding generation with configurable parameters
Replaces mock implementation with actual AI models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime
import os
import openai
import hashlib
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found - service may fail")

openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Production Embedding Generation Service",
    description="Real AI-powered embedding generation using OpenAI models",
    version="2.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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
    dimensions: Optional[int] = None  # For custom dimension reduction
    
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
async def health_check():
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
    
    return {
        "status": "healthy", 
        "service": "embedding-generation-production", 
        "cached_embeddings": len(embedding_cache),
        "openai_status": openai_status,
        "supported_models": list(EMBEDDING_MODELS.keys()),
        "version": "2.0.0"
    }

@app.post("/api/embeddings/generate")
async def generate_embedding(request: EmbeddingRequest):
    """Generate real AI embedding using OpenAI"""
    try:
        # Validate model
        if request.model not in EMBEDDING_MODELS:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported model. Available: {list(EMBEDDING_MODELS.keys())}"
            )
        
        # Create cache key
        text_hash = hashlib.sha256(request.text.encode()).hexdigest()
        cache_key = f"{request.model}:{text_hash}"
        
        # Check cache first
        if cache_key in embedding_cache:
            cached_response = embedding_cache[cache_key]
            cached_response.cache_hit = True
            logger.info(f"Cache hit for text length {len(request.text)}")
            return cached_response
        
        # Validate text input
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(request.text) > 8192:  # OpenAI token limit
            raise HTTPException(status_code=400, detail="Text too long (max 8192 tokens)")
        
        logger.info(f"Generating embedding for text length {len(request.text)} using {request.model}")
        
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
            
        except openai.RateLimitError:
            logger.error("OpenAI rate limit exceeded")
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        except openai.APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise HTTPException(status_code=503, detail=f"OpenAI API error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/api/embeddings/batch")
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts efficiently"""
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > request.max_batch_size:
            raise HTTPException(
                status_code=400, 
                detail=f"Too many texts. Max batch size: {request.max_batch_size}"
            )
        
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
        
        logger.info(f"Batch processed: {len(request.texts)} texts, {cache_hits} cache hits, cost: ${total_cost:.6f}")
        
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
async def get_available_models():
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
async def get_cache_stats():
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
async def clear_cache():
    """Clear embedding cache"""
    cleared_count = len(embedding_cache)
    embedding_cache.clear()
    return {"success": True, "cleared_embeddings": cleared_count}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8009))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)