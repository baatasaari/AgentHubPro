"""
Unit Tests for Analytics Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime, timedelta
import json

ANALYTICS_URL = "http://localhost:8002"

class TestAnalyticsService:
    """Test suite for Analytics Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=ANALYTICS_URL)
    
    @pytest.fixture
    def sample_conversation_data(self):
        return {
            "agent_id": "test-agent-analytics",
            "conversation_id": "conv-123",
            "message_count": 5,
            "tokens_used": 150,
            "cost": 0.003,
            "response_time": 1.2,
            "user_satisfaction": 4.5,
            "conversation_type": "customer_support"
        }
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "analytics-service"
        assert data["status"] in ["healthy", "degraded"]
    
    @pytest.mark.asyncio
    async def test_track_conversation(self, client, sample_conversation_data):
        """Test conversation tracking"""
        response = await client.post("/api/analytics/conversations", json=sample_conversation_data)
        assert response.status_code in [201, 200]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "conversation_id" in data or "id" in data
    
    @pytest.mark.asyncio
    async def test_get_agent_performance(self, client):
        """Test agent performance metrics"""
        agent_id = "test-agent-analytics"
        response = await client.get(f"/api/analytics/agents/{agent_id}/performance")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "conversation_count" in data or "total_conversations" in data
    
    @pytest.mark.asyncio
    async def test_get_usage_metrics(self, client):
        """Test overall usage metrics"""
        response = await client.get("/api/analytics/usage")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_conversation_history(self, client):
        """Test conversation history retrieval"""
        response = await client.get("/api/analytics/conversations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

if __name__ == "__main__":
    async def smoke_test():
        async with httpx.AsyncClient(base_url=ANALYTICS_URL) as client:
            try:
                response = await client.get("/health")
                print(f"Analytics Health: {response.status_code}")
                return response.status_code == 200
            except Exception as e:
                print(f"Analytics Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"Analytics Service Available: {result}")