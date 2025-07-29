#!/usr/bin/env python3
"""
Shared Configuration Manager for All Microservices
Provides unified configuration system with environment detection
"""

import os
import yaml
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from enum import Enum

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Environment(str, Enum):
    """Environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

@dataclass
class ServiceConfig:
    """Service-specific configuration"""
    name: str
    port: int
    host: str = "0.0.0.0"
    debug: bool = False
    cors_origins: List[str] = None
    timeout: int = 30
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ["*"]

@dataclass
class DatabaseConfig:
    """Database configuration"""
    use_bigquery: bool = False
    project_id: Optional[str] = None
    dataset_id: str = "agenthub"
    location: str = "us-central1"
    fallback_to_memory: bool = True
    
@dataclass
class StorageConfig:
    """Storage configuration"""
    type: str = "memory"  # "memory", "bigquery", "postgresql"
    connection_string: Optional[str] = None
    pool_size: int = 10
    timeout: int = 10

class ConfigManager:
    """Centralized configuration manager for all microservices"""
    
    def __init__(self, service_name: str, config_dir: Optional[str] = None):
        self.service_name = service_name
        self.config_dir = Path(config_dir) if config_dir else Path(__file__).parent / "config"
        self.environment = self._detect_environment()
        
        # Load configurations
        self._load_all_configs()
        
        logger.info(f"ConfigManager initialized for {service_name} in {self.environment} environment")
    
    def _detect_environment(self) -> Environment:
        """Detect current environment from various indicators"""
        
        # Check explicit environment variable
        env_var = os.getenv("ENVIRONMENT", "").lower()
        if env_var in ["production", "prod"]:
            return Environment.PRODUCTION
        elif env_var in ["staging", "stage"]:
            return Environment.STAGING
        elif env_var in ["development", "dev"]:
            return Environment.DEVELOPMENT
        
        # Check for production indicators
        production_indicators = [
            os.getenv("NODE_ENV") == "production",
            os.getenv("FLASK_ENV") == "production", 
            os.getenv("DEPLOYMENT_ENV") == "production",
            os.getenv("GOOGLE_CLOUD_PROJECT_ID") and not os.getenv("GOOGLE_CLOUD_PROJECT_ID").endswith("-dev"),
            os.getenv("REPL_DEPLOYMENT") == "true",
            bool(os.getenv("PRODUCTION_MODE")),
        ]
        
        if any(production_indicators):
            return Environment.PRODUCTION
        
        # Check for staging indicators
        staging_indicators = [
            os.getenv("NODE_ENV") == "staging",
            os.getenv("FLASK_ENV") == "staging",
            os.getenv("DEPLOYMENT_ENV") == "staging", 
            os.getenv("GOOGLE_CLOUD_PROJECT_ID", "").endswith("-staging"),
            bool(os.getenv("STAGING_MODE")),
        ]
        
        if any(staging_indicators):
            return Environment.STAGING
        
        # Default to development
        return Environment.DEVELOPMENT
    
    def _load_yaml_with_env(self, filename: str) -> Dict[str, Any]:
        """Load YAML file with environment variable substitution"""
        config_path = self.config_dir / filename
        
        if not config_path.exists():
            logger.warning(f"Config file not found: {config_path}")
            return {}
        
        try:
            with open(config_path, 'r') as f:
                content = f.read()
            
            # Substitute environment variables
            content = self._substitute_env_vars(content)
            
            # Parse YAML
            config = yaml.safe_load(content)
            return config or {}
            
        except Exception as e:
            logger.error(f"Error loading config {filename}: {e}")
            return {}
    
    def _substitute_env_vars(self, content: str) -> str:
        """Substitute environment variables in YAML content"""
        
        # Pattern for ${VAR} and ${VAR:default}
        pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'
        
        def replace_env_var(match):
            var_name = match.group(1)
            default_value = match.group(2) if match.group(2) is not None else ""
            
            env_value = os.getenv(var_name, default_value)
            return env_value
        
        # Replace all environment variables
        content = re.sub(pattern, replace_env_var, content)
        
        # Handle any remaining ${VAR} patterns without defaults
        def replace_remaining(match):
            var_name = match.group(1)
            env_value = os.getenv(var_name, "")
            return env_value
        
        pattern = r'\$\{([^}]+)\}'
        content = re.sub(pattern, replace_remaining, content)
        
        return content
    
    def _load_all_configs(self):
        """Load all configuration files"""
        
        # Load base configurations
        self.app_config = self._load_yaml_with_env("app-settings.yaml")
        self.services_config = self._load_yaml_with_env("services.yaml") 
        self.storage_config = self._load_yaml_with_env("storage.yaml")
        self.secrets_config = self._load_yaml_with_env("environment-secrets.yaml")
        
        # Load service-specific config if exists
        service_config_file = f"{self.service_name}-config.yaml"
        self.service_specific_config = self._load_yaml_with_env(service_config_file)
        
        logger.info(f"Loaded configurations for {self.service_name}")
    
    def reload_all(self):
        """Reload all configurations"""
        self._load_all_configs()
        logger.info("All configurations reloaded")
    
    # Environment Detection Methods
    def get_environment(self) -> str:
        """Get current environment"""
        return self.environment.value
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == Environment.DEVELOPMENT
    
    def is_staging(self) -> bool:
        """Check if running in staging"""
        return self.environment == Environment.STAGING
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == Environment.PRODUCTION
    
    # Service Configuration Methods
    def get_service_config(self) -> ServiceConfig:
        """Get service-specific configuration"""
        
        # Get service config from services.yaml or defaults
        service_configs = self.services_config.get("services", {})
        service_data = service_configs.get(self.service_name, {})
        
        # Override with environment-specific values
        if self.is_production():
            service_data.update(service_data.get("production", {}))
        elif self.is_staging():
            service_data.update(service_data.get("staging", {}))
        else:
            service_data.update(service_data.get("development", {}))
        
        return ServiceConfig(
            name=self.service_name,
            port=int(service_data.get("port", self._get_default_port())),
            host=service_data.get("host", "0.0.0.0"),
            debug=service_data.get("debug", self.is_development()),
            cors_origins=service_data.get("cors_origins", ["*"]),
            timeout=int(service_data.get("timeout", 30))
        )
    
    def _get_default_port(self) -> int:
        """Get default port for service"""
        port_mapping = {
            "agent-wizard": 8001,
            "analytics": 8002,
            "billing": 8003,
            "dashboard": 8004,
            "widget": 8005,
            "my-agents": 8006,
            "insights": 8007
        }
        return port_mapping.get(self.service_name, 8000)
    
    def get_service_urls(self) -> Dict[str, str]:
        """Get URLs for all services"""
        services = self.services_config.get("services", {})
        urls = {}
        
        for service_name, config in services.items():
            if service_name == self.service_name:
                continue
                
            host = config.get("host", "localhost")
            port = config.get("port", self._get_default_port())
            
            # Use environment-specific overrides
            if self.is_production():
                env_config = config.get("production", {})
                host = env_config.get("host", host)
                port = env_config.get("port", port)
            elif self.is_staging():
                env_config = config.get("staging", {})
                host = env_config.get("host", host)
                port = env_config.get("port", port)
            
            urls[service_name] = f"http://{host}:{port}"
        
        return urls
    
    # Storage Configuration Methods
    def get_storage_config(self) -> StorageConfig:
        """Get storage configuration"""
        storage_data = self.storage_config.get("storage", {})
        
        # Environment-specific overrides
        if self.is_production():
            storage_data.update(storage_data.get("production", {}))
        elif self.is_staging():
            storage_data.update(storage_data.get("staging", {}))
        else:
            storage_data.update(storage_data.get("development", {}))
        
        return StorageConfig(
            type=storage_data.get("type", "memory"),
            connection_string=storage_data.get("connection_string"),
            pool_size=int(storage_data.get("pool_size", 10)),
            timeout=int(storage_data.get("timeout", 10))
        )
    
    def get_database_config(self) -> DatabaseConfig:
        """Get database configuration"""
        db_data = self.storage_config.get("database", {})
        
        # Environment-specific overrides
        if self.is_production():
            db_data.update(db_data.get("production", {}))
        elif self.is_staging():
            db_data.update(db_data.get("staging", {}))
        else:
            db_data.update(db_data.get("development", {}))
        
        return DatabaseConfig(
            use_bigquery=db_data.get("use_bigquery", False),
            project_id=db_data.get("project_id"),
            dataset_id=db_data.get("dataset_id", "agenthub"),
            location=db_data.get("location", "us-central1"),
            fallback_to_memory=db_data.get("fallback_to_memory", True)
        )
    
    # Feature Flags
    def is_feature_enabled(self, feature_name: str) -> bool:
        """Check if a feature is enabled"""
        features = self.app_config.get("features", {})
        
        # Check environment-specific features
        env_features = features.get(self.environment.value, {})
        if feature_name in env_features:
            return self._convert_to_bool(env_features[feature_name])
        
        # Check global features
        return self._convert_to_bool(features.get(feature_name, False))
    
    def _convert_to_bool(self, value: Union[str, bool]) -> bool:
        """Convert string or bool to bool"""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ["true", "1", "yes", "on", "enabled"]
        return bool(value)
    
    # Application Settings
    def get_app_setting(self, setting_path: str, default: Any = None) -> Any:
        """Get application setting using dot notation (e.g., 'api.timeout')"""
        try:
            keys = setting_path.split('.')
            value = self.app_config
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default
            
            return value
        except Exception:
            return default
    
    def get_service_setting(self, setting_path: str, default: Any = None) -> Any:
        """Get service-specific setting"""
        try:
            keys = setting_path.split('.')
            value = self.service_specific_config
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default
            
            return value
        except Exception:
            return default
    
    # Pricing and Cost Configuration
    def get_pricing_config(self) -> Dict[str, Any]:
        """Get pricing configuration"""
        return self.app_config.get("pricing", {})
    
    def get_model_pricing(self, model_id: str) -> Dict[str, float]:
        """Get pricing for a specific model"""
        pricing = self.get_pricing_config()
        models = pricing.get("models", {})
        return models.get(model_id, {"input": 0.0, "output": 0.0})
    
    # Validation Configuration
    def get_validation_rules(self) -> Dict[str, Any]:
        """Get validation rules"""
        return self.app_config.get("validation", {})
    
    def validate_field(self, field_name: str, value: str) -> tuple[bool, str]:
        """Validate a field according to configuration"""
        rules = self.get_validation_rules().get(field_name, {})
        
        if not rules:
            return True, ""
        
        # Check min/max length
        min_length = rules.get("min_length", 0)
        max_length = rules.get("max_length", float('inf'))
        
        if isinstance(min_length, str):
            min_length = int(min_length)
        if isinstance(max_length, str):
            max_length = int(max_length)
        
        if len(value) < min_length:
            return False, f"{field_name} must be at least {min_length} characters"
        if len(value) > max_length:
            return False, f"{field_name} must be less than {max_length} characters"
        
        # Check pattern if provided
        pattern = rules.get("pattern")
        if pattern:
            import re
            if not re.match(pattern, value):
                return False, f"{field_name} format is invalid"
        
        return True, ""
    
    # Monitoring and Logging
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration"""
        return self.app_config.get("logging", {})
    
    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration"""
        return self.app_config.get("monitoring", {})
    
    # Status and Health
    def get_status(self) -> Dict[str, Any]:
        """Get configuration status"""
        return {
            "service": self.service_name,
            "environment": self.environment.value,
            "storage_type": self.get_storage_config().type,
            "features_enabled": [
                name for name in self.app_config.get("features", {}).keys()
                if self.is_feature_enabled(name)
            ],
            "config_files_loaded": [
                "app-settings.yaml",
                "services.yaml", 
                "storage.yaml",
                "environment-secrets.yaml"
            ] + ([f"{self.service_name}-config.yaml"] if self.service_specific_config else []),
            "last_reload": datetime.now().isoformat() if hasattr(self, '_last_reload') else None
        }

# Global configuration instance per service
_config_instances: Dict[str, ConfigManager] = {}

def get_config(service_name: str, config_dir: Optional[str] = None) -> ConfigManager:
    """Get or create configuration manager instance for service"""
    if service_name not in _config_instances:
        _config_instances[service_name] = ConfigManager(service_name, config_dir)
    return _config_instances[service_name]

def reload_config(service_name: str):
    """Reload configuration for service"""
    if service_name in _config_instances:
        _config_instances[service_name].reload_all()

# Import here to avoid circular imports
from datetime import datetime