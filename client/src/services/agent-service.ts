/**
 * Agent Service - API communication layer for agent operations
 */

import type { Agent, InsertAgent } from "@shared/schema";

export class AgentService {
  private static readonly BASE_URL = "/api/agents";

  /**
   * Fetch all agents
   */
  static async getAll(): Promise<Agent[]> {
    const response = await fetch(this.BASE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch single agent by ID
   */
  static async getById(id: number): Promise<Agent> {
    const response = await fetch(`${this.BASE_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Agent not found");
      }
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create new agent
   */
  static async create(data: InsertAgent): Promise<Agent> {
    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create agent: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Update agent
   */
  static async update(id: number, data: Partial<InsertAgent>): Promise<Agent> {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update agent: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Update agent status
   */
  static async updateStatus(id: number, status: string): Promise<Agent> {
    const response = await fetch(`${this.BASE_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update agent status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Delete agent
   */
  static async delete(id: number): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  }

  /**
   * Get embed code for agent
   */
  static async getEmbedCode(id: number): Promise<{ embedCode: string }> {
    const response = await fetch(`${this.BASE_URL}/${id}/embed`);
    if (!response.ok) {
      throw new Error(`Failed to generate embed code: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Test agent with sample message
   */
  static async testAgent(id: number, message: string): Promise<{ response: string }> {
    const response = await fetch(`${this.BASE_URL}/${id}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to test agent: ${response.statusText}`);
    }
    return response.json();
  }
}