#!/bin/bash

# AgentHub Complete Microservices Deployment Script
# Deploys all 29 microservices to Cloud Run with internal communication and IAM authentication

set -e

# Load configuration
if [ -f "infrastructure-config.env" ]; then
    source infrastructure-config.env
else
    echo "Error: infrastructure-config.env not found. Run provision-infrastructure.sh first."
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Microservices configuration with service accounts and dependencies
declare -A SERVICES
SERVICES=(
    # Infrastructure Services (Deploy First)
    ["service-discovery-service"]="port=8027,cpu=0.25,memory=256Mi,min=2,max=5,sa=agenthub-microservices,deps="
    ["authentication-service"]="port=8031,cpu=0.5,memory=512Mi,min=2,max=30,sa=agenthub-authentication,deps=service-discovery-service"
    ["configuration-service"]="port=8030,cpu=0.25,memory=256Mi,min=1,max=10,sa=agenthub-microservices,deps=authentication-service"
    ["database-operations-service"]="port=8028,cpu=0.5,memory=512Mi,min=1,max=25,sa=agenthub-database-operations,deps=configuration-service"
    ["logging-service"]="port=8033,cpu=0.25,memory=256Mi,min=1,max=10,sa=agenthub-microservices,deps="
    
    # Core Business Services
    ["agent-management-service"]="port=8101,cpu=1,memory=1Gi,min=2,max=50,sa=agenthub-agent-management,deps=database-operations-service"
    ["conversation-management-service"]="port=8102,cpu=1,memory=1Gi,min=2,max=75,sa=agenthub-conversation-management,deps=agent-management-service"
    ["widget-generation-service"]="port=8104,cpu=0.5,memory=512Mi,min=1,max=20,sa=agenthub-microservices,deps=agent-management-service"
    ["usage-analytics-service"]="port=8103,cpu=0.5,memory=512Mi,min=1,max=30,sa=agenthub-microservices,deps=conversation-management-service"
    
    # Knowledge Management Services
    ["document-processing-service"]="port=8001,cpu=0.5,memory=512Mi,min=0,max=20,sa=agenthub-document-processing,deps=database-operations-service"
    ["embedding-generation-service"]="port=8002,cpu=1,memory=1Gi,min=1,max=30,sa=agenthub-embedding-generation,deps=document-processing-service"
    ["similarity-search-service"]="port=8010,cpu=0.5,memory=512Mi,min=1,max=25,sa=agenthub-microservices,deps=embedding-generation-service"
    ["knowledge-base-service"]="port=8011,cpu=0.5,memory=512Mi,min=1,max=20,sa=agenthub-microservices,deps=similarity-search-service"
    ["faq-management-service"]="port=8013,cpu=0.25,memory=256Mi,min=0,max=10,sa=agenthub-microservices,deps=knowledge-base-service"
    ["rag-query-service"]="port=8111,cpu=1,memory=1Gi,min=1,max=50,sa=agenthub-rag-query,deps=knowledge-base-service,faq-management-service"
    
    # Payment Services
    ["payment-intent-service"]="port=8003,cpu=0.5,memory=512Mi,min=1,max=30,sa=agenthub-payment-intent,deps=authentication-service"
    ["payment-link-service"]="port=8015,cpu=0.25,memory=256Mi,min=0,max=15,sa=agenthub-microservices,deps=payment-intent-service"
    ["metrics-collection-service"]="port=8023,cpu=0.25,memory=256Mi,min=1,max=10,sa=agenthub-microservices,deps=payment-intent-service"
    ["billing-calculation-service"]="port=8119,cpu=0.5,memory=512Mi,min=0,max=20,sa=agenthub-microservices,deps=metrics-collection-service"
    
    # Calendar Services
    ["slot-management-service"]="port=8004,cpu=0.25,memory=256Mi,min=0,max=15,sa=agenthub-microservices,deps=authentication-service"
    ["booking-management-service"]="port=8021,cpu=0.5,memory=512Mi,min=1,max=25,sa=agenthub-microservices,deps=slot-management-service"
    ["calendar-provider-service"]="port=8120,cpu=0.25,memory=256Mi,min=0,max=10,sa=agenthub-microservices,deps=booking-management-service"
    ["notification-service"]="port=8005,cpu=0.25,memory=256Mi,min=1,max=20,sa=agenthub-microservices,deps=booking-management-service"
    
    # Analytics Services
    ["analytics-calculation-service"]="port=8107,cpu=1,memory=1Gi,min=1,max=25,sa=agenthub-microservices,deps=usage-analytics-service"
    ["insights-generation-service"]="port=8125,cpu=1,memory=1Gi,min=0,max=20,sa=agenthub-microservices,deps=analytics-calculation-service"
    ["data-storage-service"]="port=8128,cpu=0.5,memory=512Mi,min=1,max=15,sa=agenthub-microservices,deps=database-operations-service"
    ["system-health-service"]="port=8106,cpu=0.25,memory=256Mi,min=1,max=5,sa=agenthub-microservices,deps="
    
    # Additional Services
    ["response-generation-service"]="port=8012,cpu=1,memory=1Gi,min=1,max=40,sa=agenthub-microservices,deps=rag-query-service"
    ["industry-configuration-service"]="port=8105,cpu=0.25,memory=256Mi,min=0,max=5,sa=agenthub-microservices,deps=configuration-service"
    ["conversation-processing-service"]="port=8126,cpu=1,memory=1Gi,min=1,max=50,sa=agenthub-microservices,deps=conversation-management-service,rag-query-service"
    
    # API Gateway (Deploy Last)
    ["api-gateway"]="port=8000,cpu=1,memory=1Gi,min=2,max=100,sa=agenthub-api-gateway,deps=conversation-processing-service,payment-intent-service,rag-query-service"
)

