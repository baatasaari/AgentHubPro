#!/usr/bin/env python3
"""
Knowledge Management Service - Consolidated Domain Service
Combines: document-processing, embedding-generation, similarity-search, 
knowledge-base-management, faq-management, rag-query-processing

This service handles the complete RAG workflow and knowledge management operations.
Replaces 6 separate micro-services with a single, cohesive domain service.
"""

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uvicorn
import logging
from datetime import datetime
import os
import openai
import hashlib
import asyncio
import json
import numpy as np
from pathlib import Path
import tempfile
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

# Initialize OpenAI client
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found - service may fail")

openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Knowledge Management Service",
    description="Consolidated RAG and knowledge management operations",
    version="3.0.0"
)

# Add secure CORS middleware
app.add_middleware(get_secure_cors_middleware())

# Configuration
EMBEDDING_MODELS = {
    "text-embedding-3-small": {"dimensions": 1536, "cost_per_1k": 0.00002},
    "text-embedding-3-large": {"dimensions": 3072, "cost_per_1k": 0.00013},
    "text-embedding-ada-002": {"dimensions": 1536, "cost_per_1k": 0.00010}
}

DEFAULT_MODEL = "text-embedding-3-small"
SUPPORTED_DOCUMENT_TYPES = [".txt", ".pdf", ".doc", ".docx", ".md"]
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB

# In-memory storage (replace with persistent storage in production)
knowledge_base = {}
embeddings_cache = {}
documents_store = {}
faqs_store = {}

# Data Models
class EmbeddingRequest(BaseModel):
    text: str
    model: str = DEFAULT_MODEL
    dimensions: Optional[int] = None

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    model: str
    generated_at: str
    cost_estimate: float
    cache_hit: bool

class DocumentUploadRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    metadata: Dict[str, Any] = {}

class DocumentResponse(BaseModel):
    document_id: str
    title: str
    category: str
    processed_at: str
    chunk_count: int
    embedding_model: str

class SimilaritySearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    category_filter: Optional[str] = None

class SearchResult(BaseModel):
    document_id: str
    title: str
    content_chunk: str
    similarity_score: float
    metadata: Dict[str, Any]

class RAGQueryRequest(BaseModel):
    question: str
    context_limit: int = Field(default=3, ge=1, le=10)
    model: str = "gpt-4o"
    include_sources: bool = True

class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[SearchResult]
    confidence: float
    processing_time_ms: int
    cost_estimate: float

class FAQItem(BaseModel):
    question: str
    answer: str
    category: Optional[str] = "general"
    metadata: Dict[str, Any] = {}

class KnowledgeBaseStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_embeddings: int
    total_faqs: int
    categories: List[str]
    storage_size_mb: float

# Utility Functions
def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for better embedding coverage"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        if end > len(text):
            end = len(text)
        
        chunk = text[start:end]
        # Try to break at sentence boundaries
        if end < len(text):
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            
            if break_point > start + chunk_size // 2:
                chunk = text[start:break_point + 1]
                end = break_point + 1
        
        chunks.append(chunk.strip())
        start = end - overlap
        
        if start >= len(text):
            break
    
    return chunks

