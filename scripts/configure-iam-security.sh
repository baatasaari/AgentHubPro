#!/bin/bash

# AgentHub IAM Security Configuration Script
# Configures service accounts, IAM policies, and security for internal microservices communication

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

# Service to service account mapping
declare -A SERVICE_ACCOUNTS
SERVICE_ACCOUNTS=(
    ["api-gateway"]="agenthub-api-gateway"
    ["agent-management-service"]="agenthub-agent-management"
    ["conversation-management-service"]="agenthub-conversation-management"
    ["rag-query-service"]="agenthub-rag-query"
    ["payment-intent-service"]="agenthub-payment-intent"
    ["document-processing-service"]="agenthub-document-processing"
    ["embedding-generation-service"]="agenthub-embedding-generation"
    ["authentication-service"]="agenthub-authentication"
    ["database-operations-service"]="agenthub-database-operations"
    # All other services use the main microservices account
)

# Critical services that need enhanced permissions
CRITICAL_SERVICES=(
    "api-gateway"
    "agent-management-service"
    "conversation-management-service"
    "rag-query-service"
    "authentication-service"
    "database-operations-service"
)

# Configure service-to-service authentication
configure_service_authentication() {
    log_info "Configuring service-to-service authentication..."
    
    # For each deployed service, set up IAM policies
    for service in "${!SERVICE_ACCOUNTS[@]}"; do
        local service_account="${SERVICE_ACCOUNTS[$service]}"
        
        log_info "Configuring authentication for $service (SA: $service_account)..."
        
        # Check if service exists
        if ! gcloud run services describe "$service" --region="$REGION" >/dev/null 2>&1; then
            log_warning "Service $service not deployed, skipping..."
            continue
        fi
        
        # Configure the service to use its specific service account
        gcloud run services update "$service" \
            --region="$REGION" \
            --service-account="$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --quiet
        
        # Set up IAM policy for internal access only (except API Gateway)
        if [ "$service" != "api-gateway" ]; then
            log_info "Setting internal-only access for $service..."
            
            # Remove public access
            gcloud run services remove-iam-policy-binding "$service" \
                --region="$REGION" \
                --member="allUsers" \
                --role="roles/run.invoker" \
                --quiet || true
            
            # Allow specific service accounts to invoke this service
            for invoker_service in "${!SERVICE_ACCOUNTS[@]}"; do
                if [ "$invoker_service" != "$service" ]; then
                    local invoker_sa="${SERVICE_ACCOUNTS[$invoker_service]}"
                    
                    gcloud run services add-iam-policy-binding "$service" \
                        --region="$REGION" \
                        --member="serviceAccount:$invoker_sa@$PROJECT_ID.iam.gserviceaccount.com" \
                        --role="roles/run.invoker" \
                        --quiet
                fi
            done
            
            # Also allow the main microservices service account
            gcloud run services add-iam-policy-binding "$service" \
                --region="$REGION" \
                --member="serviceAccount:agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com" \
                --role="roles/run.invoker" \
                --quiet
        fi
        
        log_success "$service authentication configured"
    done
}

# Configure database access permissions
configure_database_permissions() {
    log_info "Configuring database access permissions..."
    
    # Services that need database access
    DATABASE_SERVICES=(
        "agent-management-service"
        "conversation-management-service" 
        "database-operations-service"
        "authentication-service"
        "analytics-calculation-service"
        "data-storage-service"
    )
    
    for service in "${DATABASE_SERVICES[@]}"; do
        local service_account="${SERVICE_ACCOUNTS[$service]:-agenthub-microservices}"
        
        log_info "Granting database access to $service_account..."
        
        # Grant Cloud SQL client role
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/cloudsql.client" \
            --quiet
        
        # Grant Cloud SQL instance user role
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/cloudsql.instanceUser" \
            --quiet
    done
    
    log_success "Database permissions configured"
}

# Configure storage permissions
configure_storage_permissions() {
    log_info "Configuring Cloud Storage permissions..."
    
    # Services that need storage access
    STORAGE_SERVICES=(
        "document-processing-service"
        "embedding-generation-service"
        "data-storage-service"
        "api-gateway"
    )
    
    for service in "${STORAGE_SERVICES[@]}"; do
        local service_account="${SERVICE_ACCOUNTS[$service]:-agenthub-microservices}"
        
        log_info "Granting storage access to $service_account..."
        
        # Grant storage object admin role
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/storage.objectAdmin" \
            --quiet
        
        # Grant storage admin role for bucket management
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/storage.admin" \
            --quiet
    done
    
    log_success "Storage permissions configured"
}

