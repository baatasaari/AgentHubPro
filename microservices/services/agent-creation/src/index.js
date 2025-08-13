// AgentHub Agent Creation Service
// Handles agent creation, configuration, and template management

const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'agent-creation.log' })
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// External service URLs
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://llm-service:3000';
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:3000';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use(limiter);

// Validation schemas
const agentCreationSchema = Joi.object({
  businessName: Joi.string().min(2).max(100).required(),
  businessDescription: Joi.string().min(10).max(500).required(),
  businessDomain: Joi.string().uri().allow('').optional(),
  industry: Joi.string().valid(
    'technology', 'healthcare', 'finance', 'retail', 'education',
    'realestate', 'legal', 'hospitality', 'manufacturing', 'consulting'
  ).required(),
  llmModel: Joi.string().valid(
    'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku',
    'gemini-pro', 'gemini-flash'
  ).required(),
  interfaceType: Joi.string().valid(
    'webchat', 'whatsapp', 'instagram', 'messenger', 'sms', 'telegram'
  ).required(),
  organizationId: Joi.number().integer().positive().required(),
  createdBy: Joi.number().integer().positive().required(),
  customPrompt: Joi.string().max(2000).optional(),
  ragEnabled: Joi.boolean().default(false),
  ragConfiguration: Joi.object({
    knowledgeBase: Joi.string().max(100).optional(),
    documents: Joi.array().items(Joi.string()).optional(),
    queryMode: Joi.string().valid('semantic', 'keyword', 'hybrid').default('hybrid'),
    chunkSize: Joi.number().integer().min(100).max(5000).default(1000),
    overlap: Joi.number().integer().min(0).max(500).default(200),
    maxResults: Joi.number().integer().min(1).max(20).default(5),
    confidenceThreshold: Joi.number().min(0.1).max(1.0).default(0.7)
  }).optional()
});

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(100) NOT NULL,
        business_description TEXT NOT NULL,
        business_domain VARCHAR(255),
        industry VARCHAR(50) NOT NULL,
        llm_model VARCHAR(50) NOT NULL,
        interface_type VARCHAR(20) NOT NULL,
        organization_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        custom_prompt TEXT,
        system_prompt TEXT,
        model_parameters JSONB DEFAULT '{}',
        interface_config JSONB DEFAULT '{}',
        rag_enabled BOOLEAN DEFAULT false,
        rag_configuration JSONB DEFAULT '{}',
        performance_metrics JSONB DEFAULT '{}',
        deployment_config JSONB DEFAULT '{}',
        api_key VARCHAR(255),
        webhook_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        industry VARCHAR(50) NOT NULL,
        default_prompt TEXT NOT NULL,
        default_llm_model VARCHAR(50) NOT NULL,
        recommended_interfaces JSONB DEFAULT '[]',
        configuration JSONB DEFAULT '{}',
        usage_count INTEGER DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0.0,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_versions (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        version_number VARCHAR(20) NOT NULL,
        configuration JSONB NOT NULL,
        deployment_status VARCHAR(20) DEFAULT 'inactive',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agents_organization ON agents(organization_id);
      CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_agent_templates_industry ON agent_templates(industry);
      CREATE INDEX IF NOT EXISTS idx_agent_versions_agent_id ON agent_versions(agent_id);
    `);
    
    // Insert default templates
    await insertDefaultTemplates();
    
    logger.info('Agent creation service database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

async function insertDefaultTemplates() {
  const templates = [
    {
      name: 'Customer Support Assistant',
      description: 'AI-powered customer service agent with FAQ handling and ticket escalation',
      industry: 'technology',
      defaultPrompt: 'You are a helpful customer support assistant. Provide clear, friendly responses to customer inquiries. Escalate complex issues to human agents when necessary.',
      defaultLlmModel: 'gpt-4-turbo',
      recommendedInterfaces: ['webchat', 'whatsapp', 'messenger'],
      configuration: {
        temperature: 0.7,
        maxTokens: 500,
        responseStyle: 'friendly',
        escalationKeywords: ['refund', 'complaint', 'manager', 'urgent']
      }
    },
    {
      name: 'Healthcare Information Assistant',
      description: 'HIPAA-compliant healthcare information and appointment scheduling assistant',
      industry: 'healthcare',
      defaultPrompt: 'You are a healthcare information assistant. Provide general health information and help with appointment scheduling. Always remind users to consult healthcare professionals for medical advice.',
      defaultLlmModel: 'gpt-4-turbo',
      recommendedInterfaces: ['webchat', 'sms'],
      configuration: {
        temperature: 0.3,
        maxTokens: 400,
        complianceMode: 'hipaa',
        disclaimerRequired: true
      }
    },
    {
      name: 'Financial Advisory Bot',
      description: 'Personal finance guidance and investment information assistant',
      industry: 'finance',
      defaultPrompt: 'You are a financial advisory assistant. Provide general financial guidance and investment information. Always include appropriate disclaimers about financial advice.',
      defaultLlmModel: 'gpt-4-turbo',
      recommendedInterfaces: ['webchat', 'telegram'],
      configuration: {
        temperature: 0.4,
        maxTokens: 600,
        regulatoryCompliance: true,
        disclaimerText: 'This is not personalized financial advice. Consult a qualified financial advisor.'
      }
    },
    {
      name: 'E-commerce Shopping Assistant',
      description: 'Product recommendation and shopping assistance for retail businesses',
      industry: 'retail',
      defaultPrompt: 'You are a shopping assistant. Help customers find products, provide recommendations, and assist with order inquiries. Be enthusiastic about products while being helpful.',
      defaultLlmModel: 'gpt-3.5-turbo',
      recommendedInterfaces: ['webchat', 'whatsapp', 'instagram'],
      configuration: {
        temperature: 0.8,
        maxTokens: 400,
        productCatalogIntegration: true,
        recommendationEngine: true
      }
    },
    {
      name: 'Educational Tutor Assistant',
      description: 'Academic support and learning assistance for educational institutions',
      industry: 'education',
      defaultPrompt: 'You are an educational tutor assistant. Help students with learning concepts, provide explanations, and guide them through problem-solving. Encourage learning and critical thinking.',
      defaultLlmModel: 'claude-3-sonnet',
      recommendedInterfaces: ['webchat', 'telegram'],
      configuration: {
        temperature: 0.6,
        maxTokens: 700,
        educationalLevel: 'adaptive',
        subjectAreas: ['math', 'science', 'language', 'history']
      }
    }
  ];

  for (const template of templates) {
    try {
      await pool.query(`
        INSERT INTO agent_templates 
        (name, description, industry, default_prompt, default_llm_model, recommended_interfaces, configuration)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        template.name,
        template.description,
        template.industry,
        template.defaultPrompt,
        template.defaultLlmModel,
        JSON.stringify(template.recommendedInterfaces),
        JSON.stringify(template.configuration)
      ]);
    } catch (error) {
      logger.warn('Failed to insert template:', template.name, error);
    }
  }
}

