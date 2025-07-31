#!/usr/bin/env python3
"""
Service Discovery Service
Ultra-focused microservice for service registration and discovery only
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Service Discovery Service", description="Ultra-focused service discovery", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ServiceRegistration(BaseModel):
    service_name: str
    host: str
    port: int
    health_endpoint: str = "/health"
    version: str = "1.0.0"

class ServiceInfo(BaseModel):
    service_name: str
    host: str
    port: int
    status: str
    last_heartbeat: str

# Service registry
services = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "service-discovery", "registered_services": len(services)}

@app.post("/api/services/register")
async def register_service(registration: ServiceRegistration):
    """Register a service"""
    try:
        service_key = f"{registration.service_name}:{registration.port}"
        
        service_info = {
            "service_name": registration.service_name,
            "host": registration.host,
            "port": registration.port,
            "health_endpoint": registration.health_endpoint,
            "version": registration.version,
            "status": "healthy",
            "registered_at": datetime.now().isoformat(),
            "last_heartbeat": datetime.now().isoformat()
        }
        
        services[service_key] = service_info
        
        logger.info(f"Registered service {registration.service_name} at {registration.host}:{registration.port}")
        return {"success": True, "service_key": service_key}
        
    except Exception as e:
        logger.error(f"Service registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/services/discover/{service_name}")
async def discover_service(service_name: str):
    """Discover services by name"""
    matching_services = [service for key, service in services.items() 
                        if service["service_name"] == service_name and service["status"] == "healthy"]
    
    if not matching_services:
        raise HTTPException(status_code=404, detail="No healthy services found")
    
    return {"service_name": service_name, "instances": matching_services}

@app.get("/api/services/list")
async def list_all_services():
    """List all registered services"""
    return {"services": list(services.values()), "total_services": len(services)}

@app.post("/api/services/heartbeat/{service_name}/{port}")
async def service_heartbeat(service_name: str, port: int):
    """Update service heartbeat"""
    service_key = f"{service_name}:{port}"
    
    if service_key not in services:
        raise HTTPException(status_code=404, detail="Service not registered")
    
    services[service_key]["last_heartbeat"] = datetime.now().isoformat()
    services[service_key]["status"] = "healthy"
    
    return {"success": True, "service": service_name}

@app.delete("/api/services/unregister/{service_name}/{port}")
async def unregister_service(service_name: str, port: int):
    """Unregister a service"""
    service_key = f"{service_name}:{port}"
    
    if service_key not in services:
        raise HTTPException(status_code=404, detail="Service not registered")
    
    del services[service_key]
    logger.info(f"Unregistered service {service_name}:{port}")
    
    return {"success": True, "unregistered_service": service_key}

@app.get("/api/services/health-check")
async def check_all_services_health():
    """Check health of all registered services"""
    healthy_count = len([s for s in services.values() if s["status"] == "healthy"])
    total_count = len(services)
    
    return {
        "total_services": total_count,
        "healthy_services": healthy_count,
        "unhealthy_services": total_count - healthy_count,
        "overall_health": "good" if healthy_count == total_count else "degraded"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8027))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)