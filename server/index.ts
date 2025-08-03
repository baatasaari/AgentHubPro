// Microservices-based server with simulated services for testing
import express from "express";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static frontend files
const distPath = path.join(__dirname, '../dist/public');
app.use(express.static(distPath));

// Authentication routes (synchronous import to ensure routes are registered)
import { registerAuthRoutes } from './auth-routes.js';
registerAuthRoutes(app);

// Import validated routes to replace raw dict payload endpoints
import validatedRoutes from './validated-routes.js';
app.use('/api/v2', validatedRoutes); // Mount validated routes on v2 endpoint

// Email reporting endpoints (must come before the catch-all /api/* middleware)
app.post('/api/email/send-report', async (req, res) => {
  try {
    console.log('Email report endpoint called');
    const { simpleEmailDemo } = await import('./simple-email-demonstration.js');
    const { toEmail, reportData } = req.body;
    
    if (!toEmail || !reportData) {
      return res.status(400).json({ error: 'Missing toEmail or reportData' });
    }

    console.log(`Sending report to: ${toEmail}`);
    const result = await simpleEmailDemo.sendExecutiveReport(toEmail, reportData);
    
    if (result.success) {
      console.log(`Report sent successfully to ${toEmail}`);
      res.json({ 
        success: true, 
        message: `Executive report sent to ${toEmail}`,
        previewUrl: result.previewUrl,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`Email sending failed: ${result.error}`);
      res.status(500).json({ 
        success: false, 
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Email service error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simulated microservices responses (when Docker services not available)
const simulatedResponses = {
  '/api/agents': [
    {
      "id": 1,
      "businessName": "HealthCare Assistant",
      "businessDescription": "AI assistant for healthcare providers to help patients with appointment scheduling, basic health information, and general inquiries.",
      "businessDomain": `${config.business.baseUrl}/demo/healthcare`,
      "industry": "healthcare",
      "llmModel": "gpt-4-turbo",
      "interfaceType": "webchat",
      "status": "active",
      "ragEnabled": "true",
      "ragKnowledgeBase": "Medical Knowledge Base",
      "ragDocuments": "[\"medical-procedures.pdf\", \"patient-guidelines.pdf\", \"insurance-info.pdf\"]",
      "ragQueryMode": "hybrid",
      "ragChunkSize": 1000,
      "ragOverlap": 200,
      "ragMaxResults": 5,
      "ragConfidenceThreshold": "0.8",
      "createdAt": "2024-11-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "businessName": "E-commerce Helper",
      "businessDescription": "Customer service bot for online retail store to assist with product information, order tracking, and returns.",
      "businessDomain": `${config.business.baseUrl}/demo/ecommerce`,
      "industry": "retail",
      "llmModel": "gpt-3.5-turbo",
      "interfaceType": "whatsapp",
      "status": "active",
      "ragEnabled": "false",
      "ragKnowledgeBase": "",
      "ragDocuments": "[]",
      "ragQueryMode": "hybrid",
      "ragChunkSize": 1000,
      "ragOverlap": 200,
      "ragMaxResults": 5,
      "ragConfidenceThreshold": "0.7",
      "createdAt": "2024-11-15T00:00:00.000Z"
    },
    {
      "id": 3,
      "businessName": "Legal Advisor Bot",
      "businessDescription": "Legal assistant for document analysis, case research, and client consultation scheduling.",
      "businessDomain": `${config.business.baseUrl}/demo/legal`,
      "industry": "legal",
      "llmModel": "gpt-4-turbo",
      "interfaceType": "webchat",
      "status": "draft",
      "ragEnabled": "true",
      "ragKnowledgeBase": "Legal Document Library",
      "ragDocuments": "[\"case-law.pdf\", \"legal-statutes.pdf\", \"contract-templates.pdf\", \"precedent-cases.pdf\"]",
      "ragQueryMode": "semantic",
      "ragChunkSize": 1500,
      "ragOverlap": 300,
      "ragMaxResults": 7,
      "ragConfidenceThreshold": "0.85",
      "createdAt": "2024-11-20T00:00:00.000Z"
    }
  ],
  '/api/analytics/dashboard': {
    "totalAgents": 8,
    "activeAgents": 6,
    "totalConversations": 127,
    "todayConversations": 12,
    "totalRevenue": 45670,
    "monthlyRevenue": 12450,
    "averageResponseTime": 58,
    "customerSatisfaction": 4.7,
    "industryBreakdown": {
      "healthcare": 3,
      "retail": 2,
      "finance": 2,
      "technology": 1
    }
  },
  '/api/analytics/customers': {
    "totalCustomers": 234,
    "activeCustomers": 187,
    "newCustomers": 23,
    "churnRate": 2.1
  },
  '/api/analytics/performance': {
    "systemHealth": "excellent",
    "avgResponseTime": 58,
    "successRate": 99.9,
    "errorRate": 0.1
  },
  '/api/usage/stats': {
    "totalConversations": 127,
    "totalCost": 1.247,
    "activeAgents": 8,
    "monthlyUsage": {
      "conversations": 89,
      "cost": 0.892
    }
  },
  '/api/rag/query': {
    "query": "What are your healthcare services?",
    "response": "Our healthcare services include consultations, appointments, and virtual consultations through telehealth services.",
    "sources": [
      {
        "title": "Healthcare FAQ",
        "source": "healthcare_knowledge_base",
        "relevance_score": 0.85,
        "content_preview": "Healthcare services and consultation information..."
      }
    ],
    "timestamp": new Date().toISOString()
  }
};

// Add JSON parsing middleware with error handling
app.use('/api', express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      res.status(400).json({
        error: 'Invalid JSON format',
        code: 'MALFORMED_JSON'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// Content-Type validation middleware
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  }
  next();
});

// Try to proxy to microservices first, fallback to simulated responses
app.use('/api', async (req, res, next) => {
  try {
    // Check if API Gateway is available
    const gateway = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1000) });
    if (gateway.ok) {
      // Proxy to real microservices
      return createProxyMiddleware({
        target: 'http://localhost:8000',
        changeOrigin: true,
      })(req, res, next);
    }
  } catch (error) {
    // API Gateway not available, use simulated responses
  }
  
  // Serve simulated microservices responses
  const endpoint = req.path;
  
  if (req.method === 'POST' && endpoint === '/agents') {
    try {
      const { businessName, businessDescription, businessDomain, industry } = req.body;
      
      // Required field validation
      if (!businessName || typeof businessName !== 'string') {
        return res.status(400).json({
          error: 'businessName is required and must be a string',
          code: 'VALIDATION_ERROR',
          field: 'businessName'
        });
      }
      
      if (!businessDescription || typeof businessDescription !== 'string') {
        return res.status(400).json({
          error: 'businessDescription is required and must be a string',
          code: 'VALIDATION_ERROR',
          field: 'businessDescription'
        });
      }
      
      if (!industry || typeof industry !== 'string') {
        return res.status(400).json({
          error: 'industry is required and must be a string',
          code: 'VALIDATION_ERROR',
          field: 'industry'
        });
      }
      
      // Length validation
      if (businessName.length > 100) {
        return res.status(400).json({
          error: 'businessName must be 100 characters or less',
          code: 'VALIDATION_ERROR',
          field: 'businessName'
        });
      }
      
      if (businessDescription.length > 500) {
        return res.status(400).json({
          error: 'businessDescription must be 500 characters or less',
          code: 'VALIDATION_ERROR',
          field: 'businessDescription'
        });
      }
      
      // Sanitize inputs to prevent XSS
      const sanitizedData = {
        businessName: businessName.replace(/<[^>]*>/g, ''),
        businessDescription: businessDescription.replace(/<[^>]*>/g, ''),
        businessDomain: businessDomain ? businessDomain.replace(/<[^>]*>/g, '') : '',
        industry: industry.replace(/<[^>]*>/g, '')
      };
      
      // Create agent with sanitized data
      const newAgent = {
        ...sanitizedData,
        id: Date.now(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        llmModel: req.body.llmModel || 'gpt-4o',
        interfaceType: req.body.interfaceType || 'webchat',
        // Ensure RAG fields are included
        ragEnabled: req.body.ragEnabled || 'false',
        ragKnowledgeBase: req.body.ragKnowledgeBase || '',
        ragDocuments: req.body.ragDocuments || '[]',
        ragQueryMode: req.body.ragQueryMode || 'hybrid',
        ragChunkSize: req.body.ragChunkSize || 1000,
        ragOverlap: req.body.ragOverlap || 200,
        ragMaxResults: req.body.ragMaxResults || 5,
        ragConfidenceThreshold: req.body.ragConfidenceThreshold || '0.7'
      };
      
      return res.status(201).json(newAgent);
    } catch (error) {
      console.error('Agent creation error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
  
  if (req.method === 'POST' && endpoint === '/conversations') {
    try {
      const { agentId, userId, message } = req.body;
      
      // Basic validation for conversations
      if (!agentId || (typeof agentId !== 'number' && typeof agentId !== 'string')) {
        return res.status(400).json({
          error: 'agentId is required and must be a number or string',
          code: 'VALIDATION_ERROR',
          field: 'agentId'
        });
      }
      
      // Check if agentId can be converted to number if it's a string
      if (typeof agentId === 'string' && isNaN(Number(agentId))) {
        return res.status(400).json({
          error: 'agentId must be a valid number',
          code: 'VALIDATION_ERROR',
          field: 'agentId'
        });
      }
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'message is required and must be a non-empty string',
          code: 'VALIDATION_ERROR',
          field: 'message'
        });
      }
      
      const newConversation = {
        id: Date.now(),
        agentId,
        userId: userId || 'anonymous',
        message: message.replace(/<[^>]*>/g, ''), // Sanitize XSS
        createdAt: new Date().toISOString()
      };
      
      return res.status(201).json(newConversation);
    } catch (error) {
      console.error('Conversation creation error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
  
  if (req.method === 'POST' && endpoint === '/rag/query') {
    try {
      const { query, agentId } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'query is required and must be a string',
          code: 'VALIDATION_ERROR',
          field: 'query'
        });
      }
      
      if (!agentId || typeof agentId !== 'number') {
        return res.status(400).json({
          error: 'agentId is required and must be a number',
          code: 'VALIDATION_ERROR',
          field: 'agentId'
        });
      }
      
      return res.json({
        ...simulatedResponses['/api/rag/query'],
        query: query.replace(/<[^>]*>/g, ''), // Sanitize XSS
        agentId
      });
    } catch (error) {
      console.error('RAG query error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
  
  const apiKey = `/api${endpoint}` as keyof typeof simulatedResponses;
  if (simulatedResponses[apiKey]) {
    return res.json(simulatedResponses[apiKey]);
  }
  
  // Check for microservice health endpoints
  if (endpoint.includes('/health')) {
    return res.json({
      status: 'healthy',
      service: endpoint.split('/')[1] || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
  
  // Return 404 for unknown endpoints instead of 200
  return res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    endpoint: endpoint,
    method: req.method,
    message: 'This API endpoint does not exist'
  });
});



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'microservices-simulation',
    services: 29,
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not built', 
      message: 'Run npm run build to generate frontend files',
      microservices_api: 'Available at /api/*',
      health_check: 'Available at /health'
    });
  }
});

const server = createServer(app);

server.listen(config.server.port, config.server.host, () => {
  console.log(`🚀 AgentHub Microservices Platform running on port ${config.server.port}`);
  console.log('🔧 Mode: Microservices simulation (Docker services will be preferred when available)');
  console.log(`🌐 Frontend: ${config.api.baseUrl}`);
  console.log(`📊 Health: ${config.api.baseUrl}/health`);
});