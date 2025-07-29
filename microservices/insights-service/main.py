#!/usr/bin/env python3
"""
Insights Microservice - Customer Interaction Analytics & Reporting

Tracks customer interactions across multiple platforms (WhatsApp, Instagram, web widgets)
and generates comprehensive analytics reports for customers showing:
- Conversion rates and revenue attribution
- Lead generation and qualification metrics
- Near misses and opportunity identification
- Platform performance comparisons
- ROI and effectiveness measurements
"""

import os
import asyncio
import aiohttp
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google.cloud import bigquery
from google.oauth2 import service_account
import logging

# Configuration
app = FastAPI(
    title="Insights Service",
    description="Customer interaction analytics and reporting across multiple platforms",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# BigQuery Configuration
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT_ID', 'your-project-id')
DATASET_ID = os.environ.get('BIGQUERY_DATASET_ID', 'agenthub_insights')
CREDENTIALS_PATH = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')

# Initialize BigQuery client
if CREDENTIALS_PATH and os.path.exists(CREDENTIALS_PATH):
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    bq_client = bigquery.Client(credentials=credentials, project=PROJECT_ID)
else:
    # For development/testing, use default credentials
    try:
        bq_client = bigquery.Client(project=PROJECT_ID)
    except Exception as e:
        logger.warning(f"BigQuery not configured, using in-memory storage: {e}")
        bq_client = None

# Service URLs for cross-service communication
AGENT_WIZARD_URL = os.environ.get('AGENT_WIZARD_URL', 'http://localhost:8001')
MY_AGENTS_URL = os.environ.get('MY_AGENTS_URL', 'http://localhost:8006')
ANALYTICS_URL = os.environ.get('ANALYTICS_URL', 'http://localhost:8002')
BILLING_URL = os.environ.get('BILLING_URL', 'http://localhost:8003')

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enums
class InteractionPlatform(str, Enum):
    WEBCHAT = "webchat"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TELEGRAM = "telegram"
    SMS = "sms"

class InteractionType(str, Enum):
    INQUIRY = "inquiry"
    SUPPORT = "support"
    SALES = "sales"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"
    BOOKING = "booking"
    QUOTE_REQUEST = "quote_request"

class ConversionStage(str, Enum):
    AWARENESS = "awareness"
    INTEREST = "interest"
    CONSIDERATION = "consideration"
    INTENT = "intent"
    EVALUATION = "evaluation"
    PURCHASE = "purchase"
    RETENTION = "retention"
    ADVOCACY = "advocacy"

class LeadQuality(str, Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"

# Data Models
class CustomerInteraction(BaseModel):
    id: Optional[str] = None
    agent_id: str
    customer_id: str
    platform: InteractionPlatform
    interaction_type: InteractionType
    conversation_id: str
    session_start: datetime
    session_end: Optional[datetime] = None
    message_count: int = 0
    total_tokens: int = 0
    response_time_avg: float = 0.0
    customer_satisfaction: Optional[float] = None
    conversion_stage: ConversionStage = ConversionStage.AWARENESS
    revenue_attributed: float = 0.0
    lead_quality: Optional[LeadQuality] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    created_at: Optional[datetime] = None

class ConversionEvent(BaseModel):
    id: Optional[str] = None
    interaction_id: str
    agent_id: str
    customer_id: str
    event_type: str  # purchase, signup, download, booking, etc.
    event_value: float = 0.0
    currency: str = "USD"
    conversion_funnel_stage: ConversionStage
    attribution_data: Dict[str, Any] = {}
    occurred_at: datetime
    created_at: Optional[datetime] = None

class LeadCapture(BaseModel):
    id: Optional[str] = None
    interaction_id: str
    agent_id: str
    customer_id: str
    lead_source: InteractionPlatform
    contact_info: Dict[str, str]  # email, phone, name, etc.
    lead_score: int = Field(ge=0, le=100)
    qualification_notes: str = ""
    follow_up_required: bool = True
    assigned_to: Optional[str] = None
    status: str = "new"
    created_at: Optional[datetime] = None

class NearMiss(BaseModel):
    id: Optional[str] = None
    interaction_id: str
    agent_id: str
    customer_id: str
    missed_opportunity_type: str
    potential_value: float = 0.0
    failure_reason: str
    recovery_suggestions: List[str] = []
    sentiment_score: float = 0.0
    created_at: Optional[datetime] = None

class InsightsReport(BaseModel):
    agent_id: str
    report_period_start: datetime
    report_period_end: datetime
    total_interactions: int
    platform_breakdown: Dict[InteractionPlatform, int]
    conversion_metrics: Dict[str, Any]
    revenue_metrics: Dict[str, Any]
    lead_metrics: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    recommendations: List[str]
    generated_at: datetime

# BigQuery Schema Creation
async def create_bigquery_tables():
    """Create BigQuery tables for insights data"""
    if not bq_client:
        logger.warning("BigQuery client not available, skipping table creation")
        return
        
    try:
        # Create dataset if it doesn't exist
        dataset_ref = bq_client.dataset(DATASET_ID)
        try:
            bq_client.get_dataset(dataset_ref)
            logger.info(f"Dataset {DATASET_ID} already exists")
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            bq_client.create_dataset(dataset)
            logger.info(f"Created dataset {DATASET_ID}")
        
        # Define table schemas
        tables_config = {
            "customer_interactions": [
                bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("agent_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("customer_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("platform", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("interaction_type", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("conversation_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("session_start", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("session_end", "TIMESTAMP", mode="NULLABLE"),
                bigquery.SchemaField("message_count", "INTEGER", mode="NULLABLE"),
                bigquery.SchemaField("total_tokens", "INTEGER", mode="NULLABLE"),
                bigquery.SchemaField("response_time_avg", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("customer_satisfaction", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("conversion_stage", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("revenue_attributed", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("lead_quality", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("tags", "STRING", mode="REPEATED"),
                bigquery.SchemaField("metadata", "JSON", mode="NULLABLE"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
            ],
            "conversion_events": [
                bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("interaction_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("agent_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("customer_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("event_type", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("event_value", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("currency", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("conversion_funnel_stage", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("attribution_data", "JSON", mode="NULLABLE"),
                bigquery.SchemaField("occurred_at", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
            ],
            "lead_captures": [
                bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("interaction_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("agent_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("customer_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("lead_source", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("contact_info", "JSON", mode="REQUIRED"),
                bigquery.SchemaField("lead_score", "INTEGER", mode="NULLABLE"),
                bigquery.SchemaField("qualification_notes", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("follow_up_required", "BOOLEAN", mode="NULLABLE"),
                bigquery.SchemaField("assigned_to", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
            ],
            "near_misses": [
                bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("interaction_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("agent_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("customer_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("missed_opportunity_type", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("potential_value", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("failure_reason", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("recovery_suggestions", "STRING", mode="REPEATED"),
                bigquery.SchemaField("sentiment_score", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
            ]
        }
        
        # Create tables
        for table_name, schema in tables_config.items():
            table_ref = dataset_ref.table(table_name)
            try:
                bq_client.get_table(table_ref)
                logger.info(f"Table {table_name} already exists")
            except Exception:
                table = bigquery.Table(table_ref, schema=schema)
                bq_client.create_table(table)
                logger.info(f"Created table {table_name}")
        
        logger.info("BigQuery tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating BigQuery tables: {e}")
        raise

# BigQuery Operations
def execute_query(query: str, params: Optional[Dict] = None):
    """Execute BigQuery query with optional parameters"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = [
            bigquery.ScalarQueryParameter(key, "STRING", value) 
            for key, value in params.items()
        ]
    
    query_job = bq_client.query(query, job_config=job_config)
    return query_job.result()

def insert_rows(table_name: str, rows: List[Dict]):
    """Insert rows into BigQuery table"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    table_ref = bq_client.dataset(DATASET_ID).table(table_name)
    table = bq_client.get_table(table_ref)
    
    errors = bq_client.insert_rows_json(table, rows)
    if errors:
        raise HTTPException(status_code=500, detail=f"Insert failed: {errors}")
    
    return True

async def call_service(url: str, endpoint: str, method: str = "GET", data: Optional[Dict] = None):
    """Call another microservice"""
    try:
        async with aiohttp.ClientSession() as session:
            full_url = f"{url}{endpoint}"
            
            if method == "GET":
                async with session.get(full_url) as response:
                    if response.status == 200:
                        return await response.json()
            elif method == "POST":
                async with session.post(full_url, json=data) as response:
                    if response.status in [200, 201]:
                        return await response.json()
                        
        return None
    except Exception as e:
        logger.error(f"Error calling {full_url}: {e}")
        return None

# Business Logic Functions
async def calculate_conversion_rate(agent_id: str, platform: Optional[InteractionPlatform] = None, 
                                   period_start: Optional[datetime] = None, 
                                   period_end: Optional[datetime] = None) -> Dict[str, Any]:
    """Calculate conversion rates for an agent using BigQuery"""
    if not bq_client:
        return {
            "total_interactions": 0,
            "total_conversions": 0,
            "conversion_rate": 0.0,
            "average_satisfaction": 0.0,
            "total_revenue": 0.0,
            "conversion_value": 0.0
        }
    
    # Build where clause
    where_conditions = ["agent_id = @agent_id"]
    query_params = {"agent_id": agent_id}
    
    if platform:
        where_conditions.append("platform = @platform")
        query_params["platform"] = platform.value
    
    if period_start:
        where_conditions.append("created_at >= @period_start")
        query_params["period_start"] = period_start.isoformat()
        
    if period_end:
        where_conditions.append("created_at <= @period_end")
        query_params["period_end"] = period_end.isoformat()
    
    where_clause = " AND ".join(where_conditions)
    
    # Get total interactions
    interaction_query = f"""
        SELECT 
            COUNT(*) as total_interactions,
            AVG(customer_satisfaction) as avg_satisfaction,
            SUM(revenue_attributed) as total_revenue
        FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
        WHERE {where_clause}
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter(key, "STRING", str(value)) 
            for key, value in query_params.items()
        ]
    )
    
    try:
        interaction_results = list(bq_client.query(interaction_query, job_config=job_config))
        interaction_stats = interaction_results[0] if interaction_results else {}
        
        # Get conversion events
        conversion_query = f"""
            SELECT 
                COUNT(*) as total_conversions,
                SUM(event_value) as conversion_value
            FROM `{PROJECT_ID}.{DATASET_ID}.conversion_events` ce
            JOIN `{PROJECT_ID}.{DATASET_ID}.customer_interactions` ci 
            ON ce.interaction_id = ci.id
            WHERE {where_clause.replace('agent_id', 'ci.agent_id')}
        """
        
        conversion_results = list(bq_client.query(conversion_query, job_config=job_config))
        conversion_stats = conversion_results[0] if conversion_results else {}
        
        # Calculate rates
        total_interactions = interaction_stats.get('total_interactions', 0) or 0
        total_conversions = conversion_stats.get('total_conversions', 0) or 0
        
        conversion_rate = (total_conversions / total_interactions * 100) if total_interactions > 0 else 0
        
        return {
            "total_interactions": total_interactions,
            "total_conversions": total_conversions,
            "conversion_rate": round(conversion_rate, 2),
            "average_satisfaction": round(interaction_stats.get('avg_satisfaction', 0) or 0, 2),
            "total_revenue": round(interaction_stats.get('total_revenue', 0) or 0, 2),
            "conversion_value": round(conversion_stats.get('conversion_value', 0) or 0, 2)
        }
        
    except Exception as e:
        logger.error(f"Error calculating conversion rate: {e}")
        return {
            "total_interactions": 0,
            "total_conversions": 0,
            "conversion_rate": 0.0,
            "average_satisfaction": 0.0,
            "total_revenue": 0.0,
            "conversion_value": 0.0
        }


async def generate_insights_report(agent_id: str, period_start: datetime, 
                                 period_end: datetime) -> InsightsReport:
    """Generate comprehensive insights report for an agent using BigQuery"""
    if not bq_client:
        return InsightsReport(
            agent_id=agent_id,
            report_period_start=period_start,
            report_period_end=period_end,
            total_interactions=0,
            platform_breakdown={
                InteractionPlatform.WEBCHAT: 0,
                InteractionPlatform.WHATSAPP: 0,
                InteractionPlatform.INSTAGRAM: 0
            },
            conversion_metrics={},
            revenue_metrics={},
            lead_metrics={},
            performance_metrics={},
            recommendations=["BigQuery not configured - no data available"],
            generated_at=datetime.now()
        )
    
    try:
        # Get basic metrics
        stats_query = f"""
            SELECT 
                COUNT(*) as total_interactions,
                COUNTIF(platform = 'webchat') as webchat_count,
                COUNTIF(platform = 'whatsapp') as whatsapp_count,
                COUNTIF(platform = 'instagram') as instagram_count,
                AVG(customer_satisfaction) as avg_satisfaction,
                AVG(response_time_avg) as avg_response_time,
                SUM(revenue_attributed) as total_revenue
            FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
            WHERE agent_id = @agent_id 
            AND created_at BETWEEN @period_start AND @period_end
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
                bigquery.ScalarQueryParameter("period_start", "STRING", period_start.isoformat()),
                bigquery.ScalarQueryParameter("period_end", "STRING", period_end.isoformat())
            ]
        )
        
        stats_results = list(bq_client.query(stats_query, job_config=job_config))
        stats = stats_results[0] if stats_results else {}
        
        # Get conversion metrics
        conversion_metrics = await calculate_conversion_rate(agent_id, None, period_start, period_end)
        
        # Get lead metrics
        lead_query = f"""
            SELECT 
                COUNT(*) as total_leads,
                AVG(lead_score) as avg_lead_score,
                COUNTIF(JSON_EXTRACT_SCALAR(ci.metadata, '$.lead_quality') = 'hot') as hot_leads,
                COUNTIF(JSON_EXTRACT_SCALAR(ci.metadata, '$.lead_quality') = 'warm') as warm_leads
            FROM `{PROJECT_ID}.{DATASET_ID}.lead_captures` lc
            JOIN `{PROJECT_ID}.{DATASET_ID}.customer_interactions` ci ON lc.interaction_id = ci.id
            WHERE ci.agent_id = @agent_id 
            AND ci.created_at BETWEEN @period_start AND @period_end
        """
        
        lead_results = list(bq_client.query(lead_query, job_config=job_config))
        lead_stats = lead_results[0] if lead_results else {}
        
        # Get near miss analysis
        near_miss_query = f"""
            SELECT 
                COUNT(*) as total_near_misses,
                SUM(potential_value) as missed_revenue,
                AVG(sentiment_score) as avg_sentiment
            FROM `{PROJECT_ID}.{DATASET_ID}.near_misses` nm
            JOIN `{PROJECT_ID}.{DATASET_ID}.customer_interactions` ci ON nm.interaction_id = ci.id
            WHERE ci.agent_id = @agent_id 
            AND ci.created_at BETWEEN @period_start AND @period_end
        """
        
        near_miss_results = list(bq_client.query(near_miss_query, job_config=job_config))
        near_miss_stats = near_miss_results[0] if near_miss_results else {}
        
        # Generate recommendations
        recommendations = []
        
        if conversion_metrics['conversion_rate'] < 5:
            recommendations.append("Conversion rate is below 5%. Consider optimizing agent responses for better lead qualification.")
        
        if stats.get('avg_satisfaction', 0) and stats['avg_satisfaction'] < 4.0:
            recommendations.append("Customer satisfaction is below 4.0. Review agent training and response quality.")
        
        if lead_stats.get('total_leads', 0) == 0:
            recommendations.append("No leads captured. Implement lead capture strategies in agent conversations.")
        
        if near_miss_stats.get('total_near_misses', 0) > stats.get('total_interactions', 0) * 0.2:
            recommendations.append("High number of near misses detected. Review failure patterns and improve agent responses.")
        
        return InsightsReport(
            agent_id=agent_id,
            report_period_start=period_start,
            report_period_end=period_end,
            total_interactions=stats.get('total_interactions', 0) or 0,
            platform_breakdown={
                InteractionPlatform.WEBCHAT: stats.get('webchat_count', 0) or 0,
                InteractionPlatform.WHATSAPP: stats.get('whatsapp_count', 0) or 0,
                InteractionPlatform.INSTAGRAM: stats.get('instagram_count', 0) or 0
            },
            conversion_metrics=conversion_metrics,
            revenue_metrics={
                "total_revenue": round(stats.get('total_revenue', 0) or 0, 2),
                "revenue_per_interaction": round((stats.get('total_revenue', 0) or 0) / max(stats.get('total_interactions', 0) or 1, 1), 2)
            },
            lead_metrics={
                "total_leads": lead_stats.get('total_leads', 0) or 0,
                "avg_lead_score": round(lead_stats.get('avg_lead_score', 0) or 0, 1),
                "hot_leads": lead_stats.get('hot_leads', 0) or 0,
                "warm_leads": lead_stats.get('warm_leads', 0) or 0
            },
            performance_metrics={
                "avg_satisfaction": round(stats.get('avg_satisfaction', 0) or 0, 2),
                "avg_response_time": round(stats.get('avg_response_time', 0) or 0, 2),
                "near_misses": near_miss_stats.get('total_near_misses', 0) or 0,
                "missed_revenue": round(near_miss_stats.get('missed_revenue', 0) or 0, 2)
            },
            recommendations=recommendations,
            generated_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error generating insights report: {e}")
        return InsightsReport(
            agent_id=agent_id,
            report_period_start=period_start,
            report_period_end=period_end,
            total_interactions=0,
            platform_breakdown={
                InteractionPlatform.WEBCHAT: 0,
                InteractionPlatform.WHATSAPP: 0,
                InteractionPlatform.INSTAGRAM: 0
            },
            conversion_metrics={},
            revenue_metrics={},
            lead_metrics={},
            performance_metrics={},
            recommendations=[f"Error generating report: {str(e)}"],
            generated_at=datetime.now()
        )

# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize BigQuery tables on startup"""
    await create_bigquery_tables()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        if bq_client:
            # Test BigQuery connection
            query = f"SELECT 1 as test"
            results = list(bq_client.query(query))
            db_status = "healthy" if results else "unhealthy"
        else:
            db_status = "not_configured"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "insights-service",
        "version": "1.0.0",
        "database": db_status,
        "bigquery_project": PROJECT_ID,
        "bigquery_dataset": DATASET_ID,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/insights/interactions")
async def track_interaction(interaction: CustomerInteraction):
    """Track a customer interaction in BigQuery"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    interaction_id = str(uuid.uuid4())
    
    row_data = {
        "id": interaction_id,
        "agent_id": interaction.agent_id,
        "customer_id": interaction.customer_id,
        "platform": interaction.platform.value,
        "interaction_type": interaction.interaction_type.value,
        "conversation_id": interaction.conversation_id,
        "session_start": interaction.session_start.isoformat(),
        "session_end": interaction.session_end.isoformat() if interaction.session_end else None,
        "message_count": interaction.message_count,
        "total_tokens": interaction.total_tokens,
        "response_time_avg": interaction.response_time_avg,
        "customer_satisfaction": interaction.customer_satisfaction,
        "conversion_stage": interaction.conversion_stage.value,
        "revenue_attributed": interaction.revenue_attributed,
        "lead_quality": interaction.lead_quality.value if interaction.lead_quality else None,
        "tags": interaction.tags,
        "metadata": interaction.metadata,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        insert_rows("customer_interactions", [row_data])
        return {"id": interaction_id, "message": "Interaction tracked successfully"}
    except Exception as e:
        logger.error(f"Error tracking interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track interaction: {str(e)}")

@app.post("/api/insights/conversions")
async def track_conversion(conversion: ConversionEvent):
    """Track a conversion event in BigQuery"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    conversion_id = str(uuid.uuid4())
    
    row_data = {
        "id": conversion_id,
        "interaction_id": conversion.interaction_id,
        "agent_id": conversion.agent_id,
        "customer_id": conversion.customer_id,
        "event_type": conversion.event_type,
        "event_value": conversion.event_value,
        "currency": conversion.currency,
        "conversion_funnel_stage": conversion.conversion_funnel_stage.value,
        "attribution_data": conversion.attribution_data,
        "occurred_at": conversion.occurred_at.isoformat(),
        "created_at": datetime.now().isoformat()
    }
    
    try:
        insert_rows("conversion_events", [row_data])
        return {"id": conversion_id, "message": "Conversion tracked successfully"}
    except Exception as e:
        logger.error(f"Error tracking conversion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track conversion: {str(e)}")

@app.post("/api/insights/leads")
async def capture_lead(lead: LeadCapture):
    """Capture a lead from interaction in BigQuery"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    lead_id = str(uuid.uuid4())
    
    row_data = {
        "id": lead_id,
        "interaction_id": lead.interaction_id,
        "agent_id": lead.agent_id,
        "customer_id": lead.customer_id,
        "lead_source": lead.lead_source.value,
        "contact_info": lead.contact_info,
        "lead_score": lead.lead_score,
        "qualification_notes": lead.qualification_notes,
        "follow_up_required": lead.follow_up_required,
        "assigned_to": lead.assigned_to,
        "status": lead.status,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        insert_rows("lead_captures", [row_data])
        return {"id": lead_id, "message": "Lead captured successfully"}
    except Exception as e:
        logger.error(f"Error capturing lead: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to capture lead: {str(e)}")

@app.post("/api/insights/near-misses")
async def track_near_miss(near_miss: NearMiss):
    """Track a near miss opportunity in BigQuery"""
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery not configured")
    
    near_miss_id = str(uuid.uuid4())
    
    row_data = {
        "id": near_miss_id,
        "interaction_id": near_miss.interaction_id,
        "agent_id": near_miss.agent_id,
        "customer_id": near_miss.customer_id,
        "missed_opportunity_type": near_miss.missed_opportunity_type,
        "potential_value": near_miss.potential_value,
        "failure_reason": near_miss.failure_reason,
        "recovery_suggestions": near_miss.recovery_suggestions,
        "sentiment_score": near_miss.sentiment_score,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        insert_rows("near_misses", [row_data])
        return {"id": near_miss_id, "message": "Near miss tracked successfully"}
    except Exception as e:
        logger.error(f"Error tracking near miss: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track near miss: {str(e)}")

@app.get("/api/insights/reports/{agent_id}")
async def get_insights_report(
    agent_id: str,
    period_start: datetime = Query(default=datetime.now() - timedelta(days=30)),
    period_end: datetime = Query(default=datetime.now()),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Generate comprehensive insights report for an agent"""
    report = await generate_insights_report(agent_id, period_start, period_end)
    
    # Background task to notify other services about report generation
    background_tasks.add_task(
        call_service, 
        BILLING_URL, 
        "/api/billing/usage", 
        "POST",
        {
            "agent_id": agent_id,
            "service": "insights",
            "usage_type": "report_generation",
            "quantity": 1
        }
    )
    
    return report

@app.get("/api/insights/conversion-rates/{agent_id}")
async def get_conversion_rates(
    agent_id: str,
    platform: Optional[InteractionPlatform] = None,
    period_start: Optional[datetime] = Query(default=datetime.now() - timedelta(days=30)),
    period_end: Optional[datetime] = Query(default=datetime.now())
):
    """Get conversion rates for an agent"""
    return await calculate_conversion_rate(agent_id, platform, period_start, period_end)

@app.get("/api/insights/interactions/{agent_id}")
async def get_agent_interactions(
    agent_id: str,
    platform: Optional[InteractionPlatform] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get interactions for an agent with filtering from BigQuery"""
    if not bq_client:
        return []
    
    where_conditions = ["agent_id = @agent_id"]
    query_params = {"agent_id": agent_id}
    
    if platform:
        where_conditions.append("platform = @platform")
        query_params["platform"] = platform.value
    
    where_clause = " AND ".join(where_conditions)
    
    query = f"""
        SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT {limit} OFFSET {offset}
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter(key, "STRING", str(value)) 
            for key, value in query_params.items()
        ]
    )
    
    try:
        results = list(bq_client.query(query, job_config=job_config))
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error getting interactions: {e}")
        return []

@app.get("/api/insights/leads/{agent_id}")
async def get_agent_leads(
    agent_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get leads for an agent from BigQuery"""
    if not bq_client:
        return []
    
    where_conditions = ["lc.agent_id = @agent_id"]
    query_params = {"agent_id": agent_id}
    
    if status:
        where_conditions.append("lc.status = @status")
        query_params["status"] = status
    
    where_clause = " AND ".join(where_conditions)
    
    query = f"""
        SELECT lc.*, ci.platform, ci.session_start
        FROM `{PROJECT_ID}.{DATASET_ID}.lead_captures` lc
        JOIN `{PROJECT_ID}.{DATASET_ID}.customer_interactions` ci 
        ON lc.interaction_id = ci.id
        WHERE {where_clause}
        ORDER BY lc.created_at DESC
        LIMIT {limit} OFFSET {offset}
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter(key, "STRING", str(value)) 
            for key, value in query_params.items()
        ]
    )
    
    try:
        results = list(bq_client.query(query, job_config=job_config))
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error getting leads: {e}")
        return []

@app.get("/api/insights/dashboard/{agent_id}")
async def get_insights_dashboard(agent_id: str):
    """Get dashboard summary for insights from BigQuery"""
    period_start = datetime.now() - timedelta(days=30)
    period_end = datetime.now()
    
    # Get basic stats
    conversion_metrics = await calculate_conversion_rate(agent_id, None, period_start, period_end)
    
    if not bq_client:
        return {
            "conversion_metrics": conversion_metrics,
            "platform_distribution": {},
            "period": {
                "start": period_start.isoformat(),
                "end": period_end.isoformat()
            }
        }
    
    try:
        # Get recent activity
        platform_query = f"""
            SELECT platform, COUNT(*) as count
            FROM `{PROJECT_ID}.{DATASET_ID}.customer_interactions`
            WHERE agent_id = @agent_id AND created_at >= @period_start
            GROUP BY platform
            ORDER BY count DESC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
                bigquery.ScalarQueryParameter("period_start", "STRING", period_start.isoformat())
            ]
        )
        
        platform_results = list(bq_client.query(platform_query, job_config=job_config))
        platform_distribution = {row['platform']: row['count'] for row in platform_results}
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        platform_distribution = {}
    
    return {
        "conversion_metrics": conversion_metrics,
        "platform_distribution": platform_distribution,
        "period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Insights Service on http://0.0.0.0:8007")
    uvicorn.run(app, host="0.0.0.0", port=8007, log_level="info")