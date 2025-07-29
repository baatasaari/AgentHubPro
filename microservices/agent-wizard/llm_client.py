#!/usr/bin/env python3
"""
LLM Client for AgentHub Platform
Unified client for all supported LLM providers with comprehensive configuration
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
import yaml
from pathlib import Path

# Provider-specific imports
try:
    from google.cloud import aiplatform
    from google.oauth2 import service_account
    import vertexai
    from vertexai.generative_models import GenerativeModel, Part
    VERTEX_AI_AVAILABLE = True
except ImportError:
    VERTEX_AI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

logger = logging.getLogger(__name__)

class LLMProvider(str, Enum):
    GOOGLE = "google"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"

class ModelCapability(str, Enum):
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    EMBEDDING = "embedding"
    MULTIMODAL = "multimodal"
    FAST_INFERENCE = "fast_inference"

@dataclass
class LLMRequest:
    model_id: str
    prompt: str
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    stop_sequences: Optional[List[str]] = None
    functions: Optional[List[Dict]] = None
    system_prompt: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None
    stream: bool = False

@dataclass
class LLMResponse:
    content: str
    model_id: str
    provider: str
    tokens_used: Dict[str, int]
    cost: float
    response_time_ms: float
    metadata: Dict[str, Any]
    error: Optional[str] = None

class LLMConfig:
    """Configuration manager for LLM models"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "config/llm-models.yaml"
        self.config = self._load_config()
        self.providers = {}
        self._initialize_providers()
    
    def _load_config(self) -> Dict:
        """Load LLM configuration from YAML file"""
        try:
            config_file = Path(__file__).parent / self.config_path
            with open(config_file, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load LLM config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Get default configuration if file loading fails"""
        return {
            "llm_providers": {
                "google": {"enabled": False},
                "openai": {"enabled": False},
                "anthropic": {"enabled": False},
                "azure_openai": {"enabled": False}
            }
        }
    
    def _initialize_providers(self):
        """Initialize available LLM providers"""
        for provider_name, provider_config in self.config.get("llm_providers", {}).items():
            if provider_config.get("enabled", False):
                try:
                    if provider_name == "google" and VERTEX_AI_AVAILABLE:
                        self.providers[provider_name] = GoogleVertexAIProvider(provider_config)
                    elif provider_name == "openai" and OPENAI_AVAILABLE:
                        self.providers[provider_name] = OpenAIProvider(provider_config)
                    elif provider_name == "anthropic" and ANTHROPIC_AVAILABLE:
                        self.providers[provider_name] = AnthropicProvider(provider_config)
                    elif provider_name == "azure_openai" and OPENAI_AVAILABLE:
                        self.providers[provider_name] = AzureOpenAIProvider(provider_config)
                    
                    logger.info(f"Initialized {provider_name} provider")
                except Exception as e:
                    logger.error(f"Failed to initialize {provider_name} provider: {e}")
    
    def get_model_config(self, model_id: str) -> Optional[Dict]:
        """Get configuration for a specific model"""
        for provider_config in self.config.get("llm_providers", {}).values():
            models = provider_config.get("models", {})
            if model_id in models:
                return models[model_id]
        return None
    
    def get_available_models(self) -> List[str]:
        """Get list of all available models"""
        models = []
        for provider_config in self.config.get("llm_providers", {}).values():
            if provider_config.get("enabled", False):
                models.extend(provider_config.get("models", {}).keys())
        return models
    
    def get_models_by_capability(self, capability: ModelCapability) -> List[str]:
        """Get models that support a specific capability"""
        models = []
        for provider_config in self.config.get("llm_providers", {}).values():
            if provider_config.get("enabled", False):
                for model_id, model_config in provider_config.get("models", {}).items():
                    if capability in model_config.get("features", []):
                        models.append(model_id)
        return models

class BaseLLMProvider:
    """Base class for LLM providers"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the provider client"""
        raise NotImplementedError
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response from the model"""
        raise NotImplementedError
    
    def _calculate_cost(self, model_id: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost based on token usage"""
        model_config = self.config.get("models", {}).get(model_id, {})
        pricing = model_config.get("pricing", {})
        
        input_cost = (input_tokens / 1000) * pricing.get("input_tokens", 0)
        output_cost = (output_tokens / 1000) * pricing.get("output_tokens", 0)
        
        return input_cost + output_cost

class GoogleVertexAIProvider(BaseLLMProvider):
    """Google Vertex AI provider"""
    
    def _initialize_client(self):
        """Initialize Vertex AI client"""
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
        location = self.config.get("location", "us-central1")
        
        # Initialize Vertex AI
        vertexai.init(project=project_id, location=location)
        
        # Set up authentication if service account key provided
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path:
            credentials = service_account.Credentials.from_service_account_file(credentials_path)
            aiplatform.init(credentials=credentials)
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Vertex AI"""
        start_time = datetime.now()
        
        try:
            # Initialize the model
            model = GenerativeModel(request.model_id)
            
            # Prepare the prompt
            if request.system_prompt:
                full_prompt = f"System: {request.system_prompt}\n\nHuman: {request.prompt}"
            else:
                full_prompt = request.prompt
            
            # Set generation config
            generation_config = {}
            if request.max_tokens:
                generation_config["max_output_tokens"] = request.max_tokens
            if request.temperature is not None:
                generation_config["temperature"] = request.temperature
            if request.top_p is not None:
                generation_config["top_p"] = request.top_p
            if request.top_k is not None:
                generation_config["top_k"] = request.top_k
            
            # Generate response
            response = model.generate_content(
                full_prompt,
                generation_config=generation_config if generation_config else None
            )
            
            # Calculate metrics
            end_time = datetime.now()
            response_time_ms = (end_time - start_time).total_seconds() * 1000
            
            # Extract token usage
            usage = response.usage_metadata
            input_tokens = usage.prompt_token_count if usage else 0
            output_tokens = usage.candidates_token_count if usage else 0
            
            # Calculate cost
            cost = self._calculate_cost(request.model_id, input_tokens, output_tokens)
            
            return LLMResponse(
                content=response.text,
                model_id=request.model_id,
                provider="google",
                tokens_used={"input": input_tokens, "output": output_tokens},
                cost=cost,
                response_time_ms=response_time_ms,
                metadata={
                    "finish_reason": response.candidates[0].finish_reason.name if response.candidates else None,
                    "safety_ratings": [rating.category.name for rating in response.candidates[0].safety_ratings] if response.candidates else []
                }
            )
            
        except Exception as e:
            logger.error(f"Vertex AI generation error: {e}")
            return LLMResponse(
                content="",
                model_id=request.model_id,
                provider="google",
                tokens_used={"input": 0, "output": 0},
                cost=0.0,
                response_time_ms=0,
                metadata={},
                error=str(e)
            )

class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider"""
    
    def _initialize_client(self):
        """Initialize OpenAI client"""
        api_key = os.getenv("OPENAI_API_KEY")
        organization = os.getenv("OPENAI_ORGANIZATION_ID")
        
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            organization=organization
        )
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response using OpenAI"""
        start_time = datetime.now()
        
        try:
            # Prepare messages
            messages = []
            if request.system_prompt:
                messages.append({"role": "system", "content": request.system_prompt})
            
            # Add conversation history if provided
            if request.conversation_history:
                messages.extend(request.conversation_history)
            
            messages.append({"role": "user", "content": request.prompt})
            
            # Prepare parameters
            params = {
                "model": request.model_id,
                "messages": messages,
                "stream": request.stream
            }
            
            if request.max_tokens:
                params["max_tokens"] = request.max_tokens
            if request.temperature is not None:
                params["temperature"] = request.temperature
            if request.top_p is not None:
                params["top_p"] = request.top_p
            if request.stop_sequences:
                params["stop"] = request.stop_sequences
            if request.functions:
                params["functions"] = request.functions
            
            # Generate response
            response = await self.client.chat.completions.create(**params)
            
            # Calculate metrics
            end_time = datetime.now()
            response_time_ms = (end_time - start_time).total_seconds() * 1000
            
            # Extract token usage
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            
            # Calculate cost
            cost = self._calculate_cost(request.model_id, input_tokens, output_tokens)
            
            return LLMResponse(
                content=response.choices[0].message.content,
                model_id=request.model_id,
                provider="openai",
                tokens_used={"input": input_tokens, "output": output_tokens},
                cost=cost,
                response_time_ms=response_time_ms,
                metadata={
                    "finish_reason": response.choices[0].finish_reason,
                    "function_call": response.choices[0].message.function_call if hasattr(response.choices[0].message, 'function_call') else None
                }
            )
            
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            return LLMResponse(
                content="",
                model_id=request.model_id,
                provider="openai",
                tokens_used={"input": 0, "output": 0},
                cost=0.0,
                response_time_ms=0,
                metadata={},
                error=str(e)
            )

class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider"""
    
    def _initialize_client(self):
        """Initialize Anthropic client"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        self.client = anthropic.AsyncAnthropic(
            api_key=api_key
        )
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Anthropic"""
        start_time = datetime.now()
        
        try:
            # Prepare parameters
            params = {
                "model": request.model_id,
                "messages": [{"role": "user", "content": request.prompt}],
                "stream": request.stream
            }
            
            if request.system_prompt:
                params["system"] = request.system_prompt
            if request.max_tokens:
                params["max_tokens"] = request.max_tokens
            if request.temperature is not None:
                params["temperature"] = request.temperature
            if request.top_p is not None:
                params["top_p"] = request.top_p
            if request.stop_sequences:
                params["stop_sequences"] = request.stop_sequences
            
            # Add conversation history if provided
            if request.conversation_history:
                params["messages"] = request.conversation_history + params["messages"]
            
            # Generate response
            response = await self.client.messages.create(**params)
            
            # Calculate metrics
            end_time = datetime.now()
            response_time_ms = (end_time - start_time).total_seconds() * 1000
            
            # Extract token usage
            usage = response.usage
            input_tokens = usage.input_tokens if usage else 0
            output_tokens = usage.output_tokens if usage else 0
            
            # Calculate cost
            cost = self._calculate_cost(request.model_id, input_tokens, output_tokens)
            
            return LLMResponse(
                content=response.content[0].text if response.content else "",
                model_id=request.model_id,
                provider="anthropic",
                tokens_used={"input": input_tokens, "output": output_tokens},
                cost=cost,
                response_time_ms=response_time_ms,
                metadata={
                    "stop_reason": response.stop_reason,
                    "stop_sequence": response.stop_sequence
                }
            )
            
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            return LLMResponse(
                content="",
                model_id=request.model_id,
                provider="anthropic",
                tokens_used={"input": 0, "output": 0},
                cost=0.0,
                response_time_ms=0,
                metadata={},
                error=str(e)
            )

