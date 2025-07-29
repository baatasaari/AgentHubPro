import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { join } from 'path';
import { storage } from './storage';
import { insertAgentSchema, insertConversationSchema } from '@shared/schema';
import { ragRoutes } from './rag';

// Create Fastify instance with logging
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss'
      }
    }
  }
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // Multipart for file uploads
  await fastify.register(multipart);

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'AgentHub API',
        description: 'Industry-specialized AI Assistant SaaS Platform API',
        version: '1.0.0'
      },
      host: 'localhost:5000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'agents', description: 'Agent management endpoints' },
        { name: 'conversations', description: 'Conversation tracking endpoints' },
        { name: 'rag', description: 'RAG knowledge management endpoints' },
        { name: 'usage', description: 'Usage statistics endpoints' }
      ]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });

  // Static files (for serving the frontend)
  await fastify.register(staticFiles, {
    root: join(process.cwd(), 'client/dist'),
    prefix: '/'
  });
}

// Agent routes
async function registerAgentRoutes() {
  // Get all agents
  fastify.get('/api/agents', {
    schema: {
      tags: ['agents'],
      description: 'Get all agents',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              businessName: { type: 'string' },
              businessDescription: { type: 'string' },
              industry: { type: 'string' },
              llmModel: { type: 'string' },
              interfaceType: { type: 'string' },
              status: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const agents = await storage.getAllAgents();
      return agents;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to fetch agents' };
    }
  });

  // Get specific agent
  fastify.get('/api/agents/:id', {
    schema: {
      tags: ['agents'],
      description: 'Get specific agent',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        reply.code(404);
        return { message: 'Agent not found' };
      }

      return agent;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to fetch agent' };
    }
  });

  // Create agent
  fastify.post('/api/agents', {
    schema: {
      tags: ['agents'],
      description: 'Create new agent',
      body: {
        type: 'object',
        required: ['businessName', 'businessDescription', 'industry', 'llmModel', 'interfaceType'],
        properties: {
          businessName: { type: 'string' },
          businessDescription: { type: 'string' },
          industry: { type: 'string' },
          llmModel: { type: 'string' },
          interfaceType: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validation = insertAgentSchema.safeParse(request.body);
      if (!validation.success) {
        reply.code(400);
        return {
          message: 'Invalid agent data',
          errors: validation.error.issues
        };
      }

      const agent = await storage.createAgent(validation.data);
      reply.code(201);
      return agent;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to create agent' };
    }
  });

  // Update agent
  fastify.patch('/api/agents/:id', {
    schema: {
      tags: ['agents'],
      description: 'Update agent',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      const validation = insertAgentSchema.partial().safeParse(request.body);
      if (!validation.success) {
        reply.code(400);
        return {
          message: 'Invalid agent data',
          errors: validation.error.issues
        };
      }

      const agent = await storage.updateAgent(agentId, validation.data);
      if (!agent) {
        reply.code(404);
        return { message: 'Agent not found' };
      }

      return agent;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to update agent' };
    }
  });

  // Update agent status
  fastify.patch('/api/agents/:id/status', {
    schema: {
      tags: ['agents'],
      description: 'Update agent status',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['draft', 'active', 'paused'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      if (!status || !['draft', 'active', 'paused'].includes(status)) {
        reply.code(400);
        return { message: 'Invalid status' };
      }

      const agent = await storage.updateAgentStatus(agentId, status);
      if (!agent) {
        reply.code(404);
        return { message: 'Agent not found' };
      }

      return agent;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to update agent status' };
    }
  });

  // Delete agent
  fastify.delete('/api/agents/:id', {
    schema: {
      tags: ['agents'],
      description: 'Delete agent',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      const deleted = await storage.deleteAgent(agentId);
      if (!deleted) {
        reply.code(404);
        return { message: 'Agent not found' };
      }

      reply.code(204);
      return;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to delete agent' };
    }
  });

  // Generate embed code
  fastify.get('/api/agents/:id/embed', {
    schema: {
      tags: ['agents'],
      description: 'Generate embed code for agent',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        reply.code(404);
        return { message: 'Agent not found' };
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

      return { embedCode };
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to generate embed code' };
    }
  });

  // Enhanced agent chat with RAG
  fastify.post('/api/agents/:id/chat', {
    schema: {
      tags: ['agents'],
      description: 'Chat with agent using RAG enhancement',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { query } = request.body as { query: string };
      const agentId = parseInt(id);
      
      if (isNaN(agentId)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      if (!query) {
        reply.code(400);
        return { message: 'Query is required' };
      }

      // Get agent
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        reply.code(404);
        return { message: 'Agent not found' };
      }

      // Use RAG system to generate response
      const ragRequest = { query, agent_id: id.toString() };
      
      // Call ragRoutes.query but capture the result
      let ragResponse: any;
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

      return {
        ...ragResponse,
        agent: {
          id: agent.id,
          businessName: agent.businessName,
          industry: agent.industry,
          llmModel: agent.llmModel,
          interfaceType: agent.interfaceType
        }
      };
    } catch (error) {
      fastify.log.error('Agent chat failed:', error);
      reply.code(500);
      return { message: 'Chat failed' };
    }
  });
}

// Conversation and usage routes
async function registerConversationRoutes() {
  // Get conversations by agent
  fastify.get('/api/conversations/:agentId', {
    schema: {
      tags: ['conversations'],
      description: 'Get conversations for specific agent',
      params: {
        type: 'object',
        properties: {
          agentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const id = parseInt(agentId);
      
      if (isNaN(id)) {
        reply.code(400);
        return { message: 'Invalid agent ID' };
      }

      const conversations = await storage.getConversationsByAgent(id);
      return conversations;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to fetch conversations' };
    }
  });

  // Create conversation
  fastify.post('/api/conversations', {
    schema: {
      tags: ['conversations'],
      description: 'Create new conversation',
      body: {
        type: 'object',
        required: ['agentId', 'userMessage', 'agentResponse', 'tokensUsed', 'cost'],
        properties: {
          agentId: { type: 'number' },
          userMessage: { type: 'string' },
          agentResponse: { type: 'string' },
          tokensUsed: { type: 'number' },
          cost: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validation = insertConversationSchema.safeParse(request.body);
      if (!validation.success) {
        reply.code(400);
        return {
          message: 'Invalid conversation data',
          errors: validation.error.issues
        };
      }

      const conversation = await storage.createConversation(validation.data);
      reply.code(201);
      return conversation;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to create conversation' };
    }
  });

  // Get usage stats
  fastify.get('/api/usage/stats', {
    schema: {
      tags: ['usage'],
      description: 'Get usage statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            totalConversations: { type: 'number' },
            totalCost: { type: 'number' },
            activeAgents: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const stats = await storage.getUsageStats();
      return stats;
    } catch (error) {
      reply.code(500);
      return { message: 'Failed to fetch usage stats' };
    }
  });
}

// RAG routes
async function registerRAGRoutes() {
  // RAG health check
  fastify.get('/api/rag/health', {
    schema: {
      tags: ['rag'],
      description: 'RAG system health check'
    }
  }, async (request, reply) => {
    return new Promise((resolve) => {
      ragRoutes.health(request as any, {
        json: resolve,
        status: () => ({ json: resolve })
      } as any);
    });
  });

  // RAG stats
  fastify.get('/api/rag/stats', {
    schema: {
      tags: ['rag'],
      description: 'RAG system statistics'
    }
  }, async (request, reply) => {
    return new Promise((resolve) => {
      ragRoutes.stats(request as any, {
        json: resolve,
        status: () => ({ json: resolve })
      } as any);
    });
  });

  // RAG query
  fastify.post('/api/rag/query', {
    schema: {
      tags: ['rag'],
      description: 'Query RAG system',
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          agent_id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    return new Promise((resolve, reject) => {
      ragRoutes.query({ body: request.body } as any, {
        json: resolve,
        status: (code: number) => ({
          json: (data: any) => {
            reply.code(code);
            resolve(data);
          }
        })
      } as any).catch(reject);
    });
  });

  // RAG search
  fastify.post('/api/rag/search', {
    schema: {
      tags: ['rag'],
      description: 'Search RAG documents',
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          agent_id: { type: 'string' },
          top_k: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    return new Promise((resolve, reject) => {
      ragRoutes.search({ body: request.body } as any, {
        json: resolve,
        status: (code: number) => ({
          json: (data: any) => {
            reply.code(code);
            resolve(data);
          }
        })
      } as any).catch(reject);
    });
  });

  // Add RAG document
  fastify.post('/api/rag/documents', {
    schema: {
      tags: ['rag'],
      description: 'Add document to RAG system',
      body: {
        type: 'object',
        required: ['title', 'content', 'source'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          doc_type: { type: 'string' },
          source: { type: 'string' },
          agent_id: { type: 'string' },
          industry: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    return new Promise((resolve, reject) => {
      ragRoutes.addDocument({ body: request.body } as any, {
        json: resolve,
        status: (code: number) => ({
          json: (data: any) => {
            reply.code(code);
            resolve(data);
          }
        })
      } as any).catch(reject);
    });
  });
}

// Catch-all route for SPA
async function registerSPARoute() {
  fastify.get('/*', async (request, reply) => {
    try {
      const filePath = join(process.cwd(), 'client/dist/index.html');
      return reply.sendFile('index.html');
    } catch (error) {
      reply.code(404);
      return { message: 'Page not found' };
    }
  });
}

// Initialize server
async function initializeServer() {
  try {
    await registerPlugins();
    await registerAgentRoutes();
    await registerConversationRoutes();
    await registerRAGRoutes();
    await registerSPARoute();

    // Start server
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0';

    await fastify.listen({ port: Number(PORT), host: HOST });
    
    fastify.log.info(`🚀 AgentHub Fastify server running on http://${HOST}:${PORT}`);
    fastify.log.info(`📚 API Documentation available at http://${HOST}:${PORT}/api/docs`);
    
  } catch (error) {
    fastify.log.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  initializeServer();
}

export default fastify;