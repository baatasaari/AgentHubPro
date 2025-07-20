import { agents, conversations, type Agent, type InsertAgent, type Conversation, type InsertConversation } from "@shared/schema";
import { BigQuery } from '@google-cloud/bigquery';
import { databaseConfig, isDatabaseConfigured, validateDatabaseConfig } from './config';

export interface IStorage {
  // Agent operations
  getAgent(id: number): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  updateAgentStatus(id: number, status: string): Promise<Agent | undefined>;

  // Conversation operations
  getConversationsByAgent(agentId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUsageStats(): Promise<{
    totalConversations: number;
    totalCost: number;
    activeAgents: number;
    monthlyUsage: { agentId: number; conversations: number; cost: number }[];
  }>;
}

export class MemStorage implements IStorage {
  private agents: Map<number, Agent>;
  private conversations: Map<number, Conversation>;
  private currentAgentId: number;
  private currentConversationId: number;

  constructor() {
    this.agents = new Map();
    this.conversations = new Map();
    this.currentAgentId = 1;
    this.currentConversationId = 1;

    // Add some sample data for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleAgents: Agent[] = [
      {
        id: 1,
        businessName: "HealthCare Assistant",
        businessDescription: "AI assistant for healthcare providers to help patients with appointment scheduling, basic health information, and general inquiries.",
        businessDomain: "https://healthcare-example.com",
        industry: "healthcare",
        llmModel: "gpt-4-turbo",
        interfaceType: "webchat",
        status: "active",
        createdAt: new Date("2024-11-01"),
      },
      {
        id: 2,
        businessName: "E-commerce Helper",
        businessDescription: "Customer service bot for online retail store to assist with product information, order tracking, and returns.",
        businessDomain: "https://shop-example.com",
        industry: "retail",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp",
        status: "active",
        createdAt: new Date("2024-11-15"),
      },
      {
        id: 3,
        businessName: "Realty Assistant",
        businessDescription: "Real estate agent assistant to help clients with property information, scheduling viewings, and market insights.",
        businessDomain: "https://realty-example.com",
        industry: "realestate",
        llmModel: "claude-3-sonnet",
        interfaceType: "webchat",
        status: "draft",
        createdAt: new Date("2024-12-01"),
      },
    ];

    sampleAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    this.currentAgentId = Math.max(...sampleAgents.map(a => a.id)) + 1;

    // Add sample conversations
    const sampleConversations: Conversation[] = [
      { id: 1, agentId: 1, tokens: 2500, cost: "0.025", createdAt: new Date("2024-12-15") },
      { id: 2, agentId: 1, tokens: 1800, cost: "0.018", createdAt: new Date("2024-12-15") },
      { id: 3, agentId: 2, tokens: 1200, cost: "0.0024", createdAt: new Date("2024-12-14") },
      { id: 4, agentId: 2, tokens: 900, cost: "0.0018", createdAt: new Date("2024-12-14") },
    ];

    sampleConversations.forEach(conv => {
      this.conversations.set(conv.id, conv);
    });

    this.currentConversationId = Math.max(...sampleConversations.map(c => c.id)) + 1;
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.currentAgentId++;
    const agent: Agent = {
      ...insertAgent,
      id,
      status: 'draft',
      createdAt: new Date(),
      businessDomain: insertAgent.businessDomain || null,
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.agents.set(id, updated);
    return updated;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, status };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getConversationsByAgent(agentId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(c => c.agentId === agentId);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getUsageStats(): Promise<{
    totalConversations: number;
    totalCost: number;
    activeAgents: number;
    monthlyUsage: { agentId: number; conversations: number; cost: number }[];
  }> {
    const allConversations = Array.from(this.conversations.values());
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status === 'active').length;
    
    const totalConversations = allConversations.length;
    const totalCost = allConversations.reduce((sum, conv) => sum + parseFloat(conv.cost), 0);

    const monthlyUsage = Array.from(this.agents.values()).map(agent => {
      const agentConversations = allConversations.filter(c => c.agentId === agent.id);
      return {
        agentId: agent.id,
        conversations: agentConversations.length,
        cost: agentConversations.reduce((sum, conv) => sum + parseFloat(conv.cost), 0),
      };
    });

    return {
      totalConversations,
      totalCost,
      activeAgents,
      monthlyUsage,
    };
  }
}

export class BigQueryStorage implements IStorage {
  private bigquery: BigQuery;
  private config: typeof databaseConfig;

  constructor() {
    // Validate configuration before initializing
    const configErrors = validateDatabaseConfig();
    if (configErrors.length > 0) {
      throw new Error(`BigQuery configuration errors: ${configErrors.join(', ')}`);
    }

    this.config = databaseConfig;
    
    this.bigquery = new BigQuery({
      projectId: this.config.projectId,
      keyFilename: this.config.keyFilename,
      location: this.config.location,
    });
    
    if (this.config.logQueries) {
      console.log('BigQuery configured with:', {
        projectId: this.config.projectId,
        dataset: this.config.dataset,
        location: this.config.location,
        agentsTable: this.config.agentsTable,
        conversationsTable: this.config.conversationsTable,
      });
    }
    
    // Initialize tables and sample data
    this.initializeTables();
  }

