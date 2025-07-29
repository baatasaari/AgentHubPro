#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) System for AgentHub Platform
Comprehensive RAG implementation with OpenAI embeddings and vector search
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path
import hashlib
import numpy as np
from enum import Enum

# OpenAI integration
try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Vector similarity
try:
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger(__name__)

class DocumentType(str, Enum):
    TEXT = "text"
    PDF = "pdf"
    WEBPAGE = "webpage"
    FAQ = "faq"
    KNOWLEDGE_BASE = "knowledge_base"
    COMPANY_DOCS = "company_docs"

class ChunkStrategy(str, Enum):
    FIXED_SIZE = "fixed_size"
    SEMANTIC = "semantic"
    PARAGRAPH = "paragraph"
    SENTENCE = "sentence"

@dataclass
class Document:
    """Document representation for RAG system"""
    id: str
    content: str
    title: str
    doc_type: DocumentType
    source: str
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None
    agent_id: Optional[str] = None  # Associated agent
    industry: Optional[str] = None  # Industry context

@dataclass
class DocumentChunk:
    """Document chunk for vector storage"""
    id: str
    document_id: str
    content: str
    chunk_index: int
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = None
    created_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.metadata is None:
            self.metadata = {}

@dataclass
class SearchResult:
    """Search result with relevance score"""
    chunk: DocumentChunk
    score: float
    document: Document

