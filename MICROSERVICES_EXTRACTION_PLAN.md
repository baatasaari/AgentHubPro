# Comprehensive Microservices Extraction Plan for AgentHub

## Current Codebase Analysis

### Large Server Files Requiring Decomposition
```
server/routes.ts: 1,081+ lines - Main routing logic
server/enterprise-analytics.ts: 800+ lines - Analytics service
server/admin-per-customer-rag.ts: 600+ lines - Admin RAG management
server/calendar-integration.ts: 400+ lines - Calendar services
server/conversational-payment.ts: 350+ lines - Payment conversations
server/universal-payment.ts: 300+ lines - Payment processing
server/storage.ts: 250+ lines - Data storage operations
```

## Extraction Strategy: Create 25+ Ultra-Focused Microservices

### Phase 1: Core Business Logic Services (8 Services)

#### 1. Agent Management Service (Port 8101)
**Extract from:** routes.ts (agent CRUD operations)
**Responsibility:** Agent lifecycle management only
**Target Size:** 120 lines
```typescript
// Extract agent creation, updating, deletion, status management
POST /api/agents/create
GET /api/agents/:id
PUT /api/agents/:id
DELETE /api/agents/:id
PUT /api/agents/:id/status
```

#### 2. Conversation Management Service (Port 8102)
**Extract from:** routes.ts (conversation operations)
**Responsibility:** Conversation lifecycle only
**Target Size:** 100 lines
```typescript
// Extract conversation tracking, creation, retrieval
POST /api/conversations/create
GET /api/conversations/agent/:agentId
GET /api/conversations/:id
```

#### 3. Usage Analytics Service (Port 8103)
**Extract from:** routes.ts, enterprise-analytics.ts
**Responsibility:** Usage statistics calculation only
**Target Size:** 130 lines
```typescript
// Extract usage stats, cost calculations
GET /api/usage/stats
GET /api/usage/agent/:agentId
POST /api/usage/record
```

#### 4. Widget Generation Service (Port 8104)
**Extract from:** routes.ts (widget code generation)
**Responsibility:** Widget code generation only
**Target Size:** 110 lines
```typescript
// Extract widget customization and code generation
POST /api/widgets/generate
GET /api/widgets/:agentId/code
PUT /api/widgets/:agentId/config
```

#### 5. Industry Configuration Service (Port 8105)
**Extract from:** routes.ts, industry-knowledge.ts
**Responsibility:** Industry-specific configurations only
**Target Size:** 90 lines
```typescript
// Extract industry templates, configurations
GET /api/industry/templates
GET /api/industry/:industry/config
POST /api/industry/validate
```

#### 6. System Health Service (Port 8106)
**Extract from:** Various health checks
**Responsibility:** System monitoring only
**Target Size:** 80 lines
```typescript
// Extract health checks, system status
GET /api/health
GET /api/health/detailed
GET /api/health/services
```

#### 7. Analytics Calculation Service (Port 8107)
**Extract from:** enterprise-analytics.ts (calculation logic)
**Responsibility:** Analytics calculations only
**Target Size:** 140 lines
```typescript
// Extract metric calculations, performance analysis
POST /api/analytics/calculate
GET /api/analytics/metrics/:type
POST /api/analytics/aggregate
```

#### 8. Customer Journey Service (Port 8108)
**Extract from:** enterprise-analytics.ts (journey tracking)
**Responsibility:** Customer journey analysis only
**Target Size:** 120 lines
```typescript
// Extract customer behavior tracking
POST /api/journey/track
GET /api/journey/customer/:id
POST /api/journey/analyze
```

### Phase 2: RAG & Knowledge Services (6 Services)

#### 9. Document Ingestion Service (Port 8109)
**Extract from:** admin-per-customer-rag.ts, rag.ts
**Responsibility:** Document upload and processing only
**Target Size:** 110 lines

#### 10. Vector Storage Service (Port 8110)
**Extract from:** admin-per-customer-rag.ts, rag.ts
**Responsibility:** Vector database operations only
**Target Size:** 100 lines

#### 11. Query Processing Service (Port 8111)
**Extract from:** rag.ts, customer-rag.ts
**Responsibility:** Query processing and routing only
**Target Size:** 120 lines

