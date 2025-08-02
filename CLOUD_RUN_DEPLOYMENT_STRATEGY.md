# AgentHub Cloud Run Microservices Deployment Strategy

## Overview
Deploy AgentHub's 29 microservices architecture on Google Cloud Run with individual service management, Docker Compose orchestration for local development, and comprehensive DevOps automation.

## Architecture Components

### 1. Microservices Distribution
- **29 Individual Cloud Run Services** - Each microservice as separate Cloud Run service
- **API Gateway Service** - NGINX-based routing and load balancing
- **Service-to-Service Communication** - Private networking with authentication
- **Shared Resources** - BigQuery, Memcached, Cloud Storage

### 2. Domain-Based Service Organization

#### Knowledge Management Domain (6 services)
- `document-processing-service` - Document upload and parsing
- `embedding-generation-service` - Vector embeddings creation
- `similarity-search-service` - Semantic search operations
- `knowledge-base-service` - Document storage and retrieval
- `faq-management-service` - FAQ management and matching
- `rag-query-service` - RAG query processing

#### Payment Processing Domain (4 services)
- `payment-intent-service` - Payment intent creation
- `payment-link-service` - Payment link generation
- `metrics-collection-service` - Payment metrics tracking
- `billing-calculation-service` - Usage-based billing

#### Calendar & Booking Domain (4 services)
- `slot-management-service` - Available time slots
- `booking-management-service` - Reservation handling
- `calendar-provider-service` - External calendar integration
- `notification-service` - Booking notifications

#### Core Business Logic Domain (4 services)
- `agent-management-service` - Agent CRUD operations
- `conversation-management-service` - Chat session handling
- `widget-generation-service` - Embeddable widget creation
- `usage-analytics-service` - Usage tracking and analytics

#### Analytics & Insights Domain (4 services)
- `analytics-calculation-service` - Business metrics calculation
- `insights-generation-service` - AI-powered business insights
- `data-storage-service` - Analytics data management
- `system-health-service` - Platform monitoring

#### Platform Infrastructure Domain (7 services)
- `configuration-service` - Central configuration management
- `response-generation-service` - LLM response generation
- `service-discovery-service` - Service registry and discovery
- `authentication-service` - User authentication and authorization
- `database-operations-service` - Database abstraction layer
- `logging-service` - Centralized logging
- `industry-configuration-service` - Industry-specific configurations

## Cloud Run Deployment Architecture

### Service Configuration
```yaml
# Each service gets individual Cloud Run configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: agent-management-service
  annotations:
    run.googleapis.com/ingress: internal  # Internal services only
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/agent-management-service:latest
        ports:
        - containerPort: 8101
        env:
        - name: PORT
          value: "8101"
        resources:
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

### API Gateway Configuration
```yaml
# Public-facing API Gateway
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api-gateway
  annotations:
    run.googleapis.com/ingress: all  # Public access
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/api-gateway:latest
        ports:
        - containerPort: 8000
        env:
        - name: AGENT_MANAGEMENT_URL
          value: "https://agent-management-service-HASH-uc.a.run.app"
```

## DevOps Implementation Strategy

### 1. Infrastructure as Code (Terraform)
```hcl
# terraform/cloud-run-services.tf
resource "google_cloud_run_service" "microservices" {
  for_each = var.microservices
  
  name     = each.key
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/${each.key}:latest"
        ports {
          container_port = each.value.port
        }
        
        resources {
          limits = {
            cpu    = each.value.cpu
            memory = each.value.memory
          }
        }
        
        env {
          name  = "PORT"
          value = each.value.port
        }
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = each.value.min_scale
        "autoscaling.knative.dev/maxScale" = each.value.max_scale
        "run.googleapis.com/ingress"       = each.value.ingress
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}
```

### 2. CI/CD Pipeline (Cloud Build)
```yaml
# cloudbuild.yaml
steps:
# Build all microservices
- name: 'gcr.io/cloud-builders/docker'
  id: 'build-services'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    for service in microservices/*/; do
      service_name=$(basename "$service")
      docker build -t gcr.io/$PROJECT_ID/$service_name:$COMMIT_SHA -f $service/Dockerfile $service
      docker push gcr.io/$PROJECT_ID/$service_name:$COMMIT_SHA
    done

# Deploy to Cloud Run
- name: 'gcr.io/cloud-builders/gcloud'
  id: 'deploy-services'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    for service in microservices/*/; do
      service_name=$(basename "$service")
      gcloud run deploy $service_name \
        --image gcr.io/$PROJECT_ID/$service_name:$COMMIT_SHA \
        --region us-central1 \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars PORT=$port
    done