# Configure secret manager access
configure_secret_permissions() {
    log_info "Configuring Secret Manager permissions..."
    
    # Services that need secret access
    SECRET_SERVICES=(
        "embedding-generation-service"
        "response-generation-service"
        "authentication-service"
        "payment-intent-service"
        "api-gateway"
    )
    
    for service in "${SECRET_SERVICES[@]}"; do
        local service_account="${SERVICE_ACCOUNTS[$service]:-agenthub-microservices}"
        
        log_info "Granting secret access to $service_account..."
        
        # Grant secret accessor role
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet
    done
    
    log_success "Secret Manager permissions configured"
}

# Configure monitoring and logging permissions
configure_observability_permissions() {
    log_info "Configuring monitoring and logging permissions..."
    
    # All services need monitoring and logging
    for service_account in "${SERVICE_ACCOUNTS[@]}"; do
        log_info "Granting observability permissions to $service_account..."
        
        # Monitoring metric writer
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/monitoring.metricWriter" \
            --quiet
        
        # Cloud Trace agent
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/cloudtrace.agent" \
            --quiet
        
        # Logging write access
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/logging.logWriter" \
            --quiet
    done
    
    # Also configure main microservices account
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/monitoring.metricWriter" \
        --quiet
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudtrace.agent" \
        --quiet
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/logging.logWriter" \
        --quiet
    
    log_success "Observability permissions configured"
}

# Configure VPC and networking permissions
configure_network_permissions() {
    log_info "Configuring network permissions..."
    
    # Services that need network access
    for service_account in "${SERVICE_ACCOUNTS[@]}"; do
        # Grant compute network user for VPC access
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/compute.networkUser" \
            --quiet
    done
    
    # Main microservices account
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:agenthub-microservices@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/compute.networkUser" \
        --quiet
    
    log_success "Network permissions configured"
}

# Create custom IAM roles for fine-grained access
create_custom_roles() {
    log_info "Creating custom IAM roles..."
    
    # Microservice Communication Role
    cat > /tmp/microservice-communicator-role.yaml <<EOF
title: "AgentHub Microservice Communicator"
description: "Custom role for inter-microservice communication"
stage: "GA"
includedPermissions:
- run.services.get
- run.services.invoke
- monitoring.timeSeries.create
- logging.logEntries.create
EOF
    
    gcloud iam roles create agentHubMicroserviceCommunicator \
        --project="$PROJECT_ID" \
        --file=/tmp/microservice-communicator-role.yaml \
        --quiet || log_warning "Custom role already exists"
    
    # Data Access Role
    cat > /tmp/data-access-role.yaml <<EOF
title: "AgentHub Data Access"
description: "Custom role for data access services"
stage: "GA"
includedPermissions:
- cloudsql.instances.connect
- storage.objects.get
- storage.objects.create
- storage.objects.delete
- secretmanager.versions.access
EOF
    
    gcloud iam roles create agentHubDataAccess \
        --project="$PROJECT_ID" \
        --file=/tmp/data-access-role.yaml \
        --quiet || log_warning "Custom role already exists"
    
    log_success "Custom IAM roles created"
}

# Assign custom roles to appropriate services
assign_custom_roles() {
    log_info "Assigning custom roles to services..."
    
    # Assign microservice communicator role to all services
    for service_account in "${SERVICE_ACCOUNTS[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="projects/$PROJECT_ID/roles/agentHubMicroserviceCommunicator" \
            --quiet
    done
    
    # Assign data access role to data services
    DATA_SERVICES=(
        "agenthub-agent-management"
        "agenthub-conversation-management"
        "agenthub-database-operations"
        "agenthub-document-processing"
        "agenthub-embedding-generation"
    )
    
    for service_account in "${DATA_SERVICES[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="projects/$PROJECT_ID/roles/agentHubDataAccess" \
            --quiet
    done
    
    log_success "Custom roles assigned"
}

# Generate authentication tokens for testing
generate_test_tokens() {
    log_info "Generating test authentication tokens..."
    
    # Create temporary key files for each service account
    mkdir -p "/tmp/service-keys"
    
    for service_account in "${SERVICE_ACCOUNTS[@]}"; do
        local key_file="/tmp/service-keys/$service_account.json"
        
        gcloud iam service-accounts keys create "$key_file" \
            --iam-account="$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            --quiet
        
        log_info "Service account key created: $key_file"
    done
    
    log_warning "Service account keys are stored in /tmp/service-keys/"
    log_warning "These are for testing only - delete them after use!"
    log_warning "In production, use workload identity or metadata server for authentication"
}

