#!/usr/bin/env python3
"""
System Health Service
Ultra-focused microservice for system monitoring only
Extracted from various health check logic across server files
Target: <80 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import logging
from datetime import datetime
import os
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="System Health Service", description="Ultra-focused system monitoring", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ServiceStatus(BaseModel):
    service_name: str
    status: str
    response_time_ms: float
    last_check: str

# Known microservices to monitor
MICROSERVICES = [
    {"name": "agent-management", "port": 8101},
    {"name": "conversation-management", "port": 8102},
    {"name": "usage-analytics", "port": 8103},
    {"name": "widget-generation", "port": 8104},
    {"name": "calendar-provider", "port": 8120},
    {"name": "insights-generation", "port": 8125},
    {"name": "rag-query", "port": 8111},
    {"name": "conversation-processing", "port": 8126},
    {"name": "analytics-calculation", "port": 8107},
    {"name": "data-storage", "port": 8128}
]

health_history = []

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "system-health", "monitoring_services": len(MICROSERVICES)}

@app.get("/api/health")
async def get_system_health():
    """Get overall system health status"""
    try:
        system_status = {
            "overall_status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": [],
            "summary": {
                "total_services": len(MICROSERVICES),
                "healthy_services": 0,
                "unhealthy_services": 0
            }
        }
        
        # Check each microservice
        for service in MICROSERVICES:
            service_status = await check_service_health(service["name"], service["port"])
            system_status["services"].append(service_status)
            
            if service_status["status"] == "healthy":
                system_status["summary"]["healthy_services"] += 1
            else:
                system_status["summary"]["unhealthy_services"] += 1
        
        # Determine overall status
        healthy_ratio = system_status["summary"]["healthy_services"] / system_status["summary"]["total_services"]
        if healthy_ratio >= 0.9:
            system_status["overall_status"] = "healthy"
        elif healthy_ratio >= 0.7:
            system_status["overall_status"] = "degraded"
        else:
            system_status["overall_status"] = "unhealthy"
        
        # Store health check in history
        health_history.append(system_status)
        
        logger.info(f"System health check completed: {system_status['overall_status']}")
        return system_status
        
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def check_service_health(service_name: str, port: int) -> Dict[str, Any]:
    """Check health of individual service"""
    try:
        start_time = datetime.now()
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"http://localhost:{port}/health")
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                if response.status_code == 200:
                    status = "healthy"
                else:
                    status = "unhealthy"
                    
            except httpx.ConnectError:
                status = "unreachable"
                response_time = 5000  # Timeout
            except httpx.TimeoutException:
                status = "timeout"
                response_time = 5000
        
        return {
            "service_name": service_name,
            "status": status,
            "response_time_ms": round(response_time, 2),
            "last_check": datetime.now().isoformat(),
            "port": port
        }
        
    except Exception as e:
        logger.error(f"Health check failed for {service_name}: {e}")
        return {
            "service_name": service_name,
            "status": "error",
            "response_time_ms": 0,
            "last_check": datetime.now().isoformat(),
            "port": port,
            "error": str(e)
        }

@app.get("/api/health/detailed")
async def get_detailed_health():
    """Get detailed health information"""
    return await get_system_health()

@app.get("/api/health/services")
async def get_services_list():
    """Get list of monitored services"""
    return {
        "monitored_services": MICROSERVICES,
        "total_services": len(MICROSERVICES)
    }

@app.get("/api/health/history")
async def get_health_history(limit: int = 10):
    """Get health check history"""
    return {
        "health_history": health_history[-limit:],
        "total_checks": len(health_history)
    }

@app.get("/api/health/service/{service_name}")
async def get_service_health(service_name: str):
    """Get health status for specific service"""
    service_config = next((s for s in MICROSERVICES if s["name"] == service_name), None)
    
    if not service_config:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service_status = await check_service_health(service_config["name"], service_config["port"])
    return service_status

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8106))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)