# Build order based on dependencies
get_build_order() {
    local -A visited
    local -A visiting
    local result=()
    
    visit() {
        local service=$1
        if [[ ${visited[$service]:-} == "true" ]]; then
            return
        fi
        if [[ ${visiting[$service]:-} == "true" ]]; then
            log_error "Circular dependency detected involving $service"
            exit 1
        fi
        
        visiting[$service]="true"
        
        # Visit dependencies first
        local config=${SERVICES[$service]}
        local deps=$(echo "$config" | grep -o 'deps=[^,]*' | cut -d= -f2)
        if [ -n "$deps" ] && [ "$deps" != "" ]; then
            IFS=',' read -ra DEP_ARRAY <<< "$deps"
            for dep in "${DEP_ARRAY[@]}"; do
                if [ -n "$dep" ]; then
                    visit "$dep"
                fi
            done
        fi
        
        visiting[$service]="false"
        visited[$service]="true"
        result+=("$service")
    }
    
    for service in "${!SERVICES[@]}"; do
        visit "$service"
    done
    
    printf '%s\n' "${result[@]}"
}

# Parse service configuration
parse_config() {
    local config=$1
    local param=$2
    echo "$config" | grep -o "$param=[^,]*" | cut -d= -f2
}

# Create Dockerfile for each service if not exists
create_service_dockerfile() {
    local service=$1
    local dockerfile_path="microservices/$service/Dockerfile"
    
    if [ ! -f "$dockerfile_path" ]; then
        log_info "Creating Dockerfile for $service..."
        mkdir -p "microservices/$service"
        
        cat > "$dockerfile_path" <<EOF
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S microservice -u 1001
RUN chown -R microservice:nodejs /app
USER microservice

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:\${PORT}/health || exit 1

# Start the service
CMD ["node", "index.js"]
EOF

        # Create basic service structure
        cat > "microservices/$service/package.json" <<EOF
{
  "name": "$service",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}
EOF

        cat > "microservices/$service/index.js" <<EOF
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: '$service',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'development'
  });
});

