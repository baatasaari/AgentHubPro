# AgentHub 26 Microservices Architecture

Complete microservices implementation for the AgentHub platform with 26 specialized services handling all aspects of AI agent creation, management, and deployment across multiple platforms.

## Architecture Overview

The AgentHub platform is built using a domain-driven microservices architecture with the following key principles:

- **Service Independence**: Each service is independently deployable and scalable
- **Domain Separation**: Services are organized by business domain and functionality
- **API Gateway**: Single entry point for all client requests with load balancing
- **Service Discovery**: Automatic service registration and discovery using Consul
- **Event-Driven Communication**: Asynchronous messaging between services
- **Data Isolation**: Each service manages its own database and data model

## Microservices List

### Core Platform Services (1-6)
1. **API Gateway & Load Balancer** - NGINX-based request routing and load balancing
2. **Service Discovery & Configuration** - Consul for service registration and configuration management
3. **User Authentication Service** - JWT-based authentication and session management
4. **User Management Service** - User profiles, permissions, and role management
5. **Organization Management Service** - Multi-tenant organization and team management
6. **Agent Creation Service** - AI agent creation wizard and template management

### AI & Intelligence Services (7-11)
7. **Agent Management Service** - Agent lifecycle, status management, and configuration
8. **LLM Integration Service** - Multi-provider LLM integration (OpenAI, Anthropic, Google, Azure)
9. **RAG (Knowledge Base) Service** - Document processing and knowledge base management
10. **Embedding Service** - Text embedding generation and vector operations
11. **File Storage Service** - Document upload, processing, and management

### Communication Platform Services (12-18)
12. **Conversation Service** - Core conversation handling and context management
13. **WhatsApp Integration Service** - WhatsApp Business API integration
14. **Instagram Integration Service** - Instagram messaging integration
15. **Messenger Integration Service** - Facebook Messenger integration
16. **SMS Integration Service** - SMS gateway integration (Twilio)
17. **Telegram Integration Service** - Telegram Bot API integration
18. **Web Chat Service** - WebSocket-based web chat integration

### Business Services (19-22)
19. **Payment Processing Service** - Multi-gateway payment processing (Stripe, Razorpay, PhonePe)
20. **Billing Management Service** - Subscription management and invoice generation
21. **Usage Tracking Service** - API usage, conversation metrics, and resource consumption
22. **Analytics Service** - Business intelligence and performance analytics

### Platform Services (23-26)
23. **Notification Service** - Email, SMS, and push notification management
24. **Audit & Logging Service** - Comprehensive audit trails and log management
25. **Monitoring & Health Service** - System health monitoring and alerting
26. **Orchestration Service** - Workflow orchestration and cross-service coordination

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 20 with Express.js framework
- **Databases**: PostgreSQL (primary), MongoDB (logs), Redis (cache)
- **Message Queue**: Redis for pub/sub and job queues
- **API Gateway**: NGINX with load balancing and rate limiting
- **Service Discovery**: HashiCorp Consul
- **Container Orchestration**: Docker and Docker Compose
- **Monitoring**: Prometheus + Grafana
- **Search & Analytics**: Elasticsearch
- **Vector Database**: Qdrant for embeddings
- **File Storage**: MinIO (S3-compatible)

### External Integrations
- **LLM Providers**: OpenAI, Anthropic, Google Vertex AI, Azure OpenAI
- **Payment Gateways**: Stripe, Razorpay, PhonePe, Google Pay, UPI
- **Messaging Platforms**: WhatsApp Business, Instagram, Messenger, Telegram
- **SMS Providers**: Twilio, AWS SNS
- **Email Services**: SendGrid, Gmail API
- **Cloud Storage**: MinIO, AWS S3 (optional)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for development)
- Git
- At least 8GB RAM and 20GB storage

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/agenthub-microservices.git
cd agenthub-microservices/microservices

# Copy environment template
cp .env.example .env

# Update environment variables
nano .env
```

### 2. Deploy All Services
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to development environment
./scripts/deploy.sh development

# Or deploy to production
./scripts/deploy.sh production
```

### 3. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# Verify API Gateway
curl http://localhost/health

# Check service discovery
curl http://localhost:8500/v1/catalog/services
```

### 4. Access Management Interfaces
- **API Gateway**: http://localhost
- **Consul UI**: http://localhost:8500
- **Grafana Dashboards**: http://localhost:3000 (admin/admin123)
- **Prometheus Metrics**: http://localhost:9090
- **MinIO Console**: http://localhost:9001

## Service Configuration

### Environment Variables
Each service requires specific environment variables. Key configurations include:

```bash
# Database connections
DATABASE_URL=postgresql://postgres:password@postgres:5432/agenthub
REDIS_URL=redis://redis:6379
MONGODB_URL=mongodb://mongodb:27017/agenthub

# External API keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Platform integrations
WHATSAPP_TOKEN=your_whatsapp_token
TELEGRAM_BOT_TOKEN=your_telegram_token
TWILIO_ACCOUNT_SID=your_twilio_sid

# Payment gateways
STRIPE_SECRET_KEY=your_stripe_key
RAZORPAY_KEY_ID=your_razorpay_id
PHONEPE_MERCHANT_ID=your_phonepe_id

# Security
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
```

### Service Communication
Services communicate via:
- **HTTP REST APIs**: Synchronous service-to-service calls
- **Redis Pub/Sub**: Asynchronous event-driven messaging
- **Service Discovery**: Consul for dynamic service location
- **API Gateway**: Centralized routing and load balancing

## Development Workflow

### 1. Local Development
```bash
# Start infrastructure services only
docker-compose up -d postgres redis mongodb consul

