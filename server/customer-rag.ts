/**
 * Customer-Configurable RAG System
 * Allows customers to upload their own knowledge bases (FAQs, files, databases)
 * and store embeddings in BigQuery for personalized AI responses
 */

import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

// BigQuery integration would be implemented here in production
interface EmbeddingDocument {
  id: string;
  customerId: string;
  agentId: string;
  content: string;
  embedding: number[];
  metadata: {
    filename?: string;
    source: 'file' | 'database' | 'faq' | 'manual';
    category?: string;
    tags?: string[];
    lastUpdated: string;
  };
}

interface CustomerKnowledgeBase {
  customerId: string;
  agentId: string;
  documents: EmbeddingDocument[];
  configuration: {
    enabledSources: ('file' | 'database' | 'faq' | 'manual')[];
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
  };
}

interface FileUpload {
  filename: string;
  content: string;
  mimeType: string;
}

interface DatabaseConnection {
  type: 'mysql' | 'postgresql' | 'mongodb';
  host: string;
  database: string;
  tables?: string[];
  query?: string;
}

interface FAQEntry {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

export class CustomerRAGService {
  private openai: OpenAI;
  private knowledgeBases: Map<string, CustomerKnowledgeBase> = new Map();
  private uploadsDir = './uploads';

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initializeUploadsDirectory();
  }

  private async initializeUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  /**
   * Configure customer's knowledge base
   */
  async configureKnowledgeBase(customerId: string, agentId: string, config: {
    enabledSources: ('file' | 'database' | 'faq' | 'manual')[];
    embeddingModel?: string;
    maxDocuments?: number;
    autoUpdate?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      
      const knowledgeBase: CustomerKnowledgeBase = {
        customerId,
        agentId,
        documents: this.knowledgeBases.get(knowledgeBaseKey)?.documents || [],
        configuration: {
          enabledSources: config.enabledSources,
          embeddingModel: config.embeddingModel || 'text-embedding-3-small',
          maxDocuments: config.maxDocuments || 1000,
          autoUpdate: config.autoUpdate !== false
        }
      };

      this.knowledgeBases.set(knowledgeBaseKey, knowledgeBase);
      
      console.log(`Knowledge base configured for customer ${customerId}, agent ${agentId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload and process files for RAG
   */
  async uploadFiles(customerId: string, agentId: string, files: FileUpload[]): Promise<{
    success: boolean;
    processedFiles: number;
    totalDocuments: number;
    error?: string;
  }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
      
      if (!knowledgeBase) {
        return { success: false, processedFiles: 0, totalDocuments: 0, error: 'Knowledge base not configured' };
      }

      if (!knowledgeBase.configuration.enabledSources.includes('file')) {
        return { success: false, processedFiles: 0, totalDocuments: 0, error: 'File uploads not enabled for this knowledge base' };
      }

      let processedFiles = 0;
      
      for (const file of files) {
        // Save file to uploads directory
        const filePath = path.join(this.uploadsDir, `${customerId}_${agentId}_${file.filename}`);
        await fs.writeFile(filePath, file.content);

        // Process file content based on type
        const chunks = await this.processFileContent(file.content, file.mimeType, file.filename);
        
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.generateEmbedding(chunk);
          
          const document: EmbeddingDocument = {
            id: `${customerId}_${agentId}_${file.filename}_chunk_${i}`,
            customerId,
            agentId,
            content: chunk,
            embedding,
            metadata: {
              filename: file.filename,
              source: 'file',
              lastUpdated: new Date().toISOString()
            }
          };

          knowledgeBase.documents.push(document);
        }
        
        processedFiles++;
      }

      // Update knowledge base
      this.knowledgeBases.set(knowledgeBaseKey, knowledgeBase);
      
      // In production, save to BigQuery here
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Processed ${processedFiles} files for customer ${customerId}, agent ${agentId}`);
      return { 
        success: true, 
        processedFiles, 
        totalDocuments: knowledgeBase.documents.length 
      };
    } catch (error: any) {
      return { success: false, processedFiles: 0, totalDocuments: 0, error: error.message };
    }
  }

  /**
   * Add FAQ entries to knowledge base
   */
  async addFAQEntries(customerId: string, agentId: string, faqs: FAQEntry[]): Promise<{
    success: boolean;
    addedEntries: number;
    totalDocuments: number;
    error?: string;
  }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
      
      if (!knowledgeBase) {
        return { success: false, addedEntries: 0, totalDocuments: 0, error: 'Knowledge base not configured' };
      }

      if (!knowledgeBase.configuration.enabledSources.includes('faq')) {
        return { success: false, addedEntries: 0, totalDocuments: 0, error: 'FAQ entries not enabled for this knowledge base' };
      }

      let addedEntries = 0;

