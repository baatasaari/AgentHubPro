# AgentHub Cloud Run Deployment Guide
## Complete Step-by-Step Implementation for 29 Microservices

This guide provides comprehensive instructions for deploying AgentHub's microservices architecture on Google Cloud Run with internal communication, IAM authentication, and production-grade monitoring.

---

## 📋 Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [Infrastructure Provisioning](#infrastructure-provisioning)
3. [Service Deployment](#service-deployment)
4. [Security Configuration](#security-configuration)
5. [Communication Setup](#communication-setup)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Testing and Validation](#testing-and-validation)
8. [Production Operations](#production-operations)
9. [Troubleshooting](#troubleshooting)
10. [Cost Optimization](#cost-optimization)

---

## 🚀 Prerequisites and Setup

### Required Tools and Access

```bash
# Install Google Cloud SDK if not already installed
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install Docker for building service images
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install docker.io

# macOS:
brew install docker

# Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login
```

### Project Configuration

```bash
# 1. Create a new Google Cloud Project (or use existing)
export PROJECT_ID="agenthub-production-$(date +%s)"
gcloud projects create $PROJECT_ID --name="AgentHub Production"

# 2. Set the project as default
gcloud config set project $PROJECT_ID

# 3. Link billing account (replace BILLING_ACCOUNT_ID)
# Get billing accounts: gcloud billing accounts list
export BILLING_ACCOUNT_ID="your-billing-account-id"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID

# 4. Set deployment region (Mumbai for Indian market)
export REGION="asia-south1"
export ZONE="asia-south1-a"

# 5. Set environment (prod, staging, dev)
export ENVIRONMENT="prod"

# 6. Save configuration for all scripts
echo "export PROJECT_ID=$PROJECT_ID" > deployment-config.env
echo "export REGION=$REGION" >> deployment-config.env
echo "export ZONE=$ZONE" >> deployment-config.env
echo "export ENVIRONMENT=$ENVIRONMENT" >> deployment-config.env
```

### Verify Prerequisites

```bash
# Check gcloud authentication
gcloud auth list

# Verify project access
gcloud projects describe $PROJECT_ID

# Verify Docker is running
docker --version
docker ps

# Source configuration for current session
source deployment-config.env
```

---

## 🏗️ Infrastructure Provisioning

This step creates all the foundational infrastructure needed for your microservices.

### Step 1: Run Infrastructure Provisioning Script

```bash
# Make the script executable
chmod +x scripts/provision-infrastructure.sh

# Run infrastructure provisioning (takes 15-20 minutes)
./scripts/provision-infrastructure.sh
```

**What this script does:**

1. **Enables Required APIs** (2-3 minutes)
   ```bash
   # APIs enabled automatically:
   # - Cloud Run API (for microservices)
   # - Cloud Build API (for CI/CD)
   # - Container Registry API (for Docker images)
   # - Cloud SQL API (for database)
   # - Redis API (for caching)
   # - VPC Access API (for internal networking)
   # - Secret Manager API (for secrets)
   # - IAM API (for service accounts)
   ```

2. **Creates VPC Network** (1-2 minutes)
   ```bash
   # Creates private network for internal communication
   # Network: agenthub-network (10.1.0.0/16)
   # Subnet: agenthub-subnet (10.1.0.0/16)
   # VPC Connector: agenthub-connector (10.8.0.0/28)
   ```

3. **Creates Service Accounts** (2-3 minutes)
   ```bash
   # Main service account for general services
   agenthub-microservices@PROJECT_ID.iam.gserviceaccount.com
   
   # Individual service accounts for critical services
   agenthub-api-gateway@PROJECT_ID.iam.gserviceaccount.com
   agenthub-agent-management@PROJECT_ID.iam.gserviceaccount.com
   agenthub-conversation-management@PROJECT_ID.iam.gserviceaccount.com
   agenthub-rag-query@PROJECT_ID.iam.gserviceaccount.com
   agenthub-payment-intent@PROJECT_ID.iam.gserviceaccount.com
   agenthub-document-processing@PROJECT_ID.iam.gserviceaccount.com
   agenthub-embedding-generation@PROJECT_ID.iam.gserviceaccount.com
   agenthub-authentication@PROJECT_ID.iam.gserviceaccount.com
   agenthub-database-operations@PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Configures IAM Permissions** (3-4 minutes)
   ```bash
   # Each service account gets appropriate permissions:
   # - Cloud Run invoker (for service-to-service calls)
   # - Cloud SQL client (for database access)
   # - Storage object admin (for file operations)
   # - Secret Manager accessor (for API keys)
   # - Monitoring metric writer (for observability)
   # - Logging log writer (for centralized logging)
   ```

5. **Creates Cloud SQL PostgreSQL** (5-7 minutes)
   ```bash
   # High-availability regional instance
   # Instance: agenthub-postgres-prod
   # Version: PostgreSQL 14
   # Tier: db-custom-2-4096 (2 vCPUs, 4GB RAM)
   # Storage: 100GB SSD with auto-increase
   # Backup: Daily at 3 AM with point-in-time recovery
   # Network: Private IP only (no public access)
   ```

6. **Creates Redis Cache** (2-3 minutes)
   ```bash
   # High-availability Redis instance
   # Instance: agenthub-redis-prod
   # Version: Redis 7.0
   # Tier: Standard HA (4GB memory)
   # Network: Private network access only
   ```

7. **Creates Cloud Storage Buckets** (1-2 minutes)
   ```bash
   # Separate buckets for different data types:
   # agenthub-documents-prod-XXXX (for RAG documents)
   # agenthub-embeddings-prod-XXXX (for vector embeddings)
   # agenthub-uploads-prod-XXXX (for user uploads)
   # agenthub-reports-prod-XXXX (for analytics reports)
   # agenthub-build-logs-prod-XXXX (for CI/CD logs)
   ```

8. **Creates Secrets in Secret Manager** (1 minute)
   ```bash
   # Placeholder secrets created (update with real values later):
   # - openai-api-key
   # - database-url
   # - redis-url
   # - jwt-secret
   ```

### Step 2: Update Secrets with Real Values

```bash
# Update OpenAI API key
echo "your-actual-openai-api-key" | gcloud secrets versions add openai-api-key --data-file=-

# Update database URL (auto-generated during Cloud SQL creation)
export DB_CONNECTION_NAME=$(gcloud sql instances describe agenthub-postgres-$ENVIRONMENT --format="value(connectionName)")
echo "postgresql://postgres:yourpassword@localhost/agenthub?host=/cloudsql/$DB_CONNECTION_NAME" | gcloud secrets versions add database-url --data-file=-

# Update Redis URL (auto-generated during Redis creation)
export REDIS_HOST=$(gcloud redis instances describe agenthub-redis-$ENVIRONMENT --region=$REGION --format="value(host)")
echo "redis://$REDIS_HOST:6379" | gcloud secrets versions add redis-url --data-file=-

# Generate and store JWT secret
openssl rand -base64 32 | gcloud secrets versions add jwt-secret --data-file=-
```

### Step 3: Verify Infrastructure

```bash
# Check VPC network
gcloud compute networks describe agenthub-network

# Check service accounts
gcloud iam service-accounts list --filter="email:agenthub-*"

# Check Cloud SQL instance
gcloud sql instances describe agenthub-postgres-$ENVIRONMENT

# Check Redis instance
gcloud redis instances describe agenthub-redis-$ENVIRONMENT --region=$REGION

# Check storage buckets
gsutil ls -p $PROJECT_ID

# Check secrets
gcloud secrets list --filter="name:agenthub*"

# Load infrastructure configuration
source infrastructure-config.env
```

---

## 🚀 Service Deployment

This step builds and deploys all 29 microservices to Cloud Run with proper dependency management.

### Step 1: Prepare Service Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy-all-services.sh

# Configure Docker for Google Container Registry
gcloud auth configure-docker gcr.io

# Load infrastructure configuration
source infrastructure-config.env

# Verify configuration
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "VPC Network: $VPC_NETWORK"
echo "VPC Connector: $VPC_CONNECTOR"
```

### Step 2: Build and Deploy All Services

```bash
# Deploy all 29 services (takes 45-60 minutes)
./scripts/deploy-all-services.sh
```

**Deployment Process Breakdown:**

1. **Dependency Analysis** (1-2 minutes)
   ```bash
   # Script analyzes service dependencies and creates deployment order:
   # 1. Infrastructure services (service-discovery, authentication, configuration)
   # 2. Core services (agent-management, conversation-management)
   # 3. Domain services (RAG, payment, calendar, analytics)
   # 4. API Gateway (last, depends on all others)
   ```

2. **Service Build and Push** (20-30 minutes)
   ```bash
   # For each service, the script:
   # - Creates Dockerfile if not exists
   # - Builds Docker image
   # - Pushes to Google Container Registry (gcr.io/PROJECT_ID/service-name)
   # - Tags with 'latest' and commit SHA
   ```

3. **Cloud Run Deployment** (20-25 minutes)
   ```bash
   # Each service deployed with specific configuration:
   
   # Critical Services (high resources, multiple instances):
   # - api-gateway: 1 CPU, 1GB RAM, 2-100 instances, PUBLIC access
   # - agent-management-service: 1 CPU, 1GB RAM, 2-50 instances, INTERNAL only
   # - conversation-management-service: 1 CPU, 1GB RAM, 2-75 instances, INTERNAL only
   # - rag-query-service: 1 CPU, 1GB RAM, 1-50 instances, INTERNAL only
   
   # Standard Services (medium resources):
   # - payment-intent-service: 0.5 CPU, 512MB RAM, 1-30 instances, INTERNAL only
   # - document-processing-service: 0.5 CPU, 512MB RAM, 0-20 instances, INTERNAL only
   # - embedding-generation-service: 1 CPU, 1GB RAM, 1-30 instances, INTERNAL only
   
   # Utility Services (low resources):
   # - configuration-service: 0.25 CPU, 256MB RAM, 1-10 instances, INTERNAL only
   # - logging-service: 0.25 CPU, 256MB RAM, 1-10 instances, INTERNAL only
   ```

4. **IAM Configuration** (5-10 minutes)
   ```bash
   # For each service:
   # - Assigns appropriate service account
   # - Configures internal-only access (except API Gateway)
   # - Sets up service-to-service invocation permissions
   # - Connects to VPC via VPC Access Connector
   ```

5. **Health Checks** (5-10 minutes)
   ```bash
   # After each service deployment:
   # - Waits 30 seconds for service to start
   # - Performs health check on /health endpoint
   # - For internal services, uses authenticated requests
   # - Logs deployment success/failure
   ```

### Step 3: Verify Service Deployment

```bash
# List all deployed services
gcloud run services list --region=$REGION

# Get API Gateway URL (your main entry point)
export API_GATEWAY_URL=$(gcloud run services describe api-gateway --region=$REGION --format="value(status.url)")
echo "API Gateway URL: $API_GATEWAY_URL"

# Test public API Gateway access
curl -f "$API_GATEWAY_URL/health"

# Test internal service (should fail without authentication)
export AGENT_MGMT_URL=$(gcloud run services describe agent-management-service --region=$REGION --format="value(status.url)")
curl -f "$AGENT_MGMT_URL/health" || echo "Correctly blocked public access"

# Test internal service with authentication
export ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -f -H "Authorization: Bearer $ACCESS_TOKEN" "$AGENT_MGMT_URL/health"
```

---

## 🔐 Security Configuration

This step configures IAM-based service-to-service authentication and internal-only access.

### Step 1: Configure IAM Security

```bash
# Make security script executable
chmod +x scripts/configure-iam-security.sh

# Run IAM security configuration (takes 10-15 minutes)
./scripts/configure-iam-security.sh
```

**Security Configuration Details:**

1. **Service-to-Service Authentication** (3-5 minutes)
   ```bash
   # For each service:
   # - Updates Cloud Run service to use specific service account
   # - Removes public access (except API Gateway)
   # - Grants invoker permissions to other service accounts
   # - Configures VPC-only networking
   ```

2. **Database Access Control** (2-3 minutes)
   ```bash
   # Services with database access:
   # - agent-management-service
   # - conversation-management-service
   # - database-operations-service
   # - authentication-service
   # - analytics-calculation-service
   # - data-storage-service
   
   # Permissions granted:
   # - roles/cloudsql.client (connect to Cloud SQL)
   # - roles/cloudsql.instanceUser (use Cloud SQL proxy)
   ```

3. **Storage Access Control** (2-3 minutes)
   ```bash
   # Services with storage access:
   # - document-processing-service (upload/process documents)
   # - embedding-generation-service (store embeddings)
   # - data-storage-service (manage analytics data)
   # - api-gateway (serve static content)
   
   # Permissions granted:
   # - roles/storage.objectAdmin (read/write objects)
   # - roles/storage.admin (manage buckets)
   ```

4. **Secret Manager Access** (1-2 minutes)
   ```bash
   # Services with secret access:
   # - embedding-generation-service (OpenAI API key)
   # - response-generation-service (OpenAI API key)
   # - authentication-service (JWT secret)
   # - payment-intent-service (payment keys)
   # - api-gateway (various secrets)
   
   # Permission granted:
   # - roles/secretmanager.secretAccessor
   ```

5. **Custom IAM Roles** (2-3 minutes)
   ```bash
   # Creates custom roles for fine-grained access:
   # - agentHubMicroserviceCommunicator (inter-service communication)
   # - agentHubDataAccess (data services access)
   ```

6. **Network Security** (1-2 minutes)
   ```bash
   # All service accounts get:
   # - roles/compute.networkUser (VPC access)
   # - VPC-only egress (no internet access except via Cloud NAT)
   ```

### Step 2: Test Security Configuration

```bash
# The script automatically runs these tests:

# 1. Test API Gateway public access (should work)
curl -f "$API_GATEWAY_URL/health"

# 2. Test internal service public access (should fail)
curl -f "$AGENT_MGMT_URL/health" && echo "SECURITY ISSUE!" || echo "Correctly blocked"

# 3. Test internal service authenticated access (should work)
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -f -H "Authorization: Bearer $ACCESS_TOKEN" "$AGENT_MGMT_URL/health"

# 4. Generate IAM audit report
# Creates: iam-audit-YYYYMMDD-HHMMSS.json
```

### Step 3: Verify Security Policies

```bash
# Check service IAM policies
gcloud run services get-iam-policy agent-management-service --region=$REGION

# Check project-level IAM
gcloud projects get-iam-policy $PROJECT_ID --format="table(bindings.role,bindings.members)"

# Test cross-service communication
# (This will be done in the communication setup step)
```

---

## 🔗 Communication Setup

This step configures RESTful APIs and gRPC for optimal service communication.

### Step 1: Set Up Service Communication Library

```bash
# Install Node.js dependencies for communication library
npm install axios @grpc/grpc-js @grpc/proto-loader opossum

# Test service communication library
node scripts/service-communication.js
```

**Service Communication Features:**

1. **RESTful API Communication**
   ```javascript
   // Automatic authentication for internal services
   const ServiceCommunicator = require('./scripts/service-communication');
   const communicator = new ServiceCommunicator({
     projectId: process.env.PROJECT_ID,
     region: process.env.REGION
   });
   
   // Example: Agent Management
   const agent = await communicator.getAgent('agent123');
   const newAgent = await communicator.createAgent({
     name: 'Customer Support Agent',
     industry: 'ecommerce'
   });
   
   // Example: RAG Query
   const knowledge = await communicator.queryRAG('customer question', 'agent123');
   
   // Example: Conversation Management
   const conversation = await communicator.createConversation({
     agentId: 'agent123',
     userId: 'user456'
   });
   ```

2. **Circuit Breaker Pattern**
   ```javascript
   // Automatic circuit breakers for each service
   // - Threshold: 5 consecutive failures
   // - Recovery time: 30 seconds
   // - Timeout: Service-specific (5s-60s)
   ```

3. **Retry Logic**
   ```javascript
   // Exponential backoff retry
   // - Max retries: 3
   // - Base delay: 1 second
   // - Backoff multiplier: 2
   // - No retry on 4xx errors (except 408, 429)
   ```

### Step 2: Set Up gRPC Communication

```bash
# Create protocol buffer definitions and start gRPC services
node scripts/grpc-communication-setup.js
```

**gRPC Services for High-Performance Operations:**

1. **Conversation Processing Service** (Port 9001)
   ```protobuf
   service ConversationProcessingService {
     rpc ProcessMessage(ProcessMessageRequest) returns (ProcessMessageResponse);
     rpc StreamConversation(StreamConversationRequest) returns (stream ConversationEvent);
   }
   ```

2. **RAG Query Service** (Port 9002)
   ```protobuf
   service RAGQueryService {
     rpc QueryKnowledge(QueryKnowledgeRequest) returns (QueryKnowledgeResponse);
     rpc StreamResults(QueryKnowledgeRequest) returns (stream KnowledgeResult);
   }
   ```

3. **Embedding Generation Service** (Port 9003)
   ```protobuf
   service EmbeddingGenerationService {
     rpc GenerateEmbedding(GenerateEmbeddingRequest) returns (GenerateEmbeddingResponse);
     rpc BatchEmbedding(BatchEmbeddingRequest) returns (BatchEmbeddingResponse);
   }
   ```

4. **Response Generation Service** (Port 9004)
   ```protobuf
   service ResponseGenerationService {
     rpc GenerateResponse(GenerateResponseRequest) returns (GenerateResponseResponse);
     rpc StreamResponse(StreamResponseRequest) returns (stream ResponseChunk);
   }
   ```

### Step 3: Configure Latency Optimization

```bash
# Test latency optimization features
node scripts/latency-optimization.js
```

**Latency Optimization Strategies:**

1. **Circuit Breakers**
   ```javascript
   // Per-service circuit breakers
   // - Open: 50% error rate over 10 requests
   // - Recovery: 30 seconds
   // - Half-open: Test with single request
   ```

2. **Caching Strategy**
   ```javascript
   // In-memory caching for:
   // - GET requests (5 minutes TTL)
   // - Agent configurations (10 minutes TTL)
   // - Knowledge base queries (15 minutes TTL)
   ```

3. **Fallback Mechanisms**
   ```javascript
   // Fallback order:
   // 1. Fresh API call
   // 2. Cached response
   // 3. Stale cache (if available)
   // 4. Degraded response
   // 5. Default response
   ```

4. **Performance Monitoring**
   ```javascript
   // Automatic tracking of:
   // - Response times (P50, P95, P99)
   // - Success rates
   // - Circuit breaker status
   // - Cache hit rates
   ```

---

## 📊 Monitoring and Maintenance

This step sets up comprehensive monitoring and operational tools.

### Step 1: Start Health Monitoring

```bash
# Make monitoring script executable
chmod +x scripts/monitoring-and-maintenance.sh

# Run initial health check
./scripts/monitoring-and-maintenance.sh monitor
```

**Health Monitoring Output:**
```
Service                            Status          Response Time   URL
-------------------------------------------------------------------------------------------------
api-gateway                        HEALTHY         120ms          https://api-gateway-xxx.a.run.app
agent-management-service           HEALTHY         85ms           https://agent-management-xxx.a.run.app
conversation-management-service    HEALTHY         95ms           https://conversation-mgmt-xxx.a.run.app
rag-query-service                  HEALTHY         180ms          https://rag-query-xxx.a.run.app
...

System Health: 96% (28/29 services healthy)
```

### Step 2: Set Up Continuous Monitoring

```bash
# Start real-time monitoring dashboard (updates every 60 seconds)
./scripts/monitoring-and-maintenance.sh continuous
```

### Step 3: Configure Individual Service Management

```bash
# Scale a specific service
./scripts/monitoring-and-maintenance.sh scale agent-management-service 3 20

# Update service configuration
./scripts/monitoring-and-maintenance.sh config rag-query-service 1.5 2Gi

# View service logs
./scripts/monitoring-and-maintenance.sh logs conversation-management-service 100

# Get service metrics
./scripts/monitoring-and-maintenance.sh metrics payment-intent-service 24

# Deploy new version
./scripts/monitoring-and-maintenance.sh deploy agent-management-service v1.2.3

# Rollback service
./scripts/monitoring-and-maintenance.sh rollback payment-intent-service
```

### Step 4: Database and Infrastructure Monitoring

```bash
# Check database health
./scripts/monitoring-and-maintenance.sh database

# Check Redis health
./scripts/monitoring-and-maintenance.sh redis

# Generate comprehensive system report
./scripts/monitoring-and-maintenance.sh report
```

---

## ✅ Testing and Validation

### Step 1: Service Health Tests

```bash
# Test all service health endpoints
for service in api-gateway agent-management-service conversation-management-service rag-query-service; do
  echo "Testing $service..."
  service_url=$(gcloud run services describe $service --region=$REGION --format="value(status.url)")
  
  if [ "$service" = "api-gateway" ]; then
    # Public service test
    curl -f "$service_url/health" && echo "✓ $service healthy" || echo "✗ $service failed"
  else
    # Internal service test
    access_token=$(gcloud auth print-access-token)
    curl -f -H "Authorization: Bearer $access_token" "$service_url/health" && echo "✓ $service healthy" || echo "✗ $service failed"
  fi
done
```

### Step 2: Service Communication Tests

```bash
# Test service-to-service communication
node -e "
const ServiceCommunicator = require('./scripts/service-communication');
const communicator = new ServiceCommunicator();

async function test() {
  try {
    // Test agent management
    console.log('Testing agent management...');
    const health = await communicator.healthCheck('agent-management-service');
    console.log('Agent Management Health:', health.healthy ? '✓' : '✗');
    
    // Test RAG service
    console.log('Testing RAG service...');
    const ragHealth = await communicator.healthCheck('rag-query-service');
    console.log('RAG Service Health:', ragHealth.healthy ? '✓' : '✗');
    
    // Test all services
    console.log('Testing all services...');
    const allHealth = await communicator.healthCheckAll();
    const healthyCount = allHealth.filter(s => s.healthy).length;
    console.log(\`Overall Health: \${healthyCount}/\${allHealth.length} services healthy\`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();
"
```

### Step 3: Performance Tests

```bash
# Load test API Gateway
echo "Running load test on API Gateway..."
for i in {1..10}; do
  time curl -s "$API_GATEWAY_URL/health" > /dev/null &
done
wait
echo "Load test completed"

# Test latency optimization
node -e "
const LatencyOptimizer = require('./scripts/latency-optimization');
const optimizer = new LatencyOptimizer();

// Test with simulated service calls
optimizer.on('performanceAlert', (alert) => {
  console.log('Performance Alert:', alert);
});

console.log('Latency optimization test completed');
"
```

### Step 4: Security Tests

```bash
# Test that internal services are not publicly accessible
echo "Testing security configuration..."

for service in agent-management-service conversation-management-service rag-query-service; do
  service_url=$(gcloud run services describe $service --region=$REGION --format="value(status.url)")
  
  echo "Testing $service public access (should fail)..."
  if curl -f -s "$service_url/health" > /dev/null 2>&1; then
    echo "🚨 SECURITY ISSUE: $service is publicly accessible!"
  else
    echo "✓ $service correctly blocks public access"
  fi
done

echo "Security test completed"
```

---

## 🏭 Production Operations

### Daily Operations

```bash
# Morning health check
./scripts/monitoring-and-maintenance.sh monitor

# Check system report
./scripts/monitoring-and-maintenance.sh report

# Monitor resource usage
gcloud monitoring dashboards list
```

### Weekly Maintenance

```bash
# Database maintenance
./scripts/monitoring-and-maintenance.sh database

# Redis maintenance  
./scripts/monitoring-and-maintenance.sh redis

# Clean up old container images
gcloud container images list-tags gcr.io/$PROJECT_ID/api-gateway --limit=10 --sort-by=~TIMESTAMP
# Delete old images manually if needed
```

### Deployment Operations

```bash
# Deploy single service update
./deploy-service.sh agent-management-service v1.2.3 prod

# Deploy with canary (50% traffic to new version)
gcloud run services update-traffic agent-management-service \
  --to-revisions=agent-management-service-v123=50,agent-management-service-v122=50 \
  --region=$REGION

# Promote to 100% after validation
gcloud run services update-traffic agent-management-service \
  --to-latest \
  --region=$REGION

# Rollback if needed
./scripts/monitoring-and-maintenance.sh rollback agent-management-service
```

### Scaling Operations

```bash
# Scale up for high traffic
./scripts/monitoring-and-maintenance.sh scale api-gateway 5 200
./scripts/monitoring-and-maintenance.sh scale agent-management-service 3 100

# Scale down for cost optimization
./scripts/monitoring-and-maintenance.sh scale analytics-calculation-service 0 10
./scripts/monitoring-and-maintenance.sh scale industry-configuration-service 0 5
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Service Deployment Failures

**Symptom:** Service fails to deploy or start
```bash
# Check deployment logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME" --limit=50

# Check service configuration
gcloud run services describe SERVICE_NAME --region=$REGION

# Common fixes:
# - Increase memory allocation
# - Check environment variables
# - Verify service account permissions
# - Check VPC connector configuration
```

#### 2. Authentication Errors

**Symptom:** 403 or 401 errors between services
```bash
# Check IAM policies
gcloud run services get-iam-policy SERVICE_NAME --region=$REGION

# Check service account
gcloud run services describe SERVICE_NAME --region=$REGION --format="value(spec.template.spec.serviceAccountName)"

# Re-run security configuration
./scripts/configure-iam-security.sh

# Test authentication manually
access_token=$(gcloud auth print-access-token)
curl -H "Authorization: Bearer $access_token" SERVICE_URL/health
```

#### 3. Network Connectivity Issues

**Symptom:** Services can't reach each other or external APIs
```bash
# Check VPC connector
gcloud compute networks vpc-access connectors describe agenthub-connector --region=$REGION

# Check service networking
gcloud run services describe SERVICE_NAME --region=$REGION --format="value(spec.template.metadata.annotations)"

# Test connectivity from Cloud Shell
gcloud alpha cloud-shell ssh --ssh-flag="-L 8080:SERVICE_URL:443"
```

#### 4. Performance Issues

**Symptom:** Slow response times or timeouts
```bash
# Check service metrics
./scripts/monitoring-and-maintenance.sh metrics SERVICE_NAME 24

# Check resource usage
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/container/cpu/utilizations"' \
  --interval-start-time="2024-01-01T00:00:00Z" \
  --interval-end-time="2024-01-01T23:59:59Z"

# Scale up resources
./scripts/monitoring-and-maintenance.sh config SERVICE_NAME 2 4Gi
./scripts/monitoring-and-maintenance.sh scale SERVICE_NAME 2 50
```

#### 5. Database Connection Issues

**Symptom:** Services can't connect to Cloud SQL
```bash
# Check Cloud SQL status
gcloud sql instances describe agenthub-postgres-$ENVIRONMENT

# Check database permissions
gcloud projects get-iam-policy $PROJECT_ID --filter="bindings.members:*cloudsql*"

# Test database connection
gcloud sql connect agenthub-postgres-$ENVIRONMENT --user=postgres
```

### Emergency Procedures

#### Service Outage Recovery

```bash
# 1. Identify affected services
./scripts/monitoring-and-maintenance.sh monitor

# 2. Check recent deployments
gcloud logging read "protoPayload.serviceName=run.googleapis.com" --limit=20

# 3. Rollback recent changes
./scripts/monitoring-and-maintenance.sh rollback AFFECTED_SERVICE

# 4. Scale up healthy services
./scripts/monitoring-and-maintenance.sh scale HEALTHY_SERVICE 3 100

# 5. Implement circuit breaker failover
# (Automatic via latency optimizer)
```

#### Database Recovery

```bash
# 1. Check database status
gcloud sql instances describe agenthub-postgres-$ENVIRONMENT

# 2. If needed, restart database
gcloud sql instances restart agenthub-postgres-$ENVIRONMENT

# 3. If corruption, restore from backup
gcloud sql backups list --instance=agenthub-postgres-$ENVIRONMENT
gcloud sql backups restore BACKUP_ID --restore-instance=agenthub-postgres-$ENVIRONMENT
```

---

## 💰 Cost Optimization

### Understanding Costs

**Monthly Cost Breakdown (Estimated):**
```
API Gateway (always running):     $150-300
Agent Management (2-50 instances): $100-250  
Conversation Mgmt (2-75 instances): $150-300
RAG Query Service (1-50 instances): $100-200
Payment Services (4 services):     $100-200
Knowledge Services (6 services):   $150-300
Calendar Services (4 services):    $80-160
Analytics Services (4 services):   $100-200
Infrastructure Services (7 services): $120-240
Database (Cloud SQL):              $200-400
Redis Cache:                       $80-150
Storage:                          $50-100
Networking:                       $30-60
Total:                           $1,310-2,760/month
```

### Cost Optimization Strategies

#### 1. Right-size Services
```bash
# Monitor actual usage
for service in $(gcloud run services list --region=$REGION --format="value(metadata.name)"); do
  echo "=== $service ==="
  gcloud monitoring timeseries list \
    --filter="metric.type=\"run.googleapis.com/container/cpu/utilizations\" AND resource.labels.service_name=\"$service\"" \
    --interval-start-time="$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
    --interval-end-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --format="table(points[].value.doubleValue)" | head -5
done

# Reduce resources for low-usage services
./scripts/monitoring-and-maintenance.sh config industry-configuration-service 0.25 256Mi
./scripts/monitoring-and-maintenance.sh config logging-service 0.25 256Mi
```

#### 2. Optimize Scaling
```bash
# Set aggressive scale-to-zero for non-critical services
./scripts/monitoring-and-maintenance.sh scale faq-management-service 0 10
./scripts/monitoring-and-maintenance.sh scale industry-configuration-service 0 5
./scripts/monitoring-and-maintenance.sh scale calendar-provider-service 0 10

# Set minimum instances only for critical services
./scripts/monitoring-and-maintenance.sh scale api-gateway 1 100
./scripts/monitoring-and-maintenance.sh scale agent-management-service 1 50
```

#### 3. Database Optimization
```bash
# Monitor database usage
gcloud monitoring timeseries list \
  --filter='metric.type="cloudsql.googleapis.com/database/postgresql/num_backends"' \
  --interval-start-time="$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  --interval-end-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Downsize if underutilized
gcloud sql instances patch agenthub-postgres-$ENVIRONMENT --tier=db-custom-1-2048
```

#### 4. Storage Optimization
```bash
# Set up lifecycle policies for cost reduction
for bucket in $(gsutil ls -p $PROJECT_ID | grep agenthub); do
  gsutil lifecycle set <(cat <<EOF
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 90}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 365}
    }
  ]
}
EOF
) $bucket
done
```

### Cost Monitoring

```bash
# Set up billing alerts
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="AgentHub Monthly Budget" \
  --budget-amount=3000 \
  --threshold-rules-percent-exceeded=50,90 \
  --threshold-rules-spend-basis=CURRENT_SPEND

# Monitor costs daily
gcloud billing budgets list --billing-account=$BILLING_ACCOUNT_ID
```

---

## 📝 Summary

Your AgentHub platform is now fully deployed on Google Cloud Run with:

✅ **29 Microservices** - Independently managed and scalable
✅ **Internal Security** - IAM-based authentication, VPC-only networking  
✅ **High Performance** - RESTful APIs + gRPC, latency optimization
✅ **Production Monitoring** - Health checks, metrics, alerting
✅ **Cost Optimization** - Smart auto-scaling, resource right-sizing
✅ **Operational Tools** - Deployment, scaling, rollback, maintenance

### Key URLs and Access Points

```bash
# Your main application entry point
echo "API Gateway: $API_GATEWAY_URL"

# Monitoring and management
echo "Health Monitor: ./scripts/monitoring-and-maintenance.sh monitor"
echo "Continuous Dashboard: ./scripts/monitoring-and-maintenance.sh continuous"

# Google Cloud Console
echo "Cloud Run Services: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "Cloud SQL: https://console.cloud.google.com/sql?project=$PROJECT_ID"
echo "Monitoring: https://console.cloud.google.com/monitoring?project=$PROJECT_ID"
```

### Next Steps

1. **Test Your Application** - Verify all functionality works as expected
2. **Set Up Monitoring Alerts** - Configure notifications for your team
3. **Implement CI/CD** - Automate deployments with Cloud Build
4. **Security Review** - Conduct security audit of deployed services
5. **Performance Tuning** - Optimize based on real usage patterns
6. **Documentation** - Document your specific business logic and APIs

Your AgentHub platform is now ready for production use with enterprise-grade reliability, security, and scalability!