class RAGConfig:
    """Configuration for RAG system"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.embedding_model = "text-embedding-3-small"  # Cost-effective embedding model
        self.completion_model = "gpt-3.5-turbo"  # Default model for responses
        self.chunk_size = 1000  # Characters per chunk
        self.chunk_overlap = 200  # Overlap between chunks
        self.max_chunks_per_query = 5  # Top chunks to retrieve
        self.similarity_threshold = 0.7  # Minimum similarity score
        self.enable_caching = True
        self.cache_ttl = 3600  # 1 hour cache
        
        # Validate configuration
        if not self.openai_api_key:
            logger.warning("OpenAI API key not found. RAG functionality will be limited.")

class VectorStore:
    """In-memory vector store for development (production would use specialized vector DB)"""
    
    def __init__(self):
        self.chunks: Dict[str, DocumentChunk] = {}
        self.embeddings: Dict[str, np.ndarray] = {}
        self.documents: Dict[str, Document] = {}
    
    def add_chunk(self, chunk: DocumentChunk):
        """Add chunk to vector store"""
        self.chunks[chunk.id] = chunk
        if chunk.embedding:
            self.embeddings[chunk.id] = np.array(chunk.embedding)
    
    def add_document(self, document: Document):
        """Add document to store"""
        self.documents[document.id] = document
    
    def search(self, query_embedding: List[float], top_k: int = 5, threshold: float = 0.7) -> List[Tuple[str, float]]:
        """Search for similar chunks"""
        if not self.embeddings:
            return []
        
        query_vec = np.array(query_embedding).reshape(1, -1)
        results = []
        
        for chunk_id, embedding in self.embeddings.items():
            similarity = cosine_similarity(query_vec, embedding.reshape(1, -1))[0][0]
            if similarity >= threshold:
                results.append((chunk_id, similarity))
        
        # Sort by similarity and return top k
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    def get_chunk(self, chunk_id: str) -> Optional[DocumentChunk]:
        """Get chunk by ID"""
        return self.chunks.get(chunk_id)
    
    def get_document(self, document_id: str) -> Optional[Document]:
        """Get document by ID"""
        return self.documents.get(document_id)
    
    def get_chunks_by_agent(self, agent_id: str) -> List[DocumentChunk]:
        """Get all chunks for a specific agent"""
        return [chunk for chunk in self.chunks.values() 
                if chunk.metadata.get("agent_id") == agent_id]

class DocumentProcessor:
    """Process documents for RAG system"""
    
    def __init__(self, config: RAGConfig):
        self.config = config
        self.client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None
    
    def chunk_document(self, document: Document, strategy: ChunkStrategy = ChunkStrategy.FIXED_SIZE) -> List[DocumentChunk]:
        """Split document into chunks"""
        chunks = []
        
        if strategy == ChunkStrategy.FIXED_SIZE:
            chunks = self._fixed_size_chunking(document)
        elif strategy == ChunkStrategy.PARAGRAPH:
            chunks = self._paragraph_chunking(document)
        elif strategy == ChunkStrategy.SENTENCE:
            chunks = self._sentence_chunking(document)
        else:
            chunks = self._fixed_size_chunking(document)  # Default fallback
        
        return chunks
    
    def _fixed_size_chunking(self, document: Document) -> List[DocumentChunk]:
        """Split document into fixed-size chunks"""
        chunks = []
        content = document.content
        chunk_size = self.config.chunk_size
        overlap = self.config.chunk_overlap
        
        start = 0
        chunk_index = 0
        
        while start < len(content):
            end = start + chunk_size
            chunk_content = content[start:end]
            
            # Try to break at word boundary
            if end < len(content) and not content[end].isspace():
                last_space = chunk_content.rfind(' ')
                if last_space > chunk_size * 0.8:  # At least 80% of chunk size
                    end = start + last_space
                    chunk_content = content[start:end]
            
            chunk_id = f"{document.id}_chunk_{chunk_index}"
            chunk = DocumentChunk(
                id=chunk_id,
                document_id=document.id,
                content=chunk_content.strip(),
                chunk_index=chunk_index,
                metadata={
                    "agent_id": document.agent_id,
                    "industry": document.industry,
                    "doc_type": document.doc_type,
                    "source": document.source,
                    "title": document.title
                }
            )
            chunks.append(chunk)
            
            start = end - overlap if overlap > 0 else end
            chunk_index += 1
        
        return chunks
    
    def _paragraph_chunking(self, document: Document) -> List[DocumentChunk]:
        """Split document by paragraphs"""
        paragraphs = [p.strip() for p in document.content.split('\n\n') if p.strip()]
        chunks = []
        
        for i, paragraph in enumerate(paragraphs):
            if len(paragraph) > 50:  # Minimum paragraph length
                chunk_id = f"{document.id}_para_{i}"
                chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=document.id,
                    content=paragraph,
                    chunk_index=i,
                    metadata={
                        "agent_id": document.agent_id,
                        "industry": document.industry,
                        "doc_type": document.doc_type,
                        "source": document.source,
                        "title": document.title
                    }
                )
                chunks.append(chunk)
        
        return chunks
    
    def _sentence_chunking(self, document: Document) -> List[DocumentChunk]:
        """Split document by sentences (simple implementation)"""
        sentences = [s.strip() for s in document.content.split('.') if s.strip()]
        chunks = []
        current_chunk = ""
        chunk_index = 0
        
        for sentence in sentences:
            if len(current_chunk + sentence) < self.config.chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunk_id = f"{document.id}_sent_{chunk_index}"
                    chunk = DocumentChunk(
                        id=chunk_id,
                        document_id=document.id,
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        metadata={
                            "agent_id": document.agent_id,
                            "industry": document.industry,
                            "doc_type": document.doc_type,
                            "source": document.source,
                            "title": document.title
                        }
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                current_chunk = sentence + ". "
        
        # Add final chunk
        if current_chunk:
            chunk_id = f"{document.id}_sent_{chunk_index}"
            chunk = DocumentChunk(
                id=chunk_id,
                document_id=document.id,
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                metadata={
                    "agent_id": document.agent_id,
                    "industry": document.industry,
                    "doc_type": document.doc_type,
                    "source": document.source,
                    "title": document.title
                }
            )
            chunks.append(chunk)
        
        return chunks
    
    async def generate_embeddings(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """Generate embeddings for document chunks"""
        if not self.client:
            logger.warning("OpenAI client not available. Skipping embedding generation.")
            return chunks
        
        for chunk in chunks:
            try:
                response = self.client.embeddings.create(
                    model=self.config.embedding_model,
                    input=chunk.content
                )
                chunk.embedding = response.data[0].embedding
                logger.debug(f"Generated embedding for chunk {chunk.id}")
            except Exception as e:
                logger.error(f"Failed to generate embedding for chunk {chunk.id}: {e}")
        
        return chunks

class RAGSystem:
    """Main RAG system orchestrator"""
    
    def __init__(self, config: RAGConfig = None):
        self.config = config or RAGConfig()
        self.vector_store = VectorStore()
        self.processor = DocumentProcessor(self.config)
        self.client = OpenAI(api_key=self.config.openai_api_key) if self.config.openai_api_key else None
        
        # Initialize with sample knowledge base
        asyncio.create_task(self._initialize_sample_data())
    
    async def _initialize_sample_data(self):
        """Initialize system with sample knowledge base"""
        sample_docs = [
            Document(
                id="healthcare_faq_1",
                content="""
                Frequently Asked Questions about Healthcare Services:
                
                Q: What are your operating hours?
                A: Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM.
                
                Q: How do I schedule an appointment?
                A: You can schedule an appointment by calling our main number, using our online portal, or through our mobile app.
                
                Q: What insurance plans do you accept?
                A: We accept most major insurance plans including Blue Cross Blue Shield, Aetna, Cigna, and Medicare.
                
                Q: What should I bring to my appointment?
                A: Please bring a valid ID, insurance card, list of current medications, and any relevant medical records.
                
                Q: Do you offer telehealth services?
                A: Yes, we offer virtual consultations for certain types of appointments. Please ask when scheduling.
                """,
                title="Healthcare FAQ",
                doc_type=DocumentType.FAQ,
                source="healthcare_knowledge_base",
                metadata={"category": "general_info"},
                created_at=datetime.now(),
                industry="healthcare"
            ),
            Document(
                id="retail_policies_1",
                content="""
                Store Policies and Procedures:
                
                Return Policy: Items can be returned within 30 days of purchase with original receipt. Items must be in original condition.
                
                Exchange Policy: Exchanges are accepted for size or color variations within 14 days of purchase.
                
                Price Matching: We match competitor prices on identical items. Price match requires proof of competitor pricing.
                
                Shipping Information: Standard shipping takes 3-5 business days. Express shipping available for next-day delivery.
                
                Customer Service Hours: Our customer service team is available Monday through Sunday from 7:00 AM to 11:00 PM EST.
                
                Loyalty Program: Join our rewards program to earn points on every purchase and receive exclusive offers.
                """,
                title="Retail Policies",
                doc_type=DocumentType.COMPANY_DOCS,
                source="retail_knowledge_base",
                metadata={"category": "policies"},
                created_at=datetime.now(),
                industry="retail"
            ),
            Document(
                id="real_estate_guide_1",
                content="""
                Home Buying Process Guide:
                
                1. Pre-approval: Get pre-approved for a mortgage to understand your budget and show sellers you're serious.
                
                2. House Hunting: Work with your agent to find properties that meet your criteria and budget.
                
                3. Making an Offer: Your agent will help you make competitive offers and negotiate terms.
                
                4. Home Inspection: Hire a professional inspector to identify any potential issues with the property.
                
                5. Appraisal: Your lender will order an appraisal to ensure the home's value matches the loan amount.
                
                6. Final Walkthrough: Inspect the property one final time before closing.
                
                7. Closing: Sign all necessary documents and receive the keys to your new home.
                
                Market Trends: The current market shows steady growth in suburban areas with increased demand for home offices.
                """,
                title="Home Buying Guide",
                doc_type=DocumentType.KNOWLEDGE_BASE,
                source="real_estate_knowledge_base",
                metadata={"category": "buying_guide"},
                created_at=datetime.now(),
                industry="realestate"
            )
        ]
        
        for doc in sample_docs:
            await self.add_document(doc)
    
    async def add_document(self, document: Document) -> bool:
        """Add document to RAG system"""
        try:
            # Process document into chunks
            chunks = self.processor.chunk_document(document)
            
            # Generate embeddings
            chunks_with_embeddings = await self.processor.generate_embeddings(chunks)
            
            # Store in vector store
            self.vector_store.add_document(document)
            for chunk in chunks_with_embeddings:
                self.vector_store.add_chunk(chunk)
            
            logger.info(f"Added document {document.id} with {len(chunks)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document {document.id}: {e}")
            return False
    
    async def search(self, query: str, agent_id: str = None, top_k: int = None) -> List[SearchResult]:
        """Search for relevant documents"""
        if not self.client:
            logger.warning("OpenAI client not available. Cannot perform search.")
            return []
        
        top_k = top_k or self.config.max_chunks_per_query
        
        try:
            # Generate query embedding
            response = self.client.embeddings.create(
                model=self.config.embedding_model,
                input=query
            )
            query_embedding = response.data[0].embedding
            
            # Search vector store
            chunk_results = self.vector_store.search(
                query_embedding, 
                top_k=top_k, 
                threshold=self.config.similarity_threshold
            )
            
            # Convert to SearchResult objects
            search_results = []
            for chunk_id, score in chunk_results:
                chunk = self.vector_store.get_chunk(chunk_id)
                document = self.vector_store.get_document(chunk.document_id)
                
                # Filter by agent if specified
                if agent_id and chunk.metadata.get("agent_id") != agent_id:
                    continue
                
                search_result = SearchResult(
                    chunk=chunk,
                    score=score,
                    document=document
                )
                search_results.append(search_result)
            
            logger.info(f"Found {len(search_results)} relevant chunks for query: {query[:50]}...")
            return search_results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    async def generate_response(self, query: str, context: List[SearchResult], agent_id: str = None) -> str:
        """Generate RAG-enhanced response"""
        if not self.client:
            return "I'm sorry, but I cannot access additional information right now. Please try again later."
        
        # Build context from search results
        context_text = ""
        for result in context:
            context_text += f"Source: {result.document.title}\n"
            context_text += f"Content: {result.chunk.content}\n\n"
        
        # Create system prompt
        system_prompt = f"""You are a helpful AI assistant. Use the provided context to answer the user's question accurately and helpfully.

