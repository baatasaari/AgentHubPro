/**
 * BigQuery Persistent Storage Implementation
 * Replaces global dictionaries with BigQuery-backed storage
 * Provides serverless, auto-scaling data operations
 */

import { BigQuery } from '@google-cloud/bigquery';

export class BigQueryStorage {
  private bigquery: BigQuery;
  private datasetId: string = 'agenthub_production';
  private isConnected = false;

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      this.bigquery = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'agenthub-production',
        // Credentials auto-detected from environment
      });

      // Test connection
      await this.bigquery.query('SELECT 1 as test');
      this.isConnected = true;
      
      console.log('✅ BigQuery persistent storage connected');
    } catch (error) {
      console.error('❌ Failed to connect to BigQuery:', error.message);
      throw error;
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Agent Management Operations (replaces agents = {} dictionary)
  async createAgent(agentData: any) {
    try {
      const agent = {
        id: this.generateId(),
        organization_id: agentData.organizationId || '1',
        name: agentData.name,
        industry: agentData.industry,
        description: agentData.description,
        configuration: agentData.configuration || {},
        status: agentData.status || 'active',
        rag_enabled: agentData.ragEnabled || false,
        rag_config: agentData.ragConfig || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('agents');
      await table.insert([agent]);

      console.log('✅ Agent created in BigQuery:', agent.id);
      return agent;
    } catch (error) {
      console.error('❌ Failed to create agent:', error.message);
      throw error;
    }
  }

  async getAgent(agentId: string) {
    try {
      const query = `
        SELECT * FROM \`${this.datasetId}.agents\`
        WHERE id = @agentId
        LIMIT 1
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { agentId },
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get agent:', error.message);
      throw error;
    }
  }

  async getAllAgents(organizationId: string = '1') {
    try {
      const query = `
        SELECT * FROM \`${this.datasetId}.agents\`
        WHERE organization_id = @organizationId
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { organizationId },
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows;
    } catch (error) {
      console.error('❌ Failed to get agents:', error.message);
      throw error;
    }
  }

  async updateAgent(agentId: string, updates: any) {
    try {
      // BigQuery doesn't support UPDATE, so we use MERGE (upsert)
      const mergeQuery = `
        MERGE \`${this.datasetId}.agents\` AS target
        USING (
          SELECT 
            @agentId as id,
            @name as name,
            @industry as industry,
            @description as description,
            @configuration as configuration,
            @status as status,
            @ragEnabled as rag_enabled,
            @ragConfig as rag_config,
            CURRENT_TIMESTAMP() as updated_at
        ) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET 
            name = source.name,
            industry = source.industry,
            description = source.description,
            configuration = source.configuration,
            status = source.status,
            rag_enabled = source.rag_enabled,
            rag_config = source.rag_config,
            updated_at = source.updated_at
      `;

      const [job] = await this.bigquery.createQueryJob({
        query: mergeQuery,
        params: {
          agentId,
          name: updates.name,
          industry: updates.industry,
          description: updates.description,
          configuration: updates.configuration,
          status: updates.status,
          ragEnabled: updates.ragEnabled,
          ragConfig: updates.ragConfig
        },
        location: 'US',
      });

      await job.getQueryResults();
      console.log('✅ Agent updated in BigQuery:', agentId);
      
      // Return updated agent
      return await this.getAgent(agentId);
    } catch (error) {
      console.error('❌ Failed to update agent:', error.message);
      throw error;
    }
  }

  async deleteAgent(agentId: string) {
    try {
      const query = `
        DELETE FROM \`${this.datasetId}.agents\`
        WHERE id = @agentId
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { agentId },
        location: 'US',
      });

      await job.getQueryResults();
      console.log('✅ Agent deleted from BigQuery:', agentId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete agent:', error.message);
      throw error;
    }
  }

  // Analytics Operations (replaces analytics_data = {} dictionary)
  async trackEvent(eventData: any) {
    try {
      const event = {
        id: this.generateId(),
        organization_id: eventData.organizationId || '1',
        event_type: eventData.eventType,
        event_data: eventData.eventData || {},
        user_id: eventData.userId,
        session_id: eventData.sessionId,
        metadata: eventData.metadata || {},
        created_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('analytics_events');
      await table.insert([event]);

      return event;
    } catch (error) {
      console.error('❌ Failed to track event:', error.message);
      throw error;
    }
  }

  async getAnalyticsEvents(organizationId: string = '1', eventType?: string, limit: number = 100) {
    try {
      let query = `
        SELECT * FROM \`${this.datasetId}.analytics_events\`
        WHERE organization_id = @organizationId
      `;
      
      const params: any = { organizationId, limit };

      if (eventType) {
        query += ' AND event_type = @eventType';
        params.eventType = eventType;
      }

      query += ' ORDER BY created_at DESC LIMIT @limit';

      const [job] = await this.bigquery.createQueryJob({
        query,
        params,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows;
    } catch (error) {
      console.error('❌ Failed to get analytics events:', error.message);
      throw error;
    }
  }

  // Payment Operations (replaces payment_intents = {}, transactions = {} dictionaries)
  async createPaymentTransaction(txnData: any) {
    try {
      const transaction = {
        id: this.generateId(),
        organization_id: txnData.organizationId || '1',
        transaction_id: txnData.transactionId,
        amount: txnData.amount,
        currency: txnData.currency || 'USD',
        payment_method: txnData.paymentMethod,
        status: txnData.status,
        customer_details: txnData.customerDetails || {},
        metadata: txnData.metadata || {},
        gateway_response: txnData.gatewayResponse || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('payment_transactions');
      await table.insert([transaction]);

      console.log('✅ Payment transaction created in BigQuery:', transaction.id);
      return transaction;
    } catch (error) {
      console.error('❌ Failed to create payment transaction:', error.message);
      throw error;
    }
  }

  async getPaymentTransaction(transactionId: string) {
    try {
      const query = `
        SELECT * FROM \`${this.datasetId}.payment_transactions\`
        WHERE transaction_id = @transactionId
        LIMIT 1
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { transactionId },
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get payment transaction:', error.message);
      throw error;
    }
  }

  // RAG/Knowledge Base Operations (replaces knowledge_base = {}, documents_store = {} dictionaries)
  async addDocument(docData: any) {
    try {
      const document = {
        id: this.generateId(),
        organization_id: docData.organizationId || '1',
        title: docData.title,
        content: docData.content,
        category: docData.category || 'general',
        embeddings: docData.embeddings || [],
        metadata: docData.metadata || {},
        chunk_count: docData.chunkCount || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('rag_documents');
      await table.insert([document]);

      console.log('✅ Document added to BigQuery knowledge base:', document.id);
      return document;
    } catch (error) {
      console.error('❌ Failed to add document:', error.message);
      throw error;
    }
  }

  async searchDocuments(organizationId: string = '1', query?: string, category?: string) {
    try {
      let sqlQuery = `
        SELECT * FROM \`${this.datasetId}.rag_documents\`
        WHERE organization_id = @organizationId
      `;
      
      const params: any = { organizationId };

      if (category) {
        sqlQuery += ' AND category = @category';
        params.category = category;
      }

      if (query) {
        sqlQuery += ' AND SEARCH(content, @searchQuery)';
        params.searchQuery = query;
      }

      sqlQuery += ' ORDER BY created_at DESC LIMIT 50';

      const [job] = await this.bigquery.createQueryJob({
        query: sqlQuery,
        params,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows;
    } catch (error) {
      console.error('❌ Failed to search documents:', error.message);
      throw error;
    }
  }

  // Conversation Operations (replaces conversations = {} dictionary)
  async createConversation(convData: any) {
    try {
      const conversation = {
        id: this.generateId(),
        organization_id: convData.organizationId || '1',
        agent_id: convData.agentId,
        user_id: convData.userId,
        session_id: convData.sessionId,
        messages: convData.messages || [],
        status: convData.status || 'active',
        channel: convData.channel || 'web_chat',
        metadata: convData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('conversations');
      await table.insert([conversation]);

      console.log('✅ Conversation created in BigQuery:', conversation.id);
      return conversation;
    } catch (error) {
      console.error('❌ Failed to create conversation:', error.message);
      throw error;
    }
  }

  async getConversation(conversationId: string) {
    try {
      const query = `
        SELECT * FROM \`${this.datasetId}.conversations\`
        WHERE id = @conversationId
        LIMIT 1
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { conversationId },
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get conversation:', error.message);
      throw error;
    }
  }

  // Embeddings Cache Operations (replaces embeddings_cache = {} dictionary)
  async getCachedEmbedding(textHash: string, model: string) {
    try {
      const query = `
        SELECT * FROM \`${this.datasetId}.embeddings_cache\`
        WHERE text_hash = @textHash AND model = @model
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP())
        LIMIT 1
      `;

      const [job] = await this.bigquery.createQueryJob({
        query,
        params: { textHash, model },
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get cached embedding:', error.message);
      return null;
    }
  }

  async cacheEmbedding(textHash: string, model: string, embeddings: number[], costEstimate?: number) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

      const cached = {
        id: this.generateId(),
        text_hash: textHash,
        model,
        embeddings,
        dimensions: embeddings.length,
        cost_estimate: costEstimate || 0,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('embeddings_cache');
      await table.insert([cached]);

      return cached;
    } catch (error) {
      console.error('❌ Failed to cache embedding:', error.message);
      throw error;
    }
  }

  // System Metrics Operations (replaces various metrics dictionaries)
  async recordMetric(serviceName: string, metricType: string, value: number, metadata?: any) {
    try {
      const metric = {
        id: this.generateId(),
        service_name: serviceName,
        metric_type: metricType,
        metric_value: value,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };

      const table = this.bigquery.dataset(this.datasetId).table('system_metrics');
      await table.insert([metric]);

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

      let query = `
        SELECT * FROM \`${this.datasetId}.system_metrics\`
        WHERE created_at >= @since
      `;
      
      const params: any = { since: since.toISOString() };

      if (serviceName) {
        query += ' AND service_name = @serviceName';
        params.serviceName = serviceName;
      }

      if (metricType) {
        query += ' AND metric_type = @metricType';
        params.metricType = metricType;
      }

      query += ' ORDER BY created_at DESC LIMIT 1000';

      const [job] = await this.bigquery.createQueryJob({
        query,
        params,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows;
    } catch (error) {
      console.error('❌ Failed to get metrics:', error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const query = `
        SELECT 
          CURRENT_TIMESTAMP() as timestamp,
          @@project_id as project_id,
          '${this.datasetId}' as dataset_id
      `;
      
      const [job] = await this.bigquery.createQueryJob({
        query,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      
      return {
        status: 'healthy',
        database: 'bigquery',
        connected: this.isConnected,
        timestamp: rows[0]?.timestamp,
        project_id: rows[0]?.project_id,
        dataset_id: rows[0]?.dataset_id
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'bigquery',
        connected: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const bigQueryStorage = new BigQueryStorage();
export default bigQueryStorage;
export { BigQueryStorage };