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
import psycopg2
from psycopg2.extras import RealDictCursor
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

# Database Configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise Exception("DATABASE_URL environment variable is required")

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

# Database Schema Creation
async def create_tables():
    """Create database tables for insights data"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Customer Interactions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS customer_interactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                agent_id VARCHAR(255) NOT NULL,
                customer_id VARCHAR(255) NOT NULL,
                platform VARCHAR(50) NOT NULL,
                interaction_type VARCHAR(50) NOT NULL,
                conversation_id VARCHAR(255) NOT NULL,
                session_start TIMESTAMP NOT NULL,
                session_end TIMESTAMP,
                message_count INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                response_time_avg FLOAT DEFAULT 0.0,
                customer_satisfaction FLOAT,
                conversion_stage VARCHAR(50) DEFAULT 'awareness',
                revenue_attributed FLOAT DEFAULT 0.0,
                lead_quality VARCHAR(50),
                tags TEXT[],
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Conversion Events table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS conversion_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                interaction_id UUID REFERENCES customer_interactions(id),
                agent_id VARCHAR(255) NOT NULL,
                customer_id VARCHAR(255) NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                event_value FLOAT DEFAULT 0.0,
                currency VARCHAR(10) DEFAULT 'USD',
                conversion_funnel_stage VARCHAR(50) NOT NULL,
                attribution_data JSONB DEFAULT '{}',
                occurred_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Lead Captures table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS lead_captures (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                interaction_id UUID REFERENCES customer_interactions(id),
                agent_id VARCHAR(255) NOT NULL,
                customer_id VARCHAR(255) NOT NULL,
                lead_source VARCHAR(50) NOT NULL,
                contact_info JSONB NOT NULL,
                lead_score INTEGER CHECK (lead_score BETWEEN 0 AND 100),
                qualification_notes TEXT DEFAULT '',
                follow_up_required BOOLEAN DEFAULT TRUE,
                assigned_to VARCHAR(255),
                status VARCHAR(50) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Near Misses table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS near_misses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                interaction_id UUID REFERENCES customer_interactions(id),
                agent_id VARCHAR(255) NOT NULL,
                customer_id VARCHAR(255) NOT NULL,
                missed_opportunity_type VARCHAR(100) NOT NULL,
                potential_value FLOAT DEFAULT 0.0,
                failure_reason TEXT NOT NULL,
                recovery_suggestions TEXT[],
                sentiment_score FLOAT DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes for performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interactions_agent_id ON customer_interactions(agent_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interactions_platform ON customer_interactions(platform);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON customer_interactions(created_at);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_conversions_agent_id ON conversion_events(agent_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON lead_captures(agent_id);")
        
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Database tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

# Database Operations
async def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

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
    """Calculate conversion rates for an agent"""
    conn = await get_connection()
    cur = conn.cursor()
    
    # Build where clause
    where_conditions = ["agent_id = %s"]
    params = [agent_id]
    
    if platform:
        where_conditions.append("platform = %s")
        params.append(platform.value)
    
    if period_start:
        where_conditions.append("created_at >= %s")
        params.append(period_start)
        
    if period_end:
        where_conditions.append("created_at <= %s")
        params.append(period_end)
    
    where_clause = " AND ".join(where_conditions)
    
    # Get total interactions
    cur.execute(f"""
        SELECT COUNT(*) as total_interactions,
               AVG(customer_satisfaction) as avg_satisfaction,
               SUM(revenue_attributed) as total_revenue
        FROM customer_interactions 
        WHERE {where_clause}
    """, params)
    
    interaction_stats = cur.fetchone()
    
    # Get conversion events
    cur.execute(f"""
        SELECT COUNT(*) as total_conversions,
               SUM(event_value) as conversion_value
        FROM conversion_events ce
        JOIN customer_interactions ci ON ce.interaction_id = ci.id
        WHERE {where_clause.replace('agent_id', 'ci.agent_id')}
    """, params)
    
    conversion_stats = cur.fetchone()
    
    # Calculate rates
    total_interactions = interaction_stats['total_interactions'] or 0
    total_conversions = conversion_stats['total_conversions'] or 0
    
    conversion_rate = (total_conversions / total_interactions * 100) if total_interactions > 0 else 0
    
    cur.close()
    conn.close()
    
    return {
        "total_interactions": total_interactions,
        "total_conversions": total_conversions,
        "conversion_rate": round(conversion_rate, 2),
        "average_satisfaction": round(interaction_stats['avg_satisfaction'] or 0, 2),
        "total_revenue": round(interaction_stats['total_revenue'] or 0, 2),
        "conversion_value": round(conversion_stats['conversion_value'] or 0, 2)
    }

async def generate_insights_report(agent_id: str, period_start: datetime, 
                                 period_end: datetime) -> InsightsReport:
    """Generate comprehensive insights report for an agent"""
    conn = await get_connection()
    cur = conn.cursor()
    
    # Get basic metrics
    cur.execute("""
        SELECT 
            COUNT(*) as total_interactions,
            COUNT(CASE WHEN platform = 'webchat' THEN 1 END) as webchat_count,
            COUNT(CASE WHEN platform = 'whatsapp' THEN 1 END) as whatsapp_count,
            COUNT(CASE WHEN platform = 'instagram' THEN 1 END) as instagram_count,
            AVG(customer_satisfaction) as avg_satisfaction,
            AVG(response_time_avg) as avg_response_time,
            SUM(revenue_attributed) as total_revenue
        FROM customer_interactions
        WHERE agent_id = %s AND created_at BETWEEN %s AND %s
    """, (agent_id, period_start, period_end))
    
    stats = cur.fetchone()
    
    # Get conversion metrics
    conversion_metrics = await calculate_conversion_rate(agent_id, None, period_start, period_end)
    
    # Get lead metrics
    cur.execute("""
        SELECT 
            COUNT(*) as total_leads,
            AVG(lead_score) as avg_lead_score,
            COUNT(CASE WHEN lead_quality = 'hot' THEN 1 END) as hot_leads,
            COUNT(CASE WHEN lead_quality = 'warm' THEN 1 END) as warm_leads
        FROM lead_captures lc
        JOIN customer_interactions ci ON lc.interaction_id = ci.id
        WHERE ci.agent_id = %s AND ci.created_at BETWEEN %s AND %s
    """, (agent_id, period_start, period_end))
    
    lead_stats = cur.fetchone()
    
    # Get near miss analysis
    cur.execute("""
        SELECT 
            COUNT(*) as total_near_misses,
            SUM(potential_value) as missed_revenue,
            AVG(sentiment_score) as avg_sentiment
        FROM near_misses nm
        JOIN customer_interactions ci ON nm.interaction_id = ci.id
        WHERE ci.agent_id = %s AND ci.created_at BETWEEN %s AND %s
    """, (agent_id, period_start, period_end))
    
    near_miss_stats = cur.fetchone()
    
    # Generate recommendations
    recommendations = []
    
    if conversion_metrics['conversion_rate'] < 5:
        recommendations.append("Conversion rate is below 5%. Consider optimizing agent responses for better lead qualification.")
    
    if stats['avg_satisfaction'] and stats['avg_satisfaction'] < 4.0:
        recommendations.append("Customer satisfaction is below 4.0. Review agent training and response quality.")
    
    if lead_stats['total_leads'] == 0:
        recommendations.append("No leads captured. Implement lead capture strategies in agent conversations.")
    
    if near_miss_stats['total_near_misses'] > stats['total_interactions'] * 0.2:
        recommendations.append("High number of near misses detected. Review failure patterns and improve agent responses.")
    
    cur.close()
    conn.close()
    
    return InsightsReport(
        agent_id=agent_id,
        report_period_start=period_start,
        report_period_end=period_end,
        total_interactions=stats['total_interactions'] or 0,
        platform_breakdown={
            InteractionPlatform.WEBCHAT: stats['webchat_count'] or 0,
            InteractionPlatform.WHATSAPP: stats['whatsapp_count'] or 0,
            InteractionPlatform.INSTAGRAM: stats['instagram_count'] or 0
        },
        conversion_metrics=conversion_metrics,
        revenue_metrics={
            "total_revenue": round(stats['total_revenue'] or 0, 2),
            "revenue_per_interaction": round((stats['total_revenue'] or 0) / max(stats['total_interactions'] or 1, 1), 2)
        },
        lead_metrics={
            "total_leads": lead_stats['total_leads'] or 0,
            "avg_lead_score": round(lead_stats['avg_lead_score'] or 0, 1),
            "hot_leads": lead_stats['hot_leads'] or 0,
            "warm_leads": lead_stats['warm_leads'] or 0
        },
        performance_metrics={
            "avg_satisfaction": round(stats['avg_satisfaction'] or 0, 2),
            "avg_response_time": round(stats['avg_response_time'] or 0, 2),
            "near_misses": near_miss_stats['total_near_misses'] or 0,
            "missed_revenue": round(near_miss_stats['missed_revenue'] or 0, 2)
        },
        recommendations=recommendations,
        generated_at=datetime.now()
    )

# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    await create_tables()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        conn = await get_connection()
        conn.close()
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "insights-service",
        "version": "1.0.0",
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/insights/interactions")
async def track_interaction(interaction: CustomerInteraction):
    """Track a customer interaction"""
    conn = await get_connection()
    cur = conn.cursor()
    
    interaction_id = str(uuid.uuid4())
    
    cur.execute("""
        INSERT INTO customer_interactions (
            id, agent_id, customer_id, platform, interaction_type, conversation_id,
            session_start, session_end, message_count, total_tokens, response_time_avg,
            customer_satisfaction, conversion_stage, revenue_attributed, lead_quality,
            tags, metadata
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        interaction_id, interaction.agent_id, interaction.customer_id,
        interaction.platform.value, interaction.interaction_type.value,
        interaction.conversation_id, interaction.session_start, interaction.session_end,
        interaction.message_count, interaction.total_tokens, interaction.response_time_avg,
        interaction.customer_satisfaction, interaction.conversion_stage.value,
        interaction.revenue_attributed, interaction.lead_quality.value if interaction.lead_quality else None,
        interaction.tags, interaction.metadata
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"id": interaction_id, "message": "Interaction tracked successfully"}

