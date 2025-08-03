// Comprehensive Pydantic-style Validation Models for AgentHub Platform
// Replaces raw Dict[str, Any] payloads with explicit validation schemas

import { z } from 'zod';

// Utility validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number format');
export const urlSchema = z.string().url('Invalid URL format').optional();
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const positiveIntSchema = z.number().int().positive('Must be a positive integer');
export const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty');

// Industry enum validation
export const industrySchema = z.enum([
  'healthcare', 'retail', 'realestate', 'finance', 'education', 'technology',
  'hospitality', 'automotive', 'legal', 'consulting', 'manufacturing', 'other'
], { errorMap: () => ({ message: 'Invalid industry type' }) });

// LLM model validation
export const llmModelSchema = z.enum([
  'gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku', 'gemini-pro'
], { errorMap: () => ({ message: 'Invalid LLM model' }) });

// Interface type validation
export const interfaceTypeSchema = z.enum([
  'webchat', 'whatsapp', 'telegram', 'slack', 'discord'
], { errorMap: () => ({ message: 'Invalid interface type' }) });

// Status validation
export const agentStatusSchema = z.enum([
  'draft', 'active', 'paused', 'disabled'
], { errorMap: () => ({ message: 'Invalid agent status' }) });

// RAG query mode validation
export const ragQueryModeSchema = z.enum([
  'semantic', 'keyword', 'hybrid'
], { errorMap: () => ({ message: 'Invalid RAG query mode' }) });

// User role validation
export const userRoleSchema = z.enum([
  'owner', 'admin', 'user', 'viewer', 'devops'
], { errorMap: () => ({ message: 'Invalid user role' }) });

// Payment method validation
export const paymentMethodSchema = z.enum([
  'upi', 'card', 'netbanking', 'wallet', 'whatsapp_pay', 'google_pay'
], { errorMap: () => ({ message: 'Invalid payment method' }) });

// Agent Creation/Update Models
export const CreateAgentSchema = z.object({
  // Required fields
  businessName: z.string()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or less')
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, 'Business name contains invalid characters'),
  
  businessDescription: z.string()
    .min(10, 'Business description must be at least 10 characters')
    .max(500, 'Business description must be 500 characters or less'),
  
  industry: industrySchema,
  
  // Optional fields with defaults
  businessDomain: urlSchema,
  llmModel: llmModelSchema.default('gpt-4o'),
  interfaceType: interfaceTypeSchema.default('webchat'),
  status: agentStatusSchema.default('draft'),
  
  // RAG Configuration (optional)
  ragEnabled: z.boolean().default(false),
  ragKnowledgeBase: z.string().max(200, 'Knowledge base name too long').default(''),
  ragDocuments: z.array(z.string()).default([]),
  ragQueryMode: ragQueryModeSchema.default('hybrid'),
  ragChunkSize: z.number().int().min(100).max(5000).default(1000),
  ragOverlap: z.number().int().min(0).max(1000).default(200),
  ragMaxResults: z.number().int().min(1).max(20).default(5),
  ragConfidenceThreshold: z.number().min(0).max(1).default(0.7),
  
  // Organization context
  organizationId: positiveIntSchema.optional(),
  createdBy: positiveIntSchema.optional()
});

export const UpdateAgentSchema = CreateAgentSchema.partial().extend({
  id: positiveIntSchema
});

export const AgentStatusUpdateSchema = z.object({
  status: agentStatusSchema
});

// Conversation Models
export const CreateConversationSchema = z.object({
  agentId: positiveIntSchema,
  userId: positiveIntSchema.optional(),
  organizationId: positiveIntSchema.optional(),
  userMessage: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  agentResponse: z.string()
    .max(5000, 'Response too long')
    .optional(),
  tokens: z.number().int().min(0).default(0),
  cost: z.number().min(0).default(0),
  platform: z.string().default('web'),
  sessionId: z.string().optional()
});

