#!/usr/bin/env python3
"""
Metrics Collection Service
Ultra-focused microservice for metrics ingestion only
Target: <100 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Metrics Collection Service", description="Ultra-focused metrics ingestion", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Metric(BaseModel):
    metric_name: str
    value: float
    tags: Dict[str, str] = {}
    timestamp: Optional[str] = None

class MetricBatch(BaseModel):
    metrics: List[Metric]
    source: str

# In-memory metrics storage
collected_metrics = []
metric_counts = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "metrics-collection", "collected_metrics": len(collected_metrics)}

@app.post("/api/metrics/collect")
async def collect_metric(metric: Metric):
    """Collect a single metric"""
    try:
        # Add timestamp if not provided
        if not metric.timestamp:
            metric.timestamp = datetime.now().isoformat()
        
        # Store metric
        metric_data = metric.model_dump()
        collected_metrics.append(metric_data)
        
        # Update count
        metric_counts[metric.metric_name] = metric_counts.get(metric.metric_name, 0) + 1
        
        logger.info(f"Collected metric: {metric.metric_name} = {metric.value}")
        return {"success": True, "metric_id": len(collected_metrics)}
        
    except Exception as e:
        logger.error(f"Metric collection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/metrics/batch")
async def collect_batch_metrics(batch: MetricBatch):
    """Collect multiple metrics at once"""
    try:
        collected_count = 0
        
        for metric in batch.metrics:
            if not metric.timestamp:
                metric.timestamp = datetime.now().isoformat()
            
            # Add source tag
            metric.tags["source"] = batch.source
            
            metric_data = metric.model_dump()
            collected_metrics.append(metric_data)
            metric_counts[metric.metric_name] = metric_counts.get(metric.metric_name, 0) + 1
            collected_count += 1
        
        logger.info(f"Collected {collected_count} metrics from {batch.source}")
        return {"success": True, "collected_metrics": collected_count}
        
    except Exception as e:
        logger.error(f"Batch metric collection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/summary")
async def get_metrics_summary():
    """Get metrics collection summary"""
    try:
        total_metrics = len(collected_metrics)
        unique_metric_names = len(metric_counts)
        
        recent_metrics = [m for m in collected_metrics[-10:]]
        
        return {
            "total_collected": total_metrics,
            "unique_metrics": unique_metric_names,
            "metric_counts": metric_counts,
            "recent_metrics": recent_metrics,
            "collection_rate": f"{total_metrics}/hour"
        }
        
    except Exception as e:
        logger.error(f"Metrics summary failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/{metric_name}/latest")
async def get_latest_metric(metric_name: str, limit: int = 10):
    """Get latest values for a specific metric"""
    try:
        matching_metrics = [m for m in collected_metrics if m["metric_name"] == metric_name]
        latest_metrics = matching_metrics[-limit:]
        
        return {
            "metric_name": metric_name,
            "latest_values": latest_metrics,
            "total_count": len(matching_metrics)
        }
        
    except Exception as e:
        logger.error(f"Latest metric retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8023))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)