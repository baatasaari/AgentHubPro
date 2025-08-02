# AgentHub Cloud Run Deployment Guide

Complete deployment solution for AgentHub's 29 microservices on Google Cloud Run with internal communication, IAM authentication, and production-grade monitoring.

## 🏗️ Architecture Overview

### Microservices Distribution
- **29 Individual Cloud Run Services** - Each microservice independently managed
- **Internal-Only Communication** - Private VPC networking with IAM authentication
- **RESTful APIs + gRPC** - HTTP for standard operations, gRPC for high-performance calls
- **Service-to-Service Authentication** - Individual service accounts with least privilege
- **Graceful Latency Handling** - Circuit breakers, retries, and fallback mechanisms

### Regional Setup (Mumbai/Asia-South1)
- **Low Latency for Indian Market** - Deployed in asia-south1 region
- **High Availability** - Regional Cloud SQL with automatic backups
- **Auto-scaling** - 0-100 instances per service based on traffic
- **Cost Optimization** - Pay only for actual usage with smart scaling

## 🚀 Quick Start

### Prerequisites
- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed for local development
- Node.js 20+ for running scripts

### 1. Provision Infrastructure
```bash
# Set your project ID
export PROJECT_ID="your-agenthub-project"

# Provision complete infrastructure
./scripts/provision-infrastructure.sh
```

This creates:
- ✅ VPC network with private subnets
- ✅ Service accounts with IAM roles
- ✅ Cloud SQL PostgreSQL (Regional HA)
- ✅ Redis instance for caching
- ✅ Cloud Storage buckets
- ✅ Secret Manager setup

### 2. Deploy All Microservices
```bash
# Deploy all 29 services in dependency order
./scripts/deploy-all-services.sh
```

This handles:
- ✅ Building Docker images for each service
- ✅ Pushing to Google Container Registry
- ✅ Deploying to Cloud Run with correct configuration
- ✅ Setting up internal-only authentication
- ✅ Health checks and validation

### 3. Configure Security
```bash
# Configure IAM authentication and security
./scripts/configure-iam-security.sh
```

This configures:
- ✅ Service-to-service authentication
- ✅ Internal-only access (except API Gateway)
- ✅ Database and storage permissions
- ✅ Secret Manager access
- ✅ Custom IAM roles

### 4. Start Monitoring
```bash
# Start comprehensive monitoring
./scripts/monitoring-and-maintenance.sh monitor
```

## 📊 Service Management

### Individual Service Operations

**Deploy Single Service:**
```bash
./deploy-service.sh agent-management-service v1.2.0 prod
```

**Scale Service:**
```bash
./scripts/monitoring-and-maintenance.sh scale agent-management-service 2 20
```

**View Service Logs:**
```bash
./scripts/monitoring-and-maintenance.sh logs rag-query-service 100
```

**Get Service Metrics:**
```bash
./scripts/monitoring-and-maintenance.sh metrics conversation-management-service 24
```

**Rollback Service:**
```bash
./scripts/monitoring-and-maintenance.sh rollback payment-intent-service
```

### Continuous Monitoring
```bash
# Start real-time monitoring dashboard
./scripts/monitoring-and-maintenance.sh continuous
```

## 🔐 Security Features

### Service-to-Service Authentication
- **Individual Service Accounts** - Each critical service has its own service account
- **IAM-based Authorization** - Services can only invoke authorized endpoints
- **Internal-Only Access** - All services except API Gateway are private
- **Token-based Authentication** - Automatic Google Cloud authentication

### Network Security
- **Private VPC** - All services communicate within private network
- **VPC Connector** - Cloud Run services use VPC Access Connector
- **No Public IPs** - Internal services have no public endpoints
- **SSL/TLS Everywhere** - End-to-end encryption

### Data Security
- **Secret Manager** - API keys and secrets centrally managed
- **Database Security** - Private Cloud SQL with encrypted connections
- **Storage Security** - IAM-controlled Cloud Storage access
- **Audit Logging** - All service interactions logged

## 📈 Performance Optimization

### Latency Management
The platform includes sophisticated latency optimization:

```javascript
const LatencyOptimizer = require('./scripts/latency-optimization');
const optimizer = new LatencyOptimizer({
  defaultTimeout: 30000,
  fastTimeout: 5000,
  slowTimeout: 60000,
  maxRetries: 3
});

// Optimized service calls with fallbacks
const result = await optimizer.optimizedCall('rag-query-service', 'queryKnowledge', {
  query: 'customer question',
  agentId: 'agent123'
}, {
  priority: 'high',
  enableCache: true,
  enableFallback: true
});
```

### gRPC for High-Performance Operations
```javascript
const GRPCManager = require('./scripts/grpc-communication-setup');
const grpc = new GRPCManager();

// Start gRPC services for high-throughput operations
grpc.startAllServices();

// Use gRPC for real-time conversation processing
const client = grpc.createGRPCClient('conversation-processing');
```

### Circuit Breakers and Fallbacks
- **Automatic Circuit Breakers** - Protect against cascading failures
- **Graceful Degradation** - Fallback to cached or simplified responses
- **Retry with Backoff** - Exponential backoff for failed requests
- **Performance Monitoring** - Real-time latency and error tracking

## 🏭 Production Deployment

