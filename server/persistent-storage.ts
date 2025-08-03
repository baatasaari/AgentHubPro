// Persistent Storage Implementation for AgentHub Platform
// Replaces transient in-memory storage with production-ready persistence layers

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
import { db } from './db.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import config from './config.js';
import type { IStorage } from './storage.js';

// Production-ready storage implementation using PostgreSQL/BigQuery
export class PersistentStorage implements IStorage {
  private bigquery: BigQuery | null = null;
  private usePostgreSQL: boolean;

  constructor() {
    // Auto-detect storage backend based on environment
    this.usePostgreSQL = !!process.env.DATABASE_URL;
    
    if (!this.usePostgreSQL && config.bigquery?.enabled) {
      this.bigquery = new BigQuery({
        projectId: config.bigquery.projectId,
        keyFilename: config.bigquery.keyFile
      });
    }
    
    console.log(`🗄️  Storage: ${this.usePostgreSQL ? 'PostgreSQL' : 'BigQuery'}`);
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    if (this.usePostgreSQL) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
      return org;
    }
    
    // BigQuery implementation for production
    const query = `SELECT * FROM \`${config.bigquery.dataset}.organizations\` WHERE id = @id`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { id }
    });
    return rows[0] as Organization;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    if (this.usePostgreSQL) {
      const [created] = await db.insert(organizations).values(org).returning();
      return created;
    }
    
    // BigQuery insert
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('organizations');
    await table.insert([org]);
    
    // Return the created organization (BigQuery doesn't support RETURNING)
    const query = `SELECT * FROM \`${config.bigquery.dataset}.organizations\` 
                   WHERE name = @name ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { name: org.name }
    });
    return rows[0] as Organization;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    if (this.usePostgreSQL) {
      const [updated] = await db
        .update(organizations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(organizations.id, id))
        .returning();
      return updated;
    }
    
    // BigQuery update using MERGE statement
    const updateFields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const query = `
      UPDATE \`${config.bigquery.dataset}.organizations\`
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP()
      WHERE id = @id
    `;
    
    await this.bigquery!.query({
      query,
      params: { id, ...updates }
    });
    
    return this.getOrganization(id);
  }

  // User operations with persistent storage
  async getUser(id: number): Promise<User | undefined> {
    if (this.usePostgreSQL) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.users\` WHERE id = @id`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { id }
    });
    return rows[0] as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (this.usePostgreSQL) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.users\` WHERE email = @email`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { email }
    });
    return rows[0] as User;
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(users).where(eq(users.organizationId, organizationId));
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.users\` 
                   WHERE organization_id = @organizationId ORDER BY created_at DESC`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { organizationId }
    });
    return rows as User[];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password if provided
    if (user.password) {
      const bcrypt = await import('bcrypt');
      user.passwordHash = await bcrypt.hash(user.password, 10);
      delete user.password; // Remove plaintext password
    }

    if (this.usePostgreSQL) {
      const [created] = await db.insert(users).values(user).returning();
      return created;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('users');
    await table.insert([user]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.users\` 
                   WHERE email = @email ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { email: user.email }
    });
    return rows[0] as User;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    if (this.usePostgreSQL) {
      const [updated] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updated;
    }
    
    const updateFields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const query = `
      UPDATE \`${config.bigquery.dataset}.users\`
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP()
      WHERE id = @id
    `;
    
    await this.bigquery!.query({
      query,
      params: { id, ...updates }
    });
    
    return this.getUser(id);
  }

  async deleteUser(id: number): Promise<boolean> {
    if (this.usePostgreSQL) {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount > 0;
    }
    
    const query = `DELETE FROM \`${config.bigquery.dataset}.users\` WHERE id = @id`;
    const [job] = await this.bigquery!.query({
      query,
      params: { id }
    });
    return job.numDmlAffectedRows > 0;
  }

  async updateUserRole(id: number, role: string, permissionLevel: number): Promise<User | undefined> {
    return this.updateUser(id, { role, permissionLevel });
  }

  // Session operations with persistent storage
  async createSession(userId: number, sessionToken: string, expiresAt: Date): Promise<UserSession> {
    const sessionData = {
      userId,
      sessionToken,
      expiresAt,
      createdAt: new Date()
    };

    if (this.usePostgreSQL) {
      const [session] = await db.insert(userSessions).values(sessionData).returning();
      return session;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('user_sessions');
    await table.insert([sessionData]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.user_sessions\` 
                   WHERE session_token = @sessionToken LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { sessionToken }
    });
    return rows[0] as UserSession;
  }

  async getSession(sessionToken: string): Promise<UserSession | undefined> {
    if (this.usePostgreSQL) {
      const [session] = await db.select().from(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken));
      return session;
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.user_sessions\` 
                   WHERE session_token = @sessionToken AND expires_at > CURRENT_TIMESTAMP()`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { sessionToken }
    });
    return rows[0] as UserSession;
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    if (this.usePostgreSQL) {
      const result = await db.delete(userSessions)
        .where(eq(userSessions.sessionToken, sessionToken));
      return result.rowCount > 0;
    }
    
    const query = `DELETE FROM \`${config.bigquery.dataset}.user_sessions\` 
                   WHERE session_token = @sessionToken`;
    const [job] = await this.bigquery!.query({
      query,
      params: { sessionToken }
    });
    return job.numDmlAffectedRows > 0;
  }

  // Permission operations
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(userPermissions)
        .where(eq(userPermissions.userId, userId));
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.user_permissions\` 
                   WHERE user_id = @userId AND granted = true`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { userId }
    });
    return rows as UserPermission[];
  }

  async grantPermission(permission: InsertUserPermission): Promise<UserPermission> {
    if (this.usePostgreSQL) {
      const [granted] = await db.insert(userPermissions).values(permission).returning();
      return granted;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('user_permissions');
    await table.insert([permission]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.user_permissions\` 
                   WHERE user_id = @userId AND resource = @resource AND action = @action
                   ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: {
        userId: permission.userId,
        resource: permission.resource,
        action: permission.action
      }
    });
    return rows[0] as UserPermission;
  }

  async revokePermission(userId: number, resource: string, action: string): Promise<boolean> {
    if (this.usePostgreSQL) {
      const result = await db.update(userPermissions)
        .set({ granted: false })
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource),
          eq(userPermissions.action, action)
        ));
      return result.rowCount > 0;
    }
    
    const query = `
      UPDATE \`${config.bigquery.dataset}.user_permissions\`
      SET granted = false
      WHERE user_id = @userId AND resource = @resource AND action = @action
    `;
    const [job] = await this.bigquery!.query({
      query,
      params: { userId, resource, action }
    });
    return job.numDmlAffectedRows > 0;
  }

  // Agent operations with organization context
  async getAgent(id: number): Promise<Agent | undefined> {
    if (this.usePostgreSQL) {
      const [agent] = await db.select().from(agents).where(eq(agents.id, id));
      return agent;
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.agents\` WHERE id = @id`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { id }
    });
    return rows[0] as Agent;
  }

  async getAllAgents(organizationId?: number): Promise<Agent[]> {
    if (this.usePostgreSQL) {
      if (organizationId) {
        return await db.select().from(agents)
          .where(eq(agents.organizationId, organizationId));
      }
      return await db.select().from(agents);
    }
    
    const query = organizationId 
      ? `SELECT * FROM \`${config.bigquery.dataset}.agents\` WHERE organization_id = @organizationId`
      : `SELECT * FROM \`${config.bigquery.dataset}.agents\``;
    
    const [rows] = await this.bigquery!.query({
      query,
      params: organizationId ? { organizationId } : {}
    });
    return rows as Agent[];
  }

  async getAgentsByUser(userId: number): Promise<Agent[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(agents).where(eq(agents.createdBy, userId));
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.agents\` 
                   WHERE created_by = @userId ORDER BY created_at DESC`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { userId }
    });
    return rows as Agent[];
  }

  async getAgentsByOrganization(organizationId: number): Promise<Agent[]> {
    return this.getAllAgents(organizationId);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    if (this.usePostgreSQL) {
      const [created] = await db.insert(agents).values(agent).returning();
      return created;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('agents');
    await table.insert([agent]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.agents\` 
                   WHERE business_name = @businessName AND created_by = @createdBy
                   ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { businessName: agent.businessName, createdBy: agent.createdBy }
    });
    return rows[0] as Agent;
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    if (this.usePostgreSQL) {
      const [updated] = await db
        .update(agents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning();
      return updated;
    }
    
    const updateFields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const query = `
      UPDATE \`${config.bigquery.dataset}.agents\`
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP()
      WHERE id = @id
    `;
    
    await this.bigquery!.query({
      query,
      params: { id, ...updates }
    });
    
    return this.getAgent(id);
  }

  async deleteAgent(id: number): Promise<boolean> {
    if (this.usePostgreSQL) {
      const result = await db.delete(agents).where(eq(agents.id, id));
      return result.rowCount > 0;
    }
    
    const query = `DELETE FROM \`${config.bigquery.dataset}.agents\` WHERE id = @id`;
    const [job] = await this.bigquery!.query({
      query,
      params: { id }
    });
    return job.numDmlAffectedRows > 0;
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    return this.updateAgent(id, { status });
  }

  // Conversation operations
  async getConversationsByAgent(agentId: number): Promise<Conversation[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(conversations)
        .where(eq(conversations.agentId, agentId))
        .orderBy(desc(conversations.createdAt));
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.conversations\` 
                   WHERE agent_id = @agentId ORDER BY created_at DESC`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { agentId }
    });
    return rows as Conversation[];
  }

  async getConversationsByOrganization(organizationId: number): Promise<Conversation[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(conversations)
        .where(eq(conversations.organizationId, organizationId))
        .orderBy(desc(conversations.createdAt));
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.conversations\` 
                   WHERE organization_id = @organizationId ORDER BY created_at DESC`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { organizationId }
    });
    return rows as Conversation[];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    if (this.usePostgreSQL) {
      const [created] = await db.insert(conversations).values(conversation).returning();
      return created;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('conversations');
    await table.insert([conversation]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.conversations\` 
                   WHERE agent_id = @agentId ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { agentId: conversation.agentId }
    });
    return rows[0] as Conversation;
  }

  async getUsageStats(organizationId?: number): Promise<{
    totalConversations: number;
    totalCost: number;
    activeAgents: number;
    monthlyUsage: { agentId: number; conversations: number; cost: number }[];
  }> {
    if (this.usePostgreSQL) {
      const whereClause = organizationId 
        ? sql`WHERE c.organization_id = ${organizationId}`
        : sql``;
      
      const result = await db.execute(sql`
        SELECT 
          COUNT(c.id) as total_conversations,
          SUM(c.cost) as total_cost,
          COUNT(DISTINCT c.agent_id) as active_agents
        FROM conversations c
        ${whereClause}
      `);
      
      const monthlyResult = await db.execute(sql`
        SELECT 
          c.agent_id,
          COUNT(c.id) as conversations,
          SUM(c.cost) as cost
        FROM conversations c
        ${whereClause}
        WHERE c.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY c.agent_id
      `);
      
      return {
        totalConversations: Number(result.rows[0].total_conversations) || 0,
        totalCost: Number(result.rows[0].total_cost) || 0,
        activeAgents: Number(result.rows[0].active_agents) || 0,
        monthlyUsage: monthlyResult.rows.map(row => ({
          agentId: Number(row.agent_id),
          conversations: Number(row.conversations),
          cost: Number(row.cost)
        }))
      };
    }
    
    // BigQuery implementation
    const whereClause = organizationId ? `WHERE organization_id = ${organizationId}` : '';
    
    const query = `
      SELECT 
        COUNT(*) as total_conversations,
        SUM(cost) as total_cost,
        COUNT(DISTINCT agent_id) as active_agents
      FROM \`${config.bigquery.dataset}.conversations\`
      ${whereClause}
    `;
    
    const monthlyQuery = `
      SELECT 
        agent_id,
        COUNT(*) as conversations,
        SUM(cost) as cost
      FROM \`${config.bigquery.dataset}.conversations\`
      ${whereClause} ${whereClause ? 'AND' : 'WHERE'} 
        created_at >= DATE_TRUNC(CURRENT_DATE(), MONTH)
      GROUP BY agent_id
    `;
    
    const [statsRows] = await this.bigquery!.query({ query });
    const [monthlyRows] = await this.bigquery!.query({ query: monthlyQuery });
    
    const stats = statsRows[0];
    
    return {
      totalConversations: Number(stats.total_conversations) || 0,
      totalCost: Number(stats.total_cost) || 0,
      activeAgents: Number(stats.active_agents) || 0,
      monthlyUsage: monthlyRows.map((row: any) => ({
        agentId: Number(row.agent_id),
        conversations: Number(row.conversations),
        cost: Number(row.cost)
      }))
    };
  }

  // Audit operations
  async logAction(auditLog: InsertAuditLog): Promise<AuditLog> {
    if (this.usePostgreSQL) {
      const [logged] = await db.insert(auditLogs).values(auditLog).returning();
      return logged;
    }
    
    const table = this.bigquery!.dataset(config.bigquery.dataset).table('audit_logs');
    await table.insert([auditLog]);
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.audit_logs\` 
                   WHERE organization_id = @organizationId ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { organizationId: auditLog.organizationId }
    });
    return rows[0] as AuditLog;
  }

  async getAuditLogs(organizationId: number, limit: number = 100): Promise<AuditLog[]> {
    if (this.usePostgreSQL) {
      return await db.select().from(auditLogs)
        .where(eq(auditLogs.organizationId, organizationId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
    
    const query = `SELECT * FROM \`${config.bigquery.dataset}.audit_logs\` 
                   WHERE organization_id = @organizationId 
                   ORDER BY created_at DESC LIMIT @limit`;
    const [rows] = await this.bigquery!.query({
      query,
      params: { organizationId, limit }
    });
    return rows as AuditLog[];
  }
}

// Create and export the persistent storage instance
export const persistentStorage = new PersistentStorage();