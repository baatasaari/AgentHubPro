#!/usr/bin/env python3
"""
Booking Management Service
Ultra-focused microservice for booking CRUD operations only
Target: <120 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Booking Management Service", description="Ultra-focused booking management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Booking(BaseModel):
    booking_id: str
    customer_id: str
    agent_id: str
    slot_id: str
    booking_type: str
    status: str = "confirmed"
    notes: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

# In-memory booking storage
bookings = {}
booking_counter = 0

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking-management", "total_bookings": len(bookings)}

@app.post("/api/bookings/create")
async def create_booking(booking: Booking):
    """Create a new booking"""
    try:
        # Check if booking already exists
        if booking.booking_id in bookings:
            raise HTTPException(status_code=409, detail="Booking already exists")
        
        booking_data = booking.model_dump()
        booking_data["created_at"] = datetime.now().isoformat()
        booking_data["updated_at"] = datetime.now().isoformat()
        
        bookings[booking.booking_id] = booking_data
        
        logger.info(f"Created booking {booking.booking_id} for customer {booking.customer_id}")
        return {"success": True, "booking_id": booking.booking_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookings/{booking_id}")
async def get_booking(booking_id: str):
    """Get booking details"""
    if booking_id not in bookings:
        raise HTTPException(status_code=404, detail="Booking not found")
    return bookings[booking_id]

@app.put("/api/bookings/{booking_id}")
async def update_booking(booking_id: str, update: BookingUpdate):
    """Update booking details"""
    try:
        if booking_id not in bookings:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = bookings[booking_id]
        
        if update.status:
            booking["status"] = update.status
        if update.notes:
            booking["notes"] = update.notes
        
        booking["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Updated booking {booking_id}")
        return {"success": True, "booking_id": booking_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    try:
        if booking_id not in bookings:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        bookings[booking_id]["status"] = "cancelled"
        bookings[booking_id]["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Cancelled booking {booking_id}")
        return {"success": True, "cancelled_booking": booking_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking cancellation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookings/customer/{customer_id}")
async def get_customer_bookings(customer_id: str):
    """Get all bookings for a customer"""
    customer_bookings = [booking for booking in bookings.values() 
                        if booking["customer_id"] == customer_id]
    
    return {
        "customer_id": customer_id,
        "bookings": customer_bookings,
        "total_bookings": len(customer_bookings)
    }

@app.get("/api/bookings/agent/{agent_id}")
async def get_agent_bookings(agent_id: str):
    """Get all bookings for an agent"""
    agent_bookings = [booking for booking in bookings.values() 
                     if booking["agent_id"] == agent_id]
    
    return {
        "agent_id": agent_id,
        "bookings": agent_bookings,
        "total_bookings": len(agent_bookings)
    }

@app.get("/api/bookings/status/{status}")
async def get_bookings_by_status(status: str):
    """Get bookings by status"""
    status_bookings = [booking for booking in bookings.values() 
                      if booking["status"] == status]
    
    return {
        "status": status,
        "bookings": status_bookings,
        "total_bookings": len(status_bookings)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8021))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)