#!/bin/bash

# Health check script for all microservices
echo "🏥 MICROSERVICES HEALTH CHECK"
echo "================================================================"
echo ""

# Define all services and their ports
declare -A SERVICES=(
    ["document-processing"]="8001"
    ["embedding-generation"]="8002" 
    ["similarity-search"]="8010"
    ["payment-intent"]="8003"
    ["slot-management"]="8004"
    ["notification"]="8005"
    ["payment-link"]="8015"
    ["metrics-collection"]="8023"
    ["configuration"]="8030"
    ["booking-management"]="8021"
    ["knowledge-base"]="8011"
    ["faq-management"]="8013"
    ["response-generation"]="8012"
    ["service-discovery"]="8027"
    ["authentication"]="8031"
    ["database-operations"]="8028"
    ["logging"]="8033"
    ["calendar-provider"]="8120"
    ["insights-generation"]="8125"
    ["rag-query"]="8111"
    ["conversation-processing"]="8126"
    ["agent-management"]="8101"
    ["conversation-management"]="8102"
    ["widget-generation"]="8104"
    ["usage-analytics"]="8103"
    ["analytics-calculation"]="8107"
    ["data-storage"]="8128"
    ["system-health"]="8106"
    ["industry-configuration"]="8105"
)

HEALTHY_COUNT=0
TOTAL_COUNT=${#SERVICES[@]}
FAILED_SERVICES=()

echo "Checking health of $TOTAL_COUNT microservices..."
echo ""

for service in "${!SERVICES[@]}"; do
    port=${SERVICES[$service]}
    
    # Check if service is responding
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $service (port $port): HEALTHY"
        ((HEALTHY_COUNT++))
    else
        echo "❌ $service (port $port): UNHEALTHY"
        FAILED_SERVICES+=("$service")
    fi
done

echo ""
echo "================================================================"
echo "Health Check Summary:"
echo "  Total Services: $TOTAL_COUNT"
echo "  Healthy: $HEALTHY_COUNT"
echo "  Unhealthy: $((TOTAL_COUNT - HEALTHY_COUNT))"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo ""
    echo "Failed Services:"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "  - $service"
    done
fi

echo ""
if [ $HEALTHY_COUNT -eq $TOTAL_COUNT ]; then
    echo "🎉 ALL SERVICES ARE HEALTHY!"
    exit 0
elif [ $HEALTHY_COUNT -gt $((TOTAL_COUNT / 2)) ]; then
    echo "⚠️  SYSTEM PARTIALLY HEALTHY ($HEALTHY_COUNT/$TOTAL_COUNT)"
    exit 1
else
    echo "🚨 SYSTEM UNHEALTHY ($HEALTHY_COUNT/$TOTAL_COUNT)"
    exit 2
fi