#### 12. Context Generation Service (Port 8112)
**Extract from:** rag.ts, multi-agent-rag.ts
**Responsibility:** Context compilation only
**Target Size:** 90 lines

#### 13. Admin RAG Control Service (Port 8113)
**Extract from:** admin-rag.ts, admin-per-customer-rag.ts
**Responsibility:** Admin RAG configuration only
**Target Size:** 130 lines

#### 14. Customer RAG Interface Service (Port 8114)
**Extract from:** customer-rag.ts
**Responsibility:** Customer RAG interactions only
**Target Size:** 100 lines

### Phase 3: Payment & Transaction Services (5 Services)

#### 15. Payment Intent Detection Service (Port 8115)
**Extract from:** conversational-payment.ts
**Responsibility:** Payment intent analysis only
**Target Size:** 100 lines

#### 16. Payment Link Management Service (Port 8116)
**Extract from:** universal-payment.ts, payment-routes.ts
**Responsibility:** Payment link generation and management only
**Target Size:** 110 lines

#### 17. Transaction Processing Service (Port 8117)
**Extract from:** universal-payment.ts, admin-payment.ts
**Responsibility:** Transaction processing only
**Target Size:** 120 lines

#### 18. Payment Validation Service (Port 8118)
**Extract from:** payment-routes.ts, payment-config.ts
**Responsibility:** Payment validation only
**Target Size:** 90 lines

#### 19. Billing Calculation Service (Port 8119)
**Extract from:** routes.ts (billing logic)
**Responsibility:** Billing calculations only
**Target Size:** 100 lines

### Phase 4: Calendar & Scheduling Services (4 Services)

#### 20. Calendar Provider Service (Port 8120)
**Extract from:** calendar-integration.ts, calendar-plugins.ts
**Responsibility:** Calendar provider integrations only
**Target Size:** 120 lines

#### 21. Availability Management Service (Port 8121)
**Extract from:** calendar-integration.ts
**Responsibility:** Availability calculation only
**Target Size:** 100 lines

#### 22. Booking Processing Service (Port 8122)
**Extract from:** calendar-integration.ts
**Responsibility:** Booking creation and management only
**Target Size:** 110 lines

#### 23. Schedule Optimization Service (Port 8123)
**Extract from:** calendar-integration.ts
**Responsibility:** Schedule optimization only
**Target Size:** 90 lines

### Phase 5: Communication & Integration Services (4 Services)

#### 24. Notification Dispatch Service (Port 8124)
**Extract from:** insights-integration.ts, calendar-integration.ts
**Responsibility:** Notification sending only
**Target Size:** 100 lines

#### 25. API Integration Service (Port 8125)
**Extract from:** Various external API calls
**Responsibility:** External API management only
**Target Size:** 110 lines

#### 26. Event Broadcasting Service (Port 8126)
**Extract from:** insights-integration.ts
**Responsibility:** Event distribution only
**Target Size:** 90 lines

#### 27. Data Synchronization Service (Port 8127)
**Extract from:** enterprise-analytics.ts
**Responsibility:** Cross-service data sync only
**Target Size:** 100 lines

## Implementation Benefits

### Complexity Reduction
- **Before:** 5,000+ lines across large files
- **After:** 27 services averaging 105 lines each
- **Reduction:** 79% complexity decrease

### Domain Separation
- **Business Logic:** Agent, Conversation, Usage, Widget management
- **Knowledge Management:** RAG, Vector, Query, Context services
- **Payment Processing:** Intent, Link, Transaction, Validation services
- **Calendar Management:** Provider, Availability, Booking, Optimization services
- **Communication:** Notification, Integration, Event, Sync services

### Development Benefits
- Independent team development per domain
- Granular scaling based on service demand
- Easy testing and debugging
- Clear service ownership
- Fault isolation between services

## Service Communication Pattern
```
Event-Driven Architecture:
- API Gateway routes requests to appropriate services
- Services communicate via lightweight HTTP/gRPC
- Event bus for asynchronous operations
- Service discovery for dynamic routing
```

## Quality Targets
- **Service Size:** 80-140 lines maximum
- **Single Responsibility:** One function per service
- **Independent Deployment:** Zero shared dependencies
- **Scalability:** Per-service scaling capabilities
- **Maintainability:** Clear, focused codebase per service