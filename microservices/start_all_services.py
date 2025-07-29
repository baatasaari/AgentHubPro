#!/usr/bin/env python3
"""
Start All Microservices
Launches all 6 microservices concurrently for testing
"""

import subprocess
import time
import os
import signal
import sys
from concurrent.futures import ThreadPoolExecutor

SERVICES = [
    {"name": "analytics", "path": "analytics-service", "port": 8002},
    {"name": "billing", "path": "billing-service", "port": 8003},
    {"name": "dashboard", "path": "dashboard-service", "port": 8004},
    {"name": "widget", "path": "widget-service", "port": 8005},
    {"name": "my-agents", "path": "my-agents-service", "port": 8006},
    {"name": "insights", "path": "insights-service", "port": 8007},
]

processes = []

def start_service(service):
    """Start a single microservice"""
    print(f"🚀 Starting {service['name']} service on port {service['port']}...")
    
    try:
        process = subprocess.Popen(
            ["python", "main.py"],
            cwd=service["path"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        processes.append((service, process))
        print(f"✅ {service['name']} service started (PID: {process.pid})")
        return process
    except Exception as e:
        print(f"❌ Failed to start {service['name']}: {e}")
        return None

def signal_handler(sig, frame):
    """Handle shutdown signal"""
    print("\n🛑 Shutting down all services...")
    for service, process in processes:
        if process.poll() is None:
            print(f"   Stopping {service['name']}...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
    sys.exit(0)

def main():
    """Main function"""
    print("=" * 60)
    print("🌟 STARTING ALL MICROSERVICES")
    print("=" * 60)
    
    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start all services
    with ThreadPoolExecutor(max_workers=len(SERVICES)) as executor:
        futures = [executor.submit(start_service, service) for service in SERVICES]
        
        # Wait for all to start
        for future in futures:
            future.result()
    
    print(f"\n🎉 All {len(SERVICES)} services started!")
    print("Services running on:")
    for service in SERVICES:
        print(f"   {service['name']:10s}: http://localhost:{service['port']}")
    
    print("\n💡 Press Ctrl+C to stop all services")
    print("🔧 Run tests with: python test_configuration_integration.py")
    
    # Keep running until interrupted
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    main()