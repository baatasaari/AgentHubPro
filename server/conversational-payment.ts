import { paymentConfig, getConsultationPrice, generatePaymentLink, PaymentMethod } from './payment-config';

export interface ConversationContext {
  platform: 'whatsapp' | 'instagram' | 'messenger' | 'web';
  customerId: string;
  agentId: string;
  industry: string;
  sessionId: string;
  customerData: {
    name?: string;
    phone?: string;
    email?: string;
  };
  intent?: 'consultation' | 'information' | 'booking' | 'payment';
  currentStep?: string;
  bookingData?: {
    consultationType?: string;
    preferredSlots?: string[];
    selectedSlot?: string;
    tier?: 'base' | 'premium' | 'emergency';
  };
}

export interface AvailableSlot {
  id: string;
  datetime: string;
  duration: number;
  type: 'video' | 'phone' | 'whatsapp' | 'in_person';
  price: number;
  available: boolean;
}

export class ConversationalPaymentService {
  private platformConfigs = {
    whatsapp: {
      paymentMethods: ['upi', 'googlepay', 'phonepe', 'paytm', 'whatsapp_pay'],
      maxMessageLength: 4096,
      supportedMedia: ['image', 'document', 'audio']
    },
    instagram: {
      paymentMethods: ['upi', 'googlepay', 'phonepe', 'paytm'],
      maxMessageLength: 1000,
      supportedMedia: ['image', 'video']
    },
    messenger: {
      paymentMethods: ['upi', 'googlepay', 'phonepe', 'paytm', 'credit_card'],
      maxMessageLength: 2000,
      supportedMedia: ['image', 'video', 'audio']
    },
    web: {
      paymentMethods: ['upi', 'googlepay', 'phonepe', 'paytm', 'credit_card'],
      maxMessageLength: 5000,
      supportedMedia: ['image', 'video', 'audio', 'document']
    }
  };

  async processConversation(context: ConversationContext, userMessage: string): Promise<{
    response: string;
    actions: Array<{
      type: 'payment_link' | 'calendar_check' | 'booking_confirmation' | 'email_notification';
      data: any;
    }>;
    updatedContext: ConversationContext;
  }> {
    const platformConfig = this.platformConfigs[context.platform];
    
    // Intent recognition based on user message and context
    const detectedIntent = this.detectIntent(userMessage, context);
    context.intent = detectedIntent;

    switch (detectedIntent) {
      case 'consultation':
        return this.handleConsultationRequest(context, userMessage, platformConfig);
      
      case 'booking':
        return this.handleBookingFlow(context, userMessage, platformConfig);
      
      case 'payment':
        return this.handlePaymentFlow(context, userMessage, platformConfig);
      
      default:
        return this.handleGeneralInquiry(context, userMessage, platformConfig);
    }
  }

  private detectIntent(message: string, context: ConversationContext): 'consultation' | 'information' | 'booking' | 'payment' {
    const lowerMessage = message.toLowerCase();
    
    // Based on current conversation step first
    if (context.currentStep === 'slot_selection' && (lowerMessage.includes('1') || lowerMessage.includes('2') || lowerMessage.includes('3'))) {
      return 'booking';
    }
    
    if (context.currentStep === 'payment_method_selection') {
      return 'booking';
    }
    
    if (context.currentStep === 'awaiting_payment') {
      return 'payment';
    }
    
    // Consultation intent keywords
    if (lowerMessage.includes('consultation') || lowerMessage.includes('doctor') || 
        lowerMessage.includes('lawyer') || lowerMessage.includes('advisor') ||
        lowerMessage.includes('help') || lowerMessage.includes('need') ||
        lowerMessage.includes('diabetes') || lowerMessage.includes('legal') ||
        lowerMessage.includes('investment') || lowerMessage.includes('property') ||
        lowerMessage.includes('software') || lowerMessage.includes('development')) {
      return 'consultation';
    }
    
    return 'information';
  }

  private async handleConsultationRequest(
    context: ConversationContext, 
    message: string, 
    platformConfig: any
  ) {
    // Get available slots from calendar integration
    const availableSlots = await this.getAvailableSlots(context.agentId, context.industry);
    
    let response = this.generateConsultationResponse(context, availableSlots);
    
    const actions = [{
      type: 'calendar_check' as const,
      data: { agentId: context.agentId, requestedSlots: availableSlots }
    }];

    context.currentStep = 'slot_selection';
    context.bookingData = { consultationType: this.inferConsultationType(message) };

    return { response, actions, updatedContext: context };
  }

