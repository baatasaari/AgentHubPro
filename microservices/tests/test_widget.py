"""
Unit Tests for Widget Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json

WIDGET_URL = "http://localhost:8005"

class TestWidgetService:
    """Test suite for Widget Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=WIDGET_URL)
    
    @pytest.fixture
    def sample_widget_data(self):
        return {
            "agent_id": "test-agent-widget",
            "theme": {
                "primary_color": "#3b82f6",
                "secondary_color": "#f3f4f6",
                "position": "bottom-right",
                "border_radius": 8,
                "auto_open": False
            },
            "settings": {
                "show_branding": True,
                "welcome_message": "Hello! How can I help you today?",
                "placeholder_text": "Type your message..."
            }
        }
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "widget-service"
        assert data["status"] in ["healthy", "degraded"]
    
    @pytest.mark.asyncio
    async def test_create_widget(self, client, sample_widget_data):
        """Test widget creation"""
        response = await client.post("/api/widgets", json=sample_widget_data)
        assert response.status_code in [201, 200]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data or "widget_id" in data
            return data.get("id") or data.get("widget_id")
    
    @pytest.mark.asyncio
    async def test_get_widgets(self, client):
        """Test widget retrieval"""
        response = await client.get("/api/widgets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_widget_templates(self, client):
        """Test widget templates"""
        response = await client.get("/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_generate_embed_code(self, client, sample_widget_data):
        """Test embed code generation"""
        # First create a widget
        create_response = await client.post("/api/widgets", json=sample_widget_data)
        if create_response.status_code in [200, 201]:
            widget_data = create_response.json()
            widget_id = widget_data.get("id") or widget_data.get("widget_id")
            
            if widget_id:
                # Then generate embed code
                response = await client.get(f"/api/widgets/{widget_id}/embed")
                assert response.status_code == 200
                data = response.json()
                assert "embed_code" in data or "code" in data

if __name__ == "__main__":
    async def smoke_test():
        async with httpx.AsyncClient(base_url=WIDGET_URL) as client:
            try:
                response = await client.get("/health")
                print(f"Widget Health: {response.status_code}")
                return response.status_code == 200
            except Exception as e:
                print(f"Widget Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"Widget Service Available: {result}")