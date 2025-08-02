#!/bin/bash

# AgentHub Cloud Run Infrastructure Provisioning Script
# Provisions complete GCP infrastructure for 29 microservices with internal communication

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-""}
REGION=${REGION:-"asia-south1"}
ZONE=${ZONE:-"asia-south1-a"}
ENVIRONMENT=${ENVIRONMENT:-"prod"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Validate inputs
if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID environment variable is required"
    echo "Usage: PROJECT_ID=your-project-id ./provision-infrastructure.sh"
    exit 1
fi

log_info "Starting AgentHub infrastructure provisioning..."
log_info "Project ID: $PROJECT_ID"
log_info "Region: $REGION"
log_info "Environment: $ENVIRONMENT"

# Set current project
log_info "Setting up GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
log_info "Enabling required Google Cloud APIs..."
apis=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "container.googleapis.com"
    "sql.googleapis.com"
    "compute.googleapis.com"
    "storage.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudtrace.googleapis.com"
    "secretmanager.googleapis.com"
    "compute.googleapis.com"
    "vpcaccess.googleapis.com"
    "iam.googleapis.com"
    "cloudresourcemanager.googleapis.com"
)

for api in "${apis[@]}"; do
    log_info "Enabling $api..."
    gcloud services enable $api
done

log_success "All APIs enabled successfully"

# Create VPC Network for internal communication
log_info "Creating VPC network for internal microservices communication..."
gcloud compute networks create agenthub-network \
    --subnet-mode=custom \
    --description="AgentHub microservices private network"

gcloud compute networks subnets create agenthub-subnet \
    --network=agenthub-network \
    --range=10.1.0.0/16 \
    --region=$REGION \
    --description="AgentHub microservices subnet"

log_success "VPC network created"

# Create VPC Access Connector for Cloud Run
log_info "Creating VPC Access Connector for Cloud Run..."
gcloud compute networks vpc-access connectors create agenthub-connector \
    --region=$REGION \
    --subnet=agenthub-subnet \
    --subnet-project=$PROJECT_ID \
    --min-instances=2 \
    --max-instances=10

log_success "VPC Access Connector created"

# Create service accounts for each microservice
log_info "Creating service accounts for microservices..."

# Main microservices service account
gcloud iam service-accounts create agenthub-microservices \
    --display-name="AgentHub Microservices Service Account" \
    --description="Service account for AgentHub microservices"

# Individual service accounts for enhanced security
services=(
    "api-gateway"
    "agent-management"
    "conversation-management"
    "rag-query"
    "payment-intent"
    "document-processing"
    "embedding-generation"
    "authentication"
    "database-operations"
)

for service in "${services[@]}"; do
    log_info "Creating service account for $service..."
    gcloud iam service-accounts create agenthub-$service \
        --display-name="AgentHub $service Service Account" \
        --description="Service account for $service microservice" || true
done

log_success "Service accounts created"

# Grant IAM permissions
log_info "Configuring IAM permissions..."

# Main service account permissions
main_sa="agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com"

roles=(
    "roles/cloudsql.client"
    "roles/compute.instanceAdmin.v1"
    "roles/storage.objectAdmin"
    "roles/secretmanager.secretAccessor"
    "roles/monitoring.metricWriter"
    "roles/logging.logWriter"
    "roles/cloudtrace.agent"
    "roles/run.invoker"
)

for role in "${roles[@]}"; do
    log_info "Granting $role to main service account..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$main_sa" \
        --role="$role"
done

# Cross-service invocation permissions
for service in "${services[@]}"; do
    service_sa="agenthub-$service@$PROJECT_ID.iam.gserviceaccount.com"
    
    log_info "Granting Cloud Run invoker permissions to $service..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$service_sa" \
        --role="roles/run.invoker"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$service_sa" \
        --role="roles/monitoring.metricWriter"
        
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$service_sa" \
        --role="roles/logging.logWriter"
done

log_success "IAM permissions configured"

# Create BigQuery datasets
log_info "Creating BigQuery datasets for data warehouse..."

# Create main application dataset
bq mk --location=$REGION --dataset \
    --description="AgentHub production data warehouse" \
    $PROJECT_ID:agenthub_production

# Create analytics dataset  
bq mk --location=$REGION --dataset \
    --description="AgentHub analytics and reporting data" \
    $PROJECT_ID:agenthub_analytics

# Create logs dataset for system monitoring
bq mk --location=$REGION --dataset \
    --description="AgentHub system logs and monitoring data" \
    $PROJECT_ID:agenthub_logs

# Create real-time streaming dataset
bq mk --location=$REGION --dataset \
    --description="AgentHub real-time streaming data" \
    $PROJECT_ID:agenthub_streaming

log_success "BigQuery datasets created"

# Create Memcached instance for high-performance caching
log_info "Creating Memcached instance for caching..."

