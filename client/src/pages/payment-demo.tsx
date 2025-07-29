import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentWidget } from '@/components/payment-widget';
import { WidgetEmbedGenerator } from '@/components/widget-embed-generator';
import { Smartphone, MessageCircle, CreditCard, Globe, QrCode, Zap } from 'lucide-react';

export default function PaymentDemo() {
  const [selectedDemo, setSelectedDemo] = useState<string>('widget');

  const demoScenarios = [
    {
      id: 'healthcare',
      industry: 'healthcare',
      title: 'Healthcare Consultation',
      description: 'Book a consultation with Dr. Sharma for diabetes management',
      price: 500,
      consultationType: 'whatsapp' as const,
      customerData: {
        name: 'Rajesh Kumar',
        phone: '+91 9876543210',
        issue: 'Need consultation about diabetes management and diet planning'
      }
    },
    {
      id: 'legal',
      industry: 'legal',
      title: 'Legal Consultation',
      description: 'Property dispute consultation with advocate',
      price: 1000,
      consultationType: 'web_widget' as const,
      customerData: {
        name: 'Priya Sharma',
        phone: '+91 8765432109',
        issue: 'Property dispute resolution and documentation review'
      }
    },
    {
      id: 'finance',
      industry: 'finance',
      title: 'Financial Advisory',
      description: 'Investment planning and tax consultation',
      price: 800,
      consultationType: 'video_call' as const,
      customerData: {
        name: 'Amit Patel',
        phone: '+91 7654321098',
        issue: 'Investment portfolio review and tax planning advice'
      }
    }
  ];

  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Universal Payment Interface',
      popular: true,
      apps: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM']
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      icon: <Smartphone className="w-6 h-6 text-blue-600" />,
      description: 'Quick UPI payments with Google Pay',
      popular: true
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      icon: <Smartphone className="w-6 h-6 text-purple-600" />,
      description: 'Instant payments via PhonePe',
      popular: true
    },
    {
      id: 'paytm',
      name: 'Paytm',
      icon: <Smartphone className="w-6 h-6 text-blue-500" />,
      description: 'Wallet and UPI payments',
      popular: false
    },
    {
      id: 'whatsapp_pay',
      name: 'WhatsApp Pay',
      icon: <MessageCircle className="w-6 h-6 text-green-600" />,
      description: 'Pay directly through WhatsApp',
      popular: false
    },
    {
      id: 'credit_card',
      name: 'Credit Card',
      icon: <CreditCard className="w-6 h-6 text-gray-600" />,
      description: 'Visa, Mastercard, RuPay',
      popular: false
    }
  ];

  const integrationTypes = [
    {
      id: 'widget',
      name: 'Web Widget',
      icon: <Globe className="w-5 h-5" />,
      description: 'Floating consultation button on websites'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Integration',
      icon: <MessageCircle className="w-5 h-5" />,
      description: 'Direct WhatsApp consultation booking'
    },
    {
      id: 'qr',
      name: 'QR Code Payments',
      icon: <QrCode className="w-5 h-5" />,
      description: 'Instant QR code based payments'
    },
    {
      id: 'api',
      name: 'API Integration',
      icon: <Zap className="w-5 h-5" />,
      description: 'Custom integration via REST API'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Payment Integration Demo</h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience seamless consultation booking with Indian payment methods
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">🇮🇳 India-Specific</Badge>
            <Badge variant="secondary">⚡ Instant Payments</Badge>
            <Badge variant="secondary">📱 Mobile-First</Badge>
            <Badge variant="secondary">🔒 Secure</Badge>
          </div>
        </div>

        <Tabs value={selectedDemo} onValueChange={setSelectedDemo} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {integrationTypes.map((type) => (
              <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                {type.icon}
                <span className="hidden md:inline">{type.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Web Widget Demo */}
          <TabsContent value="widget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Web Widget Integration
                </CardTitle>
                <CardDescription>
                  Embeddable consultation widget for customer websites with integrated payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Live Demo</h3>
                    <div className="space-y-4">
                      {demoScenarios.map((scenario) => (
                        <Card key={scenario.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{scenario.title}</h4>
                            <Badge variant="outline">₹{scenario.price}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                          <PaymentWidget
                            agentId={scenario.id}
                            industry={scenario.industry}
                            consultationType={scenario.consultationType}
                            onPaymentSuccess={(consultationId) => {
                              console.log('Payment successful:', consultationId);
                            }}
                          />
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map((method) => (
                        <Card key={method.id} className="p-3">
                          <div className="flex items-center gap-3">
                            {method.icon}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{method.name}</span>
                                {method.popular && (
                                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{method.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Integration Demo */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  WhatsApp Payment Integration
                </CardTitle>
                <CardDescription>
                  Direct consultation booking through WhatsApp with payment links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">WhatsApp Flow</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                        <div>
                          <p className="font-medium">Customer Contacts Business</p>
                          <p className="text-sm text-gray-600">Via WhatsApp business number</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                        <div>
                          <p className="font-medium">Agent Responds</p>
                          <p className="text-sm text-gray-600">Sends consultation booking link</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                        <div>
                          <p className="font-medium">Payment Processing</p>
                          <p className="text-sm text-gray-600">UPI payment via WhatsApp or browser</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                        <div>
                          <p className="font-medium">Consultation Confirmed</p>
                          <p className="text-sm text-gray-600">Booking confirmed via WhatsApp</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">WhatsApp Payment Examples</h3>
                    
                    <div className="p-4 bg-gray-50 rounded-lg font-mono text-sm">
                      <p className="text-green-600 mb-2">🟢 Healthcare Consultation</p>
                      <p>Hi Rajesh! 👋</p>
                      <p>Book your diabetes consultation with Dr. Sharma:</p>
                      <p className="text-blue-600">💳 Pay ₹500: upi://pay?pa=dummy@paytm&pn=AgentHub&am=500...</p>
                      <p>⏰ Available slots: Today 2-6 PM</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg font-mono text-sm">
                      <p className="text-blue-600 mb-2">🔵 Legal Consultation</p>  
                      <p>Hi Priya! ⚖️</p>
                      <p>Property dispute consultation ready:</p>
                      <p className="text-blue-600">💳 Pay ₹1000: gpay://upi/pay?pa=dummy@paytm&pn=AgentHub&am=1000...</p>
                      <p>📋 Bring property documents</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Demo */}
          <TabsContent value="qr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code Payment Integration
                </CardTitle>
                <CardDescription>
                  Instant QR code generation for offline and online payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {demoScenarios.map((scenario) => (
                    <Card key={scenario.id} className="text-center p-4">
                      <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-gray-400" />
                      </div>
                      <h3 className="font-semibold mb-2">{scenario.title}</h3>
                      <Badge variant="outline" className="mb-3">₹{scenario.price}</Badge>
                      <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Generate QR Code
                        </Button>
                        <p className="text-xs text-gray-500">
                          Scan with any UPI app
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Integration Demo */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  API Integration
                </CardTitle>
                <CardDescription>
                  Custom payment integration using our REST API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WidgetEmbedGenerator />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">UPI Integration</h3>
            <p className="text-sm text-gray-600">
              Support for all major UPI apps including Google Pay, PhonePe, and Paytm
            </p>
          </Card>

          <Card className="text-center p-6">
            <MessageCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">WhatsApp Payments</h3>
            <p className="text-sm text-gray-600">
              Direct payment links sent through WhatsApp Business API
            </p>
          </Card>

          <Card className="text-center p-6">
            <Globe className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Web Integration</h3>
            <p className="text-sm text-gray-600">
              Embeddable widgets for seamless website integration
            </p>
          </Card>

          <Card className="text-center p-6">
            <QrCode className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">QR Payments</h3>
            <p className="text-sm text-gray-600">
              Dynamic QR code generation for offline consultations
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}