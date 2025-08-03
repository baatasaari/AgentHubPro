#!/usr/bin/env python3
"""
Security Utilities for Microservices
Provides secure error handling, input sanitization, and structured logging
Prevents information leakage and injection attacks
"""

import re
import html
import logging
import uuid
import json
import bleach
from typing import Dict, Any, Optional, Union, List
from datetime import datetime
from fastapi import HTTPException, Request
from pydantic import BaseModel, validator
import hashlib

# Configure structured logging
class StructuredLogger:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        
        # Configure structured formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def _create_log_entry(self, level: str, message: str, request_id: str = None, 
                         user_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create structured log entry"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "service": self.service_name,
            "level": level,
            "message": message,
            "request_id": request_id,
            "user_id": user_id
        }
        
        # Add additional context
        for key, value in kwargs.items():
            log_entry[key] = value
        
        return log_entry
    
    def info(self, message: str, request_id: str = None, **kwargs):
        log_entry = self._create_log_entry("INFO", message, request_id, **kwargs)
        self.logger.info(json.dumps(log_entry))
    
    def warning(self, message: str, request_id: str = None, **kwargs):
        log_entry = self._create_log_entry("WARNING", message, request_id, **kwargs)
        self.logger.warning(json.dumps(log_entry))
    
    def error(self, message: str, request_id: str = None, error_type: str = None, **kwargs):
        log_entry = self._create_log_entry("ERROR", message, request_id, error_type=error_type, **kwargs)
        self.logger.error(json.dumps(log_entry))
    
    def security_event(self, event_type: str, message: str, request_id: str = None, 
                      source_ip: str = None, **kwargs):
        log_entry = self._create_log_entry("SECURITY", message, request_id, 
                                         event_type=event_type, source_ip=source_ip, **kwargs)
        self.logger.warning(json.dumps(log_entry))

# Request context for tracing
class RequestContext:
    def __init__(self, request: Request):
        self.request_id = str(uuid.uuid4())
        self.timestamp = datetime.utcnow().isoformat()
        self.method = request.method
        self.url = str(request.url)
        self.client_ip = self._get_client_ip(request)
        self.user_agent = request.headers.get("user-agent", "unknown")
        self.headers = dict(request.headers)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with X-Forwarded-For support"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return getattr(request.client, "host", "unknown")

