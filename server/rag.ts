/**
 * RAG (Retrieval-Augmented Generation) System for AgentHub Platform
 * TypeScript implementation integrated with Express.js server
 */

import OpenAI from "openai";
import { Request, Response } from "express";

// Interfaces
interface Document {
  id: string;
  content: string;
  title: string;
  docType: 'text' | 'pdf' | 'webpage' | 'faq' | 'knowledge_base' | 'company_docs';
  source: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
  agentId?: string;
  industry?: string;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
}

interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  document: Document;
}

interface RAGConfig {
  openaiApiKey: string;
  embeddingModel: string;
  completionModel: string;
  chunkSize: number;
  chunkOverlap: number;
  maxChunksPerQuery: number;
  similarityThreshold: number;
}

class VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private documents: Map<string, Document> = new Map();

  addChunk(chunk: DocumentChunk): void {
    this.chunks.set(chunk.id, chunk);
    if (chunk.embedding) {
      this.embeddings.set(chunk.id, chunk.embedding);
    }
  }

  addDocument(document: Document): void {
    this.documents.set(document.id, document);
  }

  search(queryEmbedding: number[], topK: number = 5, threshold: number = 0.7): Array<{id: string, score: number}> {
    const results: Array<{id: string, score: number}> = [];
    
    this.embeddings.forEach((embedding, chunkId) => {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      if (similarity >= threshold) {
        results.push({ id: chunkId, score: similarity });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  getChunk(chunkId: string): DocumentChunk | undefined {
    return this.chunks.get(chunkId);
  }

  getDocument(documentId: string): Document | undefined {
    return this.documents.get(documentId);
  }

  getChunksByAgent(agentId: string): DocumentChunk[] {
    return Array.from(this.chunks.values()).filter(
      chunk => chunk.metadata.agentId === agentId
    );
  }

  getStats(): { documents: number; chunks: number; embeddings: number } {
    return {
      documents: this.documents.size,
      chunks: this.chunks.size,
      embeddings: this.embeddings.size
    };
  }
}

class RAGSystem {
  private config: RAGConfig;
  private vectorStore: VectorStore;
  private openai: OpenAI;

  constructor() {
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      embeddingModel: 'text-embedding-3-small',
      completionModel: 'gpt-3.5-turbo',
      chunkSize: 1000,
      chunkOverlap: 200,
      maxChunksPerQuery: 5,
      similarityThreshold: 0.3
    };

    this.vectorStore = new VectorStore();
    this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData(): Promise<void> {
    const sampleDocs: Document[] = [
      {
        id: 'healthcare_faq_1',
        content: `
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
        `,
        title: 'Healthcare FAQ',
        docType: 'faq',
        source: 'healthcare_knowledge_base',
        metadata: { category: 'general_info' },
        createdAt: new Date(),
        industry: 'healthcare'
      },
      {
        id: 'retail_policies_1',
        content: `
          Store Policies and Procedures:
          
          Return Policy: Items can be returned within 30 days of purchase with original receipt. Items must be in original condition.
          
          Exchange Policy: Exchanges are accepted for size or color variations within 14 days of purchase.
          
          Price Matching: We match competitor prices on identical items. Price match requires proof of competitor pricing.
          
          Shipping Information: Standard shipping takes 3-5 business days. Express shipping available for next-day delivery.
          
          Customer Service Hours: Our customer service team is available Monday through Sunday from 7:00 AM to 11:00 PM EST.
          
          Loyalty Program: Join our rewards program to earn points on every purchase and receive exclusive offers.
        `,
        title: 'Retail Policies',
        docType: 'company_docs',
        source: 'retail_knowledge_base',
        metadata: { category: 'policies' },
        createdAt: new Date(),
        industry: 'retail'
      },
      {
        id: 'real_estate_guide_1',
        content: `
          Home Buying Process Guide:
          
          1. Pre-approval: Get pre-approved for a mortgage to understand your budget and show sellers you're serious.
          
          2. House Hunting: Work with your agent to find properties that meet your criteria and budget.
          
          3. Making an Offer: Your agent will help you make competitive offers and negotiate terms.
          
          4. Home Inspection: Hire a professional inspector to identify any potential issues with the property.
          
          5. Appraisal: Your lender will order an appraisal to ensure the home's value matches the loan amount.
          
          6. Final Walkthrough: Inspect the property one final time before closing.
          
          7. Closing: Sign all necessary documents and receive the keys to your new home.
          
          Market Trends: The current market shows steady growth in suburban areas with increased demand for home offices.
        `,
        title: 'Home Buying Guide',
        docType: 'knowledge_base',
        source: 'real_estate_knowledge_base',
        metadata: { category: 'buying_guide' },
        createdAt: new Date(),
        industry: 'realestate'
      }
    ];

    for (const doc of sampleDocs) {
      await this.addDocument(doc);
    }
  }

  private chunkDocument(document: Document): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = document.content;
    const chunkSize = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      let end = start + chunkSize;
      let chunkContent = content.slice(start, end);

      // Try to break at word boundary
      if (end < content.length && !content[end].match(/\s/)) {
        const lastSpace = chunkContent.lastIndexOf(' ');
        if (lastSpace > chunkSize * 0.8) {
          end = start + lastSpace;
          chunkContent = content.slice(start, end);
        }
      }

      const chunk: DocumentChunk = {
        id: `${document.id}_chunk_${chunkIndex}`,
        documentId: document.id,
        content: chunkContent.trim(),
        chunkIndex,
        metadata: {
          agentId: document.agentId,
          industry: document.industry,
          docType: document.docType,
          source: document.source,
          title: document.title
        },
        createdAt: new Date()
      };

      chunks.push(chunk);
      start = end - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (!this.config.openaiApiKey) {
      console.warn('OpenAI API key not available. Skipping embedding generation.');
      return chunks;
    }

    for (const chunk of chunks) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.embeddingModel,
          input: chunk.content
        });
        chunk.embedding = response.data[0].embedding;
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
      }
    }

    return chunks;
  }

  async addDocument(document: Document): Promise<boolean> {
    try {
      // Process document into chunks
      const chunks = this.chunkDocument(document);
      
      // Generate embeddings
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      
      // Store in vector store
      this.vectorStore.addDocument(document);
      for (const chunk of chunksWithEmbeddings) {
        this.vectorStore.addChunk(chunk);
      }

      console.log(`Added document ${document.id} with ${chunks.length} chunks`);
      return true;
    } catch (error) {
      console.error(`Failed to add document ${document.id}:`, error);
      return false;
    }
  }

  async search(query: string, agentId?: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.config.openaiApiKey) {
      console.warn('OpenAI API key not available. Cannot perform search.');
      return [];
    }

    try {
      // Generate query embedding
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: query
      });
      const queryEmbedding = response.data[0].embedding;

      // Search vector store
      const chunkResults = this.vectorStore.search(
        queryEmbedding,
        topK,
        this.config.similarityThreshold
      );

      // Convert to SearchResult objects
      const searchResults: SearchResult[] = [];
      for (const { id: chunkId, score } of chunkResults) {
        const chunk = this.vectorStore.getChunk(chunkId);
        const document = chunk ? this.vectorStore.getDocument(chunk.documentId) : undefined;

        if (chunk && document) {
          // Filter by agent if specified
          if (agentId && chunk.metadata.agentId !== agentId) {
            continue;
          }

          searchResults.push({
            chunk,
            score,
            document
          });
        }
      }

      console.log(`Found ${searchResults.length} relevant chunks for query: ${query.slice(0, 50)}...`);
      return searchResults;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async generateResponse(query: string, context: SearchResult[], agentId?: string): Promise<string> {
    if (!this.config.openaiApiKey) {
      return "I'm sorry, but I cannot access additional information right now. Please try again later.";
    }

    // Build context from search results
    let contextText = "";
    for (const result of context) {
      contextText += `Source: ${result.document.title}\n`;
      contextText += `Content: ${result.chunk.content}\n\n`;
    }

    // Create system prompt
    const systemPrompt = `You are a helpful AI assistant. Use the provided context to answer the user's question accurately and helpfully.

Context Information:
${contextText}

Instructions:
- Answer based on the provided context when relevant
- If context doesn't contain relevant information, provide a general helpful response
- Be concise and professional
- Mention sources when referencing specific information`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.completionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
    } catch (error) {
      console.error('Response generation failed:', error);
      return "I apologize, but I encountered an error while processing your request. Please try again.";
    }
  }

  async query(query: string, agentId?: string): Promise<any> {
    // Search for relevant context
    const searchResults = await this.search(query, agentId);
    
    // Generate response with context
    const response = await this.generateResponse(query, searchResults, agentId);

    return {
      query,
      response,
      sources: searchResults.map(result => ({
        title: result.document.title,
        source: result.document.source,
        relevance_score: result.score,
        content_preview: result.chunk.content.slice(0, 200) + "..."
      })),
      agent_id: agentId,
      timestamp: new Date().toISOString()
    };
  }

  getStats(): any {
    const storeStats = this.vectorStore.getStats();
    return {
      total_documents: storeStats.documents,
      total_chunks: storeStats.chunks,
      embedding_model: this.config.embeddingModel,
      completion_model: this.config.completionModel,
      openai_available: !!this.config.openaiApiKey,
      configuration: {
        chunk_size: this.config.chunkSize,
        chunk_overlap: this.config.chunkOverlap,
        max_chunks_per_query: this.config.maxChunksPerQuery,
        similarity_threshold: this.config.similarityThreshold
      }
    };
  }
}

