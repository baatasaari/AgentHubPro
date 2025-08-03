import { pgTable, text, serial, integer, timestamp, decimal, boolean, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"), // company domain for SSO
  settings: text("settings").default('{}'), // JSON settings
  subscriptionPlan: text("subscription_plan").notNull().default('trial'), // trial, starter, professional, enterprise
  subscriptionStatus: text("subscription_status").notNull().default('active'), // active, cancelled, suspended
  monthlyUsageLimit: integer("monthly_usage_limit").default(1000),
  currentUsage: integer("current_usage").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table with comprehensive user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"), // nullable for SSO users
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatarUrl: text("avatar_url"),
  organizationId: integer("organization_id").references(() => organizations.id),
  role: text("role").notNull().default('business_user'), // User persona roles
  permissionLevel: integer("permission_level").notNull().default(4), // 1-10 permission level
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User sessions for authentication
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  businessName: text("business_name").notNull(),
  businessDescription: text("business_description").notNull(),
  businessDomain: text("business_domain"),
  industry: text("industry").notNull(),
  llmModel: text("llm_model").notNull(),
  interfaceType: text("interface_type").notNull(), // 'webchat' or 'whatsapp'
  status: text("status").notNull().default('draft'), // 'draft', 'active', 'paused'
  // RAG Configuration
  ragEnabled: text("rag_enabled").default('false'),
  ragKnowledgeBase: text("rag_knowledge_base").default(''),
  ragDocuments: text("rag_documents").default('[]'), // JSON array as text
  ragQueryMode: text("rag_query_mode").default('hybrid'), // semantic, keyword, hybrid
  ragChunkSize: integer("rag_chunk_size").default(1000),
  ragOverlap: integer("rag_overlap").default(200),
  ragMaxResults: integer("rag_max_results").default(5),
  ragConfidenceThreshold: text("rag_confidence_threshold").default('0.7'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id), // nullable for public conversations
  tokens: integer("tokens").notNull(),
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User permissions for fine-grained access control
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  resource: text("resource").notNull(), // 'agents', 'conversations', 'analytics', etc.
  action: text("action").notNull(), // 'create', 'read', 'update', 'delete'
  resourceId: integer("resource_id"), // specific resource ID (nullable for global permissions)
  granted: boolean("granted").notNull().default(true),
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log for tracking user actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: integer("resource_id"),
  details: text("details"), // JSON details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  agents: many(agents),
  conversations: many(conversations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  agents: many(agents),
  sessions: many(userSessions),
  permissions: many(userPermissions),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [agents.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [agents.createdBy],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  agent: one(agents, {
    fields: [conversations.agentId],
    references: [agents.id],
  }),
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  password: z.string().min(8).optional(), // for password validation
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSession = typeof userSessions.$inferSelect;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Industry options
export const INDUSTRIES = [
  { value: "healthcare", label: "Healthcare & Medical", icon: "stethoscope" },
  { value: "retail", label: "Retail & E-commerce", icon: "shopping-cart" },
  { value: "finance", label: "Finance & Banking", icon: "university" },
  { value: "realestate", label: "Real Estate", icon: "home" },
  { value: "education", label: "Education & Training", icon: "graduation-cap" },
  { value: "hospitality", label: "Hospitality & Travel", icon: "plane" },
  { value: "legal", label: "Legal Services", icon: "gavel" },
  { value: "automotive", label: "Automotive", icon: "car" },
  { value: "technology", label: "Technology & Software", icon: "laptop" },
  { value: "consulting", label: "Consulting & Professional", icon: "briefcase" },
  { value: "fitness", label: "Fitness & Wellness", icon: "dumbbell" },
  { value: "food", label: "Food & Beverage", icon: "utensils" },
] as const;

// LLM Model options with pricing
export const LLM_MODELS = [
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", price: 0.01, provider: "OpenAI" },
  { value: "gpt-4", label: "GPT-4", price: 0.03, provider: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", price: 0.002, provider: "OpenAI" },
  { value: "claude-3-opus", label: "Claude 3 Opus", price: 0.015, provider: "Anthropic" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", price: 0.003, provider: "Anthropic" },
  { value: "gemini-pro", label: "Gemini Pro", price: 0.001, provider: "Google" },
] as const;

export const INTERFACE_TYPES = [
  { value: "webchat", label: "Web Chat Widget", description: "Embeddable chat interface for your website" },
  { value: "whatsapp", label: "WhatsApp Integration", description: "Connect via WhatsApp Business API" },
] as const;

// Complete platform roles with Owner control
export const USER_ROLES = [
  { value: "owner", label: "Owner", level: 4, description: "Ultimate platform control - user management, all permissions" },
  { value: "admin", label: "Admin", level: 3, description: "Trusted senior team - agent management, production access" },
  { value: "user", label: "User", level: 2, description: "Development team - create agents, limited permissions" },
  { value: "viewer", label: "Viewer", level: 1, description: "Support team - read-only access" },
  { value: "devops", label: "DevOps", level: 3, description: "Infrastructure team - deployment and system access" },
] as const;

// Platform permissions matrix
export const PLATFORM_PERMISSIONS = {
  // User Management (Owner only)
  user_create: { level: 4, description: "Create new user accounts" },
  user_delete: { level: 4, description: "Delete user accounts" },
  user_assign_roles: { level: 4, description: "Assign and change user roles" },
  user_view_all: { level: 3, description: "View all user profiles" },
  
  // Agent Management
  agent_create: { level: 2, description: "Create new agents" },
  agent_edit_all: { level: 3, description: "Edit any agent configuration" },
  agent_edit_own: { level: 2, description: "Edit own agents only" },
  agent_delete: { level: 3, description: "Delete agents" },
  agent_publish: { level: 3, description: "Publish agents to production" },
  agent_view_all: { level: 1, description: "View all agent configurations" },
  
  // Platform Configuration
  platform_config_edit: { level: 4, description: "Modify platform settings" },
  platform_config_view: { level: 3, description: "View platform configuration" },
  system_health_view: { level: 1, description: "View system status" },
  
  // Analytics & Reporting
  analytics_view_all: { level: 3, description: "View all analytics data" },
  analytics_view_own: { level: 2, description: "View own analytics only" },
  analytics_export: { level: 3, description: "Export analytics data" },
  
  // Infrastructure (DevOps)
  infrastructure_manage: { level: 4, description: "Manage infrastructure and deployments", allowedRoles: ["owner", "devops"] },
  database_access: { level: 4, description: "Direct database access", allowedRoles: ["owner", "devops"] },
  deployment_control: { level: 3, description: "Control deployment pipeline", allowedRoles: ["admin", "devops"] },
  
  // Security & Audit
  audit_logs_view_all: { level: 4, description: "View all audit logs" },
  audit_logs_view_filtered: { level: 3, description: "View filtered audit logs" },
  session_manage_all: { level: 4, description: "Manage all user sessions" },
  api_keys_manage: { level: 4, description: "Manage API keys and security" },
} as const;

export const SUBSCRIPTION_PLANS = [
  { value: "trial", label: "Trial", monthlyLimit: 100, price: 0 },
  { value: "starter", label: "Starter", monthlyLimit: 1000, price: 299 },
  { value: "professional", label: "Professional", monthlyLimit: 5000, price: 999 },
  { value: "enterprise", label: "Enterprise", monthlyLimit: 25000, price: 2999 },
  { value: "custom", label: "Custom Enterprise", monthlyLimit: 100000, price: 9999 },
] as const;

// Permission definitions
export const PERMISSIONS = {
  // Platform operations (Level 10 only)
  PLATFORM_CONFIG: "platform:config",
  GLOBAL_USER_MANAGEMENT: "platform:users",
  GLOBAL_BILLING: "platform:billing",
  SYSTEM_MONITORING: "platform:monitoring",
  
  // Organization management (Level 9+)
  ORG_USER_MANAGEMENT: "org:users",
  ORG_ROLE_ASSIGNMENT: "org:roles",
  ORG_BILLING: "org:billing",
  ORG_SETTINGS: "org:settings",
  
  // Agent management (Level 8+)
  AGENT_CREATE: "agent:create",
  AGENT_EDIT: "agent:edit",
  AGENT_DELETE: "agent:delete",
  AGENT_DEPLOY: "agent:deploy",
  AGENT_CONFIG: "agent:config",
  
  // Knowledge management (Level 6+)
  KNOWLEDGE_UPLOAD: "knowledge:upload",
  KNOWLEDGE_EDIT: "knowledge:edit",
  KNOWLEDGE_DELETE: "knowledge:delete",
  RAG_CONFIG: "knowledge:rag",
  
  // Conversation management (Level 5+)
  CONVERSATION_VIEW: "conversation:view",
  CONVERSATION_EXPORT: "conversation:export",
  CONVERSATION_DELETE: "conversation:delete",
  CUSTOMER_SUPPORT: "conversation:support",
  
  // Analytics and reporting (Level 4+)
  ANALYTICS_VIEW: "analytics:view",
  ANALYTICS_EXPORT: "analytics:export",
  ANALYTICS_CUSTOM: "analytics:custom",
  ANALYTICS_ADVANCED: "analytics:advanced",
  
  // API and integration (Level 7+)
  API_ACCESS: "api:access",
  API_KEY_MANAGEMENT: "api:keys",
  WEBHOOK_CONFIG: "api:webhooks",
  INTEGRATION_SETUP: "api:integrations",
} as const;

// Helper function to get permissions for a role level
export function getPermissionsForLevel(level: number): string[] {
  const permissions: string[] = [];
  
  // Level 1-3: Basic access
  if (level >= 1) {
    permissions.push(PERMISSIONS.ANALYTICS_VIEW);
  }
  
  // Level 4+: Business user
  if (level >= 4) {
    permissions.push(
      PERMISSIONS.CONVERSATION_VIEW,
      PERMISSIONS.CUSTOMER_SUPPORT,
      PERMISSIONS.ANALYTICS_EXPORT
    );
  }
  
  // Level 5+: Customer Success Manager
  if (level >= 5) {
    permissions.push(
      PERMISSIONS.CONVERSATION_EXPORT,
      PERMISSIONS.CONVERSATION_DELETE
    );
  }
  
  // Level 6+: Business Analyst
  if (level >= 6) {
    permissions.push(
      PERMISSIONS.KNOWLEDGE_UPLOAD,
      PERMISSIONS.KNOWLEDGE_EDIT,
      PERMISSIONS.ANALYTICS_CUSTOM,
      PERMISSIONS.ANALYTICS_ADVANCED
    );
  }
  
  // Level 7+: Agent Developer
  if (level >= 7) {
    permissions.push(
      PERMISSIONS.AGENT_CREATE,
      PERMISSIONS.AGENT_EDIT,
      PERMISSIONS.AGENT_DEPLOY,
      PERMISSIONS.AGENT_CONFIG,
      PERMISSIONS.KNOWLEDGE_DELETE,
      PERMISSIONS.RAG_CONFIG,
      PERMISSIONS.API_ACCESS,
      PERMISSIONS.API_KEY_MANAGEMENT,
      PERMISSIONS.WEBHOOK_CONFIG,
      PERMISSIONS.INTEGRATION_SETUP
    );
  }
  
  // Level 8+: Agent Administrator
  if (level >= 8) {
    permissions.push(
      PERMISSIONS.AGENT_DELETE,
      PERMISSIONS.ORG_USER_MANAGEMENT,
      PERMISSIONS.ORG_ROLE_ASSIGNMENT
    );
  }
  
  // Level 9+: Organization Owner
  if (level >= 9) {
    permissions.push(
      PERMISSIONS.ORG_BILLING,
      PERMISSIONS.ORG_SETTINGS
    );
  }
  
  // Level 10: Platform Administrator
  if (level >= 10) {
    permissions.push(
      PERMISSIONS.PLATFORM_CONFIG,
      PERMISSIONS.GLOBAL_USER_MANAGEMENT,
      PERMISSIONS.GLOBAL_BILLING,
      PERMISSIONS.SYSTEM_MONITORING
    );
  }
  
  return permissions;
}
