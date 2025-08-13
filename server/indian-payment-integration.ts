// Indian Payment Gateway Integration for AgentHub
// Supports PhonePe, Google Pay, Razorpay, Paytm and other Indian payment methods

export interface IndianPaymentConfig {
  phonepe: {
    merchantId: string;
    saltKey: string;
    saltIndex: number;
    environment: 'PRODUCTION' | 'UAT';
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  paytm: {
    merchantId: string;
    merchantKey: string;
    website: string;
    industryType: string;
    environment: 'PROD' | 'STAGING';
  };
}

// PhonePe Payment Integration
export class PhonePePaymentGateway {
  private config: IndianPaymentConfig['phonepe'];
  
  constructor(config: IndianPaymentConfig['phonepe']) {
    this.config = config;
  }

  async initiatePayment(orderData: {
    amount: number; // in paise
    merchantTransactionId: string;
    merchantUserId: string;
    redirectUrl: string;
    callbackUrl: string;
    mobileNumber?: string;
  }) {
    const payload = {
      merchantId: this.config.merchantId,
      merchantTransactionId: orderData.merchantTransactionId,
      merchantUserId: orderData.merchantUserId,
      amount: orderData.amount,
      redirectUrl: orderData.redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: orderData.callbackUrl,
      mobileNumber: orderData.mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    // Generate checksum
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generatePhonePeChecksum(base64Payload);

    return {
      success: true,
      paymentUrl: `https://api${this.config.environment === 'UAT' ? '-preprod' : ''}.phonepe.com/apis/hermes/pg/v1/pay`,
      payload: base64Payload,
      checksum,
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      }
    };
  }

  private generatePhonePeChecksum(base64Payload: string): string {
    // Simulate checksum generation (use actual crypto.createHmac in production)
    return `${base64Payload}###${this.config.saltIndex}`;
  }

  async verifyPayment(merchantTransactionId: string): Promise<{
    success: boolean;
    transactionId?: string;
    amount?: number;
    status?: string;
  }> {
    // Simulate payment verification
    return {
      success: true,
      transactionId: `PHONEPE_${Date.now()}`,
      amount: 12500,
      status: 'SUCCESS'
    };
  }
}

// Razorpay Payment Integration (for UPI, Cards, Net Banking)
export class RazorpayPaymentGateway {
  private config: IndianPaymentConfig['razorpay'];
  
  constructor(config: IndianPaymentConfig['razorpay']) {
    this.config = config;
  }

