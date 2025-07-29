import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PaymentWidget } from '@/components/payment-widget';
import { apiRequest } from '@/lib/queryClient';
import { MessageCircle, Globe, Phone, Video, MapPin } from 'lucide-react';

interface Agent {
  id: string;
  businessName: string;
  industry: string;
  description?: string;
}

export default function ConsultationBookingPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [consultationType, setConsultationType] = useState<'whatsapp' | 'web_widget' | 'phone_call' | 'video_call' | 'in_person'>('whatsapp');
  const [showPayment, setShowPayment] = useState(false);

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/agents');
      return response.json();
    }
  });

  const { data: consultations } = useQuery({
    queryKey: ['/api/consultations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/consultations');
      return response.json();
    }
  });

  useEffect(() => {
    if (agents && agents.length > 0) {
      // Auto-select first agent if none selected
      if (!selectedAgent) {
        setSelectedAgent(agents[0]);
      }
    }
  }, [agents, selectedAgent]);

  const consultationTypes = [
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp Consultation',
      icon: <MessageCircle className="w-5 h-5" />,
      description: 'Chat via WhatsApp with instant responses',
      popular: true
    },
    {
      id: 'web_widget' as const,
      name: 'Web Chat',
      icon: <Globe className="w-5 h-5" />,
      description: 'Live chat through our web platform'
    },
    {
      id: 'phone_call' as const,
      name: 'Phone Call',
      icon: <Phone className="w-5 h-5" />,
      description: 'Direct phone consultation'
    },
    {
      id: 'video_call' as const,
      name: 'Video Call',
      icon: <Video className="w-5 h-5" />,
      description: 'Face-to-face video consultation'
    },
    {
      id: 'in_person' as const,
      name: 'In-Person Meeting',
      icon: <MapPin className="w-5 h-5" />,
      description: 'Meet at our office or your location'
    }
  ];

  const handlePaymentSuccess = (consultationId: string) => {
    console.log('Payment successful for consultation:', consultationId);
    // Handle success (redirect, show confirmation, etc.)
  };

  const handlePaymentFailure = (error: string) => {
    console.error('Payment failed:', error);
    // Handle failure (show error message, retry options, etc.)
  };

  if (showPayment && selectedAgent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Book Consultation</h1>
            <p className="text-gray-600">
              {selectedAgent.businessName} - {selectedAgent.industry}
            </p>
          </div>

          <PaymentWidget
            agentId={selectedAgent.id}
            industry={selectedAgent.industry}
            consultationType={consultationType}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailure={handlePaymentFailure}
          />

          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowPayment(false)}
            >
              Back to Options
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Book a Consultation</h1>
          <p className="text-lg text-gray-600">
            Get expert advice from our industry specialists
          </p>
        </div>

        {/* Agent Selection */}
        {!selectedAgent && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose Your Expert</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents?.map((agent: Agent) => (
                <Card 
                  key={agent.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{agent.businessName}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary">{agent.industry}</Badge>
                    </CardDescription>
                  </CardHeader>
                  {agent.description && (
                    <CardContent>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Selected Agent Info */}
        {selectedAgent && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedAgent.businessName}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary">{selectedAgent.industry}</Badge>
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAgent(null)}
                  >
                    Change Expert
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Consultation Type Selection */}
        {selectedAgent && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose Consultation Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consultationTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    consultationType === type.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setConsultationType(type.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {type.icon}
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {type.name}
                          {type.popular && (
                            <Badge variant="default" className="text-xs">Popular</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {type.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Proceed to Payment */}
        {selectedAgent && (
          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => setShowPayment(true)}
              className="px-8"
            >
              Proceed to Book & Pay
            </Button>
          </div>
        )}

        {/* Recent Consultations */}
        {consultations?.consultations?.length > 0 && (
          <div className="mt-12">
            <Separator className="mb-6" />
            <h2 className="text-xl font-semibold mb-4">Recent Consultations</h2>
            <div className="space-y-3">
              {consultations.consultations.slice(0, 5).map((consultation: any) => (
                <Card key={consultation.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{consultation.description}</p>
                        <p className="text-sm text-gray-500">
                          {consultation.industry} • {consultation.consultationType.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            consultation.paymentStatus === 'completed' ? 'default' :
                            consultation.paymentStatus === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {consultation.paymentStatus}
                        </Badge>
                        <p className="text-sm font-medium mt-1">₹{consultation.amount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}