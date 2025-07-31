#!/usr/bin/env python3
"""
Logging Service
Ultra-focused microservice for centralized logging only
Target: <90 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Logging Service", description="Ultra-focused centralized logging", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class LogEntry(BaseModel):
    service: str
    level: str
    message: str
    timestamp: Optional[str] = None
    metadata: dict = {}

# In-memory log storage
logs = []
log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "logging", "total_logs": len(logs)}

@app.post("/api/logs/write")
async def write_log(entry: LogEntry):
    """Write a log entry"""
    try:
        if entry.level not in log_levels:
            raise HTTPException(status_code=400, detail="Invalid log level")
        
        if not entry.timestamp:
            entry.timestamp = datetime.now().isoformat()
        
        log_data = entry.model_dump()
        log_data["log_id"] = len(logs) + 1
        
        logs.append(log_data)
        
        # Also log to local logger for immediate debugging
        if entry.level == "ERROR" or entry.level == "CRITICAL":
            logger.error(f"[{entry.service}] {entry.message}")
        else:
            logger.info(f"[{entry.service}] {entry.message}")
        
        return {"success": True, "log_id": log_data["log_id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log writing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/recent")
async def get_recent_logs(limit: int = 50, level: Optional[str] = None):
    """Get recent log entries"""
    try:
        filtered_logs = logs
        
        if level and level in log_levels:
            filtered_logs = [log for log in logs if log["level"] == level]
        
        # Return most recent logs
        recent_logs = filtered_logs[-limit:]
        recent_logs.reverse()  # Most recent first
        
        return {"logs": recent_logs, "total_filtered": len(filtered_logs)}
        
    except Exception as e:
        logger.error(f"Log retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/service/{service_name}")
async def get_service_logs(service_name: str, limit: int = 20):
    """Get logs for specific service"""
    service_logs = [log for log in logs if log["service"] == service_name]
    recent_service_logs = service_logs[-limit:]
    recent_service_logs.reverse()
    
    return {"service": service_name, "logs": recent_service_logs, "total_logs": len(service_logs)}

@app.get("/api/logs/errors")
async def get_error_logs(limit: int = 20):
    """Get error and critical logs"""
    error_logs = [log for log in logs if log["level"] in ["ERROR", "CRITICAL"]]
    recent_errors = error_logs[-limit:]
    recent_errors.reverse()
    
    return {"error_logs": recent_errors, "total_errors": len(error_logs)}

@app.get("/api/logs/stats")
async def get_log_statistics():
    """Get logging statistics"""
    stats = {"total_logs": len(logs)}
    
    for level in log_levels:
        stats[f"{level.lower()}_count"] = len([log for log in logs if log["level"] == level])
    
    return stats

@app.delete("/api/logs/clear")
async def clear_logs():
    """Clear all logs (use with caution)"""
    cleared_count = len(logs)
    logs.clear()
    logger.info("All logs cleared")
    
    return {"success": True, "cleared_logs": cleared_count}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8033))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)