@app.post("/api/insights/conversions")
async def track_conversion(conversion: ConversionEvent):
    """Track a conversion event"""
    conn = await get_connection()
    cur = conn.cursor()
    
    conversion_id = str(uuid.uuid4())
    
    cur.execute("""
        INSERT INTO conversion_events (
            id, interaction_id, agent_id, customer_id, event_type, event_value,
            currency, conversion_funnel_stage, attribution_data, occurred_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        conversion_id, conversion.interaction_id, conversion.agent_id,
        conversion.customer_id, conversion.event_type, conversion.event_value,
        conversion.currency, conversion.conversion_funnel_stage.value,
        conversion.attribution_data, conversion.occurred_at
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"id": conversion_id, "message": "Conversion tracked successfully"}

@app.post("/api/insights/leads")
async def capture_lead(lead: LeadCapture):
    """Capture a lead from interaction"""
    conn = await get_connection()
    cur = conn.cursor()
    
    lead_id = str(uuid.uuid4())
    
    cur.execute("""
        INSERT INTO lead_captures (
            id, interaction_id, agent_id, customer_id, lead_source, contact_info,
            lead_score, qualification_notes, follow_up_required, assigned_to, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        lead_id, lead.interaction_id, lead.agent_id, lead.customer_id,
        lead.lead_source.value, lead.contact_info, lead.lead_score,
        lead.qualification_notes, lead.follow_up_required, lead.assigned_to, lead.status
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"id": lead_id, "message": "Lead captured successfully"}

@app.post("/api/insights/near-misses")
async def track_near_miss(near_miss: NearMiss):
    """Track a near miss opportunity"""
    conn = await get_connection()
    cur = conn.cursor()
    
    near_miss_id = str(uuid.uuid4())
    
    cur.execute("""
        INSERT INTO near_misses (
            id, interaction_id, agent_id, customer_id, missed_opportunity_type,
            potential_value, failure_reason, recovery_suggestions, sentiment_score
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        near_miss_id, near_miss.interaction_id, near_miss.agent_id,
        near_miss.customer_id, near_miss.missed_opportunity_type,
        near_miss.potential_value, near_miss.failure_reason,
        near_miss.recovery_suggestions, near_miss.sentiment_score
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"id": near_miss_id, "message": "Near miss tracked successfully"}

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
    """Get interactions for an agent with filtering"""
    conn = await get_connection()
    cur = conn.cursor()
    
    where_conditions = ["agent_id = %s"]
    params = [agent_id]
    
    if platform:
        where_conditions.append("platform = %s")
        params.append(platform.value)
    
    where_clause = " AND ".join(where_conditions)
    
    cur.execute(f"""
        SELECT * FROM customer_interactions
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])
    
    interactions = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return [dict(interaction) for interaction in interactions]

