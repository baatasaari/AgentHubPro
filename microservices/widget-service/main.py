#!/usr/bin/env python3
"""
Widget Service - Customization & Code Generation
Efficient service for widget configuration and embed code generation with configurable templates
"""

import sys
import os
from pathlib import Path

# Add shared directory to path
sys.path.append(str(Path(__file__).parent.parent / "shared"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import logging

# Import configuration manager
from config_manager import get_config

# Initialize configuration
config = get_config("widget", str(Path(__file__).parent.parent / "shared" / "config"))
service_config = config.get_service_config()

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.get_app_setting("monitoring.log_level", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Widget Service",
    version="1.0.0",
    debug=service_config.debug
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=service_config.cors_origins,
    allow_credentials=config.get_app_setting("api.cors.allow_credentials", True),
    allow_methods=config.get_app_setting("api.cors.allow_methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS").split(","),
    allow_headers=config.get_app_setting("api.cors.allow_headers", "*").split(",")
)

# Models
class WidgetPosition(str, Enum):
    BOTTOM_RIGHT = "bottom-right"
    BOTTOM_LEFT = "bottom-left"
    TOP_RIGHT = "top-right"
    TOP_LEFT = "top-left"

class WidgetTheme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"

class WidgetConfig(BaseModel):
    id: str
    agent_id: str
    primary_color: str = "#3B82F6"
    secondary_color: str = "#1F2937"
    position: WidgetPosition = WidgetPosition.BOTTOM_RIGHT
    theme: WidgetTheme = WidgetTheme.LIGHT
    auto_open: bool = False
    show_branding: bool = True
    welcome_message: str = "Hi! How can I help you today?"
    border_radius: int = 12
    z_index: int = 1000
    width: int = 350
    height: int = 500
    created_at: datetime
    updated_at: datetime

class WidgetCreate(BaseModel):
    agent_id: str
    primary_color: str = "#3B82F6"
    position: WidgetPosition = WidgetPosition.BOTTOM_RIGHT
    auto_open: bool = False
    welcome_message: str = "Hi! How can I help you today?"

class WidgetUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    position: Optional[WidgetPosition] = None
    theme: Optional[WidgetTheme] = None
    auto_open: Optional[bool] = None
    show_branding: Optional[bool] = None
    welcome_message: Optional[str] = None
    border_radius: Optional[int] = None

# Storage
widgets_db: Dict[str, WidgetConfig] = {}

# Sample data (only if enabled)
def init_sample_widgets():
    if config.is_feature_enabled("enable_mock_data"):
        sample_widgets = [
            {
                "agent_id": "1",
                "primary_color": "#10B981",
                "position": WidgetPosition.BOTTOM_RIGHT,
                "welcome_message": "Welcome to HealthCare Plus! How can I assist you today?",
                "theme": WidgetTheme.LIGHT,
                "auto_open": False
            },
            {
                "agent_id": "2", 
                "primary_color": "#3B82F6",
                "position": WidgetPosition.BOTTOM_LEFT,
                "welcome_message": "Hi! Need help with technology solutions?",
                "theme": WidgetTheme.DARK,
                "auto_open": True
            },
            {
                "agent_id": "3",
                "primary_color": "#EF4444",
                "position": WidgetPosition.BOTTOM_RIGHT,
                "welcome_message": "Ready to start your fitness journey?",
                "theme": WidgetTheme.AUTO,
                "auto_open": False
            }
        ]
        
        for i, data in enumerate(sample_widgets, 1):
            widget_id = str(i)
            now = datetime.now()
            widget = WidgetConfig(
                id=widget_id,
                created_at=now,
                updated_at=now,
                **data
            )
            widgets_db[widget_id] = widget
        
        logger.info(f"Initialized {len(sample_widgets)} sample widgets")

# Initialize sample data if enabled
init_sample_widgets()

# Helper functions
def generate_embed_code(widget: WidgetConfig, domain: str = "your-domain.com") -> str:
    """Generate JavaScript embed code for the widget"""
    return f"""
<!-- AgentHub Widget Embed Code -->
<script>
(function() {{
    var script = document.createElement('script');
    script.src = 'https://cdn.agenthub.com/widget.js';
    script.async = true;
    script.onload = function() {{
        AgentHubWidget.init({{
            agentId: '{widget.agent_id}',
            widgetId: '{widget.id}',
            primaryColor: '{widget.primary_color}',
            secondaryColor: '{widget.secondary_color}',
            position: '{widget.position}',
            theme: '{widget.theme}',
            autoOpen: {str(widget.auto_open).lower()},
            showBranding: {str(widget.show_branding).lower()},
            welcomeMessage: '{widget.welcome_message}',
            borderRadius: {widget.border_radius},
            zIndex: {widget.z_index},
            width: {widget.width},
            height: {widget.height},
            domain: '{domain}'
        }});
    }};
    document.head.appendChild(script);
}})();
</script>
<!-- End AgentHub Widget -->""".strip()

def generate_widget_css(widget: WidgetConfig) -> str:
    """Generate CSS for widget styling"""
    position_styles = {
        WidgetPosition.BOTTOM_RIGHT: "bottom: 20px; right: 20px;",
        WidgetPosition.BOTTOM_LEFT: "bottom: 20px; left: 20px;",
        WidgetPosition.TOP_RIGHT: "top: 20px; right: 20px;",
        WidgetPosition.TOP_LEFT: "top: 20px; left: 20px;"
    }
    
    return f"""
.agenthub-widget {{
    position: fixed;
    {position_styles[widget.position]}
    width: {widget.width}px;
    height: {widget.height}px;
    z-index: {widget.z_index};
    border-radius: {widget.border_radius}px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    background: {"#ffffff" if widget.theme == WidgetTheme.LIGHT else "#1f2937"};
    color: {"#374151" if widget.theme == WidgetTheme.LIGHT else "#f9fafb"};
    border: 1px solid {widget.primary_color};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}}

.agenthub-widget-header {{
    background: {widget.primary_color};
    color: white;
    padding: 12px 16px;
    border-radius: {widget.border_radius}px {widget.border_radius}px 0 0;
    font-weight: 600;
}}

.agenthub-widget-toggle {{
    position: fixed;
    {position_styles[widget.position]}
    width: 60px;
    height: 60px;
    background: {widget.primary_color};
    border-radius: 50%;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    z-index: {widget.z_index + 1};
}}""".strip()

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "widget",
        "widgets_count": len(widgets_db),
        "environment": config.get_environment(),
        "storage_type": config.get_storage_config().type
    }

# Configuration endpoints
@app.get("/api/config/status")
async def get_config_status():
    """Get current configuration status"""
    return config.get_status()

@app.get("/api/config/reload")
async def reload_configuration():
    """Reload all configurations"""
    try:
        config.reload_all()
        return {"message": "Configuration reloaded successfully", "status": "success"}
    except Exception as e:
        logger.error(f"Error reloading configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload configuration")

@app.get("/api/widgets", response_model=List[WidgetConfig])
async def get_widgets(agent_id: Optional[str] = None):
    """Get all widgets or filter by agent"""
    widgets = list(widgets_db.values())
    
    if agent_id:
        widgets = [w for w in widgets if w.agent_id == agent_id]
    
    return sorted(widgets, key=lambda x: x.updated_at, reverse=True)

@app.get("/api/widgets/{widget_id}", response_model=WidgetConfig)
async def get_widget(widget_id: str):
    """Get a specific widget"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widgets_db[widget_id]

@app.post("/api/widgets", response_model=WidgetConfig)
async def create_widget(widget_data: WidgetCreate):
    """Create a new widget configuration"""
    widget_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    widget = WidgetConfig(
        id=widget_id,
        created_at=now,
        updated_at=now,
        **widget_data.dict()
    )
    
    widgets_db[widget_id] = widget
    return widget

@app.put("/api/widgets/{widget_id}", response_model=WidgetConfig)
async def update_widget(widget_id: str, updates: WidgetUpdate):
    """Update widget configuration"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    update_data = updates.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(widget, field, value)
    
    widget.updated_at = datetime.now()
    return widget

@app.delete("/api/widgets/{widget_id}")
async def delete_widget(widget_id: str):
    """Delete a widget configuration"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    del widgets_db[widget_id]
    return {"message": "Widget deleted successfully"}

@app.get("/api/widgets/{widget_id}/embed")
async def get_embed_code(widget_id: str, domain: str = Query("your-domain.com")):
    """Generate embed code for a widget"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    embed_code = generate_embed_code(widget, domain)
    
    return {
        "widget_id": widget_id,
        "embed_code": embed_code,
        "instructions": "Copy and paste this code before the closing </body> tag of your website"
    }

@app.get("/api/widgets/{widget_id}/css")
async def get_widget_css(widget_id: str):
    """Generate CSS for widget styling"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    css_code = generate_widget_css(widget)
    
    return {
        "widget_id": widget_id,
        "css": css_code,
        "instructions": "Add this CSS to your website's stylesheet for custom styling"
    }

@app.get("/api/widgets/{widget_id}/preview")
async def get_widget_preview(widget_id: str):
    """Get widget configuration for preview"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    
    return {
        "widget_id": widget_id,
        "preview_config": {
            "primary_color": widget.primary_color,
            "secondary_color": widget.secondary_color,
            "position": widget.position,
            "theme": widget.theme,
            "welcome_message": widget.welcome_message,
            "border_radius": widget.border_radius,
            "auto_open": widget.auto_open,
            "show_branding": widget.show_branding
        },
        "demo_html": f"""
        <div class="widget-preview" style="
            width: {widget.width}px;
            height: {widget.height}px;
            border: 1px solid {widget.primary_color};
            border-radius: {widget.border_radius}px;
            background: {"#ffffff" if widget.theme == WidgetTheme.LIGHT else "#1f2937"};
            color: {"#374151" if widget.theme == WidgetTheme.LIGHT else "#f9fafb"};
        ">
            <div style="
                background: {widget.primary_color};
                color: white;
                padding: 12px;
                border-radius: {widget.border_radius}px {widget.border_radius}px 0 0;
                font-weight: 600;
            ">AI Assistant</div>
            <div style="padding: 16px;">
                <p>{widget.welcome_message}</p>
            </div>
        </div>
        """
    }

@app.post("/api/widgets/{widget_id}/test")
async def test_widget(widget_id: str):
    """Test widget configuration and return validation results"""
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    
    # Validation checks
    issues = []
    warnings = []
    
    # Color validation
    if not widget.primary_color.startswith('#') or len(widget.primary_color) != 7:
        issues.append("Invalid primary color format")
    
    # Size validation
    if widget.width < 300 or widget.width > 500:
        warnings.append("Widget width should be between 300-500px for optimal display")
    
    if widget.height < 400 or widget.height > 700:
        warnings.append("Widget height should be between 400-700px for optimal display")
    
    # Message validation
    if len(widget.welcome_message) > 100:
        warnings.append("Welcome message is quite long - consider shortening for better UX")
    
    return {
        "widget_id": widget_id,
        "validation_status": "passed" if len(issues) == 0 else "failed",
        "issues": issues,
        "warnings": warnings,
        "tested_at": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Widget Service on http://0.0.0.0:8005")
    uvicorn.run(app, host="0.0.0.0", port=8005, log_level="info")