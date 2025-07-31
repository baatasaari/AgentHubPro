#!/usr/bin/env python3
"""
FAQ Management Service
Ultra-focused microservice for FAQ operations only
Target: <90 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FAQ Management Service", description="Ultra-focused FAQ management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class FAQ(BaseModel):
    faq_id: str
    question: str
    answer: str
    category: str
    priority: int = 1
    kb_id: str

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None

# In-memory FAQ storage
faqs = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "faq-management", "total_faqs": len(faqs)}

@app.post("/api/faqs/create")
async def create_faq(faq: FAQ):
    """Create a new FAQ"""
    try:
        if faq.faq_id in faqs:
            raise HTTPException(status_code=409, detail="FAQ already exists")
        
        faq_data = faq.model_dump()
        faq_data["created_at"] = datetime.now().isoformat()
        
        faqs[faq.faq_id] = faq_data
        
        logger.info(f"Created FAQ {faq.faq_id} in category {faq.category}")
        return {"success": True, "faq_id": faq.faq_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FAQ creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faqs/{faq_id}")
async def get_faq(faq_id: str):
    """Get FAQ details"""
    if faq_id not in faqs:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return faqs[faq_id]

@app.put("/api/faqs/{faq_id}")
async def update_faq(faq_id: str, update: FAQUpdate):
    """Update FAQ"""
    try:
        if faq_id not in faqs:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        faq = faqs[faq_id]
        
        if update.question:
            faq["question"] = update.question
        if update.answer:
            faq["answer"] = update.answer
        if update.category:
            faq["category"] = update.category
        if update.priority:
            faq["priority"] = update.priority
        
        logger.info(f"Updated FAQ {faq_id}")
        return {"success": True, "faq_id": faq_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FAQ update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/faqs/{faq_id}")
async def delete_faq(faq_id: str):
    """Delete FAQ"""
    if faq_id not in faqs:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    del faqs[faq_id]
    return {"success": True, "deleted_faq": faq_id}

@app.get("/api/faqs/kb/{kb_id}")
async def get_faqs_by_knowledge_base(kb_id: str):
    """Get FAQs for a knowledge base"""
    kb_faqs = [faq for faq in faqs.values() if faq["kb_id"] == kb_id]
    kb_faqs.sort(key=lambda x: x["priority"], reverse=True)
    
    return {"kb_id": kb_id, "faqs": kb_faqs, "total_faqs": len(kb_faqs)}

@app.get("/api/faqs/category/{category}")
async def get_faqs_by_category(category: str):
    """Get FAQs by category"""
    category_faqs = [faq for faq in faqs.values() if faq["category"] == category]
    
    return {"category": category, "faqs": category_faqs, "total_faqs": len(category_faqs)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8013))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)