// Comprehensive Agent Wizard End-to-End Testing System
// Tests all platforms (WhatsApp, Instagram, Messenger, Web Chat, SMS, Telegram)
// Includes positive and negative test scenarios

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface AgentTestData {
  businessName: string;
  businessDescription: string;
  businessDomain?: string;
  industry: string;
  llmModel: string;
  interfaceType: string;
  expectedResult: 'success' | 'failure';
  testType: 'positive' | 'negative';
  scenario: string;
}

export class AgentWizardTester {
  private baseUrl = 'http://localhost:5000';
  private testResults: Map<string, TestResult[]> = new Map();

  // Platform configurations for testing
  private platforms = [
    { id: 'webchat', name: 'Web Chat', supported: true },
    { id: 'whatsapp', name: 'WhatsApp', supported: true },
    { id: 'instagram', name: 'Instagram', supported: true },
    { id: 'messenger', name: 'Facebook Messenger', supported: true },
    { id: 'sms', name: 'SMS', supported: true },
    { id: 'telegram', name: 'Telegram', supported: true },
    { id: 'twitter', name: 'Twitter/X', supported: false }, // Not yet supported
    { id: 'slack', name: 'Slack', supported: false }, // Not yet supported
  ];

  // Industry configurations
  private industries = [
    'healthcare', 'retail', 'finance', 'technology', 'education',
    'realestate', 'hospitality', 'legal', 'automotive', 'consulting'
  ];

  // LLM Model configurations
  private llmModels = [
    'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-sonnet', 'gemini-pro'
  ];

  // Positive test scenarios
  private getPositiveTestCases(): AgentTestData[] {
    return [
      {
        businessName: 'HealthCare Plus',
        businessDescription: 'Medical consultation and appointment booking service',
        businessDomain: 'https://healthcare-plus.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Complete healthcare agent with WhatsApp integration'
      },
      {
        businessName: 'TechStore Solutions',
        businessDescription: 'E-commerce platform for technology products with customer support',
        businessDomain: 'https://techstore.com',
        industry: 'technology',
        llmModel: 'claude-3-sonnet',
        interfaceType: 'webchat',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Tech retail agent with web chat interface'
      },
      {
        businessName: 'Finance Advisor Pro',
        businessDescription: 'Personal finance consultation and investment guidance service',
        businessDomain: 'https://financeadvisor.com',
        industry: 'finance',
        llmModel: 'gpt-3.5-turbo',
        interfaceType: 'instagram',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Financial services agent with Instagram integration'
      },
      {
        businessName: 'EduLearn Academy',
        businessDescription: 'Online education platform with student support and course guidance',
        businessDomain: 'https://edulearn.com',
        industry: 'education',
        llmModel: 'gemini-pro',
        interfaceType: 'messenger',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Education agent with Facebook Messenger'
      },
      {
        businessName: 'Hotel Booking Central',
        businessDescription: 'Hotel reservation and travel assistance service',
        businessDomain: 'https://hotelbooking.com',
        industry: 'hospitality',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'sms',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Hospitality agent with SMS interface'
      },
      {
        businessName: 'RealEstate Connect',
        businessDescription: 'Property listing and real estate consultation service',
        businessDomain: 'https://realestate-connect.com',
        industry: 'realestate',
        llmModel: 'claude-3-sonnet',
        interfaceType: 'telegram',
        expectedResult: 'success',
        testType: 'positive',
        scenario: 'Real estate agent with Telegram integration'
      }
    ];
  }

  // Negative test scenarios
  private getNegativeTestCases(): AgentTestData[] {
    return [
      {
        businessName: '', // Empty business name
        businessDescription: 'Valid business description',
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Empty business name validation'
      },
      {
        businessName: 'A', // Too short business name
        businessDescription: 'Valid business description',
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Business name too short'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'Short', // Too short description
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Business description too short'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'Valid business description for testing purposes',
        businessDomain: 'invalid-domain', // Invalid domain format
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Invalid domain format'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'Valid business description for testing purposes',
        businessDomain: 'https://test.com',
        industry: 'invalid-industry', // Invalid industry
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Invalid industry selection'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'Valid business description for testing purposes',
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'invalid-model', // Invalid LLM model
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Invalid LLM model selection'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'Valid business description for testing purposes',
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'invalid-interface', // Invalid interface type
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Invalid interface type'
      },
      {
        businessName: 'Special@Characters#Test!',
        businessDescription: 'Testing special characters in business name',
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Special characters in business name'
      },
      {
        businessName: 'Valid Business Name',
        businessDescription: 'A'.repeat(1000), // Too long description
        businessDomain: 'https://test.com',
        industry: 'healthcare',
        llmModel: 'gpt-4-turbo',
        interfaceType: 'whatsapp',
        expectedResult: 'failure',
        testType: 'negative',
        scenario: 'Business description too long'
      }
    ];
  }

