#!/bin/bash

# AgentHub 26 Microservices Deployment Script
# Deploys all services to production environment

set -e

echo "🚀 AgentHub 26 Microservices Deployment Starting..."
echo "=============================================="

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
VERSION=${VERSION:-$(git rev-parse --short HEAD)}

echo "Environment: $ENVIRONMENT"
echo "Registry: $DOCKER_REGISTRY"
echo "Version: $VERSION"
echo ""

# Function to build and push service
build_and_push_service() {
    local service_name=$1
    local service_path=$2
    
    echo "📦 Building $service_name..."
    
    cd $service_path
    
    # Build Docker image
    docker build -t $DOCKER_REGISTRY/agenthub-$service_name:$VERSION .
    docker build -t $DOCKER_REGISTRY/agenthub-$service_name:latest .
    
    # Push to registry
    echo "🔼 Pushing $service_name to registry..."
    docker push $DOCKER_REGISTRY/agenthub-$service_name:$VERSION
    docker push $DOCKER_REGISTRY/agenthub-$service_name:latest
    
    cd - > /dev/null
    
    echo "✅ $service_name built and pushed successfully"
    echo ""
}

# Array of all microservices
declare -A SERVICES=(
    ["auth-service"]="services/auth-service"
    ["user-management"]="services/user-management"
    ["organization"]="services/organization"
    ["agent-creation"]="services/agent-creation"
    ["agent-management"]="services/agent-management"
    ["llm-integration"]="services/llm-integration"
    ["rag-knowledge"]="services/rag-knowledge"
    ["embedding"]="services/embedding"
    ["file-storage"]="services/file-storage"
    ["conversation"]="services/conversation"
    ["whatsapp-integration"]="services/whatsapp-integration"
    ["instagram-integration"]="services/instagram-integration"
    ["messenger-integration"]="services/messenger-integration"
    ["sms-integration"]="services/sms-integration"
    ["telegram-integration"]="services/telegram-integration"
    ["webchat"]="services/webchat"
    ["payment-processing"]="services/payment-processing"
    ["billing"]="services/billing"
    ["usage-tracking"]="services/usage-tracking"
    ["analytics"]="services/analytics"
    ["notification"]="services/notification"
    ["audit-logging"]="services/audit-logging"
    ["monitoring"]="services/monitoring"
    ["orchestration"]="services/orchestration"
)

# Core services that need to be deployed first
CORE_SERVICES=("auth-service" "user-management" "organization")

# Platform integration services
PLATFORM_SERVICES=("whatsapp-integration" "instagram-integration" "messenger-integration" "sms-integration" "telegram-integration" "webchat")

# Infrastructure services
INFRA_SERVICES=("monitoring" "audit-logging" "notification" "orchestration")

echo "🔧 Building and pushing all microservices..."
echo "============================================"

# Build all services
for service in "${!SERVICES[@]}"; do
    build_and_push_service $service ${SERVICES[$service]}
done

echo "🐳 Starting Docker Compose deployment..."
echo "========================================"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration before continuing"
    exit 1
fi

# Deploy with Docker Compose
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🌟 Deploying to PRODUCTION environment..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
else
    echo "🔧 Deploying to DEVELOPMENT environment..."
    docker-compose up -d
fi

echo ""
echo "⏳ Waiting for services to be healthy..."

# Function to check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "🏥 Checking health of $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ $service_name is healthy"
            return 0
        else
            echo "⏳ Attempt $attempt/$max_attempts: $service_name not ready yet..."
            sleep 10
            ((attempt++))
        fi
    done
    
    echo "❌ $service_name failed to become healthy"
    return 1
}

# Check core services first
echo "🔍 Checking core services..."
check_service_health "auth-service" 3001
check_service_health "user-management" 3002
check_service_health "organization" 3003

# Check agent services
echo "🔍 Checking agent services..."
check_service_health "agent-creation" 3004
check_service_health "agent-management" 3005
check_service_health "llm-service" 3006
check_service_health "rag-service" 3007

# Check platform integration services
echo "🔍 Checking platform services..."
check_service_health "whatsapp-service" 3011
check_service_health "webchat-service" 3016

# Check business services
echo "🔍 Checking business services..."
check_service_health "payment-service" 3017
check_service_health "analytics-service" 3020

echo ""
echo "📊 Deployment Summary"
echo "===================="
echo "Environment: $ENVIRONMENT"
echo "Services deployed: ${#SERVICES[@]}"
echo "Gateway URL: http://localhost"
echo "Health check: http://localhost/health"
echo ""

# Display service endpoints
echo "🔗 Service Endpoints:"
echo "===================="
echo "API Gateway: http://localhost"
echo "Auth Service: http://localhost/api/auth/"
echo "Agent Creation: http://localhost/api/agents/create"
echo "Agent Management: http://localhost/api/agents/"
echo "WhatsApp Integration: http://localhost/api/whatsapp/"
echo "Web Chat: http://localhost/api/webchat/"
echo "Payment Processing: http://localhost/api/payments/"
echo "Analytics: http://localhost/api/analytics/"
echo ""

# Display monitoring endpoints
echo "📈 Monitoring & Management:"
echo "=========================="
echo "Consul (Service Discovery): http://localhost:8500"
echo "Prometheus (Metrics): http://localhost:9090"
echo "Grafana (Dashboards): http://localhost:3000"
echo "MinIO (File Storage): http://localhost:9001"
echo ""

echo "🎉 AgentHub 26 Microservices Deployment Complete!"
echo "================================================="
echo ""
echo "Next steps:"
echo "1. Configure your domain and SSL certificates"
echo "2. Set up monitoring alerts in Grafana"
echo "3. Configure backup strategies for databases"
echo "4. Review and update environment variables"
echo "5. Run integration tests"
echo ""
echo "For troubleshooting, check:"
echo "- Docker logs: docker-compose logs [service-name]"
echo "- Service health: curl http://localhost/health"
echo "- Gateway status: docker-compose ps"