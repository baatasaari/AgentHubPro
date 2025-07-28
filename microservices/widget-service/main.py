"""
Widget Service Microservice
FastAPI-based service for widget customization, code generation, and deployment
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import os
import json

# Initialize FastAPI app
app = FastAPI(
    title="Widget Service",
    description="Microservice for widget customization, code generation, and deployment",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class WidgetTheme(BaseModel):
    primary_color: str = "#007bff"
    secondary_color: str = "#6c757d"
    background_color: str = "#ffffff"
    text_color: str = "#333333"
    border_radius: int = 8
    font_family: str = "Arial, sans-serif"

class WidgetPosition(BaseModel):
    position: str = "bottom-right"  # bottom-right, bottom-left, top-right, top-left
    offset_x: int = 20
    offset_y: int = 20

class WidgetBehavior(BaseModel):
    auto_open: bool = False
    auto_open_delay: int = 3000
    show_agent_avatar: bool = True
    enable_sound: bool = False
    enable_typing_indicator: bool = True
    max_conversation_length: int = 50

class WidgetCustomization(BaseModel):
    id: str
    agent_id: str
    theme: WidgetTheme
    position: WidgetPosition
    behavior: WidgetBehavior
    welcome_message: str = "Hello! How can I help you today?"
    placeholder_text: str = "Type your message..."
    branding_enabled: bool = True
    custom_css: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class WidgetCreate(BaseModel):
    agent_id: str
    theme: Optional[WidgetTheme] = None
    position: Optional[WidgetPosition] = None
    behavior: Optional[WidgetBehavior] = None
    welcome_message: Optional[str] = None
    placeholder_text: Optional[str] = None
    branding_enabled: bool = True
    custom_css: Optional[str] = None

class EmbedCode(BaseModel):
    agent_id: str
    widget_id: str
    html_code: str
    javascript_code: str
    css_code: str
    integration_instructions: str
    generated_at: datetime

class WidgetStats(BaseModel):
    widget_id: str
    total_views: int
    total_interactions: int
    conversion_rate: float
    avg_session_duration: float
    last_updated: datetime

# Storage
widgets_db: List[WidgetCustomization] = []
widget_stats_db: List[WidgetStats] = []

# Widget Templates
WIDGET_TEMPLATES = {
    "modern": {
        "theme": WidgetTheme(
            primary_color="#007bff",
            secondary_color="#f8f9fa",
            background_color="#ffffff",
            text_color="#333333",
            border_radius=12,
            font_family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        ),
        "description": "Clean and modern design with rounded corners"
    },
    "professional": {
        "theme": WidgetTheme(
            primary_color="#2c3e50",
            secondary_color="#ecf0f1",
            background_color="#ffffff",
            text_color="#2c3e50",
            border_radius=4,
            font_family="'Arial', sans-serif"
        ),
        "description": "Professional corporate style"
    },
    "friendly": {
        "theme": WidgetTheme(
            primary_color="#28a745",
            secondary_color="#d4edda",
            background_color="#f8fff8",
            text_color="#155724",
            border_radius=20,
            font_family="'Comic Sans MS', cursive"
        ),
        "description": "Warm and approachable design"
    },
    "minimal": {
        "theme": WidgetTheme(
            primary_color="#6c757d",
            secondary_color="#f8f9fa",
            background_color="#ffffff",
            text_color="#495057",
            border_radius=0,
            font_family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        ),
        "description": "Clean minimal design"
    }
}

# Business Logic Functions
def generate_widget_css(customization: WidgetCustomization) -> str:
    """Generate CSS for widget customization"""
    theme = customization.theme
    position = customization.position
    
    css = f"""
/* AgentHub Widget Styles */
.agenthub-widget-container {{
    position: fixed;
    {position.position.split('-')[1]}: {position.offset_x}px;
    {position.position.split('-')[0]}: {position.offset_y}px;
    z-index: 9999;
    font-family: {theme.font_family};
}}

.agenthub-widget-button {{
    width: 60px;
    height: 60px;
    border-radius: {theme.border_radius}px;
    background-color: {theme.primary_color};
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}}

.agenthub-widget-button:hover {{
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}}

