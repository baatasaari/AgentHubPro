"""
Unit Tests for Billing Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json

BILLING_URL = "http://localhost:8003"

class TestBillingService:
    """Test suite for Billing Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=BILLING_URL)
    
    @pytest.fixture
    def sample_usage_data(self):
        return {
            "agent_id": "test-agent-billing",
            "tokens_used": 1000,
            "model": "gpt-4-turbo",
            "conversation_id": "billing-test-conv"
        }
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "billing-service"
        assert data["status"] in ["healthy", "degraded"]
    
    @pytest.mark.asyncio
    async def test_track_usage(self, client, sample_usage_data):
        """Test usage tracking"""
        response = await client.post("/api/billing/usage", json=sample_usage_data)
        assert response.status_code in [201, 200]
    
    @pytest.mark.asyncio
    async def test_get_billing_summary(self, client):
        """Test billing summary"""
        response = await client.get("/api/billing/summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_cost_estimation(self, client):
        """Test cost estimation"""
        estimation_data = {
            "tokens": 1000,
            "model": "gpt-4-turbo"
        }
        response = await client.post("/api/billing/estimate", json=estimation_data)
        assert response.status_code == 200
        data = response.json()
        assert "estimated_cost" in data

if __name__ == "__main__":
    async def smoke_test():
        async with httpx.AsyncClient(base_url=BILLING_URL) as client:
            try:
                response = await client.get("/health")
                print(f"Billing Health: {response.status_code}")
                return response.status_code == 200
            except Exception as e:
                print(f"Billing Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"Billing Service Available: {result}")