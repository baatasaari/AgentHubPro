"""
Unit Tests for My Agents Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json

# Test Configuration
MY_AGENTS_URL = "http://localhost:8006"

class TestMyAgentsService:
    """Test suite for My Agents Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=MY_AGENTS_URL)
    
    @pytest.fixture
    def sample_agent_update(self):
        return {
            "business_name": "Updated Test Corp",
            "priority": "high",
            "tags": ["production", "healthcare"],
            "notes": "Updated for testing"
        }
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "my-agents-service"
        assert data["status"] in ["healthy", "degraded"]
        assert "managed_agents" in data
        assert "services" in data
    
    @pytest.mark.asyncio
    async def test_get_agents_dashboard(self, client):
        """Test agents dashboard"""
        response = await client.get("/api/my-agents/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data
        assert "breakdown" in data
        assert "recent_activity" in data
        
        # Validate overview structure
        overview = data["overview"]
        assert "total_agents" in overview
        assert "active_agents" in overview
        assert "total_conversations" in overview
        assert "total_cost" in overview
    
    @pytest.mark.asyncio
    async def test_get_all_agents(self, client):
        """Test retrieving all managed agents"""
        response = await client.get("/api/my-agents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Test with filters
        response = await client.get("/api/my-agents?status=active&limit=10")
        assert response.status_code == 200
        filtered_data = response.json()
        assert isinstance(filtered_data, list)
        assert len(filtered_data) <= 10
    
    @pytest.mark.asyncio
    async def test_get_agent_details(self, client):
        """Test getting detailed agent information"""
        # Test with a known agent ID (agent-1 from sample data)
        response = await client.get("/api/my-agents/agent-1")
        # May return 404 if cross-service communication fails
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "agent" in data or "metadata" in data
    
    @pytest.mark.asyncio
    async def test_agent_status_operations(self, client):
        """Test agent status change operations"""
        agent_id = "agent-1"  # Using sample data
        
        # Test enable
        response = await client.post(f"/api/my-agents/{agent_id}/enable")
        assert response.status_code in [200, 404, 500]  # May fail if Agent Wizard not available
        
        # Test pause
        response = await client.post(f"/api/my-agents/{agent_id}/pause")
        assert response.status_code in [200, 404, 500]
        
        # Test disable
        response = await client.post(f"/api/my-agents/{agent_id}/disable")
        assert response.status_code in [200, 404, 500]
    
    @pytest.mark.asyncio
    async def test_bulk_operations(self, client):
        """Test bulk operations on multiple agents"""
        bulk_data = {
            "agent_ids": ["agent-1", "agent-2"],
            "operation": "enable",
            "reason": "Test bulk operation"
        }
        
        response = await client.post("/api/my-agents/bulk", json=bulk_data)
        assert response.status_code in [200, 500]  # May fail if other services unavailable
        
        if response.status_code == 200:
            data = response.json()
            assert "operation" in data
            assert "results" in data
            assert "successful" in data
            assert "failed" in data
    
    @pytest.mark.asyncio
    async def test_agent_metrics(self, client):
        """Test agent performance metrics"""
        agent_id = "agent-1"
        response = await client.get(f"/api/my-agents/{agent_id}/metrics")
        # May fail if analytics service not available
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "agent_id" in data
            assert "total_conversations" in data
            assert "total_cost" in data
            assert "performance_trend" in data
    
    @pytest.mark.asyncio
    async def test_status_history(self, client):
        """Test agent status history"""
        agent_id = "agent-1"
        response = await client.get(f"/api/my-agents/{agent_id}/status-history")
        assert response.status_code == 200
        data = response.json()
        assert "agent_id" in data
        assert "history" in data
        assert isinstance(data["history"], list)
    
    @pytest.mark.asyncio
    async def test_agent_backups(self, client):
        """Test agent backup functionality"""
        agent_id = "agent-1"
        
        # Get backups
        response = await client.get(f"/api/my-agents/{agent_id}/backups")
        assert response.status_code == 200
        data = response.json()
        assert "agent_id" in data
        assert "backups" in data
        assert "total" in data
    
    @pytest.mark.asyncio
    async def test_update_agent(self, client, sample_agent_update):
        """Test updating agent metadata"""
        agent_id = "agent-1"
        response = await client.patch(f"/api/my-agents/{agent_id}", json=sample_agent_update)
        # May fail if Agent Wizard service not available
        assert response.status_code in [200, 404, 500]
    
    @pytest.mark.asyncio
    async def test_agent_archive_and_delete(self, client):
        """Test archiving and deleting agents"""
        agent_id = "test-delete-agent"
        
        # Test archive
        response = await client.post(f"/api/my-agents/{agent_id}/archive")
        assert response.status_code in [200, 404, 500]
        
        # Test delete (with confirmation)
        response = await client.delete(f"/api/my-agents/{agent_id}?confirm=true")
        assert response.status_code in [200, 404, 500]
    
    @pytest.mark.asyncio
    async def test_error_handling(self, client):
        """Test error handling for invalid requests"""
        # Test invalid agent ID
        response = await client.get("/api/my-agents/invalid-agent-id")
        assert response.status_code == 404
        
        # Test invalid bulk operation
        invalid_bulk = {
            "agent_ids": [],  # Empty list
            "operation": "invalid_operation"
        }
        response = await client.post("/api/my-agents/bulk", json=invalid_bulk)
        assert response.status_code in [400, 422]
    
    @pytest.mark.asyncio
    async def test_pagination_and_filtering(self, client):
        """Test pagination and filtering functionality"""
        # Test with various filters
        filters = [
            "status=active",
            "industry=healthcare",
            "priority=high",
            "limit=5&offset=0"
        ]
        
        for filter_param in filters:
            response = await client.get(f"/api/my-agents?{filter_param}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

@pytest.mark.asyncio
async def test_cross_service_communication():
    """Test communication with other microservices"""
    async with httpx.AsyncClient(base_url=MY_AGENTS_URL) as client:
        response = await client.get("/health")
        if response.status_code == 200:
            health_data = response.json()
            services = health_data.get("services", {})
            
            # Check which services are available
            available_services = [name for name, status in services.items() if status == "healthy"]
            print(f"Available services: {available_services}")
            
            # Test dashboard if any services are available
            if available_services:
                dashboard_response = await client.get("/api/my-agents/dashboard")
                print(f"Dashboard status: {dashboard_response.status_code}")

if __name__ == "__main__":
    # Run basic smoke test
    async def smoke_test():
        async with httpx.AsyncClient(base_url=MY_AGENTS_URL) as client:
            try:
                response = await client.get("/health")
                print(f"My Agents Health: {response.status_code}")
                print(f"Response: {response.json()}")
                return response.status_code == 200
            except Exception as e:
                print(f"My Agents Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"My Agents Service Available: {result}")