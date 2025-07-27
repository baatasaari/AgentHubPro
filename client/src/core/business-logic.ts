/**
 * Core Business Logic - Centralized business rules and calculations
 */

import type { Agent, Conversation } from "@shared/schema";

export class BusinessLogic {
  /**
   * Calculate total revenue from conversations
   */
  static calculateTotalRevenue(conversations: Conversation[]): number {
    return conversations.reduce((total, conv) => total + parseFloat(conv.cost), 0);
  }

  /**
   * Calculate average conversation cost
   */
  static calculateAverageCost(conversations: Conversation[]): number {
    if (conversations.length === 0) return 0;
    const total = this.calculateTotalRevenue(conversations);
    return total / conversations.length;
  }

  /**
   * Get agents by status
   */
  static getAgentsByStatus(agents: Agent[], status: string): Agent[] {
    return agents.filter(agent => agent.status === status);
  }

  /**
   * Calculate agent utilization rates
   */
  static calculateAgentUtilization(agents: Agent[], conversations: Conversation[]): Record<number, number> {
    const agentConversations: Record<number, number> = {};
    
    // Count conversations per agent
    conversations.forEach(conv => {
      agentConversations[conv.agentId] = (agentConversations[conv.agentId] || 0) + 1;
    });

    // Calculate utilization rates
    const result: Record<number, number> = {};
    agents.forEach(agent => {
      const count = agentConversations[agent.id] || 0;
      result[agent.id] = count;
    });

    return result;
  }

  /**
   * Validate business domain format
   */
  static validateDomain(domain: string): boolean {
    const domainRegex = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Generate system prompt for agent based on industry
   */
  static generateSystemPrompt(agent: Agent): string {
    const industryPrompts: Record<string, string> = {
      healthcare: "You are a healthcare assistant. Provide helpful information about health services, appointment scheduling, and general wellness guidance. Always recommend consulting healthcare professionals for medical advice.",
      retail: "You are a retail customer service assistant. Help customers with product information, order status, returns, and general shopping inquiries. Be friendly and solution-oriented.",
      finance: "You are a financial services assistant. Help customers with account information, basic financial guidance, and service inquiries. Always recommend consulting financial advisors for investment decisions.",
      realestate: "You are a real estate assistant. Help clients with property information, scheduling viewings, market insights, and general real estate inquiries.",
      education: "You are an educational assistant. Help students and educators with course information, enrollment, scheduling, and learning resources.",
      hospitality: "You are a hospitality assistant. Help guests with bookings, travel information, local recommendations, and service inquiries.",
      legal: "You are a legal services assistant. Help clients with general legal information, appointment scheduling, and service inquiries. Always recommend consulting qualified attorneys for specific legal advice.",
      automotive: "You are an automotive services assistant. Help customers with vehicle information, service scheduling, parts inquiries, and maintenance guidance.",
      technology: "You are a technology support assistant. Help users with technical inquiries, product information, troubleshooting, and service support.",
      consulting: "You are a professional consulting assistant. Help clients with business inquiries, service information, appointment scheduling, and general consulting guidance.",
      fitness: "You are a fitness and wellness assistant. Help members with workout guidance, class schedules, membership information, and health and wellness tips.",
      food: "You are a food and beverage assistant. Help customers with menu information, orders, reservations, and dining inquiries."
    };

    const basePrompt = industryPrompts[agent.industry] || "You are a helpful customer service assistant.";
    return `${basePrompt}

Business Context:
- Business Name: ${agent.businessName}
- Business Description: ${agent.businessDescription}
- Domain: ${agent.businessDomain}

Instructions:
- Always be professional, helpful, and courteous
- Stay within your role and expertise area
- Provide accurate information about the business
- Direct complex inquiries to human representatives when appropriate
- Keep responses concise but informative`;
  }
}