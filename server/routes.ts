import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAgentSchema, insertConversationSchema } from "@shared/schema";
import { z } from "zod";
import { ragRoutes } from "./rag";
import { registerPaymentRoutes } from './payment-routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register payment routes
  registerPaymentRoutes(app);
  // Agent routes
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const validation = insertAgentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid agent data", 
          errors: validation.error.issues 
        });
      }

      const agent = await storage.createAgent(validation.data);
      res.status(201).json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const validation = insertAgentSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid agent data", 
          errors: validation.error.issues 
        });
      }

      const agent = await storage.updateAgent(id, validation.data);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.patch("/api/agents/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const { status } = req.body;
      if (!status || !['draft', 'active', 'paused'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const agent = await storage.updateAgentStatus(id, status);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update agent status" });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const deleted = await storage.deleteAgent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Generate embed code for agent
  app.get("/api/agents/:id/embed", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const embedCode = `<!-- AgentHub Widget - ${agent.businessName} -->
<script>
(function() {
    var agentConfig = {
        agentId: 'agent_${agent.id}',
        businessName: '${agent.businessName.replace(/'/g, "\\'")}',
        industry: '${agent.industry}',
        model: '${agent.llmModel}',
        interface: '${agent.interfaceType}',
        theme: {
            primaryColor: '#2563eb',
            position: 'bottom-right'
        }
    };
    
    var script = document.createElement('script');
    script.src = 'https://cdn.agenthub.com/widget.js';
    script.onload = function() {
        if (typeof AgentHub !== 'undefined') {
            AgentHub.init(agentConfig);
        }
    };
    document.head.appendChild(script);
})();
</script>`;

      res.json({ embedCode });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate embed code" });
    }
  });

  // Conversation and usage routes
  app.get("/api/conversations/:agentId", async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const conversations = await storage.getConversationsByAgent(agentId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validation = insertConversationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid conversation data", 
          errors: validation.error.issues 
        });
      }

      const conversation = await storage.createConversation(validation.data);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/usage/stats", async (req, res) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  // RAG endpoints
  app.get("/api/rag/health", ragRoutes.health);
  app.get("/api/rag/stats", ragRoutes.stats);
  app.post("/api/rag/query", ragRoutes.query);
  app.post("/api/rag/search", ragRoutes.search);
  app.post("/api/rag/documents", ragRoutes.addDocument);

  // Enhanced agent chat with RAG
  app.post("/api/agents/:id/chat", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Get agent
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Use RAG system to generate response
      const ragRequest = { query, agent_id: id.toString() };
      
      // Call ragRoutes.query but capture the result
      let ragResponse;
      const mockRes = {
        json: (data: any) => { ragResponse = data; },
        status: (code: number) => ({ json: (data: any) => { ragResponse = { error: data, status: code }; } })
      };
      
      await ragRoutes.query({ body: ragRequest } as any, mockRes as any);
      
      if ((ragResponse as any)?.error) {
        // Fallback to simple response
        ragResponse = {
          query,
          response: `Hello! I'm ${agent.businessName}, your ${agent.industry} assistant. I'd be happy to help you with: ${query}`,
          sources: [],
          agent_id: id.toString(),
          timestamp: new Date().toISOString(),
          rag_enhanced: false
        };
      }

      res.json({
        ...ragResponse,
        agent: {
          id: agent.id,
          businessName: agent.businessName,
          industry: agent.industry,
          llmModel: agent.llmModel,
          interfaceType: agent.interfaceType
        }
      });
    } catch (error) {
      console.error('Agent chat failed:', error);
      res.status(500).json({ message: "Chat failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