  private async handleBookingFlow(
    context: ConversationContext, 
    message: string, 
    platformConfig: any
  ) {
    if (context.currentStep === 'slot_selection') {
      // User selected a slot
      const selectedSlot = this.parseSlotSelection(message);
      if (selectedSlot) {
        context.bookingData!.selectedSlot = selectedSlot.id;
        context.currentStep = 'payment_method_selection';
        
        const price = getConsultationPrice(context.industry, context.bookingData?.tier || 'base');
        const paymentMethods = platformConfig.paymentMethods;
        
        const response = this.generatePaymentMethodResponse(context, price, paymentMethods, selectedSlot);
        
        return { 
          response, 
          actions: [], 
          updatedContext: context 
        };
      }
    }
    
    if (context.currentStep === 'payment_method_selection') {
      // User selected payment method
      const selectedMethod = this.parsePaymentMethod(message);
      if (selectedMethod) {
        return this.handlePaymentFlow(context, selectedMethod, platformConfig);
      }
    }

    return this.handleGeneralInquiry(context, message, platformConfig);
  }

  private async handlePaymentFlow(
    context: ConversationContext, 
    message: string, 
    platformConfig: any
  ) {
    const paymentMethod = this.parsePaymentMethod(message) as PaymentMethod;
    const price = getConsultationPrice(context.industry, context.bookingData?.tier || 'base');
    
    // Generate consultation booking
    const consultationId = `CONS_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const description = `${context.industry} consultation`;
    
    const paymentLink = generatePaymentLink(price, 'INR', description, consultationId, paymentMethod);
    
    let response = this.generatePaymentResponse(context, paymentMethod, paymentLink, price);
    
    const actions = [
      {
        type: 'payment_link' as const,
        data: { 
          consultationId, 
          paymentLink, 
          method: paymentMethod, 
          amount: price,
          platform: context.platform
        }
      },
      {
        type: 'booking_confirmation' as const,
        data: {
          consultationId,
          customerId: context.customerId,
          agentId: context.agentId,
          slot: context.bookingData?.selectedSlot,
          customerData: context.customerData
        }
      }
    ];

    context.currentStep = 'awaiting_payment';
    
    return { response, actions, updatedContext: context };
  }

  private generateConsultationResponse(context: ConversationContext, slots: AvailableSlot[]): string {
    const industryGreeting = this.getIndustryGreeting(context.industry);
    const slotOptions = slots.slice(0, 3).map((slot, index) => 
      `${index + 1}. ${this.formatSlotTime(slot.datetime)} - ₹${slot.price} (${slot.type})`
    ).join('\n');

    switch (context.platform) {
      case 'whatsapp':
        return `${industryGreeting} 👋

I can help you book a consultation. Here are available slots:

${slotOptions}

Please reply with the number of your preferred slot, or type "more slots" to see additional options.`;

      case 'instagram':
        return `${industryGreeting} 💬

Available consultations:
${slotOptions}

Reply with slot number to book!`;

      case 'messenger':
        return `${industryGreeting}

Choose your consultation slot:
${slotOptions}

Reply with the slot number to proceed with booking.`;

      default:
        return `Available consultation slots:\n${slotOptions}`;
    }
  }

  private generatePaymentMethodResponse(
    context: ConversationContext, 
    price: number, 
    methods: string[], 
    slot: AvailableSlot
  ): string {
    const methodsList = methods.map((method, index) => 
      `${index + 1}. ${this.getPaymentMethodName(method)}`
    ).join('\n');

    switch (context.platform) {
      case 'whatsapp':
        return `✅ Slot confirmed: ${this.formatSlotTime(slot.datetime)}
💰 Amount: ₹${price}

Choose your payment method:
${methodsList}

Reply with the number of your preferred payment method.`;

      case 'instagram':
        return `Slot: ${this.formatSlotTime(slot.datetime)} - ₹${price}

Payment options:
${methodsList}

Reply with number to pay!`;

      case 'messenger':
        return `Booking confirmed for ${this.formatSlotTime(slot.datetime)}
Amount: ₹${price}

Select payment method:
${methodsList}`;

      default:
        return `Payment methods:\n${methodsList}`;
    }
  }

  private generatePaymentResponse(
    context: ConversationContext, 
    method: PaymentMethod, 
    paymentLink: string, 
    amount: number
  ): string {
    const methodName = this.getPaymentMethodName(method);

    switch (context.platform) {
      case 'whatsapp':
        if (method === PaymentMethod.UPI || method === PaymentMethod.GOOGLEPAY || 
            method === PaymentMethod.PHONEPE || method === PaymentMethod.PAYTM) {
          return `💳 Pay with ${methodName}

Click the link below to complete payment:
${paymentLink}

Or scan the QR code I'll send next.

Amount: ₹${amount}
Your booking will be confirmed once payment is received.`;
        }
        return `Payment link for ${methodName}: ${paymentLink}`;

      case 'instagram':
        return `💳 ${methodName} Payment
Amount: ₹${amount}

Tap link to pay:
${paymentLink}`;

      case 'messenger':
        return `Complete payment using ${methodName}:
${paymentLink}

Amount: ₹${amount}`;

      default:
        return `Payment link: ${paymentLink}`;
    }
  }

  private async getAvailableSlots(agentId: string, industry: string): Promise<AvailableSlot[]> {
    // Integration with calendar system - for now returning mock slots
    const basePrice = getConsultationPrice(industry, 'base');
    const premiumPrice = getConsultationPrice(industry, 'premium');
    
    return [
      {
        id: 'slot_1',
        datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        duration: 30,
        type: 'whatsapp',
        price: basePrice,
        available: true
      },
      {
        id: 'slot_2', 
        datetime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        duration: 45,
        type: 'video',
        price: premiumPrice,
        available: true
      },
      {
        id: 'slot_3',
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 30,
        type: 'phone',
        price: basePrice,
        available: true
      }
    ];
  }

  private parseSlotSelection(message: string): AvailableSlot | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('1') || lowerMessage.includes('first')) {
      return { id: 'slot_1', datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), duration: 30, type: 'whatsapp', price: 500, available: true };
    }
    if (lowerMessage.includes('2') || lowerMessage.includes('second')) {
      return { id: 'slot_2', datetime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), duration: 45, type: 'video', price: 1000, available: true };
    }
    if (lowerMessage.includes('3') || lowerMessage.includes('third')) {
      return { id: 'slot_3', datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), duration: 30, type: 'phone', price: 500, available: true };
    }
    return null;
  }

  private parsePaymentMethod(message: string): PaymentMethod | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('1') || lowerMessage.includes('upi')) return PaymentMethod.UPI;
    if (lowerMessage.includes('2') || lowerMessage.includes('google')) return PaymentMethod.GOOGLEPAY;
    if (lowerMessage.includes('3') || lowerMessage.includes('phone')) return PaymentMethod.PHONEPE;
    if (lowerMessage.includes('4') || lowerMessage.includes('paytm')) return PaymentMethod.PAYTM;
    if (lowerMessage.includes('whatsapp pay')) return PaymentMethod.UPI; // WhatsApp uses UPI
    
    return null;
  }

  private getIndustryGreeting(industry: string): string {
    const greetings = {
      healthcare: "Hello! I'm here to help with your healthcare consultation",
      legal: "Greetings! I can assist with your legal consultation needs",
      finance: "Hi! Ready to help with your financial advisory consultation",
      technology: "Hello! I can help you book a technology consultation",
      realestate: "Hi! I'm here to assist with your real estate consultation"
    };
    return greetings[industry as keyof typeof greetings] || "Hello! How can I help you today?";
  }

  private getPaymentMethodName(method: string): string {
    const names = {
      upi: "UPI (Any App)",
      googlepay: "Google Pay",
      phonepe: "PhonePe", 
      paytm: "Paytm",
      whatsapp_pay: "WhatsApp Pay",
      credit_card: "Credit/Debit Card"
    };
    return names[method as keyof typeof names] || method;
  }

  private formatSlotTime(datetime: string): string {
    const date = new Date(datetime);
    return date.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private inferConsultationType(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('video') || lowerMessage.includes('zoom')) return 'video';
    if (lowerMessage.includes('phone') || lowerMessage.includes('call')) return 'phone';
    if (lowerMessage.includes('whatsapp')) return 'whatsapp';
    return 'whatsapp'; // Default for messaging platforms
  }

  private handleGeneralInquiry(context: ConversationContext, message: string, platformConfig: any) {
    const response = "I can help you book consultations. Would you like to see available slots?";
    return { response, actions: [], updatedContext: context };
  }
}