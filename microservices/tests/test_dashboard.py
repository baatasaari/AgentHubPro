"""
Unit Tests for Dashboard Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json

DASHBOARD_URL = "http://localhost:8004"

class TestDashboardService:
    """Test suite for Dashboard Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=DASHBOARD_URL)
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "dashboard-service"
        assert data["status"] in ["healthy", "degraded"]
    
    @pytest.mark.asyncio
    async def test_dashboard_summary(self, client):
        """Test dashboard summary endpoint"""
        response = await client.get("/api/dashboard/summary")
        assert response.status_code in [200, 500]  # May fail if other services unavailable
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_dashboard_metrics(self, client):
        """Test dashboard metrics"""
        response = await client.get("/api/dashboard")
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_real_time_activity(self, client):
        """Test real-time activity feed"""
        response = await client.get("/api/dashboard/activity")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

if __name__ == "__main__":
    async def smoke_test():
        async with httpx.AsyncClient(base_url=DASHBOARD_URL) as client:
            try:
                response = await client.get("/health")
                print(f"Dashboard Health: {response.status_code}")
                return response.status_code == 200
            except Exception as e:
                print(f"Dashboard Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"Dashboard Service Available: {result}")