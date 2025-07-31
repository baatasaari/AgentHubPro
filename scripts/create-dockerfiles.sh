#!/bin/bash

# Create Dockerfiles for all microservices
SERVICES=(
    "document-processing-service"
    "embedding-generation-service"
    "similarity-search-service"
    "payment-intent-service"
    "slot-management-service"
    "notification-service"
    "payment-link-service"
    "metrics-collection-service"
    "configuration-service"
    "booking-management-service"
    "knowledge-base-service"
    "faq-management-service"
    "response-generation-service"
    "service-discovery-service"
    "authentication-service"
    "database-operations-service"
    "logging-service"
    "calendar-provider-service"
    "insights-generation-service"
    "rag-query-service"
    "conversation-processing-service"
    "agent-management-service"
    "conversation-management-service"
    "widget-generation-service"
    "usage-analytics-service"
    "analytics-calculation-service"
    "data-storage-service"
    "system-health-service"
    "industry-configuration-service"
)

echo "Creating Dockerfiles for all microservices..."

for service in "${SERVICES[@]}"; do
    DOCKERFILE_PATH="microservices/${service}/Dockerfile"
    
    cat > "$DOCKERFILE_PATH" << EOF
# Dockerfile for ${service}
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \\
    fastapi==0.104.1 \\
    uvicorn[standard]==0.24.0 \\
    pydantic==2.5.0 \\
    httpx==0.25.2

# Copy application
COPY main.py .

# Expose port (will be overridden by environment variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:\${PORT:-8000}/health || exit 1

# Run application
CMD python main.py
EOF

    echo "Created Dockerfile for ${service}"
done

echo "All Dockerfiles created successfully!"
echo ""
echo "To build and run all services:"
echo "  docker-compose -f docker-compose.microservices.yml up --build"
echo ""
echo "To run specific services:"
echo "  docker-compose -f docker-compose.microservices.yml up agent-management conversation-management"
echo ""
echo "To scale specific services:"
echo "  docker-compose -f docker-compose.microservices.yml up --scale agent-management=3"