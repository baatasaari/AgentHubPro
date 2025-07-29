// Payment routes for consultation booking and processing
import type { Express } from "express";
import crypto from 'crypto';
import { 
  paymentConfig, 
  PaymentMethod, 
  ConsultationType, 
  PaymentStatus,
  getConsultationPrice,
  generatePaymentLink,
  getPaymentMethods 
} from './payment-config';

interface ConsultationBooking {
  id: string;
  agentId: string;
  industry: string;
  consultationType: ConsultationType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  description: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  paymentLink?: string;
  transactionId?: string;
}

// In-memory storage for consultations (replace with database in production)
const consultationBookings = new Map<string, ConsultationBooking>();

export function registerPaymentRoutes(app: Express) {
  
  // Get available payment methods
  app.get('/api/payment/methods', (req, res) => {
    const methods = getPaymentMethods();
    res.json({
      available_methods: methods,
      upi_enabled: paymentConfig.upi.enabled,
      stripe_enabled: paymentConfig.stripe.enabled,
      razorpay_enabled: paymentConfig.razorpay.enabled,
      phonepe_enabled: paymentConfig.phonepe.enabled,
      whatsapp_enabled: paymentConfig.whatsapp.enabled
    });
  });

  // Get consultation pricing
  app.get('/api/payment/pricing/:industry', (req, res) => {
    const { industry } = req.params;
    const { tier = 'base' } = req.query;
    
    const price = getConsultationPrice(industry, tier as string);
    
    res.json({
      industry,
      tier,
      price,
      currency: 'INR'
    });
  });

  // Create consultation booking with payment
  app.post('/api/consultation/book', async (req, res) => {
    try {
      const {
        agentId,
        industry,
        consultationType,
        tier = 'base',
        paymentMethod,
        customerName,
        customerPhone,
        customerEmail,
        description,
        scheduledAt
      } = req.body;

      // Validate required fields
      if (!agentId || !industry || !consultationType || !paymentMethod || !customerName || !customerPhone) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['agentId', 'industry', 'consultationType', 'paymentMethod', 'customerName', 'customerPhone']
        });
      }

      // Generate consultation ID
      const consultationId = `CONS_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Get pricing
      const amount = getConsultationPrice(industry, tier);
      
      // Generate payment link
      const paymentLink = generatePaymentLink(
        amount,
        'INR',
        `${industry} consultation - ${description || 'Professional consultation'}`,
        consultationId,
        paymentMethod as PaymentMethod
      );

      // Create consultation booking
      const consultation: ConsultationBooking = {
        id: consultationId,
        agentId,
        industry,
        consultationType: consultationType as ConsultationType,
        amount,
        currency: 'INR',
        paymentMethod: paymentMethod as PaymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        customerName,
        customerPhone,
        customerEmail,
        description: description || `${industry} consultation`,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        paymentLink,
        transactionId: undefined
      };

      consultationBookings.set(consultationId, consultation);

      res.status(201).json({
        consultation_id: consultationId,
        amount,
        currency: 'INR',
        payment_link: paymentLink,
        payment_method: paymentMethod,
        status: PaymentStatus.PENDING,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        qr_code_data: paymentMethod.includes('upi') ? paymentLink : undefined
      });

    } catch (error) {
      console.error('Error creating consultation booking:', error);
      res.status(500).json({ error: 'Failed to create consultation booking' });
    }
  });

  // Get consultation booking details
  app.get('/api/consultation/:consultationId', (req, res) => {
    const { consultationId } = req.params;
    const consultation = consultationBookings.get(consultationId);

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    res.json(consultation);
  });

  // WhatsApp payment webhook/callback
  app.post('/api/payment/whatsapp/callback', (req, res) => {
    try {
      const { consultation_id, payment_status, transaction_id } = req.body;
      
      const consultation = consultationBookings.get(consultation_id);
      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      consultation.paymentStatus = payment_status as PaymentStatus;
      consultation.transactionId = transaction_id;
      consultation.updatedAt = new Date();

      consultationBookings.set(consultation_id, consultation);

      res.json({ success: true, status: payment_status });

    } catch (error) {
      console.error('WhatsApp payment callback error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  });

  // UPI payment verification
  app.post('/api/payment/upi/verify', (req, res) => {
    try {
      const { consultation_id, transaction_ref, amount } = req.body;
      
      const consultation = consultationBookings.get(consultation_id);
      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      // In production, verify with payment gateway
      // For now, simulate verification
      const isValid = amount === consultation.amount;

      if (isValid) {
        consultation.paymentStatus = PaymentStatus.COMPLETED;
        consultation.transactionId = transaction_ref;
        consultation.updatedAt = new Date();
        consultationBookings.set(consultation_id, consultation);
      }

      res.json({
        verified: isValid,
        status: isValid ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        transaction_id: transaction_ref
      });

    } catch (error) {
      console.error('UPI verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Generate WhatsApp payment message
  app.post('/api/payment/whatsapp/message', (req, res) => {
    try {
      const { consultation_id, customer_phone } = req.body;
      
      const consultation = consultationBookings.get(consultation_id);
      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      const paymentMessage = {
        to: customer_phone,
        type: 'template',
        template: {
          name: 'payment_request',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: consultation.customerName },
                { type: 'text', text: consultation.industry },
                { type: 'currency', currency: { fallback_value: `₹${consultation.amount}`, code: 'INR', amount_1000: consultation.amount * 1000 } },
                { type: 'text', text: consultation.paymentLink }
              ]
            },
            {
              type: 'button',
              sub_type: 'quick_reply',
              index: 0,
              parameters: [{ type: 'payload', payload: `PAY_${consultation_id}` }]
            }
          ]
        }
      };

      res.json({
        message: paymentMessage,
        consultation_id: consultation_id,
        payment_link: consultation.paymentLink
      });

    } catch (error) {
      console.error('WhatsApp message generation error:', error);
      res.status(500).json({ error: 'Message generation failed' });
    }
  });

  // Get all consultations (for admin)
  app.get('/api/consultations', (req, res) => {
    const { status, industry, agent_id } = req.query;
    
    let consultations = Array.from(consultationBookings.values());
    
    if (status) {
      consultations = consultations.filter(c => c.paymentStatus === status);
    }
    
    if (industry) {
      consultations = consultations.filter(c => c.industry === industry);
    }
    
    if (agent_id) {
      consultations = consultations.filter(c => c.agentId === agent_id);
    }

    res.json({
      consultations,
      total: consultations.length,
      summary: {
        pending: consultations.filter(c => c.paymentStatus === PaymentStatus.PENDING).length,
        completed: consultations.filter(c => c.paymentStatus === PaymentStatus.COMPLETED).length,
        failed: consultations.filter(c => c.paymentStatus === PaymentStatus.FAILED).length
      }
    });
  });

  // Update payment status (manual override)
  app.patch('/api/consultation/:consultationId/status', (req, res) => {
    try {
      const { consultationId } = req.params;
      const { status, transaction_id } = req.body;

      const consultation = consultationBookings.get(consultationId);
      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      consultation.paymentStatus = status as PaymentStatus;
      if (transaction_id) {
        consultation.transactionId = transaction_id;
      }
      consultation.updatedAt = new Date();

      consultationBookings.set(consultationId, consultation);

      res.json({
        consultation_id: consultationId,
        status: consultation.paymentStatus,
        updated_at: consultation.updatedAt
      });

    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ error: 'Status update failed' });
    }
  });
}