  async createOrder(orderData: {
    amount: number; // in paise
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    const order = {
      id: `order_${Date.now()}`,
      entity: 'order',
      amount: orderData.amount,
      amount_paid: 0,
      amount_due: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: 'created',
      attempts: 0,
      notes: orderData.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };

    return {
      success: true,
      order
    };
  }

  async capturePayment(paymentId: string, amount: number) {
    return {
      success: true,
      payment: {
        id: paymentId,
        amount,
        status: 'captured',
        method: 'upi',
        captured: true,
        created_at: Math.floor(Date.now() / 1000)
      }
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): boolean {
    // Implement webhook signature verification
    return true;
  }
}

// Paytm Payment Integration
export class PaytmPaymentGateway {
  private config: IndianPaymentConfig['paytm'];
  
  constructor(config: IndianPaymentConfig['paytm']) {
    this.config = config;
  }

  async initiateTransaction(orderData: {
    orderId: string;
    amount: string;
    custId: string;
    mobileNo?: string;
    email?: string;
  }) {
    const params = {
      MID: this.config.merchantId,
      WEBSITE: this.config.website,
      INDUSTRY_TYPE_ID: this.config.industryType,
      ORDER_ID: orderData.orderId,
      CUST_ID: orderData.custId,
      TXN_AMOUNT: orderData.amount,
      CHANNEL_ID: 'WEB',
      MOBILE_NO: orderData.mobileNo,
      EMAIL: orderData.email,
      CALLBACK_URL: `${process.env.CALLBACK_URL}/paytm/callback`
    };

    // Generate checksum
    const checksum = this.generatePaytmChecksum(params);

    return {
      success: true,
      params: { ...params, CHECKSUMHASH: checksum },
      paymentUrl: `https://secure${this.config.environment === 'STAGING' ? 'stg' : ''}.paytm.in/oltp-web/processTransaction`
    };
  }

  private generatePaytmChecksum(params: Record<string, any>): string {
    // Simulate checksum generation (use actual Paytm checksum logic in production)
    return `PAYTM_CHECKSUM_${Date.now()}`;
  }

  async verifyTransaction(orderId: string): Promise<{
    success: boolean;
    transactionId?: string;
    amount?: string;
    status?: string;
  }> {
    return {
      success: true,
      transactionId: `PAYTM_${Date.now()}`,
      amount: '12500.00',
      status: 'TXN_SUCCESS'
    };
  }
}

// UPI Payment Handler
export class UPIPaymentHandler {
  async generateUPILink(data: {
    vpa: string; // Virtual Payment Address
    amount: number;
    transactionNote: string;
    transactionRef: string;
  }): Promise<string> {
    const upiUrl = `upi://pay?pa=${data.vpa}&am=${data.amount}&tn=${encodeURIComponent(data.transactionNote)}&tr=${data.transactionRef}`;
    return upiUrl;
  }

  async generateQRCode(upiUrl: string): Promise<string> {
    // Generate QR code for UPI payment (base64 image)
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
  }
}

// Net Banking Integration
export class NetBankingGateway {
  private supportedBanks = [
    { code: 'SBIN', name: 'State Bank of India', popular: true },
    { code: 'HDFC', name: 'HDFC Bank', popular: true },
    { code: 'ICIC', name: 'ICICI Bank', popular: true },
    { code: 'UTIB', name: 'Axis Bank', popular: true },
    { code: 'PUNB', name: 'Punjab National Bank', popular: false },
    { code: 'BARB', name: 'Bank of Baroda', popular: false },
    { code: 'CNRB', name: 'Canara Bank', popular: false },
    { code: 'UBIN', name: 'Union Bank', popular: false },
    { code: 'KKBK', name: 'Kotak Mahindra Bank', popular: false },
    { code: 'INDB', name: 'IndusInd Bank', popular: false }
  ];

  getSupportedBanks() {
    return this.supportedBanks;
  }

  async initiateBankPayment(data: {
    bankCode: string;
    amount: number;
    orderId: string;
    customerInfo: {
      name: string;
      email: string;
      phone: string;
    };
  }) {
    const bank = this.supportedBanks.find(b => b.code === data.bankCode);
    if (!bank) {
      throw new Error('Unsupported bank');
    }

    return {
      success: true,
      paymentUrl: `https://netbanking.${bank.code.toLowerCase()}.com/payment`,
      orderId: data.orderId,
      amount: data.amount,
      bankName: bank.name
    };
  }
}

// Unified Indian Payment Manager
export class IndianPaymentManager {
  private phonepe: PhonePePaymentGateway;
  private razorpay: RazorpayPaymentGateway;
  private paytm: PaytmPaymentGateway;
  private upi: UPIPaymentHandler;
  private netbanking: NetBankingGateway;

  constructor(config: IndianPaymentConfig) {
    this.phonepe = new PhonePePaymentGateway(config.phonepe);
    this.razorpay = new RazorpayPaymentGateway(config.razorpay);
    this.paytm = new PaytmPaymentGateway(config.paytm);
    this.upi = new UPIPaymentHandler();
    this.netbanking = new NetBankingGateway();
  }

  async processPayment(method: string, paymentData: any) {
    switch (method) {
      case 'phonepe':
        return await this.phonepe.initiatePayment(paymentData);
      case 'googlepay':
      case 'upi':
        return await this.razorpay.createOrder(paymentData);
      case 'paytm':
        return await this.paytm.initiateTransaction(paymentData);
      case 'netbanking':
        return await this.netbanking.initiateBankPayment(paymentData);
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }

  getSupportedMethods() {
    return [
      { id: 'phonepe', name: 'PhonePe', type: 'upi', popular: true },
      { id: 'googlepay', name: 'Google Pay', type: 'upi', popular: true },
      { id: 'paytm', name: 'Paytm', type: 'wallet', popular: true },
      { id: 'upi', name: 'UPI (Any App)', type: 'upi', popular: true },
      { id: 'netbanking', name: 'Net Banking', type: 'netbanking', popular: false },
      { id: 'card', name: 'Credit/Debit Card', type: 'card', popular: false }
    ];
  }
}

// Export default instance for testing
export const indianPaymentManager = new IndianPaymentManager({
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT',
    saltKey: process.env.PHONEPE_SALT_KEY || 'test_salt_key',
    saltIndex: 1,
    environment: 'UAT'
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret'
  },
  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID || 'DIY12386817555501617',
    merchantKey: process.env.PAYTM_MERCHANT_KEY || 'test_merchant_key',
    website: 'WEBSTAGING',
    industryType: 'Retail',
    environment: 'STAGING'
  }
});