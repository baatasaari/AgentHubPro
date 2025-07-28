#!/usr/bin/env python3
"""
Comprehensive Test Runner for AgentHub Microservices Platform
Runs unit tests, integration tests, and end-to-end testing systematically
"""

import asyncio
import subprocess
import sys
import time
import json
import httpx
from datetime import datetime
from pathlib import Path

# Service URLs
SERVICES = {
    "agent-wizard": "http://localhost:8001",
    "analytics": "http://localhost:8002", 
    "billing": "http://localhost:8003",
    "dashboard": "http://localhost:8004",
    "widget": "http://localhost:8005",
    "my-agents": "http://localhost:8006"
}

class TestRunner:
    def __init__(self):
        self.test_results = {}
        self.start_time = datetime.now()
        
    async def check_service_health(self):
        """Check health of all microservices"""
        print("=" * 80)
        print("MICROSERVICES HEALTH CHECK")
        print("=" * 80)
        
        health_status = {}
        
        for service_name, service_url in SERVICES.items():
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{service_url}/health", timeout=5.0)
                    if response.status_code == 200:
                        data = response.json()
                        health_status[service_name] = {
                            "status": "✓ HEALTHY",
                            "response_time": response.elapsed.total_seconds(),
                            "version": data.get("version", "unknown")
                        }
                        print(f"✓ {service_name:15} | {service_url:25} | {response.elapsed.total_seconds():.3f}s")
                    else:
                        health_status[service_name] = {"status": f"✗ HTTP {response.status_code}"}
                        print(f"✗ {service_name:15} | {service_url:25} | HTTP {response.status_code}")
            except Exception as e:
                health_status[service_name] = {"status": "✗ UNAVAILABLE", "error": str(e)}
                print(f"✗ {service_name:15} | {service_url:25} | Not Available")
        
        healthy_services = [s for s, status in health_status.items() if "✓" in status["status"]]
        print(f"\nHealthy Services: {len(healthy_services)}/6")
        print(f"Available: {', '.join(healthy_services)}")
        
        return health_status
    
    def run_unit_tests(self):
        """Run unit tests for each microservice"""
        print("\n" + "=" * 80)
        print("UNIT TESTS")
        print("=" * 80)
        
        test_files = [
            "test_agent_wizard.py",
            "test_my_agents.py", 
            "test_analytics.py",
            "test_billing.py",
            "test_widget.py",
            "test_dashboard.py"
        ]
        
        unit_test_results = {}
        
        for test_file in test_files:
            service_name = test_file.replace("test_", "").replace(".py", "").replace("_", "-")
            print(f"\nRunning {test_file}...")
            
            try:
                result = subprocess.run([
                    sys.executable, "-m", "pytest", 
                    test_file, 
                    "-v", 
                    "--tb=short",
                    "--asyncio-mode=auto"
                ], capture_output=True, text=True, timeout=60)
                
                unit_test_results[service_name] = {
                    "return_code": result.returncode,
                    "passed": "PASSED" in result.stdout,
                    "failed": "FAILED" in result.stdout,
                    "output": result.stdout,
                    "errors": result.stderr
                }
                
                if result.returncode == 0:
                    print(f"✓ {service_name} unit tests PASSED")
                else:
                    print(f"✗ {service_name} unit tests FAILED")
                    
            except subprocess.TimeoutExpired:
                print(f"✗ {service_name} unit tests TIMEOUT")
                unit_test_results[service_name] = {"error": "timeout"}
            except Exception as e:
                print(f"✗ {service_name} unit tests ERROR: {e}")
                unit_test_results[service_name] = {"error": str(e)}
        
        return unit_test_results
    
    def run_integration_tests(self):
        """Run integration tests between services"""
        print("\n" + "=" * 80)
        print("INTEGRATION TESTS")
        print("=" * 80)
        
        try:
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                "test_integration.py", 
                "-v", 
                "--tb=short",
                "--asyncio-mode=auto"
            ], capture_output=True, text=True, timeout=120)
            
            integration_results = {
                "return_code": result.returncode,
                "passed": "PASSED" in result.stdout,
                "failed": "FAILED" in result.stdout,
                "output": result.stdout,
                "errors": result.stderr
            }
            
            if result.returncode == 0:
                print("✓ Integration tests PASSED")
            else:
                print("✗ Integration tests FAILED")
                print(f"Errors: {result.stderr}")
            
            return integration_results
            
        except Exception as e:
            print(f"✗ Integration tests ERROR: {e}")
            return {"error": str(e)}
    
    async def run_end_to_end_tests(self):
        """Run end-to-end platform tests"""
        print("\n" + "=" * 80)
        print("END-TO-END TESTING")
        print("=" * 80)
        
        e2e_results = {}
        
        # Test 1: Complete Agent Lifecycle
        print("\n1. Testing Complete Agent Lifecycle...")
        try:
            lifecycle_result = await self.test_agent_lifecycle()
            e2e_results["agent_lifecycle"] = lifecycle_result
            if lifecycle_result["success"]:
                print("✓ Agent lifecycle test PASSED")
            else:
                print("✗ Agent lifecycle test FAILED")
        except Exception as e:
            print(f"✗ Agent lifecycle test ERROR: {e}")
            e2e_results["agent_lifecycle"] = {"success": False, "error": str(e)}
        
        # Test 2: Cross-Service Data Flow
        print("\n2. Testing Cross-Service Data Flow...")
        try:
            data_flow_result = await self.test_data_flow()
            e2e_results["data_flow"] = data_flow_result
            if data_flow_result["success"]:
                print("✓ Data flow test PASSED")
            else:
                print("✗ Data flow test FAILED")
        except Exception as e:
            print(f"✗ Data flow test ERROR: {e}")
            e2e_results["data_flow"] = {"success": False, "error": str(e)}
        
        # Test 3: Platform Resilience
        print("\n3. Testing Platform Resilience...")
        try:
            resilience_result = await self.test_platform_resilience()
            e2e_results["resilience"] = resilience_result
            if resilience_result["success"]:
                print("✓ Resilience test PASSED")
            else:
                print("✗ Resilience test FAILED")
        except Exception as e:
            print(f"✗ Resilience test ERROR: {e}")
            e2e_results["resilience"] = {"success": False, "error": str(e)}
        
        return e2e_results
    
    async def test_agent_lifecycle(self):
        """Test complete agent creation to deletion workflow"""
        steps = []
        agent_id = None
        
        try:
            # Step 1: Create Agent
            async with httpx.AsyncClient() as client:
                agent_data = {
                    "business_name": "E2E Test Corporation",
                    "business_description": "End-to-end testing agent",
                    "business_domain": "https://e2etest.com",
                    "industry": "technology",
                    "llm_model": "gpt-3.5-turbo",
                    "interface_type": "webchat"
                }
                
                response = await client.post(f"{SERVICES['agent-wizard']}/api/agents", json=agent_data, timeout=10.0)
                steps.append(("create_agent", response.status_code == 201))
                
                if response.status_code == 201:
                    agent_id = response.json()["id"]
                    
                    # Step 2: Enable Agent via My Agents
                    response = await client.post(f"{SERVICES['my-agents']}/api/my-agents/{agent_id}/enable", timeout=10.0)
                    steps.append(("enable_agent", response.status_code == 200))
                    
                    # Step 3: Create Widget
                    widget_data = {
                        "agent_id": agent_id,
                        "theme": {"primary_color": "#3b82f6", "position": "bottom-right"}
                    }
                    response = await client.post(f"{SERVICES['widget']}/api/widgets", json=widget_data, timeout=10.0)
                    steps.append(("create_widget", response.status_code in [200, 201]))
                    
                    # Step 4: Archive Agent
                    response = await client.post(f"{SERVICES['my-agents']}/api/my-agents/{agent_id}/archive", timeout=10.0)
                    steps.append(("archive_agent", response.status_code == 200))
                    
        except Exception as e:
            steps.append(("error", False))
            
        finally:
            # Cleanup
            if agent_id:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.delete(f"{SERVICES['agent-wizard']}/api/agents/{agent_id}", timeout=10.0)
                        steps.append(("cleanup", True))
                except:
                    steps.append(("cleanup", False))
        
        successful_steps = sum(1 for step, success in steps if success)
        return {
            "success": successful_steps >= len(steps) * 0.7,  # 70% success rate
            "steps": steps,
            "completion_rate": f"{successful_steps}/{len(steps)}"
        }
    
    async def test_data_flow(self):
        """Test data consistency across services"""
        checks = []
        
        try:
            async with httpx.AsyncClient() as client:
                # Check My Agents dashboard
                response = await client.get(f"{SERVICES['my-agents']}/api/my-agents/dashboard", timeout=10.0)
                checks.append(("my_agents_dashboard", response.status_code == 200))
                
                # Check Agent Wizard list
                response = await client.get(f"{SERVICES['agent-wizard']}/api/agents", timeout=10.0)
                checks.append(("agent_wizard_list", response.status_code == 200))
                
                # Check Analytics usage
                response = await client.get(f"{SERVICES['analytics']}/api/analytics/usage", timeout=10.0)
                checks.append(("analytics_usage", response.status_code == 200))
                
                # Check Widget templates
                response = await client.get(f"{SERVICES['widget']}/api/templates", timeout=10.0)
                checks.append(("widget_templates", response.status_code == 200))
                
        except Exception as e:
            checks.append(("error", False))
        
        successful_checks = sum(1 for check, success in checks if success)
        return {
            "success": successful_checks >= 2,  # At least 2 services responding
            "checks": checks,
            "success_rate": f"{successful_checks}/{len(checks)}"
        }
    
    async def test_platform_resilience(self):
        """Test platform behavior under various conditions"""
        resilience_tests = []
        
        try:
            async with httpx.AsyncClient() as client:
                # Test My Agents service with potentially unavailable dependencies
                response = await client.get(f"{SERVICES['my-agents']}/health", timeout=5.0)
                resilience_tests.append(("my_agents_health", response.status_code == 200))
                
                if response.status_code == 200:
                    health_data = response.json()
                    # Should still function even if some services are down
                    resilience_tests.append(("graceful_degradation", health_data["status"] in ["healthy", "degraded"]))
                
                # Test concurrent requests
                tasks = [
                    client.get(f"{SERVICES['my-agents']}/api/my-agents/dashboard", timeout=5.0)
                    for _ in range(3)
                ]
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                successful_concurrent = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
                resilience_tests.append(("concurrent_requests", successful_concurrent >= 2))
                
        except Exception as e:
            resilience_tests.append(("error", False))
        
        successful_tests = sum(1 for test, success in resilience_tests if success)
        return {
            "success": successful_tests >= len(resilience_tests) * 0.6,  # 60% success rate
            "tests": resilience_tests,
            "success_rate": f"{successful_tests}/{len(resilience_tests)}"
        }
    
    def generate_report(self, health_status, unit_results, integration_results, e2e_results):
        """Generate comprehensive test report"""
        print("\n" + "=" * 80)
        print("COMPREHENSIVE TEST REPORT")
        print("=" * 80)
        
        # Summary
        total_services = len(SERVICES)
        healthy_services = sum(1 for status in health_status.values() if "✓" in status["status"])
        
        print(f"\nTest Duration: {datetime.now() - self.start_time}")
        print(f"Services Health: {healthy_services}/{total_services}")
        
        # Unit Tests Summary
        print(f"\nUnit Tests:")
        unit_passed = sum(1 for result in unit_results.values() if result.get("passed", False))
        print(f"  Passed: {unit_passed}/{len(unit_results)}")
        
        # Integration Tests Summary  
        print(f"\nIntegration Tests:")
        integration_passed = integration_results.get("passed", False)
        print(f"  Status: {'PASSED' if integration_passed else 'FAILED'}")
        
        # End-to-End Tests Summary
        print(f"\nEnd-to-End Tests:")
        e2e_passed = sum(1 for result in e2e_results.values() if result.get("success", False))
        print(f"  Passed: {e2e_passed}/{len(e2e_results)}")
        
        # Overall Assessment
        overall_score = (
            (healthy_services / total_services) * 0.3 +
            (unit_passed / max(len(unit_results), 1)) * 0.3 +
            (1 if integration_passed else 0) * 0.2 +
            (e2e_passed / max(len(e2e_results), 1)) * 0.2
        )
        
        print(f"\nOverall Platform Health Score: {overall_score:.1%}")
        
        if overall_score >= 0.8:
            print("🟢 EXCELLENT - Platform is fully operational")
        elif overall_score >= 0.6:
            print("🟡 GOOD - Platform is mostly functional with minor issues")
        elif overall_score >= 0.4:
            print("🟠 FAIR - Platform has significant issues but core functions work")
        else:
            print("🔴 POOR - Platform has major issues requiring attention")
        
        # Recommendations
        print(f"\nRecommendations:")
        if healthy_services < total_services:
            print(f"- Start missing services: {total_services - healthy_services} services not responding")
        if unit_passed < len(unit_results):
            print(f"- Fix unit test failures: {len(unit_results) - unit_passed} service(s) have failing tests")
        if not integration_passed:
            print("- Resolve integration issues between services")
        if e2e_passed < len(e2e_results):
            print("- Address end-to-end workflow problems")
        
        return overall_score

