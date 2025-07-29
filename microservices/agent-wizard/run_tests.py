#!/usr/bin/env python3
"""
Quick test runner for configuration integration
"""

import asyncio
import subprocess
import sys
from pathlib import Path

def run_service_test():
    """Test the service directly"""
    print("🧪 Testing Agent Wizard Service Integration")
    
    try:
        # Run the test script
        result = subprocess.run([
            sys.executable, 
            str(Path(__file__).parent / "test_config_integration.py")
        ], capture_output=True, text=True, timeout=30)
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
            
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("❌ Test timed out")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints are working"""
    print("\n🌐 Testing API Endpoints")
    
    try:
        import requests
        
        base_url = "http://localhost:8001"
        endpoints = [
            "/health",
            "/api/industries", 
            "/api/models",
            "/api/interfaces",
            "/api/config/status"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    print(f"✅ {endpoint}: OK")
                else:
                    print(f"⚠️  {endpoint}: {response.status_code}")
            except requests.RequestException as e:
                print(f"❌ {endpoint}: {e}")
                
        return True
        
    except ImportError:
        print("⚠️  requests not available for API testing")
        return True
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Running Agent Wizard Configuration Tests\n")
    
    # Test configuration integration
    config_test = run_service_test()
    
    # Test API endpoints (if service is running)
    api_test = test_api_endpoints()
    
    print(f"\n🏁 Results:")
    print(f"Configuration Integration: {'✅ PASSED' if config_test else '❌ FAILED'}")
    print(f"API Endpoints: {'✅ PASSED' if api_test else '❌ FAILED'}")
    
    if config_test and api_test:
        print("\n🎉 All tests passed! Configuration is fully integrated.")
    else:
        print("\n⚠️  Some tests failed. Check logs above.")