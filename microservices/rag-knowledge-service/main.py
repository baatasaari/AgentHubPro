#!/usr/bin/env python3
"""
RAG Knowledge Service
Microservice for all RAG and knowledge management functionality
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG Knowledge Service",
    description="Centralized RAG and knowledge management for AgentHub platform",
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

class RAGDocument(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class RAGQuery(BaseModel):
    query: str
    customer_id: Optional[str] = None
    agent_id: Optional[str] = None
    platform: Optional[str] = None
    max_results: int = Field(default=5, ge=1, le=20)

class RAGResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    relevance_score: float
    query_id: str

class CustomerConfiguration(BaseModel):
    customer_id: str
    agent_configurations: List[Dict[str, Any]]
    global_settings: Dict[str, Any]

# === In-Memory Storage ===
knowledge_bases = {}
customer_configs = {}
industry_knowledge = {}

# === Service Health ===

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "rag-knowledge-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "knowledge_bases": len(knowledge_bases),
        "customer_configs": len(customer_configs)
    }

# === RAG Core Operations ===

@app.post("/api/rag/documents")
async def add_document(document: RAGDocument):
    """Add a document to the knowledge base"""
    try:
        knowledge_bases[document.id] = document.model_dump()
        logger.info(f"Added document {document.id} to knowledge base")
        return {"success": True, "document_id": document.id}
    except Exception as e:
        logger.error(f"Failed to add document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/query")
async def query_knowledge_base(query: RAGQuery):
    """Query the knowledge base"""
    try:
        # Simulate RAG processing
        query_id = f"query_{len(knowledge_bases)}_{datetime.now().timestamp()}"
        
        # Simple keyword matching for demo (replace with actual embedding search)
        relevant_docs = []
        for doc_id, doc in knowledge_bases.items():
            if any(word.lower() in doc['content'].lower() for word in query.query.split()):
                relevant_docs.append({
                    "content": doc['content'][:200] + "...",
                    "metadata": doc['metadata'],
                    "relevance_score": 0.8
                })
        
        response = f"Based on the knowledge base, here's what I found regarding '{query.query}'"
        if relevant_docs:
            response += f". Found {len(relevant_docs)} relevant documents."
        else:
            response = "I couldn't find relevant information in the knowledge base."
        
        return RAGResponse(
            response=response,
            sources=relevant_docs[:query.max_results],
            relevance_score=0.8 if relevant_docs else 0.0,
            query_id=query_id
        )
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Customer-Specific RAG ===

@app.post("/api/rag/customer/configure")
async def configure_customer_rag(config: CustomerConfiguration):
    """Configure RAG for specific customer"""
    try:
        customer_configs[config.customer_id] = config.model_dump()
        logger.info(f"Configured RAG for customer {config.customer_id}")
        return {"success": True, "customer_id": config.customer_id}
    except Exception as e:
        logger.error(f"Customer configuration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/customer/{customer_id}/status")
async def get_customer_rag_status(customer_id: str):
    """Get RAG status for specific customer"""
    try:
        if customer_id not in customer_configs:
            return {"configured": False, "customer_id": customer_id}
        
        config = customer_configs[customer_id]
        return {
            "configured": True,
            "customer_id": customer_id,
            "agent_count": len(config.get('agent_configurations', [])),
            "last_updated": config.get('updated_at', 'unknown')
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Admin Operations ===

@app.get("/api/rag/admin/overview")
async def get_admin_overview():
    """Get admin overview of all RAG configurations"""
    try:
        return {
            "total_knowledge_bases": len(knowledge_bases),
            "total_customers": len(customer_configs),
            "total_documents": sum(1 for kb in knowledge_bases.values()),
            "service_status": "operational",
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Admin overview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/rag/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document from knowledge base"""
    try:
        if document_id in knowledge_bases:
            del knowledge_bases[document_id]
            logger.info(f"Deleted document {document_id}")
            return {"success": True, "deleted_document": document_id}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Industry Knowledge ===

@app.get("/api/rag/industry/{industry}/knowledge")
async def get_industry_knowledge(industry: str):
    """Get industry-specific knowledge"""
    try:
        if industry not in industry_knowledge:
            # Initialize with sample industry knowledge
            industry_knowledge[industry] = {
                "industry": industry,
                "knowledge_areas": ["general", "regulations", "best_practices"],
                "documents": [],
                "last_updated": datetime.now().isoformat()
            }
        
        return industry_knowledge[industry]
    except Exception as e:
        logger.error(f"Industry knowledge retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Metrics and Monitoring ===

@app.get("/api/rag/metrics")
async def get_service_metrics():
    """Get service performance metrics"""
    try:
        return {
            "knowledge_base_size": len(knowledge_bases),
            "customer_count": len(customer_configs),
            "industry_coverage": len(industry_knowledge),
            "service_uptime": "100%",
            "average_query_time": "250ms",
            "last_query": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === Service Discovery ===

@app.get("/api/rag/service-info")
async def get_service_info():
    """Get service information for discovery"""
    return {
        "service_name": "rag-knowledge-service",
        "version": "1.0.0",
        "port": 8008,
        "endpoints": [
            "/api/rag/documents",
            "/api/rag/query", 
            "/api/rag/customer/configure",
            "/api/rag/admin/overview",
            "/api/rag/industry/{industry}/knowledge"
        ],
        "dependencies": ["openai-api", "bigquery"],
        "status": "operational"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8008))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )