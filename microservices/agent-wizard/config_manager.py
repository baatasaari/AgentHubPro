#!/usr/bin/env python3
"""
Configuration Manager for Agent Wizard Microservice
Centralized configuration loading and management for all services
"""

import os
import re
import yaml
import logging
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """Model configuration data class"""
    model_id: str
    display_name: str
    description: str
    provider: str
    max_tokens: int
    max_output_tokens: Optional[int] = None
    temperature_range: List[float] = field(default_factory=lambda: [0.0, 1.0])
    top_p_range: List[float] = field(default_factory=lambda: [0.0, 1.0])
    top_k_range: Optional[List[int]] = None
    pricing: Dict[str, float] = field(default_factory=dict)
    features: List[str] = field(default_factory=list)
    safety_settings: Dict[str, str] = field(default_factory=dict)

@dataclass
class IndustryConfig:
    """Industry configuration data class"""
    value: str
    name: str
    icon: str
    system_prompt: str
    description: Optional[str] = None
    keywords: List[str] = field(default_factory=list)
    recommended_models: List[str] = field(default_factory=list)

@dataclass
class InterfaceConfig:
    """Interface type configuration data class"""
    value: str
    label: str
    description: str
    compatible_models: List[str] = field(default_factory=list)
    features: List[str] = field(default_factory=list)

