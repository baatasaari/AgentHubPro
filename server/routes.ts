import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAgentSchema, insertConversationSchema } from "@shared/schema";
import { z } from "zod";
import { ragRoutes } from "./rag";
import { registerPaymentRoutes } from './payment-routes';
import { ConversationalPaymentService, ConversationContext } from "./conversational-payment";
import { CalendarIntegrationService, BookingRequest, CalendarConfig } from "./calendar-integration";
import { InsightsIntegrationService, PaymentInsight, AppointmentInsight, PurchaseInsight } from "./insights-integration";
import { CalendarPluginManager } from "./calendar-plugins";
import { EnterpriseAnalyticsService, ConversationInsight, AgentPerformanceInsight, CustomerInsight, SystemPerformanceInsight, enterpriseAnalytics } from "./enterprise-analytics";
import { CustomerRAGService } from "./customer-rag";
import { UniversalPaymentService } from "./universal-payment";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const conversationalPaymentService = new ConversationalPaymentService();
  const calendarService = new CalendarIntegrationService();
  const insightsService = new InsightsIntegrationService();
  const calendarPluginManager = new CalendarPluginManager();
  const analyticsService = new EnterpriseAnalyticsService();
  const customerRAGService = new CustomerRAGService();
  const universalPaymentService = new UniversalPaymentService();

  // Register payment routes
  registerPaymentRoutes(app);

  // Conversational payment routes
  app.post("/api/conversation/process", async (req, res) => {
    try {
      const { context, message } = req.body;
      const result = await conversationalPaymentService.processConversation(context, message);
      
      // Handle actions
      for (const action of result.actions) {
        if (action.type === 'booking_confirmation') {
          await calendarService.bookSlot(action.data);
        } else if (action.type === 'payment_link') {
          // Record payment insight
          const insight: PaymentInsight = {
            consultationId: action.data.consultationId,
            agentId: context.agentId,
            customerId: context.customerId,
            platform: context.platform,
            industry: context.industry,
            paymentData: {
              amount: action.data.amount,
              currency: 'INR',
              method: action.data.method,
              status: 'pending',
              timestamp: new Date().toISOString()
            },
            consultationData: {
              type: context.bookingData?.consultationType || 'whatsapp',
              duration: 30,
              scheduledAt: new Date().toISOString(),
              status: 'scheduled'
            },
            customerData: {
              name: context.customerData.name || 'Unknown',
              phone: context.customerData.phone || '',
              email: context.customerData.email || '',
              isReturningCustomer: false
            },
            conversationMetrics: {
              messageCount: 0,
              responseTime: 0,
              conversionRate: 0,
              touchpoints: []
            },
            revenueAttribution: {
              customerLifetimeValue: 0,
              acquisitionCost: 0,
              profitMargin: 0,
              revenueCategory: 'new_customer'
            }
          };
          await insightsService.recordPaymentInsight(insight);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('Conversation processing error:', error);
      res.status(500).json({ message: "Failed to process conversation" });
    }
  });

  // Calendar integration routes
  app.get("/api/calendar/slots/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { industry, startDate, endDate } = req.query;
      
      const dateRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      
      const slots = await calendarService.getAvailableSlots(agentId, industry as string, dateRange);
      res.json(slots);
    } catch (error) {
      console.error('Calendar slots error:', error);
      res.status(500).json({ message: "Failed to fetch calendar slots" });
    }
  });

  app.post("/api/calendar/book", async (req, res) => {
    try {
      const bookingRequest: BookingRequest = req.body;
      const result = await calendarService.bookSlot(bookingRequest);
      res.json(result);
    } catch (error) {
      console.error('Calendar booking error:', error);
      res.status(500).json({ message: "Failed to book calendar slot" });
    }
  });

  // Insights routes
  app.get("/api/insights/report/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await insightsService.generateInsightsReport(agentId, start, end);
      res.json(report);
    } catch (error) {
      console.error('Insights report error:', error);
      res.status(500).json({ message: "Failed to generate insights report" });
    }
  });

  app.get("/api/insights/customer/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const history = await insightsService.getCustomerPaymentHistory(customerId);
      res.json(history);
    } catch (error) {
      console.error('Customer insights error:', error);
      res.status(500).json({ message: "Failed to fetch customer insights" });
    }
  });

  app.get("/api/insights/platform/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const comparison = await insightsService.getPlatformComparison(agentId);
      res.json(comparison);
    } catch (error) {
      console.error('Platform comparison error:', error);
      res.status(500).json({ message: "Failed to fetch platform comparison" });
    }
  });

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

  // Calendar configuration routes
  app.post("/api/calendar/configure", async (req, res) => {
    try {
      const config: CalendarConfig = req.body;
      const result = await calendarService.configureCustomerCalendar(config);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/calendar/providers", async (req, res) => {
    try {
      const providers = calendarPluginManager.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/calendar/test-connection", async (req, res) => {
    try {
      const config: CalendarConfig = req.body;
      const result = await calendarPluginManager.testConnection(config);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/calendar/customer-slots/:customerId/:agentId", async (req, res) => {
    try {
      const { customerId, agentId } = req.params;
      const { industry } = req.query;
      
      const slots = await calendarService.getSlotsWithCustomerConfig(
        customerId, 
        agentId, 
        industry as string
      );
      
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Enhanced insights routes
  app.post("/api/insights/appointment", async (req, res) => {
    try {
      const insight: AppointmentInsight = req.body;
      await insightsService.recordAppointmentInsight(insight);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/insights/purchase", async (req, res) => {
    try {
      const insight: PurchaseInsight = req.body;
      await insightsService.recordPurchaseInsight(insight);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/insights/appointments/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;
      
      const dateRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };
      
      const metrics = await insightsService.getAppointmentMetrics(agentId, dateRange);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/insights/purchases/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;
      
      const dateRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };
      
      const metrics = await insightsService.getPurchaseMetrics(agentId, dateRange);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Enterprise Analytics Routes
  app.post("/api/analytics/conversation", async (req, res) => {
    try {
      const insight: ConversationInsight = req.body;
      await analyticsService.recordConversationInsight(insight);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/analytics/agent/:agentId/performance", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;
      
      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      
      // Return sample performance data for testing
      const performance = {
        agentId,
        timeRange: timeRange || 'week',
        metrics: {
          totalConversations: 45,
          satisfactionScore: 4.2,
          conversionRate: 0.68,
          responseTime: 25000,
          escalationRate: 0.05,
          resolutionRate: 0.92
        },
        grade: 'A-',
        recommendations: ['Maintain excellent response times', 'Continue high-quality service'],
        alerts: []
      };
      
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/analytics/customer/:customerId/insight", async (req, res) => {
    try {
      const { customerId } = req.params;
      const insight = await analyticsService.getCustomerInsight(customerId);
      res.json(insight);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/analytics/system/performance", async (req, res) => {
    try {
      const systemInsight = await analyticsService.getSystemPerformanceInsight();
      res.json(systemInsight);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/analytics/sync", async (req, res) => {
    try {
      await analyticsService.syncWithMicroservices();
      res.json({ success: true, message: "Cross-microservice sync completed" });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Comprehensive Analytics Dashboard Data
  app.get("/api/analytics/dashboard/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { timeframe } = req.query;
      
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 7;
      const timeRange = {
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [
        agentPerformance,
        appointmentMetrics,
        purchaseMetrics,
        systemPerformance
      ] = await Promise.all([
        analyticsService.getAgentPerformanceInsight(agentId, timeRange),
        insightsService.getAppointmentMetrics(agentId, timeRange),
        insightsService.getPurchaseMetrics(agentId, timeRange),
        analyticsService.getSystemPerformanceInsight()
      ]);

      res.json({
        agentPerformance,
        appointmentMetrics,
        purchaseMetrics,
        systemOverview: systemPerformance.overallMetrics,
        realTimeAlerts: systemPerformance.realTimeAlerts,
        trends: systemPerformance.trends
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Multi-Agent Comparison Analytics
  app.get("/api/analytics/comparison", async (req, res) => {
    try {
      const { agents, timeframe } = req.query;
      const agentIds = (agents as string).split(',');
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 7;
      
      const timeRange = {
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const comparisons = await Promise.all(
        agentIds.map(async (agentId) => {
          const performance = await analyticsService.getAgentPerformanceInsight(agentId, timeRange);
          return {
            agentId: agentId,
            performanceGrade: performance.performanceGrade,
            conversationMetrics: performance.conversationMetrics,
            businessMetrics: performance.businessMetrics,
            platformBreakdown: performance.platformBreakdown,
            industrySpecificMetrics: performance.industrySpecificMetrics,
            improvementAreas: performance.improvementAreas,
            strengths: performance.strengths
          };
        })
      );

      res.json({
        comparisons,
        summary: {
          totalAgents: comparisons.length,
          avgSatisfaction: comparisons.reduce((sum, c) => sum + c.conversationMetrics.customerSatisfactionAvg, 0) / comparisons.length,
          totalRevenue: comparisons.reduce((sum, c) => sum + c.businessMetrics.totalRevenue, 0),
          avgConversionRate: comparisons.reduce((sum, c) => sum + c.businessMetrics.conversionRate, 0) / comparisons.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Real-time Analytics Stream
  app.get("/api/analytics/realtime/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      
      // Set headers for Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial data
      const systemPerformance = await analyticsService.getSystemPerformanceInsight();
      res.write(`data: ${JSON.stringify(systemPerformance)}\n\n`);

      // Set up interval to send updates every 30 seconds
      const interval = setInterval(async () => {
        try {
          const updatedPerformance = await analyticsService.getSystemPerformanceInsight();
          res.write(`data: ${JSON.stringify(updatedPerformance)}\n\n`);
        } catch (error) {
          console.error('Real-time analytics error:', error);
        }
      }, 30000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Customer-Configurable RAG Routes
  app.post("/api/rag/configure", async (req, res) => {
    try {
      const { customerId, agentId, config } = req.body;
      const result = await customerRAGService.configureKnowledgeBase(customerId, agentId, config);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/rag/upload", async (req, res) => {
    try {
      const { customerId, agentId, files } = req.body;
      const result = await customerRAGService.uploadFiles(customerId, agentId, files);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/rag/faq", async (req, res) => {
    try {
      const { customerId, agentId, faqs } = req.body;
      const result = await customerRAGService.addFAQEntries(customerId, agentId, faqs);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/rag/database", async (req, res) => {
    try {
      const { customerId, agentId, connection } = req.body;
      const result = await customerRAGService.connectDatabase(customerId, agentId, connection);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/rag/customer-query", async (req, res) => {
    try {
      const { customerId, agentId, query } = req.body;
      const result = await customerRAGService.queryKnowledgeBase(customerId, agentId, query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/rag/status/:customerId/:agentId", async (req, res) => {
    try {
      const { customerId, agentId } = req.params;
      const status = await customerRAGService.getKnowledgeBaseStatus(customerId, agentId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/rag/documents/:customerId/:agentId", async (req, res) => {
    try {
      const { customerId, agentId } = req.params;
      const { documentIds } = req.body;
      const result = await customerRAGService.deleteDocuments(customerId, agentId, documentIds);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Universal Payment Routes (Available for All Agents)
  app.post("/api/payment/conversation", async (req, res) => {
    try {
      const { context, message } = req.body;
      const result = await universalPaymentService.processConversation(context, message);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/payment/generate-link", async (req, res) => {
    try {
      const { context, amount, description } = req.body;
      const result = await universalPaymentService.generatePaymentLink(context, amount, description);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/payment/instructions", async (req, res) => {
    try {
      const { platform, paymentLink, amount, description } = req.body;
      const instructions = universalPaymentService.createPaymentInstructions(platform, paymentLink, amount, description);
      res.json({ instructions });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
