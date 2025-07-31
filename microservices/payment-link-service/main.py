#!/usr/bin/env python3
"""
Payment Link Service
Ultra-focused microservice for payment link generation only
Target: <80 lines for maximum maintainability
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

app = FastAPI(title="Payment Link Service", description="Ultra-focused payment link generation", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class LinkRequest(BaseModel):
    payment_id: str
    amount: float
    currency: str = "USD"
    expires_in_hours: int = 24

class LinkResponse(BaseModel):
    payment_link: str
    expires_at: str
    link_id: str

# In-memory link storage
payment_links = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "payment-link", "active_links": len(payment_links)}

@app.post("/api/links/generate")
async def generate_payment_link(request: LinkRequest):
    """Generate a payment link"""
    try:
        # Create unique link ID
        link_data = f"{request.payment_id}{request.amount}{datetime.now()}"
        link_id = hashlib.sha256(link_data.encode()).hexdigest()[:16]
        
        # Generate payment link URL
        payment_link = f"https://pay.agenthub.com/{link_id}"
        
        # Calculate expiry
        expires_at = datetime.now() + timedelta(hours=request.expires_in_hours)
        
        # Store link details
        payment_links[link_id] = {
            "link_id": link_id,
            "payment_id": request.payment_id,
            "payment_link": payment_link,
            "amount": request.amount,
            "currency": request.currency,
            "created_at": datetime.now().isoformat(),
            "expires_at": expires_at.isoformat(),
            "status": "active"
        }
        
        logger.info(f"Generated payment link {link_id} for payment {request.payment_id}")
        
        return LinkResponse(
            payment_link=payment_link,
            expires_at=expires_at.isoformat(),
            link_id=link_id
        )
        
    except Exception as e:
        logger.error(f"Payment link generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/links/{link_id}")
async def get_payment_link(link_id: str):
    """Get payment link details"""
    if link_id not in payment_links:
        raise HTTPException(status_code=404, detail="Payment link not found")
    return payment_links[link_id]

@app.delete("/api/links/{link_id}")
async def deactivate_link(link_id: str):
    """Deactivate a payment link"""
    if link_id not in payment_links:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    payment_links[link_id]["status"] = "deactivated"
    return {"success": True, "deactivated_link": link_id}

@app.get("/api/links/payment/{payment_id}")
async def get_links_for_payment(payment_id: str):
    """Get all links for a specific payment"""
    links = [link for link in payment_links.values() if link["payment_id"] == payment_id]
    return {"payment_id": payment_id, "links": links, "total_links": len(links)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8015))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)