class ConfigManager:
    """Centralized configuration manager for Agent Wizard"""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize configuration manager"""
        self.config_dir = config_dir or Path(__file__).parent / "config"
        self._llm_config = None
        self._industry_config = None
        self._bigquery_config = None
        self._secrets_config = None
        self._app_config = None
        
        # Load all configurations
        self.reload_all()
    
    def reload_all(self):
        """Reload all configurations"""
        try:
            self._llm_config = self._load_yaml_with_env("llm-models.yaml")
            self._industry_config = self._load_yaml_with_env("industry_prompts.yaml")
            self._bigquery_config = self._load_yaml_with_env("bigquery.yaml")
            self._app_config = self._load_application_config()
            logger.info("All configurations loaded successfully")
        except Exception as e:
            logger.error(f"Error loading configurations: {e}")
            raise
    
    def _load_yaml_with_env(self, filename: str) -> Dict[str, Any]:
        """Load YAML file with environment variable substitution"""
        config_path = self.config_dir / filename
        
        try:
            with open(config_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Replace environment variables
            content = self._substitute_env_vars(content)
            
            return yaml.safe_load(content)
        except FileNotFoundError:
            logger.warning(f"Configuration file not found: {config_path}")
            return {}
        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML file {filename}: {e}")
            return {}
    
    def _substitute_env_vars(self, content: str) -> str:
        """Substitute environment variables in configuration content"""
        # Replace ${VAR} patterns
        for env_var in os.environ:
            content = content.replace(f"${{{env_var}}}", os.environ[env_var])
        
        # Replace ${VAR:default} patterns
        pattern = r'\$\{([^:}]+):([^}]+)\}'
        def replace_with_default(match):
            var_name, default_value = match.groups()
            return os.environ.get(var_name, default_value)
        
        content = re.sub(pattern, replace_with_default, content)
        
        # Handle any remaining ${VAR} patterns with empty values
        pattern = r'\$\{([^}]+)\}'
        def replace_remaining(match):
            var_name = match.group(1)
            return os.environ.get(var_name, "")
        
        content = re.sub(pattern, replace_remaining, content)
        
        return content
    
    def _load_application_config(self) -> Dict[str, Any]:
        """Load application-specific configuration"""
        try:
            return self._load_yaml_with_env("app-settings.yaml")
        except Exception as e:
            logger.warning(f"Failed to load app settings, using defaults: {e}")
            return {
                "validation": {
                    "business_name": {
                        "min_length": int(os.getenv("BUSINESS_NAME_MIN_LENGTH", "2")),
                        "max_length": int(os.getenv("BUSINESS_NAME_MAX_LENGTH", "100"))
                    },
                    "business_description": {
                        "min_length": int(os.getenv("BUSINESS_DESC_MIN_LENGTH", "10")),
                        "max_length": int(os.getenv("BUSINESS_DESC_MAX_LENGTH", "500"))
                    }
                },
                "storage": {
                    "use_bigquery": os.getenv("USE_BIGQUERY", "false").lower() == "true",
                    "fallback_to_memory": os.getenv("FALLBACK_TO_MEMORY", "true").lower() == "true"
                },
                "features": {
                    "enable_model_validation": os.getenv("ENABLE_MODEL_VALIDATION", "true").lower() == "true",
                    "enable_interface_validation": os.getenv("ENABLE_INTERFACE_VALIDATION", "true").lower() == "true",
                    "enable_system_prompt_generation": os.getenv("ENABLE_SYSTEM_PROMPT_GEN", "true").lower() == "true"
                }
            }
    
    # LLM Configuration Methods
    def get_available_models(self) -> List[ModelConfig]:
        """Get all available LLM models from configuration"""
        models = []
        llm_providers = self._llm_config.get("llm_providers", {})
        
        for provider_name, provider_config in llm_providers.items():
            if not provider_config.get("enabled", False):
                continue
                
            for model_id, model_config in provider_config.get("models", {}).items():
                models.append(ModelConfig(
                    model_id=model_id,
                    display_name=model_config.get("display_name", model_id),
                    description=model_config.get("description", ""),
                    provider=provider_name,
                    max_tokens=model_config.get("max_tokens", 4096),
                    max_output_tokens=model_config.get("max_output_tokens"),
                    temperature_range=model_config.get("temperature_range", [0.0, 1.0]),
                    top_p_range=model_config.get("top_p_range", [0.0, 1.0]),
                    top_k_range=model_config.get("top_k_range"),
                    pricing=model_config.get("pricing", {}),
                    features=model_config.get("features", []),
                    safety_settings=model_config.get("safety_settings", {})
                ))
        
        return models
    
    def get_model_config(self, model_id: str) -> Optional[ModelConfig]:
        """Get configuration for specific model"""
        for model in self.get_available_models():
            if model.model_id == model_id:
                return model
        return None
    
    def get_models_by_provider(self, provider: str) -> List[ModelConfig]:
        """Get models by provider"""
        return [model for model in self.get_available_models() if model.provider == provider]
    
    def get_models_by_feature(self, feature: str) -> List[ModelConfig]:
        """Get models that support a specific feature"""
        return [model for model in self.get_available_models() if feature in model.features]
    
    def is_model_valid(self, model_id: str) -> bool:
        """Check if model is valid and available"""
        return any(model.model_id == model_id for model in self.get_available_models())
    
    def get_recommended_model(self, industry: str = None, use_case: str = None) -> str:
        """Get recommended model based on industry and use case"""
        policies = self._llm_config.get("model_policies", {})
        
        # Check industry recommendations
        if industry:
            industry_recs = policies.get("industry_recommendations", {}).get(industry, {})
            if industry_recs and "primary" in industry_recs:
                primary_model = industry_recs["primary"]
                if self.is_model_valid(primary_model):
                    return primary_model
                # Try fallback model
                fallback_model = industry_recs.get("fallback")
                if fallback_model and self.is_model_valid(fallback_model):
                    return fallback_model
        
        # Check use case defaults
        if use_case:
            defaults = policies.get("defaults", {})
            default_model = defaults.get(use_case)
            if default_model and self.is_model_valid(default_model):
                return default_model
        
        # Final fallback - get first available model
        available_models = self.get_available_models()
        if available_models:
            return available_models[0].model_id
        
        return "gpt-3.5-turbo"  # Hard fallback
    
    # Industry Configuration Methods
    def get_available_industries(self) -> List[IndustryConfig]:
        """Get all available industries from configuration"""
        industries = []
        industry_data = self._industry_config.get("industries", {})
        
        for industry_key, industry_config in industry_data.items():
            industries.append(IndustryConfig(
                value=industry_key,
                name=industry_config.get("name", industry_key.title()),
                icon=industry_config.get("icon", "help-circle"),
                system_prompt=industry_config.get("system_prompt", ""),
                description=industry_config.get("description"),
                keywords=industry_config.get("keywords", []),
                recommended_models=industry_config.get("recommended_models", [])
            ))
        
        return industries
    
    def get_industry_config(self, industry_key: str) -> Optional[IndustryConfig]:
        """Get configuration for specific industry"""
        for industry in self.get_available_industries():
            if industry.value == industry_key:
                return industry
        return None
    
    def is_industry_valid(self, industry_key: str) -> bool:
        """Check if industry is valid"""
        return any(industry.value == industry_key for industry in self.get_available_industries())
    
    def generate_system_prompt(self, industry: str, business_name: str) -> str:
        """Generate system prompt for industry and business"""
        industry_config = self.get_industry_config(industry)
        
        if industry_config and industry_config.system_prompt:
            try:
                return industry_config.system_prompt.format(business_name=business_name)
            except KeyError as e:
                logger.warning(f"System prompt formatting error for {industry}: {e}")
        
        # Fallback prompt
        return f"You are a helpful assistant for {business_name}. Assist customers with their inquiries and provide excellent customer service. Be professional, friendly, and helpful in all interactions."
    
    # Interface Configuration Methods
    def get_available_interfaces(self) -> List[InterfaceConfig]:
        """Get available interface types"""
        interface_config = self._llm_config.get("interface_types", {})
        
        interfaces = []
        
        # Use config if available, otherwise defaults
        if interface_config:
            for interface_key, interface_conf in interface_config.items():
                interfaces.append(InterfaceConfig(
                    value=interface_key,
                    label=interface_conf.get("label", interface_key.title()),
                    description=interface_conf.get("description", ""),
                    compatible_models=interface_conf.get("compatible_models", []),
                    features=interface_conf.get("features", [])
                ))
        else:
            # Default interfaces if not in config
            all_models = [model.model_id for model in self.get_available_models()]
            fast_models = [model.model_id for model in self.get_available_models() 
                          if "fast_inference" in model.features or model.provider in ["openai", "anthropic"]]
            
            interfaces.extend([
                InterfaceConfig(
                    value="webchat",
                    label="Web Chat Widget",
                    description="Embeddable chat interface for your website",
                    compatible_models=all_models,
                    features=["real_time", "embeddable", "customizable"]
                ),
                InterfaceConfig(
                    value="whatsapp",
                    label="WhatsApp Integration",
                    description="Connect via WhatsApp Business API",
                    compatible_models=fast_models,
                    features=["messaging", "media_support", "business_api"]
                )
            ])
        
        return interfaces
    
    def get_interface_config(self, interface_key: str) -> Optional[InterfaceConfig]:
        """Get configuration for specific interface"""
        for interface in self.get_available_interfaces():
            if interface.value == interface_key:
                return interface
        return None
    
    def is_interface_valid(self, interface_key: str) -> bool:
        """Check if interface is valid"""
        return any(interface.value == interface_key for interface in self.get_available_interfaces())
    
    def validate_model_interface_compatibility(self, model_id: str, interface_type: str) -> bool:
        """Validate model compatibility with interface type"""
        if not self._app_config.get("features", {}).get("enable_interface_validation", True):
            return True
            
        interface_config = self.get_interface_config(interface_type)
        if not interface_config:
            return False
            
        return model_id in interface_config.compatible_models
    
    # Validation Configuration Methods
    def get_validation_config(self, field: str) -> Dict[str, Any]:
        """Get validation configuration for a field"""
        return self._app_config.get("validation", {}).get(field, {})
    
    def validate_business_name(self, name: str) -> tuple[bool, str]:
        """Validate business name according to configuration"""
        config = self.get_validation_config("business_name")
        
        # Convert string values to int if needed
        min_length = config.get("min_length", 2)
        max_length = config.get("max_length", 100)
        
        if isinstance(min_length, str):
            min_length = int(min_length)
        if isinstance(max_length, str):
            max_length = int(max_length)
        
        if not name or len(name.strip()) < min_length:
            return False, f"Business name must be at least {min_length} characters"
        if len(name) > max_length:
            return False, f"Business name must be less than {max_length} characters"
        
        return True, ""
    
    def validate_business_description(self, description: str) -> tuple[bool, str]:
        """Validate business description according to configuration"""
        config = self.get_validation_config("business_description")
        
        # Convert string values to int if needed
        min_length = config.get("min_length", 10)
        max_length = config.get("max_length", 500)
        
        if isinstance(min_length, str):
            min_length = int(min_length)
        if isinstance(max_length, str):
            max_length = int(max_length)
        
        if not description or len(description.strip()) < min_length:
            return False, f"Description must be at least {min_length} characters"
        if len(description) > max_length:
            return False, f"Description must be less than {max_length} characters"
        
        return True, ""
    
    # BigQuery Configuration Methods
    def get_bigquery_config(self) -> Dict[str, Any]:
        """Get BigQuery configuration"""
        return self._bigquery_config.get("bigquery", {})
    
    def should_use_bigquery(self) -> bool:
        """Check if BigQuery should be used"""
        return self._app_config.get("storage", {}).get("use_bigquery", False)
    
    def should_fallback_to_memory(self) -> bool:
        """Check if should fallback to in-memory storage"""
        return self._app_config.get("storage", {}).get("fallback_to_memory", True)
    
    # Environment and Feature Methods
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled"""
        return self._app_config.get("features", {}).get(feature, True)
    
    def get_environment(self) -> str:
        """Get current environment"""
        return os.getenv("ENVIRONMENT", "development")
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.get_environment() in ["development", "dev"]
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.get_environment() in ["production", "prod"]
    
    # LLM Provider Configuration
    def get_provider_config(self, provider: str) -> Dict[str, Any]:
        """Get configuration for specific LLM provider"""
        return self._llm_config.get("llm_providers", {}).get(provider, {})
    
    def is_provider_enabled(self, provider: str) -> bool:
        """Check if LLM provider is enabled"""
        return self.get_provider_config(provider).get("enabled", False)
    
    def get_enabled_providers(self) -> List[str]:
        """Get list of enabled providers"""
        providers = []
        for provider_name, config in self._llm_config.get("llm_providers", {}).items():
            if config.get("enabled", False):
                providers.append(provider_name)
        return providers
    
    # Rate Limiting Configuration
    def get_rate_limits(self) -> Dict[str, Any]:
        """Get rate limiting configuration"""
        return self._llm_config.get("rate_limits", {})
    
    def get_cost_limits(self) -> Dict[str, Any]:
        """Get cost limiting configuration"""
        return self._llm_config.get("model_policies", {}).get("cost_optimization", {})

# Global configuration instance
config_manager = ConfigManager()

def get_config() -> ConfigManager:
    """Get global configuration manager instance"""
    return config_manager

def reload_config():
    """Reload all configurations"""
    global config_manager
    config_manager.reload_all()

# Export commonly used functions
def get_available_models() -> List[ModelConfig]:
    """Get available models"""
    return config_manager.get_available_models()

def get_available_industries() -> List[IndustryConfig]:
    """Get available industries"""
    return config_manager.get_available_industries()

def get_available_interfaces() -> List[InterfaceConfig]:
    """Get available interfaces"""
    return config_manager.get_available_interfaces()

def validate_model_interface(model_id: str, interface_type: str) -> bool:
    """Validate model-interface compatibility"""
    return config_manager.validate_model_interface_compatibility(model_id, interface_type)

def generate_system_prompt(industry: str, business_name: str) -> str:
    """Generate system prompt"""
    return config_manager.generate_system_prompt(industry, business_name)