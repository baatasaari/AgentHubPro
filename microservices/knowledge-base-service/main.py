#!/usr/bin/env python3
"""
Knowledge Base Service
Ultra-focused microservice for knowledge base CRUD operations only
Target: <130 lines for maximum maintainability
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

app = FastAPI(title="Knowledge Base Service", description="Ultra-focused knowledge base management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class KnowledgeBase(BaseModel):
    kb_id: str
    name: str
    description: str
    customer_id: str
    industry: str
    status: str = "active"

class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

# In-memory knowledge base storage
knowledge_bases = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "knowledge-base", "total_kbs": len(knowledge_bases)}

@app.post("/api/kb/create")
async def create_knowledge_base(kb: KnowledgeBase):
    """Create a new knowledge base"""
    try:
        if kb.kb_id in knowledge_bases:
            raise HTTPException(status_code=409, detail="Knowledge base already exists")
        
        kb_data = kb.model_dump()
        kb_data["created_at"] = datetime.now().isoformat()
        kb_data["updated_at"] = datetime.now().isoformat()
        kb_data["document_count"] = 0
        
        knowledge_bases[kb.kb_id] = kb_data
        
        logger.info(f"Created knowledge base {kb.kb_id} for customer {kb.customer_id}")
        return {"success": True, "kb_id": kb.kb_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Knowledge base creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kb/{kb_id}")
async def get_knowledge_base(kb_id: str):
    """Get knowledge base details"""
    if kb_id not in knowledge_bases:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return knowledge_bases[kb_id]

@app.put("/api/kb/{kb_id}")
async def update_knowledge_base(kb_id: str, update: KnowledgeBaseUpdate):
    """Update knowledge base"""
    try:
        if kb_id not in knowledge_bases:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        kb = knowledge_bases[kb_id]
        
        if update.name:
            kb["name"] = update.name
        if update.description:
            kb["description"] = update.description
        if update.status:
            kb["status"] = update.status
        
        kb["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Updated knowledge base {kb_id}")
        return {"success": True, "kb_id": kb_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Knowledge base update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/kb/{kb_id}")
async def delete_knowledge_base(kb_id: str):
    """Delete knowledge base"""
    try:
        if kb_id not in knowledge_bases:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        del knowledge_bases[kb_id]
        
        logger.info(f"Deleted knowledge base {kb_id}")
        return {"success": True, "deleted_kb": kb_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Knowledge base deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kb/customer/{customer_id}")
async def get_customer_knowledge_bases(customer_id: str):
    """Get all knowledge bases for a customer"""
    customer_kbs = [kb for kb in knowledge_bases.values() 
                   if kb["customer_id"] == customer_id]
    
    return {
        "customer_id": customer_id,
        "knowledge_bases": customer_kbs,
        "total_kbs": len(customer_kbs)
    }

@app.get("/api/kb/industry/{industry}")
async def get_industry_knowledge_bases(industry: str):
    """Get knowledge bases by industry"""
    industry_kbs = [kb for kb in knowledge_bases.values() 
                   if kb["industry"] == industry]
    
    return {
        "industry": industry,
        "knowledge_bases": industry_kbs,
        "total_kbs": len(industry_kbs)
    }

@app.post("/api/kb/{kb_id}/documents/count")
async def update_document_count(kb_id: str, count: int):
    """Update document count for knowledge base"""
    try:
        if kb_id not in knowledge_bases:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        knowledge_bases[kb_id]["document_count"] = count
        knowledge_bases[kb_id]["updated_at"] = datetime.now().isoformat()
        
        return {"success": True, "kb_id": kb_id, "document_count": count}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document count update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kb/stats")
async def get_knowledge_base_stats():
    """Get knowledge base statistics"""
    total_kbs = len(knowledge_bases)
    active_kbs = len([kb for kb in knowledge_bases.values() if kb["status"] == "active"])
    
    return {
        "total_knowledge_bases": total_kbs,
        "active_knowledge_bases": active_kbs,
        "inactive_knowledge_bases": total_kbs - active_kbs
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8011))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)