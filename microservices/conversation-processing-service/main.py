#!/usr/bin/env python3
"""
Conversation Processing Service
Ultra-focused microservice for conversation processing only
Extracted from routes.ts conversation processing (lines 36-94)
Target: <130 lines for maximum maintainability
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

app = FastAPI(title="Conversation Processing Service", description="Ultra-focused conversation processing", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ConversationContext(BaseModel):
    agent_id: str
    customer_id: str
    platform: str
    industry: str
    customer_data: Dict[str, Any] = {}
    booking_data: Optional[Dict[str, Any]] = None

class ConversationMessage(BaseModel):
    content: str
    sender: str
    timestamp: str

class ProcessingResult(BaseModel):
    response: str
    actions: List[Dict[str, Any]]
    next_steps: List[str]
    confidence_score: float

class ConversationRequest(BaseModel):
    context: ConversationContext
    message: ConversationMessage

# Processing history and context storage
processing_history = []
active_contexts = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "conversation-processing", "processed_conversations": len(processing_history)}

@app.post("/api/conversation/process")
async def process_conversation(request: ConversationRequest):
    """Process conversation message and determine actions"""
    try:
        start_time = datetime.now()
        
        # Analyze message content
        analysis = analyze_message_intent(request.message.content, request.context.industry)
        
        # Generate appropriate response
        response_text = generate_response(request.message.content, request.context, analysis)
        
        # Determine required actions
        actions = determine_actions(analysis, request.context)
        
        # Generate next steps
        next_steps = generate_next_steps(analysis, request.context)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        result = ProcessingResult(
            response=response_text,
            actions=actions,
            next_steps=next_steps,
            confidence_score=analysis["confidence"]
        )
        
        # Store processing record
        processing_record = {
            "conversation_id": f"{request.context.agent_id}_{request.context.customer_id}_{len(processing_history)}",
            "context": request.context.model_dump(),
            "message": request.message.model_dump(),
            "result": result.model_dump(),
            "processing_time_ms": round(processing_time, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        processing_history.append(processing_record)
        
        # Update active context
        context_key = f"{request.context.agent_id}:{request.context.customer_id}"
        active_contexts[context_key] = {
            "last_message": request.message.model_dump(),
            "last_analysis": analysis,
            "updated_at": datetime.now().isoformat()
        }
        
        logger.info(f"Processed conversation for agent {request.context.agent_id} in {processing_time:.2f}ms")
        return result.model_dump()
        
    except Exception as e:
        logger.error(f"Conversation processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_message_intent(message: str, industry: str) -> Dict[str, Any]:
    """Analyze message to determine intent"""
    message_lower = message.lower()
    
    # Intent detection logic
    if any(word in message_lower for word in ["book", "appointment", "schedule", "slot"]):
        intent = "booking_request"
        confidence = 0.9
    elif any(word in message_lower for word in ["pay", "payment", "cost", "price", "bill"]):
        intent = "payment_inquiry"
        confidence = 0.85
    elif any(word in message_lower for word in ["help", "support", "issue", "problem"]):
        intent = "support_request"
        confidence = 0.8
    elif any(word in message_lower for word in ["info", "information", "details", "about"]):
        intent = "information_request"
        confidence = 0.75
    else:
        intent = "general_inquiry"
        confidence = 0.6
    
    return {
        "intent": intent,
        "confidence": confidence,
        "industry": industry,
        "entities": extract_entities(message),
        "sentiment": "neutral"  # Mock sentiment
    }

def extract_entities(message: str) -> Dict[str, Any]:
    """Extract entities from message"""
    # Mock entity extraction
    entities = {}
    
    if "tomorrow" in message.lower():
        entities["date"] = "tomorrow"
    if "morning" in message.lower():
        entities["time"] = "morning"
    if any(word in message.lower() for word in ["₹", "rupees", "rs"]):
        entities["currency"] = "INR"
    
    return entities

def generate_response(message: str, context: ConversationContext, analysis: Dict[str, Any]) -> str:
    """Generate appropriate response based on analysis"""
    intent = analysis["intent"]
    industry = context.industry
    
    if intent == "booking_request":
        return f"I'd be happy to help you schedule an appointment. Let me check available slots for our {industry} services."
    elif intent == "payment_inquiry":
        return f"For {industry} consultations, I can provide pricing information and payment options. Would you like to proceed?"
    elif intent == "support_request":
        return f"I'm here to help with any {industry} related questions or concerns you may have."
    elif intent == "information_request":
        return f"I can provide detailed information about our {industry} services. What specifically would you like to know?"
    else:
        return f"Thank you for contacting us. How can I assist you with our {industry} services today?"

def determine_actions(analysis: Dict[str, Any], context: ConversationContext) -> List[Dict[str, Any]]:
    """Determine required actions based on analysis"""
    actions = []
    intent = analysis["intent"]
    
    if intent == "booking_request":
        actions.append({
            "type": "booking_confirmation",
            "data": {
                "agent_id": context.agent_id,
                "customer_id": context.customer_id,
                "service_type": context.industry
            }
        })
    elif intent == "payment_inquiry":
        actions.append({
            "type": "payment_link",
            "data": {
                "consultation_id": f"consult_{context.customer_id}_{datetime.now().strftime('%Y%m%d%H%M')}",
                "amount": 500,  # Mock amount
                "currency": "INR",
                "method": "upi"
            }
        })
    
    return actions

def generate_next_steps(analysis: Dict[str, Any], context: ConversationContext) -> List[str]:
    """Generate next steps for conversation"""
    intent = analysis["intent"]
    
    if intent == "booking_request":
        return ["Check available slots", "Confirm booking details", "Send confirmation"]
    elif intent == "payment_inquiry":
        return ["Generate payment link", "Process payment", "Send receipt"]
    elif intent == "support_request":
        return ["Gather more details", "Provide solution", "Follow up"]
    else:
        return ["Clarify requirements", "Provide information", "Offer assistance"]

@app.get("/api/conversation/history/{agent_id}")
async def get_conversation_history(agent_id: str, limit: int = 20):
    """Get conversation processing history for agent"""
    agent_conversations = [record for record in processing_history 
                          if record["context"]["agent_id"] == agent_id]
    
    return {
        "agent_id": agent_id,
        "conversations": agent_conversations[-limit:],
        "total_conversations": len(agent_conversations)
    }

@app.get("/api/conversation/analytics")
async def get_processing_analytics():
    """Get conversation processing analytics"""
    total_processed = len(processing_history)
    avg_processing_time = sum(r["processing_time_ms"] for r in processing_history) / total_processed if total_processed > 0 else 0
    
    # Intent breakdown
    intent_stats = {}
    for record in processing_history:
        intent = record["result"]["actions"][0]["type"] if record["result"]["actions"] else "general"
        intent_stats[intent] = intent_stats.get(intent, 0) + 1
    
    return {
        "total_processed": total_processed,
        "average_processing_time_ms": round(avg_processing_time, 2),
        "intent_breakdown": intent_stats,
        "active_contexts": len(active_contexts)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8126))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)