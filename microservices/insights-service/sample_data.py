#!/usr/bin/env python3
"""
Sample data generator for Insights Service
Creates realistic customer interaction data for testing and demonstration
"""

import asyncio
import httpx
import random
import json
from datetime import datetime, timedelta
from typing import List

INSIGHTS_SERVICE_URL = "http://localhost:8007"

# Sample data generators
def generate_customer_interactions(num_interactions: int = 50) -> List[dict]:
    """Generate sample customer interactions across multiple platforms"""
    
    platforms = ["whatsapp", "instagram", "webchat", "facebook"]
    interaction_types = ["sales", "support", "inquiry", "booking", "complaint"]
    conversion_stages = ["awareness", "interest", "consideration", "intent", "purchase"]
    lead_qualities = ["hot", "warm", "cold", "qualified"]
    industries = ["healthcare", "retail", "finance", "real-estate", "education"]
    
    interactions = []
    
    for i in range(num_interactions):
        # Generate realistic timestamps over last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        session_start = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        session_duration = random.randint(2, 45)  # 2-45 minutes
        session_end = session_start + timedelta(minutes=session_duration)
        
        platform = random.choice(platforms)
        interaction_type = random.choice(interaction_types)
        
        # Generate realistic metrics based on platform and type
        if platform == "whatsapp":
            message_count = random.randint(3, 25)
            tokens = message_count * random.randint(15, 40)
            response_time = random.uniform(1.5, 8.0)
        elif platform == "instagram":
            message_count = random.randint(2, 15)
            tokens = message_count * random.randint(10, 30)
            response_time = random.uniform(2.0, 12.0)
        else:  # webchat, facebook
            message_count = random.randint(4, 20)
            tokens = message_count * random.randint(20, 50)
            response_time = random.uniform(1.0, 6.0)
        
        # Revenue attribution varies by interaction type
        if interaction_type == "sales":
            revenue = random.uniform(50, 2000)
        elif interaction_type == "booking":
            revenue = random.uniform(100, 500)
        elif interaction_type == "inquiry":
            revenue = random.uniform(0, 300)
        else:
            revenue = random.uniform(0, 100)
        
        # Customer satisfaction varies by platform and outcome
        satisfaction = random.uniform(3.5, 5.0) if revenue > 0 else random.uniform(2.5, 4.5)
        
        interaction = {
            "agent_id": f"agent-{random.choice(industries)}-{random.randint(1, 3)}",
            "customer_id": f"customer-{i + 1000}",
            "platform": platform,
            "interaction_type": interaction_type,
            "conversation_id": f"conv-{platform}-{i + 1000}",
            "session_start": session_start.isoformat(),
            "session_end": session_end.isoformat(),
            "message_count": message_count,
            "total_tokens": tokens,
            "response_time_avg": round(response_time, 2),
            "customer_satisfaction": round(satisfaction, 1),
            "conversion_stage": random.choice(conversion_stages),
            "revenue_attributed": round(revenue, 2),
            "lead_quality": random.choice(lead_qualities) if revenue > 0 else None,
            "tags": random.sample(["high-intent", "price-sensitive", "repeat-customer", "new-lead", "qualified"], k=random.randint(1, 3)),
            "metadata": {
                "source_campaign": random.choice(["google-ads", "facebook-ads", "instagram-story", "organic", "referral"]),
                "device_type": random.choice(["mobile", "desktop", "tablet"]),
                "customer_segment": random.choice(["premium", "standard", "budget"]),
                "lead_quality": random.choice(lead_qualities) if revenue > 0 else None
            }
        }
        
        interactions.append(interaction)
    
    return interactions

def generate_conversion_events(interaction_ids: List[str]) -> List[dict]:
    """Generate conversion events for successful interactions"""
    
    event_types = ["purchase", "signup", "download", "booking", "subscription", "quote_request"]
    conversion_stages = ["purchase", "intent", "evaluation"]
    currencies = ["USD", "EUR", "GBP"]
    
    conversions = []
    
    # Generate conversions for about 30% of interactions
    num_conversions = min(len(interaction_ids), int(len(interaction_ids) * 0.3))
    selected_interactions = random.sample(interaction_ids, num_conversions)
    
    for interaction_id in selected_interactions:
        event_type = random.choice(event_types)
        
        # Event value varies by type
        if event_type == "purchase":
            value = random.uniform(100, 2500)
        elif event_type == "subscription":
            value = random.uniform(29, 299)
        elif event_type == "booking":
            value = random.uniform(150, 800)
        else:
            value = random.uniform(0, 100)
        
        conversion = {
            "interaction_id": interaction_id,
            "agent_id": f"agent-demo-{random.randint(1, 5)}",
            "customer_id": f"customer-{random.randint(1000, 2000)}",
            "event_type": event_type,
            "event_value": round(value, 2),
            "currency": random.choice(currencies),
            "conversion_funnel_stage": random.choice(conversion_stages),
            "attribution_data": {
                "touchpoints": random.sample(["whatsapp", "website", "instagram", "email"], k=random.randint(1, 3)),
                "campaign_id": f"campaign-{random.randint(100, 999)}",
                "attribution_model": "last_click"
            },
            "occurred_at": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat()
        }
        
        conversions.append(conversion)
    
    return conversions

