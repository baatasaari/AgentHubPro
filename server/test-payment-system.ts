// Direct testing for conversational payment system
import { ConversationalPaymentTester, paymentHandler, simulatePaymentProcessing } from './conversational-payment-test.js';

export async function runComprehensivePaymentTests() {
  console.log('🔄 COMPREHENSIVE CONVERSATIONAL PAYMENT TESTING');
  console.log('===============================================');
  
  const results = {
    basicPaymentSimulation: false,
    conversationalFlow: false,
    multipleScenarios: false,
    errorHandling: false,
    dataValidation: false
  };

  try {
    // Test 1: Basic Payment Simulation
    console.log('\n1️⃣ Testing Basic Payment Simulation');
    console.log('-----------------------------------');
    const basicPayment = await simulatePaymentProcessing(150, 'USD') as any;
    if (basicPayment.success && basicPayment.transactionId) {
      console.log('✅ Payment simulation working');
      console.log(`   Transaction ID: ${basicPayment.transactionId}`);
      console.log(`   Amount: $${basicPayment.amount} ${basicPayment.currency}`);
      results.basicPaymentSimulation = true;
    } else {
      console.log('❌ Payment simulation failed');
    }

    // Test 2: Complete Conversational Flow
    console.log('\n2️⃣ Testing Complete Conversational Flow');
    console.log('---------------------------------------');
    const conversationTest = await ConversationalPaymentTester.runFullConversationTest();
    if (conversationTest.success) {
      console.log('✅ Full conversation flow completed successfully');
      results.conversationalFlow = true;
    } else {
      console.log('❌ Conversation flow failed:', conversationTest.error);
    }

    // Test 3: Multiple Payment Scenarios
    console.log('\n3️⃣ Testing Multiple Payment Scenarios');
    console.log('-------------------------------------');
    const scenarios = [
      { sessionId: 'scenario_1', productId: 'consultation' },
      { sessionId: 'scenario_2', productId: 'premium_support' },
      { sessionId: 'scenario_3', productId: 'custom_agent' }
    ];

    let scenariosPassed = 0;
    for (const scenario of scenarios) {
      try {
        const start = await paymentHandler.startPaymentConversation(scenario.sessionId, scenario.productId);
        if (start.message && start.stage === 'product_confirmation') {
          scenariosPassed++;
          console.log(`   ✅ Scenario ${scenario.sessionId} started successfully`);
        }
      } catch (error) {
        console.log(`   ❌ Scenario ${scenario.sessionId} failed:`, error);
      }
    }

    if (scenariosPassed === scenarios.length) {
      results.multipleScenarios = true;
      console.log('✅ All payment scenarios working');
    }

    // Test 4: Error Handling
    console.log('\n4️⃣ Testing Error Handling');
    console.log('-------------------------');
    try {
      // Test invalid product
      await paymentHandler.startPaymentConversation('error_test', 'invalid_product');
      console.log('❌ Error handling failed - should have thrown error');
    } catch (error) {
      console.log('✅ Error handling working - invalid product rejected');
      results.errorHandling = true;
    }

    // Test 5: Data Validation
    console.log('\n5️⃣ Testing Data Validation');
    console.log('--------------------------');
    const validationSessionId = 'validation_test';
    await paymentHandler.startPaymentConversation(validationSessionId, 'consultation');
    
    // Test invalid email
    const invalidEmailTest = await paymentHandler.handleConversationResponse(validationSessionId, 'Yes, proceed');
    const emailValidationTest = await paymentHandler.handleConversationResponse(validationSessionId, 'invalid-email');
    if (emailValidationTest.message.includes('valid email')) {
      console.log('✅ Email validation working');
      results.dataValidation = true;
    }

    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log('📋 Detailed Results:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });

    return {
      success: passedTests === totalTests,
      passedTests,
      totalTests,
      results
    };

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

// Integration test with agents
export async function testAgentPaymentIntegration() {
  console.log('\n🤖 TESTING AGENT-PAYMENT INTEGRATION');
  console.log('====================================');

  const testAgent = {
    id: 'agent_payment_test',
    name: 'Payment Test Agent',
    industry: 'consultation'
  };

  const testConversation = {
    agentId: testAgent.id,
    userId: 'user_123',
    sessionId: 'agent_payment_session',
    message: 'I want to buy a consultation'
  };

  try {
    // Simulate agent conversation triggering payment
    console.log('1. Agent receives payment request...');
    const paymentStart = await paymentHandler.startPaymentConversation(
      testConversation.sessionId, 
      'consultation'
    );

    console.log('2. Payment conversation initiated...');
    console.log(`   Message: ${paymentStart.message}`);

    // Simulate user proceeding through payment
    console.log('3. User confirms purchase...');
    const confirmation = await paymentHandler.handleConversationResponse(
      testConversation.sessionId, 
      'Yes, proceed'
    );

    console.log('4. User provides email...');
    const emailStep = await paymentHandler.handleConversationResponse(
      testConversation.sessionId, 
      'customer@example.com'
    );

    console.log('5. User selects payment method and completes payment...');
    const paymentResult = await paymentHandler.handleConversationResponse(
      testConversation.sessionId, 
      'Credit Card'
    );

    if (paymentResult.stage === 'completed' && paymentResult.transactionId) {
      console.log('✅ Agent-Payment Integration Successful');
      console.log(`   Transaction ID: ${paymentResult.transactionId}`);
      return { success: true, transactionId: paymentResult.transactionId };
    } else {
      console.log('❌ Integration failed at payment completion');
      return { success: false, stage: paymentResult.stage };
    }

  } catch (error) {
    console.error('❌ Agent-Payment Integration failed:', error);
    return { success: false, error: error.message };
  }
}