#!/usr/bin/env python3
"""
Analytics Calculation Service
Ultra-focused microservice for analytics calculations only
Extracted from enterprise-analytics.ts calculation logic
Target: <140 lines for maximum maintainability
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

app = FastAPI(title="Analytics Calculation Service", description="Ultra-focused analytics calculations", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class AnalyticsRequest(BaseModel):
    metric_type: str
    data_points: List[Dict[str, Any]]
    calculation_type: str  # average, sum, trend, ratio
    time_period: Optional[str] = None

class CalculationResult(BaseModel):
    metric_type: str
    value: float
    trend: str
    confidence: float
    calculation_details: Dict[str, Any]

# Calculation cache
calculation_cache = {}
calculation_history = []

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics-calculation", "cached_calculations": len(calculation_cache)}

@app.post("/api/analytics/calculate")
async def calculate_analytics(request: AnalyticsRequest):
    """Perform analytics calculations"""
    try:
        start_time = datetime.now()
        
        # Check cache
        cache_key = f"{request.metric_type}:{request.calculation_type}:{hash(str(request.data_points))}"
        if cache_key in calculation_cache:
            logger.info(f"Returning cached calculation for {request.metric_type}")
            return calculation_cache[cache_key]
        
        # Perform calculation based on type
        if request.calculation_type == "average":
            result = calculate_average(request)
        elif request.calculation_type == "sum":
            result = calculate_sum(request)
        elif request.calculation_type == "trend":
            result = calculate_trend(request)
        elif request.calculation_type == "ratio":
            result = calculate_ratio(request)
        else:
            raise HTTPException(status_code=400, detail="Invalid calculation type")
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        result.calculation_details["processing_time_ms"] = round(processing_time, 2)
        
        # Cache result
        calculation_cache[cache_key] = result.model_dump()
        
        # Store in history
        calculation_history.append({
            "request": request.model_dump(),
            "result": result.model_dump(),
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Calculated {request.metric_type} {request.calculation_type} in {processing_time:.2f}ms")
        return result.model_dump()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_average(request: AnalyticsRequest) -> CalculationResult:
    """Calculate average of data points"""
    values = [float(dp.get("value", 0)) for dp in request.data_points]
    
    if not values:
        average = 0
        confidence = 0
    else:
        average = sum(values) / len(values)
        confidence = 0.9 if len(values) >= 10 else 0.7
    
    # Determine trend
    if len(values) >= 2:
        recent_avg = sum(values[-3:]) / len(values[-3:]) if len(values) >= 3 else values[-1]
        earlier_avg = sum(values[:-3]) / len(values[:-3]) if len(values) > 3 else values[0]
        trend = "increasing" if recent_avg > earlier_avg else "decreasing" if recent_avg < earlier_avg else "stable"
    else:
        trend = "insufficient_data"
    
    return CalculationResult(
        metric_type=request.metric_type,
        value=round(average, 3),
        trend=trend,
        confidence=confidence,
        calculation_details={
            "data_points": len(values),
            "min_value": min(values) if values else 0,
            "max_value": max(values) if values else 0,
            "calculation_method": "arithmetic_mean"
        }
    )

def calculate_sum(request: AnalyticsRequest) -> CalculationResult:
    """Calculate sum of data points"""
    values = [float(dp.get("value", 0)) for dp in request.data_points]
    total = sum(values)
    
    return CalculationResult(
        metric_type=request.metric_type,
        value=round(total, 3),
        trend="cumulative",
        confidence=0.95,
        calculation_details={
            "data_points": len(values),
            "calculation_method": "summation"
        }
    )

def calculate_trend(request: AnalyticsRequest) -> CalculationResult:
    """Calculate trend analysis"""
    values = [float(dp.get("value", 0)) for dp in request.data_points]
    
    if len(values) < 2:
        trend_value = 0
        trend_direction = "insufficient_data"
        confidence = 0
    else:
        # Simple linear trend calculation
        n = len(values)
        x_values = list(range(n))
        x_mean = sum(x_values) / n
        y_mean = sum(values) / n
        
        numerator = sum((x_values[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x_values[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            trend_value = 0
        else:
            trend_value = numerator / denominator
        
        trend_direction = "increasing" if trend_value > 0.1 else "decreasing" if trend_value < -0.1 else "stable"
        confidence = min(0.9, max(0.5, len(values) / 20))  # Confidence based on data points
    
    return CalculationResult(
        metric_type=request.metric_type,
        value=round(trend_value, 4),
        trend=trend_direction,
        confidence=confidence,
        calculation_details={
            "data_points": len(values),
            "calculation_method": "linear_regression_slope",
            "trend_strength": abs(trend_value)
        }
    )

def calculate_ratio(request: AnalyticsRequest) -> CalculationResult:
    """Calculate ratio between two metrics"""
    numerator_values = [float(dp.get("numerator", 0)) for dp in request.data_points]
    denominator_values = [float(dp.get("denominator", 1)) for dp in request.data_points]
    
    ratios = []
    for i in range(min(len(numerator_values), len(denominator_values))):
        if denominator_values[i] != 0:
            ratios.append(numerator_values[i] / denominator_values[i])
    
    average_ratio = sum(ratios) / len(ratios) if ratios else 0
    
    return CalculationResult(
        metric_type=request.metric_type,
        value=round(average_ratio, 4),
        trend="ratio",
        confidence=0.8 if len(ratios) >= 5 else 0.6,
        calculation_details={
            "valid_ratios": len(ratios),
            "calculation_method": "average_ratio"
        }
    )

@app.get("/api/analytics/metrics/{metric_type}")
async def get_metric_calculations(metric_type: str, limit: int = 10):
    """Get calculation history for specific metric"""
    metric_calculations = [calc for calc in calculation_history 
                          if calc["request"]["metric_type"] == metric_type]
    
    return {
        "metric_type": metric_type,
        "calculations": metric_calculations[-limit:],
        "total_calculations": len(metric_calculations)
    }

@app.get("/api/analytics/performance")
async def get_calculation_performance():
    """Get calculation performance metrics"""
    if not calculation_history:
        return {"message": "No calculation history available"}
    
    processing_times = [calc["result"]["calculation_details"]["processing_time_ms"] 
                       for calc in calculation_history 
                       if "processing_time_ms" in calc["result"]["calculation_details"]]
    
    avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
    
    return {
        "total_calculations": len(calculation_history),
        "average_processing_time_ms": round(avg_processing_time, 2),
        "cache_hit_rate": len(calculation_cache) / len(calculation_history) if calculation_history else 0,
        "cached_calculations": len(calculation_cache)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8107))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)