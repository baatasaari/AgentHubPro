// Validated Routes Implementation - AgentHub Platform
// Replaces raw dict payload endpoints with proper Pydantic-style validation

import express, { Request, Response, NextFunction } from 'express';
import { 
  CreateAgentSchema, UpdateAgentSchema, AgentStatusUpdateSchema,
  CreateConversationSchema, ConversationQuerySchema,
  RAGQuerySchema, RAGDocumentSchema, RAGConfigurationSchema,
  CreateUserSchema, UpdateUserSchema, LoginSchema,
  PaymentRequestSchema, PaymentVerificationSchema, ConsultationBookingSchema,
  CalendarConfigSchema, CalendarBookingSchema,
  ConversationInsightSchema, AppointmentInsightSchema, PurchaseInsightSchema,
  AdminPaymentConfigSchema, EmailReportSchema,
  validateRequest, formatValidationErrors, createValidationMiddleware
} from './validation-models.js';
// Import storage with await handling
const storage = await import('./storage.js').then(m => m.storage);
// Conditional imports for production features
const distributedCache = process.env.NODE_ENV === 'production' 
  ? await import('./distributed-cache.js').then(m => m.distributedCache)
  : null;
const persistentRAG = process.env.NODE_ENV === 'production'
  ? await import('./persistent-rag.js').then(m => m.persistentRAG)
  : null;
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Enhanced validation middleware with logging
function validateAndLog<T>(schema: any, endpoint: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔍 Validating ${endpoint} request payload`);
    
    const validation = validateRequest(schema, req.body);
    
    if (!validation.success) {
      const formattedErrors = formatValidationErrors(validation.errors!);
      console.log(`❌ Validation failed for ${endpoint}:`, formattedErrors);
      
      return res.status(400).json({
        error: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        endpoint,
        details: formattedErrors
      });
    }
    
    console.log(`✅ Validation passed for ${endpoint}`);
    req.validatedBody = validation.data;
    next();
  };
}

export const validatedRoutes = express.Router();

// Agent Management Routes with Validation
validatedRoutes.post('/agents', 
  validateAndLog(CreateAgentSchema, 'POST /agents'),
  async (req: Request, res: Response) => {
    try {
      const agentData = req.validatedBody;
      
      // Additional business logic validation
      if (agentData.businessDomain) {
        // Validate domain accessibility (could be async)
        try {
          new URL(agentData.businessDomain);
        } catch {
          return res.status(400).json({
            error: 'Invalid business domain URL',
            code: 'BUSINESS_VALIDATION_ERROR',
            field: 'businessDomain'
          });
        }
      }
      
      // Create agent with validated data
      const agent = await storage.createAgent({
        ...agentData,
        organizationId: agentData.organizationId || 1, // Default org
        createdBy: agentData.createdBy || 1, // Default user
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Log audit trail
      await storage.logAction({
        userId: agentData.createdBy || 1,
        organizationId: agentData.organizationId || 1,
        action: 'CREATE_AGENT',
        resource: 'agents',
        resourceId: agent.id,
        details: JSON.stringify({ businessName: agent.businessName, industry: agent.industry }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });
      
      res.status(201).json({
        success: true,
        agent,
        message: 'Agent created successfully'
      });
    } catch (error) {
      console.error('Agent creation failed:', error);
      res.status(500).json({
        error: 'Failed to create agent',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.patch('/agents/:id', 
  validateAndLog(UpdateAgentSchema, 'PATCH /agents/:id'),
  async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'INVALID_PARAMETER'
        });
      }
      
      const updateData = req.validatedBody;
      
      // Check if agent exists
      const existingAgent = await storage.getAgent(agentId);
      if (!existingAgent) {
        return res.status(404).json({
          error: 'Agent not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Update agent
      const updatedAgent = await storage.updateAgent(agentId, updateData);
      
      // Invalidate cache
      await distributedCache.invalidateAgentConfig(agentId);
      
      // Log audit trail
      await storage.logAction({
        userId: 1, // From auth context
        organizationId: existingAgent.organizationId,
        action: 'UPDATE_AGENT',
        resource: 'agents',
        resourceId: agentId,
        details: JSON.stringify(updateData),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({
        success: true,
        agent: updatedAgent,
        message: 'Agent updated successfully'
      });
    } catch (error) {
      console.error('Agent update failed:', error);
      res.status(500).json({
        error: 'Failed to update agent',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.patch('/agents/:id/status', 
  validateAndLog(AgentStatusUpdateSchema, 'PATCH /agents/:id/status'),
  async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'INVALID_PARAMETER'
        });
      }
      
      const { status } = req.validatedBody;
      
      const updatedAgent = await storage.updateAgentStatus(agentId, status);
      if (!updatedAgent) {
        return res.status(404).json({
          error: 'Agent not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        agent: updatedAgent,
        message: `Agent status updated to ${status}`
      });
    } catch (error) {
      console.error('Agent status update failed:', error);
      res.status(500).json({
        error: 'Failed to update agent status',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Conversation Routes with Validation
validatedRoutes.post('/conversations', 
  validateAndLog(CreateConversationSchema, 'POST /conversations'),
  async (req: Request, res: Response) => {
    try {
      const conversationData = req.validatedBody;
      
      // Verify agent exists
      const agent = await storage.getAgent(conversationData.agentId);
      if (!agent) {
        return res.status(400).json({
          error: 'Referenced agent does not exist',
          code: 'FOREIGN_KEY_ERROR',
          field: 'agentId'
        });
      }
      
      // Create conversation
      const conversation = await storage.createConversation({
        ...conversationData,
        organizationId: conversationData.organizationId || agent.organizationId,
        createdAt: new Date()
      });
      
      res.status(201).json({
        success: true,
        conversation,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      console.error('Conversation creation failed:', error);
      res.status(500).json({
        error: 'Failed to create conversation',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.post('/agents/:id/chat', 
  validateAndLog(ConversationQuerySchema, 'POST /agents/:id/chat'),
  async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'INVALID_PARAMETER'
        });
      }
      
      const { query, userId, sessionId, context } = req.validatedBody;
      
      // Get agent
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Check if agent is active
      if (agent.status !== 'active') {
        return res.status(400).json({
          error: 'Agent is not active',
          code: 'AGENT_INACTIVE'
        });
      }
      
      // Process query with RAG if enabled
      let response = 'I understand your query. How can I help you further?';
      let sources: any[] = [];
      
      if (agent.ragEnabled === 'true') {
        try {
          const ragResult = await persistentRAG.queryKnowledgeBase(
            agent.organizationId.toString(),
            query,
            {
              agentId: agentId,
              maxResults: agent.ragMaxResults || 5,
              confidenceThreshold: parseFloat(agent.ragConfidenceThreshold || '0.7')
            }
          );
          response = ragResult.answer;
          sources = ragResult.sources;
        } catch (ragError) {
          console.error('RAG query failed:', ragError);
          // Fall back to default response
        }
      }
      
      // Create conversation record
      const conversation = await storage.createConversation({
        agentId,
        organizationId: agent.organizationId,
        userId,
        userMessage: query,
        agentResponse: response,
        tokens: Math.ceil(query.length / 4) + Math.ceil(response.length / 4),
        cost: 0.002, // Estimated cost
        platform: 'web'
      });
      
      res.json({
        success: true,
        response,
        sources,
        conversationId: conversation.id,
        agent: {
          id: agent.id,
          businessName: agent.businessName,
          industry: agent.industry
        }
      });
    } catch (error) {
      console.error('Agent chat failed:', error);
      res.status(500).json({
        error: 'Chat processing failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// RAG System Routes with Validation
validatedRoutes.post('/rag/query', 
  validateAndLog(RAGQuerySchema, 'POST /rag/query'),
  async (req: Request, res: Response) => {
    try {
      const { query, agentId, customerId, industry, maxResults, confidenceThreshold, queryMode } = req.validatedBody;
      
      // Determine customer ID for RAG lookup
      let effectiveCustomerId = customerId;
      if (agentId) {
        const agent = await storage.getAgent(agentId);
        if (agent) {
          effectiveCustomerId = agent.organizationId.toString();
        }
      }
      
      if (!effectiveCustomerId) {
        return res.status(400).json({
          error: 'Either agentId or customerId must be provided',
          code: 'MISSING_PARAMETER'
        });
      }
      
      // Query RAG system
      const ragResult = await persistentRAG.queryKnowledgeBase(
        effectiveCustomerId,
        query,
        {
          agentId,
          maxResults,
          confidenceThreshold
        }
      );
      
      res.json({
        success: true,
        query,
        answer: ragResult.answer,
        sources: ragResult.sources,
        context: ragResult.context,
        metadata: {
          agentId,
          customerId: effectiveCustomerId,
          queryMode,
          resultsCount: ragResult.sources.length
        }
      });
    } catch (error) {
      console.error('RAG query failed:', error);
      res.status(500).json({
        error: 'RAG query processing failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.post('/rag/documents', 
  validateAndLog(RAGDocumentSchema, 'POST /rag/documents'),
  async (req: Request, res: Response) => {
    try {
      const documentData = req.validatedBody;
      
      // Determine customer ID
      let customerId = documentData.customerId;
      if (documentData.agentId) {
        const agent = await storage.getAgent(documentData.agentId);
        if (agent) {
          customerId = agent.organizationId.toString();
        }
      }
      
      if (!customerId) {
        return res.status(400).json({
          error: 'Either agentId or customerId must be provided',
          code: 'MISSING_PARAMETER'
        });
      }
      
      // Process document with RAG system
      const documentId = await persistentRAG.processDocument(
        customerId,
        documentData.title,
        documentData.content,
        documentData.agentId
      );
      
      res.status(201).json({
        success: true,
        documentId,
        message: 'Document processed and added to knowledge base',
        metadata: {
          title: documentData.title,
          contentLength: documentData.content.length,
          agentId: documentData.agentId,
          customerId
        }
      });
    } catch (error) {
      console.error('Document processing failed:', error);
      res.status(500).json({
        error: 'Failed to process document',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// User Management Routes with Validation
validatedRoutes.post('/auth/login', 
  validateAndLog(LoginSchema, 'POST /auth/login'),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.validatedBody;
      
      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'AUTHENTICATION_FAILED'
        });
      }
      
      // Verify password
      if (!user.passwordHash) {
        return res.status(401).json({
          error: 'Account setup incomplete',
          code: 'ACCOUNT_SETUP_REQUIRED'
        });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'AUTHENTICATION_FAILED'
        });
      }
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create session
      await storage.createSession(user.id, sessionToken, expiresAt);
      
      // Cache user session
      await distributedCache.setUserSession(sessionToken, {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        expiresAt: expiresAt.toISOString()
      });
      
      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      res.json({
        success: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        },
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Login failed:', error);
      res.status(500).json({
        error: 'Authentication service error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.post('/auth/create-user', 
  validateAndLog(CreateUserSchema, 'POST /auth/create-user'),
  async (req: Request, res: Response) => {
    try {
      const userData = req.validatedBody;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Log audit trail
      await storage.logAction({
        userId: 1, // From auth context (creator)
        organizationId: userData.organizationId,
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });
      
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        },
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('User creation failed:', error);
      res.status(500).json({
        error: 'Failed to create user',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Payment Routes with Validation
validatedRoutes.post('/payment/request', 
  validateAndLog(PaymentRequestSchema, 'POST /payment/request'),
  async (req: Request, res: Response) => {
    try {
      const paymentData = req.validatedBody;
      
      // Verify agent exists
      const agent = await storage.getAgent(paymentData.agentId);
      if (!agent) {
        return res.status(400).json({
          error: 'Referenced agent does not exist',
          code: 'FOREIGN_KEY_ERROR',
          field: 'agentId'
        });
      }
      
      // Generate payment reference
      const paymentRef = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create payment record (this would integrate with actual payment gateway)
      const paymentIntent = {
        id: paymentRef,
        agentId: paymentData.agentId,
        customerId: paymentData.customerId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      };
      
      res.json({
        success: true,
        paymentIntent,
        message: 'Payment request created successfully'
      });
    } catch (error) {
      console.error('Payment request failed:', error);
      res.status(500).json({
        error: 'Failed to create payment request',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

validatedRoutes.post('/payment/upi/verify', 
  validateAndLog(PaymentVerificationSchema, 'POST /payment/upi/verify'),
  async (req: Request, res: Response) => {
    try {
      const verificationData = req.validatedBody;
      
      // Simulate payment verification (would integrate with actual UPI gateway)
      const verificationResult = {
        consultationId: verificationData.consultationId,
        transactionRef: verificationData.transactionRef,
        status: verificationData.status,
        amount: verificationData.amount,
        verifiedAt: new Date().toISOString(),
        paymentMethod: verificationData.paymentMethod
      };
      
      res.json({
        success: true,
        verification: verificationResult,
        message: 'Payment verification completed'
      });
    } catch (error) {
      console.error('Payment verification failed:', error);
      res.status(500).json({
        error: 'Payment verification failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Export the router for use in main application
export default validatedRoutes;