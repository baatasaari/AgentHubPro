#!/usr/bin/env python3
"""
Calendar Provider Service
Ultra-focused microservice for calendar provider integrations only
Extracted from calendar-integration.ts and calendar-plugins.ts
Target: <120 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime, timedelta
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Calendar Provider Service", description="Ultra-focused calendar provider integrations", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class CalendarProvider(BaseModel):
    provider_id: str
    name: str
    type: str  # google, outlook, apple, calendly
    api_endpoint: str
    auth_method: str

class CalendarConfig(BaseModel):
    agent_id: str
    provider_id: str
    working_hours: Dict[str, Any]
    timezone: str
    booking_settings: Dict[str, Any]

# Calendar providers
providers = {
    "google": CalendarProvider(
        provider_id="google",
        name="Google Calendar",
        type="google",
        api_endpoint="https://www.googleapis.com/calendar/v3",
        auth_method="oauth2"
    ),
    "outlook": CalendarProvider(
        provider_id="outlook",
        name="Microsoft Outlook",
        type="outlook", 
        api_endpoint="https://graph.microsoft.com/v1.0",
        auth_method="oauth2"
    ),
    "apple": CalendarProvider(
        provider_id="apple",
        name="Apple Calendar",
        type="apple",
        api_endpoint="https://caldav.icloud.com",
        auth_method="caldav"
    )
}

# Provider configurations
provider_configs = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "calendar-provider", "configured_providers": len(provider_configs)}

@app.get("/api/calendar/providers")
async def get_available_providers():
    """Get all available calendar providers"""
    return {"providers": list(providers.values()), "total": len(providers)}

@app.get("/api/calendar/providers/{provider_id}")
async def get_provider_details(provider_id: str):
    """Get specific provider details"""
    if provider_id not in providers:
        raise HTTPException(status_code=404, detail="Provider not found")
    return providers[provider_id].model_dump()

@app.post("/api/calendar/providers/{provider_id}/configure")
async def configure_provider(provider_id: str, config: CalendarConfig):
    """Configure calendar provider for agent"""
    try:
        if provider_id not in providers:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        config_key = f"{config.agent_id}:{provider_id}"
        provider_configs[config_key] = {
            "agent_id": config.agent_id,
            "provider_id": provider_id,
            "working_hours": config.working_hours,
            "timezone": config.timezone,
            "booking_settings": config.booking_settings,
            "configured_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        logger.info(f"Configured {provider_id} for agent {config.agent_id}")
        return {"success": True, "config_key": config_key}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Provider configuration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calendar/providers/{provider_id}/auth")
async def get_auth_requirements(provider_id: str):
    """Get authentication requirements for provider"""
    if provider_id not in providers:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider = providers[provider_id]
    auth_info = {
        "provider_id": provider_id,
        "auth_method": provider.auth_method,
        "required_scopes": []
    }
    
    if provider.type == "google":
        auth_info["required_scopes"] = ["https://www.googleapis.com/auth/calendar"]
        auth_info["auth_url"] = "https://accounts.google.com/o/oauth2/auth"
    elif provider.type == "outlook":
        auth_info["required_scopes"] = ["https://graph.microsoft.com/calendars.readwrite"]
        auth_info["auth_url"] = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    
    return auth_info

@app.get("/api/calendar/agents/{agent_id}/providers")
async def get_agent_providers(agent_id: str):
    """Get configured providers for agent"""
    agent_providers = []
    for config_key, config in provider_configs.items():
        if config["agent_id"] == agent_id:
            provider_info = providers[config["provider_id"]].model_dump()
            provider_info["configuration"] = config
            agent_providers.append(provider_info)
    
    return {"agent_id": agent_id, "providers": agent_providers, "total": len(agent_providers)}

@app.delete("/api/calendar/providers/{provider_id}/agents/{agent_id}")
async def remove_provider_config(provider_id: str, agent_id: str):
    """Remove provider configuration for agent"""
    config_key = f"{agent_id}:{provider_id}"
    
    if config_key not in provider_configs:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    del provider_configs[config_key]
    logger.info(f"Removed {provider_id} configuration for agent {agent_id}")
    
    return {"success": True, "removed_config": config_key}

@app.post("/api/calendar/providers/{provider_id}/test")
async def test_provider_connection(provider_id: str, credentials: Dict[str, Any]):
    """Test connection to calendar provider"""
    try:
        if provider_id not in providers:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Mock connection test (replace with actual provider API calls)
        provider = providers[provider_id]
        
        # Simulate connection test
        test_result = {
            "provider_id": provider_id,
            "connection_status": "success",
            "test_timestamp": datetime.now().isoformat(),
            "available_calendars": [
                {"id": "primary", "name": "Primary Calendar"},
                {"id": "work", "name": "Work Calendar"}
            ]
        }
        
        logger.info(f"Connection test successful for {provider_id}")
        return test_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Provider connection test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8120))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)