export const ConversationQuerySchema = z.object({
  agentId: positiveIntSchema,
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(1000, 'Query too long'),
  userId: positiveIntSchema.optional(),
  sessionId: z.string().optional(),
  context: z.array(z.string()).optional()
});

// RAG System Models
export const RAGQuerySchema = z.object({
  query: z.string()
    .min(1, 'Query is required')
    .max(500, 'Query too long'),
  agentId: positiveIntSchema.optional(),
  customerId: z.string().optional(),
  industry: industrySchema.optional(),
  maxResults: z.number().int().min(1).max(20).default(5),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  queryMode: ragQueryModeSchema.default('hybrid')
});

export const RAGDocumentSchema = z.object({
  title: z.string()
    .min(1, 'Document title is required')
    .max(200, 'Title too long'),
  content: z.string()
    .min(10, 'Document content must be at least 10 characters')
    .max(50000, 'Document content too long'),
  source: z.string()
    .min(1, 'Document source is required')
    .max(500, 'Source too long'),
  docType: z.enum(['text', 'pdf', 'html', 'markdown']).default('text'),
  agentId: positiveIntSchema.optional(),
  customerId: z.string().optional(),
  industry: industrySchema.optional(),
  metadata: z.record(z.any()).default({}),
  tags: z.array(z.string()).optional()
});

export const RAGConfigurationSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string().optional(),
  enabledSources: z.array(z.enum([
    'file_upload', 'faq', 'database', 'manual', 'website_scrape'
  ])).default(['file_upload', 'manual']),
  embeddingModel: z.string().default('text-embedding-3-small'),
  maxDocuments: z.number().int().min(1).max(1000).default(100),
  autoUpdate: z.boolean().default(false),
  chunkSize: z.number().int().min(100).max(5000).default(1000),
  chunkOverlap: z.number().int().min(0).max(1000).default(200)
});

// User Management Models
export const CreateUserSchema = z.object({
  email: emailSchema,
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  organizationId: positiveIntSchema,
  role: userRoleSchema.default('user'),
  permissionLevel: z.number().int().min(1).max(10).default(2)
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: positiveIntSchema
}).omit({ password: true });

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

// Organization Models
export const CreateOrganizationSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name too long')
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, 'Organization name contains invalid characters'),
  domain: z.string().optional(),
  subscriptionPlan: z.enum(['trial', 'starter', 'professional', 'enterprise']).default('trial'),
  monthlyUsageLimit: z.number().int().min(0).default(1000)
});

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial().extend({
  id: positiveIntSchema
});

// Payment System Models
export const PaymentRequestSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string()
    .min(1, 'Customer ID is required')
    .max(100, 'Customer ID too long'),
  amount: z.number()
    .min(0.01, 'Amount must be at least 0.01')
    .max(100000, 'Amount too large'),
  currency: z.string().length(3, 'Invalid currency code').default('INR'),
  paymentMethod: paymentMethodSchema,
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  customerPhone: phoneSchema.optional(),
  customerEmail: emailSchema.optional(),
  industry: industrySchema.optional(),
  consultationId: z.string().optional()
});

export const PaymentVerificationSchema = z.object({
  consultationId: z.string()
    .min(1, 'Consultation ID is required'),
  transactionRef: z.string()
    .min(1, 'Transaction reference is required')
    .max(100, 'Transaction reference too long'),
  amount: z.number()
    .min(0.01, 'Amount must be at least 0.01'),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
  paymentMethod: paymentMethodSchema
});

export const ConsultationBookingSchema = z.object({
  agentId: positiveIntSchema,
  industry: industrySchema,
  customerName: z.string()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  customerPhone: phoneSchema,
  customerEmail: emailSchema.optional(),
  preferredDate: z.string().datetime('Invalid date format'),
  preferredTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration: z.number().int().min(15).max(180).default(30),
  consultationType: z.enum(['phone', 'video', 'in_person']).default('phone'),
  notes: z.string().max(1000, 'Notes too long').optional()
});

