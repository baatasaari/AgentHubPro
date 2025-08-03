// Persistent RAG Implementation for AgentHub Platform
// Replaces transient in-memory vector storage with production-ready persistence

import OpenAI from 'openai';
import { distributedCache, CacheTTL } from './distributed-cache.js';
import { persistentStorage } from './persistent-storage.js';
import config from './config.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface DocumentChunk {
  id: string;
  customerId: string;
  agentId?: number;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    documentId: string;
    createdAt: Date;
  };
}

interface Document {
  id: string;
  customerId: string;
  agentId?: number;
  filename: string;
  content: string;
  chunks: string[]; // chunk IDs
  metadata: {
    size: number;
    type: string;
    uploadedAt: Date;
  };
}

interface KnowledgeBase {
  customerId: string;
  agentId?: number;
  documents: Map<string, Document>;
  chunks: Map<string, DocumentChunk>;
  configuration: {
    enabledSources: ('file_upload' | 'faq' | 'database' | 'manual' | 'website_scrape')[];
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
    chunkSize: number;
    chunkOverlap: number;
  };
}

// Persistent vector store implementation
export class PersistentVectorStore {
  private openai: OpenAI;
  private storageBase: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.storageBase = config.storage.vectorStore.basePath || './vector-storage';
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageBase, { recursive: true });
      await fs.mkdir(path.join(this.storageBase, 'documents'), { recursive: true });
      await fs.mkdir(path.join(this.storageBase, 'chunks'), { recursive: true });
      await fs.mkdir(path.join(this.storageBase, 'embeddings'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize vector storage:', error);
    }
  }

  private getDocumentPath(customerId: string, documentId: string): string {
    return path.join(this.storageBase, 'documents', `${customerId}_${documentId}.json`);
  }

  private getChunkPath(customerId: string, chunkId: string): string {
    return path.join(this.storageBase, 'chunks', `${customerId}_${chunkId}.json`);
  }

  private getEmbeddingPath(customerId: string, chunkId: string): string {
    return path.join(this.storageBase, 'embeddings', `${customerId}_${chunkId}.bin`);
  }

  // Document operations
  async addDocument(document: Document): Promise<void> {
    try {
      // Save document metadata
      const docPath = this.getDocumentPath(document.customerId, document.id);
      await fs.writeFile(docPath, JSON.stringify(document, null, 2));

      // Cache document for faster access
      await distributedCache.set(
        `document:${document.customerId}:${document.id}`,
        document,
        CacheTTL.LONG
      );

      console.log(`Document ${document.id} saved for customer ${document.customerId}`);
    } catch (error) {
      console.error(`Failed to save document ${document.id}:`, error);
      throw error;
    }
  }

  async getDocument(customerId: string, documentId: string): Promise<Document | null> {
    try {
      // Try cache first
      const cached = await distributedCache.get<Document>(`document:${customerId}:${documentId}`);
      if (cached) return cached;

      // Load from persistent storage
      const docPath = this.getDocumentPath(customerId, documentId);
      const docData = await fs.readFile(docPath, 'utf-8');
      const document = JSON.parse(docData) as Document;

      // Cache for future requests
      await distributedCache.set(
        `document:${customerId}:${documentId}`,
        document,
        CacheTTL.LONG
      );

      return document;
    } catch (error) {
      console.error(`Failed to load document ${documentId}:`, error);
      return null;
    }
  }

  async deleteDocument(customerId: string, documentId: string): Promise<boolean> {
    try {
      const document = await this.getDocument(customerId, documentId);
      if (!document) return false;

      // Delete all chunks for this document
      for (const chunkId of document.chunks) {
        await this.deleteChunk(customerId, chunkId);
      }

      // Delete document file
      const docPath = this.getDocumentPath(customerId, documentId);
      await fs.unlink(docPath);

      // Remove from cache
      await distributedCache.delete(`document:${customerId}:${documentId}`);

      console.log(`Document ${documentId} deleted for customer ${customerId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete document ${documentId}:`, error);
      return false;
    }
  }

  // Chunk operations
  async addChunk(chunk: DocumentChunk): Promise<void> {
    try {
      // Save chunk metadata
      const chunkPath = this.getChunkPath(chunk.customerId, chunk.id);
      await fs.writeFile(chunkPath, JSON.stringify(chunk, null, 2));

      // Save embedding separately for efficient similarity search
      if (chunk.embedding) {
        await this.saveEmbedding(chunk.customerId, chunk.id, chunk.embedding);
      }

      // Cache chunk for faster access
      await distributedCache.set(
        `chunk:${chunk.customerId}:${chunk.id}`,
        chunk,
        CacheTTL.LONG
      );

      console.log(`Chunk ${chunk.id} saved for customer ${chunk.customerId}`);
    } catch (error) {
      console.error(`Failed to save chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  async getChunk(customerId: string, chunkId: string): Promise<DocumentChunk | null> {
    try {
      // Try cache first
      const cached = await distributedCache.get<DocumentChunk>(`chunk:${customerId}:${chunkId}`);
      if (cached) return cached;

      // Load from persistent storage
      const chunkPath = this.getChunkPath(customerId, chunkId);
      const chunkData = await fs.readFile(chunkPath, 'utf-8');
      const chunk = JSON.parse(chunkData) as DocumentChunk;

      // Load embedding if exists
      const embedding = await this.loadEmbedding(customerId, chunkId);
      if (embedding) {
        chunk.embedding = embedding;
      }

      // Cache for future requests
      await distributedCache.set(
        `chunk:${customerId}:${chunkId}`,
        chunk,
        CacheTTL.LONG
      );

      return chunk;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkId}:`, error);
      return null;
    }
  }

  async deleteChunk(customerId: string, chunkId: string): Promise<boolean> {
    try {
      // Delete chunk file
      const chunkPath = this.getChunkPath(customerId, chunkId);
      await fs.unlink(chunkPath);

      // Delete embedding file
      const embeddingPath = this.getEmbeddingPath(customerId, chunkId);
      try {
        await fs.unlink(embeddingPath);
      } catch (error) {
        // Embedding file might not exist, ignore error
      }

      // Remove from cache
      await distributedCache.delete(`chunk:${customerId}:${chunkId}`);

      return true;
    } catch (error) {
      console.error(`Failed to delete chunk ${chunkId}:`, error);
      return false;
    }
  }

  // Embedding operations
  private async saveEmbedding(customerId: string, chunkId: string, embedding: number[]): Promise<void> {
    const embeddingPath = this.getEmbeddingPath(customerId, chunkId);
    const buffer = Buffer.from(new Float32Array(embedding).buffer);
    await fs.writeFile(embeddingPath, buffer);
  }

  private async loadEmbedding(customerId: string, chunkId: string): Promise<number[] | null> {
    try {
      const embeddingPath = this.getEmbeddingPath(customerId, chunkId);
      const buffer = await fs.readFile(embeddingPath);
      const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
      return Array.from(float32Array);
    } catch (error) {
      return null;
    }
  }

  // Vector similarity search
  async search(
    customerId: string,
    queryEmbedding: number[],
    options: {
      topK?: number;
      threshold?: number;
      agentId?: number;
      filters?: Record<string, any>;
    } = {}
  ): Promise<Array<{ id: string; score: number; chunk: DocumentChunk }>> {
    const { topK = 5, threshold = 0.7, agentId, filters } = options;

    try {
      // Get all chunks for the customer
      const chunks = await this.getAllChunks(customerId);
      
      // Filter by agent if specified
      const filteredChunks = agentId 
        ? chunks.filter(chunk => chunk.agentId === agentId)
        : chunks;

      // Apply additional filters
      const finalChunks = filters 
        ? filteredChunks.filter(chunk => this.matchesFilters(chunk, filters))
        : filteredChunks;

      // Calculate similarities
      const results: Array<{ id: string; score: number; chunk: DocumentChunk }> = [];

      for (const chunk of finalChunks) {
        if (!chunk.embedding) continue;

        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        if (similarity >= threshold) {
          results.push({ id: chunk.id, score: similarity, chunk });
        }
      }

      // Sort by similarity and return top K
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error(`Vector search failed for customer ${customerId}:`, error);
      return [];
    }
  }

  private async getAllChunks(customerId: string): Promise<DocumentChunk[]> {
    try {
      const chunksDir = path.join(this.storageBase, 'chunks');
      const files = await fs.readdir(chunksDir);
      
      const customerFiles = files.filter(file => 
        file.startsWith(`${customerId}_`) && file.endsWith('.json')
      );

      const chunks: DocumentChunk[] = [];
      for (const file of customerFiles) {
        const chunkId = file.replace(`${customerId}_`, '').replace('.json', '');
        const chunk = await this.getChunk(customerId, chunkId);
        if (chunk) chunks.push(chunk);
      }

      return chunks;
    } catch (error) {
      console.error(`Failed to load chunks for customer ${customerId}:`, error);
      return [];
    }
  }

  private matchesFilters(chunk: DocumentChunk, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (key in chunk.metadata) {
        if (chunk.metadata[key as keyof typeof chunk.metadata] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Embedding generation with caching
  async generateEmbedding(text: string): Promise<number[]> {
    // Create hash for caching
    const textHash = crypto.createHash('sha256').update(text).digest('hex');
    
    // Try cache first
    const cached = await distributedCache.getEmbedding(textHash);
    if (cached) return cached;

    try {
      const response = await this.openai.embeddings.create({
        model: config.ai.embeddingModel || 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data[0].embedding;
      
      // Cache the embedding
      await distributedCache.setEmbedding(textHash, embedding, CacheTTL.WEEKLY);
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }
}

// Persistent RAG service that replaces the in-memory implementation
export class PersistentRAGService {
  private vectorStore: PersistentVectorStore;
  private openai: OpenAI;

  constructor() {
    this.vectorStore = new PersistentVectorStore();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Document processing with persistent storage
  async processDocument(
    customerId: string,
    filename: string,
    content: string,
    agentId?: number
  ): Promise<string> {
    try {
      const documentId = crypto.randomUUID();
      const chunks = await this.chunkDocument(content);
      const chunkIds: string[] = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = crypto.randomUUID();
        const chunkContent = chunks[i];
        
        // Generate embedding
        const embedding = await this.vectorStore.generateEmbedding(chunkContent);
        
        // Create chunk object
        const chunk: DocumentChunk = {
          id: chunkId,
          customerId,
          agentId,
          content: chunkContent,
          embedding,
          metadata: {
            source: filename,
            chunkIndex: i,
            documentId,
            createdAt: new Date()
          }
        };

        await this.vectorStore.addChunk(chunk);
        chunkIds.push(chunkId);
      }

      // Create document object
      const document: Document = {
        id: documentId,
        customerId,
        agentId,
        filename,
        content,
        chunks: chunkIds,
        metadata: {
          size: content.length,
          type: 'text',
          uploadedAt: new Date()
        }
      };

      await this.vectorStore.addDocument(document);

      // Invalidate cached knowledge base
      await distributedCache.invalidateKnowledgeBase(customerId);

      console.log(`Document ${filename} processed with ${chunks.length} chunks`);
      return documentId;
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  // RAG query with persistent vector search
  async queryKnowledgeBase(
    customerId: string,
    query: string,
    options: {
      agentId?: number;
      maxResults?: number;
      confidenceThreshold?: number;
    } = {}
  ): Promise<{
    answer: string;
    sources: Array<{ content: string; source: string; confidence: number }>;
    context: string[];
  }> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.vectorStore.generateEmbedding(query);

      // Search for relevant chunks
      const searchResults = await this.vectorStore.search(customerId, queryEmbedding, {
        topK: options.maxResults || 5,
        threshold: options.confidenceThreshold || 0.7,
        agentId: options.agentId
      });

      if (searchResults.length === 0) {
        return {
          answer: "I don't have enough information in my knowledge base to answer that question.",
          sources: [],
          context: []
        };
      }

      // Extract context from search results
      const context = searchResults.map(result => result.chunk.content);
      const sources = searchResults.map(result => ({
        content: result.chunk.content,
        source: result.chunk.metadata.source,
        confidence: result.score
      }));

      // Generate answer using context
      const contextText = context.join('\n\n');
      const answer = await this.generateAnswer(query, contextText);

      return { answer, sources, context };
    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }

  private async chunkDocument(content: string, chunkSize: number = 1000, overlap: number = 200): Promise<string[]> {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.trim().length;
      
      if (currentSize + sentenceLength > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 6)); // Approximate word overlap
        currentChunk = overlapWords.join(' ') + ' ';
        currentSize = currentChunk.length;
      }
      
      currentChunk += sentence.trim() + '. ';
      currentSize += sentenceLength + 2;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async generateAnswer(query: string, context: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: config.ai.completionModel || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Answer the user's question based only on the provided context. 
                   If the context doesn't contain enough information to answer the question, say so clearly.
                   Be concise and accurate.`
        },
        {
          role: 'user',
          content: `Context: ${context}\n\nQuestion: ${query}\n\nAnswer:`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || "I couldn't generate an answer based on the available information.";
  }

  // Knowledge base management
  async deleteCustomerKnowledgeBase(customerId: string): Promise<boolean> {
    try {
      const chunks = await this.vectorStore['getAllChunks'](customerId);
      
      // Delete all chunks and their embeddings
      for (const chunk of chunks) {
        await this.vectorStore.deleteChunk(customerId, chunk.id);
      }

      // Invalidate cache
      await distributedCache.invalidateKnowledgeBase(customerId);

      console.log(`Knowledge base deleted for customer ${customerId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete knowledge base for customer ${customerId}:`, error);
      return false;
    }
  }

  async getKnowledgeBaseStats(customerId: string): Promise<{
    documentCount: number;
    chunkCount: number;
    totalSize: number;
  }> {
    try {
      const chunks = await this.vectorStore['getAllChunks'](customerId);
      const documentIds = new Set(chunks.map(chunk => chunk.metadata.documentId));
      
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);

      return {
        documentCount: documentIds.size,
        chunkCount: chunks.length,
        totalSize
      };
    } catch (error) {
      console.error(`Failed to get knowledge base stats for customer ${customerId}:`, error);
      return { documentCount: 0, chunkCount: 0, totalSize: 0 };
    }
  }
}

// Create and export the persistent RAG service
export const persistentRAG = new PersistentRAGService();