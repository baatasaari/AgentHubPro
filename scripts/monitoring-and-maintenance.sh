#!/bin/bash

# AgentHub Monitoring and Maintenance Script
# Comprehensive monitoring, maintenance, and operational tasks for Cloud Run microservices

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
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_debug() { echo -e "${PURPLE}[DEBUG]${NC} $1"; }

# All microservices
SERVICES=(
    "api-gateway"
    "agent-management-service"
    "conversation-management-service"
    "rag-query-service"
    "payment-intent-service"
    "document-processing-service"
    "embedding-generation-service"
    "similarity-search-service"
    "knowledge-base-service"
    "faq-management-service"
    "payment-link-service"
    "metrics-collection-service"
    "billing-calculation-service"
    "slot-management-service"
    "booking-management-service"
    "calendar-provider-service"
    "notification-service"
    "widget-generation-service"
    "usage-analytics-service"
    "analytics-calculation-service"
    "insights-generation-service"
    "data-storage-service"
    "system-health-service"
    "configuration-service"
    "response-generation-service"
    "service-discovery-service"
    "authentication-service"
    "database-operations-service"
    "logging-service"
    "industry-configuration-service"
    "conversation-processing-service"
)

# Get access token for authenticated requests
get_access_token() {
    gcloud auth print-access-token
}

# Check service health
check_service_health() {
    local service=$1
    local url=$(gcloud run services describe "$service" --region="$REGION" --format="value(status.url)" 2>/dev/null)
    
    if [ -z "$url" ]; then
        echo "NOT_DEPLOYED"
        return 1
    fi
    
    local health_url="$url/health"
    local access_token=""
    
    # Get access token for internal services
    if [ "$service" != "api-gateway" ]; then
        access_token=$(get_access_token)
    fi
    
    local start_time=$(date +%s%3N)
    local response_code
    
    if [ -n "$access_token" ]; then
        response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $access_token" \
            --connect-timeout 5 \
            --max-time 10 \
            "$health_url")
    else
        response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            --connect-timeout 5 \
            --max-time 10 \
            "$health_url")
    fi
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response_code" = "200" ]; then
        echo "HEALTHY:$response_time"
        return 0
    else
        echo "UNHEALTHY:$response_code:$response_time"
        return 1
    fi
}