def generate_lead_captures(interaction_ids: List[str]) -> List[dict]:
    """Generate lead captures for qualified interactions"""
    
    lead_sources = ["whatsapp", "instagram", "webchat", "facebook"]
    lead_statuses = ["new", "contacted", "qualified", "nurturing", "converted"]
    
    leads = []
    
    # Generate leads for about 40% of interactions
    num_leads = min(len(interaction_ids), int(len(interaction_ids) * 0.4))
    selected_interactions = random.sample(interaction_ids, num_leads)
    
    for i, interaction_id in enumerate(selected_interactions):
        lead_score = random.randint(45, 95)
        
        # Higher scores get better qualification
        if lead_score >= 80:
            status = random.choice(["qualified", "converted"])
            follow_up = False
        elif lead_score >= 65:
            status = random.choice(["contacted", "qualified"])
            follow_up = True
        else:
            status = "new"
            follow_up = True
        
        lead = {
            "interaction_id": interaction_id,
            "agent_id": f"agent-demo-{random.randint(1, 5)}",
            "customer_id": f"customer-{random.randint(1000, 2000)}",
            "lead_source": random.choice(lead_sources),
            "contact_info": {
                "email": f"lead{i+1}@example.com",
                "phone": f"+1{random.randint(2000000000, 9999999999)}",
                "name": f"Lead Customer {i+1}",
                "company": f"Company {chr(65 + i % 26)}{random.randint(1, 999)}"
            },
            "lead_score": lead_score,
            "qualification_notes": random.choice([
                "High budget confirmed, decision maker identified",
                "Interested in premium features, timeline unclear",
                "Price sensitive but high engagement",
                "Technical requirements match our solution",
                "Follow-up needed to confirm budget"
            ]),
            "follow_up_required": follow_up,
            "assigned_to": f"sales-rep-{random.randint(1, 5)}",
            "status": status
        }
        
        leads.append(lead)
    
    return leads

async def populate_sample_data():
    """Populate the Insights Service with comprehensive sample data"""
    
    print("=== POPULATING INSIGHTS SERVICE WITH SAMPLE DATA ===")
    print(f"Started at: {datetime.now()}")
    
    # Check service health first
    async with httpx.AsyncClient() as client:
        try:
            health_response = await client.get(f"{INSIGHTS_SERVICE_URL}/health", timeout=10.0)
            if health_response.status_code != 200:
                print("❌ Insights Service not healthy, cannot populate data")
                return False
                
            print("✓ Insights Service is healthy")
            
        except Exception as e:
            print(f"❌ Cannot connect to Insights Service: {e}")
            return False
    
    # Generate and insert interactions
    print("\n1. Generating customer interactions...")
    interactions = generate_customer_interactions(75)  # Generate 75 interactions
    interaction_ids = []
    
    async with httpx.AsyncClient() as client:
        for i, interaction in enumerate(interactions):
            try:
                response = await client.post(
                    f"{INSIGHTS_SERVICE_URL}/api/insights/interactions",
                    json=interaction,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    interaction_ids.append(result["id"])
                    
                    if (i + 1) % 10 == 0:
                        print(f"  ✓ Created {i + 1} interactions")
                        
            except Exception as e:
                print(f"  ✗ Failed to create interaction {i + 1}: {e}")
    
    print(f"✓ Created {len(interaction_ids)} customer interactions")
    
    # Generate and insert conversions
    print("\n2. Generating conversion events...")
    conversions = generate_conversion_events(interaction_ids)
    conversion_count = 0
    
    async with httpx.AsyncClient() as client:
        for conversion in conversions:
            try:
                response = await client.post(
                    f"{INSIGHTS_SERVICE_URL}/api/insights/conversions",
                    json=conversion,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    conversion_count += 1
                    
            except Exception as e:
                print(f"  ✗ Failed to create conversion: {e}")
    
    print(f"✓ Created {conversion_count} conversion events")
    
    # Generate and insert leads
    print("\n3. Generating lead captures...")
    leads = generate_lead_captures(interaction_ids)
    lead_count = 0
    
    async with httpx.AsyncClient() as client:
        for lead in leads:
            try:
                response = await client.post(
                    f"{INSIGHTS_SERVICE_URL}/api/insights/leads",
                    json=lead,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    lead_count += 1
                    
            except Exception as e:
                print(f"  ✗ Failed to create lead: {e}")
    
    print(f"✓ Created {lead_count} lead captures")
    
    # Test analytics endpoints
    print("\n4. Testing analytics capabilities...")
    
    async with httpx.AsyncClient() as client:
        # Test conversion rates
        try:
            response = await client.get(
                f"{INSIGHTS_SERVICE_URL}/api/insights/conversion-rates/agent-retail-1",
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Conversion rate for retail agent: {data['conversion_rate']}%")
            
        except Exception as e:
            print(f"✗ Conversion rate test failed: {e}")
        
        # Test insights report
        try:
            response = await client.get(
                f"{INSIGHTS_SERVICE_URL}/api/insights/reports/agent-healthcare-1",
                timeout=15.0
            )
            
            if response.status_code == 200:
                report = response.json()
                print(f"✓ Generated insights report with {len(report['recommendations'])} recommendations")
            
        except Exception as e:
            print(f"✗ Insights report test failed: {e}")
    
    print("\n=== SAMPLE DATA POPULATION COMPLETE ===")
    print(f"Summary:")
    print(f"  - Customer Interactions: {len(interaction_ids)}")
    print(f"  - Conversion Events: {conversion_count}")
    print(f"  - Lead Captures: {lead_count}")
    print(f"  - Multiple platforms: WhatsApp, Instagram, Web Chat")
    print(f"  - Time range: Last 30 days")
    print(f"Completed at: {datetime.now()}")
    
    return True

if __name__ == "__main__":
    result = asyncio.run(populate_sample_data())
    exit(0 if result else 1)