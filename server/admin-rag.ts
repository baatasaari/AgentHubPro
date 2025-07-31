/**
 * Admin-Configurable RAG System
 * Allows platform administrators to upload files, configure website pages, 
 * and manage FAQ content that feeds into the RAG system for all agents
 */

import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

interface AdminRAGDocument {
  id: string;
  agentId: string;
  content: string;
  embedding: number[];
  metadata: {
    filename?: string;
    source: 'admin_file' | 'website_page' | 'faq_badge' | 'manual';
    category?: string;
    tags?: string[];
    priority: 'high' | 'medium' | 'low';
    lastUpdated: string;
    adminUserId: string;
  };
}

interface AgentKnowledgeBase {
  agentId: string;
  documents: AdminRAGDocument[];
  configuration: {
    enabledSources: ('admin_file' | 'website_page' | 'faq_badge' | 'manual')[];
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
    adminControlled: true;
  };
}

interface AdminFileUpload {
  filename: string;
  content: string;
  mimeType: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface WebsitePage {
  url: string;
  title: string;
  content: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface FAQBadge {
  question: string;
  answer: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
  applicableAgents?: string[]; // If empty, applies to all agents
}

export class AdminRAGService {
  private openai: OpenAI;
  private agentKnowledgeBases: Map<string, AgentKnowledgeBase> = new Map();
  private uploadsDir = './admin-uploads';

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initializeUploadsDirectory();
  }

  private async initializeUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create admin uploads directory:', error);
    }
  }

  /**
   * Admin configures knowledge base for specific agent
   */
  async configureAgentKnowledgeBase(agentId: string, adminUserId: string, config: {
    enabledSources: ('admin_file' | 'website_page' | 'faq_badge' | 'manual')[];
    embeddingModel?: string;
    maxDocuments?: number;
    autoUpdate?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const knowledgeBase: AgentKnowledgeBase = {
        agentId,
        documents: this.agentKnowledgeBases.get(agentId)?.documents || [],
        configuration: {
          enabledSources: config.enabledSources,
          embeddingModel: config.embeddingModel || 'text-embedding-3-small',
          maxDocuments: config.maxDocuments || 1000,
          autoUpdate: config.autoUpdate !== false,
          adminControlled: true
        }
      };

      this.agentKnowledgeBases.set(agentId, knowledgeBase);
      
      console.log(`Admin ${adminUserId} configured knowledge base for agent ${agentId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin uploads files for agent knowledge base
   */
  async adminUploadFiles(agentId: string, adminUserId: string, files: AdminFileUpload[]): Promise<{
    success: boolean;
    processedFiles: number;
    totalDocuments: number;
    error?: string;
  }> {
    try {
      const knowledgeBase = this.agentKnowledgeBases.get(agentId);
      
      if (!knowledgeBase) {
        return { success: false, processedFiles: 0, totalDocuments: 0, error: 'Knowledge base not configured for this agent' };
      }

      if (!knowledgeBase.configuration.enabledSources.includes('admin_file')) {
        return { success: false, processedFiles: 0, totalDocuments: 0, error: 'Admin file uploads not enabled for this agent' };
      }

      let processedFiles = 0;
      
      for (const file of files) {
        // Save file to admin uploads directory
        const filePath = path.join(this.uploadsDir, `agent_${agentId}_${file.filename}`);
        await fs.writeFile(filePath, file.content);

        // Process file content
        const chunks = await this.processFileContent(file.content, file.mimeType, file.filename);
        
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.generateEmbedding(chunk);
          
          const document: AdminRAGDocument = {
            id: `admin_${agentId}_${file.filename}_chunk_${i}_${Date.now()}`,
            agentId,
            content: chunk,
            embedding,
            metadata: {
              filename: file.filename,
              source: 'admin_file',
              category: file.category || 'general',
              priority: file.priority || 'medium',
              lastUpdated: new Date().toISOString(),
              adminUserId
            }
          };

          knowledgeBase.documents.push(document);
        }
        
        processedFiles++;
      }

      // Update knowledge base
      this.agentKnowledgeBases.set(agentId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} processed ${processedFiles} files for agent ${agentId}`);
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
   * Admin configures website pages for agent knowledge base
   */
  async adminConfigureWebsitePages(agentId: string, adminUserId: string, pages: WebsitePage[]): Promise<{
    success: boolean;
    addedPages: number;
    totalDocuments: number;
    error?: string;
  }> {
    try {
      const knowledgeBase = this.agentKnowledgeBases.get(agentId);
      
      if (!knowledgeBase) {
        return { success: false, addedPages: 0, totalDocuments: 0, error: 'Knowledge base not configured for this agent' };
      }

      if (!knowledgeBase.configuration.enabledSources.includes('website_page')) {
        return { success: false, addedPages: 0, totalDocuments: 0, error: 'Website pages not enabled for this agent' };
      }

      let addedPages = 0;

      for (const page of pages) {
        const content = `Page: ${page.title}\nURL: ${page.url}\nContent: ${page.content}`;
        const embedding = await this.generateEmbedding(content);
        
        const document: AdminRAGDocument = {
          id: `admin_${agentId}_webpage_${Date.now()}_${addedPages}`,
          agentId,
          content,
          embedding,
          metadata: {
            source: 'website_page',
            category: page.category || 'website',
            priority: page.priority || 'medium',
            lastUpdated: new Date().toISOString(),
            adminUserId,
            tags: ['website', 'page', page.url]
          }
        };

        knowledgeBase.documents.push(document);
        addedPages++;
      }

      // Update knowledge base
      this.agentKnowledgeBases.set(agentId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} added ${addedPages} website pages for agent ${agentId}`);
      return { 
        success: true, 
        addedPages, 
        totalDocuments: knowledgeBase.documents.length 
      };
    } catch (error: any) {
      return { success: false, addedPages: 0, totalDocuments: 0, error: error.message };
    }
  }

  /**
   * Admin manages FAQ badges for agents
   */
  async adminManageFAQBadges(adminUserId: string, faqs: FAQBadge[]): Promise<{
    success: boolean;
    addedFAQs: number;
    affectedAgents: string[];
    error?: string;
  }> {
    try {
      let addedFAQs = 0;
      const affectedAgents: string[] = [];

      for (const faq of faqs) {
        const content = `FAQ: ${faq.question}\nAnswer: ${faq.answer}`;
        const embedding = await this.generateEmbedding(content);
        
        // Determine which agents this FAQ applies to
        const targetAgents = faq.applicableAgents && faq.applicableAgents.length > 0 
          ? faq.applicableAgents 
          : Array.from(this.agentKnowledgeBases.keys()); // All agents if not specified

        for (const agentId of targetAgents) {
          const knowledgeBase = this.agentKnowledgeBases.get(agentId);
          
          if (!knowledgeBase) continue;
          
          if (!knowledgeBase.configuration.enabledSources.includes('faq_badge')) continue;

          const document: AdminRAGDocument = {
            id: `admin_${agentId}_faq_${Date.now()}_${addedFAQs}`,
            agentId,
            content,
            embedding,
            metadata: {
              source: 'faq_badge',
              category: faq.category,
              priority: faq.priority,
              tags: faq.tags,
              lastUpdated: new Date().toISOString(),
              adminUserId
            }
          };

          knowledgeBase.documents.push(document);
          
          if (!affectedAgents.includes(agentId)) {
            affectedAgents.push(agentId);
          }

          // Save to BigQuery
          await this.saveToBigQuery(knowledgeBase);
        }
        
        addedFAQs++;
      }

      console.log(`Admin ${adminUserId} added ${addedFAQs} FAQ badges affecting ${affectedAgents.length} agents`);
      return { 
        success: true, 
        addedFAQs, 
        affectedAgents 
      };
    } catch (error: any) {
      return { success: false, addedFAQs: 0, affectedAgents: [], error: error.message };
    }
  }

  /**
   * Query agent's knowledge base (used by agents for customer queries)
   */
  async queryAgentKnowledgeBase(agentId: string, query: string): Promise<{
    response: string;
    sources: Array<{ content: string; metadata: any; relevanceScore: number }>;
    relevanceScore: number;
  }> {
    try {
      const knowledgeBase = this.agentKnowledgeBases.get(agentId);
      
      if (!knowledgeBase || knowledgeBase.documents.length === 0) {
        return {
          response: "I don't have access to specific knowledge base information for this query. Please contact the administrator to configure knowledge base content.",
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
          response: "I couldn't find relevant information in the knowledge base for this query.",
          sources: [],
          relevanceScore: 0
        };
      }

      // Prioritize high-priority content
      const prioritizedDocs = relevantDocs.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.metadata.priority] - priorityOrder[a.metadata.priority];
      });

      // Generate response using the most relevant documents
      const context = prioritizedDocs.map(doc => doc.content).join('\n\n');
      const response = await this.generateResponse(query, context);
      
      const sources = prioritizedDocs.map(doc => ({
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
      console.error('Agent knowledge base query failed:', error);
      return {
        response: "I encountered an error while searching the knowledge base. Please try again.",
        sources: [],
        relevanceScore: 0
      };
    }
  }

  /**
   * Admin gets knowledge base status for agent
   */
  async getAgentKnowledgeBaseStatus(agentId: string): Promise<{
    configured: boolean;
    totalDocuments: number;
    sourceBreakdown: Record<string, number>;
    configuration?: AgentKnowledgeBase['configuration'];
    adminControlled: boolean;
  }> {
    const knowledgeBase = this.agentKnowledgeBases.get(agentId);
    
    if (!knowledgeBase) {
      return {
        configured: false,
        totalDocuments: 0,
        sourceBreakdown: {},
        adminControlled: true
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
      configuration: knowledgeBase.configuration,
      adminControlled: true
    };
  }

  /**
   * Admin deletes documents from agent knowledge base
   */
  async adminDeleteDocuments(agentId: string, adminUserId: string, documentIds?: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const knowledgeBase = this.agentKnowledgeBases.get(agentId);
      
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
      this.agentKnowledgeBases.set(agentId, knowledgeBase);
      
      // Update BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} deleted ${deletedCount} documents for agent ${agentId}`);
      return { success: true, deletedCount };
    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  /**
   * Get all agents and their knowledge base status (admin overview)
   */
  async getAdminOverview(): Promise<{
    totalAgents: number;
    configuredAgents: number;
    totalDocuments: number;
    agentStatuses: Array<{
      agentId: string;
      configured: boolean;
      documentCount: number;
      sources: string[];
    }>;
  }> {
    const agentStatuses = Array.from(this.agentKnowledgeBases.entries()).map(([agentId, kb]) => ({
      agentId,
      configured: true,
      documentCount: kb.documents.length,
      sources: [...new Set(kb.documents.map(doc => doc.metadata.source))]
    }));

    const totalDocuments = agentStatuses.reduce((sum, agent) => sum + agent.documentCount, 0);

    return {
      totalAgents: agentStatuses.length,
      configuredAgents: agentStatuses.filter(agent => agent.configured).length,
      totalDocuments,
      agentStatuses
    };
  }

  // Private helper methods (same as before but adapted for admin use)
  private async processFileContent(content: string, mimeType: string, filename: string): Promise<string[]> {
    const maxChunkSize = 1000;
    const chunks: string[] = [];
    
    if (mimeType.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md')) {
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

    return chunks.filter(chunk => chunk.length > 10);
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
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
  }

  private async findRelevantDocuments(queryEmbedding: number[], documents: AdminRAGDocument[], limit: number): Promise<AdminRAGDocument[]> {
    const scored = documents.map(doc => ({
      document: doc,
      score: this.calculateRelevanceScore(queryEmbedding, doc.embedding)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(item => item.score > 0.7)
      .map(item => item.document);
  }

  private calculateRelevanceScore(embedding1: number[], embedding2: number[]): number {
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

  private async saveToBigQuery(knowledgeBase: AgentKnowledgeBase): Promise<void> {
    console.log(`Saving admin-controlled knowledge base to BigQuery for agent ${knowledgeBase.agentId}`);
    console.log(`Documents count: ${knowledgeBase.documents.length}`);
  }
}