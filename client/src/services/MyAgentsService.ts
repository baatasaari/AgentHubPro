import { apiRequest } from '@/lib/queryClient';

export interface AgentSummary {
  id: string;
  business_name: string;
  industry: string;
  status: 'draft' | 'active' | 'paused' | 'disabled' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  last_active?: string;
  conversation_count: number;
  total_cost: number;
  tags: string[];
  has_widget: boolean;
  performance_score: number;
}

export interface AgentMetrics {
  agent_id: string;
  total_conversations: number;
  total_cost: number;
  avg_response_time: number;
  satisfaction_score: number;
  uptime_percentage: number;
  last_conversation?: string;
  performance_trend: string;
}

export interface AgentsDashboard {
  overview: {
    total_agents: number;
    active_agents: number;
    paused_agents: number;
    disabled_agents: number;
    total_conversations: number;
    total_cost: number;
    avg_performance_score: number;
  };
  breakdown: {
    by_industry: Record<string, number>;
    by_priority: Record<string, number>;
    by_status: Record<string, number>;
  };
  recent_activity: Array<{
    id: string;
    agent_id: string;
    old_status: string;
    new_status: string;
    reason?: string;
    timestamp: string;
  }>;
  last_updated: string;
}

export interface BulkOperation {
  agent_ids: string[];
  operation: 'enable' | 'disable' | 'archive' | 'delete';
  reason?: string;
}

export class MyAgentsService {
  private static baseUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/my-agents`;

  static async getAllAgents(params?: {
    status?: string;
    industry?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentSummary[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.industry) queryParams.append('industry', params.industry);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `${this.baseUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(url);
  }

  static async getAgentDetails(agentId: string) {
    return apiRequest(`${this.baseUrl}/${agentId}`);
  }

  static async updateAgent(agentId: string, updateData: {
    business_name?: string;
    business_description?: string;
    business_domain?: string;
    industry?: string;
    llm_model?: string;
    interface_type?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    notes?: string;
  }) {
    return apiRequest(`${this.baseUrl}/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  static async enableAgent(agentId: string, reason?: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/enable`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async disableAgent(agentId: string, reason?: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async pauseAgent(agentId: string, reason?: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async archiveAgent(agentId: string, reason?: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async deleteAgent(agentId: string) {
    return apiRequest(`${this.baseUrl}/${agentId}?confirm=true`, {
      method: 'DELETE',
    });
  }

  static async bulkOperation(operation: BulkOperation) {
    return apiRequest(`${this.baseUrl}/bulk`, {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  }

  static async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    return apiRequest(`${this.baseUrl}/${agentId}/metrics`);
  }

  static async getAgentStatusHistory(agentId: string, limit = 20) {
    return apiRequest(`${this.baseUrl}/${agentId}/status-history?limit=${limit}`);
  }

  static async getAgentBackups(agentId: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/backups`);
  }

  static async restoreAgentBackup(agentId: string, backupDate: string) {
    return apiRequest(`${this.baseUrl}/${agentId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ backup_date: backupDate }),
    });
  }

  static async getDashboard(): Promise<AgentsDashboard> {
    return apiRequest(`${this.baseUrl}/dashboard`);
  }
}