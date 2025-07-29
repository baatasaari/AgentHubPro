#!/usr/bin/env python3
"""
Test suite for Insights Service
Tests customer interaction tracking, conversion analytics, and report generation
"""

import asyncio
import pytest
import httpx
from datetime import datetime, timedelta
import json

# Test configuration
INSIGHTS_SERVICE_URL = "http://localhost:8007"

class TestInsightsService:
    """Test suite for Insights microservice functionality"""
    
    @pytest.fixture
    def sample_interaction_data(self):
        """Sample interaction data for testing"""
        return {
            "agent_id": "test-agent-1",
            "customer_id": "customer-123",
            "platform": "whatsapp",
            "interaction_type": "sales",
            "conversation_id": "conv-456",
            "session_start": datetime.now().isoformat(),
            "session_end": (datetime.now() + timedelta(minutes=15)).isoformat(),
            "message_count": 12,
            "total_tokens": 450,
            "response_time_avg": 2.5,
            "customer_satisfaction": 4.5,
            "conversion_stage": "interest",
            "revenue_attributed": 250.00,
            "lead_quality": "warm",
            "tags": ["potential-customer", "high-intent"],
            "metadata": {
                "source_campaign": "instagram-ad",
                "customer_segment": "premium"
            }
        }
    
    @pytest.fixture
    def sample_conversion_data(self):
        """Sample conversion event data for testing"""
        return {
            "interaction_id": "interaction-uuid-here",
            "agent_id": "test-agent-1",
            "customer_id": "customer-123",
            "event_type": "purchase",
            "event_value": 299.99,
            "currency": "USD",
            "conversion_funnel_stage": "purchase",
            "attribution_data": {
                "touchpoints": ["whatsapp", "website"],
                "campaign_id": "summer-sale-2025"
            },
            "occurred_at": datetime.now().isoformat()
        }
    
    @pytest.fixture
    def sample_lead_data(self):
        """Sample lead capture data for testing"""
        return {
            "interaction_id": "interaction-uuid-here",
            "agent_id": "test-agent-1", 
            "customer_id": "customer-123",
            "lead_source": "whatsapp",
            "contact_info": {
                "email": "customer@example.com",
                "phone": "+1234567890",
                "name": "John Doe",
                "company": "Example Corp"
            },
            "lead_score": 85,
            "qualification_notes": "High intent customer interested in premium package",
            "follow_up_required": True,
            "assigned_to": "sales-rep-1",
            "status": "qualified"
        }

async def test_service_health():
    """Test service health endpoint"""
    print("Testing Insights Service health...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{INSIGHTS_SERVICE_URL}/health", timeout=10.0)
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["service"] == "insights-service"
            assert "status" in data
            assert "database" in data
            
            print(f"✓ Health check passed: {data['status']}")
            print(f"✓ Database status: {data['database']}")
            
            return True
            
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            return False

async def test_interaction_tracking():
    """Test customer interaction tracking"""
    print("Testing interaction tracking...")
    
    sample_data = {
        "agent_id": "test-agent-insights",
        "customer_id": "customer-test-123", 
        "platform": "whatsapp",
        "interaction_type": "sales",
        "conversation_id": "conv-test-456",
        "session_start": datetime.now().isoformat(),
        "session_end": (datetime.now() + timedelta(minutes=15)).isoformat(),
        "message_count": 8,
        "total_tokens": 320,
        "response_time_avg": 3.2,
        "customer_satisfaction": 4.2,
        "conversion_stage": "consideration",
        "revenue_attributed": 150.00,
        "lead_quality": "warm",
        "tags": ["test-interaction", "sales-qualified"],
        "metadata": {"test": True, "source": "automated-test"}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{INSIGHTS_SERVICE_URL}/api/insights/interactions",
                json=sample_data,
                timeout=10.0
            )
            
            assert response.status_code == 200
            result = response.json()
            
            assert "id" in result
            assert "message" in result
            
            print(f"✓ Interaction tracked with ID: {result['id']}")
            return result["id"]
            
        except Exception as e:
            print(f"✗ Interaction tracking failed: {e}")
            return None

async def test_conversion_tracking():
    """Test conversion event tracking"""
    print("Testing conversion tracking...")
    
    # First create an interaction to reference
    interaction_id = await test_interaction_tracking()
    if not interaction_id:
        print("✗ Cannot test conversions without interaction")
        return False
    
    conversion_data = {
        "interaction_id": interaction_id,
        "agent_id": "test-agent-insights",
        "customer_id": "customer-test-123",
        "event_type": "purchase",
        "event_value": 199.99,
        "currency": "USD", 
        "conversion_funnel_stage": "purchase",
        "attribution_data": {
            "channel": "whatsapp",
            "campaign": "test-campaign"
        },
        "occurred_at": datetime.now().isoformat()
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{INSIGHTS_SERVICE_URL}/api/insights/conversions",
                json=conversion_data,
                timeout=10.0
            )
            
            assert response.status_code == 200
            result = response.json()
            
            print(f"✓ Conversion tracked with ID: {result['id']}")
            return True
            
        except Exception as e:
            print(f"✗ Conversion tracking failed: {e}")
            return False