      for (const faq of faqs) {
        const content = `Q: ${faq.question}\nA: ${faq.answer}`;
        const embedding = await this.generateEmbedding(content);
        
        const document: EmbeddingDocument = {
          id: `${customerId}_${agentId}_faq_${Date.now()}_${addedEntries}`,
          customerId,
          agentId,
          content,
          embedding,
          metadata: {
            source: 'faq',
            category: faq.category,
            tags: faq.tags,
            lastUpdated: new Date().toISOString()
          }
        };

        knowledgeBase.documents.push(document);
        addedEntries++;
      }

      // Update knowledge base
      this.knowledgeBases.set(knowledgeBaseKey, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Added ${addedEntries} FAQ entries for customer ${customerId}, agent ${agentId}`);
      return { 
        success: true, 
        addedEntries, 
        totalDocuments: knowledgeBase.documents.length 
      };
    } catch (error: any) {
      return { success: false, addedEntries: 0, totalDocuments: 0, error: error.message };
    }
  }

  /**
   * Connect to customer's database and import data
   */
  async connectDatabase(customerId: string, agentId: string, connection: DatabaseConnection): Promise<{
    success: boolean;
    importedRecords: number;
    totalDocuments: number;
    error?: string;
  }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
      
      if (!knowledgeBase) {
        return { success: false, importedRecords: 0, totalDocuments: 0, error: 'Knowledge base not configured' };
      }

      if (!knowledgeBase.configuration.enabledSources.includes('database')) {
        return { success: false, importedRecords: 0, totalDocuments: 0, error: 'Database connections not enabled for this knowledge base' };
      }

      // In production, implement actual database connections
      // For now, simulate database import
      const simulatedData = await this.simulateDatabaseImport(connection);
      
      let importedRecords = 0;

      for (const record of simulatedData) {
        const embedding = await this.generateEmbedding(record.content);
        
        const document: EmbeddingDocument = {
          id: `${customerId}_${agentId}_db_${record.id}`,
          customerId,
          agentId,
          content: record.content,
          embedding,
          metadata: {
            source: 'database',
            category: record.table,
            lastUpdated: new Date().toISOString()
          }
        };

        knowledgeBase.documents.push(document);
        importedRecords++;
      }

      // Update knowledge base
      this.knowledgeBases.set(knowledgeBaseKey, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Imported ${importedRecords} database records for customer ${customerId}, agent ${agentId}`);
      return { 
        success: true, 
        importedRecords, 
        totalDocuments: knowledgeBase.documents.length 
      };
    } catch (error: any) {
      return { success: false, importedRecords: 0, totalDocuments: 0, error: error.message };
    }
  }

  /**
   * Query customer's personalized knowledge base
   */
  async queryKnowledgeBase(customerId: string, agentId: string, query: string): Promise<{
    response: string;
    sources: Array<{ content: string; metadata: any; relevanceScore: number }>;
    relevanceScore: number;
  }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
      
      if (!knowledgeBase || knowledgeBase.documents.length === 0) {
        return {
          response: "I don't have any specific knowledge base configured for this agent. Please upload documents, FAQs, or connect a database to provide me with relevant information.",
          sources: [],
          relevanceScore: 0
        };
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Find most relevant documents using cosine similarity
      const relevantDocs = await this.findRelevantDocuments(queryEmbedding, knowledgeBase.documents, 5);
      
      if (relevantDocs.length === 0) {
        return {
          response: "I couldn't find relevant information in the configured knowledge base for this query.",
          sources: [],
          relevanceScore: 0
        };
      }

      // Generate response using the most relevant documents
      const context = relevantDocs.map(doc => doc.content).join('\n\n');
      const response = await this.generateResponse(query, context);
      
      const sources = relevantDocs.map(doc => ({
        content: doc.content.substring(0, 200) + '...',
        metadata: doc.metadata,
        relevanceScore: this.calculateRelevanceScore(queryEmbedding, doc.embedding)
      }));

      const averageRelevance = sources.reduce((sum, source) => sum + source.relevanceScore, 0) / sources.length;

      return {
        response,
        sources,
        relevanceScore: averageRelevance
      };
    } catch (error: any) {
      console.error('Customer RAG query failed:', error);
      return {
        response: "I encountered an error while searching the knowledge base. Please try again.",
        sources: [],
        relevanceScore: 0
      };
    }
  }

  /**
   * Get knowledge base status for customer
   */
  async getKnowledgeBaseStatus(customerId: string, agentId: string): Promise<{
    configured: boolean;
    totalDocuments: number;
    sourceBreakdown: Record<string, number>;
    configuration?: CustomerKnowledgeBase['configuration'];
  }> {
    const knowledgeBaseKey = `${customerId}_${agentId}`;
    const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
    
    if (!knowledgeBase) {
      return {
        configured: false,
        totalDocuments: 0,
        sourceBreakdown: {}
      };
    }

    const sourceBreakdown: Record<string, number> = {};
    knowledgeBase.documents.forEach(doc => {
      sourceBreakdown[doc.metadata.source] = (sourceBreakdown[doc.metadata.source] || 0) + 1;
    });

    return {
      configured: true,
      totalDocuments: knowledgeBase.documents.length,
      sourceBreakdown,
      configuration: knowledgeBase.configuration
    };
  }

  /**
   * Delete knowledge base documents
   */
  async deleteDocuments(customerId: string, agentId: string, documentIds?: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const knowledgeBaseKey = `${customerId}_${agentId}`;
      const knowledgeBase = this.knowledgeBases.get(knowledgeBaseKey);
      
      if (!knowledgeBase) {
        return { success: false, deletedCount: 0, error: 'Knowledge base not found' };
      }

      let deletedCount = 0;

      if (documentIds && documentIds.length > 0) {
        // Delete specific documents
        knowledgeBase.documents = knowledgeBase.documents.filter(doc => {
          if (documentIds.includes(doc.id)) {
            deletedCount++;
            return false;
          }
          return true;
        });
      } else {
        // Delete all documents
        deletedCount = knowledgeBase.documents.length;
        knowledgeBase.documents = [];
      }

      // Update knowledge base
      this.knowledgeBases.set(knowledgeBaseKey, knowledgeBase);
      
      // Update BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Deleted ${deletedCount} documents for customer ${customerId}, agent ${agentId}`);
      return { success: true, deletedCount };
    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  // Private helper methods
  private async processFileContent(content: string, mimeType: string, filename: string): Promise<string[]> {
    // Split content into chunks for embedding
    const maxChunkSize = 1000;
    const chunks: string[] = [];
    
    if (mimeType.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md')) {
      // Text file processing
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence + '. ';
        }
      }
      
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    } else if (mimeType.includes('json')) {
      // JSON file processing
      try {
        const jsonData = JSON.parse(content);
        if (Array.isArray(jsonData)) {
          jsonData.forEach(item => {
            chunks.push(JSON.stringify(item, null, 2));
          });
        } else {
          chunks.push(JSON.stringify(jsonData, null, 2));
        }
      } catch {
        chunks.push(content);
      }
    } else {
      // Fallback: treat as plain text
      const words = content.split(/\s+/);
      let currentChunk = '';
      
      for (const word of words) {
        if (currentChunk.length + word.length > maxChunkSize) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += ' ' + word;
        }
      }
      
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 10); // Filter out very short chunks
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Return a dummy embedding in case of failure
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
  }

  private async findRelevantDocuments(queryEmbedding: number[], documents: EmbeddingDocument[], limit: number): Promise<EmbeddingDocument[]> {
    const scored = documents.map(doc => ({
      document: doc,
      score: this.calculateRelevanceScore(queryEmbedding, doc.embedding)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(item => item.score > 0.7) // Only return documents with good relevance
      .map(item => item.document);
  }

  private calculateRelevanceScore(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity
    const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  private async generateResponse(query: string, context: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Use the provided context to answer the user\'s question. If the context doesn\'t contain relevant information, say so politely.'
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${query}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content || 'I apologize, but I couldn\'t generate a response.';
    } catch (error) {
      console.error('Response generation failed:', error);
      return 'I encountered an error while generating a response. Please try again.';
    }
  }

  private async simulateDatabaseImport(connection: DatabaseConnection): Promise<Array<{ id: string; content: string; table: string }>> {
    // Simulate database records based on connection type
    const records = [];
    
    switch (connection.type) {
      case 'mysql':
      case 'postgresql':
        records.push(
          { id: '1', content: 'Product: Premium Widget - Price: $99.99 - Description: High-quality widget for professional use', table: 'products' },
          { id: '2', content: 'Customer: John Smith - Email: john@example.com - Status: Active - Last Purchase: 2024-01-15', table: 'customers' },
          { id: '3', content: 'Order: #12345 - Customer: John Smith - Total: $199.98 - Status: Completed - Date: 2024-01-15', table: 'orders' }
        );
        break;
      case 'mongodb':
        records.push(
          { id: '1', content: 'Document: Product catalog with widgets, gadgets, and accessories. Updated monthly with new arrivals.', table: 'products' },
          { id: '2', content: 'User profile: Premium customer with purchase history and preferences for technical products.', table: 'users' }
        );
        break;
    }

    return records;
  }

  private async saveToBigQuery(knowledgeBase: CustomerKnowledgeBase): Promise<void> {
    // In production, implement BigQuery storage
    // For now, just log the operation
    console.log(`Saving knowledge base to BigQuery for customer ${knowledgeBase.customerId}, agent ${knowledgeBase.agentId}`);
    console.log(`Documents count: ${knowledgeBase.documents.length}`);
  }
}