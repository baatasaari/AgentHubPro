#!/usr/bin/env python3
"""
API Gateway Service
Ultra-focused microservice for request routing and load balancing
Replaces monolithic server with microservices orchestration
Target: <200 lines for maintainability
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import uvicorn
import logging
from datetime import datetime
import os
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AgentHub API Gateway", description="Microservices request router", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Service registry
SERVICES = {
    "agent-management": "http://agent-management:8101",
    "conversation-management": "http://conversation-management:8102", 
    "usage-analytics": "http://usage-analytics:8103",
    "widget-generation": "http://widget-generation:8104",
    "calendar-provider": "http://calendar-provider:8120",
    "insights-generation": "http://insights-generation:8125",
    "rag-query": "http://rag-query:8111",
    "conversation-processing": "http://conversation-processing:8126",
    "analytics-calculation": "http://analytics-calculation:8107",
    "data-storage": "http://data-storage:8128",
    "system-health": "http://system-health:8106",
    "industry-configuration": "http://industry-configuration:8105"
}

# Route mappings to services
ROUTE_MAPPINGS = {
    "/api/agents": "agent-management",
    "/api/conversations": "conversation-management",
    "/api/usage": "usage-analytics", 
    "/api/widgets": "widget-generation",
    "/api/calendar": "calendar-provider",
    "/api/insights": "insights-generation",
    "/api/rag": "rag-query",
    "/api/conversation": "conversation-processing",
    "/api/analytics": "analytics-calculation",
    "/api/storage": "data-storage",
    "/api/health": "system-health",
    "/api/industry": "industry-configuration"
}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "api-gateway", "registered_services": len(SERVICES)}

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_request(path: str, request: Request):
    """Route requests to appropriate microservices"""
    try:
        # Determine target service
        service_name = None
        for route_prefix, service in ROUTE_MAPPINGS.items():
            if f"/{path}".startswith(route_prefix):
                service_name = service
                break
        
        if not service_name:
            raise HTTPException(status_code=404, detail="Service not found")
        
        if service_name not in SERVICES:
            raise HTTPException(status_code=503, detail="Service unavailable")
        
        service_url = SERVICES[service_name]
        target_url = f"{service_url}/{path}"
        
        # Get request body if present
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Forward request to microservice
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=dict(request.headers),
                content=body,
                params=dict(request.query_params)
            )
            
            logger.info(f"Routed {request.method} /{path} to {service_name}: {response.status_code}")
            
            # Return response
            return JSONResponse(
                content=response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
    except httpx.ConnectError:
        logger.error(f"Service {service_name} is unreachable")
        raise HTTPException(status_code=503, detail=f"Service {service_name} unavailable")
    except httpx.TimeoutException:
        logger.error(f"Service {service_name} timed out")
        raise HTTPException(status_code=504, detail=f"Service {service_name} timeout")
    except Exception as e:
        logger.error(f"Gateway error: {e}")
        raise HTTPException(status_code=500, detail="Gateway error")

@app.get("/api/services/registry")
async def get_service_registry():
    """Get registered services"""
    return {"services": SERVICES, "routes": ROUTE_MAPPINGS}

@app.get("/api/services/health")
async def check_all_services():
    """Check health of all registered services"""
    service_health = {}
    
    for service_name, service_url in SERVICES.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{service_url}/health")
                service_health[service_name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_time": response.elapsed.total_seconds(),
                    "url": service_url
                }
        except Exception as e:
            service_health[service_name] = {
                "status": "unreachable",
                "error": str(e),
                "url": service_url
            }
    
    healthy_count = sum(1 for s in service_health.values() if s["status"] == "healthy")
    total_count = len(service_health)
    
    return {
        "overall_health": "healthy" if healthy_count >= total_count * 0.8 else "degraded",
        "healthy_services": healthy_count,
        "total_services": total_count,
        "services": service_health
    }

@app.post("/api/services/register")
async def register_service(service_data: Dict[str, Any]):
    """Register new service"""
    service_name = service_data.get("name")
    service_url = service_data.get("url")
    
    if not service_name or not service_url:
        raise HTTPException(status_code=400, detail="Service name and URL required")
    
    SERVICES[service_name] = service_url
    logger.info(f"Registered service {service_name} at {service_url}")
    
    return {"success": True, "registered_service": service_name}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)