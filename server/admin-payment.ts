/**
 * Admin-Configurable Payment System
 * Allows platform administrators to configure payment settings, pricing, 
 * and payment flows for all agents across different industries
 */

import Stripe from 'stripe';

interface PaymentConfiguration {
  agentId: string;
  industry: string;
  pricing: {
    basePrice: number;
    currency: string;
    additionalServices?: Array<{
      name: string;
      price: number;
      description: string;
    }>;
  };
  paymentMethods: {
    stripe: boolean;
    razorpay: boolean;
    paypal: boolean;
    bankTransfer: boolean;
    upi: boolean;
  };
  platforms: {
    whatsapp: boolean;
    instagram: boolean;
    messenger: boolean;
    webchat: boolean;
    sms: boolean;
  };
  conversationalFlow: {
    enableAutoPayment: boolean;
    requireConfirmation: boolean;
    allowInstallments: boolean;
    customMessages: {
      paymentRequest: string;
      paymentSuccess: string;
      paymentFailure: string;
    };
  };
  adminSettings: {
    adminUserId: string;
    lastUpdated: string;
    isActive: boolean;
  };
}

interface IndustryTemplate {
  industry: string;
  name: string;
  defaultPricing: {
    basePrice: number;
    currency: string;
    services: Array<{
      name: string;
      price: number;
      description: string;
    }>;
  };
  recommendedMethods: string[];
  customMessages: {
    paymentRequest: string;
    paymentSuccess: string;
    paymentFailure: string;
  };
}

