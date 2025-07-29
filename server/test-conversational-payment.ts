// Test conversational payment system
import { ConversationalPaymentService, ConversationContext } from './conversational-payment';
import { CalendarIntegrationService } from './calendar-integration';
import { InsightsIntegrationService } from './insights-integration';

async function testConversationalPayment() {
  console.log('🤖 Testing Conversational Payment System...\n');

  const paymentService = new ConversationalPaymentService();
  const calendarService = new CalendarIntegrationService();
  const insightsService = new InsightsIntegrationService();

  // Test WhatsApp conversation flow
  console.log('--- WhatsApp Consultation Flow ---');
  
  const whatsappContext: ConversationContext = {
    platform: 'whatsapp',
    customerId: 'cust_rajesh_123',
    agentId: '1',
    industry: 'healthcare',
    sessionId: 'session_wa_001',
    customerData: {
      name: 'Rajesh Kumar',
      phone: '+91 9876543210',
      email: 'rajesh@example.com'
    }
  };

  // Step 1: Customer asks for consultation
  console.log('Customer: "I need a diabetes consultation"');
  let result = await paymentService.processConversation(whatsappContext, "I need a diabetes consultation");
  console.log('Agent Response:', result.response);
  console.log('Actions:', result.actions.map(a => a.type));

  // Step 2: Customer selects slot
  console.log('\nCustomer: "I want slot 1"');
  result = await paymentService.processConversation(result.updatedContext, "I want slot 1");
  console.log('Agent Response:', result.response);

  // Step 3: Customer selects payment method
  console.log('\nCustomer: "Google Pay"');
  result = await paymentService.processConversation(result.updatedContext, "Google Pay");
  console.log('Agent Response:', result.response);
  console.log('Payment Actions:', result.actions.map(a => `${a.type}: ${a.data.consultationId || 'booking'}`));

  // Test Instagram conversation flow
  console.log('\n\n--- Instagram Consultation Flow ---');
  
  const instagramContext: ConversationContext = {
    platform: 'instagram',
    customerId: 'cust_priya_456',
    agentId: '2',
    industry: 'legal',
    sessionId: 'session_ig_002',
    customerData: {
      name: 'Priya Sharma',
      phone: '+91 8765432109',
      email: 'priya@example.com'
    }
  };

  console.log('Customer: "legal consultation needed"');
  result = await paymentService.processConversation(instagramContext, "legal consultation needed");
  console.log('Agent Response:', result.response);

  console.log('\nCustomer: "2"');
  result = await paymentService.processConversation(result.updatedContext, "2");
  console.log('Agent Response:', result.response);

  console.log('\nCustomer: "phonepe"');
  result = await paymentService.processConversation(result.updatedContext, "phonepe");
  console.log('Agent Response:', result.response);

  // Test calendar integration
  console.log('\n\n--- Calendar Integration Test ---');
  const slots = await calendarService.getAvailableSlots('1', 'healthcare');
  console.log(`Available slots for healthcare agent: ${slots.length} slots`);
  console.log('Sample slot:', {
    datetime: slots[0]?.datetime,
    type: slots[0]?.type,
    duration: slots[0]?.duration
  });

  // Test insights generation
  console.log('\n\n--- Insights Generation Test ---');
  const report = await insightsService.generateInsightsReport('1', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date());
  console.log('Weekly insights report:', {
    totalRevenue: report.paymentMetrics.totalRevenue,
    totalTransactions: report.paymentMetrics.totalTransactions,
    platformBreakdown: Object.keys(report.paymentMetrics.platformBreakdown),
    customerSatisfaction: report.customerInsights.customerSatisfactionAverage
  });

  console.log('\n✅ Conversational payment system test complete!');
}

testConversationalPayment().catch(console.error);