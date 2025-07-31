#!/usr/bin/env python3
"""
Notification Service
Ultra-focused microservice for notifications only
Target: <110 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notification Service", description="Ultra-focused notification management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class NotificationRequest(BaseModel):
    type: str  # email, sms, push
    recipient: str
    subject: str
    message: str
    priority: str = "normal"

class NotificationResponse(BaseModel):
    notification_id: str
    status: str
    sent_at: str

# In-memory notification storage
notifications = {}
notification_count = 0

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notification", "sent_notifications": len(notifications)}

@app.post("/api/notifications/send")
async def send_notification(request: NotificationRequest):
    """Send a notification"""
    try:
        global notification_count
        notification_count += 1
        notification_id = f"notif_{notification_count}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Simulate sending notification
        success = True
        if request.type == "email":
            logger.info(f"Sending email to {request.recipient}: {request.subject}")
        elif request.type == "sms":
            logger.info(f"Sending SMS to {request.recipient}: {request.message[:50]}...")
        elif request.type == "push":
            logger.info(f"Sending push notification: {request.subject}")
        else:
            success = False
            raise HTTPException(status_code=400, detail="Invalid notification type")
        
        notification_record = {
            "id": notification_id,
            "type": request.type,
            "recipient": request.recipient,
            "subject": request.subject,
            "message": request.message,
            "priority": request.priority,
            "status": "sent" if success else "failed",
            "sent_at": datetime.now().isoformat()
        }
        
        notifications[notification_id] = notification_record
        
        return NotificationResponse(
            notification_id=notification_id,
            status="sent",
            sent_at=notification_record["sent_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Notification sending failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/batch")
async def send_batch_notifications(requests: List[NotificationRequest]):
    """Send multiple notifications"""
    try:
        results = []
        for request in requests:
            result = await send_notification(request)
            results.append(result)
        
        return {"sent_notifications": len(results), "results": results}
        
    except Exception as e:
        logger.error(f"Batch notification sending failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notifications/{notification_id}")
async def get_notification(notification_id: str):
    """Get notification details"""
    if notification_id not in notifications:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notifications[notification_id]

@app.get("/api/notifications/stats")
async def get_notification_stats():
    """Get notification statistics"""
    try:
        total = len(notifications)
        sent = len([n for n in notifications.values() if n["status"] == "sent"])
        by_type = {}
        
        for notification in notifications.values():
            ntype = notification["type"]
            by_type[ntype] = by_type.get(ntype, 0) + 1
        
        return {
            "total_notifications": total,
            "successful_notifications": sent,
            "success_rate": (sent / total * 100) if total > 0 else 0,
            "notifications_by_type": by_type
        }
        
    except Exception as e:
        logger.error(f"Notification stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8032))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)