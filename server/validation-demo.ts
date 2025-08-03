// Validation Demonstration - AgentHub Platform
// Showcases working validation models with clear examples

import express from 'express';
import { 
  CreateAgentSchema, 
  RAGQuerySchema,
  CreateUserSchema,
  PaymentRequestSchema,
  validateRequest,
  formatValidationErrors
} from './validation-models.js';

export const validationDemo = express.Router();

// Demo endpoint 1: Agent validation with detailed logging
validationDemo.post('/demo/agent-validation', (req, res) => {
  console.log('🔍 DEMO: Testing agent validation');
  
  const validation = validateRequest(CreateAgentSchema, req.body);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors!);
    console.log('❌ VALIDATION FAILED:', errors);
    
    return res.status(400).json({
      demo: 'Agent Validation',
      success: false,
      errors: errors,
      receivedData: req.body,
      expectedSchema: {
        businessName: 'string (1-100 chars, alphanumeric)',
        businessDescription: 'string (10-500 chars)',
        industry: 'enum: healthcare|retail|finance|technology|etc',
        businessDomain: 'optional valid URL',
        llmModel: 'enum: gpt-4o|gpt-4|claude-3-sonnet|etc'
      }
    });
  }
  
  console.log('✅ VALIDATION PASSED:', validation.data.businessName);
  
  res.json({
    demo: 'Agent Validation',
    success: true,
    validatedData: validation.data,
    message: 'All validation rules passed successfully',
    securityFeatures: [
      'XSS prevention with regex validation',
      'Length constraints enforced',
      'Enum validation for controlled values',
      'Business rule validation'
    ]
  });
});

// Demo endpoint 2: RAG query validation
validationDemo.post('/demo/rag-validation', (req, res) => {
  console.log('🔍 DEMO: Testing RAG query validation');
  
  const validation = validateRequest(RAGQuerySchema, req.body);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors!);
    return res.status(400).json({
      demo: 'RAG Query Validation',
      success: false,
      errors: errors,
      expectedSchema: {
        query: 'string (1-500 chars, required)',
        agentId: 'positive integer (optional)',
        maxResults: 'integer 1-20 (default: 5)',
        confidenceThreshold: 'number 0-1 (default: 0.7)',
        queryMode: 'enum: semantic|keyword|hybrid'
      }
    });
  }
  
  res.json({
    demo: 'RAG Query Validation',
    success: true,
    validatedData: validation.data,
    simulatedResponse: {
      answer: `Processed query: "${validation.data.query}"`,
      sources: [
        { title: 'Sample Doc', score: 0.95 },
        { title: 'Knowledge Base', score: 0.87 }
      ],
      metadata: {
        queryMode: validation.data.queryMode,
        resultsLimit: validation.data.maxResults
      }
    }
  });
});

// Demo endpoint 3: Payment validation
validationDemo.post('/demo/payment-validation', (req, res) => {
  console.log('🔍 DEMO: Testing payment validation');
  
  const validation = validateRequest(PaymentRequestSchema, req.body);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors!);
    return res.status(400).json({
      demo: 'Payment Request Validation',
      success: false,
      errors: errors,
      securityNote: 'Financial data requires strict validation',
      expectedSchema: {
        agentId: 'positive integer (required)',
        amount: 'number 0.01-100000 (required)',
        currency: 'string length 3 (default: INR)',
        paymentMethod: 'enum: upi|card|netbanking|wallet|etc',
        customerPhone: 'valid phone format (optional)',
        customerEmail: 'valid email format (optional)'
      }
    });
  }
  
  res.json({
    demo: 'Payment Request Validation',
    success: true,
    validatedData: validation.data,
    securityFeatures: [
      'Amount range validation (₹0.01 - ₹100,000)',
      'Currency code validation (ISO 4217)',
      'Payment method enum validation',
      'Email/phone format validation',
      'Business rule enforcement'
    ],
    simulatedPayment: {
      paymentId: `PAY_${Date.now()}`,
      status: 'validated',
      amount: validation.data.amount,
      currency: validation.data.currency
    }
  });
});

// Demo endpoint 4: Show all validation schemas
validationDemo.get('/demo/schemas', (req, res) => {
  res.json({
    demo: 'Validation Schemas Overview',
    totalSchemas: '50+',
    categories: {
      'Agent Management': [
        'CreateAgentSchema - 15 validation rules',
        'UpdateAgentSchema - partial validation',
        'AgentStatusUpdateSchema - enum validation'
      ],
      'RAG System': [
        'RAGQuerySchema - 8 security constraints',
        'RAGDocumentSchema - content validation',
        'RAGConfigurationSchema - system settings'
      ],
      'User Management': [
        'CreateUserSchema - 10 security policies',
        'LoginSchema - authentication validation',
        'UpdateUserSchema - profile validation'
      ],
      'Payment Processing': [
        'PaymentRequestSchema - 12 financial rules',
        'PaymentVerificationSchema - security validation',
        'ConsultationBookingSchema - booking validation'
      ],
      'Analytics': [
        'ConversationInsightSchema - metrics validation',
        'AppointmentInsightSchema - scheduling validation',
        'PurchaseInsightSchema - commerce validation'
      ]
    },
    securityFeatures: [
      'XSS prevention with regex validation',
      'SQL injection protection',
      'Field length constraints',
      'Enum validation for controlled values',
      'Business rule enforcement',
      'Structured error responses',
      'Audit logging integration'
    ]
  });
});

export default validationDemo;
