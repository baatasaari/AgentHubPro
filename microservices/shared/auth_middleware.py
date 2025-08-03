#!/usr/bin/env python3
"""
Microservices Authentication Middleware
Implements JWT-based service-to-service authentication and rate limiting
Replaces open CORS policies with secure authenticated access
"""

import jwt
import time
import hashlib
from functools import wraps
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, Optional, List
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
PLATFORM_ISSUER = "agenthub-platform"

# Rate limiting storage (in production, use Redis)
rate_limit_store: Dict[str, List[float]] = {}

class ServiceAuthConfig(BaseModel):
    """Configuration for service authentication"""
    jwt_secret: str = JWT_SECRET
    jwt_algorithm: str = JWT_ALGORITHM
    issuer: str = PLATFORM_ISSUER
    rate_limit_requests: int = 100  # requests per minute
    rate_limit_window: int = 60  # seconds
    allowed_origins: List[str] = ["https://*.replit.app", "http://localhost:5000"]

class ServiceClaims(BaseModel):
    """JWT claims for service authentication"""
    service_name: str
    permissions: List[str]
    issuer: str
    issued_at: float
    expires_at: float

# Security scheme
security = HTTPBearer()

def create_service_token(service_name: str, permissions: List[str], expires_hours: int = 24) -> str:
    """Create a JWT token for service-to-service authentication"""
    now = datetime.utcnow()
    expires = now + timedelta(hours=expires_hours)
    
    payload = {
        "service_name": service_name,
        "permissions": permissions,
        "iss": PLATFORM_ISSUER,
        "iat": now.timestamp(),
        "exp": expires.timestamp()
    }
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_service_token(token: str) -> ServiceClaims:
    """Verify and decode service JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Validate required fields
        required_fields = ["service_name", "permissions", "iss", "iat", "exp"]
        for field in required_fields:
            if field not in payload:
                raise HTTPException(status_code=401, detail=f"Missing required field: {field}")
        
        # Validate issuer
        if payload["iss"] != PLATFORM_ISSUER:
            raise HTTPException(status_code=401, detail="Invalid token issuer")
        
        # Check expiration
        if datetime.utcnow().timestamp() > payload["exp"]:
            raise HTTPException(status_code=401, detail="Token expired")
        
        return ServiceClaims(
            service_name=payload["service_name"],
            permissions=payload["permissions"],
            issuer=payload["iss"],
            issued_at=payload["iat"],
            expires_at=payload["exp"]
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_client_identifier(request: Request) -> str:
    """Get client identifier for rate limiting"""
    # Use X-Forwarded-For if available (for API gateway scenarios)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Fallback to direct client IP
    client_ip = getattr(request.client, "host", "unknown")
    return client_ip

def check_rate_limit(client_id: str, config: ServiceAuthConfig) -> bool:
    """Check if client is within rate limits"""
    now = time.time()
    window_start = now - config.rate_limit_window
    
    # Clean old entries
    if client_id in rate_limit_store:
        rate_limit_store[client_id] = [
            timestamp for timestamp in rate_limit_store[client_id]
            if timestamp > window_start
        ]
    else:
        rate_limit_store[client_id] = []
    
    # Check current request count
    current_requests = len(rate_limit_store[client_id])
    
    if current_requests >= config.rate_limit_requests:
        return False
    
    # Add current request
    rate_limit_store[client_id].append(now)
    return True

async def authenticate_service_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    config: ServiceAuthConfig = ServiceAuthConfig()
) -> ServiceClaims:
    """Authenticate service-to-service request"""
    
    # Get client identifier for rate limiting
    client_id = get_client_identifier(request)
    
    # Check rate limits
    if not check_rate_limit(client_id, config):
        logger.warning(f"Rate limit exceeded for client: {client_id}")
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(config.rate_limit_window)}
        )
    
    # Verify JWT token
    token = credentials.credentials
    claims = verify_service_token(token)
    
    logger.info(f"Authenticated service: {claims.service_name} from {client_id}")
    return claims

def require_permission(required_permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract claims from kwargs (should be injected by dependency)
            claims = None
            for arg in args:
                if isinstance(arg, ServiceClaims):
                    claims = arg
                    break
            
            if not claims:
                for value in kwargs.values():
                    if isinstance(value, ServiceClaims):
                        claims = value
                        break
            
            if not claims:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if required_permission not in claims.permissions:
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission required: {required_permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def get_secure_cors_middleware():
    """Get CORS middleware with secure configuration"""
    from fastapi.middleware.cors import CORSMiddleware
    
    config = ServiceAuthConfig()
    
    return CORSMiddleware(
        allow_origins=config.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Service-Name"],
        expose_headers=["X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"]
    )

class SecurityMetrics:
    """Track security metrics for monitoring"""
    
    def __init__(self):
        self.failed_auth_attempts = 0
        self.rate_limit_violations = 0
        self.successful_authentications = 0
        self.start_time = time.time()
    
    def record_failed_auth(self, client_id: str, reason: str):
        """Record failed authentication attempt"""
        self.failed_auth_attempts += 1
        logger.warning(f"Failed auth from {client_id}: {reason}")
    
    def record_rate_limit_violation(self, client_id: str):
        """Record rate limit violation"""
        self.rate_limit_violations += 1
        logger.warning(f"Rate limit violation from {client_id}")
    
    def record_successful_auth(self, service_name: str, client_id: str):
        """Record successful authentication"""
        self.successful_authentications += 1
        logger.info(f"Successful auth: {service_name} from {client_id}")
    
    def get_metrics(self) -> Dict:
        """Get security metrics"""
        uptime = time.time() - self.start_time
        return {
            "security_metrics": {
                "uptime_seconds": uptime,
                "failed_auth_attempts": self.failed_auth_attempts,
                "rate_limit_violations": self.rate_limit_violations,
                "successful_authentications": self.successful_authentications,
                "auth_success_rate": (
                    self.successful_authentications / 
                    max(1, self.successful_authentications + self.failed_auth_attempts)
                ) * 100
            },
            "rate_limiting": {
                "active_clients": len(rate_limit_store),
                "total_requests_tracked": sum(len(requests) for requests in rate_limit_store.values())
            }
        }

# Global security metrics instance
security_metrics = SecurityMetrics()

# Helper function for input sanitization
def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize text input to prevent injection attacks"""
    if not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Input must be a string")
    
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long (max {max_length} characters)")
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\r', '\n']
    sanitized = text
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()