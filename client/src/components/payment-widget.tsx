import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Phone, CreditCard, Smartphone, MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentWidgetProps {
  agentId: string;
  industry: string;
  consultationType?: 'whatsapp' | 'web_widget' | 'phone_call' | 'video_call' | 'in_person';
  onPaymentSuccess?: (consultationId: string) => void;
  onPaymentFailure?: (error: string) => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface ConsultationBooking {
  consultation_id: string;
  amount: number;
  currency: string;
  payment_link: string;
  payment_method: string;
  status: string;
  expires_at: string;
  qr_code_data?: string;
}

export function PaymentWidget({ 
  agentId, 
  industry, 
  consultationType = 'web_widget',
  onPaymentSuccess,
  onPaymentFailure 
}: PaymentWidgetProps) {
  const [step, setStep] = useState<'form' | 'payment' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [pricing, setPricing] = useState({ price: 0, currency: 'INR' });
  const [booking, setBooking] = useState<ConsultationBooking | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: '',
    tier: 'base',
    description: ''
  });
  const { toast } = useToast();

  const paymentMethods: PaymentMethod[] = [
    { id: 'upi', name: 'UPI', icon: <Smartphone className="w-4 h-4" />, description: 'Google Pay, PhonePe, Paytm' },
    { id: 'googlepay', name: 'Google Pay', icon: <Smartphone className="w-4 h-4" />, description: 'Quick UPI payment' },
    { id: 'phonepe', name: 'PhonePe', icon: <Phone className="w-4 h-4" />, description: 'Instant payment' },
    { id: 'paytm', name: 'Paytm', icon: <Smartphone className="w-4 h-4" />, description: 'Wallet & UPI' },
    { id: 'credit_card', name: 'Credit Card', icon: <CreditCard className="w-4 h-4" />, description: 'Visa, Mastercard, Rupay' },
    { id: 'whatsapp_pay', name: 'WhatsApp Pay', icon: <MessageCircle className="w-4 h-4" />, description: 'Pay via WhatsApp' }
  ];

  useEffect(() => {
    loadPaymentMethods();
    loadPricing();
  }, [industry]);

  const loadPaymentMethods = async () => {
    try {
      const response = await apiRequest('GET', '/api/payment/methods');
      const data = await response.json();
      setAvailableMethods(data.available_methods || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadPricing = async () => {
    try {
      const response = await apiRequest('GET', `/api/payment/pricing/${industry}?tier=${formData.tier}`);
      const data = await response.json();
      setPricing({ price: data.price, currency: data.currency });
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };

  const handleTierChange = (tier: string) => {
    setFormData({ ...formData, tier });
    loadPricing();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/consultation/book', {
        agentId,
        industry,
        consultationType,
        tier: formData.tier,
        paymentMethod: formData.paymentMethod,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        description: formData.description
      });

      if (response.ok) {
        const bookingData = await response.json();
        setBooking(bookingData);
        setStep('payment');
        
        toast({
          title: 'Consultation Booked',
          description: 'Please complete the payment to confirm your consultation.',
        });
      } else {
        throw new Error('Failed to create consultation booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setStep('error');
      onPaymentFailure?.('Failed to create consultation booking');
      
      toast({
        title: 'Booking Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (method: string) => {
    if (!booking) return;

    if (method.includes('upi') || method === 'googlepay' || method === 'phonepe' || method === 'paytm') {
      // Open UPI payment link
      window.open(booking.payment_link, '_self');
    } else if (method === 'whatsapp_pay') {
      // Generate WhatsApp payment
      initiateWhatsAppPayment();
    } else {
      // Redirect to card payment page
      window.open(booking.payment_link, '_blank');
    }
  };

  const initiateWhatsAppPayment = async () => {
    if (!booking) return;

    try {
      const response = await apiRequest('POST', '/api/payment/whatsapp/message', {
        consultation_id: booking.consultation_id,
        customer_phone: formData.customerPhone
      });

      if (response.ok) {
        toast({
          title: 'WhatsApp Payment Sent',
          description: 'Check your WhatsApp for payment instructions.',
        });
      }
    } catch (error) {
      console.error('WhatsApp payment error:', error);
      toast({
        title: 'WhatsApp Payment Failed',
        description: 'Please try another payment method.',
        variant: 'destructive',
      });
    }
  };

  const copyPaymentLink = () => {
    if (booking?.qr_code_data) {
      navigator.clipboard.writeText(booking.qr_code_data);
      toast({
        title: 'Payment Link Copied',
        description: 'UPI payment link copied to clipboard.',
      });
    }
  };

  if (step === 'form') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Book {industry} Consultation</CardTitle>
          <CardDescription>
            Professional consultation via {consultationType.replace('_', ' ')}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+91 9876543210"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Consultation Type</Label>
              <Select value={formData.tier} onValueChange={handleTierChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Basic Consultation</SelectItem>
                  <SelectItem value="premium">Premium Consultation</SelectItem>
                  <SelectItem value="emergency">Emergency/Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter(method => availableMethods.includes(method.id))
                    .map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          {method.icon}
                          <span>{method.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Consultation Details (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what you need help with..."
                rows={3}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Consultation Fee:</span>
                <Badge variant="secondary" className="text-lg">
                  ₹{pricing.price}
                </Badge>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.customerName || !formData.customerPhone || !formData.paymentMethod}
            >
              {loading ? 'Processing...' : `Pay ₹${pricing.price} & Book Consultation`}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  if (step === 'payment' && booking) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Consultation ID: {booking.consultation_id}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ₹{booking.amount}
            </div>
            <div className="text-sm text-gray-500">
              {industry} consultation fee
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {formData.paymentMethod === 'upi' && booking.qr_code_data && (
              <div className="text-center space-y-3">
                <div className="mx-auto w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-gray-400" />
                </div>
                <Button 
                  variant="outline" 
                  onClick={copyPaymentLink}
                  className="w-full"
                >
                  Copy UPI Payment Link
                </Button>
              </div>
            )}

            <Button 
              onClick={() => handlePayment(formData.paymentMethod)}
              className="w-full"
              size="lg"
            >
              Pay with {paymentMethods.find(m => m.id === formData.paymentMethod)?.name}
            </Button>

            <div className="text-xs text-center text-gray-500">
              Payment expires in 30 minutes
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => setStep('form')}
            className="w-full"
          >
            Back to Form
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Payment Successful!</CardTitle>
          <CardDescription>
            Your consultation has been booked successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-lg font-medium">
            Consultation ID: {booking?.consultation_id}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            You will receive a confirmation message shortly
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Payment Failed</CardTitle>
          <CardDescription>
            Something went wrong with your payment
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            onClick={() => setStep('form')}
            className="w-full"
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}