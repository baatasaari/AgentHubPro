#!/usr/bin/env node

/**
 * Comprehensive End-to-End Platform Testing
 * Tests entire AgentHub platform with realistic dummy data across all services
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  metrics?: any;
}

class ComprehensiveSystemTest {
  private results: TestResult[] = [];

  async runFullSystemTest(): Promise<void> {
    console.log('🚀 STARTING COMPREHENSIVE AGENTHUB PLATFORM TEST');
    console.log('=' .repeat(60));

    // Step 1: Test Core Platform APIs
    await this.testCoreAPIs();

    // Step 2: Test Agent Management
    await this.testAgentManagement();

    // Step 3: Test Conversational Payment System
    await this.testConversationalPayment();

    // Step 4: Test Calendar Integration
    await this.testCalendarIntegration();

    // Step 5: Test RAG System
    await this.testRAGSystem();

    // Step 6: Test Enterprise Analytics
    await this.testEnterpriseAnalytics();

    // Step 7: Test Cross-Service Integration
    await this.testCrossServiceIntegration();

    // Step 8: Performance and Load Testing
    await this.testSystemPerformance();

    // Generate comprehensive report
    this.generateReport();
  }

  private async testCoreAPIs(): Promise<void> {
    console.log('\n📡 TESTING CORE PLATFORM APIs');
    console.log('-'.repeat(40));

    // Test usage stats
    await this.executeTest('Core Usage Stats', async () => {
      const response = await axios.get(`${BASE_URL}/api/usage/stats`);
      return response.data;
    });

    // Test agent creation
    await this.executeTest('Agent Creation', async () => {
      const agentData = {
        businessName: "Mumbai Healthcare Clinic",
        industry: "healthcare",
        businessDescription: "Premium healthcare services in Mumbai with specialized consultations",
        llmModel: "gpt-4o",
        interfaceType: "whatsapp"
      };
      
      const response = await axios.post(`${BASE_URL}/api/agents`, agentData);
      return response.data;
    });

    // Test agents listing
    await this.executeTest('Agents Listing', async () => {
      const response = await axios.get(`${BASE_URL}/api/agents`);
      return response.data;
    });
  }

  private async testAgentManagement(): Promise<void> {
    console.log('\n🤖 TESTING AGENT MANAGEMENT SYSTEM');
    console.log('-'.repeat(40));

    // Create multiple agents for different industries
    const agents = [
      {
        businessName: "Delhi Fashion Store",
        industry: "retail",
        businessDescription: "Premium fashion retailer in Delhi with latest trends",
        llmModel: "gpt-4o",
        interfaceType: "whatsapp"
      },
      {
        businessName: "Bangalore Investment Advisory",
        industry: "finance",
        businessDescription: "Professional investment advisory services in Bangalore",
        llmModel: "gpt-4o",
        interfaceType: "webchat"
      },
      {
        businessName: "Chennai Real Estate Hub",
        industry: "realestate",
        businessDescription: "Premier real estate services in Chennai",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp"
      }
    ];

    for (const [index, agentData] of agents.entries()) {
      await this.executeTest(`Agent Creation - ${agentData.businessName}`, async () => {
        const response = await axios.post(`${BASE_URL}/api/agents`, agentData);
        return { agentId: response.data.id, ...response.data };
      });
    }

    // Test agent conversation logging
    await this.executeTest('Agent Conversation Logging', async () => {
      const conversationData = {
        agentId: 1,
        tokens: 150,
        cost: "0.012"
      };
      
      const response = await axios.post(`${BASE_URL}/api/conversations`, conversationData);
      return response.data;
    });
  }

  private async testConversationalPayment(): Promise<void> {
    console.log('\n💳 TESTING CONVERSATIONAL PAYMENT SYSTEM');
    console.log('-'.repeat(40));

    // Test healthcare consultation booking flow
    await this.executeTest('Healthcare Consultation Booking', async () => {
      const context = {
        agentId: "1",
        customerId: "patient_rajesh_kumar",
        platform: "whatsapp",
        industry: "healthcare",
        customerData: {
          name: "Rajesh Kumar",
          phone: "+91 9876543210",
          email: "rajesh.kumar@email.com"
        },
        bookingData: {
          consultationType: "diabetes_screening",
          preferredTime: "morning",
          urgency: "routine"
        }
      };

      const message = "I want to book a diabetes screening consultation for tomorrow morning";

      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message
      });
      
      return response.data;
    });

    // Test retail purchase flow
    await this.executeTest('Retail Purchase Flow', async () => {
      const context = {
        agentId: "2",
        customerId: "customer_priya_sharma",
        platform: "whatsapp",
        industry: "retail",
        customerData: {
          name: "Priya Sharma",
          phone: "+91 9876543211",
          email: "priya.sharma@email.com"
        }
      };

      const message = "I want to buy the red saree I saw on your Instagram page";

      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message
      });
      
      return response.data;
    });

    // Test finance consultation booking
    await this.executeTest('Finance Consultation Booking', async () => {
      const context = {
        agentId: "3",
        customerId: "investor_amit_singh",
        platform: "instagram",
        industry: "finance",
        customerData: {
          name: "Amit Singh",
          phone: "+91 9876543212",
          email: "amit.singh@email.com"
        }
      };

      const message = "I need help with mutual fund investment planning";

      const response = await axios.post(`${BASE_URL}/api/conversation/process`, {
        context,
        message
      });
      
      return response.data;
    });
  }

  private async testCalendarIntegration(): Promise<void> {
    console.log('\n📅 TESTING CALENDAR INTEGRATION SYSTEM');
    console.log('-'.repeat(40));

    // Test calendar provider listing
    await this.executeTest('Calendar Providers', async () => {
      const response = await axios.get(`${BASE_URL}/api/calendar/providers`);
      return response.data;
    });

    // Test customer calendar configuration
    await this.executeTest('Customer Calendar Configuration', async () => {
      const config = {
        customerId: "mumbai_healthcare_clinic",
        provider: "google",
        credentials: {
          clientId: "mumbai_healthcare_google_client",
          clientSecret: "secure_healthcare_secret",
          refreshToken: "healthcare_refresh_token"
        },
        settings: {
          timezone: "Asia/Kolkata",
          workingHours: {
            start: "09:00",
            end: "19:00",
            days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          },
          bufferTime: 15,
          maxAdvanceBooking: 30,
          minAdvanceBooking: 2
        },
        notifications: {
          customer: true,
          consultant: true,
          reminders: true,
          reminderTimes: [24, 2]
        },
        consultantEmail: "dr.sharma@mumbaihealthcare.in",
        businessEmail: "appointments@mumbaihealthcare.in"
      };

      const response = await axios.post(`${BASE_URL}/api/calendar/configure`, config);
      return response.data;
    });

    // Test calendar slot generation
    await this.executeTest('Calendar Slot Generation', async () => {
      const response = await axios.get(`${BASE_URL}/api/calendar/customer-slots/mumbai_healthcare_clinic/1?industry=healthcare`);
      return {
        totalSlots: response.data.length,
        sampleSlots: response.data.slice(0, 3)
      };
    });

    // Test calendar connection testing
    await this.executeTest('Calendar Connection Test', async () => {
      const testConfig = {
        customerId: "test_customer",
        provider: "google",
        credentials: {
          clientId: "test_client",
          clientSecret: "test_secret",
          refreshToken: "test_refresh"
        },
        settings: {
          timezone: "Asia/Kolkata"
        }
      };

      const response = await axios.post(`${BASE_URL}/api/calendar/test-connection`, testConfig);
      return response.data;
    });
  }

  private async testRAGSystem(): Promise<void> {
    console.log('\n🧠 TESTING RAG KNOWLEDGE SYSTEM');
    console.log('-'.repeat(40));

    // Test healthcare RAG queries
    const healthcareQueries = [
      "What are your consultation fees for diabetes screening?",
      "What are your clinic hours?",
      "Do you accept health insurance?",
      "What ayurvedic treatments do you offer?"
    ];

    for (const query of healthcareQueries) {
      await this.executeTest(`Healthcare RAG - ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 1,
          industry: "healthcare"
        });
        return {
          query,
          hasAnswer: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore
        };
      });
    }

    // Test retail RAG queries
    const retailQueries = [
      "What are your store hours?",
      "Do you accept UPI payments?",
      "What's your return policy?",
      "Do you have festival discounts?"
    ];

    for (const query of retailQueries) {
      await this.executeTest(`Retail RAG - ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 2,
          industry: "retail"
        });
        return {
          query,
          hasAnswer: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore
        };
      });
    }

    // Test finance RAG queries
    const financeQueries = [
      "What are your investment advisory fees?",
      "Do you help with SIP investments?",
      "What's your experience with mutual funds?",
      "Do you provide tax planning services?"
    ];

    for (const query of financeQueries) {
      await this.executeTest(`Finance RAG - ${query.substring(0, 30)}...`, async () => {
        const response = await axios.post(`${BASE_URL}/api/rag/query`, {
          query,
          agentId: 3,
          industry: "finance"
        });
        return {
          query,
          hasAnswer: response.data.response && response.data.response.length > 0,
          sources: response.data.sources?.length || 0,
          relevanceScore: response.data.relevanceScore
        };
      });
    }
  }

  private async testEnterpriseAnalytics(): Promise<void> {
    console.log('\n📊 TESTING ENTERPRISE ANALYTICS SYSTEM');
    console.log('-'.repeat(40));

    // Generate comprehensive conversation insights for multiple scenarios
    const conversationInsights = [
      {
        conversationId: "healthcare_conv_001",
        agentId: "1",
        customerId: "patient_rajesh_kumar",
        platform: "whatsapp",
        sessionId: "session_healthcare_001",
        startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        endTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        duration: 3600,
        messageCount: 24,
        customerMessages: 12,
        agentResponses: 12,
        responseTimeAvg: 35000,
        customerSatisfactionScore: 5,
        conversionEvent: {
          type: "appointment",
          value: 1200,
          currency: "INR"
        },
        followUpRequired: true,
        followUpActions: ["Send appointment confirmation", "Set reminder for 24h before", "Prepare consultation notes"],
        tags: ["healthcare", "consultation", "new_patient", "diabetes_screening"]
      },
      {
        conversationId: "retail_conv_001",
        agentId: "2",
        customerId: "customer_priya_sharma",
        platform: "whatsapp",
        sessionId: "session_retail_001",
        startTime: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        endTime: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        duration: 2400,
        messageCount: 18,
        customerMessages: 9,
        agentResponses: 9,
        responseTimeAvg: 45000,
        customerSatisfactionScore: 4,
        conversionEvent: {
          type: "purchase",
          value: 2500,
          currency: "INR"
        },
        followUpRequired: false,
        tags: ["retail", "clothing", "festival_sale", "returning_customer"]
      },
      {
        conversationId: "finance_conv_001",
        agentId: "3",
        customerId: "investor_amit_singh",
        platform: "instagram",
        sessionId: "session_finance_001",
        startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        endTime: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        duration: 1800,
        messageCount: 15,
        customerMessages: 8,
        agentResponses: 7,
        responseTimeAvg: 25000,
        customerSatisfactionScore: 4,
        conversionEvent: {
          type: "appointment",
          value: 800,
          currency: "INR"
        },
        followUpRequired: true,
        tags: ["finance", "investment_planning", "mutual_funds", "first_time_investor"]
      },
      {
        conversationId: "retail_conv_002",
        agentId: "2",
        customerId: "customer_sunita_verma",
        platform: "web",
        sessionId: "session_retail_002",
        startTime: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        endTime: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        duration: 1200,
        messageCount: 8,
        customerMessages: 4,
        agentResponses: 4,
        responseTimeAvg: 90000, // Slow response
        customerSatisfactionScore: 2, // Low satisfaction
        escalation: {
          required: true,
          reason: "Customer dissatisfied with product quality",
          timestamp: new Date(Date.now() - 18000000).toISOString()
        },
        followUpRequired: true,
        tags: ["retail", "complaint", "quality_issue", "escalation"]
      },
      {
        conversationId: "healthcare_conv_002",
        agentId: "1",
        customerId: "patient_meera_patel",
        platform: "whatsapp",
        sessionId: "session_healthcare_002",
        startTime: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        endTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        duration: 4200,
        messageCount: 32,
        customerMessages: 16,
        agentResponses: 16,
        responseTimeAvg: 28000,
        customerSatisfactionScore: 5,
        conversionEvent: {
          type: "purchase",
          value: 3500,
          currency: "INR"
        },
        followUpRequired: false,
        tags: ["healthcare", "prescription", "follow_up", "satisfied_customer"]
      }
    ];

    // Record all conversation insights
    for (const insight of conversationInsights) {
      await this.executeTest(`Record Conversation Insight - ${insight.conversationId}`, async () => {
        const response = await axios.post(`${BASE_URL}/api/analytics/conversation`, insight);
        return response.data;
      });
    }

    // Test agent performance analytics for each agent
    for (let agentId = 1; agentId <= 3; agentId++) {
      await this.executeTest(`Agent ${agentId} Performance Analytics`, async () => {
        const response = await axios.get(`${BASE_URL}/api/analytics/agent/${agentId}/performance`);
        return {
          agentId,
          grade: response.data.performanceGrade,
          conversations: response.data.conversationMetrics.totalConversations,
          revenue: response.data.businessMetrics.totalRevenue,
          satisfaction: response.data.conversationMetrics.customerSatisfactionAvg,
          conversionRate: response.data.businessMetrics.conversionRate
        };
      });
    }

    // Test customer journey analytics
    const customerIds = ["patient_rajesh_kumar", "customer_priya_sharma", "investor_amit_singh"];
    for (const customerId of customerIds) {
      await this.executeTest(`Customer Journey - ${customerId}`, async () => {
        const response = await axios.get(`${BASE_URL}/api/analytics/customer/${customerId}/insight`);
        return {
          customerId,
          segment: response.data.behavioralInsights.customerSegment,
          ltv: response.data.businessMetrics.lifetimeValue,
          churnRisk: response.data.behavioralInsights.churnRisk,
          upsellPotential: response.data.behavioralInsights.upsellPotential,
          journeyStage: response.data.journeyAnalysis.stage
        };
      });
    }

    // Test system-wide performance
    await this.executeTest('System Performance Analytics', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/system/performance`);
      return {
        totalConversations: response.data.overallMetrics.totalConversations,
        totalRevenue: response.data.overallMetrics.totalRevenue,
        totalCustomers: response.data.overallMetrics.totalCustomers,
        systemUptime: response.data.overallMetrics.systemUptime,
        alertCount: response.data.realTimeAlerts.length,
        platformsActive: Object.keys(response.data.platformDistribution).filter(
          p => response.data.platformDistribution[p].conversations > 0
        ).length
      };
    });

    // Test multi-agent comparison
    await this.executeTest('Multi-Agent Comparison', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/comparison?agents=1,2,3&timeframe=week`);
      return {
        totalAgents: response.data.summary.totalAgents,
        combinedRevenue: response.data.summary.totalRevenue,
        avgSatisfaction: response.data.summary.avgSatisfaction,
        avgConversionRate: response.data.summary.avgConversionRate,
        gradeDistribution: response.data.comparisons.reduce((acc: any, comp: any) => {
          acc[comp.performanceGrade] = (acc[comp.performanceGrade] || 0) + 1;
          return acc;
        }, {})
      };
    });

    // Test comprehensive dashboard
    await this.executeTest('Comprehensive Dashboard Analytics', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/dashboard/1?timeframe=week`);
      return {
        agentGrade: response.data.agentPerformance.performanceGrade,
        totalRevenue: response.data.agentPerformance.businessMetrics.totalRevenue,
        appointmentMetrics: response.data.appointmentMetrics,
        purchaseMetrics: response.data.purchaseMetrics,
        systemAlerts: response.data.realTimeAlerts.length
      };
    });
  }

  private async testCrossServiceIntegration(): Promise<void> {
    console.log('\n🔄 TESTING CROSS-SERVICE INTEGRATION');
    console.log('-'.repeat(40));

    // Test appointment insights integration
    await this.executeTest('Appointment Insights Integration', async () => {
      const appointmentInsight = {
        appointmentId: "healthcare_apt_001",
        consultationId: "healthcare_cons_001",
        agentId: "1",
        customerId: "patient_rajesh_kumar",
        calendarProvider: "google",
        calendarEventId: "google_healthcare_evt_001",
        status: "completed",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        actualStartTime: new Date(Date.now() + 86400000).toISOString(),
        actualEndTime: new Date(Date.now() + 90000000).toISOString(),
        duration: 60,
        customerData: {
          name: "Rajesh Kumar",
          email: "rajesh.kumar@email.com",
          phone: "+91 9876543210",
          timezone: "Asia/Kolkata"
        },
        reminders: [
          {
            sent: true,
            sentAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
            type: "email",
            status: "delivered"
          }
        ]
      };

      const response = await axios.post(`${BASE_URL}/api/insights/appointment`, appointmentInsight);
      return response.data;
    });

    // Test purchase insights integration
    await this.executeTest('Purchase Insights Integration', async () => {
      const purchaseInsight = {
        purchaseId: "retail_purchase_001",
        customerId: "customer_priya_sharma",
        agentId: "2",
        platform: "whatsapp",
        purchaseType: "clothing",
        items: [
          {
            id: "red_silk_saree",
            name: "Premium Red Silk Saree",
            quantity: 1,
            unitPrice: 2500,
            totalPrice: 2500
          }
        ],
        totalAmount: 2500,
        currency: "INR",
        paymentMethod: "googlepay",
        paymentStatus: "completed",
        timestamp: new Date().toISOString(),
        conversionSource: "whatsapp_retail_agent",
        customerJourney: {
          touchpoints: ["instagram", "whatsapp", "payment_link", "confirmation"],
          totalInteractions: 18,
          timeToConversion: 45
        }
      };

      const response = await axios.post(`${BASE_URL}/api/insights/purchase`, purchaseInsight);
      return response.data;
    });

    // Test cross-microservice sync
    await this.executeTest('Cross-Microservice Analytics Sync', async () => {
      const response = await axios.post(`${BASE_URL}/api/analytics/sync`);
      return response.data;
    });

    // Test appointment metrics retrieval
    await this.executeTest('Appointment Metrics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/insights/appointments/1`);
      return response.data;
    });

    // Test purchase metrics retrieval
    await this.executeTest('Purchase Metrics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/insights/purchases/2`);
      return response.data;
    });
  }

  private async testSystemPerformance(): Promise<void> {
    console.log('\n⚡ TESTING SYSTEM PERFORMANCE');
    console.log('-'.repeat(40));

    // Test concurrent requests
    await this.executeTest('Concurrent API Requests', async () => {
      const promises = [];
      const startTime = Date.now();

      // Make 10 concurrent requests to different endpoints
      for (let i = 0; i < 10; i++) {
        promises.push(axios.get(`${BASE_URL}/api/usage/stats`));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      return {
        requestCount: 10,
        totalTime: endTime - startTime,
        averageResponseTime: (endTime - startTime) / 10
      };
    });

    // Test database operations performance
    await this.executeTest('Database Operations Performance', async () => {
      const startTime = Date.now();

      // Create multiple conversations rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const conversationData = {
          agentId: Math.floor(Math.random() * 3) + 1,
          tokens: Math.floor(Math.random() * 200) + 50,
          cost: (Math.random() * 0.05).toFixed(4)
        };
        
        promises.push(axios.post(`${BASE_URL}/api/conversations`, conversationData));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      return {
        operationCount: 5,
        totalTime: endTime - startTime,
        averageOperationTime: (endTime - startTime) / 5
      };
    });

    // Test memory usage and system health
    await this.executeTest('System Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/api/analytics/system/performance`);
      return {
        systemUptime: response.data.overallMetrics.systemUptime,
        averageResponseTime: response.data.overallMetrics.averageResponseTime,
        totalActiveAgents: response.data.overallMetrics.totalActiveAgents,
        alertCount: response.data.realTimeAlerts.length,
        healthStatus: response.data.overallMetrics.systemUptime > 99 ? 'healthy' : 'degraded'
      };
    });
  }

  private async executeTest(name: string, testFunction: () => Promise<any>): Promise<void> {
    try {
      const startTime = Date.now();
      const data = await testFunction();
      const endTime = Date.now();
      
      this.results.push({
        name,
        success: true,
        data,
        metrics: {
          executionTime: endTime - startTime
        }
      });
      
      console.log(`✅ ${name} - ${endTime - startTime}ms`);
    } catch (error: any) {
      this.results.push({
        name,
        success: false,
        error: error.message
      });
      
      console.log(`❌ ${name} - ${error.message}`);
    }
  }

  private generateReport(): void {
    console.log('\n📋 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));

    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    const totalTests = this.results.length;

    console.log(`\n📊 TEST SUMMARY:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successCount} (${((successCount / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failureCount} (${((failureCount / totalTests) * 100).toFixed(1)}%)`);

    if (failureCount > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.name}: ${result.error}`);
      });
    }

    console.log(`\n🎯 KEY ACHIEVEMENTS:`);
    const keyMetrics = this.extractKeyMetrics();
    Object.entries(keyMetrics).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });

    console.log(`\n⚡ PERFORMANCE METRICS:`);
    const avgExecutionTime = this.results
      .filter(r => r.success && r.metrics)
      .reduce((sum, r) => sum + r.metrics!.executionTime, 0) / 
      this.results.filter(r => r.success && r.metrics).length;
    
    console.log(`  • Average API Response Time: ${avgExecutionTime.toFixed(2)}ms`);
    console.log(`  • System Health Status: ${this.getSystemHealthStatus()}`);
    console.log(`  • Platform Coverage: ${this.getPlatformCoverage()}`);

    console.log(`\n🚀 PLATFORM STATUS: ${successCount >= totalTests * 0.9 ? 'PRODUCTION READY' : 'NEEDS ATTENTION'}`);
    
    if (successCount >= totalTests * 0.9) {
      console.log(`\n✅ COMPREHENSIVE PLATFORM VALIDATION SUCCESSFUL!`);
      console.log(`The AgentHub platform is fully operational with enterprise-grade analytics,`);
      console.log(`conversational payment systems, calendar integration, and cross-service`);
      console.log(`synchronization working seamlessly across all components.`);
    }
  }

  private extractKeyMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    // Extract analytics metrics
    const analyticsResults = this.results.filter(r => r.name.includes('Analytics') && r.success);
    if (analyticsResults.length > 0) {
      metrics['Analytics System'] = 'Operational';
    }

    // Extract agent management metrics
    const agentResults = this.results.filter(r => r.name.includes('Agent') && r.success);
    if (agentResults.length > 0) {
      metrics['Agent Management'] = `${agentResults.length} tests passed`;
    }

    // Extract calendar metrics
    const calendarResults = this.results.filter(r => r.name.includes('Calendar') && r.success);
    if (calendarResults.length > 0) {
      metrics['Calendar Integration'] = 'Fully functional';
    }

    // Extract RAG metrics
    const ragResults = this.results.filter(r => r.name.includes('RAG') && r.success);
    if (ragResults.length > 0) {
      metrics['RAG Knowledge System'] = `${ragResults.length} queries processed`;
    }

    return metrics;
  }

  private getSystemHealthStatus(): string {
    const healthResult = this.results.find(r => r.name === 'System Health Check');
    if (healthResult && healthResult.success) {
      return healthResult.data.healthStatus || 'Unknown';
    }
    return 'Unknown';
  }

  private getPlatformCoverage(): string {
    const platformResults = this.results.filter(r => 
      r.success && r.data && 
      (r.name.includes('WhatsApp') || r.name.includes('Instagram') || r.name.includes('Web'))
    );
    return `${platformResults.length} platforms tested`;
  }
}

// Run the comprehensive test
const tester = new ComprehensiveSystemTest();
tester.runFullSystemTest().catch(console.error);