# Run specific service locally
cd services/auth-service
npm install
npm run dev

# Run tests
npm test
```

### 2. Building Services
```bash
# Build single service
cd services/agent-creation
docker build -t agenthub-agent-creation .

# Build all services
./scripts/build-all.sh
```

### 3. Database Migrations
```bash
# Run migrations for specific service
cd services/auth-service
npm run migrate

# Run all migrations
./scripts/migrate-all.sh
```

## API Documentation

### Core Endpoints

#### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
```

#### Agent Management
```bash
GET /api/agents
POST /api/agents/create
GET /api/agents/{id}
PUT /api/agents/{id}
DELETE /api/agents/{id}
```

#### Conversations
```bash
GET /api/conversations
POST /api/conversations
GET /api/conversations/{id}/messages
POST /api/conversations/{id}/messages
```

#### Platform Integrations
```bash
POST /api/whatsapp/webhook
POST /api/telegram/webhook
POST /api/messenger/webhook
GET /api/webchat/connect
```

### API Gateway Routes
All requests go through the NGINX API Gateway:
- **Base URL**: `http://localhost` (development) or your domain (production)
- **Rate Limiting**: Configured per endpoint type
- **Load Balancing**: Automatic across service instances
- **Health Checks**: Built-in service health monitoring

## Monitoring & Observability

### Metrics Collection
- **Prometheus**: Collects metrics from all services
- **Grafana**: Visualizes metrics with pre-built dashboards
- **Custom Metrics**: Business-specific KPIs and performance indicators

### Logging Strategy
- **Structured Logging**: JSON format for easy parsing
- **Centralized Logs**: Elasticsearch for log aggregation
- **Log Levels**: Debug, Info, Warn, Error with appropriate filtering
- **Audit Trails**: Complete user activity and system change tracking

### Health Monitoring
- **Service Health**: Individual service health endpoints
- **Database Health**: Connection and query performance monitoring
- **External Services**: API availability and response time tracking
- **Resource Usage**: CPU, memory, and storage monitoring

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control**: Granular permissions system
- **Session Management**: Secure session handling with Redis
- **Multi-Factor Authentication**: Optional 2FA support

### Network Security
- **API Rate Limiting**: Prevents abuse and ensures fair usage
- **CORS Configuration**: Proper cross-origin request handling
- **Security Headers**: HSTS, CSP, and other security headers
- **Input Validation**: Comprehensive request validation

### Data Security
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: TLS/SSL for all communications
- **Secret Management**: Secure environment variable handling
- **Data Isolation**: Multi-tenant data separation

## Scaling & Performance

### Horizontal Scaling
- **Service Instances**: Scale individual services based on load
- **Database Sharding**: Partition data across multiple databases
- **Load Balancing**: NGINX handles request distribution
- **Auto-scaling**: Container orchestration with scaling policies

### Performance Optimization
- **Caching Strategy**: Redis for session and application caching
- **Database Optimization**: Connection pooling and query optimization
- **CDN Integration**: Static asset delivery optimization
- **Compression**: GZIP compression for API responses

### Resource Management
- **Memory Limits**: Container memory restrictions
- **CPU Limits**: Prevent resource starvation
- **Disk Usage**: Monitoring and cleanup strategies
- **Network Bandwidth**: Traffic shaping and prioritization

## Deployment Strategies

### Development Deployment
```bash
# Start all services locally
docker-compose up -d

# Or start specific services
docker-compose up -d postgres redis auth-service agent-creation
```

### Production Deployment
```bash
# Deploy to production environment
./scripts/deploy.sh production

# Or use Kubernetes (if available)
kubectl apply -f k8s/
```

### CI/CD Pipeline
1. **Code Commit**: Push to repository triggers pipeline
2. **Build Phase**: Docker images built and tested
3. **Test Phase**: Unit and integration tests executed
4. **Deploy Phase**: Services deployed to staging/production
5. **Monitoring**: Automated health checks and rollback if needed

## Troubleshooting

### Common Issues

#### Service Discovery Issues
```bash
# Check Consul health
curl http://localhost:8500/v1/status/leader

# Verify service registration
curl http://localhost:8500/v1/catalog/services
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Verify Redis connection
docker-compose exec redis redis-cli ping
```

#### Service Communication Issues
```bash
# Check service logs
docker-compose logs auth-service

# Test service endpoint directly
curl http://localhost:3001/health
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check service metrics
curl http://localhost:9090/metrics

# Analyze slow queries
docker-compose exec postgres pg_stat_statements
```

## Contributing

### Development Guidelines
1. **Code Style**: Follow ESLint and Prettier configurations
2. **Testing**: Maintain >80% test coverage
3. **Documentation**: Update API docs for any changes
4. **Security**: Run security scans before commits

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description
5. Code review and approval required

## Support & Maintenance

### Regular Maintenance Tasks
- **Database Backups**: Automated daily backups
- **Log Rotation**: Prevent disk space issues
- **Security Updates**: Regular dependency updates
- **Performance Monitoring**: Weekly performance reviews

### Support Channels
- **Documentation**: Comprehensive API and deployment docs
- **Issue Tracking**: GitHub issues for bug reports
- **Team Communication**: Slack/Discord for real-time support
- **Knowledge Base**: Internal wiki for troubleshooting

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**AgentHub Microservices Architecture** - Scalable, secure, and production-ready AI agent platform supporting 26 specialized microservices for enterprise-grade multi-platform AI agent deployment.