.agenthub-widget-chat {{
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 350px;
    height: 500px;
    background-color: {theme.background_color};
    border-radius: {theme.border_radius}px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    display: none;
    flex-direction: column;
    overflow: hidden;
}}

.agenthub-widget-header {{
    background-color: {theme.primary_color};
    color: white;
    padding: 15px;
    font-weight: bold;
    text-align: center;
}}

.agenthub-widget-messages {{
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    background-color: {theme.background_color};
}}

.agenthub-widget-input {{
    padding: 15px;
    border-top: 1px solid {theme.secondary_color};
    background-color: {theme.background_color};
}}

.agenthub-widget-input input {{
    width: 100%;
    padding: 10px;
    border: 1px solid {theme.secondary_color};
    border-radius: {theme.border_radius // 2}px;
    font-family: {theme.font_family};
    color: {theme.text_color};
}}

.agenthub-message {{
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: {theme.border_radius // 2}px;
    max-width: 80%;
}}

.agenthub-message.user {{
    background-color: {theme.primary_color};
    color: white;
    margin-left: auto;
}}

.agenthub-message.agent {{
    background-color: {theme.secondary_color};
    color: {theme.text_color};
}}

.agenthub-branding {{
    font-size: 10px;
    text-align: center;
    color: {theme.secondary_color};
    padding: 5px;
}}

{customization.custom_css or ''}
"""
    return css

def generate_widget_javascript(customization: WidgetCustomization) -> str:
    """Generate JavaScript for widget functionality"""
    behavior = customization.behavior
    
    js = f"""
// AgentHub Widget JavaScript
(function() {{
    let widgetOpen = false;
    let sessionId = Math.random().toString(36).substring(7);
    
    function createWidget() {{
        const container = document.createElement('div');
        container.className = 'agenthub-widget-container';
        container.innerHTML = `
            <div class="agenthub-widget-chat" id="agenthub-chat">
                <div class="agenthub-widget-header">
                    Chat with us
                    <button onclick="toggleWidget()" style="float: right; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <div class="agenthub-widget-messages" id="agenthub-messages">
                    <div class="agenthub-message agent">{customization.welcome_message}</div>
                </div>
                <div class="agenthub-widget-input">
                    <input type="text" placeholder="{customization.placeholder_text}" id="agenthub-input" onkeypress="handleKeyPress(event)">
                </div>
                {('<div class="agenthub-branding">Powered by AgentHub</div>' if customization.branding_enabled else '')}
            </div>
            <button class="agenthub-widget-button" onclick="toggleWidget()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(container);
        
        {'setTimeout(() => { toggleWidget(); }, ' + str(behavior.auto_open_delay) + ');' if behavior.auto_open else ''}
    }}
    
    window.toggleWidget = function() {{
        const chat = document.getElementById('agenthub-chat');
        widgetOpen = !widgetOpen;
        chat.style.display = widgetOpen ? 'flex' : 'none';
        
        if (widgetOpen) {{
            document.getElementById('agenthub-input').focus();
        }}
    }}
    
    window.handleKeyPress = function(event) {{
        if (event.key === 'Enter') {{
            sendMessage();
        }}
    }}
    
    function sendMessage() {{
        const input = document.getElementById('agenthub-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        {'showTypingIndicator();' if behavior.enable_typing_indicator else ''}
        
        // Send to agent service
        fetch('/api/agents/{customization.agent_id}/chat', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
                message: message,
                session_id: sessionId
            }})
        }})
        .then(response => response.json())
        .then(data => {{
            {'hideTypingIndicator();' if behavior.enable_typing_indicator else ''}
            addMessage(data.response || 'Sorry, I could not process your request.', 'agent');
        }})
        .catch(error => {{
            {'hideTypingIndicator();' if behavior.enable_typing_indicator else ''}
            addMessage('Sorry, there was an error processing your request.', 'agent');
        }});
    }}
    
    function addMessage(text, sender) {{
        const messages = document.getElementById('agenthub-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `agenthub-message ${{sender}}`;
        messageDiv.textContent = text;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }}
    
    {'function showTypingIndicator() { addMessage("...", "agent typing"); }' if behavior.enable_typing_indicator else ''}
    {'function hideTypingIndicator() { const typing = document.querySelector(".agenthub-message.agent.typing"); if (typing) typing.remove(); }' if behavior.enable_typing_indicator else ''}
    
    // Initialize widget when DOM is ready
    if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', createWidget);
    }} else {{
        createWidget();
    }}
}})();
"""
    return js

def generate_embed_code(customization: WidgetCustomization) -> EmbedCode:
    """Generate complete embed code for widget"""
    css_code = generate_widget_css(customization)
    js_code = generate_widget_javascript(customization)
    
    html_code = f"""
<!-- AgentHub Widget Integration -->
<style>
{css_code}
</style>
<script>
{js_code}
</script>
"""
    
    instructions = f"""
# AgentHub Widget Integration Instructions

## Quick Integration
Copy and paste this code just before the closing </body> tag of your website:

```html
{html_code}
```

## Customization Options
- Widget Position: {customization.position.position}
- Primary Color: {customization.theme.primary_color}
- Auto-open: {'Enabled' if customization.behavior.auto_open else 'Disabled'}
- Branding: {'Enabled' if customization.branding_enabled else 'Disabled'}

## Testing
1. Save your HTML file
2. Open in a web browser
3. Look for the chat widget in the {customization.position.position} corner
4. Click to test the conversation

## Support
For customization help, contact AgentHub support.
"""
    
    return EmbedCode(
        agent_id=customization.agent_id,
        widget_id=customization.id,
        html_code=html_code,
        javascript_code=js_code,
        css_code=css_code,
        integration_instructions=instructions,
        generated_at=datetime.now()
    )

def create_sample_data():
    """Create sample widget data"""
    sample_widget = WidgetCustomization(
        id=str(uuid.uuid4()),
        agent_id="agent-1",
        theme=WidgetTheme(),
        position=WidgetPosition(),
        behavior=WidgetBehavior(),
        welcome_message="Welcome! How can I assist you today?",
        placeholder_text="Type your message here...",
        branding_enabled=True,
        created_at=datetime.now()
    )
    widgets_db.append(sample_widget)
    
    # Sample stats
    sample_stats = WidgetStats(
        widget_id=sample_widget.id,
        total_views=156,
        total_interactions=42,
        conversion_rate=26.9,
        avg_session_duration=2.5,
        last_updated=datetime.now()
    )
    widget_stats_db.append(sample_stats)

# Initialize sample data
create_sample_data()

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "widget-service",
        "version": "1.0.0",
        "widgets_count": len(widgets_db),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/widgets", response_model=WidgetCustomization)
async def create_widget(widget: WidgetCreate):
    """Create a new widget customization"""
    customization = WidgetCustomization(
        id=str(uuid.uuid4()),
        agent_id=widget.agent_id,
        theme=widget.theme or WidgetTheme(),
        position=widget.position or WidgetPosition(),
        behavior=widget.behavior or WidgetBehavior(),
        welcome_message=widget.welcome_message or "Hello! How can I help you today?",
        placeholder_text=widget.placeholder_text or "Type your message...",
        branding_enabled=widget.branding_enabled,
        custom_css=widget.custom_css,
        created_at=datetime.now()
    )
    
    widgets_db.append(customization)
    return customization

@app.get("/api/widgets", response_model=List[WidgetCustomization])
async def get_widgets(agent_id: Optional[str] = None):
    """Get all widgets or filter by agent_id"""
    if agent_id:
        return [w for w in widgets_db if w.agent_id == agent_id]
    return widgets_db

@app.get("/api/widgets/{widget_id}", response_model=WidgetCustomization)
async def get_widget(widget_id: str):
    """Get specific widget"""
    widget = next((w for w in widgets_db if w.id == widget_id), None)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widget

@app.patch("/api/widgets/{widget_id}", response_model=WidgetCustomization)
async def update_widget(widget_id: str, update_data: WidgetCreate):
    """Update widget customization"""
    widget = next((w for w in widgets_db if w.id == widget_id), None)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    # Update fields
    if update_data.theme:
        widget.theme = update_data.theme
    if update_data.position:
        widget.position = update_data.position
    if update_data.behavior:
        widget.behavior = update_data.behavior
    if update_data.welcome_message:
        widget.welcome_message = update_data.welcome_message
    if update_data.placeholder_text:
        widget.placeholder_text = update_data.placeholder_text
    if update_data.custom_css is not None:
        widget.custom_css = update_data.custom_css
    
    widget.branding_enabled = update_data.branding_enabled
    widget.updated_at = datetime.now()
    
    return widget

@app.delete("/api/widgets/{widget_id}")
async def delete_widget(widget_id: str):
    """Delete widget"""
    global widgets_db
    widget = next((w for w in widgets_db if w.id == widget_id), None)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widgets_db = [w for w in widgets_db if w.id != widget_id]
    return {"message": "Widget deleted successfully"}

@app.get("/api/widgets/{widget_id}/embed", response_model=EmbedCode)
async def get_embed_code(widget_id: str):
    """Get embed code for widget"""
    widget = next((w for w in widgets_db if w.id == widget_id), None)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    return generate_embed_code(widget)

@app.get("/api/widgets/{widget_id}/preview", response_class=HTMLResponse)
async def preview_widget(widget_id: str):
    """Get widget preview HTML"""
    widget = next((w for w in widgets_db if w.id == widget_id), None)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    embed_code = generate_embed_code(widget)
    
    preview_html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Widget Preview - AgentHub</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .preview-info {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
    </style>
</head>
<body>
    <div class="preview-info">
        <h1>Widget Preview</h1>
        <p><strong>Agent ID:</strong> {widget.agent_id}</p>
        <p><strong>Position:</strong> {widget.position.position}</p>
        <p><strong>Theme:</strong> {widget.theme.primary_color}</p>
        <p>This is a preview of your widget. The chat button should appear in the {widget.position.position} corner.</p>
    </div>
    
    {embed_code.html_code}
</body>
</html>
"""
    
    return HTMLResponse(content=preview_html)

@app.get("/api/widgets/{widget_id}/stats", response_model=WidgetStats)
async def get_widget_stats(widget_id: str):
    """Get widget usage statistics"""
    stats = next((s for s in widget_stats_db if s.widget_id == widget_id), None)
    if not stats:
        # Create default stats if none exist
        stats = WidgetStats(
            widget_id=widget_id,
            total_views=0,
            total_interactions=0,
            conversion_rate=0.0,
            avg_session_duration=0.0,
            last_updated=datetime.now()
        )
        widget_stats_db.append(stats)
    
    return stats

@app.post("/api/widgets/{widget_id}/track")
async def track_widget_event(widget_id: str, event_type: str):
    """Track widget events (views, interactions, etc.)"""
    stats = next((s for s in widget_stats_db if s.widget_id == widget_id), None)
    if not stats:
        stats = WidgetStats(
            widget_id=widget_id,
            total_views=0,
            total_interactions=0,
            conversion_rate=0.0,
            avg_session_duration=0.0,
            last_updated=datetime.now()
        )
        widget_stats_db.append(stats)
    
    if event_type == "view":
        stats.total_views += 1
    elif event_type == "interaction":
        stats.total_interactions += 1
    
    # Recalculate conversion rate
    if stats.total_views > 0:
        stats.conversion_rate = (stats.total_interactions / stats.total_views) * 100
    
    stats.last_updated = datetime.now()
    
    return {"message": f"Event '{event_type}' tracked for widget {widget_id}"}

@app.get("/api/templates")
async def get_widget_templates():
    """Get available widget templates"""
    return {
        "templates": WIDGET_TEMPLATES,
        "count": len(WIDGET_TEMPLATES)
    }

@app.post("/api/widgets/from-template")
async def create_widget_from_template(agent_id: str, template_name: str):
    """Create widget from predefined template"""
    if template_name not in WIDGET_TEMPLATES:
        raise HTTPException(status_code=400, detail="Template not found")
    
    template = WIDGET_TEMPLATES[template_name]
    
    widget_data = WidgetCreate(
        agent_id=agent_id,
        theme=template["theme"],
        position=WidgetPosition(),
        behavior=WidgetBehavior()
    )
    
    return await create_widget(widget_data)

if __name__ == "__main__":
    import uvicorn
    print("Starting Widget Service on http://0.0.0.0:8005")
    uvicorn.run(app, host="0.0.0.0", port=8005, log_level="info")