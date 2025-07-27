// Re-export shared types for easy access
export type { Agent, InsertAgent, Conversation, InsertConversation } from "@shared/schema";
export { INDUSTRIES, LLM_MODELS, INTERFACE_TYPES } from "@shared/schema";

// UI-specific types
export * from "./ui";

// Legacy types for backward compatibility (migrating away from these)
export interface WidgetConfig {
  primaryColor: string;
  position: string;
  size: string;
  borderRadius: number;
  showBranding: boolean;
  openByDefault: boolean;
}

export interface UsageStats {
  totalConversations: number;
  totalCost: number;
  activeAgents: number;
  monthlyUsage: Array<{
    agentId: number;
    conversations: number;
    cost: number;
  }>;
}

export interface AgentFormData {
  businessName: string;
  businessDescription: string;
  businessDomain?: string;
  industry: string;
  llmModel: string;
  interfaceType: string;
}