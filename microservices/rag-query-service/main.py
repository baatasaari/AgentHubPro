#!/usr/bin/env python3
"""
RAG Query Service
Ultra-focused microservice for RAG query processing only
Extracted from rag.ts query processing logic
Target: <120 lines for maximum maintainability
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

app = FastAPI(title="RAG Query Service", description="Ultra-focused RAG query processing", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class QueryRequest(BaseModel):
    query: str
    agent_id: str
    customer_id: Optional[str] = None
    industry: str
    max_chunks: int = 5
    similarity_threshold: float = 0.3

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[Dict[str, Any]]
    confidence_score: float
    response_time_ms: float

# Query cache and processing data
query_cache = {}
processed_queries = []

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "rag-query", "processed_queries": len(processed_queries)}

@app.post("/api/rag/query")
async def process_rag_query(request: QueryRequest):
    """Process RAG query and return relevant response"""
    try:
        start_time = datetime.now()
        
        # Check cache first
        cache_key = f"{request.agent_id}:{hash(request.query)}"
        if cache_key in query_cache:
            cached_response = query_cache[cache_key]
            logger.info(f"Returning cached response for query: {request.query[:50]}...")
            return cached_response
        
        # Process query
        relevant_chunks = await find_relevant_chunks(request)
        answer = await generate_answer(request.query, relevant_chunks, request.industry)
        
        # Calculate response time
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Build response
        response = QueryResponse(
            query=request.query,
            answer=answer["text"],
            sources=relevant_chunks,
            confidence_score=answer["confidence"],
            response_time_ms=round(response_time, 2)
        )
        
        # Cache the response
        query_cache[cache_key] = response.model_dump()
        
        # Record query for analytics
        processed_queries.append({
            "query": request.query,
            "agent_id": request.agent_id,
            "customer_id": request.customer_id,
            "industry": request.industry,
            "response_time_ms": response.response_time_ms,
            "confidence_score": response.confidence_score,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Processed RAG query for agent {request.agent_id} in {response_time:.2f}ms")
        return response.model_dump()
        
    except Exception as e:
        logger.error(f"RAG query processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def find_relevant_chunks(request: QueryRequest) -> List[Dict[str, Any]]:
    """Find relevant document chunks for query"""
    # Mock relevant chunks (replace with actual vector search)
    mock_chunks = [
        {
            "chunk_id": "chunk_1",
            "content": f"Information relevant to {request.query} in {request.industry} industry.",
            "source": "knowledge_base_1.pdf",
            "similarity_score": 0.85,
            "metadata": {"document_type": "faq", "industry": request.industry}
        },
        {
            "chunk_id": "chunk_2", 
            "content": f"Additional context for {request.industry} related to the query.",
            "source": "industry_guide.md",
            "similarity_score": 0.78,
            "metadata": {"document_type": "guide", "industry": request.industry}
        }
    ]
    
    # Filter by similarity threshold
    relevant_chunks = [chunk for chunk in mock_chunks 
                      if chunk["similarity_score"] >= request.similarity_threshold]
    
    return relevant_chunks[:request.max_chunks]

async def generate_answer(query: str, chunks: List[Dict[str, Any]], industry: str) -> Dict[str, Any]:
    """Generate answer from relevant chunks"""
    # Mock answer generation (replace with actual LLM call)
    if chunks:
        context = " ".join([chunk["content"] for chunk in chunks])
        answer = f"Based on the available information for {industry}: {context[:200]}..."
        confidence = 0.85
    else:
        answer = f"I don't have specific information about your query in our {industry} knowledge base."
        confidence = 0.3
    
    return {"text": answer, "confidence": confidence}

@app.get("/api/rag/query/{agent_id}/history")
async def get_query_history(agent_id: str, limit: int = 20):
    """Get query history for agent"""
    agent_queries = [q for q in processed_queries if q["agent_id"] == agent_id]
    recent_queries = agent_queries[-limit:]
    
    return {
        "agent_id": agent_id,
        "queries": recent_queries,
        "total_queries": len(agent_queries)
    }

@app.get("/api/rag/query/stats")
async def get_query_stats():
    """Get query processing statistics"""
    total_queries = len(processed_queries)
    avg_response_time = sum(q["response_time_ms"] for q in processed_queries) / total_queries if total_queries > 0 else 0
    avg_confidence = sum(q["confidence_score"] for q in processed_queries) / total_queries if total_queries > 0 else 0
    
    # Industry breakdown
    industry_stats = {}
    for query in processed_queries:
        industry = query["industry"]
        if industry not in industry_stats:
            industry_stats[industry] = 0
        industry_stats[industry] += 1
    
    return {
        "total_queries": total_queries,
        "average_response_time_ms": round(avg_response_time, 2),
        "average_confidence_score": round(avg_confidence, 3),
        "cache_hit_rate": len(query_cache) / total_queries if total_queries > 0 else 0,
        "industry_breakdown": industry_stats
    }

@app.delete("/api/rag/query/cache")
async def clear_query_cache():
    """Clear query cache"""
    cleared_count = len(query_cache)
    query_cache.clear()
    
    logger.info(f"Cleared {cleared_count} cached queries")
    return {"success": True, "cleared_cache_entries": cleared_count}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8111))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)