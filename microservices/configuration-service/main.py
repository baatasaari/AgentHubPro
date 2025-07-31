#!/usr/bin/env python3
"""
Configuration Service
Ultra-focused microservice for configuration management only
Target: <90 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Configuration Service", description="Ultra-focused configuration management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ConfigUpdate(BaseModel):
    key: str
    value: Any
    environment: str = "production"

# In-memory configuration storage
configurations = {
    "production": {
        "max_embeddings": 1000,
        "search_threshold": 0.3,
        "payment_timeout": 300,
        "notification_retry": 3
    },
    "development": {
        "max_embeddings": 100,
        "search_threshold": 0.2,
        "payment_timeout": 60,
        "notification_retry": 1
    }
}

@app.get("/health")
async def health_check():
    total_configs = sum(len(env_configs) for env_configs in configurations.values())
    return {"status": "healthy", "service": "configuration", "total_configs": total_configs}

@app.get("/api/config/{environment}")
async def get_environment_config(environment: str):
    """Get all configuration for an environment"""
    if environment not in configurations:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    return {
        "environment": environment,
        "configuration": configurations[environment],
        "last_updated": datetime.now().isoformat()
    }

@app.get("/api/config/{environment}/{key}")
async def get_config_value(environment: str, key: str):
    """Get specific configuration value"""
    if environment not in configurations:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    if key not in configurations[environment]:
        raise HTTPException(status_code=404, detail="Configuration key not found")
    
    return {
        "key": key,
        "value": configurations[environment][key],
        "environment": environment
    }

@app.put("/api/config/update")
async def update_config(update: ConfigUpdate):
    """Update configuration value"""
    try:
        if update.environment not in configurations:
            configurations[update.environment] = {}
        
        configurations[update.environment][update.key] = update.value
        
        logger.info(f"Updated config {update.key} in {update.environment}")
        return {"success": True, "updated_key": update.key, "environment": update.environment}
        
    except Exception as e:
        logger.error(f"Configuration update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/reload")
async def reload_configuration():
    """Trigger configuration reload"""
    # In a real system, this would reload from external sources
    logger.info("Configuration reload triggered")
    return {"success": True, "reloaded_at": datetime.now().isoformat()}

@app.get("/api/config/environments")
async def list_environments():
    """List all available environments"""
    return {
        "environments": list(configurations.keys()),
        "total_environments": len(configurations)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8030))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)