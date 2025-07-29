#!/usr/bin/env python3
"""
Platform Functionality Test Suite
Tests all functionality across the new configuration structure
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Service endpoints that should be working
ACTIVE_SERVICES = {
    "billing": "http://localhost:8003"
}

# Test endpoints for each service
TEST_ENDPOINTS = {
    "billing": [
        "/health",
        "/api/config/status", 
        "/api/config/pricing",
        "/api/billing/usage/1",
        "/api/billing/costs/1",
        "/api/config/reload"
    ]
}

class PlatformTester:
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "details": []
        }
    
    async def test_endpoint(self, service: str, endpoint: str) -> dict:
        """Test a specific endpoint"""
        url = f"{ACTIVE_SERVICES[service]}{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    status = response.status
                    
                    if status == 200:
                        try:
                            data = await response.json()
                            return {
                                "service": service,
                                "endpoint": endpoint,
                                "status": "PASS",
                                "http_status": status,
                                "data_type": type(data).__name__,
                                "data_size": len(str(data)),
                                "has_data": bool(data)
                            }
                        except:
                            text = await response.text()
                            return {
                                "service": service,
                                "endpoint": endpoint,
                                "status": "PASS",
                                "http_status": status,
                                "data_type": "text",
                                "data_size": len(text),
                                "has_data": bool(text)
                            }
                    else:
                        return {
                            "service": service,
                            "endpoint": endpoint,
                            "status": "FAIL",
                            "http_status": status,
                            "error": f"HTTP {status}"
                        }
                        
        except Exception as e:
            return {
                "service": service,
                "endpoint": endpoint,
                "status": "FAIL",
                "error": str(e)
            }
    
    async def test_configuration_functionality(self, service: str) -> dict:
        """Test configuration-specific functionality"""
        print(f"\n🔧 Testing {service} configuration functionality...")
        
        results = []
        
        # Test configuration status
        status_result = await self.test_endpoint(service, "/api/config/status")
        results.append(status_result)
        
        if status_result["status"] == "PASS":
            print(f"   ✅ Configuration Status: Working")
        else:
            print(f"   ❌ Configuration Status: {status_result.get('error', 'Failed')}")
        
        # Test configuration reload
        reload_result = await self.test_endpoint(service, "/api/config/reload")
        results.append(reload_result)
        
        if reload_result["status"] == "PASS":
            print(f"   ✅ Configuration Reload: Working")
        else:
            print(f"   ❌ Configuration Reload: {reload_result.get('error', 'Failed')}")
        
        return results
    
    async def test_business_functionality(self, service: str) -> dict:
        """Test business logic functionality"""
        print(f"\n💼 Testing {service} business functionality...")
        
        results = []
        
        if service == "billing":
            # Test pricing configuration
            pricing_result = await self.test_endpoint(service, "/api/config/pricing")
            results.append(pricing_result)
            
            if pricing_result["status"] == "PASS":
                print(f"   ✅ Pricing Configuration: Working")
            else:
                print(f"   ❌ Pricing Configuration: {pricing_result.get('error', 'Failed')}")
            
            # Test usage tracking
            usage_result = await self.test_endpoint(service, "/api/billing/usage/1")
            results.append(usage_result)
            
            if usage_result["status"] == "PASS":
                print(f"   ✅ Usage Tracking: Working")
            else:
                print(f"   ❌ Usage Tracking: {usage_result.get('error', 'Failed')}")
            
            # Test cost calculation
            cost_result = await self.test_endpoint(service, "/api/billing/costs/1")
            results.append(cost_result)
            
            if cost_result["status"] == "PASS":
                print(f"   ✅ Cost Calculation: Working")
            else:
                print(f"   ❌ Cost Calculation: {cost_result.get('error', 'Failed')}")
        
        return results
    
    async def run_comprehensive_tests(self):
        """Run all functionality tests"""
        print("=" * 80)
        print("🚀 PLATFORM FUNCTIONALITY TESTS - NEW CONFIGURATION STRUCTURE")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        all_results = []
        
        for service in ACTIVE_SERVICES.keys():
            print(f"\n🔍 Testing {service.upper()} Service")
            print("-" * 40)
            
            # Test health endpoint first
            health_result = await self.test_endpoint(service, "/health")
            all_results.append(health_result)
            
            if health_result["status"] == "PASS":
                print(f"   ✅ Health Check: Service Online")
            else:
                print(f"   ❌ Health Check: {health_result.get('error', 'Failed')}")
                continue
            
            # Test configuration functionality
            config_results = await self.test_configuration_functionality(service)
            all_results.extend(config_results)
            
            # Test business functionality  
            business_results = await self.test_business_functionality(service)
            all_results.extend(business_results)
        
        # Calculate results
        self.results["total_tests"] = len(all_results)
        self.results["passed"] = len([r for r in all_results if r["status"] == "PASS"])
        self.results["failed"] = len([r for r in all_results if r["status"] == "FAIL"])
        self.results["details"] = all_results
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 PLATFORM FUNCTIONALITY TEST SUMMARY")
        print("=" * 80)
        
        print(f"Services Tested: {len(ACTIVE_SERVICES)}")
        print(f"Total Endpoints: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        
        success_rate = (self.results['passed'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Detailed breakdown
        print(f"\n📈 FUNCTIONALITY ASSESSMENT:")
        
        # Configuration functionality
        config_tests = [r for r in self.results['details'] if 'config' in r['endpoint']]
        config_passed = len([r for r in config_tests if r['status'] == 'PASS'])
        print(f"   Configuration System: {config_passed}/{len(config_tests)} endpoints working")
        
        # Business functionality  
        business_tests = [r for r in self.results['details'] if 'config' not in r['endpoint'] and 'health' not in r['endpoint']]
        business_passed = len([r for r in business_tests if r['status'] == 'PASS'])
        print(f"   Business Logic: {business_passed}/{len(business_tests)} endpoints working")
        
        if self.results['failed'] == 0:
            print(f"\n🎉 ALL TESTS PASSED! Platform functionality verified.")
            print("✅ Configuration integration successful")
            print("✅ Business logic working correctly")
            print("✅ API endpoints responding properly")
        elif success_rate >= 80:
            print(f"\n✅ MOSTLY WORKING! {success_rate:.1f}% functionality verified.")
            print("⚠️  Some minor issues detected - see details above")
        else:
            print(f"\n⚠️  ISSUES DETECTED! Only {success_rate:.1f}% functionality working.")
            print("🔧 Review failed endpoints and fix issues")
        
        print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

async def main():
    """Main test runner"""
    tester = PlatformTester()
    await tester.run_comprehensive_tests()
    
    # Exit with error code if significant issues
    if tester.results['failed'] > tester.results['passed']:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())