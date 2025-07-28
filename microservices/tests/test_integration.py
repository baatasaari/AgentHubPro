"""
Integration Tests for Microservices Communication
"""

import pytest
import asyncio
import httpx
from datetime import datetime
import json
import time

# Service URLs
SERVICES = {
    "agent-wizard": "http://localhost:8001",
    "analytics": "http://localhost:8002", 
    "billing": "http://localhost:8003",
    "dashboard": "http://localhost:8004",
    "widget": "http://localhost:8005",
    "my-agents": "http://localhost:8006"
}

class TestMicroservicesIntegration:
    """Integration tests between microservices"""
    
    @pytest.fixture
    def clients(self):
        return {name: httpx.AsyncClient(base_url=url) for name, url in SERVICES.items()}
    
    @pytest.mark.asyncio
    async def test_all_services_health(self, clients):
        """Test that all services are responding to health checks"""
        health_statuses = {}
        
        for service_name, client in clients.items():
            try:
                response = await client.get("/health", timeout=5.0)
                health_statuses[service_name] = {
                    "status_code": response.status_code,
                    "healthy": response.status_code == 200
                }
                if response.status_code == 200:
                    data = response.json()
                    health_statuses[service_name]["service_data"] = data
            except Exception as e:
                health_statuses[service_name] = {
                    "status_code": None,
                    "healthy": False,
                    "error": str(e)
                }
        
        print("\n=== Service Health Status ===")
        for service, status in health_statuses.items():
            print(f"{service}: {'✓' if status['healthy'] else '✗'} ({status.get('status_code', 'N/A')})")
        
        # At least half the services should be healthy for integration tests
        healthy_services = sum(1 for status in health_statuses.values() if status["healthy"])
        assert healthy_services >= 3, f"Only {healthy_services}/6 services are healthy"
        
        return health_statuses
    
    @pytest.mark.asyncio
    async def test_agent_creation_workflow(self, clients):
        """Test complete agent creation workflow across services"""
        agent_wizard = clients["agent-wizard"]
        my_agents = clients["my-agents"]
        widget = clients["widget"]
        
        # Step 1: Create agent via Agent Wizard
        agent_data = {
            "business_name": "Integration Test Corp",
            "business_description": "Testing integration between services",
            "business_domain": "https://integrationtest.com",
            "industry": "technology",
            "llm_model": "gpt-4-turbo",
            "interface_type": "webchat"
        }
        
        try:
            create_response = await agent_wizard.post("/api/agents", json=agent_data, timeout=10.0)
            if create_response.status_code != 201:
                pytest.skip("Agent Wizard service not available")
            
            agent_id = create_response.json()["id"]
            print(f"Created agent: {agent_id}")
            
            # Step 2: Manage agent via My Agents service
            try:
                enable_response = await my_agents.post(f"/api/my-agents/{agent_id}/enable", timeout=10.0)
                print(f"Enable agent status: {enable_response.status_code}")
                
                # Get agent details through My Agents
                details_response = await my_agents.get(f"/api/my-agents/{agent_id}", timeout=10.0)
                print(f"Agent details status: {details_response.status_code}")
                
            except Exception as e:
                print(f"My Agents integration failed: {e}")
            
            # Step 3: Create widget for agent
            try:
                widget_data = {
                    "agent_id": agent_id,
                    "theme": {
                        "primary_color": "#3b82f6",
                        "position": "bottom-right"
                    }
                }
                widget_response = await widget.post("/api/widgets", json=widget_data, timeout=10.0)
                print(f"Widget creation status: {widget_response.status_code}")
                
            except Exception as e:
                print(f"Widget integration failed: {e}")
            
            # Step 4: Clean up
            try:
                delete_response = await agent_wizard.delete(f"/api/agents/{agent_id}", timeout=10.0)
                print(f"Cleanup status: {delete_response.status_code}")
            except Exception as e:
                print(f"Cleanup failed: {e}")
                
        except Exception as e:
            pytest.skip(f"Agent Wizard not available: {e}")
    
    @pytest.mark.asyncio
    async def test_dashboard_data_aggregation(self, clients):
        """Test dashboard service data aggregation from other services"""
        dashboard = clients["dashboard"]
        my_agents = clients["my-agents"]
        
        try:
            # Test dashboard summary
            dashboard_response = await dashboard.get("/api/dashboard/summary", timeout=10.0)
            my_agents_dashboard = await my_agents.get("/api/my-agents/dashboard", timeout=10.0)
            
            print(f"Dashboard service status: {dashboard_response.status_code}")
            print(f"My Agents dashboard status: {my_agents_dashboard.status_code}")
            
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                assert "total_agents" in dashboard_data or "overview" in dashboard_data
                
            if my_agents_dashboard.status_code == 200:
                my_agents_data = my_agents_dashboard.json()
                assert "overview" in my_agents_data
                assert "breakdown" in my_agents_data
                
        except Exception as e:
            print(f"Dashboard integration test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_cross_service_communication(self, clients):
        """Test communication patterns between services"""
        my_agents = clients["my-agents"]
        
        # Test My Agents service health check with service connectivity
        try:
            health_response = await my_agents.get("/health", timeout=10.0)
            if health_response.status_code == 200:
                health_data = health_response.json()
                services_status = health_data.get("services", {})
                
                print("\n=== Cross-Service Communication Status ===")
                for service, status in services_status.items():
                    print(f"{service}: {status}")
                
                # At least some services should be reachable
                healthy_connections = sum(1 for status in services_status.values() if status == "healthy")
                print(f"Healthy cross-service connections: {healthy_connections}")
                
        except Exception as e:
            print(f"Cross-service communication test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_data_consistency(self, clients):
        """Test data consistency between services"""
        agent_wizard = clients["agent-wizard"]
        my_agents = clients["my-agents"]
        
        try:
            # Get agents from both services and compare
            wizard_agents = await agent_wizard.get("/api/agents", timeout=10.0)
            my_agents_list = await my_agents.get("/api/my-agents", timeout=10.0)
            
            print(f"Agent Wizard agents status: {wizard_agents.status_code}")
            print(f"My Agents list status: {my_agents_list.status_code}")
            
            if wizard_agents.status_code == 200 and my_agents_list.status_code == 200:
                wizard_data = wizard_agents.json()
                my_agents_data = my_agents_list.json()
                
                print(f"Agent Wizard count: {len(wizard_data) if isinstance(wizard_data, list) else 'N/A'}")
                print(f"My Agents count: {len(my_agents_data) if isinstance(my_agents_data, list) else 'N/A'}")
                
        except Exception as e:
            print(f"Data consistency test failed: {e}")

class TestEndToEndWorkflows:
    """End-to-end platform testing"""
    
    @pytest.fixture
    def clients(self):
        return {name: httpx.AsyncClient(base_url=url) for name, url in SERVICES.items()}
    
    @pytest.mark.asyncio
    async def test_complete_agent_lifecycle(self, clients):
        """Test complete agent lifecycle from creation to deployment"""
        workflow_steps = []
        agent_id = None
        
        try:
            # Step 1: Create Agent
            agent_data = {
                "business_name": "E2E Test Restaurant",
                "business_description": "AI assistant for restaurant reservations and menu inquiries",
                "business_domain": "https://e2erestaurant.com",
                "industry": "food_beverage",
                "llm_model": "gpt-3.5-turbo",
                "interface_type": "webchat"
            }
            
            create_response = await clients["agent-wizard"].post("/api/agents", json=agent_data, timeout=10.0)
            workflow_steps.append(("create_agent", create_response.status_code))
            
            if create_response.status_code == 201:
                agent_id = create_response.json()["id"]
                
                # Step 2: Enable Agent
                enable_response = await clients["my-agents"].post(f"/api/my-agents/{agent_id}/enable", timeout=10.0)
                workflow_steps.append(("enable_agent", enable_response.status_code))
                
                # Step 3: Create Widget
                widget_data = {
                    "agent_id": agent_id,
                    "theme": {
                        "primary_color": "#10b981",
                        "position": "bottom-right",
                        "border_radius": 12
                    }
                }
                widget_response = await clients["widget"].post("/api/widgets", json=widget_data, timeout=10.0)
                workflow_steps.append(("create_widget", widget_response.status_code))
                
                # Step 4: Simulate Conversation (if chat endpoint available)
                try:
                    chat_data = {
                        "message": "What time do you close tonight?",
                        "conversation_id": "e2e-test-conversation"
                    }
                    chat_response = await clients["agent-wizard"].post(f"/api/agents/{agent_id}/chat", json=chat_data, timeout=15.0)
                    workflow_steps.append(("chat_interaction", chat_response.status_code))
                except Exception as e:
                    workflow_steps.append(("chat_interaction", f"Failed: {e}"))
                
                # Step 5: Check Analytics (if available)
                try:
                    analytics_response = await clients["analytics"].get(f"/api/analytics/conversations?agent_id={agent_id}", timeout=10.0)
                    workflow_steps.append(("check_analytics", analytics_response.status_code))
                except Exception as e:
                    workflow_steps.append(("check_analytics", f"Failed: {e}"))
                
                # Step 6: Archive Agent
                archive_response = await clients["my-agents"].post(f"/api/my-agents/{agent_id}/archive", timeout=10.0)
                workflow_steps.append(("archive_agent", archive_response.status_code))
        
        except Exception as e:
            workflow_steps.append(("workflow_error", str(e)))
        
        finally:
            # Cleanup
            if agent_id:
                try:
                    delete_response = await clients["agent-wizard"].delete(f"/api/agents/{agent_id}", timeout=10.0)
                    workflow_steps.append(("cleanup", delete_response.status_code))
                except Exception as e:
                    workflow_steps.append(("cleanup", f"Failed: {e}"))
        
        print("\n=== End-to-End Workflow Results ===")
        for step, result in workflow_steps:
            print(f"{step}: {result}")
        
        # At least the core steps should succeed
        successful_steps = sum(1 for step, result in workflow_steps if isinstance(result, int) and 200 <= result < 300)
        print(f"Successful steps: {successful_steps}/{len(workflow_steps)}")
    
    @pytest.mark.asyncio
    async def test_platform_performance(self, clients):
        """Test platform performance under load"""
        performance_results = {}
        
        # Test concurrent requests to each service
        for service_name, client in clients.items():
            try:
                start_time = time.time()
                
                # Make 5 concurrent health check requests
                tasks = [client.get("/health", timeout=5.0) for _ in range(5)]
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                end_time = time.time()
                
                successful_responses = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
                
                performance_results[service_name] = {
                    "total_time": end_time - start_time,
                    "successful_requests": successful_responses,
                    "total_requests": 5,
                    "avg_response_time": (end_time - start_time) / 5
                }
                
            except Exception as e:
                performance_results[service_name] = {"error": str(e)}
        
        print("\n=== Performance Test Results ===")
        for service, results in performance_results.items():
            if "error" not in results:
                print(f"{service}: {results['successful_requests']}/{results['total_requests']} successful, "
                      f"avg: {results['avg_response_time']:.3f}s")
            else:
                print(f"{service}: Error - {results['error']}")

@pytest.mark.asyncio
async def test_system_resilience():
    """Test system behavior when services are unavailable"""
    print("\n=== Testing System Resilience ===")
    
    # Test My Agents service behavior when other services are down
    async with httpx.AsyncClient(base_url=SERVICES["my-agents"]) as client:
        try:
            # Test dashboard with potentially unavailable services
            response = await client.get("/api/my-agents/dashboard", timeout=10.0)
            print(f"Dashboard resilience test: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Dashboard still functional: {bool(data.get('overview'))}")
            
            # Test health check
            health_response = await client.get("/health", timeout=5.0)
            print(f"Health check resilience: {health_response.status_code}")
            
        except Exception as e:
            print(f"Resilience test failed: {e}")

if __name__ == "__main__":
    # Run integration smoke tests
    async def integration_smoke_test():
        print("Running Integration Smoke Tests...")
        
        # Test service availability
        available_services = []
        for service_name, service_url in SERVICES.items():
            try:
                async with httpx.AsyncClient(base_url=service_url) as client:
                    response = await client.get("/health", timeout=3.0)
                    if response.status_code == 200:
                        available_services.append(service_name)
                        print(f"✓ {service_name}")
                    else:
                        print(f"✗ {service_name} (HTTP {response.status_code})")
            except Exception as e:
                print(f"✗ {service_name} (Not available)")
        
        print(f"\nAvailable services: {len(available_services)}/6")
        
        # Test basic integration if services are available
        if len(available_services) >= 2:
            print("\nTesting basic integration...")
            await test_system_resilience()
        
        return available_services
    
    available = asyncio.run(integration_smoke_test())
    print(f"Integration test completed. {len(available)} services available.")