class AzureOpenAIProvider(BaseLLMProvider):
    """Azure OpenAI provider"""
    
    def _initialize_client(self):
        """Initialize Azure OpenAI client"""
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
        
        self.client = openai.AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version
        )
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Azure OpenAI"""
        # Use deployment name from environment or model mapping
        deployment_name = os.getenv(f"AZURE_{request.model_id.upper().replace('-', '_')}_DEPLOYMENT_NAME")
        if not deployment_name:
            deployment_name = request.model_id  # Fallback to model_id
        
        # Create new request with deployment name as model
        azure_request = LLMRequest(
            model_id=deployment_name,
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop_sequences=request.stop_sequences,
            functions=request.functions,
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history,
            stream=request.stream
        )
        
        # Use OpenAI provider logic but with Azure client
        openai_provider = OpenAIProvider(self.config)
        openai_provider.client = self.client
        
        response = await openai_provider.generate(azure_request)
        response.provider = "azure_openai"
        response.model_id = request.model_id  # Restore original model_id
        
        return response

class LLMClient:
    """Main LLM client for AgentHub platform"""
    
    def __init__(self, config_path: str = None):
        self.config = LLMConfig(config_path)
        self.usage_tracker = LLMUsageTracker()
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate response using the appropriate provider"""
        # Determine provider for the model
        provider_name = self._get_provider_for_model(request.model_id)
        if not provider_name:
            raise ValueError(f"No provider found for model: {request.model_id}")
        
        provider = self.config.providers.get(provider_name)
        if not provider:
            raise ValueError(f"Provider {provider_name} not initialized")
        
        # Generate response
        response = await provider.generate(request)
        
        # Track usage
        await self.usage_tracker.track_usage(request, response)
        
        return response
    
    def _get_provider_for_model(self, model_id: str) -> Optional[str]:
        """Get provider name for a given model"""
        for provider_name, provider_config in self.config.config.get("llm_providers", {}).items():
            if provider_config.get("enabled", False):
                if model_id in provider_config.get("models", {}):
                    return provider_name
        return None
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return self.config.get_available_models()
    
    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """Get detailed information about a model"""
        return self.config.get_model_config(model_id)
    
    def get_recommended_model(self, industry: str = None, use_case: str = None) -> str:
        """Get recommended model based on industry and use case"""
        policies = self.config.config.get("model_policies", {})
        
        # Check industry recommendations
        if industry:
            industry_recs = policies.get("industry_recommendations", {}).get(industry, {})
            if industry_recs:
                return industry_recs.get("primary", "gpt-3.5-turbo")
        
        # Check use case defaults
        if use_case:
            defaults = policies.get("defaults", {})
            return defaults.get(use_case, "gpt-3.5-turbo")
        
        return "gpt-3.5-turbo"  # Default fallback