### Infrastructure as Code (Terraform)
Complete Terraform configuration in `terraform/main.tf`:
- Service definitions with auto-scaling
- IAM policies and service accounts
- Database and caching infrastructure
- Monitoring and alerting setup

### CI/CD Pipeline (Cloud Build)
Automated deployment pipeline in `cloudbuild.yaml`:
- Parallel building of all services
- Dependency-aware deployment order
- Automatic health checks
- Rollback on failure

### Monitoring and Alerting
Comprehensive monitoring system:
- **Health Dashboard** - Real-time service status
- **Performance Metrics** - Latency, throughput, error rates
- **Alert Management** - Slack/email alerts for issues
- **System Reports** - Automated performance reports

## 💰 Cost Management

### Estimated Monthly Costs (Production Scale)
- **API Gateway**: $150-300 (always running, 2-100 instances)
- **Core Services**: $400-800 (agent, conversation, RAG services)
- **Domain Services**: $350-700 (payment, calendar, analytics)
- **Infrastructure**: $500-1000 (database, storage, networking)
- **Total**: $1,400-2,800/month (scales with usage)

### Cost Optimization Features
- **Smart Auto-scaling** - Scale to zero for low-traffic services
- **Resource Right-sizing** - CPU/memory optimized per service
- **Efficient Caching** - Redis for reduced compute costs
- **Regional Deployment** - Single region reduces data transfer costs

## 🛠️ Development Workflow

### Local Development
```bash
# Run microservices locally with Docker Compose
docker-compose -f docker-compose.microservices.yml up

# Test individual services
curl http://localhost:8101/health  # Agent Management
curl http://localhost:8111/health  # RAG Query Service
```

### Testing and Validation
```bash
# Run comprehensive health checks
./scripts/monitoring-and-maintenance.sh monitor

# Generate system report
./scripts/monitoring-and-maintenance.sh report

# Test service communication
node scripts/service-communication.js
```

### Debugging and Troubleshooting
```bash
# Get detailed service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=agent-management-service" --limit=100

# Check service configuration
gcloud run services describe agent-management-service --region=asia-south1

# Test service authentication
gcloud auth print-access-token | curl -H "Authorization: Bearer $(cat -)" https://service-url/health
```

## 📚 API Documentation

### Service Communication Library
```javascript
const ServiceCommunicator = require('./scripts/service-communication');
const communicator = new ServiceCommunicator({
  projectId: 'your-project',
  region: 'asia-south1'
});

// Agent Management
const agent = await communicator.getAgent('agent123');
const newAgent = await communicator.createAgent({name: 'New Agent'});

// RAG Queries
const knowledge = await communicator.queryRAG('user question', 'agent123');

// Conversation Management
const conversation = await communicator.createConversation({agentId: 'agent123'});
```

### Health Check Endpoints
All services expose standardized health endpoints:
```
GET /health
{
  "status": "healthy",
  "service": "agent-management-service",
  "timestamp": "2025-08-02T10:30:00Z",
  "version": "1.0.0"
}
```

## 🚨 Troubleshooting

### Common Issues

**Service Authentication Errors:**
```bash
# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID

# Test service account authentication
gcloud auth activate-service-account --key-file=service-account-key.json
```

**Service Discovery Issues:**
```bash
# Verify VPC connector
gcloud compute networks vpc-access connectors describe agenthub-connector --region=asia-south1

# Check service URLs
gcloud run services list --region=asia-south1
```

**Performance Issues:**
```bash
# Monitor service metrics
./scripts/monitoring-and-maintenance.sh metrics service-name 24

# Check circuit breaker status
node -e "const optimizer = require('./scripts/latency-optimization'); console.log(optimizer.getCircuitBreakerStatus())"
```

## 🔄 Updates and Maintenance

### Rolling Updates
```bash
# Deploy new version with zero downtime
./deploy-service.sh agent-management-service v1.3.0 prod

# Monitor deployment
./scripts/monitoring-and-maintenance.sh monitor
```

### Database Maintenance
```bash
# Check database status
./scripts/monitoring-and-maintenance.sh database

# Backup database
gcloud sql backups create --instance=agenthub-postgres-prod
```

### Security Updates
```bash
# Audit IAM permissions
./scripts/configure-iam-security.sh

# Rotate service account keys
gcloud iam service-accounts keys create new-key.json --iam-account=service-account@project.iam.gserviceaccount.com
```

## 📞 Support and Resources

### Monitoring Dashboards
- **Health Dashboard**: `./scripts/monitoring-and-maintenance.sh continuous`
- **Performance Metrics**: Google Cloud Console → Cloud Run
- **Logs**: Google Cloud Console → Logging

### Documentation
- `CLOUD_RUN_DEPLOYMENT_STRATEGY.md` - Detailed deployment strategy
- `terraform/main.tf` - Infrastructure as code
- `cloudbuild.yaml` - CI/CD pipeline
- `scripts/` - All operational scripts

### Getting Help
1. Check service logs: `./scripts/monitoring-and-maintenance.sh logs SERVICE_NAME`
2. Review system health: `./scripts/monitoring-and-maintenance.sh monitor`
3. Generate diagnostic report: `./scripts/monitoring-and-maintenance.sh report`

---

**🎉 Your AgentHub platform is now production-ready on Google Cloud Run!**

The system provides enterprise-grade scalability, security, and monitoring while maintaining cost efficiency through intelligent auto-scaling and resource optimization.