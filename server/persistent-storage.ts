/**
 * Persistent Storage Implementation
 * Replaces global dictionaries with PostgreSQL-backed storage
 * Provides thread-safe, persistent data operations
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export class PersistentStorage {
  private pool: Pool;
  private db: any;
  private isConnected = false;

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum number of connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.db = drizzle(this.pool, { schema });
      
      // Test connection
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      
      console.log('✅ PostgreSQL persistent storage connected');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      throw error;
    }
  }

  // Agent Management Operations (replaces agents = {} dictionary)
  async createAgent(agentData: any) {
    try {
      const [agent] = await this.db.insert(schema.agents).values({
        organizationId: agentData.organizationId || 1,
        name: agentData.name,
        industry: agentData.industry,
        description: agentData.description,
        businessInfo: agentData.businessInfo || {},
        aiConfig: agentData.aiConfig || {},
        interfaceConfig: agentData.interfaceConfig || {},
        status: agentData.status || 'active',
        ragEnabled: agentData.ragEnabled || false,
        ragConfig: agentData.ragConfig || {}
      }).returning();

      console.log('✅ Agent created in persistent storage:', agent.id);
      return agent;
    } catch (error) {
      console.error('❌ Failed to create agent:', error.message);
      throw error;
    }
  }

  async getAgent(agentId: number) {
    try {
      const [agent] = await this.db.select().from(schema.agents)
        .where(eq(schema.agents.id, agentId));
      return agent;
    } catch (error) {
      console.error('❌ Failed to get agent:', error.message);
      throw error;
    }
  }

  async getAllAgents(organizationId: number = 1) {
    try {
      const agents = await this.db.select().from(schema.agents)
        .where(eq(schema.agents.organizationId, organizationId))
        .orderBy(desc(schema.agents.createdAt));
      return agents;
    } catch (error) {
      console.error('❌ Failed to get agents:', error.message);
      throw error;
    }
  }

  async updateAgent(agentId: number, updates: any) {
    try {
      const [updatedAgent] = await this.db.update(schema.agents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.agents.id, agentId))
        .returning();
      
      console.log('✅ Agent updated in persistent storage:', agentId);
      return updatedAgent;
    } catch (error) {
      console.error('❌ Failed to update agent:', error.message);
      throw error;
    }
  }

  async deleteAgent(agentId: number) {
    try {
      await this.db.delete(schema.agents)
        .where(eq(schema.agents.id, agentId));
      
      console.log('✅ Agent deleted from persistent storage:', agentId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete agent:', error.message);
      throw error;
    }
  }

  // Analytics Operations (replaces analytics_data = {} dictionary)
  async trackEvent(eventData: any) {
    try {
      const [event] = await this.db.insert(schema.analyticsEvents).values({
        organizationId: eventData.organizationId || 1,
        eventType: eventData.eventType,
        eventData: eventData.eventData || {},
        userId: eventData.userId,
        sessionId: eventData.sessionId,
        metadata: eventData.metadata || {}
      }).returning();

      return event;
    } catch (error) {
      console.error('❌ Failed to track event:', error.message);
      throw error;
    }
  }

  async getAnalyticsEvents(organizationId: number = 1, eventType?: string, limit: number = 100) {
    try {
      let query = this.db.select().from(schema.analyticsEvents)
        .where(eq(schema.analyticsEvents.organizationId, organizationId));

      if (eventType) {
        query = query.where(and(
          eq(schema.analyticsEvents.organizationId, organizationId),
          eq(schema.analyticsEvents.eventType, eventType)
        ));
      }

      const events = await query
        .orderBy(desc(schema.analyticsEvents.createdAt))
        .limit(limit);

      return events;
    } catch (error) {
      console.error('❌ Failed to get analytics events:', error.message);
      throw error;
    }
  }

  // Payment Operations (replaces payment_intents = {}, transactions = {} dictionaries)
  async createPaymentTransaction(txnData: any) {
    try {
      const [transaction] = await this.db.insert(schema.paymentTransactions).values({
        organizationId: txnData.organizationId || 1,
        transactionId: txnData.transactionId,
        amount: txnData.amount,
        currency: txnData.currency || 'USD',
        paymentMethod: txnData.paymentMethod,
        status: txnData.status,
        customerDetails: txnData.customerDetails || {},
        metadata: txnData.metadata || {},
        gatewayResponse: txnData.gatewayResponse || {}
      }).returning();

      console.log('✅ Payment transaction created:', transaction.id);
      return transaction;
    } catch (error) {
      console.error('❌ Failed to create payment transaction:', error.message);
      throw error;
    }
  }

  async getPaymentTransaction(transactionId: string) {
    try {
      const [transaction] = await this.db.select().from(schema.paymentTransactions)
        .where(eq(schema.paymentTransactions.transactionId, transactionId));
      return transaction;
    } catch (error) {
      console.error('❌ Failed to get payment transaction:', error.message);
      throw error;
    }
  }

  async updatePaymentStatus(transactionId: string, status: string, gatewayResponse?: any) {
    try {
      const updateData: any = { status, updatedAt: new Date() };
      if (gatewayResponse) {
        updateData.gatewayResponse = gatewayResponse;
      }

      const [updatedTransaction] = await this.db.update(schema.paymentTransactions)
        .set(updateData)
        .where(eq(schema.paymentTransactions.transactionId, transactionId))
        .returning();

      console.log('✅ Payment status updated:', transactionId, status);
      return updatedTransaction;
    } catch (error) {
      console.error('❌ Failed to update payment status:', error.message);
      throw error;
    }
  }

  // RAG/Knowledge Base Operations (replaces knowledge_base = {}, documents_store = {} dictionaries)
  async addDocument(docData: any) {
    try {
      const [document] = await this.db.insert(schema.ragDocuments).values({
        organizationId: docData.organizationId || 1,
        title: docData.title,
        content: docData.content,
        category: docData.category || 'general',
        embeddings: docData.embeddings ? JSON.stringify(docData.embeddings) : null,
        metadata: docData.metadata || {},
        chunkCount: docData.chunkCount || 1
      }).returning();

      console.log('✅ Document added to knowledge base:', document.id);
      return document;
    } catch (error) {
      console.error('❌ Failed to add document:', error.message);
      throw error;
    }
  }

  async searchDocuments(organizationId: number = 1, query?: string, category?: string) {
    try {
      let dbQuery = this.db.select().from(schema.ragDocuments)
        .where(eq(schema.ragDocuments.organizationId, organizationId));

      if (category) {
        dbQuery = dbQuery.where(and(
          eq(schema.ragDocuments.organizationId, organizationId),
          eq(schema.ragDocuments.category, category)
        ));
      }

      // Add text search if query provided (PostgreSQL full-text search)
      if (query) {
        // Simple text search - can be enhanced with full-text search indexes
        dbQuery = dbQuery.where(and(
          eq(schema.ragDocuments.organizationId, organizationId),
          // Using ILIKE for case-insensitive search
          sql`${schema.ragDocuments.content} ILIKE ${'%' + query + '%'}`
        ));
      }

      const documents = await dbQuery
        .orderBy(desc(schema.ragDocuments.createdAt))
        .limit(50);

      return documents;
    } catch (error) {
      console.error('❌ Failed to search documents:', error.message);
      throw error;
    }
  }

  // Conversation Operations (replaces conversations = {} dictionary)
  async createConversation(convData: any) {
    try {
      const [conversation] = await this.db.insert(schema.conversations).values({
        organizationId: convData.organizationId || 1,
        agentId: convData.agentId,
        userId: convData.userId,
        sessionId: convData.sessionId,
        messages: convData.messages || [],
        status: convData.status || 'active',
        channel: convData.channel || 'web_chat',
        metadata: convData.metadata || {}
      }).returning();

      console.log('✅ Conversation created:', conversation.id);
      return conversation;
    } catch (error) {
      console.error('❌ Failed to create conversation:', error.message);
      throw error;
    }
  }

  async addMessage(conversationId: number, message: any) {
    try {
      // Get current conversation
      const [conversation] = await this.db.select().from(schema.conversations)
        .where(eq(schema.conversations.id, conversationId));

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Add new message to messages array
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      messages.push({
        ...message,
        timestamp: new Date().toISOString()
      });

      // Update conversation with new messages
      const [updatedConversation] = await this.db.update(schema.conversations)
        .set({ 
          messages: messages,
          updatedAt: new Date()
        })
        .where(eq(schema.conversations.id, conversationId))
        .returning();

      console.log('✅ Message added to conversation:', conversationId);
      return updatedConversation;
    } catch (error) {
      console.error('❌ Failed to add message:', error.message);
      throw error;
    }
  }

  async getConversation(conversationId: number) {
    try {
      const [conversation] = await this.db.select().from(schema.conversations)
        .where(eq(schema.conversations.id, conversationId));
      return conversation;
    } catch (error) {
      console.error('❌ Failed to get conversation:', error.message);
      throw error;
    }
  }

  // Embeddings Cache Operations (replaces embeddings_cache = {} dictionary)
  async getCachedEmbedding(textHash: string, model: string) {
    try {
      const [cached] = await this.db.select().from(schema.embeddingsCache)
        .where(and(
          eq(schema.embeddingsCache.textHash, textHash),
          eq(schema.embeddingsCache.model, model)
        ));

      if (cached && cached.expiresAt && new Date() > cached.expiresAt) {
        // Cache expired, delete it
        await this.db.delete(schema.embeddingsCache)
          .where(eq(schema.embeddingsCache.id, cached.id));
        return null;
      }

      return cached;
    } catch (error) {
      console.error('❌ Failed to get cached embedding:', error.message);
      return null;
    }
  }

  async cacheEmbedding(textHash: string, model: string, embeddings: number[], costEstimate?: number) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

      const [cached] = await this.db.insert(schema.embeddingsCache).values({
        textHash,
        model,
        embeddings: JSON.stringify(embeddings),
        dimensions: embeddings.length,
        costEstimate: costEstimate || 0,
        expiresAt
      }).returning();

      return cached;
    } catch (error) {
      console.error('❌ Failed to cache embedding:', error.message);
      throw error;
    }
  }

  // System Metrics Operations (replaces various metrics dictionaries)
  async recordMetric(serviceName: string, metricType: string, value: number, metadata?: any) {
    try {
      const [metric] = await this.db.insert(schema.systemMetrics).values({
        serviceName,
        metricType,
        metricValue: value,
        metadata: metadata || {}
      }).returning();

      return metric;
    } catch (error) {
      console.error('❌ Failed to record metric:', error.message);
      throw error;
    }
  }

  async getMetrics(serviceName?: string, metricType?: string, hours: number = 24) {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      let query = this.db.select().from(schema.systemMetrics)
        .where(sql`${schema.systemMetrics.createdAt} >= ${since}`);

      if (serviceName) {
        query = query.where(and(
          sql`${schema.systemMetrics.createdAt} >= ${since}`,
          eq(schema.systemMetrics.serviceName, serviceName)
        ));
      }

      if (metricType) {
        query = query.where(and(
          sql`${schema.systemMetrics.createdAt} >= ${since}`,
          eq(schema.systemMetrics.metricType, metricType)
        ));
      }

      const metrics = await query
        .orderBy(desc(schema.systemMetrics.createdAt))
        .limit(1000);

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get metrics:', error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT NOW() as timestamp, version() as version');
      return {
        status: 'healthy',
        database: 'postgresql',
        connected: this.isConnected,
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].version
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'postgresql',
        connected: false,
        error: error.message
      };
    }
  }

  // Cleanup connections
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ PostgreSQL connection closed');
    }
  }
}

// Export singleton instance
const persistentStorage = new PersistentStorage();
export default persistentStorage;
export { PersistentStorage };