interface PaymentRequest {
  agentId: string;
  customerId: string;
  platform: 'whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'sms';
  amount?: number;
  serviceType?: string;
  customerData: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export class AdminPaymentService {
  private stripe: Stripe | null = null;
  private paymentConfigurations: Map<string, PaymentConfiguration> = new Map();
  private industryTemplates: IndustryTemplate[] = [];

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
    }
    this.initializeIndustryTemplates();
  }

  private initializeIndustryTemplates(): void {
    this.industryTemplates = [
      {
        industry: 'healthcare',
        name: 'Healthcare & Medical',
        defaultPricing: {
          basePrice: 500,
          currency: 'INR',
          services: [
            { name: 'General Consultation', price: 500, description: 'Basic medical consultation' },
            { name: 'Specialist Consultation', price: 1200, description: 'Specialist doctor consultation' },
            { name: 'Emergency Consultation', price: 2000, description: 'Emergency medical consultation' }
          ]
        },
        recommendedMethods: ['stripe', 'razorpay', 'upi'],
        customMessages: {
          paymentRequest: '💊 Medical consultation payment required. Please complete payment to confirm your appointment.',
          paymentSuccess: '✅ Payment successful! Your consultation is confirmed. We will contact you shortly.',
          paymentFailure: '❌ Payment failed. Please try again or contact our support team.'
        }
      },
      {
        industry: 'retail',
        name: 'Retail & E-commerce',
        defaultPricing: {
          basePrice: 0,
          currency: 'INR',
          services: [
            { name: 'Product Purchase', price: 0, description: 'Variable pricing based on products' },
            { name: 'Express Delivery', price: 100, description: 'Same-day delivery service' },
            { name: 'Gift Wrapping', price: 50, description: 'Premium gift wrapping' }
          ]
        },
        recommendedMethods: ['stripe', 'razorpay', 'paypal', 'upi'],
        customMessages: {
          paymentRequest: '🛍️ Complete your purchase with secure payment. Free delivery on orders above ₹1000!',
          paymentSuccess: '🎉 Order confirmed! Your items will be delivered within 2-3 business days.',
          paymentFailure: '❌ Payment unsuccessful. Your cart is saved. Please try again.'
        }
      },
      {
        industry: 'finance',
        name: 'Finance & Advisory',
        defaultPricing: {
          basePrice: 1500,
          currency: 'INR',
          services: [
            { name: 'Financial Consultation', price: 1500, description: 'Basic financial planning session' },
            { name: 'Investment Advisory', price: 5000, description: 'Comprehensive investment planning' },
            { name: 'Tax Planning', price: 3000, description: 'Tax optimization consultation' }
          ]
        },
        recommendedMethods: ['stripe', 'bankTransfer'],
        customMessages: {
          paymentRequest: '💰 Financial consultation fee payment. Secure your financial future with expert advice.',
          paymentSuccess: '✅ Payment received. Your financial consultation is scheduled. Check your email for details.',
          paymentFailure: '❌ Payment processing failed. Please contact our finance team for assistance.'
        }
      }
    ];
  }

  /**
   * Admin configures payment settings for specific agent
   */
  async adminConfigurePayment(agentId: string, adminUserId: string, config: {
    industry: string;
    pricing: PaymentConfiguration['pricing'];
    paymentMethods: PaymentConfiguration['paymentMethods'];
    platforms: PaymentConfiguration['platforms'];
    conversationalFlow: PaymentConfiguration['conversationalFlow'];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const paymentConfig: PaymentConfiguration = {
        agentId,
        industry: config.industry,
        pricing: config.pricing,
        paymentMethods: config.paymentMethods,
        platforms: config.platforms,
        conversationalFlow: config.conversationalFlow,
        adminSettings: {
          adminUserId,
          lastUpdated: new Date().toISOString(),
          isActive: true
        }
      };

      this.paymentConfigurations.set(agentId, paymentConfig);
      
      console.log(`Admin ${adminUserId} configured payment settings for agent ${agentId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin creates payment configuration from industry template
   */
  async adminCreateFromTemplate(agentId: string, adminUserId: string, industry: string, customizations?: {
    basePrice?: number;
    additionalServices?: Array<{ name: string; price: number; description: string }>;
    enabledMethods?: string[];
    enabledPlatforms?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.industryTemplates.find(t => t.industry === industry);
      
      if (!template) {
        return { success: false, error: 'Industry template not found' };
      }

      const pricing = {
        basePrice: customizations?.basePrice || template.defaultPricing.basePrice,
        currency: template.defaultPricing.currency,
        additionalServices: customizations?.additionalServices || template.defaultPricing.services
      };

      const paymentMethods = {
        stripe: customizations?.enabledMethods?.includes('stripe') ?? template.recommendedMethods.includes('stripe'),
        razorpay: customizations?.enabledMethods?.includes('razorpay') ?? template.recommendedMethods.includes('razorpay'),
        paypal: customizations?.enabledMethods?.includes('paypal') ?? template.recommendedMethods.includes('paypal'),
        bankTransfer: customizations?.enabledMethods?.includes('bankTransfer') ?? template.recommendedMethods.includes('bankTransfer'),
        upi: customizations?.enabledMethods?.includes('upi') ?? template.recommendedMethods.includes('upi')
      };

      const platforms = {
        whatsapp: customizations?.enabledPlatforms?.includes('whatsapp') ?? true,
        instagram: customizations?.enabledPlatforms?.includes('instagram') ?? true,
        messenger: customizations?.enabledPlatforms?.includes('messenger') ?? true,
        webchat: customizations?.enabledPlatforms?.includes('webchat') ?? true,
        sms: customizations?.enabledPlatforms?.includes('sms') ?? true
      };

      const conversationalFlow = {
        enableAutoPayment: true,
        requireConfirmation: true,
        allowInstallments: false,
        customMessages: template.customMessages
      };

      return await this.adminConfigurePayment(agentId, adminUserId, {
        industry,
        pricing,
        paymentMethods,
        platforms,
        conversationalFlow
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment request using admin-configured settings
   */
  async processPaymentRequest(request: PaymentRequest): Promise<{
    success: boolean;
    paymentLink?: string;
    instructions?: string;
    amount?: number;
    error?: string;
  }> {
    try {
      const config = this.paymentConfigurations.get(request.agentId);
      
      if (!config) {
        return { 
          success: false, 
          error: 'Payment not configured for this agent. Please contact administrator.' 
        };
      }

      if (!config.adminSettings.isActive) {
        return { 
          success: false, 
          error: 'Payment processing is currently disabled for this agent.' 
        };
      }

      if (!config.platforms[request.platform]) {
        return { 
          success: false, 
          error: `Payment not available on ${request.platform} platform.` 
        };
      }

      // Determine payment amount
      const amount = request.amount || config.pricing.basePrice;
      
      if (request.serviceType) {
        const service = config.pricing.additionalServices?.find(s => s.name === request.serviceType);
        if (service) {
          // Use service-specific pricing
        }
      }

      // Generate payment link
      const paymentResult = await this.generatePaymentLink(config, amount, request);
      
      if (paymentResult.success) {
        const instructions = this.createPlatformInstructions(
          request.platform, 
          paymentResult.paymentLink!, 
          amount, 
          config.conversationalFlow.customMessages.paymentRequest
        );

        return {
          success: true,
          paymentLink: paymentResult.paymentLink,
          instructions,
          amount
        };
      } else {
        return {
          success: false,
          error: paymentResult.error
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate payment link using configured payment methods
   */
  private async generatePaymentLink(config: PaymentConfiguration, amount: number, request: PaymentRequest): Promise<{
    success: boolean;
    paymentLink?: string;
    error?: string;
  }> {
    try {
      // Try Stripe first if enabled
      if (config.paymentMethods.stripe && this.stripe) {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: config.pricing.currency.toLowerCase(),
          metadata: {
            agentId: request.agentId,
            customerId: request.customerId,
            platform: request.platform
          }
        });

        const checkoutSession = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: config.pricing.currency.toLowerCase(),
              product_data: {
                name: `Service Payment - Agent ${request.agentId}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${process.env.BASE_URL || 'https://example.com'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.BASE_URL || 'https://example.com'}/payment/cancel`,
          metadata: {
            agentId: request.agentId,
            customerId: request.customerId,
            platform: request.platform
          }
        });

        return {
          success: true,
          paymentLink: checkoutSession.url || undefined
        };
      }

      // Fallback to other methods if Stripe is not available
      if (config.paymentMethods.razorpay) {
        return {
          success: true,
          paymentLink: `https://pay.razorpay.com/checkout/${request.agentId}/${Date.now()}?amount=${amount}`
        };
      }

      if (config.paymentMethods.upi) {
        return {
          success: true,
          paymentLink: `upi://pay?pa=merchant@upi&pn=Agent${request.agentId}&am=${amount}&cu=${config.pricing.currency}`
        };
      }

      return {
        success: false,
        error: 'No payment methods are configured for this agent'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create platform-specific payment instructions
   */
  private createPlatformInstructions(platform: string, paymentLink: string, amount: number, customMessage: string): string {
    const baseMessage = customMessage.replace('{amount}', amount.toString());
    
    switch (platform) {
      case 'whatsapp':
        return `💳 *Payment Required*\n\n${baseMessage}\n\n*Amount:* ₹${amount}\n\n🔗 *Pay securely:*\n${paymentLink}\n\n✅ Your payment is protected by industry-standard encryption.\n💬 Reply "PAID" once payment is complete.`;
      
      case 'instagram':
        return `💳 ${baseMessage}\n\nAmount: ₹${amount}\n🔗 ${paymentLink}\n\n✅ Secure payment\n💬 Message "PAID" when done`;
      
      case 'messenger':
        return `💳 ${baseMessage}\n\nAmount: ₹${amount}\nSecure payment: ${paymentLink}\n\nReply "PAID" after payment.`;
      
      case 'webchat':
        return `${baseMessage} Amount: ₹${amount}. Payment link: ${paymentLink}`;
      
      case 'sms':
        return `Payment: ₹${amount}. ${paymentLink} Text PAID when done.`;
      
      default:
        return `Payment required: ₹${amount}. Link: ${paymentLink}`;
    }
  }

  /**
   * Get payment configuration for agent
   */
  async getPaymentConfiguration(agentId: string): Promise<PaymentConfiguration | null> {
    return this.paymentConfigurations.get(agentId) || null;
  }

  /**
   * Get all industry templates
   */
  getIndustryTemplates(): IndustryTemplate[] {
    return this.industryTemplates;
  }

  /**
   * Admin overview of all payment configurations
   */
  async getAdminPaymentOverview(): Promise<{
    totalAgents: number;
    configuredAgents: number;
    activeConfigurations: number;
    agentConfigurations: Array<{
      agentId: string;
      industry: string;
      isActive: boolean;
      basePrice: number;
      currency: string;
      lastUpdated: string;
    }>;
  }> {
    const agentConfigurations = Array.from(this.paymentConfigurations.values()).map(config => ({
      agentId: config.agentId,
      industry: config.industry,
      isActive: config.adminSettings.isActive,
      basePrice: config.pricing.basePrice,
      currency: config.pricing.currency,
      lastUpdated: config.adminSettings.lastUpdated
    }));

    return {
      totalAgents: agentConfigurations.length,
      configuredAgents: agentConfigurations.length,
      activeConfigurations: agentConfigurations.filter(config => config.isActive).length,
      agentConfigurations
    };
  }

  /**
   * Admin toggles payment configuration status
   */
  async adminTogglePaymentStatus(agentId: string, adminUserId: string, isActive: boolean): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const config = this.paymentConfigurations.get(agentId);
      
      if (!config) {
        return { success: false, error: 'Payment configuration not found' };
      }

      config.adminSettings.isActive = isActive;
      config.adminSettings.lastUpdated = new Date().toISOString();
      
      this.paymentConfigurations.set(agentId, config);
      
      console.log(`Admin ${adminUserId} ${isActive ? 'enabled' : 'disabled'} payment for agent ${agentId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin deletes payment configuration
   */
  async adminDeletePaymentConfiguration(agentId: string, adminUserId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const deleted = this.paymentConfigurations.delete(agentId);
      
      if (!deleted) {
        return { success: false, error: 'Payment configuration not found' };
      }

      console.log(`Admin ${adminUserId} deleted payment configuration for agent ${agentId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}