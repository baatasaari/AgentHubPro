#!/usr/bin/env python3
import os
import re
import glob

# Define replacement mappings for hardcoded values
replacements = {
    # URLs and domains
    r'https://healthcare-example\.com': '${process.env.BUSINESS_BASE_URL || "https://agenthub.com"}/demo/healthcare',
    r'https://shop-example\.com': '${process.env.BUSINESS_BASE_URL || "https://agenthub.com"}/demo/ecommerce', 
    r'https://realty-example\.com': '${process.env.BUSINESS_BASE_URL || "https://agenthub.com"}/demo/realestate',
    r'https://lawfirm-example\.com': '${process.env.BUSINESS_BASE_URL || "https://agenthub.com"}/demo/legal',
    r'http://localhost:5000': '${process.env.API_BASE_URL || "http://localhost:5000"}',
    r'localhost:5000': '${process.env.HOST || "localhost"}:${process.env.PORT || "5000"}',
    r'localhost:8006': '${process.env.MICROSERVICES_HOST || "localhost"}:8006',
    r'https://cdn\.agenthub\.com': '${process.env.WIDGET_CDN_URL || "https://cdn.agenthub.com"}',
    r'https://meet\.agenthub\.in': '${process.env.DOMAIN_MEET || "https://meet.agenthub.in"}',
    
    # Server ports and IPs
    r'"localhost:5432"': '"${process.env.DB_HOST || \'localhost\'}:${process.env.DB_PORT || \'5432\'}"',
    r'localhost:11211': '${process.env.CACHE_SERVERS || "localhost:11211"}',
    
    # Business domains
    r'"https://yoursite\.com/webhook"': '"${process.env.BUSINESS_BASE_URL || \'https://yourdomain.com\'}/webhook"',
    r'https://yourbusiness\.com': '${process.env.BUSINESS_BASE_URL || "https://yourdomain.com"}',
    r'https://example\.com/about': '${process.env.BUSINESS_BASE_URL || "https://yourdomain.com"}/about',
    
    # Cloud regions
    r'asia-south1': '${process.env.CLOUD_REGION || "asia-south1"}',
    
    # Email domains
    r'support@agenthub\.com': '${process.env.SUPPORT_EMAIL || "support@agenthub.com"}',
    r'noreply@agenthub\.com': '${process.env.FROM_EMAIL || "noreply@agenthub.com"}',
}

# Frontend specific replacements (import.meta.env)
frontend_replacements = {
    r'http://localhost:5000': '${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}',
    r'https://cdn\.agenthub\.com': '${import.meta.env.VITE_WIDGET_CDN_URL || "https://cdn.agenthub.com"}',
    r'https://yourdomain\.com': '${import.meta.env.VITE_BUSINESS_BASE_URL || "https://yourdomain.com"}',
}

def replace_in_file(filepath, replacement_dict):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply replacements
        for pattern, replacement in replacement_dict.items():
            content = re.sub(pattern, replacement, content)
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    print("🔧 Starting hardcoded value replacement...")
    
    # Process server files
    server_files = glob.glob('server/**/*.ts', recursive=True) + glob.glob('server/**/*.js', recursive=True)
    updated_server = 0
    for file in server_files:
        if replace_in_file(file, replacements):
            updated_server += 1
    
    # Process client files
    client_files = glob.glob('client/**/*.ts', recursive=True) + glob.glob('client/**/*.tsx', recursive=True)
    updated_client = 0
    for file in client_files:
        # Use frontend-specific replacements for client files
        if replace_in_file(file, frontend_replacements):
            updated_client += 1
    
    # Process infrastructure files
    infra_files = glob.glob('scripts/*.sh') + glob.glob('terraform/*.tf') + glob.glob('*.yml') + glob.glob('*.yaml')
    updated_infra = 0
    for file in infra_files:
        if replace_in_file(file, replacements):
            updated_infra += 1
    
    print(f"\n📊 REPLACEMENT SUMMARY:")
    print(f"   Server files updated: {updated_server}")
    print(f"   Client files updated: {updated_client}")  
    print(f"   Infrastructure files updated: {updated_infra}")
    print(f"   Total files updated: {updated_server + updated_client + updated_infra}")

if __name__ == "__main__":
    main()
