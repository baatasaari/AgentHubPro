#!/bin/bash

# AgentHub Individual Service Deployment Script
# Usage: ./deploy-service.sh <service-name> [version] [environment]

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"asia-south1"}
REGISTRY="gcr.io"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if service name is provided
if [ -z "$1" ]; then
    print_error "Service name is required!"
    echo "Usage: $0 <service-name> [version] [environment]"
    echo ""
    echo "Available services:"
    echo "  - api-gateway"
    echo "  - agent-management-service"
    echo "  - conversation-management-service"
    echo "  - rag-query-service"
    echo "  - payment-intent-service"
    echo "  - document-processing-service"
    echo "  - embedding-generation-service"
    echo "  - ... (see docker-compose.microservices.yml for full list)"
    exit 1
fi

SERVICE_NAME=$1
VERSION=${2:-"latest"}
ENVIRONMENT=${3:-"prod"}

# Validate service exists
if [ ! -d "microservices/$SERVICE_NAME" ]; then
    print_error "Service directory 'microservices/$SERVICE_NAME' not found!"
    print_warning "Make sure the service name is correct and the microservice directory exists."
    exit 1
fi

# Build image name
IMAGE_NAME="$REGISTRY/$PROJECT_ID/$SERVICE_NAME:$VERSION"

print_status "Starting deployment of $SERVICE_NAME (version: $VERSION, environment: $ENVIRONMENT)"
print_status "Image: $IMAGE_NAME"
print_status "Region: $REGION"

# Step 1: Build Docker image
print_status "Building Docker image..."
if docker build -t "$IMAGE_NAME" -f "microservices/$SERVICE_NAME/Dockerfile" "microservices/$SERVICE_NAME/"; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Step 2: Push to Google Container Registry
print_status "Pushing image to Container Registry..."
if docker push "$IMAGE_NAME"; then
    print_success "Image pushed successfully"
else
    print_error "Failed to push image"
    exit 1
fi

# Step 3: Get service configuration from Terraform or defaults
get_service_config() {
    case $SERVICE_NAME in
        "api-gateway")
            echo "--port=8000 --cpu=1 --memory=1Gi --min-instances=2 --max-instances=100 --allow-unauthenticated"
            ;;
        "agent-management-service")
            echo "--port=8101 --cpu=1 --memory=1Gi --min-instances=2 --max-instances=50 --no-allow-unauthenticated"
            ;;
        "conversation-management-service")
            echo "--port=8102 --cpu=1 --memory=1Gi --min-instances=2 --max-instances=75 --no-allow-unauthenticated"
            ;;
        "rag-query-service")
            echo "--port=8111 --cpu=1 --memory=1Gi --min-instances=1 --max-instances=50 --no-allow-unauthenticated"
            ;;
        "payment-intent-service")
            echo "--port=8003 --cpu=0.5 --memory=512Mi --min-instances=1 --max-instances=30 --no-allow-unauthenticated"
            ;;
        "document-processing-service")
            echo "--port=8001 --cpu=0.5 --memory=512Mi --min-instances=0 --max-instances=20 --no-allow-unauthenticated"
            ;;
        "embedding-generation-service")
            echo "--port=8002 --cpu=1 --memory=1Gi --min-instances=1 --max-instances=30 --no-allow-unauthenticated"
            ;;
        *)
            echo "--port=8080 --cpu=0.5 --memory=512Mi --min-instances=0 --max-instances=10 --no-allow-unauthenticated"
            ;;
    esac
}

SERVICE_CONFIG=$(get_service_config)

# Step 4: Deploy to Cloud Run
print_status "Deploying to Cloud Run..."
DEPLOY_CMD="gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_NAME \
    --region=$REGION \
    --platform=managed \
    --service-account=agenthub-microservices-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --vpc-connector=agenthub-connector \
    --vpc-egress=private-ranges-only \
    --execution-environment=gen2 \
    --set-env-vars=ENVIRONMENT=$ENVIRONMENT,GCP_PROJECT=$PROJECT_ID \
    $SERVICE_CONFIG"

print_status "Executing: $DEPLOY_CMD"

if eval $DEPLOY_CMD; then
    print_success "Service deployed successfully!"
else
    print_error "Failed to deploy service"
    exit 1
fi

# Step 5: Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

print_success "Deployment completed!"
print_status "Service URL: $SERVICE_URL"

# Step 6: Health check
print_status "Performing health check..."
if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    print_success "Health check passed!"
else
    print_warning "Health check failed or endpoint not available"
    print_warning "This is normal if the service doesn't have a /health endpoint"
fi

# Step 7: Update service discovery (if applicable)
if [ "$SERVICE_NAME" != "api-gateway" ]; then
    print_status "Updating service discovery..."
    # Here you would typically update your service registry or configuration
    # For now, we'll just print the information
    print_status "Service $SERVICE_NAME is available at: $SERVICE_URL"
    print_status "Add this URL to your service discovery configuration"
fi

print_success "✅ $SERVICE_NAME deployment completed successfully!"
print_status "Version: $VERSION"
print_status "Environment: $ENVIRONMENT"
print_status "URL: $SERVICE_URL"

# Optional: Show recent logs
read -p "Do you want to view recent logs? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Showing recent logs..."
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" --limit=20 --format="table(timestamp,severity,textPayload)"
fi

print_success "Deployment script completed!"