// Service-specific endpoints
app.get('/', (req, res) => {
  res.json({ 
    service: '$service',
    version: '1.0.0',
    status: 'running'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`$service running on port \${PORT}\`);
});
EOF
    fi
}

# Deploy a single service
deploy_service() {
    local service=$1
    local config=${SERVICES[$service]}
    
    local port=$(parse_config "$config" "port")
    local cpu=$(parse_config "$config" "cpu")
    local memory=$(parse_config "$config" "memory")
    local min_scale=$(parse_config "$config" "min")
    local max_scale=$(parse_config "$config" "max")
    local service_account=$(parse_config "$config" "sa")
    
    log_info "Deploying $service..."
    
    # Create service structure if needed
    create_service_dockerfile "$service"
    
    # Build and push image
    local image_name="gcr.io/$PROJECT_ID/$service:latest"
    
    log_info "Building image for $service..."
    docker build -t "$image_name" "microservices/$service/"
    docker push "$image_name"
    
    # Deploy to Cloud Run
    log_info "Deploying $service to Cloud Run..."
    
    # Determine if service should allow unauthenticated access (only API Gateway)
    local auth_flag="--no-allow-unauthenticated"
    if [ "$service" == "api-gateway" ]; then
        auth_flag="--allow-unauthenticated"
    fi
    
    gcloud run deploy "$service" \
        --image="$image_name" \
        --region="$REGION" \
        --platform=managed \
        --service-account="$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
        --vpc-connector="$VPC_CONNECTOR" \
        --vpc-egress=private-ranges-only \
        --execution-environment=gen2 \
        --port="$port" \
        --cpu="$cpu" \
        --memory="$memory" \
        --min-instances="$min_scale" \
        --max-instances="$max_scale" \
        --timeout=300 \
        --concurrency=100 \
        $auth_flag \
        --set-env-vars="ENVIRONMENT=$ENVIRONMENT,GCP_PROJECT=$PROJECT_ID,PORT=$port" \
        --quiet
    
    # Configure service-specific IAM policies for internal communication
    if [ "$service" != "api-gateway" ]; then
        log_info "Configuring internal access for $service..."
        
        # Allow other services to invoke this service
        for invoker_service in "${!SERVICES[@]}"; do
            if [ "$invoker_service" != "$service" ]; then
                local invoker_config=${SERVICES[$invoker_service]}
                local invoker_sa=$(parse_config "$invoker_config" "sa")
                
                gcloud run services add-iam-policy-binding "$service" \
                    --region="$REGION" \
                    --member="serviceAccount:$invoker_sa@$PROJECT_ID.iam.gserviceaccount.com" \
                    --role="roles/run.invoker" \
                    --quiet || true
            fi
        done
    fi
    
    # Get service URL
    local service_url=$(gcloud run services describe "$service" \
        --region="$REGION" \
        --format="value(status.url)")
    
    log_success "$service deployed successfully at $service_url"
    
    # Wait a bit for the service to be ready
    sleep 10
    
    # Health check
    if [ "$service" == "api-gateway" ]; then
        if curl -f -s "$service_url/health" > /dev/null; then
            log_success "$service health check passed"
        else
            log_warning "$service health check failed"
        fi
    else
        # For internal services, use authenticated request
        local access_token=$(gcloud auth print-access-token)
        if curl -f -s -H "Authorization: Bearer $access_token" "$service_url/health" > /dev/null; then
            log_success "$service health check passed"
        else
            log_warning "$service health check failed (may be normal during initial deployment)"
        fi
    fi
}

# Main deployment process
main() {
    log_info "Starting deployment of all AgentHub microservices..."
    log_info "Project: $PROJECT_ID"
    log_info "Region: $REGION"
    log_info "Environment: $ENVIRONMENT"
    
    # Configure Docker for GCR
    gcloud auth configure-docker gcr.io --quiet
    
    # Get deployment order
    log_info "Calculating deployment order based on dependencies..."
    readarray -t deployment_order < <(get_build_order)
    
    log_info "Deployment order:"
    for i in "${!deployment_order[@]}"; do
        echo "  $((i+1)). ${deployment_order[$i]}"
    done
    
    # Deploy services in order
    local deployed_count=0
    local total_count=${#deployment_order[@]}
    
    for service in "${deployment_order[@]}"; do
        deployed_count=$((deployed_count + 1))
        log_info "[$deployed_count/$total_count] Deploying $service..."
        
        if deploy_service "$service"; then
            log_success "$service deployment completed"
        else
            log_error "$service deployment failed"
            exit 1
        fi
        
        # Add delay between deployments to avoid rate limits
        if [ $deployed_count -lt $total_count ]; then
            log_info "Waiting 30 seconds before next deployment..."
            sleep 30
        fi
    done
    
    # Final health check of API Gateway
    log_info "Performing final system health check..."
    api_gateway_url=$(gcloud run services describe "api-gateway" \
        --region="$REGION" \
        --format="value(status.url)")
    
    log_info "API Gateway URL: $api_gateway_url"
    
    if curl -f -s "$api_gateway_url/health" > /dev/null; then
        log_success "System deployment completed successfully!"
        log_success "API Gateway is healthy and responding"
    else
        log_warning "System deployed but API Gateway health check failed"
        log_warning "This may be temporary - check logs and try again in a few minutes"
    fi
    
    # Save deployment information
    cat > deployment-info.json <<EOF
{
  "deployment_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_id": "$PROJECT_ID",
  "region": "$REGION",
  "environment": "$ENVIRONMENT",
  "api_gateway_url": "$api_gateway_url",
  "total_services": $total_count,
  "deployment_order": [$(printf '"%s",' "${deployment_order[@]}" | sed 's/,$//')]
}
EOF
    
    log_success "Deployment information saved to deployment-info.json"
    log_info "Your AgentHub platform is now live at: $api_gateway_url"
}

# Run main deployment
main "$@"