```

### 3. Service Discovery and Communication
```javascript
// service-discovery/registry.js
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.loadFromCloudRun();
  }
  
  async loadFromCloudRun() {
    const services = await this.getCloudRunServices();
    services.forEach(service => {
      this.services.set(service.name, {
        url: service.status.url,
        status: service.status.conditions[0].status
      });
    });
  }
  
  getService(name) {
    return this.services.get(name);
  }
}
```

### 4. Monitoring and Observability
```yaml
# monitoring/dashboards.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: microservices-dashboard
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "AgentHub Microservices",
        "panels": [
          {
            "title": "Service Health",
            "type": "stat",
            "targets": [
              {
                "expr": "up{job=\"cloud-run-services\"}"
              }
            ]
          },
          {
            "title": "Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total[5m])"
              }
            ]
          }
        ]
      }
    }
```

## Individual Service Management

### 1. Service-Specific Deployment Scripts
```bash
#!/bin/bash
# deploy-service.sh
SERVICE_NAME=$1
VERSION=$2

echo "Deploying $SERVICE_NAME version $VERSION..."

# Build service
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION microservices/$SERVICE_NAME/

# Push to registry
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated

echo "$SERVICE_NAME deployed successfully!"
```

### 2. Service Health Monitoring
```javascript
// monitoring/health-check.js
const services = [
  'agent-management-service',
  'conversation-management-service',
  'rag-query-service',
  // ... all 29 services
];

async function checkServiceHealth() {
  const results = await Promise.all(
    services.map(async (service) => {
      try {
        const response = await fetch(`https://${service}-HASH-uc.a.run.app/health`);
        return {
          service,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: response.headers.get('x-response-time')
        };
      } catch (error) {
        return {
          service,
          status: 'error',
          error: error.message
        };
      }
    })
  );
  
  return results;
}
```

### 3. Auto-scaling Configuration
```yaml
# Each service gets custom scaling rules
metadata:
  annotations:
    # High-traffic services (API Gateway, Agent Management)
    autoscaling.knative.dev/minScale: "2"
    autoscaling.knative.dev/maxScale: "100"
    
    # Medium-traffic services (RAG, Payment)
    autoscaling.knative.dev/minScale: "1"
    autoscaling.knative.dev/maxScale: "50"
    
    # Low-traffic services (Configuration, Logging)
    autoscaling.knative.dev/minScale: "0"
    autoscaling.knative.dev/maxScale: "10"
```

## Cost Estimation

### Monthly Cost Breakdown (Estimated)
- **API Gateway Service**: $150-300/month (always running)
- **Core Services (4)**: $400-800/month (agent, conversation, analytics)
- **RAG Services (6)**: $300-600/month (knowledge processing)
- **Payment Services (4)**: $200-400/month (transaction processing)
- **Calendar Services (4)**: $150-300/month (booking management)
- **Infrastructure Services (7)**: $350-700/month (auth, config, logging)
- **Analytics Services (4)**: $200-400/month (insights generation)

**Total Estimated Cost**: $1,750-3,500/month (depending on traffic)

## Security Implementation

### 1. Service-to-Service Authentication
```yaml
# Each internal service requires authentication
metadata:
  annotations:
    run.googleapis.com/ingress: internal
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
    spec:
      serviceAccountName: microservice-sa
```

### 2. Network Security
```hcl
# VPC Connector for private communication
resource "google_vpc_access_connector" "microservices" {
  name          = "microservices-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.microservices.name
}
```

## Implementation Timeline

### Week 1-2: Infrastructure Setup
- Set up GCP project and enable APIs
- Create Terraform infrastructure code
- Set up Cloud Build CI/CD pipelines
- Configure service accounts and IAM

### Week 3-4: Core Services Deployment
- Deploy API Gateway and core business services
- Implement service discovery and communication
- Set up monitoring and logging

### Week 5-6: Domain Services Deployment
- Deploy RAG and knowledge management services
- Deploy payment and calendar services
- Implement inter-service authentication

### Week 7-8: Analytics and Infrastructure Services
- Deploy analytics and insights services
- Deploy platform infrastructure services
- Complete end-to-end testing

### Week 9-10: Production Hardening
- Implement comprehensive monitoring
- Set up alerting and incident response
- Performance optimization and load testing

## Next Steps for Your DevOps Team

1. **Review this strategy** and adapt to your specific requirements
2. **Set up GCP project** with necessary APIs enabled
3. **Create Terraform modules** for repeatable deployments
4. **Implement CI/CD pipelines** for automated deployments
5. **Set up monitoring** and alerting infrastructure

This strategy provides you with complete individual microservice management while leveraging Cloud Run's serverless benefits and your Docker Compose development workflow.