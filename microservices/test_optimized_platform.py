#!/usr/bin/env python3
"""
Comprehensive test for optimized AgentHub microservices platform
Tests all 7 services for functionality, performance, and code quality
"""

import asyncio
import aiohttp
import time
import subprocess
import sys
import os
from typing import Dict, List, Optional

class OptimizedPlatformTester:
    def __init__(self):
        self.services = {
            'agent-wizard-service': {'port': 8001, 'process': None},
            'analytics-service': {'port': 8002, 'process': None},
            'billing-service': {'port': 8003, 'process': None},
            'dashboard-service': {'port': 8004, 'process': None},
            'widget-service': {'port': 8005, 'process': None},
            'my-agents-service': {'port': 8006, 'process': None},
            'insights-service': {'port': 8007, 'process': None}
        }
        self.results = {}

    async def start_services(self):
        """Start all microservices"""
        print("🚀 Starting optimized microservices...")
        
        for service_name, config in self.services.items():
            try:
                process = subprocess.Popen(
                    [sys.executable, f"{service_name}/main.py"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    cwd=os.getcwd()
                )
                config['process'] = process
                print(f"✓ Started {service_name} on port {config['port']}")
                await asyncio.sleep(0.5)  # Stagger startup
            except Exception as e:
                print(f"✗ Failed to start {service_name}: {e}")
        
        # Wait for all services to be ready
        print("⏳ Waiting for services to initialize...")
        await asyncio.sleep(5)

    async def test_health_endpoints(self):
        """Test health endpoints for all services"""
        print("\n🔍 Testing health endpoints...")
        
        async with aiohttp.ClientSession() as session:
            for service_name, config in self.services.items():
                try:
                    async with session.get(
                        f"http://localhost:{config['port']}/health", 
                        timeout=5
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            print(f"✓ {service_name}: {data.get('status', 'unknown')}")
                            self.results[service_name] = {
                                'health': 'healthy',
                                'response_time': None,
                                'data': data
                            }
                        else:
                            print(f"✗ {service_name}: HTTP {response.status}")
                            self.results[service_name] = {'health': 'unhealthy'}
                except Exception as e:
                    print(f"✗ {service_name}: {str(e)}")
                    self.results[service_name] = {'health': 'error', 'error': str(e)}

    async def test_api_endpoints(self):
        """Test key API endpoints for functionality"""
        print("\n🧪 Testing API functionality...")
        
        async with aiohttp.ClientSession() as session:
            # Test agent-wizard service
            try:
                async with session.get("http://localhost:8001/api/agents") as response:
                    if response.status == 200:
                        agents = await response.json()
                        print(f"✓ Agent Wizard: Retrieved {len(agents)} agents")
                    else:
                        print(f"✗ Agent Wizard: HTTP {response.status}")
            except Exception as e:
                print(f"✗ Agent Wizard API: {e}")

            # Test analytics service
            try:
                async with session.get("http://localhost:8002/api/analytics/summary") as response:
                    if response.status == 200:
                        summary = await response.json()
                        print(f"✓ Analytics: Platform stats retrieved")
                    else:
                        print(f"✗ Analytics: HTTP {response.status}")
            except Exception as e:
                print(f"✗ Analytics API: {e}")

            # Test billing service
            try:
                async with session.get("http://localhost:8003/api/billing/summary") as response:
                    if response.status == 200:
                        billing = await response.json()
                        print(f"✓ Billing: Summary retrieved")
                    else:
                        print(f"✗ Billing: HTTP {response.status}")
            except Exception as e:
                print(f"✗ Billing API: {e}")

            # Test widget service
            try:
                async with session.get("http://localhost:8005/api/widgets") as response:
                    if response.status == 200:
                        widgets = await response.json()
                        print(f"✓ Widget: Retrieved {len(widgets)} widgets")
                    else:
                        print(f"✗ Widget: HTTP {response.status}")
            except Exception as e:
                print(f"✗ Widget API: {e}")

            # Test my-agents service
            try:
                async with session.get("http://localhost:8006/api/agents") as response:
                    if response.status == 200:
                        agents = await response.json()
                        print(f"✓ My Agents: Retrieved {len(agents)} agents")
                    else:
                        print(f"✗ My Agents: HTTP {response.status}")
            except Exception as e:
                print(f"✗ My Agents API: {e}")

            # Test insights service
            try:
                async with session.get("http://localhost:8007/api/insights/interactions") as response:
                    if response.status == 200:
                        interactions = await response.json()
                        print(f"✓ Insights: Retrieved {len(interactions)} interactions")
                    else:
                        print(f"✗ Insights: HTTP {response.status}")
            except Exception as e:
                print(f"✗ Insights API: {e}")

    async def performance_test(self):
        """Test response times and concurrent requests"""
        print("\n⚡ Performance testing...")
        
        async with aiohttp.ClientSession() as session:
            # Test response times
            for service_name, config in self.services.items():
                try:
                    start_time = time.time()
                    async with session.get(
                        f"http://localhost:{config['port']}/health",
                        timeout=5
                    ) as response:
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        if service_name in self.results:
                            self.results[service_name]['response_time'] = response_time
                        print(f"⏱️  {service_name}: {response_time:.2f}ms")
                except Exception as e:
                    print(f"⏱️  {service_name}: timeout")

    def analyze_code_quality(self):
        """Analyze code quality and optimization metrics"""
        print("\n📊 Code quality analysis...")
        
        total_lines = 0
        service_metrics = {}
        
        for service_name in self.services.keys():
            main_file = f"{service_name}/main.py"
            try:
                with open(main_file, 'r') as f:
                    lines = len(f.readlines())
                total_lines += lines
                service_metrics[service_name] = lines
                
                # Calculate efficiency score (lower lines = higher efficiency)
                if lines < 200:
                    efficiency = "Excellent"
                elif lines < 300:
                    efficiency = "Good"
                elif lines < 400:
                    efficiency = "Fair"
                else:
                    efficiency = "Needs optimization"
                
                print(f"📏 {service_name}: {lines} lines ({efficiency})")
                
            except Exception as e:
                print(f"📏 {service_name}: Could not analyze ({e})")
        
        print(f"\n📈 Total optimized codebase: {total_lines} lines")
        print(f"📈 Average per service: {total_lines / len(self.services):.1f} lines")
        
        # Compare with typical microservice sizes
        if total_lines < 4000:
            print("🎯 Optimization Level: EXCELLENT - Highly efficient codebase")
        elif total_lines < 6000:
            print("🎯 Optimization Level: GOOD - Well-optimized")
        elif total_lines < 8000:
            print("🎯 Optimization Level: FAIR - Some optimization possible")
        else:
            print("🎯 Optimization Level: POOR - Needs significant optimization")

    def cleanup(self):
        """Stop all services"""
        print("\n🧹 Cleaning up services...")
        for service_name, config in self.services.items():
            if config['process']:
                try:
                    config['process'].terminate()
                    config['process'].wait(timeout=5)
                    print(f"✓ Stopped {service_name}")
                except:
                    try:
                        config['process'].kill()
                        print(f"⚠️  Force killed {service_name}")
                    except:
                        print(f"✗ Could not stop {service_name}")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("🎯 OPTIMIZED PLATFORM TEST SUMMARY")
        print("="*60)
        
        healthy_services = sum(1 for result in self.results.values() 
                             if result.get('health') == 'healthy')
        
        print(f"Services Health: {healthy_services}/{len(self.services)} healthy")
        
        avg_response_time = None
        response_times = [result.get('response_time') for result in self.results.values() 
                         if result.get('response_time')]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            print(f"Average Response Time: {avg_response_time:.2f}ms")
        
        if healthy_services == len(self.services):
            print("🎉 ALL SERVICES OPERATIONAL - Platform optimization successful!")
        elif healthy_services >= len(self.services) * 0.8:
            print("⚠️  Most services operational - Minor issues detected")
        else:
            print("❌ Multiple service failures - Investigation required")

async def main():
    tester = OptimizedPlatformTester()
    
    try:
        await tester.start_services()
        await tester.test_health_endpoints()
        await tester.test_api_endpoints()
        await tester.performance_test()
        tester.analyze_code_quality()
        tester.print_summary()
        
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
    finally:
        tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())