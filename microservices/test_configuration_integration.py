#!/usr/bin/env python3
"""
Configuration Integration Test Suite
Tests configuration system across all microservices
"""

import asyncio
import aiohttp
import os
import sys
from datetime import datetime
import json

# Services to test
SERVICES = {
    "analytics": "http://localhost:8002",
    "billing": "http://localhost:8003", 
    "dashboard": "http://localhost:8004",
    "widget": "http://localhost:8005",
    "my-agents": "http://localhost:8006",
    "insights": "http://localhost:8007"
}

class ConfigurationTester:
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "services_tested": 0,
            "details": []
        }
    
    async def test_service_health(self, service_name: str, url: str) -> dict:
        """Test service health endpoint for configuration info"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/health", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check for configuration fields
                        config_fields = ["environment", "storage_type"]
                        has_config = all(field in data for field in config_fields)
                        
                        return {
                            "service": service_name,
                            "test": "health_check",
                            "status": "PASS" if has_config else "FAIL",
                            "data": data,
                            "message": "Configuration fields present" if has_config else "Missing configuration fields"
                        }
                    else:
                        return {
                            "service": service_name,
                            "test": "health_check", 
                            "status": "FAIL",
                            "message": f"HTTP {response.status}"
                        }
        except Exception as e:
            return {
                "service": service_name,
                "test": "health_check",
                "status": "FAIL", 
                "message": f"Connection error: {e}"
            }
    
    async def test_config_status(self, service_name: str, url: str) -> dict:
        """Test /api/config/status endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/api/config/status", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check for required config status fields
                        required_fields = ["service", "environment", "storage_type"]
                        has_fields = all(field in data for field in required_fields)
                        
                        return {
                            "service": service_name,
                            "test": "config_status",
                            "status": "PASS" if has_fields else "FAIL",
                            "data": data,
                            "message": "Config status complete" if has_fields else "Missing config status fields"
                        }
                    else:
                        return {
                            "service": service_name,
                            "test": "config_status",
                            "status": "FAIL",
                            "message": f"HTTP {response.status}"
                        }
        except Exception as e:
            return {
                "service": service_name,
                "test": "config_status",
                "status": "FAIL",
                "message": f"Error: {e}"
            }
    
    async def test_config_reload(self, service_name: str, url: str) -> dict:
        """Test /api/config/reload endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/api/config/reload", timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        success = data.get("status") == "success"
                        
                        return {
                            "service": service_name,
                            "test": "config_reload",
                            "status": "PASS" if success else "FAIL",
                            "data": data,
                            "message": data.get("message", "Reload completed")
                        }
                    else:
                        return {
                            "service": service_name,
                            "test": "config_reload",
                            "status": "FAIL",
                            "message": f"HTTP {response.status}"
                        }
        except Exception as e:
            return {
                "service": service_name,
                "test": "config_reload",
                "status": "FAIL",
                "message": f"Error: {e}"
            }
    
    async def test_environment_detection(self, service_name: str, url: str) -> dict:
        """Test environment detection"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/api/config/status", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        environment = data.get("environment")
                        
                        # Environment should be automatically detected
                        valid_envs = ["development", "staging", "production"]
                        is_valid = environment in valid_envs
                        
                        return {
                            "service": service_name,
                            "test": "environment_detection",
                            "status": "PASS" if is_valid else "FAIL",
                            "data": {"environment": environment},
                            "message": f"Environment: {environment}" if is_valid else f"Invalid environment: {environment}"
                        }
                    else:
                        return {
                            "service": service_name,
                            "test": "environment_detection",
                            "status": "FAIL",
                            "message": f"HTTP {response.status}"
                        }
        except Exception as e:
            return {
                "service": service_name,
                "test": "environment_detection",
                "status": "FAIL",
                "message": f"Error: {e}"
            }
    
    async def test_service_specific_config(self, service_name: str, url: str) -> dict:
        """Test service-specific configuration endpoints"""
        
        # Service-specific endpoint mappings
        endpoints = {
            "billing": "/api/config/pricing",
            "dashboard": "/api/config/services", 
            "my-agents": "/api/config/validation-rules",
            "insights": "/api/config/database"
        }
        
        endpoint = endpoints.get(service_name)
        if not endpoint:
            return {
                "service": service_name,
                "test": "service_specific_config",
                "status": "SKIP",
                "message": "No service-specific config endpoint"
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}{endpoint}", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        has_data = bool(data)
                        
                        return {
                            "service": service_name,
                            "test": "service_specific_config",
                            "status": "PASS" if has_data else "FAIL",
                            "data": data,
                            "message": f"Retrieved {endpoint} config" if has_data else "Empty config response"
                        }
                    else:
                        return {
                            "service": service_name,
                            "test": "service_specific_config",
                            "status": "FAIL",
                            "message": f"HTTP {response.status}"
                        }
        except Exception as e:
            return {
                "service": service_name,
                "test": "service_specific_config",
                "status": "FAIL",
                "message": f"Error: {e}"
            }
    
    async def run_service_tests(self, service_name: str, url: str):
        """Run all tests for a service"""
        print(f"\n🔧 Testing {service_name} service configuration...")
        
        # Run tests concurrently
        tests = await asyncio.gather(
            self.test_service_health(service_name, url),
            self.test_config_status(service_name, url),
            self.test_config_reload(service_name, url),
            self.test_environment_detection(service_name, url),
            self.test_service_specific_config(service_name, url),
            return_exceptions=True
        )
        
        service_passed = 0
        service_total = 0
        
        for test_result in tests:
            if isinstance(test_result, dict):
                self.results["details"].append(test_result)
                self.results["total_tests"] += 1
                service_total += 1
                
                if test_result["status"] == "PASS":
                    self.results["passed"] += 1
                    service_passed += 1
                    print(f"   ✅ {test_result['test']}: {test_result['message']}")
                elif test_result["status"] == "FAIL":
                    self.results["failed"] += 1
                    print(f"   ❌ {test_result['test']}: {test_result['message']}")
                else:  # SKIP
                    print(f"   ⏭️  {test_result['test']}: {test_result['message']}")
        
        print(f"   📊 Service Result: {service_passed}/{service_total} tests passed")
        if service_passed == service_total:
            self.results["services_tested"] += 1
    
    async def run_all_tests(self):
        """Run configuration tests on all services"""
        print("=" * 80)
        print("🚀 MICROSERVICES CONFIGURATION INTEGRATION TESTS")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Testing {len(SERVICES)} services...")
        
        # Test all services
        for service_name, url in SERVICES.items():
            await self.run_service_tests(service_name, url)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📋 CONFIGURATION INTEGRATION TEST SUMMARY")
        print("=" * 80)
        
        print(f"Services Tested: {len(SERVICES)}")
        print(f"Services Passed: {self.results['services_tested']}")
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        
        success_rate = (self.results['passed'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.results['failed'] == 0:
            print("\n🎉 ALL TESTS PASSED! Configuration integration successful.")
        else:
            print(f"\n⚠️  {self.results['failed']} tests failed. Review configuration.")
        
        # Environment summary
        environments = set()
        storage_types = set()
        
        for detail in self.results['details']:
            if detail['test'] == 'health_check' and 'data' in detail:
                data = detail['data']
                if 'environment' in data:
                    environments.add(data['environment'])
                if 'storage_type' in data:
                    storage_types.add(data['storage_type'])
        
        print(f"\n📍 Environment Detection: {', '.join(environments) if environments else 'Not detected'}")
        print(f"💾 Storage Types: {', '.join(storage_types) if storage_types else 'Not configured'}")
        
        print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

async def main():
    """Main test runner"""
    tester = ConfigurationTester()
    await tester.run_all_tests()
    
    # Exit with error code if tests failed
    if tester.results['failed'] > 0:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())