// Calendar Integration Models
export const CalendarConfigSchema = z.object({
  agentId: positiveIntSchema,
  provider: z.enum(['google', 'outlook', 'apple', 'calendly']),
  credentials: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client secret is required').optional(),
    refreshToken: z.string().optional(),
    accessToken: z.string().optional()
  }),
  calendarId: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  businessHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').default('09:00'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').default('18:00'),
    workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5])
  }).optional()
});

export const CalendarBookingSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string().min(1, 'Customer ID is required'),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  title: z.string()
    .min(1, 'Event title is required')
    .max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  attendeeEmail: emailSchema.optional(),
  attendeeName: z.string().max(100, 'Name too long').optional()
});

// Analytics and Insights Models
export const ConversationInsightSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string().min(1, 'Customer ID is required'),
  platform: z.string().min(1, 'Platform is required'),
  messageCount: z.number().int().min(1),
  tokensUsed: z.number().int().min(0),
  cost: z.number().min(0),
  duration: z.number().int().min(0), // in seconds
  satisfactionScore: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime().optional()
});

export const AppointmentInsightSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string().min(1, 'Customer ID is required'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  duration: z.number().int().min(1),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
  revenue: z.number().min(0).optional(),
  customerSatisfaction: z.number().min(1).max(5).optional(),
  followUpRequired: z.boolean().default(false),
  appointmentDate: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

export const PurchaseInsightSchema = z.object({
  agentId: positiveIntSchema,
  customerId: z.string().min(1, 'Customer ID is required'),
  productCategory: z.string().min(1, 'Product category is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code').default('INR'),
  paymentMethod: paymentMethodSchema,
  conversationId: z.string().optional(),
  purchaseDate: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

// Admin Configuration Models
export const AdminPaymentConfigSchema = z.object({
  agentId: positiveIntSchema,
  industry: industrySchema,
  paymentMethods: z.array(paymentMethodSchema).min(1, 'At least one payment method required'),
  pricing: z.object({
    basePrice: z.number().min(0, 'Base price cannot be negative'),
    currency: z.string().length(3, 'Invalid currency code').default('INR'),
    tiers: z.array(z.object({
      name: z.string().min(1, 'Tier name is required'),
      price: z.number().min(0, 'Price cannot be negative'),
      features: z.array(z.string())
    })).optional()
  }),
  webhookUrl: urlSchema,
  autoApprove: z.boolean().default(false),
  maxAmount: z.number().min(0).optional()
});

// Email and Notification Models
export const EmailReportSchema = z.object({
  toEmail: emailSchema,
  reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  agentIds: z.array(positiveIntSchema).optional(),
  organizationId: positiveIntSchema,
  format: z.enum(['html', 'pdf', 'csv']).default('html'),
  includeCharts: z.boolean().default(true),
  customDateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).optional()
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function formatValidationErrors(errors: z.ZodError): Array<{
  field: string;
  message: string;
  code: string;
}> {
  return errors.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));
}

// Export types for TypeScript usage
export type CreateAgentRequest = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentRequest = z.infer<typeof UpdateAgentSchema>;
export type CreateConversationRequest = z.infer<typeof CreateConversationSchema>;
export type RAGQueryRequest = z.infer<typeof RAGQuerySchema>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
export type ConsultationBooking = z.infer<typeof ConsultationBookingSchema>;
export type CalendarConfig = z.infer<typeof CalendarConfigSchema>;
export type AdminPaymentConfig = z.infer<typeof AdminPaymentConfigSchema>;
export type EmailReport = z.infer<typeof EmailReportSchema>;

// Validation middleware factory
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const validation = validateRequest(schema, req.body);
    
    if (!validation.success) {
      const formattedErrors = formatValidationErrors(validation.errors!);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors
      });
    }
    
    req.validatedBody = validation.data;
    next();
  };
}