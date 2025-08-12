import express from 'express';
import { storage } from './storage';

// Dummy payment data for testing
const DUMMY_PAYMENT_DATA = {
  products: [
    { id: 'consultation', name: 'Business Consultation', price: 150, currency: 'USD' },
    { id: 'premium_support', name: 'Premium Support Package', price: 299, currency: 'USD' },
    { id: 'custom_agent', name: 'Custom Agent Development', price: 500, currency: 'USD' },
    { id: 'monthly_subscription', name: 'Monthly AI Assistant', price: 49, currency: 'USD' },
  ],
  customers: [
    { id: 'cust_001', email: 'test@example.com', name: 'Test Customer' },
    { id: 'cust_002', email: 'business@company.com', name: 'Business User' },
  ],
  paymentMethods: [
    { id: 'pm_card', type: 'card', last4: '4242', brand: 'visa' },
    { id: 'pm_bank', type: 'bank_transfer', bank: 'Test Bank' },
  ]
};

// Simulate payment processing with dummy data
export function simulatePaymentProcessing(amount: number, currency: string = 'USD') {
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      resolve({
        success,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        currency,
        status: success ? 'completed' : 'failed',
        timestamp: new Date().toISOString(),
        error: success ? null : 'Payment declined by bank'
      });
    }, 1500); // Simulate processing delay
  });
}

// Conversational payment flow handler
export class ConversationalPaymentHandler {
  private conversations = new Map();

  async startPaymentConversation(sessionId: string, productId: string) {
    const product = DUMMY_PAYMENT_DATA.products.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const conversation = {
      sessionId,
      product,
      stage: 'product_confirmation',
      customerInfo: null,
      paymentMethod: null,
      timestamp: new Date().toISOString()
    };

    this.conversations.set(sessionId, conversation);
    
    return {
      message: `I'd be happy to help you with ${product.name} for $${product.price}. Would you like to proceed with this purchase?`,
      options: ['Yes, proceed', 'Tell me more', 'Cancel'],
      stage: 'product_confirmation'
    };
  }

  async handleConversationResponse(sessionId: string, response: string) {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    switch (conversation.stage) {
      case 'product_confirmation':
        if (response.toLowerCase().includes('yes') || response.toLowerCase().includes('proceed')) {
          conversation.stage = 'customer_info';
          return {
            message: "Great! I'll need some information to process your order. What's your email address?",
            stage: 'customer_info'
          };
        } else if (response.toLowerCase().includes('more')) {
          return {
            message: `${conversation.product.name} - This service includes comprehensive support and consultation. The price is $${conversation.product.price}. Would you like to proceed?`,
            options: ['Yes, proceed', 'Cancel'],
            stage: 'product_confirmation'
          };
        } else {
          return {
            message: "No problem! Feel free to ask if you have any other questions.",
            stage: 'cancelled'
          };
        }

      case 'customer_info':
        if (this.isValidEmail(response)) {
          conversation.customerInfo = { email: response };
          conversation.stage = 'payment_method';
          return {
            message: "Perfect! How would you like to pay? I can process credit card or bank transfer.",
            options: ['Credit Card', 'Bank Transfer'],
            stage: 'payment_method'
          };
        } else {
          return {
            message: "Please provide a valid email address:",
            stage: 'customer_info'
          };
        }

      case 'payment_method':
        const method = response.toLowerCase().includes('card') ? 'card' : 'bank_transfer';
        conversation.paymentMethod = method;
        conversation.stage = 'payment_processing';
        
        return await this.processPayment(conversation);

      default:
        return {
          message: "I'm not sure how to help with that. Would you like to start over?",
          stage: 'error'
        };
    }
  }

  private async processPayment(conversation: any) {
    const result = await simulatePaymentProcessing(
      conversation.product.price,
      conversation.product.currency
    ) as any;

    if (result.success) {
      // Store successful payment
      await this.storePaymentRecord(conversation, result);
      
      return {
        message: `Payment successful! Your ${conversation.product.name} has been confirmed. Transaction ID: ${result.transactionId}. You'll receive a confirmation email shortly.`,
        stage: 'completed',
        transactionId: result.transactionId
      };
    } else {
      return {
        message: `Payment failed: ${result.error}. Would you like to try a different payment method?`,
        options: ['Try again', 'Different method', 'Cancel'],
        stage: 'payment_failed'
      };
    }
  }

  private async storePaymentRecord(conversation: any, paymentResult: any) {
    // In a real system, this would store to database
    console.log('💳 Payment Record Stored:', {
      sessionId: conversation.sessionId,
      product: conversation.product.name,
      amount: conversation.product.price,
      customer: conversation.customerInfo.email,
      transactionId: paymentResult.transactionId,
      timestamp: paymentResult.timestamp
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  getConversationState(sessionId: string) {
    return this.conversations.get(sessionId);
  }

  getAllConversations() {
    return Array.from(this.conversations.values());
  }
}

// Global instance for testing
export const paymentHandler = new ConversationalPaymentHandler();

// Express routes for testing conversational payments
export function setupConversationalPaymentRoutes(app: express.Application) {
  
  // Start a payment conversation
  app.post('/api/payment/conversation/start', async (req, res) => {
    try {
      const { sessionId, productId } = req.body;
      
      if (!sessionId || !productId) {
        return res.status(400).json({ error: 'sessionId and productId are required' });
      }

      const response = await paymentHandler.startPaymentConversation(sessionId, productId);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Handle conversation response
  app.post('/api/payment/conversation/respond', async (req, res) => {
    try {
      const { sessionId, response } = req.body;
      
      if (!sessionId || !response) {
        return res.status(400).json({ error: 'sessionId and response are required' });
      }

      const result = await paymentHandler.handleConversationResponse(sessionId, response);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get conversation state
  app.get('/api/payment/conversation/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const conversation = paymentHandler.getConversationState(sessionId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  });

  // Get all conversations (for testing)
  app.get('/api/payment/conversations', (req, res) => {
    const conversations = paymentHandler.getAllConversations();
    res.json(conversations);
  });

  // Get available products
  app.get('/api/payment/products', (req, res) => {
    res.json(DUMMY_PAYMENT_DATA.products);
  });

  // Simulate payment processing directly
  app.post('/api/payment/process', async (req, res) => {
    try {
      const { amount, currency = 'USD' } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: 'amount is required' });
      }

      const result = await simulatePaymentProcessing(amount, currency);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Testing utilities
export const ConversationalPaymentTester = {
  async runFullConversationTest() {
    console.log('🔄 Starting Conversational Payment Test...');
    
    const sessionId = `test_${Date.now()}`;
    const productId = 'consultation';
    
    try {
      // Start conversation
      console.log('1️⃣ Starting payment conversation...');
      const start = await paymentHandler.startPaymentConversation(sessionId, productId);
      console.log('Response:', start.message);
      
      // Confirm product
      console.log('2️⃣ Confirming product...');
      const confirm = await paymentHandler.handleConversationResponse(sessionId, 'Yes, proceed');
      console.log('Response:', confirm.message);
      
      // Provide email
      console.log('3️⃣ Providing email...');
      const email = await paymentHandler.handleConversationResponse(sessionId, 'test@example.com');
      console.log('Response:', email.message);
      
      // Select payment method
      console.log('4️⃣ Selecting payment method...');
      const payment = await paymentHandler.handleConversationResponse(sessionId, 'Credit Card');
      console.log('Response:', payment.message);
      
      console.log('✅ Conversational Payment Test Completed');
      return { success: true, finalResponse: payment };
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error: error.message };
    }
  }
};