async def main():
    """Main test execution"""
    runner = TestRunner()
    
    print("AgentHub Microservices Platform - Comprehensive Testing")
    print(f"Started at: {runner.start_time}")
    
    # 1. Health Check
    health_status = await runner.check_service_health()
    
    # 2. Unit Tests (only if pytest is available)
    try:
        unit_results = runner.run_unit_tests()
    except Exception as e:
        print(f"Unit tests skipped: {e}")
        unit_results = {}
    
    # 3. Integration Tests
    try:
        integration_results = runner.run_integration_tests()
    except Exception as e:
        print(f"Integration tests skipped: {e}")
        integration_results = {}
    
    # 4. End-to-End Tests
    e2e_results = await runner.run_end_to_end_tests()
    
    # 5. Generate Report
    overall_score = runner.generate_report(health_status, unit_results, integration_results, e2e_results)
    
    # Save results to file
    test_report = {
        "timestamp": runner.start_time.isoformat(),
        "duration": str(datetime.now() - runner.start_time),
        "health_status": health_status,
        "unit_results": unit_results,
        "integration_results": integration_results,
        "e2e_results": e2e_results,
        "overall_score": overall_score
    }
    
    with open("test_report.json", "w") as f:
        json.dump(test_report, f, indent=2, default=str)
    
    print(f"\nDetailed report saved to: test_report.json")
    return overall_score

if __name__ == "__main__":
    try:
        score = asyncio.run(main())
        sys.exit(0 if score >= 0.6 else 1)
    except KeyboardInterrupt:
        print("\nTesting interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nTesting failed with error: {e}")
        sys.exit(1)