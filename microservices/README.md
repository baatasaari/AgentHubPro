# AgentHub Microservices Architecture

A complete microservices-based implementation of the AgentHub platform using FastAPI, with each component running as an independent service.

## Architecture Overview

The AgentHub platform is built using a microservices architecture with the following services:

### 🤖 Agent Wizard Service (Port 8001)
- **Purpose**: Agent creation, management, and system prompt generation
- **Features**: Industry-specific prompts, LLM model selection, YAML configuration
- **Storage**: BigQuery or in-memory
- **Key Endpoints**: `/api/agents`, `/api/industries`, `/api/config`

### 📊 Analytics Service (Port 8002)
- **Purpose**: Usage tracking, performance metrics, and reporting
- **Features**: Conversation analytics, agent performance, industry insights
- **Storage**: BigQuery or in-memory
- **Key Endpoints**: `/api/conversations`, `/api/usage/stats`, `/api/analytics`

### 💰 Billing Service (Port 8003)
- **Purpose**: Cost tracking, billing, invoicing, and payments
- **Features**: Usage-based billing, invoice generation, payment tracking
- **Storage**: BigQuery or in-memory
- **Key Endpoints**: `/api/billing`, `/api/invoices`, `/api/payments`

### 📈 Dashboard Service (Port 8004)
- **Purpose**: Data aggregation and dashboard functionality
- **Features**: Real-time metrics, service orchestration, activity feeds
- **Dependencies**: Calls other services for data aggregation
- **Key Endpoints**: `/api/dashboard`, `/api/dashboard/summary`

### 🎨 Widget Service (Port 8005)
- **Purpose**: Widget customization and code generation
- **Features**: Theme customization, embed code generation, templates
- **Storage**: In-memory
- **Key Endpoints**: `/api/widgets`, `/api/templates`, `/api/widgets/{id}/embed`

### 🔧 My Agents Service (Port 8006)
- **Purpose**: Comprehensive agent lifecycle management
- **Features**: CRUD operations, enable/disable, status tracking, bulk operations
- **Storage**: Cross-service coordination with metadata management
- **Key Endpoints**: `/api/my-agents`, `/api/my-agents/{id}/status`, `/api/my-agents/bulk`

### 🌐 API Gateway (Port 8000)
- **Purpose**: Request routing and load balancing
- **Technology**: Nginx
- **Features**: Service discovery, health checks, CORS handling

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)
- Google Cloud credentials (for BigQuery integration)

### Development Setup

1. **Start all services with Docker Compose**:
```bash
cd microservices
docker-compose up --build
```

2. **Individual service development**:
```bash
# Agent Wizard Service
cd microservices/agent-wizard
pip install -r requirements.txt
python main.py

# Analytics Service
cd microservices/analytics-service  
pip install -r requirements.txt
python main.py

# And so on for other services...
```

### Service URLs

- **API Gateway**: http://localhost:8000
- **Agent Wizard**: http://localhost:8001
- **Analytics**: http://localhost:8002
- **Billing**: http://localhost:8003
- **Dashboard**: http://localhost:8004
- **Widget**: http://localhost:8005
- **My Agents**: http://localhost:8006

## API Documentation

Each service provides OpenAPI documentation:

- Agent Wizard: http://localhost:8001/docs
- Analytics: http://localhost:8002/docs
- Billing: http://localhost:8003/docs
- Dashboard: http://localhost:8004/docs
- Widget: http://localhost:8005/docs
- My Agents: http://localhost:8006/docs

## Service Communication

### Inter-service Communication
Services communicate via HTTP REST APIs:

```python
# Dashboard Service calling Analytics Service
analytics_data = await call_service(
    ANALYTICS_SERVICE_URL, 
    "/api/usage/stats"
)
```

### Service Discovery
Services are configured with environment variables:
- `AGENT_SERVICE_URL=http://agent-wizard:8001`
- `ANALYTICS_SERVICE_URL=http://analytics-service:8002`
- `BILLING_SERVICE_URL=http://billing-service:8003`

## Data Flow

### Agent Creation Flow
1. **Agent Wizard**: Creates agent with industry-specific prompts
2. **Analytics**: Begins tracking agent performance metrics
3. **Billing**: Sets up cost tracking for the agent
4. **Dashboard**: Aggregates data for real-time display

### Conversation Flow
1. **Widget**: User interacts with embedded widget
2. **Agent Wizard**: Processes conversation with LLM
3. **Analytics**: Records conversation metrics
4. **Billing**: Tracks token usage and costs
5. **Dashboard**: Updates real-time statistics

## Configuration

### Environment Variables

