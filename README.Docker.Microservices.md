# AgentHub Microservices Docker Orchestration

This guide covers running the complete AgentHub platform with 29 ultra-focused microservices using Docker Compose.

## Quick Start

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
docker --version
docker-compose --version
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.microservices .env

# Edit .env file with your API keys
nano .env
```

### 3. Build and Run All Services
```bash
# Build and start all 29 microservices
docker-compose -f docker-compose.microservices.yml up --build

# Run in background
docker-compose -f docker-compose.microservices.yml up -d --build
```

### 4. Health Check
```bash
# Check health of all services
./scripts/microservices-health-check.sh

# View specific service logs
docker-compose -f docker-compose.microservices.yml logs agent-management
```

## Architecture Overview

### 29 Ultra-Focused Microservices

#### Knowledge Management Domain (6 Services)
- **Document Processing (8001)**: Document upload and chunking
- **Embedding Generation (8002)**: Vector embedding creation  
- **Similarity Search (8010)**: Cosine similarity calculations
- **Knowledge Base (8011)**: Knowledge base CRUD operations
- **FAQ Management (8013)**: FAQ operations
- **RAG Query (8111)**: RAG query processing

#### Payment Processing Domain (4 Services)
- **Payment Intent (8003)**: Payment intent analysis
- **Payment Link (8015)**: Payment link generation
- **Metrics Collection (8023)**: Metrics ingestion
- **Billing Calculation (8119)**: Billing calculations

#### Calendar & Booking Domain (4 Services)
- **Slot Management (8004)**: Calendar slot operations
- **Booking Management (8021)**: Booking CRUD operations
- **Calendar Provider (8120)**: Calendar integrations
- **Notification (8005)**: Notification delivery

#### Core Business Logic Domain (4 Services)
- **Agent Management (8101)**: Agent lifecycle management
- **Conversation Management (8102)**: Conversation tracking
- **Widget Generation (8104)**: Widget code generation
- **Usage Analytics (8103)**: Usage statistics

#### Analytics & Insights Domain (4 Services)
- **Analytics Calculation (8107)**: Analytics calculations
- **Insights Generation (8125)**: Insights generation
- **Data Storage (8128)**: Data storage operations
- **System Health (8106)**: System monitoring

#### Platform Infrastructure Domain (7 Services)
- **Configuration (8030)**: Configuration management
- **Response Generation (8012)**: LLM response generation
- **Service Discovery (8027)**: Service registration
- **Authentication (8031)**: User authentication
- **Database Operations (8028)**: Database CRUD
- **Logging (8033)**: Centralized logging
- **Industry Configuration (8105)**: Industry configurations

## Service Management

### Start Specific Domains
```bash
# Start only knowledge management services
docker-compose -f docker-compose.microservices.yml up document-processing embedding-generation similarity-search knowledge-base faq-management rag-query

# Start only core business logic
docker-compose -f docker-compose.microservices.yml up agent-management conversation-management widget-generation usage-analytics
```

### Scale Services
```bash
# Scale high-traffic services
docker-compose -f docker-compose.microservices.yml up --scale agent-management=3 --scale rag-query=2

# Scale payment processing
docker-compose -f docker-compose.microservices.yml up --scale payment-intent=2 --scale payment-link=2
```

### Service Discovery
Services automatically register with the service discovery service at `localhost:8027`:
```bash
# View registered services
curl http://localhost:8027/api/services/list

# Check service health
curl http://localhost:8027/api/services/health-check
```

## Monitoring and Health Checks

### System Health Dashboard
```bash
# Overall system health
curl http://localhost:8106/api/health

# Detailed health report
curl http://localhost:8106/api/health/detailed
```

### Individual Service Health
```bash
# Check specific service
curl http://localhost:8101/health  # Agent Management
curl http://localhost:8111/health  # RAG Query
curl http://localhost:8125/health  # Insights Generation
```

### Centralized Logging
```bash
# View recent logs across all services
curl http://localhost:8033/api/logs/recent

# View logs for specific service
curl http://localhost:8033/api/logs/service/agent-management

# View error logs only
curl http://localhost:8033/api/logs/errors
```

## Development Workflow

### Local Development
```bash
# Start core services only
docker-compose -f docker-compose.microservices.yml up agent-management conversation-management widget-generation

# Develop specific service
cd microservices/agent-management-service
python main.py
```

### Testing
```bash
# Test service connectivity
./scripts/microservices-health-check.sh

# Test specific endpoints
curl -X POST http://localhost:8101/api/agents \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test Agent","businessDescription":"Test","businessDomain":"test.com","industry":"healthcare","llmModel":"gpt-3.5-turbo","interfaceType":"webchat"}'
```

### Production Deployment
```bash
# Production mode
NODE_ENV=production docker-compose -f docker-compose.microservices.yml up -d

# Monitor resource usage
docker stats

# Update specific service
docker-compose -f docker-compose.microservices.yml up -d --no-deps agent-management
```

## Networking

### Service Communication
Services communicate through the `agenthub-network`:
- Internal communication via service names
- External access via exposed ports
- Automatic DNS resolution between services

### Port Mapping
- **API Gateway**: 5000
- **Knowledge Management**: 8001, 8002, 8010, 8011, 8013, 8111
- **Payment Processing**: 8003, 8015, 8023, 8119
- **Calendar & Booking**: 8004, 8005, 8021, 8120
- **Core Business Logic**: 8101, 8102, 8103, 8104
- **Analytics & Insights**: 8106, 8107, 8125, 8128
- **Platform Infrastructure**: 8012, 8027, 8028, 8030, 8031, 8033, 8105
- **Communication**: 8126

## Troubleshooting

### Common Issues
```bash
# Service won't start
docker-compose -f docker-compose.microservices.yml logs service-name

# Port conflicts
docker-compose -f docker-compose.microservices.yml down
docker system prune -f

# Network issues
docker network ls
docker network inspect agenthub-network
```

### Performance Optimization
```bash
# Resource monitoring
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Service scaling
docker-compose -f docker-compose.microservices.yml up --scale high-traffic-service=5
```

## Benefits of This Architecture

### Development Benefits
- **Independent Development**: 29 parallel development streams
- **Granular Scaling**: Scale only what needs scaling
- **Easy Debugging**: Focused, understandable services
- **Clear Ownership**: One function per service
- **Fault Isolation**: Failure in one service doesn't affect others

### Operational Benefits
- **Independent Deployment**: Deploy services individually
- **Service-Specific Monitoring**: Detailed performance tracking
- **Resource Optimization**: Allocate resources per service need
- **Easy Rollback**: Rollback individual services
- **Technology Flexibility**: Each service can use different technologies

### Maintenance Benefits
- **Organic Architecture**: Fully maintainable codebase
- **Quick Onboarding**: New developers understand services quickly
- **Focused Testing**: Comprehensive testing per service
- **Clear Documentation**: Service-specific documentation

Your AgentHub platform is now ready for enterprise-scale deployment with complete microservices orchestration!