  private async initializeTables() {
    try {
      // Create dataset if it doesn't exist
      const [datasets] = await this.bigquery.getDatasets();
      const datasetExists = datasets.some(ds => ds.id === this.config.dataset);
      
      if (!datasetExists) {
        await this.bigquery.createDataset(this.config.dataset, {
          location: this.config.location,
        });
        console.log(`Created dataset: ${this.config.dataset}`);
      }

      const dataset = this.bigquery.dataset(this.config.dataset);

      // Create agents table if it doesn't exist
      const agentsTableRef = dataset.table(this.config.agentsTable);
      const [agentsExists] = await agentsTableRef.exists();
      
      if (!agentsExists) {
        await agentsTableRef.create({
          schema: [
            { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
            { name: 'businessName', type: 'STRING', mode: 'REQUIRED' },
            { name: 'businessDescription', type: 'STRING', mode: 'REQUIRED' },
            { name: 'businessDomain', type: 'STRING', mode: 'NULLABLE' },
            { name: 'industry', type: 'STRING', mode: 'REQUIRED' },
            { name: 'llmModel', type: 'STRING', mode: 'REQUIRED' },
            { name: 'interfaceType', type: 'STRING', mode: 'REQUIRED' },
            { name: 'status', type: 'STRING', mode: 'REQUIRED' },
            { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        });
        console.log(`Created table: ${this.config.agentsTable}`);
        
        // Insert sample data if enabled
        if (this.config.enableSampleData) {
          await this.insertSampleAgents();
        }
      }

      // Create conversations table if it doesn't exist
      const conversationsTableRef = dataset.table(this.config.conversationsTable);
      const [conversationsExists] = await conversationsTableRef.exists();
      
      if (!conversationsExists) {
        await conversationsTableRef.create({
          schema: [
            { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
            { name: 'agentId', type: 'INTEGER', mode: 'REQUIRED' },
            { name: 'tokens', type: 'INTEGER', mode: 'REQUIRED' },
            { name: 'cost', type: 'STRING', mode: 'REQUIRED' },
            { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        });
        console.log(`Created table: ${this.config.conversationsTable}`);
        
        // Insert sample data if enabled
        if (this.config.enableSampleData) {
          await this.insertSampleConversations();
        }
      }
    } catch (error) {
      console.error('Error initializing BigQuery tables:', error);
    }
  }

  private async insertSampleAgents() {
    const sampleAgents = [
      {
        id: 1,
        businessName: "HealthCare Assistant",
        businessDescription: "AI assistant for healthcare providers to help patients with appointment scheduling, basic health information, and general inquiries.",
        businessDomain: "https://healthcare-example.com",
        industry: "healthcare",
        llmModel: "gpt-4-turbo",
        interfaceType: "webchat",
        status: "active",
        createdAt: new Date("2024-11-01").toISOString(),
      },
      {
        id: 2,
        businessName: "E-commerce Helper",
        businessDescription: "Customer service bot for online retail store to assist with product information, order tracking, and returns.",
        businessDomain: "https://shop-example.com",
        industry: "retail",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp",
        status: "active",
        createdAt: new Date("2024-11-15").toISOString(),
      },
      {
        id: 3,
        businessName: "Realty Assistant",
        businessDescription: "Real estate agent assistant to help clients with property information, scheduling viewings, and market insights.",
        businessDomain: "https://realty-example.com",
        industry: "realestate",
        llmModel: "claude-3-sonnet",
        interfaceType: "webchat",
        status: "draft",
        createdAt: new Date("2024-12-01").toISOString(),
      },
    ];

    await this.bigquery.dataset(this.config.dataset).table(this.config.agentsTable).insert(sampleAgents);
  }

  private async insertSampleConversations() {
    const sampleConversations = [
      { id: 1, agentId: 1, tokens: 2500, cost: "0.025", createdAt: new Date("2024-12-15").toISOString() },
      { id: 2, agentId: 1, tokens: 1800, cost: "0.018", createdAt: new Date("2024-12-15").toISOString() },
      { id: 3, agentId: 2, tokens: 1200, cost: "0.0024", createdAt: new Date("2024-12-14").toISOString() },
      { id: 4, agentId: 2, tokens: 900, cost: "0.0018", createdAt: new Date("2024-12-14").toISOString() },
    ];

    await this.bigquery.dataset(this.config.dataset).table(this.config.conversationsTable).insert(sampleConversations);
  }

  private async getNextId(tableName: string): Promise<number> {
    const query = `SELECT MAX(id) as maxId FROM \`${this.config.dataset}.${tableName}\``;
    const options: any = { query };
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query);
    }
    
    const [rows] = await this.bigquery.query(options);
    return (rows[0]?.maxId || 0) + 1;
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const query = `
      SELECT * FROM \`${this.config.dataset}.${this.config.agentsTable}\`
      WHERE id = @id
    `;
    
    const options: any = { query, params: { id } };
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query, 'Params:', { id });
    }
    
    const [rows] = await this.bigquery.query(options);

    if (rows.length === 0) return undefined;
    
    const row = rows[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt.value),
    };
  }

  async getAllAgents(): Promise<Agent[]> {
    const query = `
      SELECT * FROM \`${this.config.dataset}.${this.config.agentsTable}\`
      ORDER BY createdAt DESC
    `;
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query);
    }
    
