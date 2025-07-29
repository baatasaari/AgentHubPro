#!/usr/bin/env python3
"""
RAG Service for AgentHub Platform
Microservice providing Retrieval-Augmented Generation capabilities
"""

import sys
import os
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

# Add shared directory to path
sys.path.append(str(Path(__file__).parent.parent / "shared"))

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Import RAG system
from rag_system import RAGSystem, Document, DocumentType, ChunkStrategy
from config_manager import ConfigManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize configuration
config = ConfigManager("rag")

# FastAPI app
app = FastAPI(
    title="RAG Service",
    description="Retrieval-Augmented Generation service for AgentHub platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system
rag_system = RAGSystem()

# Pydantic models
class DocumentCreateRequest(BaseModel):
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content")
    doc_type: DocumentType = Field(default=DocumentType.TEXT, description="Document type")
    source: str = Field(..., description="Document source")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    agent_id: Optional[str] = Field(None, description="Associated agent ID")
    industry: Optional[str] = Field(None, description="Industry context")

class QueryRequest(BaseModel):
    query: str = Field(..., description="Search query")
    agent_id: Optional[str] = Field(None, description="Agent ID for filtering")
    top_k: Optional[int] = Field(5, description="Number of results to return")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    agent_id: Optional[str] = Field(None, description="Agent ID for filtering")
    top_k: Optional[int] = Field(5, description="Number of results to return")

class DocumentResponse(BaseModel):
    id: str
    title: str
    doc_type: str
    source: str
    agent_id: Optional[str]
    industry: Optional[str]
    created_at: str
    chunk_count: int

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    stats = rag_system.get_stats()
    return {
        "status": "healthy",
        "service": "rag",
        "documents": stats["total_documents"],
        "chunks": stats["total_chunks"],
        "openai_available": stats["openai_available"],
        "environment": config.get_environment().value,
        "storage_type": "memory"
    }

# Configuration endpoints
@app.get("/api/config/status")
async def get_config_status():
    """Get configuration status"""
    stats = rag_system.get_stats()
    return {
        "service": "rag",
        "environment": config.get_environment().value,
        "storage_type": "memory",
        "config_loaded": True,
        "rag_configuration": stats["configuration"],
        "openai_available": stats["openai_available"],
        "features_enabled": len([f for f in config.get_feature_flags().values() if f])
    }

@app.post("/api/config/reload")
async def reload_configuration():
    """Reload configuration"""
    try:
        config.reload_config()
        return {
            "status": "success",
            "message": "Configuration reloaded successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Configuration reload failed: {str(e)}")

# Document management
@app.post("/api/documents", response_model=DocumentResponse)
async def create_document(doc_request: DocumentCreateRequest):
    """Add a new document to the RAG system"""
    try:
        # Create document
        document = Document(
            id=f"doc_{int(datetime.now().timestamp())}_{hash(doc_request.content) % 10000}",
            content=doc_request.content,
            title=doc_request.title,
            doc_type=doc_request.doc_type,
            source=doc_request.source,
            metadata=doc_request.metadata,
            created_at=datetime.now(),
            agent_id=doc_request.agent_id,
            industry=doc_request.industry
        )
        
        # Add to RAG system
        success = await rag_system.add_document(document)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add document to RAG system")
        
        # Count chunks
        chunks = rag_system.vector_store.get_chunks_by_agent(doc_request.agent_id) if doc_request.agent_id else []
        doc_chunks = [c for c in chunks if c.document_id == document.id]
        
        return DocumentResponse(
            id=document.id,
            title=document.title,
            doc_type=document.doc_type.value,
            source=document.source,
            agent_id=document.agent_id,
            industry=document.industry,
            created_at=document.created_at.isoformat(),
            chunk_count=len(doc_chunks)
        )
        
    except Exception as e:
        logger.error(f"Failed to create document: {e}")
        raise HTTPException(status_code=500, detail=f"Document creation failed: {str(e)}")

@app.get("/api/documents")
async def list_documents(
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    industry: Optional[str] = Query(None, description="Filter by industry")
):
    """List all documents"""
    documents = []
    
    for doc in rag_system.vector_store.documents.values():
        # Apply filters
        if agent_id and doc.agent_id != agent_id:
            continue
        if industry and doc.industry != industry:
            continue
        
        # Count chunks for this document
        doc_chunks = [c for c in rag_system.vector_store.chunks.values() if c.document_id == doc.id]
        
        documents.append(DocumentResponse(
            id=doc.id,
            title=doc.title,
            doc_type=doc.doc_type.value,
            source=doc.source,
            agent_id=doc.agent_id,
            industry=doc.industry,
            created_at=doc.created_at.isoformat(),
            chunk_count=len(doc_chunks)
        ))
    
    return documents

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its chunks"""
    try:
        # Remove document
        if document_id in rag_system.vector_store.documents:
            del rag_system.vector_store.documents[document_id]
        
        # Remove associated chunks
        chunks_to_remove = [chunk_id for chunk_id, chunk in rag_system.vector_store.chunks.items() 
                           if chunk.document_id == document_id]
        
        for chunk_id in chunks_to_remove:
            if chunk_id in rag_system.vector_store.chunks:
                del rag_system.vector_store.chunks[chunk_id]
            if chunk_id in rag_system.vector_store.embeddings:
                del rag_system.vector_store.embeddings[chunk_id]
        
        return {
            "status": "success",
            "message": f"Document {document_id} deleted successfully",
            "chunks_removed": len(chunks_to_remove)
        }
        
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Document deletion failed: {str(e)}")

# Search and query endpoints
@app.post("/api/search")
async def search_documents(search_request: SearchRequest):
    """Search for relevant document chunks"""
    try:
        results = await rag_system.search(
            query=search_request.query,
            agent_id=search_request.agent_id,
            top_k=search_request.top_k
        )
        
        return {
            "query": search_request.query,
            "results": [
                {
                    "chunk_id": result.chunk.id,
                    "content": result.chunk.content,
                    "document_title": result.document.title,
                    "document_source": result.document.source,
                    "relevance_score": result.score,
                    "metadata": result.chunk.metadata
                }
                for result in results
            ],
            "total_results": len(results),
            "agent_id": search_request.agent_id
        }
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/api/query")
async def query_rag_system(query_request: QueryRequest):
    """Complete RAG query with generated response"""
    try:
        result = await rag_system.query(
            query=query_request.query,
            agent_id=query_request.agent_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

# Analytics and stats
@app.get("/api/stats")
async def get_rag_stats():
    """Get RAG system statistics"""
    return rag_system.get_stats()

@app.get("/api/documents/{document_id}/chunks")
async def get_document_chunks(document_id: str):
    """Get all chunks for a specific document"""
    chunks = [
        {
            "id": chunk.id,
            "content": chunk.content,
            "chunk_index": chunk.chunk_index,
            "has_embedding": chunk.embedding is not None,
            "metadata": chunk.metadata,
            "created_at": chunk.created_at.isoformat()
        }
        for chunk in rag_system.vector_store.chunks.values()
        if chunk.document_id == document_id
    ]
    
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found or has no chunks")
    
    return {
        "document_id": document_id,
        "chunks": chunks,
        "total_chunks": len(chunks)
    }

# Agent-specific endpoints
@app.get("/api/agents/{agent_id}/knowledge")
async def get_agent_knowledge(agent_id: str):
    """Get knowledge base for a specific agent"""
    documents = [doc for doc in rag_system.vector_store.documents.values() 
                if doc.agent_id == agent_id]
    
    chunks = rag_system.vector_store.get_chunks_by_agent(agent_id)
    
    return {
        "agent_id": agent_id,
        "documents": len(documents),
        "chunks": len(chunks),
        "knowledge_base": [
            {
                "id": doc.id,
                "title": doc.title,
                "doc_type": doc.doc_type.value,
                "source": doc.source,
                "industry": doc.industry,
                "chunk_count": len([c for c in chunks if c.document_id == doc.id])
            }
            for doc in documents
        ]
    }

@app.post("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, query_request: QueryRequest):
    """Chat with an agent using RAG capabilities"""
    # Override agent_id from URL
    query_request.agent_id = agent_id
    
    try:
        result = await rag_system.query(
            query=query_request.query,
            agent_id=agent_id
        )
        
        return {
            **result,
            "agent_id": agent_id,
            "rag_enhanced": len(result["sources"]) > 0
        }
        
    except Exception as e:
        logger.error(f"Agent chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent chat failed: {str(e)}")

# Bulk operations
@app.post("/api/documents/bulk")
async def bulk_create_documents(documents: List[DocumentCreateRequest]):
    """Create multiple documents at once"""
    results = []
    errors = []
    
    for i, doc_request in enumerate(documents):
        try:
            # Create document
            document = Document(
                id=f"bulk_doc_{i}_{int(datetime.now().timestamp())}_{ hash(doc_request.content) % 10000}",
                content=doc_request.content,
                title=doc_request.title,
                doc_type=doc_request.doc_type,
                source=doc_request.source,
                metadata=doc_request.metadata,
                created_at=datetime.now(),
                agent_id=doc_request.agent_id,
                industry=doc_request.industry
            )
            
            # Add to RAG system
            success = await rag_system.add_document(document)
            
            if success:
                results.append({
                    "index": i,
                    "document_id": document.id,
                    "status": "success"
                })
            else:
                errors.append({
                    "index": i,
                    "error": "Failed to add to RAG system"
                })
                
        except Exception as e:
            errors.append({
                "index": i,
                "error": str(e)
            })
    
    return {
        "total_requested": len(documents),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors
    }

if __name__ == "__main__":
    port = int(os.getenv("RAG_SERVICE_PORT", 8008))
    logger.info(f"Starting RAG Service on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)