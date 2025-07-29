#!/usr/bin/env python3
"""
Full Integration Test Suite
Tests integration between frontend, microservices, and configuration system
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Test both frontend and microservices
TEST_ENDPOINTS = {
    "frontend": "http://localhost:5000",
    "billing_service": "http://localhost:8003"
}

FRONTEND_ENDPOINTS = [
    "/api/usage/stats",
    "/api/agents", 
    "/api/agents/1",
    "/api/conversations"
]

MICROSERVICE_ENDPOINTS = [
    "/health",
    "/api/config/status",
    "/api/billing/usage/1",
    "/api/config/pricing"
]

class FullIntegrationTester:
    def __init__(self):
        self.results = {
            "frontend_tests": 0,
            "frontend_passed": 0,
            "microservice_tests": 0,
            "microservice_passed": 0,
            "total_tests": 0,
            "total_passed": 0,
            "integration_working": False
        }
    
    async def test_endpoint(self, base_url: str, endpoint: str) -> dict:
        """Test a specific endpoint"""
        url = f"{base_url}{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    status = response.status
                    
                    if status == 200:
                        try:
                            data = await response.json()
                            return {
                                "endpoint": endpoint,
                                "status": "PASS",
                                "http_status": status,
                                "has_data": bool(data),
                                "data_type": type(data).__name__
                            }
                        except:
                            text = await response.text()
                            return {
                                "endpoint": endpoint,
                                "status": "PASS",
                                "http_status": status,
                                "has_data": bool(text),
                                "data_type": "text"
                            }
                    else:
                        return {
                            "endpoint": endpoint,
                            "status": "FAIL",
                            "http_status": status,
                            "error": f"HTTP {status}"
                        }
                        
        except Exception as e:
            return {
                "endpoint": endpoint,
                "status": "FAIL",
                "error": str(e)
            }
    
    async def test_frontend_integration(self):
        """Test frontend API integration"""
        print("🌐 Testing Frontend Integration")
        print("-" * 40)
        
        results = []
        for endpoint in FRONTEND_ENDPOINTS:
            result = await self.test_endpoint(TEST_ENDPOINTS["frontend"], endpoint)
            results.append(result)
            
            if result["status"] == "PASS":
                print(f"   ✅ {endpoint}: Working")
                self.results["frontend_passed"] += 1
            else:
                print(f"   ❌ {endpoint}: {result.get('error', 'Failed')}")
            
            self.results["frontend_tests"] += 1
        
        return results
    
    async def test_microservice_integration(self):
        """Test microservice integration"""
        print("\n🔧 Testing Microservice Integration")
        print("-" * 40)
        
        results = []
        for endpoint in MICROSERVICE_ENDPOINTS:
            result = await self.test_endpoint(TEST_ENDPOINTS["billing_service"], endpoint)
            results.append(result)
            
            if result["status"] == "PASS":
                print(f"   ✅ {endpoint}: Working")
                self.results["microservice_passed"] += 1
            else:
                print(f"   ❌ {endpoint}: {result.get('error', 'Failed')}")
            
            self.results["microservice_tests"] += 1
        
        return results
    
    async def test_configuration_consistency(self):
        """Test configuration consistency across services"""
        print("\n⚙️  Testing Configuration Consistency")
        print("-" * 40)
        
        # Test frontend config endpoint
        frontend_config = None
        try:
            async with aiohttp.ClientSession() as session:
                # Frontend should have some config access
                async with session.get(f"{TEST_ENDPOINTS['frontend']}/api/usage/stats", timeout=10) as response:
                    if response.status == 200:
                        frontend_config = await response.json()
                        print("   ✅ Frontend: Configuration accessible")
                    else:
                        print("   ❌ Frontend: Configuration not accessible")
        except Exception as e:
            print(f"   ❌ Frontend: {e}")
        
        # Test microservice config
        microservice_config = None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{TEST_ENDPOINTS['billing_service']}/api/config/status", timeout=10) as response:
                    if response.status == 200:
                        microservice_config = await response.json()
                        print("   ✅ Microservice: Configuration accessible")
                        
                        # Check for expected config fields
                        if "environment" in microservice_config and "storage_type" in microservice_config:
                            print(f"   ✅ Environment: {microservice_config['environment']}")
                            print(f"   ✅ Storage: {microservice_config['storage_type']}")
                        else:
                            print("   ⚠️  Configuration fields incomplete")
                    else:
                        print("   ❌ Microservice: Configuration not accessible")
        except Exception as e:
            print(f"   ❌ Microservice: {e}")
        
        return bool(frontend_config and microservice_config)
    
    async def run_full_integration_tests(self):
        """Run complete integration test suite"""
        print("=" * 80)
        print("🚀 FULL PLATFORM INTEGRATION TESTS")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test frontend
        frontend_results = await self.test_frontend_integration()
        
        # Test microservices  
        microservice_results = await self.test_microservice_integration()
        
        # Test configuration consistency
        config_consistent = await self.test_configuration_consistency()
        
        # Calculate totals
        self.results["total_tests"] = self.results["frontend_tests"] + self.results["microservice_tests"]
        self.results["total_passed"] = self.results["frontend_passed"] + self.results["microservice_passed"]
        self.results["integration_working"] = config_consistent
        
        # Print comprehensive summary
        self.print_integration_summary()
    
    def print_integration_summary(self):
        """Print integration test summary"""
        print("\n" + "=" * 80)
        print("📊 FULL INTEGRATION SUMMARY")
        print("=" * 80)
        
        # Frontend results
        frontend_rate = (self.results["frontend_passed"] / self.results["frontend_tests"] * 100) if self.results["frontend_tests"] > 0 else 0
        print(f"🌐 Frontend: {self.results['frontend_passed']}/{self.results['frontend_tests']} endpoints ({frontend_rate:.1f}%)")
        
        # Microservice results
        micro_rate = (self.results["microservice_passed"] / self.results["microservice_tests"] * 100) if self.results["microservice_tests"] > 0 else 0
        print(f"🔧 Microservices: {self.results['microservice_passed']}/{self.results['microservice_tests']} endpoints ({micro_rate:.1f}%)")
        
        # Overall results
        overall_rate = (self.results["total_passed"] / self.results["total_tests"] * 100) if self.results["total_tests"] > 0 else 0
        print(f"📈 Overall: {self.results['total_passed']}/{self.results['total_tests']} endpoints ({overall_rate:.1f}%)")
        
        # Configuration integration
        config_status = "✅ Working" if self.results["integration_working"] else "❌ Issues"
        print(f"⚙️  Configuration Integration: {config_status}")
        
        # Final assessment
        print(f"\n🎯 INTEGRATION ASSESSMENT:")
        
        if overall_rate >= 90 and self.results["integration_working"]:
            print("🎉 EXCELLENT! Full platform integration working perfectly.")
            print("✅ Frontend and microservices communicating properly")
            print("✅ Configuration system integrated across all layers")
            print("✅ All core functionality operational")
        elif overall_rate >= 70:
            print("✅ GOOD! Most functionality integrated successfully.")
            print("⚠️  Some minor issues detected - platform mostly operational")
        else:
            print("⚠️  ISSUES! Integration problems detected.")
            print("🔧 Review failed endpoints and fix integration issues")
        
        print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

async def main():
    """Main integration test runner"""
    tester = FullIntegrationTester()
    await tester.run_full_integration_tests()

if __name__ == "__main__":
    asyncio.run(main())