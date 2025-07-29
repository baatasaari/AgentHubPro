#!/usr/bin/env python3
"""
API Integration Test for Agent Wizard Service
Tests all configurable endpoints and functionality
"""

import asyncio
import json
import requests
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8001"

class APITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
    
    def test_health_endpoint(self) -> bool:
        """Test health check endpoint"""
        print("🏥 Testing Health Endpoint")
        
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health Status: {data.get('status')}")
                print(f"✅ Service: {data.get('service')}")
                print(f"✅ Storage: {data.get('storage')}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_configuration_endpoints(self) -> bool:
        """Test configuration endpoints"""
        print("\n🔧 Testing Configuration Endpoints")
        
        # Test config status
        try:
            response = self.session.get(f"{self.base_url}/api/config/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Environment: {data.get('environment')}")
                print(f"✅ Storage: {data.get('storage')}")
                print(f"✅ Enabled Providers: {data.get('enabled_providers')}")
                print(f"✅ Models Count: {data.get('available_models_count')}")
                print(f"✅ Industries Count: {data.get('available_industries_count')}")
            else:
                print(f"❌ Config status failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Config status error: {e}")
            return False
        
        # Test config reload
        try:
            response = self.session.get(f"{self.base_url}/api/config/reload", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Config Reload: {data.get('message')}")
                print(f"✅ Models Loaded: {data.get('models_loaded')}")
                print(f"✅ Industries Loaded: {data.get('industries_loaded')}")
            else:
                print(f"⚠️  Config reload status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Config reload error: {e}")
        
        return True
    
    def test_industries_endpoint(self) -> bool:
        """Test industries endpoint with configuration"""
        print("\n🏥 Testing Industries Endpoint")
        
        try:
            response = self.session.get(f"{self.base_url}/api/industries", timeout=5)
            
            if response.status_code == 200:
                industries = response.json()
                print(f"✅ Retrieved {len(industries)} industries")
                
                if industries:
                    # Test first industry
                    first_industry = industries[0]
                    print(f"✅ Sample Industry: {first_industry.get('label')} ({first_industry.get('value')})")
                    print(f"✅ Icon: {first_industry.get('icon')}")
                    
                    # Test specific industry config
                    industry_value = first_industry.get('value')
                    config_response = self.session.get(f"{self.base_url}/api/config/industries/{industry_value}", timeout=5)
                    
                    if config_response.status_code == 200:
                        config_data = config_response.json()
                        print(f"✅ Industry Config: {config_data.get('name')}")
                        print(f"✅ Has Custom Prompt: {config_data.get('has_system_prompt')}")
                        print(f"✅ Recommended Models: {len(config_data.get('recommended_models', []))}")
                    
                return True
            else:
                print(f"❌ Industries failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Industries error: {e}")
            return False
    
    def test_models_endpoint(self) -> bool:
        """Test models endpoint with configuration"""
        print("\n🤖 Testing Models Endpoint")
        
        try:
            response = self.session.get(f"{self.base_url}/api/models", timeout=5)
            
            if response.status_code == 200:
                models = response.json()
                print(f"✅ Retrieved {len(models)} models")
                
                if models:
                    # Group by provider
                    providers = {}
                    for model in models:
                        provider = model.get('provider', 'Unknown')
                        if provider not in providers:
                            providers[provider] = []
                        providers[provider].append(model)
                    
                    for provider, provider_models in providers.items():
                        print(f"✅ {provider}: {len(provider_models)} models")
                    
                    # Test first model detail
                    first_model = models[0]
                    model_id = first_model.get('value')
                    
                    detail_response = self.session.get(f"{self.base_url}/api/models/{model_id}/info", timeout=5)
                    if detail_response.status_code == 200:
                        detail = detail_response.json()
                        print(f"✅ Model Detail: {detail.get('display_name')}")
                        print(f"✅ Max Tokens: {detail.get('max_tokens')}")
                        print(f"✅ Features: {len(detail.get('features', []))}")
                
                return True
            else:
                print(f"❌ Models failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Models error: {e}")
            return False
    
    def test_interfaces_endpoint(self) -> bool:
        """Test interfaces endpoint with configuration"""
        print("\n🌐 Testing Interfaces Endpoint")
        
        try:
            response = self.session.get(f"{self.base_url}/api/interfaces", timeout=5)
            
            if response.status_code == 200:
                interfaces = response.json()
                print(f"✅ Retrieved {len(interfaces)} interfaces")
                
                for interface in interfaces:
                    print(f"✅ Interface: {interface.get('label')} ({interface.get('value')})")
                    print(f"   Compatible Models: {len(interface.get('compatible_models', []))}")
                    print(f"   Features: {interface.get('features', [])}")
                
                return True
            else:
                print(f"❌ Interfaces failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Interfaces error: {e}")
            return False
    
    def test_model_recommendations(self) -> bool:
        """Test model recommendation endpoint"""
        print("\n💡 Testing Model Recommendations")
        
        try:
            # Test general recommendation
            response = self.session.get(f"{self.base_url}/api/models/recommend", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ General Recommendation: {data.get('recommended_model')}")
                
                model_info = data.get('model_info', {})
                print(f"✅ Provider: {model_info.get('provider')}")
                print(f"✅ Features: {len(model_info.get('features', []))}")
            
            # Test industry-specific recommendation
            industry_response = self.session.get(
                f"{self.base_url}/api/models/recommend?industry=healthcare&use_case=chat", 
                timeout=5
            )
            
            if industry_response.status_code == 200:
                industry_data = industry_response.json()
                print(f"✅ Healthcare Recommendation: {industry_data.get('recommended_model')}")
            
            return True
            
        except Exception as e:
            print(f"❌ Recommendations error: {e}")
            return False
    
    def test_agent_crud_operations(self) -> bool:
        """Test agent CRUD operations with configuration validation"""
        print("\n👤 Testing Agent CRUD Operations")
        
        # Create test agent
        test_agent = {
            "business_name": "Test Healthcare Clinic",
            "business_description": "A modern healthcare clinic providing comprehensive medical services to patients.",
            "business_domain": "https://test-clinic.com",
            "industry": "healthcare",
            "llm_model": "gpt-3.5-turbo",
            "interface_type": "webchat"
        }
        
        try:
            # Create agent
            create_response = self.session.post(
                f"{self.base_url}/api/agents",
                json=test_agent,
                timeout=10
            )
            
            if create_response.status_code == 200:
                agent = create_response.json()
                agent_id = agent.get('id')
                print(f"✅ Created Agent: {agent_id}")
                print(f"✅ Business Name: {agent.get('business_name')}")
                print(f"✅ Industry: {agent.get('industry')}")
                print(f"✅ Model: {agent.get('llm_model')}")
                
                # Test system prompt generation
                prompt_response = self.session.post(
                    f"{self.base_url}/api/agents/{agent_id}/system-prompt",
                    timeout=5
                )
                
                if prompt_response.status_code == 200:
                    prompt_data = prompt_response.json()
                    prompt = prompt_data.get('system_prompt', '')
                    print(f"✅ Generated System Prompt: {len(prompt)} characters")
                    print(f"✅ Contains Business Name: {'Test Healthcare Clinic' in prompt}")
                
                # Test agent retrieval
                get_response = self.session.get(f"{self.base_url}/api/agents/{agent_id}", timeout=5)
                if get_response.status_code == 200:
                    print("✅ Agent retrieval works")
                
                # Test validation endpoint
                validate_response = self.session.post(
                    f"{self.base_url}/api/agents/{agent_id}/validate-deployment",
                    timeout=5
                )
                
                if validate_response.status_code == 200:
                    validation = validate_response.json()
                    print(f"✅ Deployment Validation: Ready={validation.get('ready')}")
                    if validation.get('issues'):
                        print(f"   Issues: {validation.get('issues')}")
                
                return True
            else:
                print(f"❌ Agent creation failed: {create_response.status_code}")
                if create_response.text:
                    print(f"   Error: {create_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Agent CRUD error: {e}")
            return False
    
    def test_validation_system(self) -> bool:
        """Test validation system with invalid data"""
        print("\n✅ Testing Validation System")
        
        # Test invalid agent data
        invalid_agents = [
            {
                "business_name": "X",  # Too short
                "business_description": "Valid description that meets minimum length requirements",
                "business_domain": "https://test.com",
                "industry": "healthcare",
                "llm_model": "gpt-3.5-turbo",
                "interface_type": "webchat"
            },
            {
                "business_name": "Valid Business Name",
                "business_description": "Short",  # Too short
                "business_domain": "https://test.com",
                "industry": "healthcare",
                "llm_model": "gpt-3.5-turbo",
                "interface_type": "webchat"
            },
            {
                "business_name": "Valid Business Name",
                "business_description": "Valid description that meets minimum length requirements",
                "business_domain": "https://test.com",
                "industry": "invalid_industry",  # Invalid
                "llm_model": "gpt-3.5-turbo",
                "interface_type": "webchat"
            },
            {
                "business_name": "Valid Business Name",
                "business_description": "Valid description that meets minimum length requirements",
                "business_domain": "https://test.com",
                "industry": "healthcare",
                "llm_model": "invalid_model",  # Invalid
                "interface_type": "webchat"
            }
        ]
        
        validation_tests = [
            "business_name too short",
            "business_description too short", 
            "invalid industry",
            "invalid model"
        ]
        
        for i, invalid_agent in enumerate(invalid_agents):
            try:
                response = self.session.post(
                    f"{self.base_url}/api/agents",
                    json=invalid_agent,
                    timeout=5
                )
                
                if response.status_code == 422:  # Validation error
                    print(f"✅ Validation Test {i+1}: {validation_tests[i]} - Correctly rejected")
                else:
                    print(f"⚠️  Validation Test {i+1}: {validation_tests[i]} - Expected 422, got {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Validation Test {i+1} error: {e}")
                return False
        
        return True
    
    def run_comprehensive_test(self) -> bool:
        """Run all API tests"""
        print("🚀 Starting Comprehensive API Integration Tests\n")
        
        tests = [
            ("Health Check", self.test_health_endpoint),
            ("Configuration", self.test_configuration_endpoints),
            ("Industries", self.test_industries_endpoint),
            ("Models", self.test_models_endpoint),
            ("Interfaces", self.test_interfaces_endpoint),
            ("Model Recommendations", self.test_model_recommendations),
            ("Agent CRUD", self.test_agent_crud_operations),
            ("Validation System", self.test_validation_system)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed += 1
                    print(f"✅ {test_name} PASSED\n")
                else:
                    failed += 1
                    print(f"❌ {test_name} FAILED\n")
            except Exception as e:
                failed += 1
                print(f"❌ {test_name} ERROR: {e}\n")
        
        print(f"🏁 API Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All API tests passed! Service is fully functional with configuration integration.")
            return True
        else:
            print(f"⚠️  {failed} tests failed. Check service status and configuration.")
            return False

def main():
    """Main test function"""
    print("🌐 Agent Wizard API Integration Tests")
    print(f"Testing service at: {BASE_URL}\n")
    
    # Check if service is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=3)
        if response.status_code != 200:
            print(f"❌ Service not responding correctly at {BASE_URL}")
            print("   Make sure the Agent Wizard service is running on port 8001")
            return False
    except requests.RequestException:
        print(f"❌ Cannot connect to service at {BASE_URL}")
        print("   Make sure the Agent Wizard service is running on port 8001")
        return False
    
    # Run tests
    tester = APITester(BASE_URL)
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)