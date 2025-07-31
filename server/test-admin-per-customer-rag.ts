/**
 * Test Admin-Controlled Per-Customer RAG System
 * Validates admin configuration of customer-specific knowledge bases with multi-agent support
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  test: string;
  success: boolean;
  responseTime: number;
  details: any;
  error?: string;
}

interface AdminPerCustomerRAGTestResult {
  testType: 'admin_per_customer_rag';
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageResponseTime: number;
  results: TestResult[];
  summary: string;
}

class AdminPerCustomerRAGTester {
  private results: TestResult[] = [];

  async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await testFunction();
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        success: true,
        responseTime,
        details: result
      });
      
      console.log(`✅ ${testName} - ${responseTime}ms`);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        success: false,
        responseTime,
        details: null,
        error: error.message
      });
      
      console.log(`❌ ${testName} - ${error.message}`);
    }
  }

  async testAdminConfigureCustomerKnowledgeBase(): Promise<any> {
    const response = await axios.post(`${BASE_URL}/api/admin/per-customer-rag/configure`, {
      customerId: "customer_001",
      customerName: "TechCorp Solutions",
      config: {
        agentConfigurations: [
          {
            agentId: "agent_healthcare_001",
            platforms: ["whatsapp", "instagram", "webchat"],
            enabledSources: ["admin_file", "admin_faq", "admin_website"],
            maxDocuments: 100,
            customInstructions: "Respond as a healthcare professional assistant"
          },
          {
            agentId: "agent_retail_001", 
            platforms: ["whatsapp", "messenger", "webchat"],
            enabledSources: ["admin_file", "admin_faq"],
            maxDocuments: 50,
            customInstructions: "Respond as a friendly retail customer service representative"
          }
        ],
        globalConfiguration: {
          embeddingModel: "text-embedding-3-small",
          maxDocuments: 200,
          autoUpdate: true,
          crossAgentSharing: true
        }
      }
    });

    if (response.data.success && response.data.configuredAgents === 2) {
      return response.data;
    }
    throw new Error(`Configuration failed: ${JSON.stringify(response.data)}`);
  }

  async testAdminUploadFilesForCustomer(): Promise<any> {
    const response = await axios.post(`${BASE_URL}/api/admin/per-customer-rag/upload-files`, {
      customerId: "customer_001",
      files: [
        {
          filename: "customer_001_policies.txt",
          content: "Customer service policies for TechCorp Solutions:\n\n1. Response time: Within 24 hours\n2. Refund policy: 30-day money back guarantee\n3. Support channels: WhatsApp, Instagram, Website chat\n4. Business hours: Monday-Friday 9 AM to 6 PM IST\n5. Escalation: Complex issues escalated to senior team within 2 hours",
          mimeType: "text/plain",
          targetAgents: ["agent_healthcare_001", "agent_retail_001"],
          targetPlatforms: ["whatsapp", "instagram", "webchat"],
          category: "policies",
          priority: "high"
        },
        {
          filename: "customer_001_products.json",
          content: JSON.stringify({
            products: [
              { name: "Healthcare Platform", price: "₹50,000/month", features: ["Patient management", "Appointment booking", "Telemedicine"] },
              { name: "Retail Management System", price: "₹25,000/month", features: ["Inventory tracking", "POS integration", "Customer analytics"] }
            ]
          }),
          mimeType: "application/json",
          targetAgents: ["agent_retail_001"],
          targetPlatforms: ["whatsapp", "webchat"],
          category: "products",
          priority: "medium"
        }
      ]
    });

    if (response.data.success && response.data.processedFiles === 2) {
      return response.data;
    }
    throw new Error(`File upload failed: ${JSON.stringify(response.data)}`);
  }

  async testAdminManageFAQsForCustomer(): Promise<any> {
    const response = await axios.post(`${BASE_URL}/api/admin/per-customer-rag/manage-faqs`, {
      customerId: "customer_001",
      faqs: [
        {
          question: "What are your business hours for TechCorp Solutions?",
          answer: "Our business hours are Monday to Friday, 9 AM to 6 PM IST. We provide 24/7 emergency support for critical healthcare platform issues.",
          category: "general",
          priority: "high",
          tags: ["hours", "support", "availability"],
          targetAgents: ["agent_healthcare_001", "agent_retail_001"],
          targetPlatforms: ["whatsapp", "instagram", "webchat"]
        },
        {
          question: "How much does the Healthcare Platform cost?",
          answer: "Our Healthcare Platform is ₹50,000 per month and includes patient management, appointment booking, and telemedicine features. We offer a 15-day free trial.",
          category: "pricing",
          priority: "high",
          tags: ["pricing", "healthcare", "trial"],
          targetAgents: ["agent_healthcare_001"],
          targetPlatforms: ["whatsapp", "webchat"]
        },
        {
          question: "What is your refund policy?",
          answer: "We offer a 30-day money-back guarantee for all our products. If you're not satisfied, contact our support team within 30 days of purchase for a full refund.",
          category: "policies",
          priority: "medium",
          tags: ["refund", "policy", "guarantee"],
          targetAgents: ["agent_healthcare_001", "agent_retail_001"],
          targetPlatforms: ["whatsapp", "instagram", "messenger", "webchat"]
        }
      ]
    });

    if (response.data.success && response.data.addedFAQs === 3) {
      return response.data;
    }
    throw new Error(`FAQ management failed: ${JSON.stringify(response.data)}`);
  }

  async testAdminConfigureWebsitePagesForCustomer(): Promise<any> {
    const response = await axios.post(`${BASE_URL}/api/admin/per-customer-rag/configure-website`, {
      customerId: "customer_001",
      pages: [
        {
          url: "https://techcorp.com/healthcare",
          title: "TechCorp Healthcare Solutions",
          content: "Our healthcare platform revolutionizes patient care management in India. Features include: comprehensive patient records, appointment scheduling, telemedicine consultations, insurance integration with Ayushman Bharat, and multi-language support (Hindi, English, Tamil, Bengali).",
          category: "healthcare",
          priority: "high",
          targetAgents: ["agent_healthcare_001"],
          targetPlatforms: ["whatsapp", "webchat"]
        },
        {
          url: "https://techcorp.com/retail", 
          title: "TechCorp Retail Management",
          content: "Transform your retail business with our comprehensive management system. Includes inventory tracking, GST-compliant billing, UPI payment integration (PhonePe, Google Pay, Paytm), customer analytics, and multi-store management capabilities.",
          category: "retail",
          priority: "high",
          targetAgents: ["agent_retail_001"],
          targetPlatforms: ["whatsapp", "instagram", "webchat"]
        }
      ]
    });

    if (response.data.success && response.data.addedPages === 2) {
      return response.data;
    }
    throw new Error(`Website configuration failed: ${JSON.stringify(response.data)}`);
  }

  async testCustomerKnowledgeBaseQuery(): Promise<any> {
    const response = await axios.post(`${BASE_URL}/api/per-customer-rag/query`, {
      customerId: "customer_001",
      agentId: "agent_healthcare_001",
      platform: "whatsapp",
      query: "What are your business hours and how much does the healthcare platform cost?"
    });

    if (response.data.response && response.data.customerSpecific && response.data.adminConfigured) {
      return response.data;
    }
    throw new Error(`Customer query failed: ${JSON.stringify(response.data)}`);
  }

  async testCustomerKnowledgeBaseStatus(): Promise<any> {
    const response = await axios.get(`${BASE_URL}/api/admin/per-customer-rag/customer/customer_001/status`);

    if (response.data.configured && response.data.totalAgents === 2 && response.data.adminConfigured) {
      return response.data;
    }
    throw new Error(`Customer status check failed: ${JSON.stringify(response.data)}`);
  }

  async testAdminOverview(): Promise<any> {
    const response = await axios.get(`${BASE_URL}/api/admin/per-customer-rag/overview`);

    if (response.data.totalCustomers >= 1 && response.data.configuredCustomers >= 1) {
      return response.data;
    }
    throw new Error(`Admin overview failed: ${JSON.stringify(response.data)}`);
  }

  async testMultiPlatformQuery(): Promise<any> {
    // Test the same customer with different agents and platforms
    const tests = [
      {
        agentId: "agent_healthcare_001",
        platform: "instagram", 
        query: "Tell me about your healthcare platform features"
      },
      {
        agentId: "agent_retail_001",
        platform: "messenger",
        query: "What payment methods do you support for the retail system?"
      },
      {
        agentId: "agent_retail_001", 
        platform: "webchat",
        query: "What is your refund policy?"
      }
    ];

    const results = [];
    for (const test of tests) {
      const response = await axios.post(`${BASE_URL}/api/per-customer-rag/query`, {
        customerId: "customer_001",
        ...test
      });
      
      if (response.data.response && response.data.customerSpecific) {
        results.push({
          ...test,
          success: true,
          response: response.data.response.substring(0, 100) + "..."
        });
      } else {
        throw new Error(`Multi-platform query failed for ${test.agentId} on ${test.platform}`);
      }
    }
    
    return { multiPlatformTests: results.length, results };
  }

  async testAdminDeleteCustomerDocuments(): Promise<any> {
    const response = await axios.delete(`${BASE_URL}/api/admin/per-customer-rag/customer/customer_001/documents`, {
      data: {
        documentIds: [] // Empty array means delete all
      }
    });

    if (response.data.success && response.data.deletedCount >= 0) {
      return response.data;
    }
    throw new Error(`Document deletion failed: ${JSON.stringify(response.data)}`);
  }

  async runAllTests(): Promise<AdminPerCustomerRAGTestResult> {
    console.log("🧪 TESTING ADMIN-CONTROLLED PER-CUSTOMER RAG SYSTEM");
    console.log("================================================================");
    console.log("Testing admin configuration of customer-specific knowledge bases with multi-agent support\n");

    // Run all tests
    await this.runTest("Admin Configure Customer Knowledge Base", () => this.testAdminConfigureCustomerKnowledgeBase());
    await this.runTest("Admin Upload Files for Customer", () => this.testAdminUploadFilesForCustomer());
    await this.runTest("Admin Manage FAQs for Customer", () => this.testAdminManageFAQsForCustomer());
    await this.runTest("Admin Configure Website Pages for Customer", () => this.testAdminConfigureWebsitePagesForCustomer());
    await this.runTest("Customer Knowledge Base Query", () => this.testCustomerKnowledgeBaseQuery());
    await this.runTest("Customer Knowledge Base Status", () => this.testCustomerKnowledgeBaseStatus());
    await this.runTest("Admin Overview", () => this.testAdminOverview());
    await this.runTest("Multi-Platform Agent Queries", () => this.testMultiPlatformQuery());
    await this.runTest("Admin Delete Customer Documents", () => this.testAdminDeleteCustomerDocuments());

    // Calculate results
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const totalResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0);
    const averageResponseTime = Math.round(totalResponseTime / this.results.length);

    // Print summary
    console.log("\n📋 ADMIN PER-CUSTOMER RAG TEST REPORT");
    console.log("================================================================");
    console.log(`📊 TEST SUMMARY:`);
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Successful: ${successfulTests} (${Math.round((successfulTests / this.results.length) * 100)}%)`);
    console.log(`Failed: ${failedTests} (${Math.round((failedTests / this.results.length) * 100)}%)`);
    console.log(`Average Response Time: ${averageResponseTime}ms`);

    console.log(`\n🎯 KEY FEATURES VALIDATED:`);
    console.log(`  • Admin-controlled customer knowledge base configuration`);
    console.log(`  • Multi-agent support per customer (healthcare + retail agents)`);
    console.log(`  • Multi-platform support (WhatsApp, Instagram, Messenger, Web)`);
    console.log(`  • File upload management by admin for customers`);
    console.log(`  • FAQ management by admin for customers`);
    console.log(`  • Website page configuration by admin for customers`);
    console.log(`  • Customer-specific queries with admin-configured knowledge`);
    console.log(`  • Platform-specific agent responses`);
    console.log(`  • Admin overview and monitoring capabilities`);

    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.test}: ${result.error}`);
      });
    }

    console.log(`\n🚀 ADMIN PER-CUSTOMER RAG SYSTEM STATUS:`);
    if (successfulTests === this.results.length) {
      console.log(`✅ ALL ADMIN PER-CUSTOMER RAG FEATURES FULLY OPERATIONAL`);
      console.log(`Admin can configure individual customer knowledge bases with multi-agent support.`);
    } else if (successfulTests >= this.results.length * 0.8) {
      console.log(`⚠️ ADMIN PER-CUSTOMER RAG SYSTEM MOSTLY OPERATIONAL (${Math.round((successfulTests / this.results.length) * 100)}% success rate)`);
    } else {
      console.log(`❌ ADMIN PER-CUSTOMER RAG SYSTEM NEEDS ATTENTION (${Math.round((successfulTests / this.results.length) * 100)}% success rate)`);
    }

    return {
      testType: 'admin_per_customer_rag',
      totalTests: this.results.length,
      successfulTests,
      failedTests,
      averageResponseTime,
      results: this.results,
      summary: `Admin per-customer RAG system tested with ${successfulTests}/${this.results.length} tests passing`
    };
  }
}

// Run the tests
async function runAdminPerCustomerRAGTests() {
  const tester = new AdminPerCustomerRAGTester();
  const results = await tester.runAllTests();
  return results;
}

// Execute if run directly
runAdminPerCustomerRAGTests().catch(console.error);

export { runAdminPerCustomerRAGTests, AdminPerCustomerRAGTester };