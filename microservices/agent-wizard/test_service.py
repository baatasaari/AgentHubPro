#!/usr/bin/env python3
"""
Quick test script for Agent Wizard microservice
"""

import requests
import json
import sys

def test_agent_wizard_service():
    base_url = "http://localhost:8001"
    
    print("=== AGENT WIZARD MICROSERVICE TESTING ===\n")
    
    # Test 1: Health check
    print("1. Health Check:")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Service is healthy")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: Get industries
    print("\n2. Industries Endpoint:")
    try:
        response = requests.get(f"{base_url}/api/industries")
        if response.status_code == 200:
            industries = response.json()
            print(f"✅ Retrieved {len(industries)} industries")
            print(f"   First 2: {[i['label'] for i in industries[:2]]}")
        else:
            print(f"❌ Industries endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Industries error: {e}")
    
    # Test 3: Get models
    print("\n3. Models Endpoint:")
    try:
        response = requests.get(f"{base_url}/api/models")
        if response.status_code == 200:
            models = response.json()
            print(f"✅ Retrieved {len(models)} models")
            print(f"   Available: {[m['label'] for m in models[:3]]}")
        else:
            print(f"❌ Models endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Models error: {e}")
    
    # Test 4: Create valid agent
    print("\n4. Create Valid Agent:")
    valid_agent = {
        "business_name": "Test Healthcare Bot",
        "business_description": "A comprehensive medical assistant for patient care and appointment scheduling",
        "business_domain": "https://test-healthcare.com",
        "industry": "healthcare",
        "llm_model": "gpt-4-turbo",
        "interface_type": "webchat"
    }
    
    try:
        response = requests.post(f"{base_url}/api/agents", json=valid_agent)
        if response.status_code == 200:
            agent = response.json()
            print(f"✅ Agent created: {agent['business_name']} (ID: {agent['id']})")
            agent_id = agent['id']
        else:
            print(f"❌ Agent creation failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Agent creation error: {e}")
    
    # Test 5: Validation test - should fail
    print("\n5. Validation Test (should fail):")
    invalid_agent = {
        "business_name": "X",  # Too short
        "business_description": "Short",  # Too short
        "business_domain": "invalid-url",  # Invalid format
        "industry": "healthcare",
        "llm_model": "gpt-4-turbo",
        "interface_type": "webchat"
    }
    
    try:
        response = requests.post(f"{base_url}/api/agents", json=invalid_agent)
        if response.status_code == 422:  # Validation error
            print("✅ Validation correctly rejected invalid data")
            errors = response.json()
            print(f"   Validation errors: {len(errors.get('detail', []))}")
        else:
            print(f"❌ Validation should have failed but got: {response.status_code}")
    except Exception as e:
        print(f"❌ Validation test error: {e}")
    
    # Test 6: Get all agents
    print("\n6. List All Agents:")
    try:
        response = requests.get(f"{base_url}/api/agents")
        if response.status_code == 200:
            agents = response.json()
            print(f"✅ Retrieved {len(agents)} agents")
        else:
            print(f"❌ List agents failed: {response.status_code}")
    except Exception as e:
        print(f"❌ List agents error: {e}")
    
    print("\n=== TESTING COMPLETE ===")
    return True

if __name__ == "__main__":
    test_agent_wizard_service()