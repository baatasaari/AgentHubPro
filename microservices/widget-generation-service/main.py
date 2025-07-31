#!/usr/bin/env python3
"""
Widget Generation Service
Ultra-focused microservice for widget code generation only
Extracted from routes.ts (lines 278-320)
Target: <110 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Widget Generation Service", description="Ultra-focused widget code generation", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class WidgetConfig(BaseModel):
    agentId: int
    primaryColor: str = "#2563eb"
    position: str = "bottom-right"
    theme: str = "light"
    autoOpen: bool = False

class EmbedCodeRequest(BaseModel):
    agentId: int
    businessName: str
    industry: str
    llmModel: str
    interfaceType: str
    config: Optional[WidgetConfig] = None

# Widget configurations storage
widget_configs = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "widget-generation", "configured_widgets": len(widget_configs)}

@app.get("/api/agents/{agent_id}/embed")
async def generate_embed_code(agent_id: int):
    """Generate embed code for agent"""
    try:
        # Get widget configuration or use defaults
        config = widget_configs.get(agent_id, {
            "primaryColor": "#2563eb",
            "position": "bottom-right",
            "theme": "light",
            "autoOpen": False
        })
        
        # Mock agent data (in real implementation, would fetch from agent service)
        agent_data = {
            "id": agent_id,
            "businessName": f"Agent {agent_id}",
            "industry": "general",
            "llmModel": "gpt-3.5-turbo",
            "interfaceType": "webchat"
        }
        
        embed_code = f"""<!-- AgentHub Widget - {agent_data['businessName']} -->
<script>
(function() {{
    var agentConfig = {{
        agentId: 'agent_{agent_data['id']}',
        businessName: '{agent_data['businessName'].replace("'", "\\'")}',
        industry: '{agent_data['industry']}',
        model: '{agent_data['llmModel']}',
        interface: '{agent_data['interfaceType']}',
        theme: {{
            primaryColor: '{config['primaryColor']}',
            position: '{config['position']}',
            theme: '{config['theme']}',
            autoOpen: {str(config['autoOpen']).lower()}
        }}
    }};
    
    var script = document.createElement('script');
    script.src = 'https://cdn.agenthub.com/widget.js';
    script.onload = function() {{
        if (typeof AgentHub !== 'undefined') {{
            AgentHub.init(agentConfig);
        }}
    }};
    document.head.appendChild(script);
}})();
</script>"""
        
        logger.info(f"Generated embed code for agent {agent_id}")
        return {"embedCode": embed_code, "config": config}
        
    except Exception as e:
        logger.error(f"Embed code generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/widgets/generate")
async def generate_widget_code(request: EmbedCodeRequest):
    """Generate widget code with custom configuration"""
    try:
        config = request.config or WidgetConfig(agentId=request.agentId)
        
        # Store widget configuration
        widget_configs[request.agentId] = {
            "primaryColor": config.primaryColor,
            "position": config.position,
            "theme": config.theme,
            "autoOpen": config.autoOpen
        }
        
        embed_code = f"""<!-- AgentHub Widget - {request.businessName} -->
<script>
(function() {{
    var agentConfig = {{
        agentId: 'agent_{request.agentId}',
        businessName: '{request.businessName.replace("'", "\\'")}',
        industry: '{request.industry}',
        model: '{request.llmModel}',
        interface: '{request.interfaceType}',
        theme: {{
            primaryColor: '{config.primaryColor}',
            position: '{config.position}',
            theme: '{config.theme}',
            autoOpen: {str(config.autoOpen).lower()}
        }}
    }};
    
    var script = document.createElement('script');
    script.src = 'https://cdn.agenthub.com/widget.js';
    script.onload = function() {{
        if (typeof AgentHub !== 'undefined') {{
            AgentHub.init(agentConfig);
        }}
    }};
    document.head.appendChild(script);
}})();
</script>"""
        
        logger.info(f"Generated custom widget for agent {request.agentId}")
        return {"success": True, "embedCode": embed_code, "config": config.model_dump()}
        
    except Exception as e:
        logger.error(f"Widget generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/widgets/{agent_id}/config")
async def update_widget_config(agent_id: int, config: WidgetConfig):
    """Update widget configuration"""
    try:
        widget_configs[agent_id] = config.model_dump()
        
        logger.info(f"Updated widget config for agent {agent_id}")
        return {"success": True, "config": config}
        
    except Exception as e:
        logger.error(f"Widget config update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/widgets/{agent_id}/config")
async def get_widget_config(agent_id: int):
    """Get widget configuration"""
    if agent_id not in widget_configs:
        # Return default configuration
        default_config = WidgetConfig(agentId=agent_id)
        return default_config.model_dump()
    
    return widget_configs[agent_id]

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8104))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)