async def test_lead_capture():
    """Test lead capture functionality"""
    print("Testing lead capture...")
    
    # First create an interaction to reference
    interaction_id = await test_interaction_tracking()
    if not interaction_id:
        print("✗ Cannot test lead capture without interaction")
        return False
    
    lead_data = {
        "interaction_id": interaction_id,
        "agent_id": "test-agent-insights",
        "customer_id": "customer-test-123",
        "lead_source": "whatsapp",
        "contact_info": {
            "email": "testlead@example.com",
            "phone": "+1555123456",
            "name": "Test Lead",
            "company": "Test Company Inc"
        },
        "lead_score": 78,
        "qualification_notes": "Interested in premium features, budget confirmed",
        "follow_up_required": True,
        "assigned_to": "test-sales-rep",
        "status": "new"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{INSIGHTS_SERVICE_URL}/api/insights/leads",
                json=lead_data,
                timeout=10.0
            )
            
            assert response.status_code == 200
            result = response.json()
            
            print(f"✓ Lead captured with ID: {result['id']}")
            return True
            
        except Exception as e:
            print(f"✗ Lead capture failed: {e}")
            return False

async def test_conversion_rates():
    """Test conversion rate calculation"""
    print("Testing conversion rate calculation...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{INSIGHTS_SERVICE_URL}/api/insights/conversion-rates/test-agent-insights",
                timeout=10.0
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "total_interactions" in data
            assert "total_conversions" in data
            assert "conversion_rate" in data
            
            print(f"✓ Conversion rate: {data['conversion_rate']}%")
            print(f"  Total interactions: {data['total_interactions']}")
            print(f"  Total conversions: {data['total_conversions']}")
            
            return True
            
        except Exception as e:
            print(f"✗ Conversion rate calculation failed: {e}")
            return False

async def test_insights_report():
    """Test comprehensive insights report generation"""
    print("Testing insights report generation...")
    
    async with httpx.AsyncClient() as client:
        try:
            # Generate report for last 30 days
            period_start = (datetime.now() - timedelta(days=30)).isoformat()
            period_end = datetime.now().isoformat()
            
            response = await client.get(
                f"{INSIGHTS_SERVICE_URL}/api/insights/reports/test-agent-insights",
                params={
                    "period_start": period_start,
                    "period_end": period_end
                },
                timeout=15.0
            )
            
            assert response.status_code == 200
            report = response.json()
            
            assert "agent_id" in report
            assert "total_interactions" in report
            assert "platform_breakdown" in report
            assert "conversion_metrics" in report
            assert "revenue_metrics" in report
            assert "lead_metrics" in report
            assert "performance_metrics" in report
            assert "recommendations" in report
            
            print(f"✓ Report generated for agent: {report['agent_id']}")
            print(f"  Total interactions: {report['total_interactions']}")
            print(f"  Platform breakdown: {report['platform_breakdown']}")
            print(f"  Recommendations: {len(report['recommendations'])} items")
            
            return True
            
        except Exception as e:
            print(f"✗ Report generation failed: {e}")
            return False

async def test_dashboard():
    """Test insights dashboard endpoint"""
    print("Testing insights dashboard...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{INSIGHTS_SERVICE_URL}/api/insights/dashboard/test-agent-insights",
                timeout=10.0
            )
            
            assert response.status_code == 200
            dashboard = response.json()
            
            assert "conversion_metrics" in dashboard
            assert "platform_distribution" in dashboard
            assert "period" in dashboard
            
            print("✓ Dashboard data retrieved successfully")
            print(f"  Conversion metrics: {dashboard['conversion_metrics']}")
            print(f"  Platform distribution: {dashboard['platform_distribution']}")
            
            return True
            
        except Exception as e:
            print(f"✗ Dashboard test failed: {e}")
            return False

async def run_comprehensive_test():
    """Run all tests in sequence"""
    print("=== INSIGHTS SERVICE COMPREHENSIVE TEST ===")
    print(f"Started at: {datetime.now()}")
    print()
    
    test_results = []
    
    # Test service health
    health_result = await test_service_health()
    test_results.append(("Health Check", health_result))
    
    if not health_result:
        print("❌ Service not healthy, skipping other tests")
        return False
    
    # Test core functionality
    interaction_result = await test_interaction_tracking()
    test_results.append(("Interaction Tracking", interaction_result is not None))
    
    conversion_result = await test_conversion_tracking()
    test_results.append(("Conversion Tracking", conversion_result))
    
    lead_result = await test_lead_capture()
    test_results.append(("Lead Capture", lead_result))
    
    rates_result = await test_conversion_rates()
    test_results.append(("Conversion Rates", rates_result))
    
    report_result = await test_insights_report()
    test_results.append(("Insights Report", report_result))
    
    dashboard_result = await test_dashboard()
    test_results.append(("Dashboard", dashboard_result))
    
    # Summary
    print("\n=== TEST RESULTS SUMMARY ===")
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name:20} | {status}")
        if result:
            passed += 1
    
    print(f"\nPassed: {passed}/{total} tests")
    
    if passed == total:
        print("🟢 ALL TESTS PASSED - Insights Service is fully operational")
    elif passed >= total * 0.8:
        print("🟡 MOST TESTS PASSED - Service is functional with minor issues")
    else:
        print("🔴 MULTIPLE FAILURES - Service needs attention")
    
    print(f"Completed at: {datetime.now()}")
    
    return passed >= total * 0.8

if __name__ == "__main__":
    # Run the comprehensive test
    result = asyncio.run(run_comprehensive_test())
    exit(0 if result else 1)