// Utility functions
function generateSystemPrompt(businessName, businessDescription, industry, customPrompt, template) {
  let basePrompt = `You are an AI assistant for ${businessName}. ${businessDescription}`;
  
  if (template) {
    basePrompt = template.default_prompt.replace(/\{businessName\}/g, businessName);
  }
  
  const industryPrompts = {
    healthcare: ' Always prioritize patient safety and recommend consulting healthcare professionals for medical advice.',
    finance: ' Provide general financial information and always include appropriate disclaimers.',
    legal: ' Provide general legal information only and recommend consulting qualified legal professionals.',
    education: ' Focus on learning and education, encouraging critical thinking and academic growth.',
    retail: ' Help customers find products and provide excellent shopping assistance.',
    technology: ' Provide technical support and information while being patient and clear.',
    hospitality: ' Be welcoming, helpful, and focused on customer satisfaction.',
    realestate: ' Assist with property information and real estate guidance.',
    manufacturing: ' Focus on product information, specifications, and technical details.',
    consulting: ' Provide expert advice and strategic guidance in your area of expertise.'
  };
  
  if (industryPrompts[industry]) {
    basePrompt += industryPrompts[industry];
  }
  
  if (customPrompt) {
    basePrompt += ` Additional instructions: ${customPrompt}`;
  }
  
  basePrompt += ' Always be helpful, professional, and accurate in your responses.';
  
  return basePrompt;
}

function generateApiKey() {
  return 'ak_' + uuidv4().replace(/-/g, '');
}

async function validateLLMModel(model) {
  try {
    const response = await axios.post(`${LLM_SERVICE_URL}/models/validate`, { model });
    return response.data.valid;
  } catch (error) {
    logger.warn('LLM validation service unavailable, assuming valid:', model);
    return true; // Fallback to assuming valid
  }
}

