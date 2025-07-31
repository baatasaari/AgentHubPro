/**
 * Admin-Controlled Per-Customer RAG System
 * Allows administrators to configure individual knowledge bases per customer
 * with support for multiple agents across various platforms (WhatsApp, Instagram, etc.)
 */

import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

interface AdminPerCustomerRAGDocument {
  id: string;
  customerId: string;
  agentIds: string[]; // Multiple agents for this customer
  platforms: ('whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms' | 'telegram')[]; // Available platforms
  content: string;
  embedding: number[];
  metadata: {
    filename?: string;
    source: 'admin_file' | 'admin_faq' | 'admin_database' | 'admin_website' | 'admin_manual';
    category?: string;
    tags?: string[];
    priority: 'high' | 'medium' | 'low';
    lastUpdated: string;
    adminUserId: string; // Which admin configured this
    customerSpecific: true; // Always customer-specific
  };
}

interface CustomerAgentConfiguration {
  customerId: string;
  agentId: string;
  platforms: ('whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms' | 'telegram')[];
  enabledSources: ('admin_file' | 'admin_faq' | 'admin_database' | 'admin_website' | 'admin_manual')[];
  maxDocuments: number;
  customInstructions?: string;
  adminControlled: true;
}

interface CustomerKnowledgeBase {
  customerId: string;
  customerName: string;
  agentConfigurations: Map<string, CustomerAgentConfiguration>;
  documents: AdminPerCustomerRAGDocument[];
  configuration: {
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
    crossAgentSharing: boolean; // Share documents across customer's agents
    adminUserId: string; // Which admin manages this customer
    lastConfigured: string;
  };
}

interface AdminFileUploadForCustomer {
  filename: string;
  content: string;
  mimeType: string;
  targetAgents?: string[]; // Specific agents for this customer
  targetPlatforms?: string[]; // Specific platforms
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface AdminFAQForCustomer {
  question: string;
  answer: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
  targetAgents?: string[]; // Specific to customer's agents
  targetPlatforms?: string[];
}

interface AdminWebsiteConfigForCustomer {
  url: string;
  title: string;
  content: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  targetAgents?: string[];
  targetPlatforms?: string[];
}

export class AdminPerCustomerRAGService {
  private openai: OpenAI;
  private customerKnowledgeBases: Map<string, CustomerKnowledgeBase> = new Map();
  private uploadsDir = './admin-customer-uploads';

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initializeUploadsDirectory();
  }

