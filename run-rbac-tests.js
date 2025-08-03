#!/usr/bin/env node

// Comprehensive RBAC Testing Script for AgentHub Platform
import { rbacTestSuite } from './server/test-rbac-comprehensive.js';

async function main() {
  try {
    console.log('🚀 Starting Comprehensive RBAC Testing Suite for AgentHub Platform');
    console.log('================================================================');
    
    await rbacTestSuite.runAllTests();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ RBAC Testing failed:', error);
    process.exit(1);
  }
}

main();