def calculate_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two embeddings"""
    a = np.array(embedding1)
    b = np.array(embedding2)
    
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return dot_product / (norm_a * norm_b)

async def generate_embedding(text: str, model: str = DEFAULT_MODEL) -> List[float]:
    """Generate embedding for text using OpenAI"""
    # Check cache first
    cache_key = f"{model}:{hashlib.sha256(text.encode()).hexdigest()}"
    
    if cache_key in embeddings_cache:
        return embeddings_cache[cache_key]['embedding']
    
    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: openai_client.embeddings.create(
                model=model,
                input=text
            )
        )
        
        embedding = response.data[0].embedding
        
        # Cache the result
        embeddings_cache[cache_key] = {
            'embedding': embedding,
            'model': model,
            'generated_at': datetime.now().isoformat()
        }
        
        return embedding
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

# API Endpoints

@app.get("/health")
async def health_check(request: Request):
    """Service health check with optional metrics"""
    openai_status = "unknown"
    try:
        if os.getenv("OPENAI_API_KEY"):
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
        "service": "knowledge-management-consolidated",
        "version": "3.0.0",
        "components": {
            "openai_api": openai_status,
            "embedding_cache": len(embeddings_cache),
            "knowledge_base": len(knowledge_base),
            "documents": len(documents_store),
            "faqs": len(faqs_store)
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

@app.post("/api/embeddings/generate")
async def generate_embedding_endpoint(
    request: EmbeddingRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Generate embedding for text"""
    if "embedding:generate" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Sanitize input
    sanitized_text = sanitize_input(request.text, max_length=8192)
    
    try:
        start_time = datetime.now()
        embedding = await generate_embedding(sanitized_text, request.model)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Calculate cost estimate
        token_count = len(sanitized_text.split())
        cost_estimate = (token_count / 1000) * EMBEDDING_MODELS[request.model]["cost_per_1k"]
        
        logger.info(f"Generated embedding for {claims.service_name}: {len(embedding)}D, cost: ${cost_estimate:.6f}")
        
        return EmbeddingResponse(
            embedding=embedding,
            dimensions=len(embedding),
            model=request.model,
            generated_at=start_time.isoformat(),
            cost_estimate=cost_estimate,
            cache_hit=False
        )
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(
    request: DocumentUploadRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Upload and process document for knowledge base"""
    if "knowledge:manage" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Sanitize inputs
        title = sanitize_input(request.title, max_length=200)
        content = sanitize_input(request.content, max_length=100000)
        category = sanitize_input(request.category, max_length=50)
        
        # Generate document ID
        document_id = hashlib.sha256(f"{title}:{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        
        # Chunk the document
        chunks = chunk_text(content)
        
        # Generate embeddings for all chunks
        chunk_embeddings = []
        for chunk in chunks:
            embedding = await generate_embedding(chunk)
            chunk_embeddings.append({
                'text': chunk,
                'embedding': embedding
            })
        
        # Store document
        documents_store[document_id] = {
            'title': title,
            'content': content,
            'category': category,
            'metadata': request.metadata,
            'chunks': chunk_embeddings,
            'uploaded_at': datetime.now().isoformat(),
            'uploaded_by': claims.service_name
        }
        
        # Update knowledge base index
        if category not in knowledge_base:
            knowledge_base[category] = []
        
        knowledge_base[category].append({
            'document_id': document_id,
            'title': title,
            'chunk_count': len(chunks)
        })
        
        logger.info(f"Document uploaded by {claims.service_name}: {title} ({len(chunks)} chunks)")
        
        return DocumentResponse(
            document_id=document_id,
            title=title,
            category=category,
            processed_at=datetime.now().isoformat(),
            chunk_count=len(chunks),
            embedding_model=DEFAULT_MODEL
        )
        
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/similarity")
async def similarity_search(
    request: SimilaritySearchRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Perform similarity search across knowledge base"""
    if "knowledge:search" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Sanitize query
        query = sanitize_input(request.query, max_length=1000)
        
        # Generate query embedding
        query_embedding = await generate_embedding(query)
        
        # Search across all documents
        results = []
        
        for doc_id, doc_data in documents_store.items():
            if request.category_filter and doc_data['category'] != request.category_filter:
                continue
            
            # Check similarity against all chunks
            for chunk_data in doc_data['chunks']:
                similarity = calculate_similarity(query_embedding, chunk_data['embedding'])
                
                if similarity >= request.similarity_threshold:
                    results.append(SearchResult(
                        document_id=doc_id,
                        title=doc_data['title'],
                        content_chunk=chunk_data['text'],
                        similarity_score=similarity,
                        metadata=doc_data['metadata']
                    ))
        
        # Sort by similarity and limit results
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        results = results[:request.top_k]
        
        logger.info(f"Similarity search by {claims.service_name}: {len(results)} results for '{query[:50]}'")
        
        return {
            "results": results,
            "query": query,
            "total_found": len(results),
            "search_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/query")
async def rag_query(
    request: RAGQueryRequest,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Perform RAG query with context retrieval and generation"""
    if "rag:query" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    start_time = datetime.now()
    
    try:
        # Sanitize question
        question = sanitize_input(request.question, max_length=500)
        
        # Step 1: Retrieve relevant context
        search_request = SimilaritySearchRequest(
            query=question,
            top_k=request.context_limit,
            similarity_threshold=0.6
        )
        
        # Perform similarity search
        query_embedding = await generate_embedding(question)
        context_results = []
        
        for doc_id, doc_data in documents_store.items():
            for chunk_data in doc_data['chunks']:
                similarity = calculate_similarity(query_embedding, chunk_data['embedding'])
                
                if similarity >= 0.6:
                    context_results.append(SearchResult(
                        document_id=doc_id,
                        title=doc_data['title'],
                        content_chunk=chunk_data['text'],
                        similarity_score=similarity,
                        metadata=doc_data['metadata']
                    ))
        
        context_results.sort(key=lambda x: x.similarity_score, reverse=True)
        context_results = context_results[:request.context_limit]
        
        # Step 2: Generate answer using retrieved context
        context_text = "\n\n".join([result.content_chunk for result in context_results])
        
        rag_prompt = f"""
        Based on the following context, answer the user's question accurately and concisely.
        If the context doesn't contain enough information to answer the question, say so.
        
        Context:
        {context_text}
        
        Question: {question}
        
        Answer:
        """
        
        # Generate response using OpenAI
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: openai_client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
                    {"role": "user", "content": rag_prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
        )
        
        answer = response.choices[0].message.content
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Calculate cost estimate
        total_tokens = len(rag_prompt.split()) + len(answer.split())
        cost_estimate = (total_tokens / 1000) * 0.03  # GPT-4o cost
        
        # Calculate confidence based on context relevance
        avg_similarity = sum(r.similarity_score for r in context_results) / len(context_results) if context_results else 0.0
        confidence = min(avg_similarity + 0.2, 1.0)
        
        logger.info(f"RAG query by {claims.service_name}: '{question[:50]}' -> {len(context_results)} sources, confidence: {confidence:.2f}")
        
        return RAGQueryResponse(
            answer=answer,
            sources=context_results,
            confidence=confidence,
            processing_time_ms=processing_time,
            cost_estimate=cost_estimate
        )
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/faqs/add")
async def add_faq(
    faq: FAQItem,
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Add FAQ item to knowledge base"""
    if "knowledge:manage" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Sanitize inputs
        question = sanitize_input(faq.question, max_length=500)
        answer = sanitize_input(faq.answer, max_length=2000)
        category = sanitize_input(faq.category, max_length=50)
        
        # Generate FAQ ID
        faq_id = hashlib.sha256(f"{question}:{datetime.now().isoformat()}".encode()).hexdigest()[:12]
        
        # Generate embeddings for question and answer
        question_embedding = await generate_embedding(question)
        answer_embedding = await generate_embedding(answer)
        
        # Store FAQ
        faqs_store[faq_id] = {
            'question': question,
            'answer': answer,
            'category': category,
            'metadata': faq.metadata,
            'question_embedding': question_embedding,
            'answer_embedding': answer_embedding,
            'created_at': datetime.now().isoformat(),
            'created_by': claims.service_name
        }
        
        logger.info(f"FAQ added by {claims.service_name}: '{question[:50]}'")
        
        return {
            "faq_id": faq_id,
            "question": question,
            "category": category,
            "created_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"FAQ addition failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/knowledge-base/stats")
async def get_knowledge_base_stats(
    claims: ServiceClaims = Depends(authenticate_service_request)
):
    """Get knowledge base statistics"""
    if "knowledge:read" not in claims.permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Calculate statistics
    total_chunks = sum(len(doc['chunks']) for doc in documents_store.values())
    total_embeddings = len(embeddings_cache)
    categories = list(set(doc['category'] for doc in documents_store.values()))
    
    # Estimate storage size
    storage_size_mb = (
        len(json.dumps(documents_store).encode()) + 
        len(json.dumps(embeddings_cache).encode()) + 
        len(json.dumps(faqs_store).encode())
    ) / (1024 * 1024)
    
    return KnowledgeBaseStats(
        total_documents=len(documents_store),
        total_chunks=total_chunks,
        total_embeddings=total_embeddings,
        total_faqs=len(faqs_store),
        categories=categories,
        storage_size_mb=round(storage_size_mb, 2)
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)