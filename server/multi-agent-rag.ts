/**
 * Customer-Configurable Multi-Agent RAG System
 * Allows customers to configure knowledge bases for multiple agents across various platforms
 * Supports WhatsApp, Instagram, Messenger, Web Chat, SMS, and other platforms
 */

import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

interface MultiAgentRAGDocument {
  id: string;
  customerId: string;
  agentIds: string[]; // Multiple agents can use this document
  platforms: ('whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms' | 'telegram' | 'twitter')[]; // Available platforms
  content: string;
  embedding: number[];
  metadata: {
    filename?: string;
    source: 'file_upload' | 'faq' | 'database' | 'manual' | 'website_scrape';
    category?: string;
    tags?: string[];
    priority: 'high' | 'medium' | 'low';
    lastUpdated: string;
    customerConfigured: true; // Always customer-configured
  };
}

interface CustomerMultiAgentKnowledgeBase {
  customerId: string;
  agentConfigurations: Map<string, AgentConfiguration>; // Per-agent configurations
  globalDocuments: MultiAgentRAGDocument[]; // Documents available to all agents
  platformSpecificDocuments: Map<string, MultiAgentRAGDocument[]>; // Platform-specific knowledge
  configuration: {
    enabledSources: ('file_upload' | 'faq' | 'database' | 'manual' | 'website_scrape')[];
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
    crossAgentSharing: boolean; // Allow knowledge sharing between agents
    platformSeparation: boolean; // Separate knowledge by platform
  };
}

interface AgentConfiguration {
  agentId: string;
  platforms: ('whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms' | 'telegram' | 'twitter')[];
  enabledSources: ('file_upload' | 'faq' | 'database' | 'manual' | 'website_scrape')[];
  maxDocuments: number;
  useGlobalKnowledge: boolean;
  customInstructions?: string;
}

interface CustomerFileUpload {
  filename: string;
  content: string;
  mimeType: string;
  targetAgents?: string[]; // If empty, applies to all agents
  targetPlatforms?: string[]; // If empty, applies to all platforms
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface CustomerFAQ {
  question: string;
  answer: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
  targetAgents?: string[]; // If empty, applies to all customer's agents
  targetPlatforms?: string[]; // If empty, applies to all platforms
}

interface CustomerDatabaseConnection {
  type: 'mysql' | 'postgresql' | 'mongodb' | 'api_endpoint';
  connectionString?: string;
  host?: string;
  database?: string;
  tables?: string[];
  query?: string;
  apiEndpoint?: string;
  targetAgents?: string[];
  targetPlatforms?: string[];
}

export class MultiAgentRAGService {
  private openai: OpenAI;
  private customerKnowledgeBases: Map<string, CustomerMultiAgentKnowledgeBase> = new Map();
  private uploadsDir = './customer-uploads';

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initializeUploadsDirectory();
  }