```bash
# Storage Configuration
USE_BIGQUERY=false                 # Enable BigQuery storage
ENVIRONMENT=development            # Environment name

# BigQuery Settings (when enabled)
GOOGLE_CLOUD_PROJECT_ID=your-project
BIGQUERY_DATASET_ID=agenthub_dev
GOOGLE_SERVICE_ACCOUNT_KEY=base64-key

# Service URLs (for Docker)
AGENT_SERVICE_URL=http://agent-wizard:8001
ANALYTICS_SERVICE_URL=http://analytics-service:8002
BILLING_SERVICE_URL=http://billing-service:8003
```

### BigQuery Integration

Each service supports BigQuery for production storage:

1. **Setup Terraform Infrastructure**:
```bash
cd microservices/agent-wizard/terraform
./setup.sh
```

2. **Configure Environment**:
```bash
export USE_BIGQUERY=true
export GOOGLE_CLOUD_PROJECT_ID=your-project
export GOOGLE_SERVICE_ACCOUNT_KEY=your-base64-key
```

## Development Guidelines

### Adding New Services

1. **Create Service Directory**:
```bash
mkdir microservices/new-service
cd microservices/new-service
```

2. **FastAPI Application**:
```python
from fastapi import FastAPI

app = FastAPI(
    title="New Service",
    description="Service description",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "new-service"}
```

3. **Add to Docker Compose**:
```yaml
new-service:
  build:
    context: ./new-service
  ports:
    - "8006:8006"
  networks:
    - agenthub-network
```

### Service Standards

- **Health Checks**: All services must provide `/health` endpoint
- **Error Handling**: Use FastAPI HTTPException for errors
- **Logging**: Use Python logging for debugging
- **Validation**: Use Pydantic models for request/response validation
- **Documentation**: Provide OpenAPI documentation

### Testing Services

```bash
# Health check all services
curl http://localhost:8001/health  # Agent Wizard
curl http://localhost:8002/health  # Analytics
curl http://localhost:8003/health  # Billing
curl http://localhost:8004/health  # Dashboard
curl http://localhost:8005/health  # Widget
curl http://localhost:8006/health  # My Agents

# Test via API Gateway
curl http://localhost:8000/health

# Test cross-service communication
curl http://localhost:8004/api/dashboard/summary
```

## Deployment

### Production Deployment

1. **Container Registry**:
```bash
# Build and tag images
docker build -t your-registry/agent-wizard:latest ./agent-wizard
docker build -t your-registry/analytics-service:latest ./analytics-service
# ... for all services

# Push to registry
docker push your-registry/agent-wizard:latest
```

2. **Kubernetes Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-wizard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-wizard
  template:
    metadata:
      labels:
        app: agent-wizard
    spec:
      containers:
      - name: agent-wizard
        image: your-registry/agent-wizard:latest
        ports:
        - containerPort: 8001
        env:
        - name: USE_BIGQUERY
          value: "true"
```

### Cloud Deployment Options

- **Google Cloud Run**: Individual service deployment
- **AWS ECS**: Container orchestration
- **Azure Container Instances**: Serverless containers
- **Kubernetes**: Full orchestration platform

## Monitoring

### Health Monitoring
```bash
# Check all services
docker-compose ps

# Service logs
docker-compose logs agent-wizard
docker-compose logs analytics-service
```

### Performance Monitoring
- **Metrics**: Each service exposes performance metrics
- **Logging**: Centralized logging with correlation IDs
- **Tracing**: Service call tracing for debugging

## Security

### API Security
- **CORS**: Configured for cross-origin requests
- **Authentication**: Ready for JWT or API key implementation
- **Rate Limiting**: Can be implemented at gateway level

### Data Security
- **BigQuery**: Encrypted at rest and in transit
- **Service Communication**: Internal network isolation
- **Environment Variables**: Secure secret management

## Scaling

### Horizontal Scaling
```yaml
# Scale specific services
docker-compose up --scale agent-wizard=3 --scale analytics-service=2
```

### Load Balancing
- **Nginx**: Built-in load balancing
- **Cloud Load Balancers**: For production deployment
- **Service Mesh**: For advanced traffic management

## Troubleshooting

### Common Issues

1. **Service Connectivity**:
```bash
# Check network connectivity
docker network ls
docker network inspect microservices_agenthub-network
```

2. **Port Conflicts**:
```bash
# Check port usage
netstat -tulpn | grep 800
```

3. **BigQuery Authentication**:
```bash
# Verify credentials
echo $GOOGLE_SERVICE_ACCOUNT_KEY | base64 -d | jq .
```

### Debugging Services

```bash
# Service logs
docker-compose logs -f service-name

# Execute commands in container
docker-compose exec agent-wizard bash

# Check service health
curl http://localhost:8004/api/dashboard/status
```

## Contributing

1. **Fork Repository**: Create feature branch
2. **Add Tests**: Include unit and integration tests
3. **Update Documentation**: Maintain service documentation
4. **Submit PR**: Include clear description of changes

## License

This project is part of the AgentHub platform. See main repository for license information.