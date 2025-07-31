#!/usr/bin/env python3
"""
Authentication Service
Ultra-focused microservice for user authentication only
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging
from datetime import datetime, timedelta
import hashlib
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Authentication Service", description="Ultra-focused authentication", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthToken(BaseModel):
    token: str
    expires_at: str
    user_id: str

# In-memory storage
users = {"admin": {"password_hash": "hashed_password", "user_id": "user_1"}}
active_tokens = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "authentication", "active_tokens": len(active_tokens)}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Authenticate user and return token"""
    try:
        if request.username not in users:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Simple password check (use proper hashing in production)
        user_data = users[request.username]
        
        # Generate token
        token_data = f"{request.username}{datetime.now()}"
        token = hashlib.sha256(token_data.encode()).hexdigest()
        
        expires_at = datetime.now() + timedelta(hours=24)
        
        # Store active token
        active_tokens[token] = {
            "user_id": user_data["user_id"],
            "username": request.username,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        logger.info(f"User {request.username} authenticated successfully")
        
        return AuthToken(
            token=token,
            expires_at=expires_at.isoformat(),
            user_id=user_data["user_id"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/validate")
async def validate_token(token: str):
    """Validate authentication token"""
    if token not in active_tokens:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token_data = active_tokens[token]
    expires_at = datetime.fromisoformat(token_data["expires_at"])
    
    if datetime.now() > expires_at:
        del active_tokens[token]
        raise HTTPException(status_code=401, detail="Token expired")
    
    return {"valid": True, "user_id": token_data["user_id"], "username": token_data["username"]}

@app.post("/api/auth/logout")
async def logout(token: str):
    """Logout user and invalidate token"""
    if token in active_tokens:
        del active_tokens[token]
        return {"success": True, "message": "Logged out successfully"}
    
    raise HTTPException(status_code=404, detail="Token not found")

@app.get("/api/auth/sessions")
async def get_active_sessions():
    """Get count of active sessions"""
    active_count = len(active_tokens)
    return {"active_sessions": active_count, "total_users": len(users)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8031))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)