# AgentHub Microservices Architecture

This directory contains the microservices that power the AgentHub platform. Each service is independent, focused on a specific domain, and can be developed, deployed, and scaled independently.

## Current Services

### 1. Agent Wizard Service (Port 8001)
**Purpose**: Agent creation and management
- **Technology**: FastAPI + Python
- **Responsibilities**:
  - Agent CRUD operations
  - Industry specialization
  - Model selection and validation
  - Business rule enforcement
  - System prompt generation
  - Deployment validation

## Planned Services

### 2. Analytics Service (Port 8002)
- Usage tracking and metrics
- Performance analytics
- Cost analysis
- Reporting dashboards

### 3. Billing Service (Port 8003)
- Payment processing
- Subscription management
- Usage-based billing
- Invoice generation

### 4. Code Generation Service (Port 8004)
- Widget embed code generation
- Customization templates
- Integration snippets

### 5. API Gateway (Port 8000)
- Request routing
- Authentication
- Rate limiting
- Load balancing

## Architecture Benefits

### Independence
- Each service can be developed by different teams
- Independent deployment and scaling
- Technology stack flexibility per service
- Isolated failure domains

### Maintainability
- Single responsibility per service
- Clear service boundaries
- Easier testing and debugging
- Simplified code organization

### Scalability
- Scale individual services based on demand
- Horizontal scaling capabilities
- Resource optimization per service
- Performance isolation

## Development Workflow

### Local Development
```bash
# Start individual service
cd agent-wizard
python3 main.py

# Start all services with Docker Compose
docker-compose up -d

# View service logs
docker-compose logs agent-wizard
```

### Service Communication
- RESTful APIs for synchronous communication
- Message queues for asynchronous operations
- Service discovery for dynamic routing
- Circuit breakers for resilience

### Testing Strategy
- Unit tests per service
- Integration tests between services
- End-to-end testing
- Load testing individual services

## Service Standards

### API Design
- RESTful endpoints
- OpenAPI/Swagger documentation
- Consistent error responses
- Versioning strategy

### Security
- Input validation
- Authentication/authorization
- Rate limiting
- Secure communication

### Monitoring
- Health check endpoints
- Metrics collection
- Logging standards
- Distributed tracing

### Documentation
- API documentation
- Service README files
- Architecture diagrams
- Deployment guides

## Deployment

### Docker Containers
Each service includes:
- Dockerfile for containerization
- Health checks
- Resource limits
- Environment configuration

### Kubernetes Ready
- Service definitions
- ConfigMaps and Secrets
- Ingress configuration
- Horizontal Pod Autoscaling

### CI/CD Pipeline
- Automated testing
- Container building
- Service deployment
- Rolling updates

## Getting Started

1. **Choose a service to work on**
2. **Set up local development environment**
3. **Follow service-specific README**
4. **Run tests to verify setup**
5. **Start developing new features**

## Service Template

When creating new services, follow this structure:
```
service-name/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container definition
├── README.md           # Service documentation
├── tests/              # Test files
├── .env.example        # Environment template
└── docs/               # Additional documentation
```

## Next Steps

1. Complete Agent Wizard service with all features
2. Extract Analytics functionality to separate service
3. Create Billing service for payment processing
4. Implement API Gateway for unified access
5. Set up monitoring and observability stack