#!/usr/bin/env python3
"""
Slot Management Service
Ultra-focused microservice for calendar slot management only
Target: <110 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime, timedelta
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Slot Management Service", description="Ultra-focused calendar slot management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class TimeSlot(BaseModel):
    slot_id: str
    start_time: str
    end_time: str
    available: bool
    agent_id: str
    industry: str

class SlotBookingRequest(BaseModel):
    slot_id: str
    customer_id: str
    booking_type: str

# In-memory slot storage
slots = {}
bookings = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "slot-management", "total_slots": len(slots), "bookings": len(bookings)}

@app.post("/api/slots/generate")
async def generate_slots(agent_id: str, industry: str, days_ahead: int = 7):
    """Generate available time slots"""
    try:
        generated_slots = []
        base_date = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        
        for day in range(days_ahead):
            current_date = base_date + timedelta(days=day)
            
            # Skip weekends for most industries
            if current_date.weekday() >= 5 and industry != "healthcare":
                continue
            
            # Generate hourly slots from 9 AM to 5 PM
            for hour in range(9, 17):
                slot_time = current_date.replace(hour=hour)
                slot_id = f"{agent_id}_{slot_time.strftime('%Y%m%d_%H%M')}"
                
                slot = TimeSlot(
                    slot_id=slot_id,
                    start_time=slot_time.isoformat(),
                    end_time=(slot_time + timedelta(hours=1)).isoformat(),
                    available=True,
                    agent_id=agent_id,
                    industry=industry
                )
                
                slots[slot_id] = slot.model_dump()
                generated_slots.append(slot_id)
        
        logger.info(f"Generated {len(generated_slots)} slots for agent {agent_id}")
        return {"success": True, "generated_slots": len(generated_slots), "slot_ids": generated_slots}
        
    except Exception as e:
        logger.error(f"Slot generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/slots/available/{agent_id}")
async def get_available_slots(agent_id: str, limit: int = 20):
    """Get available slots for agent"""
    try:
        available_slots = [slot for slot in slots.values() 
                         if slot["agent_id"] == agent_id and slot["available"]]
        
        # Sort by start time and limit results
        available_slots.sort(key=lambda x: x["start_time"])
        return {"available_slots": available_slots[:limit], "total_available": len(available_slots)}
        
    except Exception as e:
        logger.error(f"Available slots retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/slots/book")
async def book_slot(request: SlotBookingRequest):
    """Book a specific slot"""
    try:
        if request.slot_id not in slots:
            raise HTTPException(status_code=404, detail="Slot not found")
        
        if not slots[request.slot_id]["available"]:
            raise HTTPException(status_code=409, detail="Slot already booked")
        
        # Mark slot as unavailable
        slots[request.slot_id]["available"] = False
        
        # Record booking
        booking_id = f"booking_{len(bookings)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        bookings[booking_id] = {
            "booking_id": booking_id,
            "slot_id": request.slot_id,
            "customer_id": request.customer_id,
            "booking_type": request.booking_type,
            "booked_at": datetime.now().isoformat(),
            "status": "confirmed"
        }
        
        logger.info(f"Booked slot {request.slot_id} for customer {request.customer_id}")
        return {"success": True, "booking_id": booking_id, "slot_id": request.slot_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Slot booking failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/slots/cancel/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking and free the slot"""
    try:
        if booking_id not in bookings:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        slot_id = bookings[booking_id]["slot_id"]
        slots[slot_id]["available"] = True
        del bookings[booking_id]
        
        return {"success": True, "cancelled_booking": booking_id, "freed_slot": slot_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking cancellation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8019))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)