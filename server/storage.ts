import { 
  agents, conversations, users, organizations, userSessions, userPermissions, auditLogs,
  type Agent, type InsertAgent, 
  type Conversation, type InsertConversation,
  type User, type InsertUser,
  type Organization, type InsertOrganization,
  type UserSession,
  type UserPermission, type InsertUserPermission,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { BigQuery } from '@google-cloud/bigquery';
import config from './config.js';
// Note: PersistentStorage will replace MemStorage for production deployments

export interface IStorage {
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserRole(id: number, role: string, permissionLevel: number): Promise<User | undefined>;

  // Session operations
  createSession(userId: number, sessionToken: string, expiresAt: Date): Promise<UserSession>;
  getSession(sessionToken: string): Promise<UserSession | undefined>;
  deleteSession(sessionToken: string): Promise<boolean>;

  // Permission operations
  getUserPermissions(userId: number): Promise<UserPermission[]>;
  grantPermission(permission: InsertUserPermission): Promise<UserPermission>;
  revokePermission(userId: number, resource: string, action: string): Promise<boolean>;

  // Agent operations (updated with organization context)
  getAgent(id: number): Promise<Agent | undefined>;
  getAllAgents(organizationId?: number): Promise<Agent[]>;
  getAgentsByUser(userId: number): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  updateAgentStatus(id: number, status: string): Promise<Agent | undefined>;

  // Conversation operations (updated with organization context)
  getConversationsByAgent(agentId: number): Promise<Conversation[]>;
  getConversationsByOrganization(organizationId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUsageStats(organizationId?: number): Promise<{
    totalConversations: number;
    totalCost: number;
    activeAgents: number;
    monthlyUsage: { agentId: number; conversations: number; cost: number }[];
  }>;

  // Audit operations
  logAction(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(organizationId: number, limit?: number): Promise<AuditLog[]>;
}

export class MemStorage implements IStorage {
  private organizations: Map<number, Organization>;
  private users: Map<number, User>;
  private userSessions: Map<string, UserSession>;
  private userPermissions: Map<number, UserPermission[]>;
  private agents: Map<number, Agent>;
  private conversations: Map<number, Conversation>;
  private auditLogs: Map<number, AuditLog>;
  
  private currentOrgId: number;
  private currentUserId: number;
  private currentAgentId: number;
  private currentConversationId: number;
  private currentPermissionId: number;
  private currentAuditId: number;

  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.userSessions = new Map();
    this.userPermissions = new Map();
    this.agents = new Map();
    this.conversations = new Map();
    this.auditLogs = new Map();
    
    this.currentOrgId = 1;
    this.currentUserId = 1;
    this.currentAgentId = 1;
    this.currentConversationId = 1;
    this.currentPermissionId = 1;
    this.currentAuditId = 1;

    // Add some sample data for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize sample organization
    const sampleOrg: Organization = {
      id: 1,
      name: "Sample Healthcare Corp",
      domain: "healthcare-corp.com",
      settings: "{}",
      subscriptionPlan: "professional",
      subscriptionStatus: "active",
      monthlyUsageLimit: 5000,
      currentUsage: 1250,
      createdAt: new Date("2024-11-01"),
      updatedAt: new Date("2024-11-01"),
    };
    this.organizations.set(1, sampleOrg);

    // Initialize sample users
    const sampleUsers: User[] = [
      {
        id: 1,
        email: "owner@agenthub.com",
        passwordHash: "hashed_password",
        firstName: "Platform",
        lastName: "Owner",
        avatarUrl: null,
        organizationId: 1,
        role: "owner",
        permissionLevel: 4,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date("2024-11-01"),
        updatedAt: new Date("2024-11-01"),
      },
      {
        id: 2,
        email: "admin@healthcare-corp.com",
        passwordHash: "hashed_password",
        firstName: "Jane",
        lastName: "Admin",
        avatarUrl: null,
        organizationId: 1,
        role: "admin",
        permissionLevel: 3,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date("2024-11-01"),
        updatedAt: new Date("2024-11-01"),
      },
      {
        id: 3,
        email: "support@healthcare-corp.com",
        passwordHash: "hashed_password",
        firstName: "Mike",
        lastName: "Support",
        avatarUrl: null,
        organizationId: 1,
        role: "viewer",
        permissionLevel: 1,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date("2024-11-01"),
        updatedAt: new Date("2024-11-01"),
      }
    ];
    
    sampleUsers.forEach(user => this.users.set(user.id, user));

    const sampleAgents: Agent[] = [
      {
        id: 1,
        organizationId: 1,
        createdBy: 2,
        businessName: "HealthCare Assistant",
        businessDescription: "AI assistant for healthcare providers to help patients with appointment scheduling, basic health information, and general inquiries.",
        businessDomain: "https://healthcare-example.com",
        industry: "healthcare",
        llmModel: "gpt-4-turbo",
        interfaceType: "webchat",
        status: "active",
        ragEnabled: "true",
        ragKnowledgeBase: "Healthcare Knowledge Base",
        ragDocuments: "[]",
        ragQueryMode: "hybrid",
        ragChunkSize: 1000,
        ragOverlap: 200,
        ragMaxResults: 5,
        ragConfidenceThreshold: "0.7",
        createdAt: new Date("2024-11-01"),
        updatedAt: new Date("2024-11-01"),
      },
      {
        id: 2,
        organizationId: 1,
        createdBy: 2,
        businessName: "E-commerce Helper",
        businessDescription: "Customer service bot for online retail store to assist with product information, order tracking, and returns.",
        businessDomain: "https://shop-example.com",
        industry: "retail",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp",
        status: "active",
        ragEnabled: "false",
        ragKnowledgeBase: "",
        ragDocuments: "[]",
        ragQueryMode: "hybrid",
        ragChunkSize: 1000,
        ragOverlap: 200,
        ragMaxResults: 5,
        ragConfidenceThreshold: "0.7",
        createdAt: new Date("2024-11-15"),
        updatedAt: new Date("2024-11-15"),
      },
      {
        id: 3,
        organizationId: 1,
        createdBy: 1,
        businessName: "Realty Assistant",
        businessDescription: "Real estate agent assistant to help clients with property information, scheduling viewings, and market insights.",
        businessDomain: "https://realty-example.com",
        industry: "realestate",
        llmModel: "claude-3-sonnet",
        interfaceType: "webchat",
        status: "draft",
        ragEnabled: "false",
        ragKnowledgeBase: "",
        ragDocuments: "[]",
        ragQueryMode: "hybrid",
        ragChunkSize: 1000,
        ragOverlap: 200,
        ragMaxResults: 5,
        ragConfidenceThreshold: "0.7",
        createdAt: new Date("2024-12-01"),
        updatedAt: new Date("2024-12-01"),
      },
    ];

    sampleAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    this.currentAgentId = Math.max(...sampleAgents.map(a => a.id)) + 1;

    // Add sample conversations with organization context
    const sampleConversations: Conversation[] = [
      { id: 1, agentId: 1, organizationId: 1, userId: 3, tokens: 120, cost: 0.0024, createdAt: new Date("2024-11-01") },
      { id: 2, agentId: 1, organizationId: 1, userId: 3, tokens: 95, cost: 0.0019, createdAt: new Date("2024-11-02") },
      { id: 3, agentId: 2, organizationId: 1, userId: null, tokens: 200, cost: 0.0004, createdAt: new Date("2024-11-15") },
      { id: 4, agentId: 2, organizationId: 1, userId: null, tokens: 150, cost: 0.0003, createdAt: new Date("2024-11-16") },
    ];

    sampleConversations.forEach(conversation => this.conversations.set(conversation.id, conversation));

    // Add sample audit logs
    const sampleAuditLogs: AuditLog[] = [
      {
        id: 1,
        userId: 1,
        organizationId: 1,
        action: "user_created",
        resource: "users",
        resourceId: 2,
        details: '{"role": "agent_developer"}',
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2024-11-01"),
      },
      {
        id: 2,
        userId: 2,
        organizationId: 1,
        action: "agent_created",
        resource: "agents",
        resourceId: 1,
        details: '{"name": "HealthCare Assistant"}',
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2024-11-01"),
      },
    ];

    sampleAuditLogs.forEach(log => this.auditLogs.set(log.id, log));

    this.currentOrgId = 2;
    this.currentUserId = 4;
    this.currentConversationId = 5;
    this.currentAuditId = 3;
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const id = this.currentOrgId++;
    const org: Organization = {
      ...insertOrg,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(id, org);
    return org;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const existing = this.organizations.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.organizations.set(id, updated);
    return updated;
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.organizationId === organizationId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      passwordHash: `hashed_${insertUser.password}`,
      isActive: true,
      isEmailVerified: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...updates, 
      passwordHash: updates.password ? `hashed_${updates.password}` : existing.passwordHash,
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserRole(id: number, role: string, permissionLevel: number): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, role, permissionLevel, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // Session operations
  async createSession(userId: number, sessionToken: string, expiresAt: Date): Promise<UserSession> {
    const session: UserSession = {
      id: Date.now(), // Simple ID generation
      userId,
      sessionToken,
      expiresAt,
      createdAt: new Date(),
    };
    this.userSessions.set(sessionToken, session);
    return session;
  }

  async getSession(sessionToken: string): Promise<UserSession | undefined> {
    return this.userSessions.get(sessionToken);
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    return this.userSessions.delete(sessionToken);
  }

  // Permission operations
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    return this.userPermissions.get(userId) || [];
  }

  async grantPermission(permission: InsertUserPermission): Promise<UserPermission> {
    const id = this.currentPermissionId++;
    const userPermission: UserPermission = {
      ...permission,
      id,
      createdAt: new Date(),
    };
    
    const userPerms = this.userPermissions.get(permission.userId) || [];
    userPerms.push(userPermission);
    this.userPermissions.set(permission.userId, userPerms);
    
    return userPermission;
  }

  async revokePermission(userId: number, resource: string, action: string): Promise<boolean> {
    const userPerms = this.userPermissions.get(userId) || [];
    const filtered = userPerms.filter(p => !(p.resource === resource && p.action === action));
    this.userPermissions.set(userId, filtered);
    return filtered.length < userPerms.length;
  }

  // Audit operations
  async logAction(auditLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditId++;
    const log: AuditLog = {
      ...auditLog,
      id,
      timestamp: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(organizationId: number, limit?: number): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values())
      .filter(log => log.organizationId === organizationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }

  // Agent operations
  async getAgentsByUser(userId: number): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(agent => agent.createdBy === userId);
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const newOrg: Organization = {
      id: this.currentOrgId++,
      ...org,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(newOrg.id, newOrg);
    return newOrg;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const org = this.organizations.get(id);
    if (!org) return undefined;
    
    const updatedOrg = { ...org, ...updates, updatedAt: new Date() };
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.organizationId === organizationId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const { password, ...userData } = user;
    const newUser: User = {
      id: this.currentUserId++,
      ...userData,
      passwordHash: password ? `hashed_${password}` : null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const { password, ...updateData } = updates;
    const updatedUser = { 
      ...user, 
      ...updateData, 
      passwordHash: password ? `hashed_${password}` : user.passwordHash,
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserRole(id: number, role: string, permissionLevel: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, role, permissionLevel, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(userId: number, sessionToken: string, expiresAt: Date): Promise<UserSession> {
    const session: UserSession = {
      id: Date.now(),
      userId,
      sessionToken,
      expiresAt,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
    };
    this.userSessions.set(sessionToken, session);
    return session;
  }

  async getSession(sessionToken: string): Promise<UserSession | undefined> {
    return this.userSessions.get(sessionToken);
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    return this.userSessions.delete(sessionToken);
  }

  // Permission operations
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    return this.userPermissions.get(userId) || [];
  }

  async grantPermission(permission: InsertUserPermission): Promise<UserPermission> {
    const newPermission: UserPermission = {
      id: this.currentPermissionId++,
      ...permission,
      createdAt: new Date(),
    };
    
    const userPermissions = this.userPermissions.get(permission.userId) || [];
    userPermissions.push(newPermission);
    this.userPermissions.set(permission.userId, userPermissions);
    
    return newPermission;
  }

  async revokePermission(userId: number, resource: string, action: string): Promise<boolean> {
    const userPermissions = this.userPermissions.get(userId);
    if (!userPermissions) return false;
    
    const filteredPermissions = userPermissions.filter(
      p => !(p.resource === resource && p.action === action)
    );
    this.userPermissions.set(userId, filteredPermissions);
    return true;
  }

  // Audit operations
  async logAction(auditLog: InsertAuditLog): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: this.currentAuditId++,
      ...auditLog,
      createdAt: new Date(),
    };
    this.auditLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getAuditLogs(organizationId: number, limit: number = 50): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getAllAgents(organizationId?: number): Promise<Agent[]> {
    let agents = Array.from(this.agents.values());
    if (organizationId) {
      agents = agents.filter(agent => agent.organizationId === organizationId);
    }
    return agents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAgentsByUser(userId: number): Promise<Agent[]> {
    return Array.from(this.agents.values())
      .filter(agent => agent.createdBy === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.currentAgentId++;
    const agent: Agent = {
      ...insertAgent,
      id,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      businessDomain: insertAgent.businessDomain || null,
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.agents.set(id, updated);
    return updated;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, status, updatedAt: new Date() };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getConversationsByAgent(agentId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(c => c.agentId === agentId);
  }

  async getConversationsByOrganization(organizationId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(c => c.organizationId === organizationId);
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
  private config: any;

  constructor() {
    this.config = {
      projectId: 'test',
      dataset: 'test'
    };
    
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

// Use MemStorage for development
// Storage factory - automatically selects persistent storage in production
function createStorage(): IStorage {
  // Check for production environment variables
  if (process.env.DATABASE_URL || process.env.GOOGLE_CLOUD_PROJECT) {
    try {
      // Dynamic import to avoid circular dependencies
      const { persistentStorage } = require('./persistent-storage.js');
      console.log('🗄️  Using PersistentStorage (Production Mode)');
      return persistentStorage;
    } catch (error) {
      console.warn('⚠️  PersistentStorage failed to initialize, falling back to MemStorage:', error);
    }
  }
  
  console.log('🗄️  Using MemStorage (Development Mode)');
  return new MemStorage();
}

// Create the global storage instance with automatic production/development detection
export const storage = createStorage();
