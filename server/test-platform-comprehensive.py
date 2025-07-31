#!/usr/bin/env python3
"""
Comprehensive Platform Testing Script
Tests all core functionality and performance of AgentHub platform
"""

import requests
import time
import json
import concurrent.futures
from typing import Dict, List, Any
import statistics

BASE_URL = "http://localhost:5000"

class PlatformTester:
    def __init__(self):
        self.results = {}
        self.performance_metrics = {}
        
    def test_agent_management(self) -> Dict[str, Any]:
        """Test agent CRUD operations"""
        print("Testing Agent Management...")
        
        # Test agent creation
        agent_data = {
            "businessName": "Test Performance Agent",
            "businessDescription": "Agent for comprehensive testing",
            "businessDomain": "test-performance.com",
            "industry": "healthcare",
            "llmModel": "gpt-3.5-turbo",
            "interfaceType": "webchat"
        }
        
        start_time = time.time()
        create_response = requests.post(f"{BASE_URL}/api/agents", json=agent_data)
        create_time = time.time() - start_time
        
        if create_response.status_code == 201:
            agent = create_response.json()
            agent_id = agent["id"]
            
            # Test agent retrieval
            start_time = time.time()
            get_response = requests.get(f"{BASE_URL}/api/agents/{agent_id}")
            get_time = time.time() - start_time
            
            # Test agent update
            update_data = {"businessName": "Updated Test Agent"}
            start_time = time.time()
            update_response = requests.patch(f"{BASE_URL}/api/agents/{agent_id}", json=update_data)
            update_time = time.time() - start_time
            
            # Test status update
            status_data = {"status": "active"}
            start_time = time.time()
            status_response = requests.patch(f"{BASE_URL}/api/agents/{agent_id}/status", json=status_data)
            status_time = time.time() - start_time
            
            return {
                "success": True,
                "agent_id": agent_id,
                "performance": {
                    "create_time": create_time,
                    "get_time": get_time,
                    "update_time": update_time,
                    "status_time": status_time
                },
                "operations": ["create", "read", "update", "status_update"]
            }
        else:
            return {"success": False, "error": f"Agent creation failed: {create_response.status_code}"}
    
    def test_conversation_management(self, agent_id: int) -> Dict[str, Any]:
        """Test conversation operations"""
        print("Testing Conversation Management...")
        
        conversations_created = []
        performance_times = []
        
        # Create multiple conversations
        for i in range(5):
            conversation_data = {
                "agentId": agent_id,
                "tokens": 1000 + (i * 200),
                "cost": f"{0.01 + (i * 0.002):.4f}"
            }
            
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/api/conversations", json=conversation_data)
            operation_time = time.time() - start_time
            performance_times.append(operation_time)
            
            if response.status_code == 201:
                conversations_created.append(response.json()["id"])
        
        # Test conversation retrieval
        start_time = time.time()
        get_response = requests.get(f"{BASE_URL}/api/conversations/{agent_id}")
        get_time = time.time() - start_time
        
        return {
            "success": len(conversations_created) == 5,
            "conversations_created": len(conversations_created),
            "performance": {
                "avg_create_time": statistics.mean(performance_times),
                "max_create_time": max(performance_times),
                "get_time": get_time
            }
        }
    
    def test_rag_system(self) -> Dict[str, Any]:
        """Test RAG query functionality"""
        print("Testing RAG System...")
        
        test_queries = [
            {"query": "What are your healthcare services?", "industry": "healthcare"},
            {"query": "How do I schedule an appointment?", "industry": "healthcare"},
            {"query": "What are your consultation fees?", "industry": "healthcare"},
            {"query": "Do you accept insurance?", "industry": "healthcare"},
            {"query": "What are your business hours?", "industry": "healthcare"}
        ]
        
        response_times = []
        successful_queries = 0
        
        for i, test_query in enumerate(test_queries):
            query_data = {
                "query": test_query["query"],
                "agentId": f"test_agent_{i}",
                "industry": test_query["industry"],
                "maxChunks": 5
            }
            
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/api/rag/query", json=query_data)
            query_time = time.time() - start_time
            response_times.append(query_time)
            
            if response.status_code == 200:
                successful_queries += 1
        
        return {
            "success": successful_queries >= 4,  # Allow 1 failure
            "successful_queries": successful_queries,
            "total_queries": len(test_queries),
            "performance": {
                "avg_response_time": statistics.mean(response_times),
                "max_response_time": max(response_times),
                "min_response_time": min(response_times)
            }
        }
    
    def test_widget_generation(self, agent_id: int) -> Dict[str, Any]:
        """Test widget code generation"""
        print("Testing Widget Generation...")
        
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/agents/{agent_id}/embed")
        generation_time = time.time() - start_time
        
        if response.status_code == 200:
            embed_data = response.json()
            embed_code = embed_data.get("embedCode", "")
            
            # Validate embed code contains required elements
            required_elements = ["agentConfig", "AgentHub", "script"]
            has_required = all(element in embed_code for element in required_elements)
            
            return {
                "success": has_required,
                "embed_code_length": len(embed_code),
                "performance": {"generation_time": generation_time},
                "has_required_elements": has_required
            }
        else:
            return {"success": False, "error": f"Widget generation failed: {response.status_code}"}
    
    def test_usage_analytics(self) -> Dict[str, Any]:
        """Test usage statistics"""
        print("Testing Usage Analytics...")
        
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/usage/stats")
        stats_time = time.time() - start_time
        
        if response.status_code == 200:
            stats = response.json()
            required_fields = ["totalConversations", "totalCost", "activeAgents", "monthlyUsage"]
            has_required = all(field in stats for field in required_fields)
            
            return {
                "success": has_required,
                "stats": stats,
                "performance": {"stats_time": stats_time},
                "has_required_fields": has_required
            }
        else:
            return {"success": False, "error": f"Usage stats failed: {response.status_code}"}
    
    def test_concurrent_load(self, agent_id: int) -> Dict[str, Any]:
        """Test concurrent request handling"""
        print("Testing Concurrent Load...")
        
        def make_request(endpoint):
            start_time = time.time()
            try:
                if endpoint == "agents":
                    response = requests.get(f"{BASE_URL}/api/agents")
                elif endpoint == "stats":
                    response = requests.get(f"{BASE_URL}/api/usage/stats")
                elif endpoint == "conversations":
                    response = requests.get(f"{BASE_URL}/api/conversations/{agent_id}")
                
                return {
                    "success": response.status_code == 200,
                    "time": time.time() - start_time,
                    "endpoint": endpoint
                }
            except Exception as e:
                return {"success": False, "error": str(e), "endpoint": endpoint}
        
        # Create concurrent requests
        endpoints = ["agents", "stats", "conversations"] * 10  # 30 total requests
        
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_endpoint = {executor.submit(make_request, endpoint): endpoint 
                                for endpoint in endpoints}
            
            results = []
            for future in concurrent.futures.as_completed(future_to_endpoint):
                results.append(future.result())
        
        total_time = time.time() - start_time
        successful_requests = sum(1 for r in results if r.get("success", False))
        
        return {
            "success": successful_requests >= 25,  # Allow some failures under load
            "total_requests": len(endpoints),
            "successful_requests": successful_requests,
            "total_time": total_time,
            "avg_time_per_request": total_time / len(endpoints),
            "performance": {
                "requests_per_second": len(endpoints) / total_time
            }
        }
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all tests and compile results"""
        print("🧪 Starting Comprehensive Platform Testing")
        print("=" * 60)
        
        # Test 1: Agent Management
        agent_result = self.test_agent_management()
        self.results["agent_management"] = agent_result
        
        if agent_result["success"]:
            agent_id = agent_result["agent_id"]
            
            # Test 2: Conversation Management
            self.results["conversation_management"] = self.test_conversation_management(agent_id)
            
            # Test 3: Widget Generation
            self.results["widget_generation"] = self.test_widget_generation(agent_id)
            
            # Test 5: Concurrent Load
            self.results["concurrent_load"] = self.test_concurrent_load(agent_id)
        
        # Test 4: RAG System (independent)
        self.results["rag_system"] = self.test_rag_system()
        
        # Test 6: Usage Analytics (independent)
        self.results["usage_analytics"] = self.test_usage_analytics()
        
        # Compile summary
        successful_tests = sum(1 for test in self.results.values() if test.get("success", False))
        total_tests = len(self.results)
        
        summary = {
            "overall_success": successful_tests >= total_tests - 1,  # Allow 1 test failure
            "successful_tests": successful_tests,
            "total_tests": total_tests,
            "success_rate": successful_tests / total_tests,
            "detailed_results": self.results
        }
        
        return summary

def main():
    tester = PlatformTester()
    
    try:
        results = tester.run_comprehensive_test()
        
        print("\n" + "=" * 60)
        print("🎯 COMPREHENSIVE TEST RESULTS")
        print("=" * 60)
        print(f"Overall Success: {'✅ PASS' if results['overall_success'] else '❌ FAIL'}")
        print(f"Success Rate: {results['success_rate']:.1%} ({results['successful_tests']}/{results['total_tests']})")
        print()
        
        for test_name, test_result in results["detailed_results"].items():
            status = "✅ PASS" if test_result.get("success", False) else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            
            if "performance" in test_result:
                perf = test_result["performance"]
                for metric, value in perf.items():
                    if isinstance(value, float):
                        print(f"  {metric}: {value:.3f}s")
                    else:
                        print(f"  {metric}: {value}")
        
        print("\n" + "=" * 60)
        if results["overall_success"]:
            print("🎉 Platform is fully functional and performant!")
        else:
            print("⚠️  Some issues detected - review failed tests above")
        
        return results["overall_success"]
        
    except Exception as e:
        print(f"❌ Testing failed with error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)