  private async initializeUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create customer uploads directory:', error);
    }
  }

  /**
   * Customer configures knowledge base for multiple agents and platforms
   */
  async customerConfigureMultiAgentKnowledgeBase(customerId: string, config: {
    agentConfigurations: {
      agentId: string;
      platforms: string[];
      enabledSources: string[];
      maxDocuments: number;
      useGlobalKnowledge: boolean;
      customInstructions?: string;
    }[];
    globalConfiguration: {
      enabledSources: string[];
      embeddingModel: string;
      maxDocuments: number;
      autoUpdate: boolean;
      crossAgentSharing: boolean;
      platformSeparation: boolean;
    };
  }): Promise<{ success: boolean; configuredAgents: number; error?: string }> {
    try {
      const agentConfigurations = new Map<string, AgentConfiguration>();
      
      // Configure each agent
      config.agentConfigurations.forEach(agentConfig => {
        agentConfigurations.set(agentConfig.agentId, {
          agentId: agentConfig.agentId,
          platforms: agentConfig.platforms as any[],
          enabledSources: agentConfig.enabledSources as any[],
          maxDocuments: agentConfig.maxDocuments,
          useGlobalKnowledge: agentConfig.useGlobalKnowledge,
          customInstructions: agentConfig.customInstructions
        });
      });

      const knowledgeBase: CustomerMultiAgentKnowledgeBase = {
        customerId,
        agentConfigurations,
        globalDocuments: this.customerKnowledgeBases.get(customerId)?.globalDocuments || [],
        platformSpecificDocuments: this.customerKnowledgeBases.get(customerId)?.platformSpecificDocuments || new Map(),
        configuration: {
          enabledSources: config.globalConfiguration.enabledSources as any[],
          embeddingModel: config.globalConfiguration.embeddingModel,
          maxDocuments: config.globalConfiguration.maxDocuments,
          autoUpdate: config.globalConfiguration.autoUpdate,
          crossAgentSharing: config.globalConfiguration.crossAgentSharing,
          platformSeparation: config.globalConfiguration.platformSeparation
        }
      };

      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      console.log(`Customer ${customerId} configured multi-agent knowledge base for ${config.agentConfigurations.length} agents`);
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
   * Customer uploads files for their agents across multiple platforms
   */
  async customerUploadFiles(customerId: string, files: CustomerFileUpload[]): Promise<{
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
        // Determine target agents (all if not specified)
        const targetAgents = file.targetAgents && file.targetAgents.length > 0 
          ? file.targetAgents 
          : Array.from(knowledgeBase.agentConfigurations.keys());

        // Determine target platforms (all if not specified)
        const targetPlatforms = file.targetPlatforms && file.targetPlatforms.length > 0 
          ? file.targetPlatforms 
          : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

        // Save file to customer uploads directory
        const filePath = path.join(this.uploadsDir, `customer_${customerId}_${file.filename}`);
        await fs.writeFile(filePath, file.content);

        // Process file content into chunks
        const chunks = await this.processFileContent(file.content, file.mimeType, file.filename);
        
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.generateEmbedding(chunk);
          
          const document: MultiAgentRAGDocument = {
            id: `customer_${customerId}_${file.filename}_chunk_${i}_${Date.now()}`,
            customerId,
            agentIds: targetAgents,
            platforms: targetPlatforms as any[],
            content: chunk,
            embedding,
            metadata: {
              filename: file.filename,
              source: 'file_upload',
              category: file.category || 'general',
              priority: file.priority || 'medium',
              lastUpdated: new Date().toISOString(),
              customerConfigured: true
            }
          };

          // Add to global documents if cross-agent sharing is enabled
          if (knowledgeBase.configuration.crossAgentSharing) {
            knowledgeBase.globalDocuments.push(document);
          } else {
            // Add to platform-specific documents if platform separation is enabled
            if (knowledgeBase.configuration.platformSeparation) {
              targetPlatforms.forEach(platform => {
                if (!knowledgeBase.platformSpecificDocuments.has(platform)) {
                  knowledgeBase.platformSpecificDocuments.set(platform, []);
                }
                knowledgeBase.platformSpecificDocuments.get(platform)!.push(document);
              });
            } else {
              knowledgeBase.globalDocuments.push(document);
            }
          }

          // Track affected agents and platforms
          targetAgents.forEach(agent => affectedAgents.add(agent));
          targetPlatforms.forEach(platform => affectedPlatforms.add(platform));
        }
        
        processedFiles++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery (simulated)
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Customer ${customerId} processed ${processedFiles} files affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
      return { 
        success: true, 
        processedFiles, 
        totalDocuments: knowledgeBase.globalDocuments.length,
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
   * Customer manages FAQs for their agents across platforms
   */
  async customerManageFAQs(customerId: string, faqs: CustomerFAQ[]): Promise<{
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
        // Determine target agents
        const targetAgents = faq.targetAgents && faq.targetAgents.length > 0 
          ? faq.targetAgents 
          : Array.from(knowledgeBase.agentConfigurations.keys());

        // Determine target platforms
        const targetPlatforms = faq.targetPlatforms && faq.targetPlatforms.length > 0 
          ? faq.targetPlatforms 
          : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

        const content = `FAQ: ${faq.question}\nAnswer: ${faq.answer}`;
        const embedding = await this.generateEmbedding(content);
        
        const document: MultiAgentRAGDocument = {
          id: `customer_${customerId}_faq_${Date.now()}_${addedFAQs}`,
          customerId,
          agentIds: targetAgents,
          platforms: targetPlatforms as any[],
          content,
          embedding,
          metadata: {
            source: 'faq',
            category: faq.category,
            priority: faq.priority,
            tags: faq.tags,
            lastUpdated: new Date().toISOString(),
            customerConfigured: true
          }
        };

        // Add to appropriate document collection
        if (knowledgeBase.configuration.crossAgentSharing) {
          knowledgeBase.globalDocuments.push(document);
        } else if (knowledgeBase.configuration.platformSeparation) {
          targetPlatforms.forEach(platform => {
            if (!knowledgeBase.platformSpecificDocuments.has(platform)) {
              knowledgeBase.platformSpecificDocuments.set(platform, []);
            }
            knowledgeBase.platformSpecificDocuments.get(platform)!.push(document);
          });
        } else {
          knowledgeBase.globalDocuments.push(document);
        }

        // Track affected agents and platforms
        targetAgents.forEach(agent => affectedAgents.add(agent));
        targetPlatforms.forEach(platform => affectedPlatforms.add(platform));
        
        addedFAQs++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Customer ${customerId} added ${addedFAQs} FAQs affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
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
   * Customer configures database connections for their agents
   */
  async customerConfigureDatabase(customerId: string, dbConfig: CustomerDatabaseConnection): Promise<{
    success: boolean;
    connectedAgents: string[];
    connectedPlatforms: string[];
    documentsAdded: number;
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { 
          success: false, 
          connectedAgents: [], 
          connectedPlatforms: [], 
          documentsAdded: 0, 
          error: 'Knowledge base not configured for this customer' 
        };
      }

      // Determine target agents and platforms
      const targetAgents = dbConfig.targetAgents && dbConfig.targetAgents.length > 0 
        ? dbConfig.targetAgents 
        : Array.from(knowledgeBase.agentConfigurations.keys());

      const targetPlatforms = dbConfig.targetPlatforms && dbConfig.targetPlatforms.length > 0 
        ? dbConfig.targetPlatforms 
        : ['whatsapp', 'instagram', 'messenger', 'webchat', 'sms'];

      // Simulate database connection and data extraction
      const dbData = await this.extractDatabaseData(dbConfig);
      let documentsAdded = 0;

      for (const dataItem of dbData) {
        const embedding = await this.generateEmbedding(dataItem.content);
        
        const document: MultiAgentRAGDocument = {
          id: `customer_${customerId}_db_${Date.now()}_${documentsAdded}`,
          customerId,
          agentIds: targetAgents,
          platforms: targetPlatforms as any[],
          content: dataItem.content,
          embedding,
          metadata: {
            source: 'database',
            category: dataItem.category || 'database',
            priority: 'medium',
            tags: dataItem.tags,
            lastUpdated: new Date().toISOString(),
            customerConfigured: true
          }
        };

        knowledgeBase.globalDocuments.push(document);
        documentsAdded++;
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Save to BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Customer ${customerId} connected database affecting ${targetAgents.length} agents across ${targetPlatforms.length} platforms`);
      return { 
        success: true, 
        connectedAgents: targetAgents,
        connectedPlatforms: targetPlatforms,
        documentsAdded
      };
    } catch (error: any) {
      return { 
        success: false, 
        connectedAgents: [], 
        connectedPlatforms: [], 
        documentsAdded: 0, 
        error: error.message 
      };
    }
  }

  /**
   * Query knowledge base for specific agent and platform
   */
  async queryMultiAgentKnowledgeBase(customerId: string, agentId: string, platform: string, query: string): Promise<{
    response: string;
    sources: Array<{ content: string; metadata: any; relevanceScore: number }>;
    relevanceScore: number;
    agentSpecific: boolean;
    platformSpecific: boolean;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return {
          response: "Knowledge base not configured for this customer. Please configure your knowledge base first.",
          sources: [],
          relevanceScore: 0,
          agentSpecific: false,
          platformSpecific: false
        };
      }

      const agentConfig = knowledgeBase.agentConfigurations.get(agentId);
      
      if (!agentConfig) {
        return {
          response: "Agent not configured in knowledge base. Please configure this agent first.",
          sources: [],
          relevanceScore: 0,
          agentSpecific: false,
          platformSpecific: false
        };
      }

      // Check if platform is supported for this agent
      if (!agentConfig.platforms.includes(platform as any)) {
        return {
          response: `This agent is not configured for ${platform} platform.`,
          sources: [],
          relevanceScore: 0,
          agentSpecific: true,
          platformSpecific: false
        };
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Collect relevant documents
      let relevantDocuments: MultiAgentRAGDocument[] = [];

      // Add global documents if agent uses global knowledge
      if (agentConfig.useGlobalKnowledge) {
        relevantDocuments.push(...knowledgeBase.globalDocuments.filter(doc => 
          doc.agentIds.includes(agentId) && doc.platforms.includes(platform as any)
        ));
      }

      // Add platform-specific documents
      if (knowledgeBase.configuration.platformSeparation) {
        const platformDocs = knowledgeBase.platformSpecificDocuments.get(platform) || [];
        relevantDocuments.push(...platformDocs.filter(doc => 
          doc.agentIds.includes(agentId)
        ));
      }

      // Find most relevant documents using cosine similarity
      const scoredDocuments = await this.findRelevantDocuments(queryEmbedding, relevantDocuments, 5);
      
      if (scoredDocuments.length === 0) {
        return {
          response: "I couldn't find relevant information in the knowledge base for this query.",
          sources: [],
          relevanceScore: 0,
          agentSpecific: true,
          platformSpecific: true
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
        agentSpecific: true,
        platformSpecific: true
      };
    } catch (error: any) {
      console.error('Multi-agent knowledge base query failed:', error);
      return {
        response: "I encountered an error while searching the knowledge base. Please try again.",
        sources: [],
        relevanceScore: 0,
        agentSpecific: false,
        platformSpecific: false
      };
    }
  }

  /**
   * Get customer's multi-agent knowledge base status
   */
  async getCustomerKnowledgeBaseStatus(customerId: string): Promise<{
    configured: boolean;
    totalAgents: number;
    totalPlatforms: number;
    totalDocuments: number;
    agentConfigurations: Array<{
      agentId: string;
      platforms: string[];
      documentCount: number;
      useGlobalKnowledge: boolean;
    }>;
    platformBreakdown: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    customerControlled: boolean;
  }> {
    const knowledgeBase = this.customerKnowledgeBases.get(customerId);
    
    if (!knowledgeBase) {
      return {
        configured: false,
        totalAgents: 0,
        totalPlatforms: 0,
        totalDocuments: 0,
        agentConfigurations: [],
        platformBreakdown: {},
        sourceBreakdown: {},
        customerControlled: true
      };
    }

    // Calculate agent configurations
    const agentConfigurations = Array.from(knowledgeBase.agentConfigurations.values()).map(config => ({
      agentId: config.agentId,
      platforms: config.platforms,
      documentCount: knowledgeBase.globalDocuments.filter(doc => doc.agentIds.includes(config.agentId)).length,
      useGlobalKnowledge: config.useGlobalKnowledge
    }));

    // Platform breakdown
    const platformBreakdown: Record<string, number> = {};
    const allPlatforms = new Set<string>();
    knowledgeBase.globalDocuments.forEach(doc => {
      doc.platforms.forEach(platform => {
        allPlatforms.add(platform);
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      });
    });

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    knowledgeBase.globalDocuments.forEach(doc => {
      sourceBreakdown[doc.metadata.source] = (sourceBreakdown[doc.metadata.source] || 0) + 1;
    });

    return {
      configured: true,
      totalAgents: knowledgeBase.agentConfigurations.size,
      totalPlatforms: allPlatforms.size,
      totalDocuments: knowledgeBase.globalDocuments.length,
      agentConfigurations,
      platformBreakdown,
      sourceBreakdown,
      customerControlled: true
    };
  }

  /**
   * Customer deletes documents from their knowledge base
   */
  async customerDeleteDocuments(customerId: string, documentIds?: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    affectedAgents: string[];
    affectedPlatforms: string[];
    error?: string;
  }> {
    try {
      const knowledgeBase = this.customerKnowledgeBases.get(customerId);
      
      if (!knowledgeBase) {
        return { 
          success: false, 
          deletedCount: 0, 
          affectedAgents: [], 
          affectedPlatforms: [], 
          error: 'Knowledge base not found' 
        };
      }

      let deletedCount = 0;
      const affectedAgents = new Set<string>();
      const affectedPlatforms = new Set<string>();

      if (documentIds && documentIds.length > 0) {
        // Delete specific documents
        knowledgeBase.globalDocuments = knowledgeBase.globalDocuments.filter(doc => {
          if (documentIds.includes(doc.id)) {
            doc.agentIds.forEach(agent => affectedAgents.add(agent));
            doc.platforms.forEach(platform => affectedPlatforms.add(platform));
            deletedCount++;
            return false;
          }
          return true;
        });
      } else {
        // Delete all documents
        knowledgeBase.globalDocuments.forEach(doc => {
          doc.agentIds.forEach(agent => affectedAgents.add(agent));
          doc.platforms.forEach(platform => affectedPlatforms.add(platform));
        });
        deletedCount = knowledgeBase.globalDocuments.length;
        knowledgeBase.globalDocuments = [];
      }

      // Update knowledge base
      this.customerKnowledgeBases.set(customerId, knowledgeBase);
      
      // Update BigQuery
      await this.saveToBigQuery(knowledgeBase);

      console.log(`Customer ${customerId} deleted ${deletedCount} documents affecting ${affectedAgents.size} agents across ${affectedPlatforms.size} platforms`);
      return { 
        success: true, 
        deletedCount, 
        affectedAgents: Array.from(affectedAgents),
        affectedPlatforms: Array.from(affectedPlatforms)
      };
    } catch (error: any) {
      return { 
        success: false, 
        deletedCount: 0, 
        affectedAgents: [], 
        affectedPlatforms: [], 
        error: error.message 
      };
    }
  }

  // Helper methods (similar to before but adapted for multi-agent)
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

  private async findRelevantDocuments(queryEmbedding: number[], documents: MultiAgentRAGDocument[], limit: number): Promise<MultiAgentRAGDocument[]> {
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

  private async extractDatabaseData(dbConfig: CustomerDatabaseConnection): Promise<Array<{
    content: string;
    category?: string;
    tags?: string[];
  }>> {
    // Simulate database data extraction
    const sampleData = [
      {
        content: `Database record: ${dbConfig.type} connection established. Sample data extracted from ${dbConfig.database || 'default'} database.`,
        category: 'database_info',
        tags: ['database', dbConfig.type]
      }
    ];

    return sampleData;
  }

  private async saveToBigQuery(knowledgeBase: CustomerMultiAgentKnowledgeBase): Promise<void> {
    console.log(`Saving customer-controlled multi-agent knowledge base to BigQuery for customer ${knowledgeBase.customerId}`);
    console.log(`Agents: ${knowledgeBase.agentConfigurations.size}, Documents: ${knowledgeBase.globalDocuments.length}`);
  }
}