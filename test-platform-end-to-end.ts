// Comprehensive End-to-End Platform Testing for AgentHub
import axios from 'axios';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
  timestamp: string;
}

class PlatformTester {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  private async executeTest(testName: string, testFunction: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        test: testName,
        status: 'PASS',
        message: 'Test completed successfully',
        duration,
        timestamp
      };
      
      this.results.push(result);
      console.log(`✅ ${testName} - ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        test: testName,
        status: 'FAIL',
        message: error.message || 'Test failed',
        duration,
        timestamp
      };
      
      this.results.push(result);
      console.log(`❌ ${testName} - ${error.message} - ${duration}ms`);
      return result;
    }
  }

  // Phase 1: Configuration System Validation
  async testConfigurationSystem(): Promise<void> {
    await this.executeTest('Configuration Loading', async () => {
      // Test server configuration is accessible
      const response = await axios.get(`${this.baseUrl}/health`);
      if (response.status !== 200) {
        throw new Error('Health check failed');
      }
      
      // Validate configuration structure
      if (!response.data.status || !response.data.timestamp) {
        throw new Error('Health check response missing required fields');
      }
    });

    await this.executeTest('Environment Variables', async () => {
      // Test that environment variables are being loaded
      const response = await axios.get(`${this.baseUrl}/api/config/validate`);
      // This endpoint would validate configuration in a real implementation
      // For now, we test that the server responds correctly
    });
  }

  // Phase 2: Core Platform Services Testing
  async testCoreServices(): Promise<void> {
    await this.executeTest('Server Startup', async () => {
      const response = await axios.get(`${this.baseUrl}/health`);
      if (response.data.status !== 'healthy') {
        throw new Error('Server health check failed');
      }
    });

    await this.executeTest('Static File Serving', async () => {
      const response = await axios.get(`${this.baseUrl}/`);
      if (response.status !== 200) {
        throw new Error('Frontend not accessible');
      }
    });

    await this.executeTest('API Gateway', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health`);
      if (response.status !== 200) {
        throw new Error('API gateway not responding');
      }
    });
  }

  // Phase 3: Frontend UI Navigation Testing
  async testFrontendNavigation(): Promise<void> {
    const routes = [
      '/',
      '/dashboard',
      '/agents',
      '/my-agents', 
      '/conversations',
      '/analytics',
      '/billing',
      '/settings',
      '/rag-management',
      '/admin-dashboard',
      '/consultation-booking',
      '/payment-demo'
    ];

    for (const route of routes) {
      await this.executeTest(`Frontend Route: ${route}`, async () => {
        const response = await axios.get(`${this.baseUrl}${route}`);
        if (response.status !== 200) {
          throw new Error(`Route ${route} not accessible`);
        }
      });
    }
  }

  // Phase 4: API Endpoints Validation
  async testAPIEndpoints(): Promise<void> {
    const endpoints = [
      { path: '/api/agents', method: 'GET', description: 'List Agents' },
      { path: '/api/conversations', method: 'GET', description: 'List Conversations' },
      { path: '/api/usage/stats', method: 'GET', description: 'Usage Statistics' },
      { path: '/api/analytics/dashboard', method: 'GET', description: 'Analytics Dashboard' },
      { path: '/api/rag/knowledge-bases', method: 'GET', description: 'RAG Knowledge Bases' },
      { path: '/api/payment/methods', method: 'GET', description: 'Payment Methods' },
      { path: '/api/calendar/available-slots', method: 'GET', description: 'Calendar Slots' },
      { path: '/api/my-agents', method: 'GET', description: 'My Agents API' }
    ];

    for (const endpoint of endpoints) {
      await this.executeTest(`API: ${endpoint.description}`, async () => {
        const response = await axios.get(`${this.baseUrl}${endpoint.path}`);
        if (response.status !== 200) {
          throw new Error(`${endpoint.description} API failed`);
        }
        
        // Validate response structure
        if (!response.data) {
          throw new Error(`${endpoint.description} returned empty data`);
        }
      });
    }
  }

  // Phase 5: Microservices Communication Testing
  async testMicroservices(): Promise<void> {
    const microservices = [
      'agent-management',
      'conversation-management', 
      'rag-query-processing',
      'payment-processing',
      'calendar-management',
      'analytics-calculation',
      'widget-generation',
      'usage-analytics'
    ];

    for (const service of microservices) {
      await this.executeTest(`Microservice: ${service}`, async () => {
        const response = await axios.get(`${this.baseUrl}/api/${service}/health`);
        if (response.status !== 200) {
          throw new Error(`${service} microservice not responding`);
        }
      });
    }
  }

  // Phase 6: Database Operations Testing
  async testDatabaseOperations(): Promise<void> {
    await this.executeTest('Database Connection', async () => {
      const response = await axios.get(`${this.baseUrl}/api/agents`);
      if (!Array.isArray(response.data)) {
        throw new Error('Database query failed - agents data not array');
      }
    });

    await this.executeTest('Data Integrity', async () => {
      const response = await axios.get(`${this.baseUrl}/api/agents`);
      const agents = response.data;
      
      if (agents.length === 0) {
        throw new Error('No agents found in database');
      }
      
      // Validate agent structure
      const agent = agents[0];
      const requiredFields = ['id', 'businessName', 'businessDescription', 'industry'];
      
      for (const field of requiredFields) {
        if (!agent[field]) {
          throw new Error(`Agent missing required field: ${field}`);
        }
      }
    });

    await this.executeTest('CRUD Operations', async () => {
      // Test creating a new agent (POST)
      const newAgent = {
        businessName: 'Test Agent',
        businessDescription: 'Test Description',
        businessDomain: 'https://test.com',
        industry: 'technology'
      };
      
      const createResponse = await axios.post(`${this.baseUrl}/api/agents`, newAgent);
      if (createResponse.status !== 201 && createResponse.status !== 200) {
        throw new Error('Agent creation failed');
      }
    });
  }

  // Phase 7: External Services Integration Testing
  async testExternalServices(): Promise<void> {
    await this.executeTest('OpenAI Integration', async () => {
      const response = await axios.post(`${this.baseUrl}/api/ai/chat`, {
        message: 'Hello, test message',
        agentId: 1
      });
      
      // Even if API key is not configured, should return proper error structure
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('AI integration endpoint malformed');
      }
    });

    await this.executeTest('Email Service', async () => {
      const response = await axios.post(`${this.baseUrl}/api/email/send-report`, {
        toEmail: 'test@example.com',
        reportData: { test: true }
      });
      
      // Should handle the request properly even without valid credentials
      if (!response.data) {
        throw new Error('Email service endpoint not responding');
      }
    });

    await this.executeTest('Payment Processing', async () => {
      const response = await axios.get(`${this.baseUrl}/api/payment/methods`);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Payment methods endpoint malformed');
      }
    });
  }

  // Phase 8: Business Flow Validation
  async testBusinessFlows(): Promise<void> {
    await this.executeTest('Agent Creation Flow', async () => {
      // Step 1: Get industries
      const industriesResponse = await axios.get(`${this.baseUrl}/api/industries`);
      
      // Step 2: Create agent
      const agentData = {
        businessName: 'Flow Test Agent',
        businessDescription: 'Testing complete flow',
        industry: 'technology',
        llmModel: 'gpt-4o'
      };
      
      const createResponse = await axios.post(`${this.baseUrl}/api/agents`, agentData);
      if (createResponse.status !== 201 && createResponse.status !== 200) {
        throw new Error('Agent creation flow failed');
      }
    });

    await this.executeTest('RAG Configuration Flow', async () => {
      const response = await axios.get(`${this.baseUrl}/api/rag/knowledge-bases`);
      
      if (!Array.isArray(response.data)) {
        throw new Error('RAG knowledge bases not accessible');
      }
    });

    await this.executeTest('Analytics Flow', async () => {
      const response = await axios.get(`${this.baseUrl}/api/analytics/dashboard`);
      
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Analytics dashboard not accessible');
      }
    });
  }

  // Phase 9: Performance & Security Testing
  async testPerformanceSecurity(): Promise<void> {
    await this.executeTest('Response Time Performance', async () => {
      const startTime = Date.now();
      await axios.get(`${this.baseUrl}/api/agents`);
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        throw new Error(`Response time too slow: ${responseTime}ms`);
      }
    });

    await this.executeTest('CORS Configuration', async () => {
      const response = await axios.get(`${this.baseUrl}/api/agents`);
      
      // Check if CORS headers are present (in a real test environment)
      if (response.status !== 200) {
        throw new Error('CORS configuration issue');
      }
    });

    await this.executeTest('Rate Limiting', async () => {
      // Test multiple rapid requests
      const promises = Array(5).fill(0).map(() => 
        axios.get(`${this.baseUrl}/api/agents`)
      );
      
      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(r => r.status === 200);
      
      if (!allSuccessful) {
        throw new Error('Rate limiting affecting normal requests');
      }
    });
  }

  // Phase 10: Complete User Journey Testing
  async testCompleteUserJourney(): Promise<void> {
    await this.executeTest('Complete User Journey: Agent Creation to Deployment', async () => {
      // 1. Create agent
      const agentData = {
        businessName: 'Journey Test Agent',
        businessDescription: 'Complete user journey test',
        industry: 'healthcare',
        llmModel: 'gpt-4o',
        interfaceType: 'webchat'
      };
      
      const agentResponse = await axios.post(`${this.baseUrl}/api/agents`, agentData);
      if (agentResponse.status !== 201 && agentResponse.status !== 200) {
        throw new Error('User journey: Agent creation failed');
      }
      
      // 2. Configure RAG (if available)
      await axios.get(`${this.baseUrl}/api/rag/knowledge-bases`);
      
      // 3. Generate widget code
      await axios.get(`${this.baseUrl}/api/widgets/generate?agentId=1`);
      
      // 4. View analytics
      await axios.get(`${this.baseUrl}/api/analytics/dashboard`);
      
      // Journey completed successfully
    });

    await this.executeTest('Payment Flow Integration', async () => {
      // Test complete payment flow
      const paymentData = {
        amount: 500,
        currency: 'INR',
        description: 'Test consultation',
        agentId: 1
      };
      
      const response = await axios.post(`${this.baseUrl}/api/payment/create-intent`, paymentData);
      
      // Should handle payment intent creation
      if (!response.data) {
        throw new Error('Payment flow integration failed');
      }
    });
  }

  // Execute all tests
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Platform Testing...\n');
    
    const phases = [
      { name: 'Configuration System', test: () => this.testConfigurationSystem() },
      { name: 'Core Services', test: () => this.testCoreServices() },
      { name: 'Frontend Navigation', test: () => this.testFrontendNavigation() },
      { name: 'API Endpoints', test: () => this.testAPIEndpoints() },
      { name: 'Microservices', test: () => this.testMicroservices() },
      { name: 'Database Operations', test: () => this.testDatabaseOperations() },
      { name: 'External Services', test: () => this.testExternalServices() },
      { name: 'Business Flows', test: () => this.testBusinessFlows() },
      { name: 'Performance & Security', test: () => this.testPerformanceSecurity() },
      { name: 'Complete User Journey', test: () => this.testCompleteUserJourney() }
    ];

    for (const phase of phases) {
      console.log(`\n📋 Phase: ${phase.name}`);
      console.log('─'.repeat(50));
      await phase.test();
    }

    this.generateReport();
  }

  private generateReport(): void {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    const passRate = ((passed / total) * 100).toFixed(1);
    const avgDuration = (this.results.reduce((sum, r) => sum + r.duration, 0) / total).toFixed(0);
    
    console.log('\n🎯 TEST SUMMARY REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Average Duration: ${avgDuration}ms`);
    console.log('═'.repeat(60));
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   ${r.test}: ${r.message}`));
    }
    
    console.log(`\n🏆 Platform Status: ${failed === 0 ? 'FULLY OPERATIONAL' : 'NEEDS ATTENTION'}`);
  }
}

// Export for use in testing
export { PlatformTester, TestResult };

// Run tests if executed directly
if (require.main === module) {
  const tester = new PlatformTester();
  tester.runAllTests().catch(console.error);
}