#!/usr/bin/env python3
"""
Widget Service - Widget Customization and Code Generation
Port: 8005
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import uvicorn

app = FastAPI(
    title="Widget Service",
    description="Widget Customization and Code Generation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
widgets_db = {}
templates_db = {}

# Sample widget templates
sample_templates = [
    {
        "id": "template-1",
        "name": "Modern Chat",
        "description": "Clean, modern chat widget with rounded corners",
        "theme": {
            "primary_color": "#3b82f6",
            "secondary_color": "#f3f4f6",
            "position": "bottom-right",
            "border_radius": 12,
            "auto_open": False
        }
    },
    {
        "id": "template-2",
        "name": "Professional",
        "description": "Professional widget for business use",
        "theme": {
            "primary_color": "#1f2937",
            "secondary_color": "#ffffff",
            "position": "bottom-left",
            "border_radius": 6,
            "auto_open": False
        }
    }
]

for template in sample_templates:
    templates_db[template["id"]] = template

# Sample widgets
sample_widgets = [
    {
        "id": "widget-1",
        "agent_id": "agent-1",
        "theme": {
            "primary_color": "#10b981",
            "secondary_color": "#f0fdf4",
            "position": "bottom-right",
            "border_radius": 8,
            "auto_open": False
        },
        "settings": {
            "show_branding": True,
            "welcome_message": "Hello! How can I help you today?",
            "placeholder_text": "Type your message..."
        },
        "created_at": "2025-01-15T10:00:00Z"
    }
]

for widget in sample_widgets:
    widgets_db[widget["id"]] = widget

class ThemeConfig(BaseModel):
    primary_color: str = Field(..., pattern=r"^#[0-9a-fA-F]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    position: str = Field(..., pattern=r"^(bottom-right|bottom-left|top-right|top-left)$")
    border_radius: Optional[int] = Field(8, ge=0, le=50)
    auto_open: Optional[bool] = False

class WidgetSettings(BaseModel):
    show_branding: Optional[bool] = True
    welcome_message: Optional[str] = "Hello! How can I help you today?"
    placeholder_text: Optional[str] = "Type your message..."

class WidgetCreate(BaseModel):
    agent_id: str
    theme: ThemeConfig
    settings: Optional[WidgetSettings] = None

class WidgetUpdate(BaseModel):
    theme: Optional[ThemeConfig] = None
    settings: Optional[WidgetSettings] = None

@app.get("/health")
async def health_check():
    return {
        "service": "widget-service",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "widgets_count": len(widgets_db)
    }

@app.post("/api/widgets", status_code=201)
async def create_widget(widget_data: WidgetCreate):
    widget_id = f"widget-{uuid.uuid4().hex[:8]}"
    
    widget = {
        "id": widget_id,
        "agent_id": widget_data.agent_id,
        "theme": widget_data.theme.dict(),
        "settings": widget_data.settings.dict() if widget_data.settings else {
            "show_branding": True,
            "welcome_message": "Hello! How can I help you today?",
            "placeholder_text": "Type your message..."
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    widgets_db[widget_id] = widget
    return widget

@app.get("/api/widgets")
async def get_widgets(agent_id: Optional[str] = None):
    widgets = list(widgets_db.values())
    
    if agent_id:
        widgets = [w for w in widgets if w["agent_id"] == agent_id]
    
    return widgets

@app.get("/api/widgets/{widget_id}")
async def get_widget(widget_id: str):
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widgets_db[widget_id]

@app.patch("/api/widgets/{widget_id}")
async def update_widget(widget_id: str, widget_update: WidgetUpdate):
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    
    if widget_update.theme:
        widget["theme"] = widget_update.theme.dict()
    
    if widget_update.settings:
        widget["settings"] = widget_update.settings.dict()
    
    widget["updated_at"] = datetime.utcnow().isoformat()
    widgets_db[widget_id] = widget
    
    return widget

@app.delete("/api/widgets/{widget_id}")
async def delete_widget(widget_id: str):
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    deleted_widget = widgets_db.pop(widget_id)
    return {"message": "Widget deleted successfully", "widget_id": widget_id}

@app.get("/api/widgets/{widget_id}/embed")
async def get_embed_code(widget_id: str):
    if widget_id not in widgets_db:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget = widgets_db[widget_id]
    
    # Generate embed code
    embed_code = generate_embed_code(widget)
    
    return {
        "widget_id": widget_id,
        "embed_code": embed_code,
        "integration_instructions": "Copy and paste this code into your website's HTML"
    }

def generate_embed_code(widget: Dict[str, Any]) -> str:
    """Generate JavaScript embed code for the widget"""
    theme = widget["theme"]
    settings = widget["settings"]
    
    return f'''
<!-- AgentHub Chat Widget -->
<div id="agenthub-widget-{widget["id"]}"></div>
<script>
(function() {{
    const widget = {{
        id: '{widget["id"]}',
        agentId: '{widget["agent_id"]}',
        theme: {{
            primaryColor: '{theme["primary_color"]}',
            secondaryColor: '{theme.get("secondary_color", "#f3f4f6")}',
            position: '{theme["position"]}',
            borderRadius: {theme.get("border_radius", 8)},
            autoOpen: {str(theme.get("auto_open", False)).lower()}
        }},
        settings: {{
            showBranding: {str(settings.get("show_branding", True)).lower()},
            welcomeMessage: '{settings.get("welcome_message", "Hello! How can I help you today?")}',
            placeholderText: '{settings.get("placeholder_text", "Type your message...")}'
        }}
    }};
    
    // Create widget container
    const container = document.createElement('div');
    container.id = 'agenthub-chat-widget';
    container.style.cssText = `
        position: fixed;
        {theme["position"].split('-')[0]}: 20px;
        {theme["position"].split('-')[1]}: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: {theme.get("border_radius", 8)}px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create toggle button
    const button = document.createElement('button');
    button.style.cssText = `
        position: fixed;
        {theme["position"].split('-')[0]}: 20px;
        {theme["position"].split('-')[1]}: 20px;
        width: 60px;
        height: 60px;
        background: {theme["primary_color"]};
        border: none;
        border-radius: 50%;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        color: white;
        font-size: 24px;
    `;
    button.innerHTML = '💬';
    
    button.onclick = function() {{
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }};
    
    document.body.appendChild(container);
    document.body.appendChild(button);
    
    if (widget.theme.autoOpen) {{
        setTimeout(() => container.style.display = 'block', 2000);
    }}
}})();
</script>
<!-- End AgentHub Chat Widget -->'''

@app.get("/api/templates")
async def get_templates():
    return list(templates_db.values())

@app.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    if template_id not in templates_db:
        raise HTTPException(status_code=404, detail="Template not found")
    return templates_db[template_id]

@app.post("/api/widgets/from-template")
async def create_widget_from_template(agent_id: str, template_id: str):
    if template_id not in templates_db:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = templates_db[template_id]
    
    widget_data = WidgetCreate(
        agent_id=agent_id,
        theme=ThemeConfig(**template["theme"])
    )
    
    return await create_widget(widget_data)

if __name__ == "__main__":
    print("Starting Widget Service on http://0.0.0.0:8005")
    uvicorn.run(app, host="0.0.0.0", port=8005)