  // Execute API call to create agent
  private async createAgent(agentData: AgentTestData): Promise<{ success: boolean, data?: any, error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: agentData.businessName,
          businessDescription: agentData.businessDescription,
          businessDomain: agentData.businessDomain,
          industry: agentData.industry,
          llmModel: agentData.llmModel,
          interfaceType: agentData.interfaceType,
          organizationId: 1,
          createdBy: 1
        })
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test individual agent creation
  private async testAgentCreation(testCase: AgentTestData): Promise<TestResult> {
    const result = await this.createAgent(testCase);
    
    const passed = testCase.expectedResult === 'success' ? result.success : !result.success;
    
    return {
      passed,
      message: passed ? 
        `✅ ${testCase.scenario}: ${testCase.expectedResult} as expected` :
        `❌ ${testCase.scenario}: Expected ${testCase.expectedResult}, got ${result.success ? 'success' : 'failure'}`,
      details: {
        platform: testCase.interfaceType,
        industry: testCase.industry,
        model: testCase.llmModel,
        result: result.success ? 'success' : 'failure',
        error: result.error,
        agentId: result.data?.id
      }
    };
  }

  // Test platform-specific agent creation
  async testPlatformIntegration(): Promise<void> {
    console.log('🚀 TESTING PLATFORM INTEGRATION');
    console.log('===============================');

    for (const platform of this.platforms) {
      console.log(`\n📱 Testing ${platform.name} (${platform.id})`);
      console.log('----------------------------------------');

      if (!platform.supported) {
        console.log(`⚠️ ${platform.name} not yet supported - skipping`);
        continue;
      }

      const platformResults: TestResult[] = [];

      // Test each industry with this platform
      for (const industry of this.industries.slice(0, 3)) { // Test first 3 industries per platform
        const testCase: AgentTestData = {
          businessName: `${industry.charAt(0).toUpperCase() + industry.slice(1)} Business`,
          businessDescription: `Professional ${industry} service with AI-powered customer support`,
          businessDomain: `https://${industry}-business.com`,
          industry,
          llmModel: this.llmModels[Math.floor(Math.random() * this.llmModels.length)],
          interfaceType: platform.id,
          expectedResult: 'success',
          testType: 'positive',
          scenario: `${platform.name} integration with ${industry} industry`
        };

        const result = await this.testAgentCreation(testCase);
        platformResults.push(result);
        
        console.log(`  ${result.message}`);
        if (result.details?.agentId) {
          console.log(`    Agent ID: ${result.details.agentId}`);
        }
      }

      this.testResults.set(`platform_${platform.id}`, platformResults);
    }
  }

  // Test positive scenarios
  async testPositiveScenarios(): Promise<void> {
    console.log('\n✅ TESTING POSITIVE SCENARIOS');
    console.log('=============================');

    const positiveResults: TestResult[] = [];
    const testCases = this.getPositiveTestCases();

    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.scenario}`);
      const result = await this.testAgentCreation(testCase);
      positiveResults.push(result);
      console.log(`  ${result.message}`);
      
      if (result.details?.agentId) {
        console.log(`    ✓ Agent created successfully with ID: ${result.details.agentId}`);
        console.log(`    ✓ Platform: ${result.details.platform}`);
        console.log(`    ✓ Industry: ${result.details.industry}`);
        console.log(`    ✓ Model: ${result.details.model}`);
      }
    }

    this.testResults.set('positive_scenarios', positiveResults);
  }

  // Test negative scenarios
  async testNegativeScenarios(): Promise<void> {
    console.log('\n❌ TESTING NEGATIVE SCENARIOS');
    console.log('=============================');

    const negativeResults: TestResult[] = [];
    const testCases = this.getNegativeTestCases();

    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.scenario}`);
      const result = await this.testAgentCreation(testCase);
      negativeResults.push(result);
      console.log(`  ${result.message}`);
      
      if (result.details?.error) {
        console.log(`    ✓ Error correctly caught: ${result.details.error}`);
      }
    }

    this.testResults.set('negative_scenarios', negativeResults);
  }

  // Test agent management operations
  async testAgentManagement(): Promise<void> {
    console.log('\n🔧 TESTING AGENT MANAGEMENT OPERATIONS');
    console.log('=====================================');

    const managementResults: TestResult[] = [];

    // Test getting all agents
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`);
      const agents = await response.json();
      
      if (response.ok) {
        managementResults.push({
          passed: true,
          message: `✅ Successfully retrieved ${agents.length} agents`,
          details: { operation: 'get_all_agents', count: agents.length }
        });
        console.log(`  ✅ Retrieved ${agents.length} agents from API`);
      } else {
        managementResults.push({
          passed: false,
          message: `❌ Failed to retrieve agents: ${agents.message}`,
          details: { operation: 'get_all_agents', error: agents.message }
        });
      }
    } catch (error) {
      managementResults.push({
        passed: false,
        message: `❌ Agent retrieval error: ${error.message}`,
        details: { operation: 'get_all_agents', error: error.message }
      });
    }

    // Test agent status operations (if we have agents)
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`);
      const agents = await response.json();
      
      if (response.ok && agents.length > 0) {
        const firstAgent = agents[0];
        console.log(`  Testing operations on agent: ${firstAgent.businessName}`);
        
        // Test agent details retrieval
        const detailResponse = await fetch(`${this.baseUrl}/api/agents/${firstAgent.id}`);
        if (detailResponse.ok) {
          managementResults.push({
            passed: true,
            message: `✅ Successfully retrieved agent details for ID ${firstAgent.id}`,
            details: { operation: 'get_agent_details', agentId: firstAgent.id }
          });
          console.log(`    ✅ Agent details retrieved successfully`);
        }
      }
    } catch (error) {
      console.log(`    ⚠️ Agent management test skipped: ${error.message}`);
    }

    this.testResults.set('agent_management', managementResults);
  }

  // Generate comprehensive test report
  generateReport(): void {
    console.log('\n📊 COMPREHENSIVE AGENT WIZARD TEST REPORT');
    console.log('=========================================');

    let totalTests = 0;
    let passedTests = 0;

    for (const [category, results] of this.testResults) {
      const categoryPassed = results.filter(r => r.passed).length;
      const categoryTotal = results.length;
      totalTests += categoryTotal;
      passedTests += categoryPassed;

      console.log(`\n📋 ${category.toUpperCase().replace(/_/g, ' ')}`);
      console.log(`   Passed: ${categoryPassed}/${categoryTotal} (${Math.round(categoryPassed/categoryTotal*100)}%)`);
      
      if (categoryPassed < categoryTotal) {
        console.log(`   Failed tests:`);
        results.filter(r => !r.passed).forEach(result => {
          console.log(`     - ${result.message}`);
        });
      }
    }

    console.log(`\n🎯 OVERALL RESULTS`);
    console.log(`==================`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round(passedTests/totalTests*100)}%`);

    // Platform-specific summary
    console.log(`\n🌐 PLATFORM INTEGRATION SUMMARY`);
    console.log(`===============================`);
    
    const supportedPlatforms = this.platforms.filter(p => p.supported);
    const testedPlatforms = supportedPlatforms.length;
    
    console.log(`Supported Platforms: ${testedPlatforms}`);
    supportedPlatforms.forEach(platform => {
      const platformResults = this.testResults.get(`platform_${platform.id}`);
      if (platformResults) {
        const platformPassed = platformResults.filter(r => r.passed).length;
        const platformTotal = platformResults.length;
        console.log(`  ${platform.name}: ${platformPassed}/${platformTotal} tests passed`);
      }
    });

    if (passedTests === totalTests) {
      console.log(`\n🚀 ALL TESTS PASSED! Agent Wizard is fully functional across all platforms.`);
    } else {
      console.log(`\n⚠️  Some tests failed. Review the failures above for improvement areas.`);
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('🧪 STARTING COMPREHENSIVE AGENT WIZARD TESTING');
    console.log('==============================================');
    console.log(`Testing Date: ${new Date().toISOString()}`);
    console.log(`Target URL: ${this.baseUrl}`);
    console.log(`Platforms to test: ${this.platforms.filter(p => p.supported).length}`);
    console.log(`Industries to test: ${this.industries.length}`);
    console.log(`LLM Models to test: ${this.llmModels.length}`);

    try {
      await this.testPositiveScenarios();
      await this.testNegativeScenarios();
      await this.testPlatformIntegration();
      await this.testAgentManagement();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }
  }
}

// Export the tester instance
export const agentWizardTester = new AgentWizardTester();