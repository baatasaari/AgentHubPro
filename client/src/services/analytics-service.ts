/**
 * Analytics Service - API communication for usage and analytics data
 */

import type { Conversation } from "@shared/schema";

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

export interface AnalyticsData {
  totalRevenue: number;
  averageResponseTime: number;
  satisfactionScore: number;
  industryBreakdown: Array<{
    industry: string;
    agents: number;
    conversations: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export class AnalyticsService {
  private static readonly BASE_URL = "/api";

  /**
   * Get usage statistics
   */
  static async getUsageStats(): Promise<UsageStats> {
    const response = await fetch(`${this.BASE_URL}/usage/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch usage stats: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get all conversations
   */
  static async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.BASE_URL}/conversations`);
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get conversations for specific agent
   */
  static async getAgentConversations(agentId: number): Promise<Conversation[]> {
    const response = await fetch(`${this.BASE_URL}/conversations?agentId=${agentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent conversations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get analytics dashboard data
   */
  static async getAnalytics(): Promise<AnalyticsData> {
    const response = await fetch(`${this.BASE_URL}/analytics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get billing information
   */
  static async getBillingData(): Promise<{
    currentMonthCost: number;
    previousMonthCost: number;
    paymentHistory: Array<{
      id: string;
      amount: number;
      date: string;
      status: string;
    }>;
    upcomingPayment: {
      amount: number;
      dueDate: string;
    };
  }> {
    const response = await fetch(`${this.BASE_URL}/billing`);
    if (!response.ok) {
      throw new Error(`Failed to fetch billing data: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Export analytics data
   */
  static async exportData(format: "csv" | "json", dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<Blob> {
    const params = new URLSearchParams({ format });
    if (dateRange) {
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);
    }

    const response = await fetch(`${this.BASE_URL}/analytics/export?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.statusText}`);
    }
    return response.blob();
  }
}