  private async initializeUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create admin customer uploads directory:', error);
    }
  }

  /**
   * Admin configures knowledge base for specific customer
   */
  async adminConfigureCustomerKnowledgeBase(customerId: string, customerName: string, adminUserId: string, config: {
    agentConfigurations: {
      agentId: string;
      platforms: string[];
      enabledSources: string[];
      maxDocuments: number;
      customInstructions?: string;
    }[];
    globalConfiguration: {
      embeddingModel: string;
      maxDocuments: number;
      autoUpdate: boolean;
      crossAgentSharing: boolean;
    };
  }): Promise<{ success: boolean; configuredAgents: number; error?: string }> {
    try {
      const agentConfigurations = new Map<string, CustomerAgentConfiguration>();
      
      // Configure each agent for this customer
      config.agentConfigurations.forEach(agentConfig => {
        agentConfigurations.set(agentConfig.agentId, {
          customerId,
          agentId: agentConfig.agentId,
          platforms: agentConfig.platforms as any[],
          enabledSources: agentConfig.enabledSources as any[],
          maxDocuments: agentConfig.maxDocuments,
          customInstructions: agentConfig.customInstructions,
          adminControlled: true
        });
      });

      const knowledgeBase: CustomerKnowledgeBase = {
        customerId,
        customerName,
        agentConfigurations,
        documents: this.customerKnowledgeBases.get(customerId)?.documents || [],
        configuration: {
          embeddingModel: config.globalConfiguration.embeddingModel,
          maxDocuments: config.globalConfiguration.maxDocuments,
          autoUpdate: config.globalConfiguration.autoUpdate,
          crossAgentSharing: config.globalConfiguration.crossAgentSharing,
          adminUserId,
          lastConfigured: new Date().toISOString()
        }
      };

      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      console.log(`Admin ${adminUserId} configured knowledge base for customer ${customerId} (${customerName}) with ${config.agentConfigurations.length} agents`);
      return { 
        success: true, 
        configuredAgents: config.agentConfigurations.length 
      };
    } catch (error: any) {
      return { 
        success: false, 
        configuredAgents: 0, 
        error: error.message 
      };
    }
  }

  /**
   * Admin uploads files for specific customer's knowledge base
   */
  async adminUploadFilesForCustomer(customerId: string, adminUserId: string, files: AdminFileUploadForCustomer[]): Promise<{
    success: boolean;
    processedFiles: number;
    totalDocuments: number;
    agentsAffected: string[];
    platformsAffected: string[];
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { 
          success: false, 
          processedFiles: 0, 
          totalDocuments: 0, 
          agentsAffected: [], 
          platformsAffected: [], 
          error: 'Knowledge base not configured for this customer' 
        };
      }

      let processedFiles = 0;
      const affectedAgents = new Set<string>();
      const affectedPlatforms = new Set<string>();
      
      for (const file of files) {
        // Determine target agents (customer's agents if not specified)
        const targetAgents = file.targetAgents && file.targetAgents.length > 0 
          ? file.targetAgents 
          : Array.from(knowledgeBase.agentConfigurations.keys());

        // Determine target platforms (all if not specified)
        const targetPlatforms = file.targetPlatforms && file.targetPlatforms.length > 0 
          ? file.targetPlatforms 
          : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

        // Save file to admin customer uploads directory
        const filePath = path.join(this.uploadsDir, `customer_${customerId}_${file.filename}`);
        await fs.writeFile(filePath, file.content);

        // Process file content into chunks
        const chunks = await this.processFileContent(file.content, file.mimeType, file.filename);
        
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.generateEmbedding(chunk);
          
          const document: AdminPerCustomerRAGDocument = {
            id: `admin_customer_${customerId}_${file.filename}_chunk_${i}_${Date.now()}`,
            customerId,
            agentIds: targetAgents,
            platforms: targetPlatforms as any[],
            content: chunk,
            embedding,
            metadata: {
              filename: file.filename,
              source: 'admin_file',
              category: file.category || 'general',
              priority: file.priority || 'medium',
              lastUpdated: new Date().toISOString(),
              adminUserId,
              customerSpecific: true
            }
          };

          knowledgeBase.documents.push(document);

          // Track affected agents and platforms
          targetAgents.forEach(agent => affectedAgents.add(agent));
          targetPlatforms.forEach(platform => affectedPlatforms.add(platform));
        }
        
        processedFiles++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} processed ${processedFiles} files for customer ${customerId} affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
      return { 
        success: true, 
        processedFiles, 
        totalDocuments: knowledgeBase.documents.length,
        agentsAffected: Array.from(affectedAgents),
        platformsAffected: Array.from(affectedPlatforms)
      };
    } catch (error: any) {
      return { 
        success: false, 
        processedFiles: 0, 
        totalDocuments: 0, 
        agentsAffected: [], 
        platformsAffected: [], 
        error: error.message 
      };
    }
  }

  /**
   * Admin manages FAQs for specific customer
   */
  async adminManageFAQsForCustomer(customerId: string, adminUserId: string, faqs: AdminFAQForCustomer[]): Promise<{
    success: boolean;
    addedFAQs: number;
    agentsAffected: string[];
    platformsAffected: string[];
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { 
          success: false, 
          addedFAQs: 0, 
          agentsAffected: [], 
          platformsAffected: [], 
          error: 'Knowledge base not configured for this customer' 
        };
      }

      let addedFAQs = 0;
      const affectedAgents = new Set<string>();
      const affectedPlatforms = new Set<string>();

      for (const faq of faqs) {
        // Determine target agents (customer's agents if not specified)
        const targetAgents = faq.targetAgents && faq.targetAgents.length > 0 
          ? faq.targetAgents 
          : Array.from(knowledgeBase.agentConfigurations.keys());

        // Determine target platforms
        const targetPlatforms = faq.targetPlatforms && faq.targetPlatforms.length > 0 
          ? faq.targetPlatforms 
          : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

        const content = `FAQ: ${faq.question}\nAnswer: ${faq.answer}`;
        const embedding = await this.generateEmbedding(content);
        
        const document: AdminPerCustomerRAGDocument = {
          id: `admin_customer_${customerId}_faq_${Date.now()}_${addedFAQs}`,
          customerId,
          agentIds: targetAgents,
          platforms: targetPlatforms as any[],
          content,
          embedding,
          metadata: {
            source: 'admin_faq',
            category: faq.category,
            priority: faq.priority,
            tags: faq.tags,
            lastUpdated: new Date().toISOString(),
            adminUserId,
            customerSpecific: true
          }
        };

        knowledgeBase.documents.push(document);

        // Track affected agents and platforms
        targetAgents.forEach(agent => affectedAgents.add(agent));
        targetPlatforms.forEach(platform => affectedPlatforms.add(platform));
        
        addedFAQs++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} added ${addedFAQs} FAQs for customer ${customerId} affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
      return { 
        success: true, 
        addedFAQs, 
        agentsAffected: Array.from(affectedAgents),
        platformsAffected: Array.from(affectedPlatforms)
      };
    } catch (error: any) {
      return { 
        success: false, 
        addedFAQs: 0, 
        agentsAffected: [], 
        platformsAffected: [], 
        error: error.message 
      };
    }
  }

  /**
   * Admin configures website pages for specific customer
   */
  async adminConfigureWebsitePagesForCustomer(customerId: string, adminUserId: string, pages: AdminWebsiteConfigForCustomer[]): Promise<{
    success: boolean;
    addedPages: number;
    agentsAffected: string[];
    platformsAffected: string[];
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { 
          success: false, 
          addedPages: 0, 
          agentsAffected: [], 
          platformsAffected: [], 
          error: 'Knowledge base not configured for this customer' 
        };
      }

      let addedPages = 0;
      const affectedAgents = new Set<string>();
      const affectedPlatforms = new Set<string>();

      for (const page of pages) {
        // Determine target agents
        const targetAgents = page.targetAgents && page.targetAgents.length > 0 
          ? page.targetAgents 
          : Array.from(knowledgeBase.agentConfigurations.keys());

        // Determine target platforms
        const targetPlatforms = page.targetPlatforms && page.targetPlatforms.length > 0 
          ? page.targetPlatforms 
          : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

        const content = `Page: ${page.title}\nURL: ${page.url}\nContent: ${page.content}`;
        const embedding = await this.generateEmbedding(content);
        
        const document: AdminPerCustomerRAGDocument = {
          id: `admin_customer_${customerId}_webpage_${Date.now()}_${addedPages}`,
          customerId,
          agentIds: targetAgents,
          platforms: targetPlatforms as any[],
          content,
          embedding,
          metadata: {
            source: 'admin_website',
            category: page.category || 'website',
            priority: page.priority || 'medium',
            lastUpdated: new Date().toISOString(),
            adminUserId,
            tags: ['website', 'page', page.url],
            customerSpecific: true
          }
        };

        knowledgeBase.documents.push(document);

        // Track affected agents and platforms
        targetAgents.forEach(agent => affectedAgents.add(agent));
        targetPlatforms.forEach(platform => affectedPlatforms.add(platform));
        
        addedPages++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} added ${addedPages} website pages for customer ${customerId} affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
      return { 
        success: true, 
        addedPages, 
        agentsAffected: Array.from(affectedAgents),
        platformsAffected: Array.from(affectedPlatforms)
      };
    } catch (error: any) {
      return { 
        success: false, 
        addedPages: 0, 
        agentsAffected: [], 
        platformsAffected: [], 
        error: error.message 
      };
    }
  }

  /**
   * Query customer's knowledge base for specific agent and platform
   */
  async queryCustomerKnowledgeBase(customerId: string, agentId: string, platform: string, query: string): Promise<{
    response: string;
    sources: Array<{ content: string; metadata: any; relevanceScore: number }>;
    relevanceScore: number;
    customerSpecific: boolean;
    adminConfigured: boolean;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return {
          response: "Knowledge base not configured for this customer. Please contact administrator.",
          sources: [],
          relevanceScore: 0,
          customerSpecific: true,
          adminConfigured: true
        };
      }

      const agentConfig = knowledgeBase.agentConfigurations.get(agentId);
      
      if (!agentConfig) {
        return {
          response: "Agent not configured for this customer. Please contact administrator.",
          sources: [],
          relevanceScore: 0,
          customerSpecific: true,
          adminConfigured: true
        };
      }

      // Check if platform is supported for this agent
      if (!agentConfig.platforms.includes(platform as any)) {
        return {
          response: `This agent is not configured for ${platform} platform by the administrator.`,
          sources: [],
          relevanceScore: 0,
          customerSpecific: true,
          adminConfigured: true
        };
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Find relevant documents for this customer, agent, and platform
      const relevantDocuments = knowledgeBase.documents.filter(doc => 
        doc.agentIds.includes(agentId) && doc.platforms.includes(platform as any)
      );

      if (relevantDocuments.length === 0) {
        return {
          response: "No knowledge base content has been configured for this agent and platform. Please contact administrator.",
          sources: [],
          relevanceScore: 0,
          customerSpecific: true,
          adminConfigured: true
        };
      }

      // Find most relevant documents using cosine similarity
      const scoredDocuments = await this.findRelevantDocuments(queryEmbedding, relevantDocuments, 5);
      
      if (scoredDocuments.length === 0) {
        return {
          response: "I couldn't find relevant information in the knowledge base for this query.",
          sources: [],
          relevanceScore: 0,
          customerSpecific: true,
          adminConfigured: true
        };
      }

      // Prioritize high-priority content
      const prioritizedDocs = scoredDocuments.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.metadata.priority] - priorityOrder[a.metadata.priority];
      });

      // Generate response using the most relevant documents
      const context = prioritizedDocs.map(doc => doc.content).join('\n\n');
      const response = await this.generateResponse(query, context, agentConfig.customInstructions);
      
      const sources = prioritizedDocs.map(doc => ({
        content: doc.content.substring(0, 200) + '...',
        metadata: doc.metadata,
        relevanceScore: this.calculateRelevanceScore(queryEmbedding, doc.embedding)
      }));

      const averageRelevance = sources.reduce((sum, source) => sum + source.relevanceScore, 0) / sources.length;

      return {
        response,
        sources,
        relevanceScore: averageRelevance,
        customerSpecific: true,
        adminConfigured: true
      };
    } catch (error: any) {
      console.error('Customer knowledge base query failed:', error);
      return {
        response: "I encountered an error while searching the knowledge base. Please try again.",
        sources: [],
        relevanceScore: 0,
        customerSpecific: true,
        adminConfigured: true
      };
    }
  }

  /**
   * Get customer's knowledge base status
   */
  async getCustomerKnowledgeBaseStatus(customerId: string): Promise<{
    configured: boolean;
    customerName: string;
    totalAgents: number;
    totalPlatforms: number;
    totalDocuments: number;
    agentConfigurations: Array<{
      agentId: string;
      platforms: string[];
      documentCount: number;
      enabledSources: string[];
    }>;
    sourceBreakdown: Record<string, number>;
    adminConfigured: boolean;
    lastConfiguredBy: string;
    lastConfigured: string;
  }> {
    const knowledgeBase = this.customerKnowledgeBases.get(customerId);
    
    if (!knowledgeBase) {
      return {
        configured: false,
        customerName: '',
        totalAgents: 0,
        totalPlatforms: 0,
        totalDocuments: 0,
        agentConfigurations: [],
        sourceBreakdown: {},
        adminConfigured: true,
        lastConfiguredBy: '',
        lastConfigured: ''
      };
    }

    // Calculate agent configurations
    const agentConfigurations = Array.from(knowledgeBase.agentConfigurations.values()).map(config => ({
      agentId: config.agentId,
      platforms: config.platforms,
      documentCount: knowledgeBase.documents.filter(doc => doc.agentIds.includes(config.agentId)).length,
      enabledSources: config.enabledSources
    }));

    // Calculate unique platforms
    const allPlatforms = new Set<string>();
    knowledgeBase.documents.forEach(doc => {
      doc.platforms.forEach(platform => allPlatforms.add(platform));
    });

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    knowledgeBase.documents.forEach(doc => {
      sourceBreakdown[doc.metadata.source] = (sourceBreakdown[doc.metadata.source] || 0) + 1;
    });

    return {
      configured: true,
      customerName: knowledgeBase.customerName,
      totalAgents: knowledgeBase.agentConfigurations.size,
      totalPlatforms: allPlatforms.size,
      totalDocuments: knowledgeBase.documents.length,
      agentConfigurations,
      sourceBreakdown,
      adminConfigured: true,
      lastConfiguredBy: knowledgeBase.configuration.adminUserId,
      lastConfigured: knowledgeBase.configuration.lastConfigured
    };
  }

  /**
   * Admin gets overview of all customers
   */
  async getAdminCustomersOverview(): Promise<{
    totalCustomers: number;
    configuredCustomers: number;
    totalAgents: number;
    totalDocuments: number;
    customerStatuses: Array<{
      customerId: string;
      customerName: string;
      agentCount: number;
      documentCount: number;
      platformCount: number;
      lastConfigured: string;
      adminUserId: string;
    }>;
  }> {
    const customerStatuses = Array.from(this.customerKnowledgeBases.entries()).map(([customerId, kb]) => {
      const platforms = new Set<string>();
      kb.documents.forEach(doc => doc.platforms.forEach(platform => platforms.add(platform)));
      
      return {
        customerId,
        customerName: kb.customerName,
        agentCount: kb.agentConfigurations.size,
        documentCount: kb.documents.length,
        platformCount: platforms.size,
        lastConfigured: kb.configuration.lastConfigured,
        adminUserId: kb.configuration.adminUserId
      };
    });

    const totalAgents = customerStatuses.reduce((sum, customer) => sum + customer.agentCount, 0);
    const totalDocuments = customerStatuses.reduce((sum, customer) => sum + customer.documentCount, 0);

    return {
      totalCustomers: customerStatuses.length,
      configuredCustomers: customerStatuses.length,
      totalAgents,
      totalDocuments,
      customerStatuses
    };
  }

  /**
   * Admin deletes documents for specific customer
   */
  async adminDeleteCustomerDocuments(customerId: string, adminUserId: string, documentIds?: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { success: false, deletedCount: 0, error: 'Customer knowledge base not found' };
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
        // Delete all documents for this customer
        deletedCount = knowledgeBase.documents.length;
        knowledgeBase.documents = [];
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Update BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Admin ${adminUserId} deleted ${deletedCount} documents for customer ${customerId}`);
      return { success: true, deletedCount };
    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  // Helper methods (similar to previous implementations)
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

  private async findRelevantDocuments(queryEmbedding: number[], documents: AdminPerCustomerRAGDocument[], limit: number): Promise<AdminPerCustomerRAGDocument[]> {
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

  private async generateResponse(query: string, context: string, customInstructions?: string): Promise<string> {
    try {
      const systemPrompt = customInstructions 
        ? `You are a helpful assistant. ${customInstructions} Use the provided context to answer the user's question.`
        : 'You are a helpful assistant. Use the provided context to answer the user\'s question. If the context doesn\'t contain relevant information, say so politely.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
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

  private async saveToBigQuery(knowledgeBase: CustomerKnowledgeBase): Promise<void> {
    console.log(`Saving admin-controlled per-customer knowledge base to BigQuery for customer ${knowledgeBase.customerId} (${knowledgeBase.customerName})`);
    console.log(`Agents: ${knowledgeBase.agentConfigurations.size}, Documents: ${knowledgeBase.documents.length}`);
  }
}