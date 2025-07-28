#!/usr/bin/env python3
"""
Single Service Testing - Validates individual microservice functionality
when other services are not available
"""

import asyncio
import httpx
import json
from datetime import datetime

class SingleServiceTester:
    def __init__(self, service_name, service_url):
        self.service_name = service_name
        self.service_url = service_url
        
    async def test_service_health(self):
        """Test service health endpoint"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_url}/health", timeout=5.0)
                if response.status_code == 200:
                    health_data = response.json()
                    return {
                        "healthy": True,
                        "status": health_data.get("status", "unknown"),
                        "service": health_data.get("service", "unknown"),
                        "data": health_data
                    }
                else:
                    return {"healthy": False, "status_code": response.status_code}
        except Exception as e:
            return {"healthy": False, "error": str(e)}
    
    async def test_my_agents_service(self):
        """Comprehensive testing for My Agents service"""
        print(f"=== Testing {self.service_name} Service ===")
        
        results = {}
        
        # 1. Health Check
        print("1. Health Check...")
        health_result = await self.test_service_health()
        results["health"] = health_result
        
        if health_result["healthy"]:
            print(f"   ✓ Service: {health_result['service']}")
            print(f"   ✓ Status: {health_result['status']}")
            
            # Check cross-service connectivity
            if "services" in health_result["data"]:
                services_status = health_result["data"]["services"]
                print("   Cross-service connectivity:")
                for svc, status in services_status.items():
                    print(f"     → {svc}: {status}")
        else:
            print(f"   ✗ Health check failed: {health_result.get('error', 'Unknown error')}")
            return results
        
        # 2. Dashboard API
        print("\n2. Dashboard API...")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_url}/api/my-agents/dashboard", timeout=10.0)
                if response.status_code == 200:
                    dashboard_data = response.json()
                    results["dashboard"] = {"success": True, "data": dashboard_data}
                    
                    overview = dashboard_data.get("overview", {})
                    print(f"   ✓ Dashboard loaded successfully")
                    print(f"   → Total agents: {overview.get('total_agents', 'N/A')}")
                    print(f"   → Active agents: {overview.get('active_agents', 'N/A')}")
                    print(f"   → Total conversations: {overview.get('total_conversations', 'N/A')}")
                    print(f"   → Total cost: ${overview.get('total_cost', 0):.3f}")
                    
                    # Check breakdown data
                    breakdown = dashboard_data.get("breakdown", {})
                    if breakdown:
                        print(f"   → Industry breakdown: {len(breakdown.get('by_industry', {}))}")
                        print(f"   → Status breakdown: {len(breakdown.get('by_status', {}))}")
                else:
                    results["dashboard"] = {"success": False, "status_code": response.status_code}
                    print(f"   ✗ Dashboard failed: HTTP {response.status_code}")
        except Exception as e:
            results["dashboard"] = {"success": False, "error": str(e)}
            print(f"   ✗ Dashboard error: {e}")
        
        # 3. Agents List API
        print("\n3. Agents List API...")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_url}/api/my-agents", timeout=10.0)
                if response.status_code == 200:
                    agents = response.json()
                    results["agents_list"] = {"success": True, "count": len(agents), "data": agents}
                    print(f"   ✓ Agents list loaded: {len(agents)} agents")
                    
                    if agents:
                        # Show sample agent info
                        sample_agent = agents[0]
                        print(f"   → Sample agent: {sample_agent.get('business_name', 'N/A')}")
                        print(f"   → Industry: {sample_agent.get('industry', 'N/A')}")
                        print(f"   → Status: {sample_agent.get('status', 'N/A')}")
                        print(f"   → Conversations: {sample_agent.get('conversation_count', 0)}")
                else:
                    results["agents_list"] = {"success": False, "status_code": response.status_code}
                    print(f"   ✗ Agents list failed: HTTP {response.status_code}")
        except Exception as e:
            results["agents_list"] = {"success": False, "error": str(e)}
            print(f"   ✗ Agents list error: {e}")
        
        # 4. Agent Operations
        print("\n4. Agent Operations...")
        agents_data = results.get("agents_list", {}).get("data", [])
        if agents_data:
            sample_agent_id = agents_data[0]["id"]
            
            # Test enable operation
            try:
                async with httpx.AsyncClient() as client:
                    enable_response = await client.post(
                        f"{self.service_url}/api/my-agents/{sample_agent_id}/enable",
                        json={"reason": "Testing enable operation"},
                        timeout=10.0
                    )
                    results["enable_operation"] = {"success": enable_response.status_code == 200}
                    print(f"   → Enable operation: {enable_response.status_code}")
                    
                    # Test status history
                    history_response = await client.get(
                        f"{self.service_url}/api/my-agents/{sample_agent_id}/status-history",
                        timeout=10.0
                    )
                    if history_response.status_code == 200:
                        history_data = history_response.json()
                        history_count = len(history_data.get("history", []))
                        print(f"   → Status history: {history_count} entries")
                        results["status_history"] = {"success": True, "count": history_count}
                    
            except Exception as e:
                results["enable_operation"] = {"success": False, "error": str(e)}
                print(f"   ✗ Agent operations error: {e}")
        else:
            print("   → No agents available for operations testing")
        
        # 5. Bulk Operations
        print("\n5. Bulk Operations...")
        if agents_data and len(agents_data) >= 2:
            try:
                async with httpx.AsyncClient() as client:
                    bulk_data = {
                        "agent_ids": [agents_data[0]["id"], agents_data[1]["id"]],
                        "operation": "enable",
                        "reason": "Bulk testing operation"
                    }
                    bulk_response = await client.post(
                        f"{self.service_url}/api/my-agents/bulk",
                        json=bulk_data,
                        timeout=10.0
                    )
                    
                    if bulk_response.status_code == 200:
                        bulk_result = bulk_response.json()
                        results["bulk_operations"] = {"success": True, "data": bulk_result}
                        print(f"   ✓ Bulk operation completed")
                        print(f"   → Successful: {bulk_result.get('successful', 0)}")
                        print(f"   → Failed: {bulk_result.get('failed', 0)}")
                    else:
                        results["bulk_operations"] = {"success": False, "status_code": bulk_response.status_code}
                        print(f"   ✗ Bulk operation failed: HTTP {bulk_response.status_code}")
                        
            except Exception as e:
                results["bulk_operations"] = {"success": False, "error": str(e)}
                print(f"   ✗ Bulk operations error: {e}")
        else:
            print("   → Insufficient agents for bulk operations testing")
        
        # 6. Performance Test
        print("\n6. Performance Test...")
        try:
            import time
            start_time = time.time()
            
            # Concurrent requests
            tasks = []
            async with httpx.AsyncClient() as client:
                for _ in range(5):
                    tasks.append(client.get(f"{self.service_url}/health", timeout=5.0))
                    tasks.append(client.get(f"{self.service_url}/api/my-agents/dashboard", timeout=5.0))
                
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                end_time = time.time()
                
                successful = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
                total_time = end_time - start_time
                
                results["performance"] = {
                    "success": True,
                    "successful_requests": successful,
                    "total_requests": len(responses),
                    "total_time": total_time,
                    "avg_response_time": total_time / len(responses)
                }
                
                print(f"   ✓ Performance test completed")
                print(f"   → Successful requests: {successful}/{len(responses)}")
                print(f"   → Total time: {total_time:.3f}s")
                print(f"   → Average response time: {total_time/len(responses):.3f}s")
                
        except Exception as e:
            results["performance"] = {"success": False, "error": str(e)}
            print(f"   ✗ Performance test error: {e}")
        
        return results
    
    def generate_report(self, results):
        """Generate test report"""
        print(f"\n=== {self.service_name} Service Test Report ===")
        
        total_tests = len(results)
        successful_tests = sum(1 for result in results.values() if result.get("success", False))
        
        print(f"Test Time: {datetime.now()}")
        print(f"Tests Run: {total_tests}")
        print(f"Tests Passed: {successful_tests}")
        print(f"Success Rate: {successful_tests/total_tests*100:.1f}%" if total_tests > 0 else "No tests run")
        
        # Detailed results
        for test_name, result in results.items():
            status = "✓ PASS" if result.get("success", False) else "✗ FAIL"
            print(f"{status} {test_name}")
        
        # Service assessment
        if successful_tests >= total_tests * 0.8:
            print(f"\n🟢 EXCELLENT: {self.service_name} service is fully functional")
        elif successful_tests >= total_tests * 0.6:
            print(f"\n🟡 GOOD: {self.service_name} service is mostly functional")
        elif successful_tests >= total_tests * 0.4:
            print(f"\n🟠 FAIR: {self.service_name} service has some issues")
        else:
            print(f"\n🔴 POOR: {self.service_name} service needs attention")
        
        return successful_tests / total_tests if total_tests > 0 else 0

async def main():
    """Test the My Agents service"""
    print("Single Service Testing - My Agents Service")
    print("=" * 50)
    
    tester = SingleServiceTester("My Agents", "http://localhost:8006")
    
    # Run comprehensive tests
    results = await tester.test_my_agents_service()
    
    # Generate report
    score = tester.generate_report(results)
    
    # Save results
    test_report = {
        "service": "my-agents",
        "timestamp": datetime.now().isoformat(),
        "results": results,
        "score": score
    }
    
    with open("single_service_test_report.json", "w") as f:
        json.dump(test_report, f, indent=2, default=str)
    
    print(f"\nDetailed report saved to: single_service_test_report.json")
    return score >= 0.6

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        print(f"\nOverall Test Result: {'PASS' if success else 'FAIL'}")
        exit(0 if success else 1)
    except Exception as e:
        print(f"Test execution failed: {e}")
        exit(1)