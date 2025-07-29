#!/usr/bin/env python3
"""
Insights Service - Customer Analytics & BigQuery Integration
Efficient service for tracking customer interactions and generating analytics
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# BigQuery imports (graceful fallback if not available)
try:
    from google.cloud import bigquery
    from google.oauth2 import service_account
    HAS_BIGQUERY = True
except ImportError:
    HAS_BIGQUERY = False

app = FastAPI(title="Insights Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# BigQuery setup
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT_ID', 'agenthub-demo')
DATASET_ID = os.environ.get('BIGQUERY_DATASET_ID', 'insights')
bq_client = None

if HAS_BIGQUERY and PROJECT_ID != 'agenthub-demo':
    try:
        bq_client = bigquery.Client(project=PROJECT_ID)
        logger.info("BigQuery client initialized")
    except Exception as e:
        logger.warning(f"BigQuery unavailable: {e}")

# Models
class Platform(str, Enum):
    WEBCHAT = "webchat"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"

class InteractionType(str, Enum):
    INQUIRY = "inquiry"
    SALES = "sales"
    SUPPORT = "support"
    BOOKING = "booking"

class CustomerInteraction(BaseModel):
    id: Optional[str] = None
    agent_id: str
    customer_id: str
    platform: Platform
    interaction_type: InteractionType
    conversation_id: str
    session_start: datetime
    session_end: Optional[datetime] = None
    message_count: int = 1
    total_tokens: int = 0
    response_time_avg: float = 0.0
    customer_satisfaction: Optional[float] = None
    conversion_stage: str = "awareness"
    revenue_attributed: float = 0.0
    lead_quality: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class ConversionEvent(BaseModel):
    id: Optional[str] = None
    interaction_id: str
    agent_id: str
    customer_id: str
    event_type: str
    event_value: float
    currency: str = "USD"
    conversion_funnel_stage: str
    attribution_data: Dict[str, Any] = {}
    occurred_at: datetime

# In-memory storage (fallback when BigQuery not available)
interactions_db: Dict[str, CustomerInteraction] = {}
conversions_db: Dict[str, ConversionEvent] = {}

# Sample data initialization
def init_sample_data():
    sample_interactions = [
        {
            "agent_id": "agent-healthcare-1",
            "customer_id": "customer-001",
            "platform": Platform.WHATSAPP,
            "interaction_type": InteractionType.BOOKING,
            "conversation_id": "conv-whatsapp-001",
            "session_start": datetime.now() - timedelta(hours=2),
            "message_count": 8,
            "total_tokens": 320,
            "customer_satisfaction": 4.5,
            "revenue_attributed": 250.0,
            "lead_quality": "hot"
        },
        {
            "agent_id": "agent-tech-1",
            "customer_id": "customer-002",
            "platform": Platform.WEBCHAT,
            "interaction_type": InteractionType.SALES,
            "conversation_id": "conv-webchat-002",
            "session_start": datetime.now() - timedelta(hours=5),
            "message_count": 15,
            "total_tokens": 600,
            "customer_satisfaction": 4.2,
            "revenue_attributed": 1500.0,
            "lead_quality": "warm"
        }
    ]
    
    for i, data in enumerate(sample_interactions, 1):
        interaction_id = str(i)
        interaction = CustomerInteraction(id=interaction_id, **data)
        interactions_db[interaction_id] = interaction

init_sample_data()

# Helper functions
async def store_interaction_bigquery(interaction: CustomerInteraction) -> str:
    """Store interaction in BigQuery"""
    if not bq_client:
        return None
    
    try:
        table_id = f"{PROJECT_ID}.{DATASET_ID}.customer_interactions"
        rows_to_insert = [{
            "id": interaction.id or str(uuid.uuid4()),
            "agent_id": interaction.agent_id,
            "customer_id": interaction.customer_id,
            "platform": interaction.platform,
            "interaction_type": interaction.interaction_type,
            "conversation_id": interaction.conversation_id,
            "session_start": interaction.session_start.isoformat(),
            "session_end": interaction.session_end.isoformat() if interaction.session_end else None,
            "message_count": interaction.message_count,
            "total_tokens": interaction.total_tokens,
            "response_time_avg": interaction.response_time_avg,
            "customer_satisfaction": interaction.customer_satisfaction,
            "conversion_stage": interaction.conversion_stage,
            "revenue_attributed": interaction.revenue_attributed,
            "lead_quality": interaction.lead_quality,
            "tags": interaction.tags,
            "metadata": interaction.metadata,
            "created_at": datetime.now().isoformat()
        }]
        
        errors = bq_client.insert_rows_json(table_id, rows_to_insert)
        if errors:
            logger.error(f"BigQuery insert errors: {errors}")
            return None
        
        return rows_to_insert[0]["id"]
    except Exception as e:
        logger.error(f"BigQuery storage error: {e}")
        return None

async def calculate_conversion_metrics(agent_id: str) -> Dict[str, Any]:
    """Calculate conversion metrics for an agent"""
    if bq_client:
        try:
            query = f"""
                SELECT 
                    COUNT(*) as total_interactions,
                    SUM(revenue_attributed) as total_revenue,
                    AVG(customer_satisfaction) as avg_satisfaction,
                    COUNT(CASE WHEN revenue_attributed > 0 THEN 1 END) as conversions
                FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
                WHERE agent_id = @agent_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id)]
            )
            
            results = list(bq_client.query(query, job_config=job_config))
            if results:
                row = results[0]
                total = row.total_interactions or 0
                conversions = row.conversions or 0
                return {
                    "total_interactions": total,
                    "conversions": conversions,
                    "conversion_rate": round((conversions / total * 100) if total > 0 else 0, 2),
                    "total_revenue": float(row.total_revenue or 0),
                    "avg_satisfaction": round(float(row.avg_satisfaction or 0), 2)
                }
        except Exception as e:
            logger.error(f"BigQuery metrics error: {e}")
    
    # Fallback to in-memory calculation
    agent_interactions = [i for i in interactions_db.values() if i.agent_id == agent_id]
    total = len(agent_interactions)
    conversions = len([i for i in agent_interactions if i.revenue_attributed > 0])
    
    return {
        "total_interactions": total,
        "conversions": conversions,
        "conversion_rate": round((conversions / total * 100) if total > 0 else 0, 2),
        "total_revenue": sum(i.revenue_attributed for i in agent_interactions),
        "avg_satisfaction": round(sum(i.customer_satisfaction or 0 for i in agent_interactions) / total if total > 0 else 0, 2)
    }

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "insights",
        "database": "bigquery" if bq_client else "memory",
        "bigquery_project": PROJECT_ID if bq_client else None
    }