# Test service-to-service authentication
test_authentication() {
    log_info "Testing service-to-service authentication..."
    
    # Test API Gateway to Agent Management
    local api_gateway_url=$(gcloud run services describe "api-gateway" --region="$REGION" --format="value(status.url)" 2>/dev/null)
    local agent_mgmt_url=$(gcloud run services describe "agent-management-service" --region="$REGION" --format="value(status.url)" 2>/dev/null)
    
    if [ -n "$api_gateway_url" ] && [ -n "$agent_mgmt_url" ]; then
        log_info "Testing API Gateway access (should work - public)..."
        if curl -f -s "$api_gateway_url/health" >/dev/null; then
            log_success "✓ API Gateway public access works"
        else
            log_error "✗ API Gateway public access failed"
        fi
        
        log_info "Testing Agent Management direct access (should fail - internal only)..."
        if curl -f -s "$agent_mgmt_url/health" >/dev/null 2>&1; then
            log_error "✗ Agent Management public access works (SECURITY ISSUE!)"
        else
            log_success "✓ Agent Management correctly blocks public access"
        fi
        
        log_info "Testing Agent Management authenticated access..."
        local access_token=$(gcloud auth print-access-token)
        if curl -f -s -H "Authorization: Bearer $access_token" "$agent_mgmt_url/health" >/dev/null; then
            log_success "✓ Agent Management authenticated access works"
        else
            log_warning "✗ Agent Management authenticated access failed (may need time to propagate)"
        fi
    else
        log_warning "Services not deployed yet, skipping authentication tests"
    fi
}

# Audit IAM permissions
audit_permissions() {
    log_info "Auditing IAM permissions..."
    
    local audit_file="iam-audit-$(date +%Y%m%d-%H%M%S).json"
    
    echo "{" > "$audit_file"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$audit_file"
    echo "  \"project_id\": \"$PROJECT_ID\"," >> "$audit_file"
    echo "  \"service_accounts\": {" >> "$audit_file"
    
    local first_sa=true
    for service_account in "${SERVICE_ACCOUNTS[@]}" "agenthub-microservices"; do
        if [ "$first_sa" = true ]; then
            first_sa=false
        else
            echo "," >> "$audit_file"
        fi
        
        echo "    \"$service_account\": {" >> "$audit_file"
        echo "      \"email\": \"$service_account@$PROJECT_ID.iam.gserviceaccount.com\"," >> "$audit_file"
        echo "      \"roles\": [" >> "$audit_file"
        
        # Get IAM policy for the service account
        local roles=$(gcloud projects get-iam-policy "$PROJECT_ID" \
            --format="json" \
            --filter="bindings.members:serviceAccount:$service_account@$PROJECT_ID.iam.gserviceaccount.com" \
            | jq -r '.bindings[].role' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        
        if [ -n "$roles" ]; then
            echo "        \"$roles\"" >> "$audit_file"
        fi
        
        echo "      ]" >> "$audit_file"
        echo "    }" >> "$audit_file"
    done
    
    echo "  }" >> "$audit_file"
    echo "}" >> "$audit_file"
    
    log_success "IAM audit completed: $audit_file"
}

# Main execution
main() {
    log_info "Starting IAM security configuration for AgentHub microservices..."
    log_info "Project: $PROJECT_ID"
    log_info "Region: $REGION"
    
    # Configure all aspects of IAM security
    configure_service_authentication
    configure_database_permissions
    configure_storage_permissions
    configure_secret_permissions
    configure_observability_permissions
    configure_network_permissions
    create_custom_roles
    assign_custom_roles
    
    # Test the configuration
    test_authentication
    
    # Generate audit report
    audit_permissions
    
    log_success "IAM security configuration completed!"
    
    echo ""
    echo "=== SECURITY CONFIGURATION SUMMARY ==="
    echo "✓ Service-to-service authentication configured"
    echo "✓ Internal-only access enforced (except API Gateway)"
    echo "✓ Database access restricted to authorized services"
    echo "✓ Storage permissions configured"
    echo "✓ Secret Manager access controlled"
    echo "✓ Monitoring and logging permissions set"
    echo "✓ Custom IAM roles created and assigned"
    echo ""
    echo "Next steps:"
    echo "1. Test your services with the new authentication"
    echo "2. Monitor logs for any authentication issues"
    echo "3. Review the IAM audit report"
    echo "4. Delete test service account keys from /tmp/service-keys/"
}

# Execute main function
main "$@"