import { agents, conversations, type Agent, type InsertAgent, type Conversation, type InsertConversation } from "@shared/schema";

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

export const storage = new MemStorage();
