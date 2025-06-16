import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  businessDescription: text("business_description").notNull(),
  businessDomain: text("business_domain"),
  industry: text("industry").notNull(),
  llmModel: text("llm_model").notNull(),
  interfaceType: text("interface_type").notNull(), // 'webchat' or 'whatsapp'
  status: text("status").notNull().default('draft'), // 'draft', 'active', 'paused'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  tokens: integer("tokens").notNull(),
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

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
