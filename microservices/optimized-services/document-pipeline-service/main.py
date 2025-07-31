#!/usr/bin/env python3
"""
Optimized Document Pipeline Service
Consolidates document processing, embedding generation, and similarity search
Target: 60% latency reduction through service consolidation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import asyncio
import numpy as np
from typing import List, Dict, Any
import openai
import uvicorn
import logging
from datetime import datetime
import hashlib
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Document Pipeline Service", description="Optimized document processing pipeline", version="2.0.0")

class DocumentRequest(BaseModel):
    content: str
    document_type: str = "text"
    customer_id: str
    
class SearchRequest(BaseModel):
    query: str
    customer_id: str
    max_results: int = 5
    threshold: float = 0.7

class DocumentPipeline:
    def __init__(self):
        self.embeddings_cache = {}  # In-memory cache for embeddings
        self.documents_store = {}   # Document storage
        self.similarity_index = {}  # Similarity search index
        
    async def process_document_pipeline(self, request: DocumentRequest) -> Dict[str, Any]:
        """Optimized pipeline: process -> embed -> index in single operation"""
        start_time = datetime.now()
        
        try:
            # Step 1: Document processing (chunking and cleaning)
            chunks = await self._process_document(request.content, request.document_type)
            
            # Step 2: Generate embeddings for all chunks in batch
            embeddings = await self._generate_embeddings_batch(chunks)
            
            # Step 3: Index for similarity search
            document_id = await self._index_document(request.customer_id, chunks, embeddings)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "document_id": document_id,
                "chunks_processed": len(chunks),
                "embeddings_generated": len(embeddings),
                "processing_time_ms": processing_time * 1000,
                "indexed": True
            }
            
        except Exception as e:
            logger.error(f"Pipeline processing failed: {e}")
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    async def _process_document(self, content: str, doc_type: str) -> List[str]:
        """Optimized document processing with intelligent chunking"""
        if doc_type == "text":
            # Smart chunking based on sentences and paragraphs
            sentences = content.split('. ')
            chunks = []
            current_chunk = ""
            
            for sentence in sentences:
                if len(current_chunk + sentence) < 500:  # Optimal chunk size
                    current_chunk += sentence + ". "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = sentence + ". "
            
            if current_chunk:
                chunks.append(current_chunk.strip())
                
            return chunks
        
        return [content]  # Fallback for other types
    
    async def _generate_embeddings_batch(self, chunks: List[str]) -> List[List[float]]:
        """Optimized batch embedding generation"""
        embeddings = []
        
        # Check cache first
        cached_embeddings = []
        uncached_chunks = []
        
        for chunk in chunks:
            chunk_hash = hashlib.md5(chunk.encode()).hexdigest()
            if chunk_hash in self.embeddings_cache:
                cached_embeddings.append(self.embeddings_cache[chunk_hash])
            else:
                uncached_chunks.append((chunk, chunk_hash))
        
        # Generate embeddings for uncached chunks in batch
        if uncached_chunks:
            try:
                # Simulate OpenAI embedding generation (optimized batch processing)
                batch_texts = [chunk[0] for chunk in uncached_chunks]
                
                # In production, use actual OpenAI batch API
                # response = await openai.Embedding.acreate(input=batch_texts, model="text-embedding-ada-002")
                
                # Simulated embeddings for now
                new_embeddings = []
                for text in batch_texts:
                    # Generate deterministic embeddings for testing
                    embedding = [hash(text + str(i)) % 1000 / 1000.0 for i in range(1536)]
                    new_embeddings.append(embedding)
                
                # Cache new embeddings
                for (chunk, chunk_hash), embedding in zip(uncached_chunks, new_embeddings):
                    self.embeddings_cache[chunk_hash] = embedding
                    embeddings.append(embedding)
                
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}")
                raise
        
        # Combine cached and new embeddings
        all_embeddings = cached_embeddings + embeddings
        return all_embeddings
    
    async def _index_document(self, customer_id: str, chunks: List[str], embeddings: List[List[float]]) -> str:
        """Optimized document indexing for similarity search"""
        document_id = f"doc_{customer_id}_{datetime.now().timestamp()}"
        
        # Store document
        self.documents_store[document_id] = {
            "customer_id": customer_id,
            "chunks": chunks,
            "embeddings": embeddings,
            "created_at": datetime.now().isoformat()
        }
        
        # Index for similarity search
        if customer_id not in self.similarity_index:
            self.similarity_index[customer_id] = []
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            self.similarity_index[customer_id].append({
                "document_id": document_id,
                "chunk_index": i,
                "chunk_text": chunk,
                "embedding": embedding
            })
        
        return document_id
    
    async def similarity_search(self, request: SearchRequest) -> List[Dict[str, Any]]:
        """Optimized similarity search with caching"""
        start_time = datetime.now()
        
        try:
            # Generate query embedding
            query_embedding = await self._generate_embeddings_batch([request.query])
            query_vector = query_embedding[0]
            
            # Search customer's documents
            if request.customer_id not in self.similarity_index:
                return []
            
            customer_chunks = self.similarity_index[request.customer_id]
            results = []
            
            for chunk_data in customer_chunks:
                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_vector, chunk_data["embedding"])
                
                if similarity >= request.threshold:
                    results.append({
                        "document_id": chunk_data["document_id"],
                        "chunk_text": chunk_data["chunk_text"],
                        "similarity_score": similarity
                    })
            
            # Sort by similarity and limit results
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            results = results[:request.max_results]
            
            search_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Similarity search completed in {search_time:.3f}s, found {len(results)} results")
            
            return results
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Optimized cosine similarity calculation"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(a * a for a in vec2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0
        
        return dot_product / (magnitude1 * magnitude2)

# Initialize pipeline
pipeline = DocumentPipeline()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "document-pipeline-optimized",
        "cached_embeddings": len(pipeline.embeddings_cache),
        "indexed_documents": len(pipeline.documents_store)
    }

@app.post("/api/documents/process")
async def process_document(request: DocumentRequest):
    """Process document through optimized pipeline"""
    return await pipeline.process_document_pipeline(request)

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), customer_id: str = "default"):
    """Upload and process document file"""
    try:
        content = await file.read()
        text_content = content.decode('utf-8')
        
        request = DocumentRequest(
            content=text_content,
            document_type="text",
            customer_id=customer_id
        )
        
        return await pipeline.process_document_pipeline(request)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File processing failed: {str(e)}")

@app.post("/api/search/similarity")
async def search_similar(request: SearchRequest):
    """Perform optimized similarity search"""
    return await pipeline.similarity_search(request)

@app.get("/api/documents/stats/{customer_id}")
async def get_customer_stats(customer_id: str):
    """Get document statistics for customer"""
    customer_docs = [doc for doc in pipeline.documents_store.values() if doc["customer_id"] == customer_id]
    customer_chunks = len(pipeline.similarity_index.get(customer_id, []))
    
    return {
        "customer_id": customer_id,
        "total_documents": len(customer_docs),
        "total_chunks": customer_chunks,
        "cache_hit_rate": len(pipeline.embeddings_cache) / max(customer_chunks, 1)
    }

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete document and its index entries"""
    if document_id in pipeline.documents_store:
        doc_data = pipeline.documents_store[document_id]
        customer_id = doc_data["customer_id"]
        
        # Remove from store
        del pipeline.documents_store[document_id]
        
        # Remove from index
        if customer_id in pipeline.similarity_index:
            pipeline.similarity_index[customer_id] = [
                chunk for chunk in pipeline.similarity_index[customer_id]
                if chunk["document_id"] != document_id
            ]
        
        return {"message": "Document deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Document not found")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8200))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)