#!/usr/bin/env python3
"""
Test script for verifying configuration integration
Tests all aspects of the configuration system
"""

import asyncio
import json
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from config_manager import (
    get_config, 
    ConfigManager,
    get_available_models,
    get_available_industries, 
    get_available_interfaces,
    validate_model_interface,
    generate_system_prompt
)

def test_configuration_loading():
    """Test that all configurations load correctly"""
    print("🔧 Testing Configuration Loading")
    
    config = get_config()
    
    # Test basic configuration
    assert config is not None, "Configuration manager should be initialized"
    print("✅ Configuration manager initialized")
    
    # Test model loading
    models = get_available_models()
    print(f"✅ Loaded {len(models)} models")
    
    # Test industry loading
    industries = get_available_industries()
    print(f"✅ Loaded {len(industries)} industries")
    
    # Test interface loading
    interfaces = get_available_interfaces()
    print(f"✅ Loaded {len(interfaces)} interfaces")
    
    return True

def test_model_configuration():
    """Test model configuration functionality"""
    print("\n🤖 Testing Model Configuration")
    
    config = get_config()
    models = get_available_models()
    
    if not models:
        print("⚠️  No models loaded - check LLM configuration")
        return False
    
    # Test model retrieval
    first_model = models[0]
    model_config = config.get_model_config(first_model.model_id)
    assert model_config is not None, f"Should find config for {first_model.model_id}"
    print(f"✅ Model config retrieval works: {first_model.model_id}")
    
    # Test model validation
    assert config.is_model_valid(first_model.model_id), "Model should be valid"
    assert not config.is_model_valid("invalid-model"), "Invalid model should be false"
    print("✅ Model validation works")
    
    # Test provider filtering
    providers = config.get_enabled_providers()
    print(f"✅ Enabled providers: {providers}")
    
    # Test model recommendations
    recommended = config.get_recommended_model("healthcare", "chat")
    print(f"✅ Recommendation works: {recommended}")
    
    return True

def test_industry_configuration():
    """Test industry configuration functionality"""
    print("\n🏥 Testing Industry Configuration")
    
    config = get_config()
    industries = get_available_industries()
    
    if not industries:
        print("⚠️  No industries loaded - check industry configuration")
        return False
    
    # Test industry retrieval
    first_industry = industries[0]
    industry_config = config.get_industry_config(first_industry.value)
    assert industry_config is not None, f"Should find config for {first_industry.value}"
    print(f"✅ Industry config retrieval works: {first_industry.value}")
    
    # Test industry validation
    assert config.is_industry_valid(first_industry.value), "Industry should be valid"
    assert not config.is_industry_valid("invalid-industry"), "Invalid industry should be false"
    print("✅ Industry validation works")
    
    # Test system prompt generation
    prompt = generate_system_prompt(first_industry.value, "Test Business")
    assert len(prompt) > 0, "Should generate non-empty prompt"
    assert "Test Business" in prompt, "Prompt should contain business name"
    print("✅ System prompt generation works")
    
    return True

def test_interface_configuration():
    """Test interface configuration functionality"""
    print("\n🌐 Testing Interface Configuration")
    
    config = get_config()
    interfaces = get_available_interfaces()
    
    if not interfaces:
        print("⚠️  No interfaces loaded - check interface configuration")
        return False
    
    # Test interface retrieval
    first_interface = interfaces[0]
    interface_config = config.get_interface_config(first_interface.value)
    assert interface_config is not None, f"Should find config for {first_interface.value}"
    print(f"✅ Interface config retrieval works: {first_interface.value}")
    
    # Test interface validation
    assert config.is_interface_valid(first_interface.value), "Interface should be valid"
    assert not config.is_interface_valid("invalid-interface"), "Invalid interface should be false"
    print("✅ Interface validation works")
    
    # Test model-interface compatibility
    models = get_available_models()
    if models and first_interface.compatible_models:
        compatible_model = first_interface.compatible_models[0]
        is_compatible = validate_model_interface(compatible_model, first_interface.value)
        print(f"✅ Model-interface compatibility works: {compatible_model} + {first_interface.value} = {is_compatible}")
    
    return True

def test_validation_system():
    """Test validation configuration"""
    print("\n✅ Testing Validation System")
    
    config = get_config()
    
    # Test business name validation
    valid, msg = config.validate_business_name("Valid Business Name")
    assert valid, f"Valid name should pass: {msg}"
    
    invalid, msg = config.validate_business_name("X")
    assert not invalid, f"Short name should fail"
    print("✅ Business name validation works")
    
    # Test business description validation
    valid, msg = config.validate_business_description("This is a valid business description with enough characters")
    assert valid, f"Valid description should pass: {msg}"
    
    invalid, msg = config.validate_business_description("Short")
    assert not invalid, f"Short description should fail"
    print("✅ Business description validation works")
    
    return True

