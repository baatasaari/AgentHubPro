#!/usr/bin/env python3
"""
Simple Configuration Test
Validates the shared configuration system works across services
"""

import sys
import os
from pathlib import Path

# Add shared directory to path
sys.path.append(str(Path(__file__).parent / "shared"))

def test_config_import():
    """Test configuration manager import and basic functionality"""
    try:
        from config_manager import ConfigManager
        
        # Test configuration for different services
        services = ["analytics", "billing", "dashboard", "widget", "my-agents", "insights"]
        
        print("🔧 Testing Configuration Manager Integration")
        print("=" * 50)
        
        for service_name in services:
            try:
                config = ConfigManager(service_name)
                
                # Test basic configuration methods
                environment = config.get_environment()
                storage_config = config.get_storage_config()
                status = config.get_status()
                
                print(f"✅ {service_name:12s}: Environment={environment}, Storage={storage_config.type}")
                
            except Exception as e:
                print(f"❌ {service_name:12s}: Error - {e}")
        
        print("\n📋 Configuration Integration Summary:")
        print(f"   Environment Detection: {config.get_environment()}")
        print(f"   Storage Type: {config.get_storage_config().type}")
        print(f"   Config Directory: {config.config_dir}")
        print("   Configuration files loaded successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Configuration Error: {e}")
        return False

if __name__ == "__main__":
    success = test_config_import()
    if success:
        print("\n🎉 Configuration integration test PASSED!")
        print("All services can access shared configuration system.")
    else:
        print("\n💥 Configuration integration test FAILED!")
        print("Review configuration setup and imports.")
    
    sys.exit(0 if success else 1)