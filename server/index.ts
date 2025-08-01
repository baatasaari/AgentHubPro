// Microservices-based server with simulated services for testing
import express from "express";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static frontend files
const distPath = path.join(__dirname, '../dist/public');
app.use(express.static(distPath));

// Email reporting endpoints (must come before the catch-all /api/* middleware)
app.post('/api/email/send-report', async (req, res) => {
  try {
    console.log('Email report endpoint called');
    const { workingEmailService } = await import('./working-email-service.js');
    const { toEmail, reportData } = req.body;
    
    if (!toEmail || !reportData) {
      return res.status(400).json({ error: 'Missing toEmail or reportData' });
    }

    console.log(`Sending report to: ${toEmail}`);
    const result = await workingEmailService.sendExecutiveReport(toEmail, reportData);
    
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
      "businessDomain": "https://healthcare-example.com",
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
      "businessDomain": "https://shop-example.com",
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
      "businessDomain": "https://lawfirm-example.com",
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
    const newAgent = {
      ...req.body,
      id: Date.now(),
      status: 'draft',
      createdAt: new Date().toISOString(),
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
  }
  
  if (req.method === 'POST' && endpoint === '/conversations') {
    const newConversation = {
      ...req.body,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    return res.status(201).json(newConversation);
  }
  
  if (req.method === 'POST' && endpoint === '/rag/query') {
    return res.json({
      ...simulatedResponses['/api/rag/query'],
      query: req.body.query || 'test query'
    });
  }
  
  const apiKey = `/api${endpoint}` as keyof typeof simulatedResponses;
  if (simulatedResponses[apiKey]) {
    return res.json(simulatedResponses[apiKey]);
  }
  
  // Default response for unmapped endpoints
  res.status(200).json({ 
    message: `Microservice endpoint ${endpoint} simulated`,
    microservices_mode: 'simulated',
    timestamp: new Date().toISOString()
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
const port = Number(process.env.PORT) || 5000;

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 AgentHub Microservices Platform running on port ${port}`);
  console.log('🔧 Mode: Microservices simulation (Docker services will be preferred when available)');
  console.log('🌐 Frontend: http://localhost:5000');
  console.log('📊 Health: http://localhost:5000/health');
});