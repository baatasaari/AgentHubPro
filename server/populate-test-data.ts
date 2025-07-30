// Populate platform with comprehensive test data
import { InsightsIntegrationService, PaymentInsight } from './insights-integration';

async function populateTestData() {
  console.log('🗃️ POPULATING PLATFORM WITH COMPREHENSIVE TEST DATA\n');

  const insightsService = new InsightsIntegrationService();

  // Generate realistic test payment insights across platforms and industries
  const testInsights: PaymentInsight[] = [
    // WhatsApp Healthcare
    {
      consultationId: 'CONS_WA_001',
      agentId: '1',
      customerId: 'cust_rajesh_001',
      platform: 'whatsapp',
      industry: 'healthcare',
      paymentData: {
        amount: 750,
        currency: 'INR',
        method: 'googlepay',
        status: 'completed',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn_gp_001'
      },
      consultationData: {
        type: 'whatsapp',
        duration: 30,
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 5
      },
      customerData: {
        name: 'Rajesh Kumar',
        phone: '+91 9876543210',
        email: 'rajesh.kumar@gmail.com',
        location: 'Mumbai',
        isReturningCustomer: false
      },
      conversationMetrics: {
        messageCount: 8,
        responseTime: 45,
        conversionRate: 100,
        touchpoints: ['whatsapp', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 2250,
        acquisitionCost: 112.5,
        profitMargin: 525,
        revenueCategory: 'new_customer'
      }
    },

    // Instagram Legal
    {
      consultationId: 'CONS_IG_002',
      agentId: '2',
      customerId: 'cust_priya_002',
      platform: 'instagram',
      industry: 'legal',
      paymentData: {
        amount: 1200,
        currency: 'INR',
        method: 'phonepe',
        status: 'completed',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn_pp_002'
      },
      consultationData: {
        type: 'video',
        duration: 45,
        scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3.75 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 4
      },
      customerData: {
        name: 'Priya Sharma',
        phone: '+91 8765432109',
        email: 'priya.sharma@yahoo.com',
        location: 'Delhi',
        isReturningCustomer: false
      },
      conversationMetrics: {
        messageCount: 12,
        responseTime: 67,
        conversionRate: 100,
        touchpoints: ['instagram', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 3600,
        acquisitionCost: 180,
        profitMargin: 840,
        revenueCategory: 'new_customer'
      }
    },

    // Messenger Finance
    {
      consultationId: 'CONS_MSG_003',
      agentId: '3',
      customerId: 'cust_amit_003',
      platform: 'messenger',
      industry: 'finance',
      paymentData: {
        amount: 900,
        currency: 'INR',
        method: 'upi',
        status: 'completed',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn_upi_003'
      },
      consultationData: {
        type: 'phone',
        duration: 30,
        scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 5
      },
      customerData: {
        name: 'Amit Patel',
        phone: '+91 7654321098',
        email: 'amit.patel@hotmail.com',
        location: 'Bangalore',
        isReturningCustomer: true
      },
      conversationMetrics: {
        messageCount: 6,
        responseTime: 23,
        conversionRate: 100,
        touchpoints: ['messenger', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 4500,
        acquisitionCost: 135,
        profitMargin: 630,
        revenueCategory: 'repeat_customer'
      }
    },

    // WhatsApp Real Estate
    {
      consultationId: 'CONS_WA_004',
      agentId: '4',
      customerId: 'cust_sneha_004',
      platform: 'whatsapp',
      industry: 'realestate',
      paymentData: {
        amount: 650,
        currency: 'INR',
        method: 'paytm',
        status: 'completed',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn_pt_004'
      },
      consultationData: {
        type: 'video',
        duration: 30,
        scheduledAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 4
      },
      customerData: {
        name: 'Sneha Reddy',
        phone: '+91 6543210987',
        email: 'sneha.reddy@gmail.com',
        location: 'Hyderabad',
        isReturningCustomer: false
      },
      conversationMetrics: {
        messageCount: 10,
        responseTime: 52,
        conversionRate: 100,
        touchpoints: ['whatsapp', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 1950,
        acquisitionCost: 97.5,
        profitMargin: 455,
        revenueCategory: 'new_customer'
      }
    },

    // Instagram Technology
    {
      consultationId: 'CONS_IG_005',
      agentId: '5',
      customerId: 'cust_vikram_005',
      platform: 'instagram',
      industry: 'technology',
      paymentData: {
        amount: 1500,
        currency: 'INR',
        method: 'googlepay',
        status: 'completed',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn_gp_005'
      },
      consultationData: {
        type: 'video',
        duration: 60,
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 5
      },
      customerData: {
        name: 'Vikram Singh',
        phone: '+91 5432109876',
        email: 'vikram.singh@gmail.com',
        location: 'Pune',
        isReturningCustomer: false
      },
      conversationMetrics: {
        messageCount: 15,
        responseTime: 89,
        conversionRate: 100,
        touchpoints: ['instagram', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 4500,
        acquisitionCost: 225,
        profitMargin: 1050,
        revenueCategory: 'new_customer'
      }
    },

    // Additional WhatsApp Healthcare (Returning Customer)
    {
      consultationId: 'CONS_WA_006',
      agentId: '1',
      customerId: 'cust_rajesh_001',
      platform: 'whatsapp',
      industry: 'healthcare',
      paymentData: {
        amount: 1000,
        currency: 'INR',
        method: 'upi',
        status: 'completed',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        transactionId: 'txn_upi_006'
      },
      consultationData: {
        type: 'video',
        duration: 45,
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        customerSatisfaction: 5
      },
      customerData: {
        name: 'Rajesh Kumar',
        phone: '+91 9876543210',
        email: 'rajesh.kumar@gmail.com',
        location: 'Mumbai',
        isReturningCustomer: true
      },
      conversationMetrics: {
        messageCount: 5,
        responseTime: 18,
        conversionRate: 100,
        touchpoints: ['whatsapp', 'payment_link', 'booking_confirmation']
      },
      revenueAttribution: {
        customerLifetimeValue: 5250,
        acquisitionCost: 150,
        profitMargin: 700,
        revenueCategory: 'repeat_customer'
      }
    }
  ];

  console.log('📊 Recording payment insights...');
  for (const insight of testInsights) {
    await insightsService.recordPaymentInsight(insight);
    console.log(`✅ ${insight.customerData.name} - ${insight.platform} - ₹${insight.paymentData.amount} via ${insight.paymentData.method}`);
  }

  console.log('\n📈 PLATFORM DATA SUMMARY:');
  
  // Generate summary statistics
  const totalRevenue = testInsights.reduce((sum, insight) => sum + insight.paymentData.amount, 0);
  const platformBreakdown = testInsights.reduce((acc, insight) => {
    acc[insight.platform] = (acc[insight.platform] || 0) + insight.paymentData.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const industryBreakdown = testInsights.reduce((acc, insight) => {
    acc[insight.industry] = (acc[insight.industry] || 0) + insight.paymentData.amount;
    return acc;
  }, {} as Record<string, number>);

  const paymentMethodBreakdown = testInsights.reduce((acc, insight) => {
    acc[insight.paymentData.method] = (acc[insight.paymentData.method] || 0) + insight.paymentData.amount;
    return acc;
  }, {} as Record<string, number>);

  console.log(`💰 Total Revenue: ₹${totalRevenue}`);
  console.log(`📊 Total Transactions: ${testInsights.length}`);
  console.log(`👥 Unique Customers: ${new Set(testInsights.map(i => i.customerId)).size}`);
  console.log(`⭐ Average Satisfaction: ${(testInsights.reduce((sum, i) => sum + (i.consultationData.customerSatisfaction || 0), 0) / testInsights.length).toFixed(1)}/5`);
  
  console.log('\n📱 Platform Breakdown:');
  Object.entries(platformBreakdown).forEach(([platform, revenue]) => {
    const count = testInsights.filter(i => i.platform === platform).length;
    console.log(`  ${platform}: ₹${revenue} (${count} transactions)`);
  });

  console.log('\n🏢 Industry Breakdown:');
  Object.entries(industryBreakdown).forEach(([industry, revenue]) => {
    const count = testInsights.filter(i => i.industry === industry).length;
    console.log(`  ${industry}: ₹${revenue} (${count} transactions)`);
  });

  console.log('\n💳 Payment Method Breakdown:');
  Object.entries(paymentMethodBreakdown).forEach(([method, revenue]) => {
    const count = testInsights.filter(i => i.paymentData.method === method).length;
    console.log(`  ${method}: ₹${revenue} (${count} transactions)`);
  });

  console.log('\n🎯 PLATFORM FULLY POPULATED WITH TEST DATA!');
  console.log('Visit the Conversational Payment Demo page to see live data in action.');
}

populateTestData().catch(console.error);