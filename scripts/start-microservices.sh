#!/bin/bash

echo "🚀 STARTING AGENTHUB MICROSERVICES ARCHITECTURE"
echo "================================================================"
echo ""

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"
echo ""

# Stop any existing services
echo "Stopping any existing services..."
docker-compose -f docker-compose.microservices.yml down > /dev/null 2>&1

echo ""
echo "🏗️ Building and starting 29 microservices..."
echo ""

# Start all microservices
docker-compose -f docker-compose.microservices.yml up --build -d

echo ""
echo "⏳ Waiting for services to become healthy..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."
./scripts/microservices-health-check.sh

echo ""
echo "🌐 API Gateway available at: http://localhost:5000"
echo ""
echo "📊 Service Management URLs:"
echo "   System Health: http://localhost:8106/api/health"
echo "   Service Discovery: http://localhost:8027/api/services/list"
echo "   Analytics: http://localhost:8107/api/analytics/performance"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: docker-compose -f docker-compose.microservices.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.microservices.yml down"
echo "   Scale service: docker-compose -f docker-compose.microservices.yml up --scale agent-management=3"
echo ""
echo "✨ AgentHub microservices architecture is now running!"