#!/usr/bin/env python3
"""
Document Processing Service
Ultra-focused microservice for document upload and processing only
Target: <120 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import logging
from datetime import datetime
import hashlib
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Document Processing Service",
    description="Ultra-focused document upload and processing",
    version="1.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ProcessedDocument(BaseModel):
    id: str
    filename: str
    content: str
    chunks: List[str]
    metadata: Dict[str, Any]
    processed_at: str

# In-memory storage
processed_docs = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-processing", "processed_count": len(processed_docs)}

@app.post("/api/documents/process")
async def process_document(file: UploadFile = File(...)):
    """Process uploaded document into chunks"""
    try:
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Generate document ID
        doc_id = hashlib.md5(f"{file.filename}{datetime.now()}".encode()).hexdigest()
        
        # Process into chunks (simple sentence splitting)
        sentences = text_content.split('. ')
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk + sentence) < 500:
                current_chunk += sentence + ". "
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        processed_doc = ProcessedDocument(
            id=doc_id,
            filename=file.filename,
            content=text_content,
            chunks=chunks,
            metadata={"size": len(content), "type": file.content_type, "chunk_count": len(chunks)},
            processed_at=datetime.now().isoformat()
        )
        
        processed_docs[doc_id] = processed_doc.model_dump()
        logger.info(f"Processed document {file.filename} into {len(chunks)} chunks")
        
        return {"success": True, "document_id": doc_id, "chunks": len(chunks)}
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{doc_id}")
async def get_processed_document(doc_id: str):
    """Get processed document by ID"""
    if doc_id not in processed_docs:
        raise HTTPException(status_code=404, detail="Document not found")
    return processed_docs[doc_id]

@app.get("/api/documents/{doc_id}/chunks")
async def get_document_chunks(doc_id: str):
    """Get only the chunks of a processed document"""
    if doc_id not in processed_docs:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"chunks": processed_docs[doc_id]["chunks"]}

@app.delete("/api/documents/{doc_id}")
async def delete_processed_document(doc_id: str):
    """Delete processed document"""
    if doc_id not in processed_docs:
        raise HTTPException(status_code=404, detail="Document not found")
    del processed_docs[doc_id]
    return {"success": True, "deleted_document": doc_id}

@app.get("/api/documents/metrics")
async def get_processing_metrics():
    """Get processing service metrics"""
    total_chunks = sum(doc["metadata"]["chunk_count"] for doc in processed_docs.values())
    avg_chunks = total_chunks / len(processed_docs) if processed_docs else 0
    
    return {
        "processed_documents": len(processed_docs),
        "total_chunks": total_chunks,
        "average_chunks_per_doc": round(avg_chunks, 2),
        "service_status": "operational"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8008))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)