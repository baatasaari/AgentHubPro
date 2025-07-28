"""
Unit Tests for Agent Wizard Service
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json

# Test Configuration
AGENT_WIZARD_URL = "http://localhost:8001"

class TestAgentWizardService:
    """Test suite for Agent Wizard Service"""
    
    @pytest.fixture
    def client(self):
        return httpx.AsyncClient(base_url=AGENT_WIZARD_URL)
    
    @pytest.fixture
    def sample_agent_data(self):
        return {
            "business_name": "Test Healthcare Corp",
            "business_description": "Healthcare AI assistant for patient inquiries",
            "business_domain": "https://testhealthcare.com",
            "industry": "healthcare",
            "llm_model": "gpt-4-turbo",
            "interface_type": "webchat"
        }
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "agent-wizard"
        assert data["status"] in ["healthy", "degraded"]
        assert "version" in data
        assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_create_agent_valid_data(self, client, sample_agent_data):
        """Test creating agent with valid data"""
        response = await client.post("/api/agents", json=sample_agent_data)
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["business_name"] == sample_agent_data["business_name"]
        assert data["industry"] == sample_agent_data["industry"]
        assert data["status"] == "draft"
        return data["id"]  # Return for cleanup
    
    @pytest.mark.asyncio
    async def test_create_agent_invalid_data(self, client):
        """Test creating agent with invalid data"""
        invalid_data = {
            "business_name": "",  # Empty name
            "industry": "invalid_industry",  # Invalid industry
            "llm_model": "invalid_model"  # Invalid model
        }
        response = await client.post("/api/agents", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_get_agents_list(self, client):
        """Test retrieving agents list"""
        response = await client.get("/api/agents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_agent_by_id(self, client, sample_agent_data):
        """Test retrieving specific agent"""
        # First create an agent
        create_response = await client.post("/api/agents", json=sample_agent_data)
        agent_id = create_response.json()["id"]
        
        # Then retrieve it
        response = await client.get(f"/api/agents/{agent_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == agent_id
        assert data["business_name"] == sample_agent_data["business_name"]
    
    @pytest.mark.asyncio
    async def test_update_agent(self, client, sample_agent_data):
        """Test updating agent"""
        # Create agent
        create_response = await client.post("/api/agents", json=sample_agent_data)
        agent_id = create_response.json()["id"]
        
        # Update agent
        update_data = {"business_name": "Updated Healthcare Corp"}
        response = await client.patch(f"/api/agents/{agent_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = await client.get(f"/api/agents/{agent_id}")
        assert get_response.json()["business_name"] == "Updated Healthcare Corp"
    
    @pytest.mark.asyncio
    async def test_delete_agent(self, client, sample_agent_data):
        """Test deleting agent"""
        # Create agent
        create_response = await client.post("/api/agents", json=sample_agent_data)
        agent_id = create_response.json()["id"]
        
        # Delete agent
        response = await client.delete(f"/api/agents/{agent_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = await client.get(f"/api/agents/{agent_id}")
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_system_prompt_generation(self, client, sample_agent_data):
        """Test system prompt generation"""
        response = await client.post("/api/system-prompt", json=sample_agent_data)
        assert response.status_code == 200
        data = response.json()
        assert "system_prompt" in data
        assert len(data["system_prompt"]) > 0
        assert "healthcare" in data["system_prompt"].lower()
    
    @pytest.mark.asyncio
    async def test_industry_metadata(self, client):
        """Test industry metadata endpoint"""
        response = await client.get("/api/industries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "healthcare" in data
        assert "retail" in data
        
        # Test specific industry
        response = await client.get("/api/industries/healthcare")
        assert response.status_code == 200
        industry_data = response.json()
        assert "description" in industry_data
        assert "system_prompt_template" in industry_data
    
    @pytest.mark.asyncio
    async def test_llm_model_validation(self, client):
        """Test LLM model validation"""
        response = await client.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert any(model["id"] == "gpt-4-turbo" for model in data)
        
        # Test model compatibility
        response = await client.post("/api/models/validate", json={
            "model": "gpt-4-turbo",
            "industry": "healthcare"
        })
        assert response.status_code == 200
        result = response.json()
        assert "compatible" in result
        assert "cost_estimate" in result
    
    @pytest.mark.asyncio
    async def test_chat_capabilities(self, client, sample_agent_data):
        """Test chat capabilities"""
        # Create agent
        create_response = await client.post("/api/agents", json=sample_agent_data)
        agent_id = create_response.json()["id"]
        
        # Test chat
        chat_data = {
            "message": "Hello, I need help with medical records",
            "conversation_id": "test-conversation"
        }
        response = await client.post(f"/api/agents/{agent_id}/chat", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert len(data["response"]) > 0

@pytest.mark.asyncio
async def test_performance_benchmarks():
    """Performance and load testing"""
    async with httpx.AsyncClient(base_url=AGENT_WIZARD_URL) as client:
        # Test concurrent agent creation
        tasks = []
        for i in range(10):
            agent_data = {
                "business_name": f"Performance Test {i}",
                "business_description": "Load testing agent",
                "business_domain": f"https://test{i}.com",
                "industry": "technology",
                "llm_model": "gpt-3.5-turbo",
                "interface_type": "webchat"
            }
            tasks.append(client.post("/api/agents", json=agent_data))
        
        responses = await asyncio.gather(*tasks)
        successful_creates = sum(1 for r in responses if r.status_code == 201)
        assert successful_creates >= 8  # Allow for some failures under load

if __name__ == "__main__":
    # Run basic smoke test
    async def smoke_test():
        async with httpx.AsyncClient(base_url=AGENT_WIZARD_URL) as client:
            try:
                response = await client.get("/health")
                print(f"Agent Wizard Health: {response.status_code}")
                print(f"Response: {response.json()}")
                return response.status_code == 200
            except Exception as e:
                print(f"Agent Wizard Service not available: {e}")
                return False
    
    result = asyncio.run(smoke_test())
    print(f"Agent Wizard Service Available: {result}")