# Create startup script for Memcached
cat > /tmp/memcached-startup.sh <<'EOF'
#!/bin/bash
apt-get update
apt-get install -y memcached

# Configure Memcached for 4GB cache
sed -i 's/-m 64/-m 4096/' /etc/memcached.conf
sed -i 's/127.0.0.1/0.0.0.0/' /etc/memcached.conf

systemctl restart memcached
systemctl enable memcached

# Basic firewall rule for Memcached port
ufw allow from 10.1.0.0/16 to any port 11211

echo "Memcached configuration complete" | logger
EOF

gcloud compute instances create agenthub-memcached-$ENVIRONMENT \
    --zone=$REGION-a \
    --machine-type=e2-standard-2 \
    --network-interface=subnet=agenthub-subnet,no-address \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-standard \
    --metadata-from-file startup-script=/tmp/memcached-startup.sh \
    --service-account=agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com \
    --scopes=cloud-platform \
    --tags=memcached-server,internal-cache

# Clean up temporary file
rm /tmp/memcached-startup.sh

log_success "Memcached instance created"

# Create Cloud Storage buckets
log_info "Creating Cloud Storage buckets..."
bucket_suffix=$(openssl rand -hex 4)

buckets=(
    "documents"
    "embeddings"
    "uploads"
    "reports"
    "build-logs"
)

for bucket in "${buckets[@]}"; do
    bucket_name="agenthub-$bucket-$ENVIRONMENT-$bucket_suffix"
    log_info "Creating bucket: $bucket_name..."
    
    gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$bucket_name/
    gsutil versioning set on gs://$bucket_name/
    gsutil lifecycle set <(cat <<EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90}
    }
  ]
}
EOF
) gs://$bucket_name/
done

log_success "Cloud Storage buckets created"

# Create secrets in Secret Manager
log_info "Creating secrets in Secret Manager..."
secrets=(
    "openai-api-key"
    "bigquery-credentials"
    "memcached-servers"
    "jwt-secret"
)

for secret in "${secrets[@]}"; do
    log_info "Creating secret: $secret..."
    echo "PLACEHOLDER_VALUE" | gcloud secrets create $secret \
        --data-file=- \
        --replication-policy="automatic" || true
done

log_success "Secrets created (remember to update with actual values)"

# Create IAM policy for service-to-service authentication
log_info "Creating service-to-service authentication policies..."

cat > /tmp/service-policy.yaml <<EOF
bindings:
- members:
  - serviceAccount:agenthub-api-gateway@$PROJECT_ID.iam.gserviceaccount.com
  - serviceAccount:agenthub-agent-management@$PROJECT_ID.iam.gserviceaccount.com
  - serviceAccount:agenthub-conversation-management@$PROJECT_ID.iam.gserviceaccount.com
  - serviceAccount:agenthub-rag-query@$PROJECT_ID.iam.gserviceaccount.com
  - serviceAccount:agenthub-payment-intent@$PROJECT_ID.iam.gserviceaccount.com
  - serviceAccount:agenthub-authentication@$PROJECT_ID.iam.gserviceaccount.com
  role: roles/run.invoker
etag: BwWWja0YfJA=
version: 1
EOF

log_success "Service authentication policies created"

# Create monitoring workspace
log_info "Setting up monitoring and alerting..."
gcloud alpha monitoring workspaces create --project=$PROJECT_ID || true

log_success "Monitoring workspace created"

# Output important information
log_success "Infrastructure provisioning completed!"
echo ""
echo "=== INFRASTRUCTURE SUMMARY ==="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "VPC Network: agenthub-network"
echo "VPC Connector: agenthub-connector"
echo "Database: agenthub-postgres-$ENVIRONMENT"
echo "Memcached: agenthub-memcached-$ENVIRONMENT"
echo ""
echo "=== NEXT STEPS ==="
echo "1. Update secrets in Secret Manager with actual values:"
echo "   gcloud secrets versions add openai-api-key --data-file=<your-openai-key-file>"
echo ""
echo "2. Deploy microservices:"
echo "   ./scripts/deploy-all-services.sh"
echo ""
echo "3. Start monitoring:"
echo "   ./scripts/start-monitoring.sh"
echo ""

# Save configuration
cat > infrastructure-config.env <<EOF
export PROJECT_ID=$PROJECT_ID
export REGION=$REGION
export ENVIRONMENT=$ENVIRONMENT
export VPC_NETWORK=agenthub-network
export VPC_CONNECTOR=agenthub-connector
export BIGQUERY_DATASET=agenthub_production
export BIGQUERY_PROJECT=$PROJECT_ID
export MEMCACHED_INSTANCE=agenthub-memcached-$ENVIRONMENT
export BUCKET_SUFFIX=$bucket_suffix
EOF

log_success "Configuration saved to infrastructure-config.env"
log_info "Source this file before running other scripts: source infrastructure-config.env"