# Monitor all services
monitor_services() {
    log_info "Monitoring all AgentHub microservices..."
    
    local healthy_count=0
    local total_count=${#SERVICES[@]}
    local critical_services=("api-gateway" "agent-management-service" "conversation-management-service" "rag-query-service" "authentication-service")
    local critical_down=0
    
    echo ""
    printf "%-35s %-15s %-15s %s\n" "Service" "Status" "Response Time" "URL"
    echo "$(printf '%.0s-' {1..100})"
    
    for service in "${SERVICES[@]}"; do
        local status=$(check_service_health "$service")
        local url=$(gcloud run services describe "$service" --region="$REGION" --format="value(status.url)" 2>/dev/null || echo "N/A")
        
        if [[ $status == HEALTHY:* ]]; then
            local response_time=${status#HEALTHY:}
            printf "%-35s ${GREEN}%-15s${NC} %-15s %s\n" "$service" "HEALTHY" "${response_time}ms" "$url"
            healthy_count=$((healthy_count + 1))
        elif [[ $status == UNHEALTHY:* ]]; then
            local details=${status#UNHEALTHY:}
            local code=${details%%:*}
            local response_time=${details#*:}
            printf "%-35s ${RED}%-15s${NC} %-15s %s\n" "$service" "UNHEALTHY($code)" "${response_time}ms" "$url"
            
            # Check if critical service
            if [[ " ${critical_services[@]} " =~ " ${service} " ]]; then
                critical_down=$((critical_down + 1))
            fi
        else
            printf "%-35s ${YELLOW}%-15s${NC} %-15s %s\n" "$service" "NOT_DEPLOYED" "N/A" "N/A"
        fi
    done
    
    echo ""
    local health_percentage=$((healthy_count * 100 / total_count))
    
    if [ $health_percentage -ge 90 ]; then
        log_success "System Health: $health_percentage% ($healthy_count/$total_count services healthy)"
    elif [ $health_percentage -ge 70 ]; then
        log_warning "System Health: $health_percentage% ($healthy_count/$total_count services healthy)"
    else
        log_error "System Health: $health_percentage% ($healthy_count/$total_count services healthy)"
    fi
    
    if [ $critical_down -gt 0 ]; then
        log_error "CRITICAL: $critical_down critical services are down!"
    fi
    
    echo ""
}

# Get service logs
get_service_logs() {
    local service=$1
    local lines=${2:-50}
    
    log_info "Getting last $lines log entries for $service..."
    
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$service" \
        --limit="$lines" \
        --format="table(timestamp,severity,textPayload)" \
        --sort-by="timestamp"
}

# Get service metrics
get_service_metrics() {
    local service=$1
    local hours=${2:-1}
    
    log_info "Getting metrics for $service (last $hours hours)..."
    
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local start_time=$(date -u -d "$hours hours ago" +%Y-%m-%dT%H:%M:%SZ)
    
    echo "Request Count:"
    gcloud monitoring timeseries list \
        --filter="metric.type=\"run.googleapis.com/request_count\" AND resource.labels.service_name=\"$service\"" \
        --interval-start-time="$start_time" \
        --interval-end-time="$end_time" \
        --format="table(points[].value.int64Value)"
    
    echo ""
    echo "Request Latencies:"
    gcloud monitoring timeseries list \
        --filter="metric.type=\"run.googleapis.com/request_latencies\" AND resource.labels.service_name=\"$service\"" \
        --interval-start-time="$start_time" \
        --interval-end-time="$end_time" \
        --format="table(points[].value.distributionValue.mean)"
}

# Scale service
scale_service() {
    local service=$1
    local min_instances=$2
    local max_instances=$3
    
    log_info "Scaling $service to min=$min_instances, max=$max_instances..."
    
    gcloud run services update "$service" \
        --region="$REGION" \
        --min-instances="$min_instances" \
        --max-instances="$max_instances"
    
    log_success "$service scaled successfully"
}

# Update service configuration
update_service_config() {
    local service=$1
    local cpu=$2
    local memory=$3
    
    log_info "Updating $service configuration: CPU=$cpu, Memory=$memory..."
    
    gcloud run services update "$service" \
        --region="$REGION" \
        --cpu="$cpu" \
        --memory="$memory"
    
    log_success "$service configuration updated"
}

# Deploy new version of service
deploy_service_version() {
    local service=$1
    local version=$2
    
    log_info "Deploying $service version $version..."
    
    local image_name="gcr.io/$PROJECT_ID/$service:$version"
    
    gcloud run services update "$service" \
        --region="$REGION" \
        --image="$image_name"
    
    log_success "$service version $version deployed"
    
    # Health check after deployment
    sleep 30
    local health_status=$(check_service_health "$service")
    if [[ $health_status == HEALTHY:* ]]; then
        log_success "$service is healthy after deployment"
    else
        log_error "$service health check failed after deployment"
    fi
}

# Rollback service to previous version
rollback_service() {
    local service=$1
    
    log_info "Rolling back $service to previous version..."
    
    # Get current and previous revisions
    local revisions=$(gcloud run revisions list \
        --service="$service" \
        --region="$REGION" \
        --format="value(metadata.name)" \
        --limit=2)
    
    local current_revision=$(echo "$revisions" | head -n1)
    local previous_revision=$(echo "$revisions" | tail -n1)
    
    if [ "$current_revision" = "$previous_revision" ]; then
        log_error "No previous revision found for $service"
        return 1
    fi
    
    # Route all traffic to previous revision
    gcloud run services update-traffic "$service" \
        --region="$REGION" \
        --to-revisions="$previous_revision=100"
    
    log_success "$service rolled back to revision $previous_revision"
}

# Database maintenance
database_maintenance() {
    log_info "Performing database maintenance..."
    
    # Check database status
    local db_status=$(gcloud sql instances describe "$DATABASE_INSTANCE" \
        --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$db_status" = "RUNNABLE" ]; then
        log_success "Database $DATABASE_INSTANCE is running"
        
        # Get database metrics
        log_info "Database connections:"
        gcloud monitoring timeseries list \
            --filter="metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\"" \
            --interval-start-time="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
            --interval-end-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --format="table(points[].value.int64Value)" \
            --limit=10
    else
        log_error "Database $DATABASE_INSTANCE status: $db_status"
    fi
}

# Redis maintenance
redis_maintenance() {
    log_info "Performing Redis maintenance..."
    
    local redis_status=$(gcloud redis instances describe "$REDIS_INSTANCE" \
        --region="$REGION" \
        --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$redis_status" = "READY" ]; then
        log_success "Redis $REDIS_INSTANCE is ready"
        
        # Get Redis metrics
        log_info "Redis memory usage:"
        gcloud monitoring timeseries list \
            --filter="metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\"" \
            --interval-start-time="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
            --interval-end-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --format="table(points[].value.doubleValue)" \
            --limit=10
    else
        log_error "Redis $REDIS_INSTANCE status: $redis_status"
    fi
}

# Generate system report
generate_system_report() {
    local report_file="system-report-$(date +%Y%m%d-%H%M%S).json"
    
    log_info "Generating comprehensive system report..."
    
    local healthy_services=()
    local unhealthy_services=()
    local total_response_time=0
    local healthy_count=0
    
    for service in "${SERVICES[@]}"; do
        local status=$(check_service_health "$service")
        if [[ $status == HEALTHY:* ]]; then
            healthy_services+=("$service")
            local response_time=${status#HEALTHY:}
            total_response_time=$((total_response_time + response_time))
            healthy_count=$((healthy_count + 1))
        else
            unhealthy_services+=("$service")
        fi
    done
    
    local avg_response_time=0
    if [ $healthy_count -gt 0 ]; then
        avg_response_time=$((total_response_time / healthy_count))
    fi
    
    local health_percentage=$((healthy_count * 100 / ${#SERVICES[@]}))
    
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_id": "$PROJECT_ID",
  "region": "$REGION",
  "environment": "$ENVIRONMENT",
  "system_health": {
    "overall_percentage": $health_percentage,
    "total_services": ${#SERVICES[@]},
    "healthy_services": $healthy_count,
    "unhealthy_services": $((${#SERVICES[@]} - healthy_count)),
    "average_response_time_ms": $avg_response_time
  },
  "healthy_services": [$(printf '"%s",' "${healthy_services[@]}" | sed 's/,$//')]$([ ${#healthy_services[@]} -gt 0 ] || echo ''),
  "unhealthy_services": [$(printf '"%s",' "${unhealthy_services[@]}" | sed 's/,$//')]$([ ${#unhealthy_services[@]} -gt 0 ] || echo ''),
  "infrastructure": {
    "database_status": "$(gcloud sql instances describe "$DATABASE_INSTANCE" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")",
    "redis_status": "$(gcloud redis instances describe "$REDIS_INSTANCE" --region="$REGION" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")"
  }
}
EOF
    
    log_success "System report generated: $report_file"
    
    # Display summary
    echo ""
    log_info "=== SYSTEM REPORT SUMMARY ==="
    echo "Overall Health: $health_percentage%"
    echo "Healthy Services: $healthy_count/${#SERVICES[@]}"
    echo "Average Response Time: ${avg_response_time}ms"
    echo "Report saved to: $report_file"
}

# Show usage
show_usage() {
    echo "AgentHub Monitoring and Maintenance Tool"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  monitor                     Monitor all services health"
    echo "  logs <service> [lines]      Get service logs (default: 50 lines)"
    echo "  metrics <service> [hours]   Get service metrics (default: 1 hour)"
    echo "  scale <service> <min> <max> Scale service instances"
    echo "  config <service> <cpu> <mem> Update service configuration"
    echo "  deploy <service> <version>  Deploy new service version"
    echo "  rollback <service>          Rollback service to previous version"
    echo "  database                    Database maintenance"
    echo "  redis                       Redis maintenance"
    echo "  report                      Generate comprehensive system report"
    echo "  continuous                  Start continuous monitoring (every 60s)"
    echo ""
    echo "Examples:"
    echo "  $0 monitor"
    echo "  $0 logs api-gateway 100"
    echo "  $0 scale agent-management-service 2 10"
    echo "  $0 deploy rag-query-service v1.2.3"
    echo "  $0 rollback payment-intent-service"
}

# Continuous monitoring
continuous_monitoring() {
    log_info "Starting continuous monitoring (press Ctrl+C to stop)..."
    
    while true; do
        clear
        echo "AgentHub Continuous Monitoring - $(date)"
        echo "$(printf '%.0s=' {1..80})"
        monitor_services
        echo ""
        echo "Next check in 60 seconds... (Press Ctrl+C to stop)"
        sleep 60
    done
}

# Main script logic
case "${1:-monitor}" in
    "monitor")
        monitor_services
        ;;
    "logs")
        if [ -z "$2" ]; then
            log_error "Service name required"
            show_usage
            exit 1
        fi
        get_service_logs "$2" "$3"
        ;;
    "metrics")
        if [ -z "$2" ]; then
            log_error "Service name required"
            show_usage
            exit 1
        fi
        get_service_metrics "$2" "$3"
        ;;
    "scale")
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
            log_error "Usage: $0 scale <service> <min_instances> <max_instances>"
            exit 1
        fi
        scale_service "$2" "$3" "$4"
        ;;
    "config")
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
            log_error "Usage: $0 config <service> <cpu> <memory>"
            exit 1
        fi
        update_service_config "$2" "$3" "$4"
        ;;
    "deploy")
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 deploy <service> <version>"
            exit 1
        fi
        deploy_service_version "$2" "$3"
        ;;
    "rollback")
        if [ -z "$2" ]; then
            log_error "Usage: $0 rollback <service>"
            exit 1
        fi
        rollback_service "$2"
        ;;
    "database")
        database_maintenance
        ;;
    "redis")
        redis_maintenance
        ;;
    "report")
        generate_system_report
        ;;
    "continuous")
        continuous_monitoring
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac