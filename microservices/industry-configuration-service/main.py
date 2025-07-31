#!/usr/bin/env python3
"""
Industry Configuration Service
Ultra-focused microservice for industry-specific configurations only
Extracted from industry-knowledge.ts and routes.ts industry logic
Target: <90 lines for maximum maintainability
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

app = FastAPI(title="Industry Configuration Service", description="Ultra-focused industry configurations", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class IndustryConfig(BaseModel):
    industry: str
    templates: Dict[str, Any]
    validation_rules: List[str]
    recommended_models: List[str]

# Industry configurations
INDUSTRY_CONFIGS = {
    "healthcare": {
        "templates": {
            "system_prompt": "You are a healthcare assistant providing appointment scheduling and basic health information.",
            "business_hours": "9:00 AM - 7:00 PM",
            "consultation_fee": "₹500-₹1500",
            "services": ["consultations", "appointments", "health_info"]
        },
        "validation_rules": ["medical_disclaimer", "appointment_required", "licensed_professional"],
        "recommended_models": ["gpt-4", "claude-3-sonnet"]
    },
    "retail": {
        "templates": {
            "system_prompt": "You are a retail assistant helping customers with product information and purchases.",
            "business_hours": "10:00 AM - 9:00 PM",
            "payment_methods": ["UPI", "Credit Card", "Cash on Delivery"],
            "services": ["product_info", "order_tracking", "returns"]
        },
        "validation_rules": ["return_policy", "payment_security", "product_availability"],
        "recommended_models": ["gpt-3.5-turbo", "claude-3-haiku"]
    },
    "finance": {
        "templates": {
            "system_prompt": "You are a financial services assistant providing banking and investment guidance.",
            "business_hours": "9:00 AM - 6:00 PM",
            "services": ["account_info", "loan_inquiry", "investment_advice"],
            "compliance": "RBI regulated"
        },
        "validation_rules": ["financial_disclaimer", "kyc_required", "regulatory_compliance"],
        "recommended_models": ["gpt-4", "claude-3-sonnet"]
    },
    "realestate": {
        "templates": {
            "system_prompt": "You are a real estate assistant helping with property searches and inquiries.",
            "business_hours": "9:00 AM - 8:00 PM",
            "services": ["property_search", "viewing_schedule", "price_inquiry"],
            "commission": "1-3%"
        },
        "validation_rules": ["rera_compliance", "property_verification", "legal_documentation"],
        "recommended_models": ["gpt-3.5-turbo", "claude-3-haiku"]
    }
}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "industry-configuration", "supported_industries": len(INDUSTRY_CONFIGS)}

@app.get("/api/industry/templates")
async def get_industry_templates():
    """Get all industry templates"""
    return {
        "industries": list(INDUSTRY_CONFIGS.keys()),
        "templates": INDUSTRY_CONFIGS,
        "total_industries": len(INDUSTRY_CONFIGS)
    }

@app.get("/api/industry/{industry}/config")
async def get_industry_config(industry: str):
    """Get configuration for specific industry"""
    if industry not in INDUSTRY_CONFIGS:
        raise HTTPException(status_code=404, detail="Industry not found")
    
    config = INDUSTRY_CONFIGS[industry]
    return {
        "industry": industry,
        "configuration": config,
        "last_updated": datetime.now().isoformat()
    }

@app.post("/api/industry/validate")
async def validate_industry_config(industry: str, config_data: Dict[str, Any]):
    """Validate industry configuration"""
    try:
        if industry not in INDUSTRY_CONFIGS:
            raise HTTPException(status_code=404, detail="Industry not found")
        
        industry_config = INDUSTRY_CONFIGS[industry]
        validation_results = {
            "industry": industry,
            "valid": True,
            "issues": [],
            "recommendations": []
        }
        
        # Check required fields
        required_fields = ["businessName", "businessDescription", "llmModel"]
        for field in required_fields:
            if field not in config_data:
                validation_results["issues"].append(f"Missing required field: {field}")
                validation_results["valid"] = False
        
        # Check model compatibility
        if "llmModel" in config_data:
            model = config_data["llmModel"]
            if model not in industry_config["recommended_models"]:
                validation_results["recommendations"].append(
                    f"Consider using recommended models: {', '.join(industry_config['recommended_models'])}"
                )
        
        # Industry-specific validations
        for rule in industry_config["validation_rules"]:
            if rule == "medical_disclaimer" and industry == "healthcare":
                if "medical" not in config_data.get("businessDescription", "").lower():
                    validation_results["recommendations"].append("Include medical disclaimer in business description")
            elif rule == "rera_compliance" and industry == "realestate":
                validation_results["recommendations"].append("Ensure RERA compliance is mentioned")
        
        logger.info(f"Validated configuration for {industry}: {'valid' if validation_results['valid'] else 'issues found'}")
        return validation_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Industry validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/industry/{industry}/models")
async def get_recommended_models(industry: str):
    """Get recommended models for industry"""
    if industry not in INDUSTRY_CONFIGS:
        raise HTTPException(status_code=404, detail="Industry not found")
    
    return {
        "industry": industry,
        "recommended_models": INDUSTRY_CONFIGS[industry]["recommended_models"],
        "model_details": {
            "gpt-4": {"cost": "high", "quality": "excellent", "speed": "medium"},
            "gpt-3.5-turbo": {"cost": "low", "quality": "good", "speed": "fast"},
            "claude-3-sonnet": {"cost": "medium", "quality": "excellent", "speed": "medium"},
            "claude-3-haiku": {"cost": "low", "quality": "good", "speed": "fast"}
        }
    }

@app.get("/api/industry/list")
async def list_supported_industries():
    """List all supported industries"""
    industries = []
    for industry, config in INDUSTRY_CONFIGS.items():
        industries.append({
            "industry": industry,
            "services": config["templates"].get("services", []),
            "business_hours": config["templates"].get("business_hours", ""),
            "model_count": len(config["recommended_models"])
        })
    
    return {"supported_industries": industries, "total": len(industries)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8105))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)