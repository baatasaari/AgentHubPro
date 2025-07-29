// Test payment system functionality
import { paymentConfig, getPaymentMethods, getConsultationPrice, generatePaymentLink, PaymentMethod } from './payment-config';

function testPaymentSystem() {
  console.log('💳 Testing Payment System Configuration...\n');

  // Test configuration
  console.log('--- Payment Configuration ---');
  console.log('Stripe enabled:', paymentConfig.stripe.enabled);
  console.log('Razorpay enabled:', paymentConfig.razorpay.enabled);
  console.log('PhonePe enabled:', paymentConfig.phonepe.enabled);
  console.log('UPI enabled:', paymentConfig.upi.enabled);
  console.log('WhatsApp enabled:', paymentConfig.whatsapp.enabled);

  // Test available payment methods
  console.log('\n--- Available Payment Methods ---');
  const methods = getPaymentMethods();
  console.log('Available methods:', methods);

  // Test pricing for different industries
  console.log('\n--- Industry Pricing Tests ---');
  const industries = ['healthcare', 'legal', 'finance', 'realestate', 'technology'];
  const tiers = ['base', 'premium', 'emergency'];

  industries.forEach(industry => {
    console.log(`\n${industry.toUpperCase()}:`);
    tiers.forEach(tier => {
      const price = getConsultationPrice(industry, tier);
      console.log(`  ${tier}: ₹${price}`);
    });
  });

  // Test payment link generation
  console.log('\n--- Payment Link Generation ---');
  const testAmount = 500;
  const testDescription = 'Healthcare consultation';
  const testConsultationId = 'CONS_TEST_12345';

  console.log('\nUPI Payment Links:');
  console.log('UPI:', generatePaymentLink(testAmount, 'INR', testDescription, testConsultationId, PaymentMethod.UPI));
  console.log('PhonePe:', generatePaymentLink(testAmount, 'INR', testDescription, testConsultationId, PaymentMethod.PHONEPE));
  console.log('Google Pay:', generatePaymentLink(testAmount, 'INR', testDescription, testConsultationId, PaymentMethod.GOOGLEPAY));
  console.log('Paytm:', generatePaymentLink(testAmount, 'INR', testDescription, testConsultationId, PaymentMethod.PAYTM));

  console.log('\n✅ Payment system configuration test complete!');
}

testPaymentSystem();