class LLMUsageTracker:
    """Track LLM usage and costs"""
    
    def __init__(self):
        self.usage_data = []
    
    async def track_usage(self, request: LLMRequest, response: LLMResponse):
        """Track usage data"""
        usage_entry = {
            "timestamp": datetime.now().isoformat(),
            "model_id": request.model_id,
            "provider": response.provider,
            "tokens_used": response.tokens_used,
            "cost": response.cost,
            "response_time_ms": response.response_time_ms,
            "error": response.error
        }
        
        self.usage_data.append(usage_entry)
        
        # Log usage (in production, send to monitoring system)
        logger.info(f"LLM Usage: {usage_entry}")
    
    def get_usage_summary(self, time_period: str = "24h") -> Dict:
        """Get usage summary for a time period"""
        # Implementation would filter by time period and aggregate data
        total_cost = sum(entry["cost"] for entry in self.usage_data)
        total_tokens = sum(
            entry["tokens_used"]["input"] + entry["tokens_used"]["output"] 
            for entry in self.usage_data
        )
        
        return {
            "total_requests": len(self.usage_data),
            "total_cost": total_cost,
            "total_tokens": total_tokens,
            "average_response_time": sum(entry["response_time_ms"] for entry in self.usage_data) / len(self.usage_data) if self.usage_data else 0
        }

# Example usage
if __name__ == "__main__":
    async def main():
        # Initialize LLM client
        llm_client = LLMClient()
        
        # Create a request
        request = LLMRequest(
            model_id="gpt-3.5-turbo",
            prompt="Explain the benefits of AI in healthcare",
            max_tokens=150,
            temperature=0.7,
            system_prompt="You are a helpful AI assistant specialized in healthcare technology."
        )
        
        # Generate response
        response = await llm_client.generate(request)
        
        print(f"Response: {response.content}")
        print(f"Cost: ${response.cost:.4f}")
        print(f"Tokens: {response.tokens_used}")
        print(f"Response time: {response.response_time_ms:.2f}ms")
    
    asyncio.run(main())