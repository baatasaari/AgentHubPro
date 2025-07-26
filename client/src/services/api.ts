import { apiRequest } from "@/lib/queryClient";
import type { Agent, InsertAgent, UsageStats } from "@/types";

export class AgentService {
  static async getAll(): Promise<Agent[]> {
    const response = await fetch("/api/agents");
    if (!response.ok) throw new Error("Failed to fetch agents");
    return response.json();
  }

  static async getById(id: number): Promise<Agent> {
    const response = await fetch(`/api/agents/${id}`);
    if (!response.ok) throw new Error("Failed to fetch agent");
    return response.json();
  }

  static async create(data: InsertAgent): Promise<Agent> {
    const response = await apiRequest("POST", "/api/agents", data);
    return response.json();
  }

  static async update(id: number, data: Partial<InsertAgent>): Promise<Agent> {
    const response = await apiRequest("PATCH", `/api/agents/${id}`, data);
    return response.json();
  }

  static async updateStatus(id: number, status: string): Promise<Agent> {
    const response = await apiRequest("PATCH", `/api/agents/${id}/status`, { status });
    return response.json();
  }

  static async delete(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/agents/${id}`);
  }

  static async getEmbedCode(id: number): Promise<{ embedCode: string }> {
    const response = await fetch(`/api/agents/${id}/embed`);
    if (!response.ok) throw new Error("Failed to get embed code");
    return response.json();
  }
}

export class UsageService {
  static async getStats(): Promise<UsageStats> {
    const response = await fetch("/api/usage/stats");
    if (!response.ok) throw new Error("Failed to fetch usage stats");
    return response.json();
  }
}