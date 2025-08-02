// Payment configuration system for AgentHub platform
// Supports Indian payment methods and international payments

export interface PaymentConfig {
  stripe: {
    publicKey: string;
    secretKey: string;
    enabled: boolean;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    enabled: boolean;
  };
  phonepe: {
    merchantId: string;
    saltKey: string;
    saltIndex: string;
    enabled: boolean;
  };
  upi: {
    vpa: string; // Virtual Payment Address
    enabled: boolean;
  };
  whatsapp: {
    businessAccountId: string;
    accessToken: string;
    phoneNumberId: string;
    enabled: boolean;
  };
}

// Default configuration with dummy keys (configurable)
export const paymentConfig: PaymentConfig = {
  stripe: {
    publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy_key_for_development',
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_development',
    enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLIC_KEY)
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_for_development',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_development',
    enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  },
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT',
    saltKey: process.env.PHONEPE_SALT_KEY || 'dummy_salt_key_for_development',
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    enabled: !!(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY)
  },
  upi: {
    vpa: process.env.UPI_VPA || 'dummy@paytm', // Business UPI ID
    enabled: !!process.env.UPI_VPA
  },
  whatsapp: {
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'dummy_business_account',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'dummy_access_token',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'dummy_phone_number_id',
    enabled: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  }
};

// Payment method types supported
export enum PaymentMethod {
  UPI = 'upi',
  PHONEPE = 'phonepe',
  GOOGLEPAY = 'googlepay',
  PAYTM = 'paytm',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  NET_BANKING = 'net_banking',
  WALLET = 'wallet',
  WHATSAPP_PAY = 'whatsapp_pay'
}

// Consultation types
export enum ConsultationType {
  WHATSAPP = 'whatsapp',
  WEB_WIDGET = 'web_widget',
  PHONE_CALL = 'phone_call',
  VIDEO_CALL = 'video_call',
  IN_PERSON = 'in_person'
}

// Payment status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Consultation pricing by industry (in INR)
export const consultationPricing = {
  healthcare: { base: 500, premium: 1500, emergency: 2000 },
  legal: { base: 500, premium: 1000, court_matter: 2500 },
  finance: { base: 300, premium: 800, investment_advice: 1200 },
  realestate: { base: 200, premium: 500, site_visit: 1000 },
  education: { base: 200, premium: 500, career_counseling: 800 },
  technology: { base: 1000, premium: 2500, project_consultation: 5000 },
  consulting: { base: 2000, premium: 5000, strategy_session: 10000 },
  fitness: { base: 300, premium: 800, personal_training: 1200 },
  automotive: { base: 200, premium: 500, on_site_service: 800 },
  hospitality: { base: 100, premium: 300, event_planning: 1500 },
  retail: { base: 100, premium: 250, personal_shopping: 500 },
  foodbeverage: { base: 150, premium: 400, catering_consultation: 1000 }
};

export function getPaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  
  if (paymentConfig.upi.enabled) {
    methods.push(PaymentMethod.UPI, PaymentMethod.GOOGLEPAY, PaymentMethod.PHONEPE, PaymentMethod.PAYTM);
  }
  
  if (paymentConfig.stripe.enabled) {
    methods.push(PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD);
  }
  
  if (paymentConfig.razorpay.enabled) {
    methods.push(PaymentMethod.NET_BANKING, PaymentMethod.WALLET);
  }
  
  if (paymentConfig.whatsapp.enabled) {
    methods.push(PaymentMethod.WHATSAPP_PAY);
  }
  
  return methods;
}

export function getConsultationPrice(industry: string, tier: string = 'base'): number {
  const pricing = consultationPricing[industry as keyof typeof consultationPricing];
  if (!pricing) return 500; // Default price
  
  return pricing[tier as keyof typeof pricing] || pricing.base;
}

export function generatePaymentLink(
  amount: number,
  currency: string = 'INR',
  description: string,
  consultationId: string,
  method: PaymentMethod
): string {
  const baseUrl = config.api.baseUrl;
  
  switch (method) {
    case PaymentMethod.UPI:
      return `upi://pay?pa=${paymentConfig.upi.vpa}&pn=AgentHub&am=${amount}&cu=${currency}&tn=${encodeURIComponent(description)}&tr=${consultationId}`;
    
    case PaymentMethod.PHONEPE:
      return `phonepe://pay?pa=${paymentConfig.upi.vpa}&pn=AgentHub&am=${amount}&cu=${currency}&tn=${encodeURIComponent(description)}`;
    
    case PaymentMethod.GOOGLEPAY:
      return `gpay://upi/pay?pa=${paymentConfig.upi.vpa}&pn=AgentHub&am=${amount}&cu=${currency}&tn=${encodeURIComponent(description)}`;
    
    case PaymentMethod.PAYTM:
      return `paytmmp://pay?pa=${paymentConfig.upi.vpa}&pn=AgentHub&am=${amount}&cu=${currency}&tn=${encodeURIComponent(description)}`;
    
    default:
      return `${baseUrl}/payment/checkout?amount=${amount}&currency=${currency}&description=${encodeURIComponent(description)}&consultation_id=${consultationId}&method=${method}`;
  }
}

export function isPaymentEnabled(): boolean {
  return paymentConfig.stripe.enabled || 
         paymentConfig.razorpay.enabled || 
         paymentConfig.phonepe.enabled || 
         paymentConfig.upi.enabled;
}