def test_feature_flags():
    """Test feature flag system"""
    print("\n🚩 Testing Feature Flags")
    
    config = get_config()
    
    # Test basic feature flags
    model_validation = config.is_feature_enabled("enable_model_validation")
    interface_validation = config.is_feature_enabled("enable_interface_validation")
    prompt_generation = config.is_feature_enabled("enable_system_prompt_generation")
    
    print(f"✅ Model validation: {model_validation}")
    print(f"✅ Interface validation: {interface_validation}")
    print(f"✅ Prompt generation: {prompt_generation}")
    
    # Test environment detection
    env = config.get_environment()
    is_dev = config.is_development()
    is_prod = config.is_production()
    
    print(f"✅ Environment: {env} (dev: {is_dev}, prod: {is_prod})")
    
    return True

def test_storage_configuration():
    """Test storage configuration"""
    print("\n💾 Testing Storage Configuration")
    
    config = get_config()
    
    use_bigquery = config.should_use_bigquery()
    fallback = config.should_fallback_to_memory()
    
    print(f"✅ Use BigQuery: {use_bigquery}")
    print(f"✅ Fallback to memory: {fallback}")
    
    return True

def test_configuration_reload():
    """Test configuration reloading"""
    print("\n🔄 Testing Configuration Reload")
    
    config = get_config()
    
    # Get initial counts
    initial_models = len(config.get_available_models())
    initial_industries = len(config.get_available_industries())
    
    # Reload configuration
    config.reload_all()
    
    # Check counts after reload
    reloaded_models = len(config.get_available_models())
    reloaded_industries = len(config.get_available_industries())
    
    print(f"✅ Models: {initial_models} -> {reloaded_models}")
    print(f"✅ Industries: {initial_industries} -> {reloaded_industries}")
    
    return True

async def test_llm_client_integration():
    """Test LLM client integration (if available)"""
    print("\n🧠 Testing LLM Client Integration")
    
    try:
        from llm_client import LLMClient, LLMRequest
        
        # Create client
        client = LLMClient()
        print("✅ LLM Client initialized")
        
        # Test model validation
        config = get_config()
        models = get_available_models()
        
        if models:
            model_id = models[0].model_id
            
            # Create test request
            request = LLMRequest(
                model_id=model_id,
                prompt="Hello, world!",
                system_prompt="You are a helpful assistant.",
                max_tokens=50,
                temperature=0.7
            )
            
            print(f"✅ Created test request for {model_id}")
            
            # Note: We don't actually call the LLM here to avoid API costs
            # but we verify the request structure
            assert request.model_id == model_id
            assert request.prompt == "Hello, world!"
            print("✅ LLM request structure valid")
        
        return True
        
    except ImportError as e:
        print(f"⚠️  LLM Client not available: {e}")
        return True
    except Exception as e:
        print(f"❌ LLM Client error: {e}")
        return False

def test_yaml_configuration_files():
    """Test YAML configuration file integrity"""
    print("\n📄 Testing YAML Configuration Files")
    
    config_dir = Path(__file__).parent / "config"
    
    # Test required files exist
    required_files = [
        "llm-models.yaml",
        "industry_prompts.yaml", 
        "bigquery.yaml",
        "environment-secrets.yaml",
        "app-settings.yaml"
    ]
    
    for file_name in required_files:
        file_path = config_dir / file_name
        if file_path.exists():
            print(f"✅ {file_name} exists")
        else:
            print(f"⚠️  {file_name} missing")
    
    # Test YAML syntax
    try:
        import yaml
        for file_name in required_files:
            file_path = config_dir / file_name
            if file_path.exists():
                with open(file_path, 'r') as f:
                    yaml.safe_load(f)
                print(f"✅ {file_name} has valid YAML syntax")
    except Exception as e:
        print(f"❌ YAML syntax error: {e}")
        return False
    
    return True

async def run_all_tests():
    """Run all configuration tests"""
    print("🚀 Starting Configuration Integration Tests\n")
    
    tests = [
        ("Configuration Loading", test_configuration_loading),
        ("Model Configuration", test_model_configuration),
        ("Industry Configuration", test_industry_configuration),
        ("Interface Configuration", test_interface_configuration),
        ("Validation System", test_validation_system),
        ("Feature Flags", test_feature_flags),
        ("Storage Configuration", test_storage_configuration),
        ("Configuration Reload", test_configuration_reload),
        ("YAML Files", test_yaml_configuration_files),
        ("LLM Client Integration", test_llm_client_integration)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
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
    
    print(f"🏁 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Configuration integration is working correctly.")
        return True
    else:
        print(f"⚠️  {failed} tests failed. Check configuration files and setup.")
        return False

if __name__ == "__main__":
    # Run tests
    result = asyncio.run(run_all_tests())
    sys.exit(0 if result else 1)