Context Information:
{context_text}

Instructions:
- Answer based on the provided context when relevant
- If context doesn't contain relevant information, provide a general helpful response
- Be concise and professional
- Mention sources when referencing specific information
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.config.completion_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return "I apologize, but I encountered an error while processing your request. Please try again."
    
    async def query(self, query: str, agent_id: str = None) -> Dict[str, Any]:
        """Complete RAG query pipeline"""
        # Search for relevant context
        search_results = await self.search(query, agent_id)
        
        # Generate response with context
        response = await self.generate_response(query, search_results, agent_id)
        
        return {
            "query": query,
            "response": response,
            "sources": [
                {
                    "title": result.document.title,
                    "source": result.document.source,
                    "relevance_score": result.score,
                    "content_preview": result.chunk.content[:200] + "..."
                }
                for result in search_results
            ],
            "agent_id": agent_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        return {
            "total_documents": len(self.vector_store.documents),
            "total_chunks": len(self.vector_store.chunks),
            "embedding_model": self.config.embedding_model,
            "completion_model": self.config.completion_model,
            "openai_available": bool(self.client),
            "configuration": {
                "chunk_size": self.config.chunk_size,
                "chunk_overlap": self.config.chunk_overlap,
                "max_chunks_per_query": self.config.max_chunks_per_query,
                "similarity_threshold": self.config.similarity_threshold
            }
        }

# Global RAG system instance
rag_system = RAGSystem()