    const [rows] = await this.bigquery.query(query);
    
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt.value),
    }));
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = await this.getNextId(this.config.agentsTable);
    const agent = {
      ...insertAgent,
      id,
      status: 'draft',
      createdAt: new Date().toISOString(),
      businessDomain: insertAgent.businessDomain || null,
    };

    await this.bigquery.dataset(this.config.dataset).table(this.config.agentsTable).insert([agent]);
    
    return {
      ...agent,
      createdAt: new Date(agent.createdAt),
    };
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const existing = await this.getAgent(id);
    if (!existing) return undefined;

    const updateFields = Object.entries(updates)
      .map(([key, value]) => `${key} = @${key}`)
      .join(', ');

    const query = `
      UPDATE \`${this.config.dataset}.${this.config.agentsTable}\`
      SET ${updateFields}
      WHERE id = @id
    `;

    const options = { query, params: { id, ...updates } };
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query, 'Params:', { id, ...updates });
    }

    await this.bigquery.query(options);

    return this.getAgent(id);
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    return this.updateAgent(id, { status });
  }

  async deleteAgent(id: number): Promise<boolean> {
    const query = `
      DELETE FROM \`${this.config.dataset}.${this.config.agentsTable}\`
      WHERE id = @id
    `;

    const options = { query, params: { id } };
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query, 'Params:', { id });
    }

    await this.bigquery.query(options);
    return true;
  }

  async getConversationsByAgent(agentId: number): Promise<Conversation[]> {
    const query = `
      SELECT * FROM \`${this.config.dataset}.${this.config.conversationsTable}\`
      WHERE agentId = @agentId
      ORDER BY createdAt DESC
    `;
    
    const options = { query, params: { agentId } };
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', query, 'Params:', { agentId });
    }
    
    const [rows] = await this.bigquery.query(options);
    
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt.value),
    }));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = await this.getNextId(this.config.conversationsTable);
    const conversation = {
      ...insertConversation,
      id,
      createdAt: new Date().toISOString(),
    };

    await this.bigquery.dataset(this.config.dataset).table(this.config.conversationsTable).insert([conversation]);
    
    return {
      ...conversation,
      createdAt: new Date(conversation.createdAt),
    };
  }

  async getUsageStats(): Promise<{
    totalConversations: number;
    totalCost: number;
    activeAgents: number;
    monthlyUsage: { agentId: number; conversations: number; cost: number }[];
  }> {
    // Get total conversations and cost
    const statsQuery = `
      SELECT 
        COUNT(*) as totalConversations,
        SUM(CAST(cost AS FLOAT64)) as totalCost
      FROM \`${this.config.dataset}.${this.config.conversationsTable}\`
    `;
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', statsQuery);
    }
    
    const [statsRows] = await this.bigquery.query(statsQuery);
    const stats = statsRows[0];

    // Get active agents count
    const activeAgentsQuery = `
      SELECT COUNT(*) as activeAgents
      FROM \`${this.config.dataset}.${this.config.agentsTable}\`
      WHERE status = 'active'
    `;
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', activeAgentsQuery);
    }
    
    const [activeAgentsRows] = await this.bigquery.query(activeAgentsQuery);
    const activeAgents = activeAgentsRows[0].activeAgents;

    // Get monthly usage by agent
    const monthlyUsageQuery = `
      SELECT 
        a.id as agentId,
        COUNT(c.id) as conversations,
        COALESCE(SUM(CAST(c.cost AS FLOAT64)), 0) as cost
      FROM \`${this.config.dataset}.${this.config.agentsTable}\` a
      LEFT JOIN \`${this.config.dataset}.${this.config.conversationsTable}\` c ON a.id = c.agentId
      GROUP BY a.id
    `;
    
    if (this.config.logQueries) {
      console.log('BigQuery Query:', monthlyUsageQuery);
    }
    
    const [monthlyUsageRows] = await this.bigquery.query(monthlyUsageQuery);

    return {
      totalConversations: parseInt(stats.totalConversations),
      totalCost: parseFloat(stats.totalCost) || 0,
      activeAgents: parseInt(activeAgents),
      monthlyUsage: monthlyUsageRows.map(row => ({
        agentId: row.agentId,
        conversations: parseInt(row.conversations),
        cost: parseFloat(row.cost) || 0,
      })),
    };
  }
}

// Use BigQuery storage if environment variables are set, otherwise fall back to memory storage
export const storage = isDatabaseConfigured() 
  ? new BigQueryStorage() 
  : new MemStorage();
