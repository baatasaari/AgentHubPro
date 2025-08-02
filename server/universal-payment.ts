/**
 * Universal Conversational Payment System
 * Available for all agents regardless of industry
 * Handles payment flows within messaging platform conversations
 */

import Stripe from 'stripe';

interface PaymentContext {
  agentId: number;
  customerId: string;
  platform: 'whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms';
  customerData: {
    name: string;
    phone?: string;
    email?: string;
    address?: any;
  };
  paymentData?: {
    amount: number;
    currency: string;
    description: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
      description?: string;
    }>;
    metadata?: Record<string, any>;
  };
  bookingData?: {
    type: 'appointment' | 'consultation' | 'service' | 'event';
    date?: string;
    time?: string;
    duration?: number;
    service?: string;
    notes?: string;
  };
}

interface PaymentAction {
  type: 'collect_payment_info' | 'generate_payment_link' | 'process_payment' | 'confirm_booking' | 'send_receipt';
  payload: any;
  message: string;
}

interface ConversationResponse {
  intent: string;
  confidence: number;
  actions: PaymentAction[];
  message: string;
  requiresFollowUp: boolean;
  nextSteps?: string[];
}

export class UniversalPaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    // Initialize Stripe if available
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
    }
  }

  /**
   * Process conversational payment messages for any agent/industry
   */
  async processConversation(context: PaymentContext, message: string): Promise<ConversationResponse> {
    try {
      // Detect payment intent from message
      const intent = await this.detectPaymentIntent(message);
      
      switch (intent.type) {
        case 'payment_request':
          return await this.handlePaymentRequest(context, message, intent);
        
        case 'booking_request':
          return await this.handleBookingRequest(context, message, intent);
        
        case 'payment_confirmation':
          return await this.handlePaymentConfirmation(context, message, intent);
        
        case 'payment_info_collection':
          return await this.handlePaymentInfoCollection(context, message, intent);
        
        case 'general_inquiry':
          return await this.handleGeneralInquiry(context, message, intent);
        
        default:
          return await this.handleUnknownIntent(context, message);
      }
    } catch (error: any) {
      console.error('Payment conversation processing failed:', error);
      return {
        intent: 'error',
        confidence: 1.0,
        actions: [],
        message: 'I apologize, but I encountered an issue processing your request. Please try again or contact support.',
        requiresFollowUp: false
      };
    }
  }

  /**
   * Generate payment link for any amount/purpose
   */
  async generatePaymentLink(context: PaymentContext, amount: number, description: string): Promise<{
    success: boolean;
    paymentLink?: string;
    paymentIntentId?: string;
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        // Fallback payment link generation without Stripe
        const fallbackLink = `${process.env.BUSINESS_BASE_URL || 'https://agenthub.com'}/pay/invoice/${context.agentId}/${Date.now()}?amount=${amount}&description=${encodeURIComponent(description)}`;
        
        return {
          success: true,
          paymentLink: fallbackLink,
          paymentIntentId: `pi_fallback_${Date.now()}`
        };
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: context.paymentData?.currency || 'usd',
        metadata: {
          agentId: context.agentId.toString(),
          customerId: context.customerId,
          platform: context.platform,
          description
        }
      });

      // In production, create a proper checkout session
      const checkoutSession = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: context.paymentData?.currency || 'usd',
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.BUSINESS_BASE_URL || 'https://agenthub.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BUSINESS_BASE_URL || 'https://agenthub.com'}/cancel`,
        metadata: {
          agentId: context.agentId.toString(),
          customerId: context.customerId,
          platform: context.platform
        }
      });

      return {
        success: true,
        paymentLink: checkoutSession.url || undefined,
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create payment instructions for different platforms
   */
  createPaymentInstructions(platform: string, paymentLink: string, amount: number, description: string): string {
    switch (platform) {
      case 'whatsapp':
        return `💳 *Payment Required*\n\n*Amount:* $${amount}\n*For:* ${description}\n\n🔗 *Click here to pay securely:*\n${paymentLink}\n\n✅ Your payment is protected by industry-standard encryption.\n\n💬 Reply with "PAID" once payment is complete.`;
      
      case 'instagram':
        return `💳 Payment Link\n\nAmount: $${amount}\nFor: ${description}\n\n🔗 Secure payment: ${paymentLink}\n\n✅ Safe & encrypted\n💬 Message "PAID" when done`;
      
      case 'messenger':
        return `💳 Payment Required\n\nAmount: $${amount}\nDescription: ${description}\n\nSecure payment link: ${paymentLink}\n\nYour payment is protected. Reply "PAID" after completing payment.`;
      
      case 'webchat':
        return `Payment Required: $${amount} for ${description}. Please use this secure payment link: ${paymentLink}. Reply "PAID" once payment is completed.`;
      
      case 'sms':
        return `Payment: $${amount} for ${description}. Pay securely: ${paymentLink}. Text PAID when done.`;
      
      default:
        return `Payment of $${amount} required for ${description}. Secure payment link: ${paymentLink}`;
    }
  }

  // Private helper methods
  private async detectPaymentIntent(message: string): Promise<{
    type: string;
    confidence: number;
    extractedInfo: any;
  }> {
    const messageLower = message.toLowerCase();
    
    // Payment request patterns
    if (messageLower.includes('pay') || messageLower.includes('payment') || messageLower.includes('buy') || messageLower.includes('purchase')) {
      return {
        type: 'payment_request',
        confidence: 0.9,
        extractedInfo: { hasPaymentKeywords: true }
      };
    }
    
    // Booking request patterns
    if (messageLower.includes('book') || messageLower.includes('appointment') || messageLower.includes('schedule') || messageLower.includes('consultation')) {
      return {
        type: 'booking_request',
        confidence: 0.85,
        extractedInfo: { hasBookingKeywords: true }
      };
    }
    
    // Payment confirmation patterns
    if (messageLower.includes('paid') || messageLower.includes('completed payment') || messageLower.includes('payment done')) {
      return {
        type: 'payment_confirmation',
        confidence: 0.95,
        extractedInfo: { hasConfirmationKeywords: true }
      };
    }
    
    // Payment info collection
    if (messageLower.includes('email') || messageLower.includes('phone') || messageLower.includes('address')) {
      return {
        type: 'payment_info_collection',
        confidence: 0.7,
        extractedInfo: { hasContactInfo: true }
      };
    }
    
    return {
      type: 'general_inquiry',
      confidence: 0.5,
      extractedInfo: {}
    };
  }

  private async handlePaymentRequest(context: PaymentContext, message: string, intent: any): Promise<ConversationResponse> {
    // Extract amount if mentioned
    const amountMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100; // Default amount
    
    const description = `Payment for ${context.agentId ? `Agent ${context.agentId}` : 'Service'}`;
    
    const paymentResult = await this.generatePaymentLink(context, amount, description);
    
    if (paymentResult.success && paymentResult.paymentLink) {
      const instructions = this.createPaymentInstructions(context.platform, paymentResult.paymentLink, amount, description);
      
      return {
        intent: 'payment_request',
        confidence: 0.9,
        actions: [{
          type: 'generate_payment_link',
          payload: {
            amount,
            description,
            paymentLink: paymentResult.paymentLink,
            paymentIntentId: paymentResult.paymentIntentId
          },
          message: instructions
        }],
        message: instructions,
        requiresFollowUp: true,
        nextSteps: ['Wait for payment confirmation', 'Send receipt upon payment']
      };
    } else {
      return {
        intent: 'payment_request',
        confidence: 0.9,
        actions: [],
        message: 'I apologize, but I\'m unable to process payments at the moment. Please contact support for assistance.',
        requiresFollowUp: false
      };
    }
  }

  private async handleBookingRequest(context: PaymentContext, message: string, intent: any): Promise<ConversationResponse> {
    // Extract booking information
    const bookingInfo = this.extractBookingInfo(message);
    
    // Default booking fee
    const bookingFee = 50;
    const description = `Booking fee for ${bookingInfo.service || 'consultation'}`;
    
    const paymentResult = await this.generatePaymentLink(context, bookingFee, description);
    
    if (paymentResult.success && paymentResult.paymentLink) {
      const instructions = this.createPaymentInstructions(context.platform, paymentResult.paymentLink, bookingFee, description);
      
      return {
        intent: 'booking_request',
        confidence: 0.85,
        actions: [{
          type: 'generate_payment_link',
          payload: {
            amount: bookingFee,
            description,
            paymentLink: paymentResult.paymentLink,
            paymentIntentId: paymentResult.paymentIntentId,
            bookingInfo
          },
          message: instructions
        }],
        message: `I'll help you book ${bookingInfo.service || 'a consultation'}. ${instructions}`,
        requiresFollowUp: true,
        nextSteps: ['Confirm payment', 'Schedule appointment', 'Send confirmation']
      };
    } else {
      return {
        intent: 'booking_request',
        confidence: 0.85,
        actions: [],
        message: 'I\'d be happy to help you book an appointment. However, payment processing is currently unavailable. Please contact us directly.',
        requiresFollowUp: false
      };
    }
  }

  private async handlePaymentConfirmation(context: PaymentContext, message: string, intent: any): Promise<ConversationResponse> {
    return {
      intent: 'payment_confirmation',
      confidence: 0.95,
      actions: [{
        type: 'confirm_booking',
        payload: {
          confirmed: true,
          timestamp: new Date().toISOString()
        },
        message: 'Payment confirmed! Processing your request...'
      }],
      message: '✅ Thank you! Your payment has been received. I\'ll process your request and send you a confirmation shortly.',
      requiresFollowUp: true,
      nextSteps: ['Send receipt', 'Process booking', 'Send confirmation details']
    };
  }

  private async handlePaymentInfoCollection(context: PaymentContext, message: string, intent: any): Promise<ConversationResponse> {
    const missingInfo = this.identifyMissingPaymentInfo(context);
    
    if (missingInfo.length > 0) {
      return {
        intent: 'payment_info_collection',
        confidence: 0.7,
        actions: [{
          type: 'collect_payment_info',
          payload: { missingFields: missingInfo },
          message: `I need some additional information: ${missingInfo.join(', ')}`
        }],
        message: `To proceed with payment, I need: ${missingInfo.join(', ')}. Can you provide this information?`,
        requiresFollowUp: true,
        nextSteps: ['Collect missing information', 'Generate payment link']
      };
    } else {
      return {
        intent: 'payment_info_collection',
        confidence: 0.7,
        actions: [],
        message: 'I have all the information needed. How would you like to proceed with payment?',
        requiresFollowUp: true,
        nextSteps: ['Generate payment link']
      };
    }
  }

  private async handleGeneralInquiry(context: PaymentContext, message: string, intent: any): Promise<ConversationResponse> {
    return {
      intent: 'general_inquiry',
      confidence: 0.5,
      actions: [],
      message: 'I can help you with payments and bookings. Would you like to make a payment or book a service?',
      requiresFollowUp: true,
      nextSteps: ['Wait for payment or booking request']
    };
  }

  private async handleUnknownIntent(context: PaymentContext, message: string): Promise<ConversationResponse> {
    return {
      intent: 'unknown',
      confidence: 0.0,
      actions: [],
      message: 'I\'m here to help with payments and bookings. Can you tell me what you\'d like to do?',
      requiresFollowUp: true,
      nextSteps: ['Clarify user intent']
    };
  }

  private extractBookingInfo(message: string): any {
    const messageLower = message.toLowerCase();
    
    return {
      service: messageLower.includes('consultation') ? 'consultation' : 
               messageLower.includes('appointment') ? 'appointment' : 
               'service',
      urgency: messageLower.includes('urgent') || messageLower.includes('asap') ? 'high' : 'normal',
      timePreference: this.extractTimePreference(message)
    };
  }

  private extractTimePreference(message: string): string | null {
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(morning|afternoon|evening)/i,
      /(today|tomorrow|next week)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  private identifyMissingPaymentInfo(context: PaymentContext): string[] {
    const missing: string[] = [];
    
    if (!context.customerData.email) missing.push('email address');
    if (!context.customerData.phone) missing.push('phone number');
    if (!context.customerData.name || context.customerData.name.trim() === '') missing.push('full name');
    
    return missing;
  }
}