// Global RAG instance
const ragSystem = new RAGSystem();

// Express route handlers
export const ragRoutes = {
  // Health check
  health: (req: Request, res: Response) => {
    const stats = ragSystem.getStats();
    res.json({
      status: 'healthy',
      service: 'rag',
      documents: stats.total_documents,
      chunks: stats.total_chunks,
      openai_available: stats.openai_available,
      environment: 'development',
      storage_type: 'memory'
    });
  },

  // Get stats
  stats: (req: Request, res: Response) => {
    res.json(ragSystem.getStats());
  },

  // Query RAG system
  query: async (req: Request, res: Response) => {
    try {
      const { query, agent_id } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await ragSystem.query(query, agent_id);
      res.json(result);
    } catch (error) {
      console.error('RAG query failed:', error);
      res.status(500).json({ error: 'RAG query failed' });
    }
  },

  // Search documents
  search: async (req: Request, res: Response) => {
    try {
      const { query, agent_id, top_k = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const results = await ragSystem.search(query, agent_id, top_k);
      
      res.json({
        query,
        results: results.map(result => ({
          chunk_id: result.chunk.id,
          content: result.chunk.content,
          document_title: result.document.title,
          document_source: result.document.source,
          relevance_score: result.score,
          metadata: result.chunk.metadata
        })),
        total_results: results.length,
        agent_id
      });
    } catch (error) {
      console.error('Search failed:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  },

  // Add document
  addDocument: async (req: Request, res: Response) => {
    try {
      const { title, content, doc_type = 'text', source, metadata = {}, agent_id, industry } = req.body;
      
      if (!title || !content || !source) {
        return res.status(400).json({ error: 'Title, content, and source are required' });
      }

      const document: Document = {
        id: `doc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        content,
        title,
        docType: doc_type as any,
        source,
        metadata,
        createdAt: new Date(),
        agentId: agent_id,
        industry
      };

      const success = await ragSystem.addDocument(document);
      
      if (success) {
        res.json({
          message: 'Document added successfully',
          document_id: document.id,
          agent_id
        });
      } else {
        res.status(500).json({ error: 'Failed to add document' });
      }
    } catch (error) {
      console.error('Failed to add document:', error);
      res.status(500).json({ error: 'Document creation failed' });
    }
  }
};

export default ragSystem;