async function setupRAGConfiguration(agentId, ragConfig) {
  if (!ragConfig || !ragConfig.knowledgeBase) {
    return null;
  }
  
  try {
    const response = await axios.post(`${RAG_SERVICE_URL}/knowledge-bases`, {
      agentId,
      name: ragConfig.knowledgeBase,
      configuration: ragConfig
    });
    
    return response.data.knowledgeBaseId;
  } catch (error) {
    logger.error('Failed to setup RAG configuration:', error);
    throw new Error('Failed to configure knowledge base');
  }
}

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      service: 'agent-creation-service',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'agent-creation-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Get agent templates
app.get('/templates', async (req, res) => {
  try {
    const { industry } = req.query;
    
    let query = `
      SELECT id, name, description, industry, default_llm_model, 
             recommended_interfaces, configuration, usage_count, rating
      FROM agent_templates 
      WHERE is_active = true
    `;
    const params = [];
    
    if (industry) {
      query += ' AND industry = $1';
      params.push(industry);
    }
    
    query += ' ORDER BY usage_count DESC, rating DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      templates: result.rows.map(template => ({
        ...template,
        recommendedInterfaces: template.recommended_interfaces,
        configuration: template.configuration
      }))
    });
    
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new agent
app.post('/agents', async (req, res) => {
  try {
    // Validate request data
    const { error, value } = agentCreationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const {
      businessName,
      businessDescription,
      businessDomain,
      industry,
      llmModel,
      interfaceType,
      organizationId,
      createdBy,
      customPrompt,
      ragEnabled,
      ragConfiguration
    } = value;

    // Validate LLM model
    const isValidModel = await validateLLMModel(llmModel);
    if (!isValidModel) {
      return res.status(400).json({ error: 'Invalid LLM model' });
    }

    // Get template if available
    const templateResult = await pool.query(
      'SELECT * FROM agent_templates WHERE industry = $1 AND is_active = true ORDER BY usage_count DESC LIMIT 1',
      [industry]
    );
    const template = templateResult.rows[0];

    // Generate system prompt
    const systemPrompt = generateSystemPrompt(
      businessName, 
      businessDescription, 
      industry, 
      customPrompt, 
      template
    );

    // Generate API key
    const apiKey = generateApiKey();

    // Create agent
    const agentResult = await pool.query(`
      INSERT INTO agents (
        business_name, business_description, business_domain, industry,
        llm_model, interface_type, organization_id, created_by,
        custom_prompt, system_prompt, rag_enabled, api_key, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
      RETURNING *
    `, [
      businessName, businessDescription, businessDomain, industry,
      llmModel, interfaceType, organizationId, createdBy,
      customPrompt, systemPrompt, ragEnabled, apiKey
    ]);

    const agent = agentResult.rows[0];

    // Setup RAG if enabled
    let ragKnowledgeBaseId = null;
    if (ragEnabled && ragConfiguration) {
      try {
        ragKnowledgeBaseId = await setupRAGConfiguration(agent.id, ragConfiguration);
        
        await pool.query(
          'UPDATE agents SET rag_configuration = $1 WHERE id = $2',
          [JSON.stringify({ ...ragConfiguration, knowledgeBaseId: ragKnowledgeBaseId }), agent.id]
        );
      } catch (ragError) {
        logger.warn('RAG setup failed, continuing without:', ragError.message);
      }
    }

    // Update template usage count
    if (template) {
      await pool.query(
        'UPDATE agent_templates SET usage_count = usage_count + 1 WHERE id = $1',
        [template.id]
      );
    }

    // Create initial version
    await pool.query(`
      INSERT INTO agent_versions (agent_id, version_number, configuration, created_by)
      VALUES ($1, '1.0.0', $2, $3)
    `, [
      agent.id,
      JSON.stringify({
        systemPrompt,
        llmModel,
        interfaceType,
        ragEnabled,
        ragConfiguration: ragConfiguration || {}
      }),
      createdBy
    ]);

    logger.info('Agent created successfully', { 
      agentId: agent.id, 
      businessName, 
      organizationId 
    });

    res.status(201).json({
      message: 'Agent created successfully',
      agent: {
        id: agent.id,
        businessName: agent.business_name,
        businessDescription: agent.business_description,
        businessDomain: agent.business_domain,
        industry: agent.industry,
        llmModel: agent.llm_model,
        interfaceType: agent.interface_type,
        status: agent.status,
        ragEnabled: agent.rag_enabled,
        apiKey: agent.api_key,
        createdAt: agent.created_at
      },
      ragKnowledgeBaseId
    });

  } catch (error) {
    logger.error('Agent creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agents
app.get('/agents', async (req, res) => {
  try {
    const { organizationId, createdBy, status, industry, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT id, business_name, business_description, business_domain,
             industry, llm_model, interface_type, status, rag_enabled,
             created_at, updated_at
      FROM agents WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      params.push(organizationId);
    }
    
    if (createdBy) {
      paramCount++;
      query += ` AND created_by = $${paramCount}`;
      params.push(createdBy);
    }
    
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    if (industry) {
      paramCount++;
      query += ` AND industry = $${paramCount}`;
      params.push(industry);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM agents WHERE 1=1';
    const countParams = [];
    let countParamIndex = 0;
    
    if (organizationId) {
      countParamIndex++;
      countQuery += ` AND organization_id = $${countParamIndex}`;
      countParams.push(organizationId);
    }
    
    if (createdBy) {
      countParamIndex++;
      countQuery += ` AND created_by = $${countParamIndex}`;
      countParams.push(createdBy);
    }
    
    if (status) {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }
    
    if (industry) {
      countParamIndex++;
      countQuery += ` AND industry = $${countParamIndex}`;
      countParams.push(industry);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      agents: result.rows.map(agent => ({
        id: agent.id,
        businessName: agent.business_name,
        businessDescription: agent.business_description,
        businessDomain: agent.business_domain,
        industry: agent.industry,
        llmModel: agent.llm_model,
        interfaceType: agent.interface_type,
        status: agent.status,
        ragEnabled: agent.rag_enabled,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    logger.error('Get agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single agent
app.get('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM agents WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agent = result.rows[0];
    
    res.json({
      agent: {
        id: agent.id,
        businessName: agent.business_name,
        businessDescription: agent.business_description,
        businessDomain: agent.business_domain,
        industry: agent.industry,
        llmModel: agent.llm_model,
        interfaceType: agent.interface_type,
        status: agent.status,
        customPrompt: agent.custom_prompt,
        systemPrompt: agent.system_prompt,
        ragEnabled: agent.rag_enabled,
        ragConfiguration: agent.rag_configuration,
        modelParameters: agent.model_parameters,
        interfaceConfig: agent.interface_config,
        performanceMetrics: agent.performance_metrics,
        apiKey: agent.api_key,
        webhookUrl: agent.webhook_url,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      }
    });
    
  } catch (error) {
    logger.error('Get agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate agent
app.post('/agents/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessName, organizationId, createdBy } = req.body;
    
    if (!businessName || !organizationId || !createdBy) {
      return res.status(400).json({ 
        error: 'Business name, organization ID, and created by are required' 
      });
    }
    
    // Get original agent
    const originalResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const original = originalResult.rows[0];
    
    // Create duplicate
    const duplicateResult = await pool.query(`
      INSERT INTO agents (
        business_name, business_description, business_domain, industry,
        llm_model, interface_type, organization_id, created_by,
        custom_prompt, system_prompt, rag_enabled, rag_configuration,
        model_parameters, interface_config, api_key, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
      RETURNING *
    `, [
      businessName,
      original.business_description,
      original.business_domain,
      original.industry,
      original.llm_model,
      original.interface_type,
      organizationId,
      createdBy,
      original.custom_prompt,
      original.system_prompt,
      original.rag_enabled,
      original.rag_configuration,
      original.model_parameters,
      original.interface_config,
      generateApiKey()
    ]);
    
    const duplicate = duplicateResult.rows[0];
    
    logger.info('Agent duplicated successfully', { 
      originalId: id, 
      duplicateId: duplicate.id, 
      businessName 
    });
    
    res.status(201).json({
      message: 'Agent duplicated successfully',
      agent: {
        id: duplicate.id,
        businessName: duplicate.business_name,
        businessDescription: duplicate.business_description,
        industry: duplicate.industry,
        llmModel: duplicate.llm_model,
        interfaceType: duplicate.interface_type,
        status: duplicate.status,
        createdAt: duplicate.created_at
      }
    });
    
  } catch (error) {
    logger.error('Agent duplication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Agent creation service running on port ${PORT}`);
      console.log(`🤖 Agent Creation Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();