# Input sanitization utilities
class InputSanitizer:
    # Dangerous patterns for injection detection
    SQL_INJECTION_PATTERNS = [
        r"(?i)(union|select|insert|update|delete|drop|create|alter)\s",
        r"(?i)(or|and)\s+\d+\s*=\s*\d+",
        r"(?i)(\-\-|\#|\/\*|\*\/)",
        r"(?i)(exec|execute|sp_|xp_)",
        r"(?i)(script|javascript|vbscript)"
    ]
    
    XSS_PATTERNS = [
        r"(?i)<script[^>]*>.*?</script>",
        r"(?i)javascript:",
        r"(?i)on\w+\s*=",
        r"(?i)<iframe[^>]*>",
        r"(?i)<object[^>]*>",
        r"(?i)<embed[^>]*>"
    ]
    
    COMMAND_INJECTION_PATTERNS = [
        r"(?i)(;|\||\&|\$\(|\`)",
        r"(?i)(rm|del|format|fdisk)",
        r"(?i)(wget|curl|nc|netcat)",
        r"(?i)(eval|exec|system)"
    ]
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000, allow_html: bool = False) -> str:
        """Comprehensive string sanitization"""
        if not isinstance(text, str):
            raise ValueError("Input must be a string")
        
        if len(text) > max_length:
            raise ValueError(f"Input exceeds maximum length of {max_length} characters")
        
        # Remove null bytes and control characters
        text = text.replace('\x00', '').replace('\r', '').replace('\n', ' ')
        
        # HTML escape if HTML not allowed
        if not allow_html:
            text = html.escape(text)
        else:
            # Sanitize HTML using bleach
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'b', 'i']
            text = bleach.clean(text, tags=allowed_tags, strip=True)
        
        # Check for injection patterns
        InputSanitizer._check_injection_patterns(text)
        
        return text.strip()
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize and validate email address"""
        if not isinstance(email, str):
            raise ValueError("Email must be a string")
        
        email = email.strip().lower()
        
        # Basic email regex (RFC 5322 simplified)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
        
        if len(email) > 254:  # RFC 5321 limit
            raise ValueError("Email address too long")
        
        return email
    
    @staticmethod
    def sanitize_numeric(value: Union[str, int, float], min_val: float = None, 
                        max_val: float = None) -> float:
        """Sanitize and validate numeric input"""
        try:
            if isinstance(value, str):
                # Remove any non-numeric characters except decimal point and minus
                cleaned = re.sub(r'[^\d.\-]', '', value)
                numeric_value = float(cleaned)
            else:
                numeric_value = float(value)
            
            if min_val is not None and numeric_value < min_val:
                raise ValueError(f"Value must be at least {min_val}")
            
            if max_val is not None and numeric_value > max_val:
                raise ValueError(f"Value must be at most {max_val}")
            
            return numeric_value
            
        except (ValueError, TypeError):
            raise ValueError("Invalid numeric value")
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not isinstance(filename, str):
            raise ValueError("Filename must be a string")
        
        # Remove path traversal attempts
        filename = filename.replace('..', '').replace('/', '').replace('\\', '')
        
        # Remove dangerous characters
        filename = re.sub(r'[<>:"|?*\x00-\x1f]', '', filename)
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        if not filename or filename in ['.', '..']:
            raise ValueError("Invalid filename")
        
        return filename
    
    @staticmethod
    def _check_injection_patterns(text: str):
        """Check for injection attack patterns"""
        all_patterns = (
            InputSanitizer.SQL_INJECTION_PATTERNS + 
            InputSanitizer.XSS_PATTERNS + 
            InputSanitizer.COMMAND_INJECTION_PATTERNS
        )
        
        for pattern in all_patterns:
            if re.search(pattern, text):
                raise ValueError("Potentially malicious input detected")

# Secure error handling
class SecureErrorHandler:
    # User-friendly error messages
    USER_FRIENDLY_MESSAGES = {
        "ValidationError": "The provided information is invalid. Please check your input and try again.",
        "AuthenticationError": "Authentication failed. Please check your credentials.",
        "AuthorizationError": "You don't have permission to perform this action.",
        "NotFoundError": "The requested resource was not found.",
        "RateLimitError": "Too many requests. Please try again later.",
        "ServiceUnavailableError": "The service is temporarily unavailable. Please try again later.",
        "DatabaseError": "A database error occurred. Please try again later.",
        "ExternalServiceError": "An external service is unavailable. Please try again later.",
        "InternalError": "An internal error occurred. Please try again later."
    }
    
    @staticmethod
    def create_error_response(
        error: Exception,
        request_context: RequestContext,
        logger: StructuredLogger,
        include_details: bool = False
    ) -> Dict[str, Any]:
        """Create secure error response"""
        
        # Determine error type and user message
        error_type = type(error).__name__
        
        # Log detailed error internally
        logger.error(
            f"Error processing request: {str(error)}",
            request_id=request_context.request_id,
            error_type=error_type,
            url=request_context.url,
            method=request_context.method,
            client_ip=request_context.client_ip,
            error_details=str(error) if include_details else None
        )
        
        # Map specific exceptions to user-friendly messages
        if isinstance(error, ValueError):
            user_message = "Invalid input provided. Please check your data and try again."
            status_code = 400
        elif isinstance(error, PermissionError):
            user_message = SecureErrorHandler.USER_FRIENDLY_MESSAGES["AuthorizationError"]
            status_code = 403
        elif isinstance(error, FileNotFoundError):
            user_message = SecureErrorHandler.USER_FRIENDLY_MESSAGES["NotFoundError"]
            status_code = 404
        elif "rate limit" in str(error).lower():
            user_message = SecureErrorHandler.USER_FRIENDLY_MESSAGES["RateLimitError"]
            status_code = 429
        elif "database" in str(error).lower() or "connection" in str(error).lower():
            user_message = SecureErrorHandler.USER_FRIENDLY_MESSAGES["DatabaseError"]
            status_code = 500
        else:
            # Generic internal error
            user_message = SecureErrorHandler.USER_FRIENDLY_MESSAGES["InternalError"]
            status_code = 500
        
        # Security event logging for suspicious errors
        if any(pattern in str(error).lower() for pattern in ["injection", "malicious", "attack"]):
            logger.security_event(
                event_type="potential_attack",
                message=f"Suspicious error pattern detected: {error_type}",
                request_id=request_context.request_id,
                source_ip=request_context.client_ip
            )
        
        # Create response
        error_response = {
            "success": False,
            "error": {
                "message": user_message,
                "type": "client_error" if status_code < 500 else "server_error",
                "request_id": request_context.request_id,
                "timestamp": request_context.timestamp
            }
        }
        
        # Include additional details only in development
        if include_details and error_type != "InternalError":
            error_response["error"]["details"] = str(error)
        
        return error_response, status_code

# Validation models for common inputs
class SecureBaseModel(BaseModel):
    """Base model with security validations"""
    
    @validator('*', pre=True)
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            return InputSanitizer.sanitize_string(v, max_length=10000)
        return v

class SecureTextInput(SecureBaseModel):
    text: str
    
    @validator('text')
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError("Text cannot be empty")
        return InputSanitizer.sanitize_string(v, max_length=5000)

class SecureEmailInput(SecureBaseModel):
    email: str
    
    @validator('email')
    def validate_email(cls, v):
        return InputSanitizer.sanitize_email(v)

class SecureNumericInput(SecureBaseModel):
    value: float
    
    @validator('value')
    def validate_numeric(cls, v):
        return InputSanitizer.sanitize_numeric(v, min_val=0, max_val=1000000)

# Rate limiting and abuse detection
class SecurityMonitor:
    def __init__(self):
        self.failed_attempts = {}
        self.suspicious_ips = set()
    
    def record_failed_attempt(self, client_ip: str, request_context: RequestContext, 
                            logger: StructuredLogger):
        """Record failed authentication/validation attempt"""
        if client_ip not in self.failed_attempts:
            self.failed_attempts[client_ip] = []
        
        self.failed_attempts[client_ip].append(datetime.utcnow())
        
        # Clean old attempts (older than 1 hour)
        cutoff = datetime.utcnow().timestamp() - 3600
        self.failed_attempts[client_ip] = [
            attempt for attempt in self.failed_attempts[client_ip]
            if attempt.timestamp() > cutoff
        ]
        
        # Check for abuse patterns
        recent_failures = len(self.failed_attempts[client_ip])
        if recent_failures >= 10:  # 10 failures in 1 hour
            self.suspicious_ips.add(client_ip)
            logger.security_event(
                event_type="suspicious_activity",
                message=f"High failure rate detected: {recent_failures} failures",
                request_id=request_context.request_id,
                source_ip=client_ip,
                failure_count=recent_failures
            )
    
    def is_suspicious_ip(self, client_ip: str) -> bool:
        """Check if IP is flagged as suspicious"""
        return client_ip in self.suspicious_ips

# Export main utilities
__all__ = [
    'StructuredLogger',
    'RequestContext', 
    'InputSanitizer',
    'SecureErrorHandler',
    'SecureBaseModel',
    'SecureTextInput',
    'SecureEmailInput',
    'SecureNumericInput',
    'SecurityMonitor'
]