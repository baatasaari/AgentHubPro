#!/usr/bin/env python3
"""
Embedding Generation Service
Ultra-focused microservice for generating embeddings only
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import logging
from datetime import datetime
import numpy as np
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Embedding Generation Service",
    description="Ultra-focused embedding generation",
    version="1.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class EmbeddingRequest(BaseModel):
    text: str
    model: str = "text-embedding-3-small"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    model: str
    generated_at: str

# Embedding cache
embedding_cache = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-generation", "cached_embeddings": len(embedding_cache)}

@app.post("/api/embeddings/generate")
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for text"""
    try:
        # Check cache first
        cache_key = f"{request.model}:{hash(request.text)}"
        if cache_key in embedding_cache:
            logger.info(f"Returning cached embedding for text length {len(request.text)}")
            return embedding_cache[cache_key]
        
        # Generate embedding (mock implementation - replace with actual OpenAI call)
        # For demo purposes, using random embedding
        dimensions = 1536 if "3-small" in request.model else 1024
        embedding = np.random.normal(0, 1, dimensions).tolist()
        
        response = EmbeddingResponse(
            embedding=embedding,
            dimensions=dimensions,
            model=request.model,
            generated_at=datetime.now().isoformat()
        )
        
        # Cache the result
        embedding_cache[cache_key] = response
        logger.info(f"Generated {dimensions}D embedding for text length {len(request.text)}")
        
        return response
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embeddings/batch")
async def generate_batch_embeddings(texts: List[str], model: str = "text-embedding-3-small"):
    """Generate embeddings for multiple texts"""
    try:
        embeddings = []
        for text in texts:
            request = EmbeddingRequest(text=text, model=model)
            embedding_response = await generate_embedding(request)
            embeddings.append(embedding_response.embedding)
        
        return {"embeddings": embeddings, "count": len(embeddings), "model": model}
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/embeddings/cache/stats")
async def get_cache_stats():
    """Get embedding cache statistics"""
    return {
        "cached_embeddings": len(embedding_cache),
        "cache_hit_potential": "high" if len(embedding_cache) > 100 else "low",
        "memory_usage_estimate": f"{len(embedding_cache) * 1536 * 4 / 1024 / 1024:.2f}MB"
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