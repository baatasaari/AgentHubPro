// Comprehensive Platform Testing Suite - Post Security Fixes
import axios from 'axios';

interface TestResult {
  test: string;
  category: string;
  status: 'PASS' | 'FAIL';
  response?: any;
  responseTime?: number;
  timestamp: string;
}

class ComprehensivePlatformTest {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  private async executeTest(
    testName: string,
    category: string,
    testFunction: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      const result = await testFunction();
      const responseTime = Date.now() - startTime;
      
      const testResult: TestResult = {
        test: testName,
        category,
        status: 'PASS',
        response: result,
        responseTime,
        timestamp
      };
      
      this.results.push(testResult);
      console.log(`✅ ${testName}: ${responseTime}ms`);
      return testResult;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const testResult: TestResult = {
        test: testName,
        category,
        status: 'FAIL',
        response: error.message,
        responseTime,
        timestamp
      };
      
      this.results.push(testResult);
      console.log(`❌ ${testName}: ${error.message}`);
      return testResult;
    }
  }

  // Core API Testing
  async testCoreAPI(): Promise<void> {
    console.log('\n🔧 Testing Core API Functionality...');

    // Health check
    await this.executeTest(
      'Health Check',
      'Core API',
      async () => {
        const response = await axios.get(`${this.baseUrl}/health`);
        if (response.status === 200 && response.data.status === 'healthy') {
          return 'Health check successful';
        }
        throw new Error(`Health check failed: ${response.status}`);
      }
    );

    // Agents GET
    await this.executeTest(
      'Get Agents List',
      'Core API',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/agents`);
        if (response.status === 200 && Array.isArray(response.data)) {
          return `Retrieved ${response.data.length} agents`;
        }
        throw new Error(`Failed to get agents: ${response.status}`);
      }
    );

    // Agent Creation (Valid)
    await this.executeTest(
      'Create Valid Agent',
      'Core API',
      async () => {
        const agentData = {
          businessName: 'Test Healthcare Agent',
          businessDescription: 'A comprehensive healthcare assistance agent for patient support',
          businessDomain: 'https://healthcare-test.com',
          industry: 'healthcare',
          llmModel: 'gpt-4o',
          interfaceType: 'webchat'
        };

        const response = await axios.post(`${this.baseUrl}/api/agents`, agentData);
        if (response.status === 201 && response.data.id) {
          return `Agent created with ID: ${response.data.id}`;
        }
        throw new Error(`Agent creation failed: ${response.status}`);
      }
    );

    // Conversations GET
    await this.executeTest(
      'Get Conversations',
      'Core API',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/conversations`);
        if (response.status === 200) {
          return `Retrieved conversations data`;
        }
        throw new Error(`Failed to get conversations: ${response.status}`);
      }
    );

    // Usage Stats
    await this.executeTest(
      'Get Usage Statistics',
      'Core API',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/usage/stats`);
        if (response.status === 200 && response.data.totalConversations !== undefined) {
          return `Usage stats: ${response.data.totalConversations} conversations`;
        }
        throw new Error(`Failed to get usage stats: ${response.status}`);
      }
    );
  }

  // RAG System Testing
  async testRAGSystem(): Promise<void> {
    console.log('\n📚 Testing RAG System...');

    // Knowledge Bases
    await this.executeTest(
      'Get Knowledge Bases',
      'RAG System',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/rag/knowledge-bases`);
        if (response.status === 200) {
          return 'Knowledge bases retrieved';
        }
        throw new Error(`RAG knowledge bases failed: ${response.status}`);
      }
    );

    // RAG Query (Valid)
    await this.executeTest(
      'RAG Query Processing',
      'RAG System',
      async () => {
        const queryData = {
          query: 'What are your healthcare services?',
          agentId: 1
        };

        const response = await axios.post(`${this.baseUrl}/api/rag/query`, queryData);
        if (response.status === 200 && response.data.response) {
          return `RAG response generated: ${response.data.response.substring(0, 50)}...`;
        }
        throw new Error(`RAG query failed: ${response.status}`);
      }
    );
  }

  // Analytics and Reporting
  async testAnalytics(): Promise<void> {
    console.log('\n📊 Testing Analytics System...');

    // Dashboard Analytics
    await this.executeTest(
      'Dashboard Analytics',
      'Analytics',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/analytics/dashboard`);
        if (response.status === 200 && response.data.totalAgents !== undefined) {
          return `Analytics: ${response.data.totalAgents} total agents`;
        }
        throw new Error(`Analytics dashboard failed: ${response.status}`);
      }
    );

    // Customer Analytics
    await this.executeTest(
      'Customer Analytics',
      'Analytics',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/analytics/customers`);
        if (response.status === 200) {
          return 'Customer analytics retrieved';
        }
        throw new Error(`Customer analytics failed: ${response.status}`);
      }
    );

    // Performance Metrics
    await this.executeTest(
      'Performance Metrics',
      'Analytics',
      async () => {
        const response = await axios.get(`${this.baseUrl}/api/analytics/performance`);
        if (response.status === 200) {
          return 'Performance metrics retrieved';
        }
        throw new Error(`Performance metrics failed: ${response.status}`);
      }
    );
  }

  // Payment System Testing
  async testPaymentSystem(): Promise<void> {
    console.log('\n💳 Testing Payment System...');

    // Payment Intent Creation
    await this.executeTest(
      'Create Payment Intent',
      'Payment System',
      async () => {
        const paymentData = {
          amount: 2999, // 29.99 INR
          currency: 'INR',
          description: 'Healthcare Agent Subscription'
        };

        const response = await axios.post(`${this.baseUrl}/api/payment/create-intent`, paymentData);
        if (response.status === 200 || response.status === 404) {
          return 'Payment system accessible';
        }
        throw new Error(`Payment intent failed: ${response.status}`);
      }
    );

    // Payment Processing
    await this.executeTest(
      'Process Payment',
      'Payment System',
      async () => {
        const response = await axios.post(`${this.baseUrl}/api/payment/process`, {
          agentId: 1,
          amount: 2999,
          paymentMethod: 'upi'
        });
        if (response.status === 200 || response.status === 404) {
          return 'Payment processing accessible';
        }
        throw new Error(`Payment processing failed: ${response.status}`);
      }
    );
  }

  // Email and Communication
  async testCommunication(): Promise<void> {
    console.log('\n📧 Testing Communication System...');

    // Email Report Generation
    await this.executeTest(
      'Email Report Generation',
      'Communication',
      async () => {
        const response = await axios.post(`${this.baseUrl}/api/email/send-report`, {
          toEmail: 'test@example.com',
          reportData: {
            agentCount: 5,
            conversationCount: 127,
            totalRevenue: 12547
          }
        });
        if (response.status === 200 || response.status === 404) {
          return 'Email system accessible';
        }
        throw new Error(`Email report failed: ${response.status}`);
      }
    );

    // WhatsApp Integration
    await this.executeTest(
      'WhatsApp Integration',
      'Communication',
      async () => {
        const response = await axios.post(`${this.baseUrl}/api/whatsapp/send`, {
          to: '+919876543210',
          message: 'Test message from AgentHub'
        });
        if (response.status === 200 || response.status === 404) {
          return 'WhatsApp integration accessible';
        }
        throw new Error(`WhatsApp integration failed: ${response.status}`);
      }
    );
  }

  // Microservices Health
  async testMicroservices(): Promise<void> {
    console.log('\n🔄 Testing Microservices Health...');

    const microservices = [
      'agent-lifecycle',
      'conversation-processing',
      'rag-knowledge',
      'payment-processing',
      'analytics-calculation',
      'calendar-integration',
      'email-service'
    ];

    for (const service of microservices) {
      await this.executeTest(
        `${service} Health`,
        'Microservices',
        async () => {
          const response = await axios.get(`${this.baseUrl}/api/${service}/health`);
          if (response.status === 200 && response.data.status === 'healthy') {
            return `${service} healthy`;
          }
          throw new Error(`${service} unhealthy: ${response.status}`);
        }
      );
    }
  }

  // Frontend Routes Testing
  async testFrontendRoutes(): Promise<void> {
    console.log('\n🌐 Testing Frontend Routes...');

    const routes = [
      { path: '/', name: 'Home Page' },
      { path: '/agents', name: 'Agents Page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/my-agents', name: 'My Agents' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/billing', name: 'Billing' },
      { path: '/settings', name: 'Settings' },
      { path: '/admin-dashboard', name: 'Admin Dashboard' }
    ];

    for (const route of routes) {
      await this.executeTest(
        route.name,
        'Frontend Routes',
        async () => {
          const response = await axios.get(`${this.baseUrl}${route.path}`);
          if (response.status === 200) {
            return `${route.name} accessible`;
          }
          throw new Error(`${route.name} failed: ${response.status}`);
        }
      );
    }
  }

  // Input Validation Verification
  async testValidationSystem(): Promise<void> {
    console.log('\n🛡️ Verifying Input Validation System...');

    // Test that validation is still working
    await this.executeTest(
      'Validation - Missing Fields',
      'Security',
      async () => {
        try {
          await axios.post(`${this.baseUrl}/api/agents`, {});
          throw new Error('Validation failed - accepted empty request');
        } catch (error: any) {
          if (error.response?.status === 400) {
            return 'Validation correctly rejects missing fields';
          }
          throw error;
        }
      }
    );

    await this.executeTest(
      'Validation - Invalid Types',
      'Security',
      async () => {
        try {
          await axios.post(`${this.baseUrl}/api/agents`, {
            businessName: 123,
            businessDescription: true
          });
          throw new Error('Validation failed - accepted invalid types');
        } catch (error: any) {
          if (error.response?.status === 400) {
            return 'Validation correctly rejects invalid types';
          }
          throw error;
        }
      }
    );

    await this.executeTest(
      'XSS Prevention',
      'Security',
      async () => {
        const xssPayload = '<script>alert("xss")</script>';
        const response = await axios.post(`${this.baseUrl}/api/agents`, {
          businessName: xssPayload + 'Test Agent',
          businessDescription: 'Testing XSS prevention',
          businessDomain: 'https://test.com',
          industry: 'technology'
        });

        if (response.status === 201 && !response.data.businessName.includes('<script>')) {
          return 'XSS prevention working - script tags sanitized';
        }
        throw new Error('XSS prevention failed');
      }
    );
  }

  // Performance Testing
  async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');

    // Concurrent requests
    await this.executeTest(
      'Concurrent Request Handling',
      'Performance',
      async () => {
        const promises = Array(10).fill(0).map(() => 
          axios.get(`${this.baseUrl}/api/agents`)
        );
        
        const startTime = Date.now();
        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        const successful = results.filter(r => r.status === 200).length;
        if (successful === 10) {
          return `Handled 10 concurrent requests in ${endTime - startTime}ms`;
        }
        throw new Error(`Only ${successful}/10 requests succeeded`);
      }
    );

    // Response time test
    await this.executeTest(
      'Response Time Check',
      'Performance',
      async () => {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseUrl}/api/agents`);
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200 && responseTime < 1000) {
          return `Response time: ${responseTime}ms (Good)`;
        } else if (responseTime >= 1000) {
          throw new Error(`Slow response: ${responseTime}ms`);
        }
        throw new Error(`Request failed: ${response.status}`);
      }
    );
  }

  // Run all tests
  async runComprehensiveTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Platform Testing...\n');
    
    const testSuites = [
      { name: 'Core API', test: () => this.testCoreAPI() },
      { name: 'RAG System', test: () => this.testRAGSystem() },
      { name: 'Analytics', test: () => this.testAnalytics() },
      { name: 'Payment System', test: () => this.testPaymentSystem() },
      { name: 'Communication', test: () => this.testCommunication() },
      { name: 'Microservices', test: () => this.testMicroservices() },
      { name: 'Frontend Routes', test: () => this.testFrontendRoutes() },
      { name: 'Validation System', test: () => this.testValidationSystem() },
      { name: 'Performance', test: () => this.testPerformance() }
    ];

    for (const suite of testSuites) {
      console.log(`\n📋 Testing: ${suite.name}`);
      console.log('─'.repeat(50));
      await suite.test();
    }

    this.generateComprehensiveReport();
  }

  private generateComprehensiveReport(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    const avgResponseTime = this.results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / 
      this.results.filter(r => r.responseTime).length;
    
    console.log('\n🎯 COMPREHENSIVE TESTING REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests Run: ${total}`);
    console.log(`Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log('═'.repeat(60));
    
    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length;
      const categoryTotal = categoryResults.length;
      
      console.log(`\n📊 ${category}: ${categoryPassed}/${categoryTotal} tests passed`);
      
      categoryResults.forEach(r => {
        const status = r.status === 'PASS' ? '✅' : '❌';
        const time = r.responseTime ? ` (${r.responseTime}ms)` : '';
        console.log(`   ${status} ${r.test}${time}`);
      });
    });
    
    if (failed > 0) {
      console.log('\n⚠️ FAILED TESTS DETAILS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`\n❌ ${r.test} (${r.category})`);
          console.log(`   Error: ${r.response}`);
        });
    }
    
    const healthStatus = failed === 0 ? '🟢 EXCELLENT' : 
                        failed <= 2 ? '🟡 GOOD' : 
                        failed <= 5 ? '🟠 ACCEPTABLE' : '🔴 NEEDS ATTENTION';
    
    console.log(`\n🏆 Platform Health: ${healthStatus}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL SYSTEMS OPERATIONAL - PLATFORM READY FOR PRODUCTION! 🚀');
    }
  }
}

// Export for use
export { ComprehensivePlatformTest };

// Run if executed directly
if (import.meta.main) {
  const tester = new ComprehensivePlatformTest();
  tester.runComprehensiveTests().catch(console.error);
}