@app.get("/api/insights/leads/{agent_id}")
async def get_agent_leads(
    agent_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get leads for an agent"""
    conn = await get_connection()
    cur = conn.cursor()
    
    where_conditions = ["lc.agent_id = %s"]
    params = [agent_id]
    
    if status:
        where_conditions.append("lc.status = %s")
        params.append(status)
    
    where_clause = " AND ".join(where_conditions)
    
    cur.execute(f"""
        SELECT lc.*, ci.platform, ci.session_start
        FROM lead_captures lc
        JOIN customer_interactions ci ON lc.interaction_id = ci.id
        WHERE {where_clause}
        ORDER BY lc.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])
    
    leads = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return [dict(lead) for lead in leads]

@app.get("/api/insights/dashboard/{agent_id}")
async def get_insights_dashboard(agent_id: str):
    """Get dashboard summary for insights"""
    period_start = datetime.now() - timedelta(days=30)
    period_end = datetime.now()
    
    # Get basic stats
    conversion_metrics = await calculate_conversion_rate(agent_id, None, period_start, period_end)
    
    conn = await get_connection()
    cur = conn.cursor()
    
    # Get recent activity
    cur.execute("""
        SELECT platform, COUNT(*) as count
        FROM customer_interactions
        WHERE agent_id = %s AND created_at >= %s
        GROUP BY platform
        ORDER BY count DESC
    """, (agent_id, period_start))
    
    platform_stats = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        "conversion_metrics": conversion_metrics,
        "platform_distribution": {row['platform']: row['count'] for row in platform_stats},
        "period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Insights Service on http://0.0.0.0:8007")
    uvicorn.run(app, host="0.0.0.0", port=8007, log_level="info")