@app.post("/api/insights/interactions")
async def track_interaction(interaction: CustomerInteraction):
    """Track a customer interaction"""
    interaction.id = interaction.id or str(uuid.uuid4())
    
    # Try BigQuery first, fallback to memory
    bigquery_id = await store_interaction_bigquery(interaction)
    if bigquery_id:
        interaction.id = bigquery_id
    else:
        interactions_db[interaction.id] = interaction
    
    return {"id": interaction.id, "status": "tracked"}

@app.post("/api/insights/conversions")
async def track_conversion(conversion: ConversionEvent):
    """Track a conversion event"""
    conversion.id = conversion.id or str(uuid.uuid4())
    conversions_db[conversion.id] = conversion
    
    return {"id": conversion.id, "status": "tracked"}

@app.get("/api/insights/conversion-rates/{agent_id}")
async def get_conversion_rates(agent_id: str):
    """Get conversion rates for an agent"""
    metrics = await calculate_conversion_metrics(agent_id)
    return metrics

@app.get("/api/insights/dashboard/{agent_id}")
async def get_insights_dashboard(agent_id: str):
    """Get dashboard analytics for an agent"""
    metrics = await calculate_conversion_metrics(agent_id)
    
    # Platform distribution
    if bq_client:
        try:
            query = f"""
                SELECT platform, COUNT(*) as count
                FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
                WHERE agent_id = @agent_id
                GROUP BY platform
                ORDER BY count DESC
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id)]
            )
            
            results = list(bq_client.query(query, job_config=job_config))
            platform_dist = {row.platform: row.count for row in results}
        except:
            platform_dist = {}
    else:
        agent_interactions = [i for i in interactions_db.values() if i.agent_id == agent_id]
        platform_dist = {}
        for interaction in agent_interactions:
            platform = interaction.platform
            platform_dist[platform] = platform_dist.get(platform, 0) + 1
    
    return {
        "conversion_metrics": metrics,
        "platform_distribution": platform_dist,
        "period": {
            "start": (datetime.now() - timedelta(days=30)).isoformat(),
            "end": datetime.now().isoformat()
        }
    }

@app.get("/api/insights/interactions")
async def get_interactions(
    agent_id: Optional[str] = None,
    platform: Optional[Platform] = None,
    limit: int = Query(50, le=100)
):
    """Get customer interactions with filtering"""
    if bq_client:
        try:
            where_conditions = []
            params = []
            
            if agent_id:
                where_conditions.append("agent_id = @agent_id")
                params.append(bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id))
            
            if platform:
                where_conditions.append("platform = @platform")
                params.append(bigquery.ScalarQueryParameter("platform", "STRING", platform))
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            query = f"""
                SELECT *
                FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT {limit}
            """
            
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            results = list(bq_client.query(query, job_config=job_config))
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"BigQuery query error: {e}")
    
    # Fallback to memory
    interactions = list(interactions_db.values())
    
    if agent_id:
        interactions = [i for i in interactions if i.agent_id == agent_id]
    if platform:
        interactions = [i for i in interactions if i.platform == platform]
    
    return interactions[:limit]

if __name__ == "__main__":
    import uvicorn
    print("Starting Insights Service on http://0.0.0.0:8007")
    uvicorn.run(app, host="0.0.0.0", port=8007, log_level="info")