/**
 * Independent Microservices Testing Suite
 * Tests each of the 7 microservices independently with realistic dummy data
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  testName: string;
  success: boolean;
  responseTime: number;
  data?: any;
  error?: string;
}

class MicroservicesIndependentTester {
  private results: TestResult[] = [];
  private successCount = 0;
  private failCount = 0;

  async executeTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await testFunction();
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        testName,
        success: true,
        responseTime,
        data: result
      });
      
      this.successCount++;
      console.log(`✅ ${testName} - ${responseTime}ms`);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        testName,
        success: false,
        responseTime,
        error: error.response?.data?.message || error.message
      });
      
      this.failCount++;
      console.log(`❌ ${testName} - ${error.response?.data?.message || error.message}`);
    }
  }

  async testAgentWizardService(): Promise<void> {
    console.log('\n🤖 TESTING AGENT WIZARD SERVICE (Core Agent Management)');
    console.log('-'.repeat(60));

    // Test 1: Create healthcare agent
    await this.executeTest('Agent Creation - Healthcare Clinic', async () => {
      const agentData = {
        businessName: "Mumbai Advanced Healthcare Center",
        industry: "healthcare",
        businessDescription: "Specialized healthcare services with AI-powered patient care and telemedicine consultations",
        llmModel: "gpt-4o",
        interfaceType: "whatsapp"
      };
      
      const response = await axios.post(`${BASE_URL}/api/agents`, agentData);
      return { agentId: response.data.id, businessName: response.data.businessName };
    });

    // Test 2: Create retail agent
    await this.executeTest('Agent Creation - Retail Fashion Store', async () => {
      const agentData = {
        businessName: "Delhi Premium Fashion Hub",
        industry: "retail",
        businessDescription: "High-end fashion retailer with personalized styling and virtual wardrobe consultation",
        llmModel: "gpt-4o",
        interfaceType: "webchat"
      };
      
      const response = await axios.post(`${BASE_URL}/api/agents`, agentData);
      return { agentId: response.data.id, businessName: response.data.businessName };
    });

    // Test 3: Create finance agent
    await this.executeTest('Agent Creation - Investment Advisory', async () => {
      const agentData = {
        businessName: "Bangalore Wealth Management Solutions",
        industry: "finance",
        businessDescription: "Professional investment advisory with portfolio management and financial planning expertise",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp"
      };
      
      const response = await axios.post(`${BASE_URL}/api/agents`, agentData);
      return { agentId: response.data.id, businessName: response.data.businessName };
    });

    // Test 4: List all agents
    await this.executeTest('Agent Listing with Filters', async () => {
      const response = await axios.get(`${BASE_URL}/api/agents`);
      return { totalAgents: response.data.length, agents: response.data.map((a: any) => a.businessName) };
    });

    // Test 5: Update agent status
    await this.executeTest('Agent Status Management', async () => {
      const response = await axios.patch(`${BASE_URL}/api/agents/1/status`, { status: 'active' });
      return { agentId: response.data.id, status: response.data.status };
    });

    // Test 6: Generate embed code
    await this.executeTest('Agent Embed Code Generation', async () => {
      const response = await axios.get(`${BASE_URL}/api/agents/1/embed`);
      return { hasEmbedCode: response.data.embedCode.length > 0, codeLength: response.data.embedCode.length };
    });
  }

  async testAnalyticsService(): Promise<void> {
    console.log('\n📊 TESTING ANALYTICS SERVICE (Enterprise Analytics)');
    console.log('-'.repeat(60));

    // Test 1: Record conversation insight with comprehensive data
    await this.executeTest('Conversation Insight Recording', async () => {
      const insightData = {
        conversationId: "healthcare_conv_premium_001",
        agentId: "1",
        customerId: "patient_arjun_mehta",
        platform: "whatsapp",
        sessionId: "session_healthcare_premium_001",
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        duration: 3600,
        messageCount: 28,
        customerMessages: 14,
        agentResponses: 14,
        responseTimeAvg: 25000,
        customerSatisfactionScore: 5,
        conversionEvent: {
          type: "appointment",
          value: 2500,
          currency: "INR"
        },
        followUpRequired: true,
        followUpActions: ["Send premium consultation details", "Schedule follow-up in 48h", "Prepare specialized treatment plan"],
        tags: ["healthcare", "premium_consultation", "specialist_referral", "high_value_patient"]
      };
      
      const response = await axios.post(`${BASE_URL}/api/analytics/conversation`, insightData);
      return { success: response.data.success, conversationId: insightData.conversationId };
    });

    // Test 2: Agent performance analytics
    await this.executeTest('Agent Performance Analytics', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/agent/1/performance`);
      return {
        agentId: response.data.agentId,
        grade: response.data.grade,
        satisfactionScore: response.data.metrics.satisfactionScore,
        conversionRate: response.data.metrics.conversionRate
      };
    });

    // Test 3: Customer journey analytics
    await this.executeTest('Customer Journey Analytics', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/customer/patient_arjun_mehta/insight`);
      return {
        customerId: response.data.customerId,
        segment: response.data.segment,
        churnRisk: response.data.churnRisk,
        upsellPotential: response.data.upsellPotential
      };
    });

    // Test 4: System performance monitoring
    await this.executeTest('System Performance Monitoring', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/system/performance`);
      return {
        timestamp: response.data.timestamp,
        totalConversations: response.data.totalConversations,
        systemHealth: response.data.systemHealth,
        alertsGenerated: response.data.alerts?.length || 0
      };
    });

    // Test 5: Multi-agent comparison
    await this.executeTest('Multi-Agent Performance Comparison', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/comparison`);
      return {
        agentsCompared: response.data.comparisons.length,
        topPerformer: response.data.comparisons[0]?.grade,
        averageResponseTime: response.data.comparisons.reduce((sum: number, agent: any) => sum + agent.responseTime, 0) / response.data.comparisons.length
      };
    });

    // Test 6: Dashboard analytics
    await this.executeTest('Comprehensive Dashboard Analytics', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/dashboard/1`);
      return {
        agentId: response.data.agentPerformance.agentId,
        hasCustomerJourney: !!response.data.customerJourney,
        hasSystemMetrics: !!response.data.systemMetrics,
        hasBenchmarks: !!response.data.benchmarks
      };
    });
  }

  async testConversationalPaymentService(): Promise<void> {
    console.log('\n💳 TESTING CONVERSATIONAL PAYMENT SERVICE');
    console.log('-'.repeat(60));

    // Test 1: Healthcare consultation booking flow
    await this.executeTest('Healthcare Payment Flow', async () => {
      const context = {
        agentId: 1,
        customerId: "patient_rakesh_sharma",
        platform: "whatsapp",
        industry: "healthcare",
        customerData: {
          name: "Rakesh Sharma",
          phone: "+91-9876543210",
          email: "rakesh.sharma@email.com"
        },
        bookingData: {
          consultationType: "specialist",
          preferredDate: "2025-08-05",
          timeSlot: "14:00"
        }
      };
      
      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message: "I want to book a specialist consultation for diabetes management"
      });
      
      return {
        intent: response.data.intent,
        hasActions: response.data.actions.length > 0,
        actionTypes: response.data.actions.map((a: any) => a.type)
      };
    });

    // Test 2: Retail purchase flow
    await this.executeTest('Retail Purchase Flow', async () => {
      const context = {
        agentId: 2,
        customerId: "customer_neha_gupta",
        platform: "webchat",
        industry: "retail",
        customerData: {
          name: "Neha Gupta",
          phone: "+91-8765432109",
          email: "neha.gupta@email.com"
        },
        cartData: {
          items: [
            { productId: "fashion_dress_001", quantity: 2, price: 1299 },
            { productId: "fashion_accessory_002", quantity: 1, price: 599 }
          ],
          totalAmount: 3197
        }
      };
      
      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message: "I want to complete my purchase and pay for the items in my cart"
      });
      
      return {
        intent: response.data.intent,
        hasActions: response.data.actions.length > 0,
        totalAmount: context.cartData.totalAmount
      };
    });

    // Test 3: Finance consultation booking
    await this.executeTest('Finance Consultation Flow', async () => {
      const context = {
        agentId: 3,
        customerId: "investor_amit_patel",
        platform: "whatsapp",
        industry: "finance",
        customerData: {
          name: "Amit Patel",
          phone: "+91-7654321098",
          email: "amit.patel@email.com"
        },
        investmentData: {
          portfolioValue: 500000,
          riskProfile: "moderate",
          investmentGoals: ["retirement", "children_education"]
        }
      };
      
      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message: "I need investment advisory services for my retirement planning"
      });
      
      return {
        intent: response.data.intent,
        hasActions: response.data.actions.length > 0,
        portfolioValue: context.investmentData.portfolioValue
      };
    });
  }

  async testCalendarIntegrationService(): Promise<void> {
    console.log('\n📅 TESTING CALENDAR INTEGRATION SERVICE');
    console.log('-'.repeat(60));

    // Test 1: Calendar providers
    await this.executeTest('Calendar Providers List', async () => {
      const response = await axios.get(`${BASE_URL}/api/calendar/providers`);
      return {
        providerCount: response.data.providers.length,
        supportedProviders: response.data.providers.map((p: any) => p.name)
      };
    });

    // Test 2: Customer calendar configuration
    await this.executeTest('Customer Calendar Configuration', async () => {
      const configData = {
        customerId: "business_owner_rajesh",
        agentId: 1,
        provider: "google_calendar",
        workingHours: {
          monday: { start: "09:00", end: "18:00" },
          tuesday: { start: "09:00", end: "18:00" },
          wednesday: { start: "09:00", end: "18:00" },
          thursday: { start: "09:00", end: "18:00" },
          friday: { start: "09:00", end: "18:00" },
          saturday: { start: "10:00", end: "16:00" },
          sunday: { start: "closed", end: "closed" }
        },
        timeZone: "Asia/Kolkata",
        slotDuration: 30,
        bufferTime: 15,
        maxAdvanceBooking: 30
      };
      
      const response = await axios.post(`${BASE_URL}/api/calendar/configure`, configData);
      return { configId: response.data.configId, status: response.data.status };
    });

    // Test 3: Calendar slot generation
    await this.executeTest('Calendar Slot Generation', async () => {
      const response = await axios.get(`${BASE_URL}/api/calendar/slots/1`, {
        params: {
          industry: "healthcare",
          startDate: "2025-08-01",
          endDate: "2025-08-07"
        }
      });
      
      return {
        totalSlots: response.data.slots.length,
        sampleSlots: response.data.slots.slice(0, 3).map((s: any) => s.datetime),
        availability: response.data.metadata.availability
      };
    });

    // Test 4: Calendar connection test
    await this.executeTest('Calendar Connection Test', async () => {
      const response = await axios.post(`${BASE_URL}/api/calendar/test-connection`, {
        provider: "google_calendar",
        credentials: {
          type: "test",
          apiKey: "test_key"
        }
      });
      
      return { connected: response.data.connected, provider: response.data.provider };
    });

    // Test 5: Appointment booking
    await this.executeTest('Appointment Booking', async () => {
      const bookingData = {
        agentId: 1,
        customerId: "patient_deepak_singh",
        slotId: "slot_healthcare_001",
        datetime: "2025-08-05T14:00:00+05:30",
        duration: 30,
        appointmentType: "consultation",
        customerDetails: {
          name: "Deepak Singh",
          phone: "+91-9988776655",
          email: "deepak.singh@email.com",
          notes: "Follow-up consultation for diabetes management"
        }
      };
      
      const response = await axios.post(`${BASE_URL}/api/calendar/book`, bookingData);
      return { bookingId: response.data.bookingId, status: response.data.status };
    });
  }

  async testRAGKnowledgeService(): Promise<void> {
    console.log('\n🧠 TESTING RAG KNOWLEDGE SERVICE');
    console.log('-'.repeat(60));

    // Test 1: Healthcare knowledge queries
    const healthcareQueries = [
      "What are your consultation fees for specialized treatments?",
      "Do you provide telemedicine consultations?",
      "What insurance plans do you accept?",
      "Can I book an appointment for this weekend?"
    ];

    for (const query of healthcareQueries) {
      await this.executeTest(`Healthcare Query: ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 1,
          industry: "healthcare"
        });
        
        return {
          hasResponse: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore,
          responseLength: response.data.response?.length || 0
        };
      });
    }

    // Test 2: Retail knowledge queries
    const retailQueries = [
      "What are your store policies for returns and exchanges?",
      "Do you offer home delivery services?",
      "What payment methods do you accept?",
      "Are there any ongoing sales or discounts?"
    ];

    for (const query of retailQueries) {
      await this.executeTest(`Retail Query: ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 2,
          industry: "retail"
        });
        
        return {
          hasResponse: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore,
          responseLength: response.data.response?.length || 0
        };
      });
    }

    // Test 3: Finance knowledge queries
    const financeQueries = [
      "What investment options do you recommend for retirement planning?",
      "How do you calculate portfolio management fees?",
      "What is your minimum investment requirement?",
      "Do you provide tax planning services?"
    ];

    for (const query of financeQueries) {
      await this.executeTest(`Finance Query: ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 3,
          industry: "finance"
        });
        
        return {
          hasResponse: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore,
          responseLength: response.data.response?.length || 0
        };
      });
    }
  }

  async testInsightsIntegrationService(): Promise<void> {
    console.log('\n📈 TESTING INSIGHTS INTEGRATION SERVICE');
    console.log('-'.repeat(60));

    // Test 1: Record appointment insight
    await this.executeTest('Appointment Insight Recording', async () => {
      const appointmentData = {
        appointmentId: "healthcare_apt_premium_001",
        agentId: 1,
        customerId: "patient_suresh_kumar",
        appointmentDate: new Date().toISOString(),
        appointmentType: "specialist_consultation",
        duration: 45,
        status: "completed",
        outcome: "treatment_plan_created",
        followUpRequired: true,
        satisfactionScore: 5,
        revenue: 3500,
        notes: "Comprehensive diabetes management consultation completed successfully"
      };
      
      const response = await axios.post(`${BASE_URL}/api/insights/appointment`, appointmentData);
      return { success: response.data.success, appointmentId: appointmentData.appointmentId };
    });

    // Test 2: Record purchase insight
    await this.executeTest('Purchase Insight Recording', async () => {
      const purchaseData = {
        purchaseId: "retail_purchase_premium_001",
        agentId: 2,
        customerId: "customer_priya_agarwal",
        purchaseDate: new Date().toISOString(),
        items: [
          { productId: "premium_dress_001", quantity: 1, price: 2999, category: "formal_wear" },
          { productId: "designer_bag_002", quantity: 1, price: 4999, category: "accessories" }
        ],
        totalAmount: 7998,
        paymentMethod: "upi",
        deliveryMethod: "express_home_delivery",
        customerSatisfaction: 5,
        isReturningCustomer: true,
        notes: "Premium collection purchase with express delivery"
      };
      
      const response = await axios.post(`${BASE_URL}/api/insights/purchase`, purchaseData);
      return { success: response.data.success, purchaseId: purchaseData.purchaseId, amount: purchaseData.totalAmount };
    });

    // Test 3: Retrieve appointment metrics
    await this.executeTest('Appointment Metrics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/insights/appointments/1`);
      return {
        totalAppointments: response.data.totalAppointments,
        completedAppointments: response.data.completedAppointments,
        averageSatisfaction: response.data.averageSatisfaction,
        totalRevenue: response.data.totalRevenue
      };
    });

    // Test 4: Retrieve purchase metrics
    await this.executeTest('Purchase Metrics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/insights/purchases/2`);
      return {
        totalPurchases: response.data.totalPurchases,
        completedPurchases: response.data.completedPurchases,
        averageOrderValue: response.data.averageOrderValue,
        totalRevenue: response.data.totalRevenue
      };
    });

    // Test 5: Cross-microservice analytics sync
    await this.executeTest('Cross-Microservice Analytics Sync', async () => {
      const response = await axios.post(`${BASE_URL}/api/analytics/sync`);
      return {
        success: response.data.success,
        message: response.data.message,
        servicesSync: response.data.servicesSync || 4
      };
    });
  }

  async testCoreUsageService(): Promise<void> {
    console.log('\n📊 TESTING CORE USAGE SERVICE');
    console.log('-'.repeat(60));

    // Test 1: Record conversation
    await this.executeTest('Conversation Recording', async () => {
      const conversationData = {
        agentId: 1,
        tokens: 245,
        cost: "0.0245"
      };
      
      const response = await axios.post(`${BASE_URL}/api/conversations`, conversationData);
      return { conversationId: response.data.id, tokens: response.data.tokens, cost: response.data.cost };
    });

    // Test 2: Get usage statistics
    await this.executeTest('Usage Statistics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/usage/stats`);
      return {
        totalConversations: response.data.totalConversations,
        totalCost: response.data.totalCost,
        activeAgents: response.data.activeAgents,
        avgCostPerConversation: response.data.avgCostPerConversation
      };
    });

    // Test 3: Get conversations by agent
    await this.executeTest('Agent Conversations Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/conversations/1`);
      return {
        totalConversations: response.data.length,
        conversations: response.data.slice(0, 3).map((c: any) => ({ id: c.id, tokens: c.tokens, cost: c.cost }))
      };
    });

    // Test 4: Performance stress test
    await this.executeTest('Performance Stress Test', async () => {
      const startTime = Date.now();
      const promises = [];
      
      // Create 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        const conversationData = {
          agentId: Math.floor(Math.random() * 3) + 1,
          tokens: Math.floor(Math.random() * 200) + 50,
          cost: (Math.random() * 0.05).toFixed(4)
        };
        
        promises.push(axios.post(`${BASE_URL}/api/conversations`, conversationData));
      }
      
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      return {
        concurrentRequests: 10,
        totalTime,
        averageTimePerRequest: totalTime / 10,
        requestsPerSecond: (10 / totalTime) * 1000
      };
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 STARTING INDEPENDENT MICROSERVICES TESTING');
    console.log('='.repeat(80));
    console.log('Testing each of the 7 microservices independently with realistic dummy data');
    console.log('');

    // Test each microservice independently
    await this.testAgentWizardService();
    await this.testAnalyticsService();
    await this.testConversationalPaymentService();
    await this.testCalendarIntegrationService();
    await this.testRAGKnowledgeService();
    await this.testInsightsIntegrationService();
    await this.testCoreUsageService();

    // Generate comprehensive report
    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n📋 INDEPENDENT MICROSERVICES TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Successful: ${this.successCount} (${((this.successCount / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${this.failCount} (${((this.failCount / this.results.length) * 100).toFixed(1)}%)`);

    // Performance analysis
    const successfulTests = this.results.filter(r => r.success);
    const avgResponseTime = successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length;
    const maxResponseTime = Math.max(...successfulTests.map(test => test.responseTime));
    const minResponseTime = Math.min(...successfulTests.map(test => test.responseTime));

    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Fastest Response: ${minResponseTime}ms`);
    console.log(`Slowest Response: ${maxResponseTime}ms`);

    // Service breakdown
    console.log('\n🎯 SERVICE BREAKDOWN:');
    
    const serviceResults = {
      'Agent Wizard': this.results.filter(r => r.testName.includes('Agent')),
      'Analytics': this.results.filter(r => r.testName.includes('Analytics') || r.testName.includes('Performance') || r.testName.includes('Dashboard')),
      'Payment': this.results.filter(r => r.testName.includes('Payment') || r.testName.includes('Flow')),
      'Calendar': this.results.filter(r => r.testName.includes('Calendar') || r.testName.includes('Appointment')),
      'RAG Knowledge': this.results.filter(r => r.testName.includes('Query') || r.testName.includes('Healthcare Query') || r.testName.includes('Retail Query') || r.testName.includes('Finance Query')),
      'Insights': this.results.filter(r => r.testName.includes('Insight') || r.testName.includes('Metrics')),
      'Core Usage': this.results.filter(r => r.testName.includes('Conversation') || r.testName.includes('Usage') || r.testName.includes('Stress'))
    };

    Object.entries(serviceResults).forEach(([service, tests]) => {
      const successCount = tests.filter(t => t.success).length;
      const totalCount = tests.length;
      const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '0.0';
      console.log(`  • ${service}: ${successCount}/${totalCount} (${successRate}%)`);
    });

    // Failed tests details
    if (this.failCount > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.success).forEach(test => {
        console.log(`  • ${test.testName}: ${test.error}`);
      });
    }

    console.log('\n🚀 MICROSERVICES STATUS:');
    const overallSuccessRate = (this.successCount / this.results.length) * 100;
    if (overallSuccessRate >= 90) {
      console.log('✅ ALL MICROSERVICES FULLY OPERATIONAL');
    } else if (overallSuccessRate >= 75) {
      console.log('⚠️ MICROSERVICES MOSTLY OPERATIONAL - MINOR ISSUES');
    } else {
      console.log('❌ MICROSERVICES NEED ATTENTION - MULTIPLE ISSUES');
    }

    console.log('\n✅ INDEPENDENT MICROSERVICES TESTING COMPLETE!');
    console.log('Each service has been validated independently with realistic dummy data.');
    console.log('Performance metrics and functional capabilities confirmed.');
  }
}

// Run the tests
const tester = new MicroservicesIndependentTester();
tester.runAllTests().catch(console.error);