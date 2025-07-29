import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Instagram, Send, Phone, Calendar, BarChart, Smartphone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConversationContext {
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
  intent?: string;
  currentStep?: string;
  bookingData?: any;
}

interface ChatMessage {
  id: string;
  sender: 'customer' | 'agent';
  message: string;
  timestamp: string;
  actions?: any[];
  platform: string;
}

export default function ConversationalPaymentDemo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    whatsapp: [],
    instagram: [],
    messenger: []
  });
  
  const [conversationContexts, setConversationContexts] = useState<Record<string, ConversationContext>>({
    whatsapp: {
      platform: 'whatsapp',
      customerId: 'cust_rajesh_001',
      agentId: '1',
      industry: 'healthcare',
      sessionId: 'session_wa_001',
      customerData: {
        name: 'Rajesh Kumar',
        phone: '+91 9876543210',
        email: 'rajesh@example.com'
      }
    },
    instagram: {
      platform: 'instagram',
      customerId: 'cust_priya_002',
      agentId: '2',
      industry: 'legal',
      sessionId: 'session_ig_002',
      customerData: {
        name: 'Priya Sharma',
        phone: '+91 8765432109',
        email: 'priya@example.com'
      }
    },
    messenger: {
      platform: 'messenger',
      customerId: 'cust_amit_003',
      agentId: '3',
      industry: 'finance',
      sessionId: 'session_msg_003',
      customerData: {
        name: 'Amit Patel',
        phone: '+91 7654321098',
        email: 'amit@example.com'
      }
    }
  });

  const [currentMessage, setCurrentMessage] = useState('');

  // Fetch calendar slots
  const { data: calendarSlots } = useQuery({
    queryKey: ['/api/calendar/slots', conversationContexts[activeTab]?.agentId, conversationContexts[activeTab]?.industry],
    queryFn: () => apiRequest('GET', `/api/calendar/slots/${conversationContexts[activeTab]?.agentId}?industry=${conversationContexts[activeTab]?.industry}`).then(res => res.json()),
    enabled: !!conversationContexts[activeTab]?.agentId
  });

  // Fetch insights report
  const { data: insightsReport } = useQuery({
    queryKey: ['/api/insights/report', conversationContexts[activeTab]?.agentId],
    queryFn: () => apiRequest('GET', `/api/insights/report/${conversationContexts[activeTab]?.agentId}`).then(res => res.json()),
    enabled: !!conversationContexts[activeTab]?.agentId
  });

  // Process conversation mutation
  const processConversationMutation = useMutation({
    mutationFn: async ({ context, message }: { context: ConversationContext; message: string }) => {
      const response = await apiRequest('POST', '/api/conversation/process', { context, message });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const platform = variables.context.platform;
      
      // Add customer message
      const customerMessage: ChatMessage = {
        id: `msg_${Date.now()}_customer`,
        sender: 'customer',
        message: variables.message,
        timestamp: new Date().toISOString(),
        platform
      };

      // Add agent response
      const agentMessage: ChatMessage = {
        id: `msg_${Date.now()}_agent`,
        sender: 'agent',
        message: data.response,
        timestamp: new Date().toISOString(),
        actions: data.actions,
        platform
      };

      setChatMessages(prev => ({
        ...prev,
        [platform]: [...(prev[platform] || []), customerMessage, agentMessage]
      }));

      // Update conversation context
      setConversationContexts(prev => ({
        ...prev,
        [platform]: data.updatedContext
      }));

      // Show payment link if generated
      if (data.actions?.some((action: any) => action.type === 'payment_link')) {
        const paymentAction = data.actions.find((action: any) => action.type === 'payment_link');
        toast({
          title: "Payment Link Generated",
          description: `Consultation ID: ${paymentAction.data.consultationId}`,
        });
      }

      // Refresh insights
      queryClient.invalidateQueries({ queryKey: ['/api/insights/report'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process conversation",
        variant: "destructive"
      });
    }
  });

  const sendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const context = conversationContexts[activeTab];
    processConversationMutation.mutate({ context, message: currentMessage });
    setCurrentMessage('');
  };

  const platformIcons = {
    whatsapp: <MessageCircle className="w-5 h-5 text-green-600" />,
    instagram: <Instagram className="w-5 h-5 text-pink-600" />,
    messenger: <Send className="w-5 h-5 text-blue-600" />
  };

  const platformColors = {
    whatsapp: 'bg-green-50 border-green-200',
    instagram: 'bg-pink-50 border-pink-200',
    messenger: 'bg-blue-50 border-blue-200'
  };

  const quickMessages = {
    whatsapp: [
      "I need a consultation",
      "Book appointment",
      "1", "2", "3",
      "UPI", "Google Pay", "PhonePe"
    ],
    instagram: [
      "legal consultation needed",
      "property dispute help",
      "1", "2", "3",
      "googlepay", "phonepe", "upi"
    ],
    messenger: [
      "financial planning advice",
      "investment consultation",
      "1", "2", "3",
      "credit card", "upi", "paytm"
    ]
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Conversational Payment System</h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience payment integration within WhatsApp, Instagram, and Messenger conversations
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">🇮🇳 India-Specific</Badge>
            <Badge variant="secondary">💬 Conversational</Badge>
            <Badge variant="secondary">📅 Calendar Integration</Badge>
            <Badge variant="secondary">📊 Insights Tracking</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Platform Conversations
                </CardTitle>
                <CardDescription>
                  Test conversational payment flows across different messaging platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                      {platformIcons.whatsapp}
                      WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="instagram" className="flex items-center gap-2">
                      {platformIcons.instagram}
                      Instagram
                    </TabsTrigger>
                    <TabsTrigger value="messenger" className="flex items-center gap-2">
                      {platformIcons.messenger}
                      Messenger
                    </TabsTrigger>
                  </TabsList>

                  {(['whatsapp', 'instagram', 'messenger'] as const).map((platform) => (
                    <TabsContent key={platform} value={platform} className="space-y-4">
                      {/* Chat Messages */}
                      <div className={`h-96 p-4 border rounded-lg overflow-y-auto ${platformColors[platform]}`}>
                        {chatMessages[platform]?.length === 0 ? (
                          <div className="text-center text-gray-500 mt-20">
                            <div className="mb-4">{platformIcons[platform]}</div>
                            <p>Start a conversation to test payment integration</p>
                            <p className="text-sm mt-2">
                              Customer: {conversationContexts[platform]?.customerData.name} ({conversationContexts[platform]?.industry})
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chatMessages[platform]?.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-3 py-2 rounded-lg ${
                                  msg.sender === 'customer' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border shadow-sm'
                                }`}>
                                  <p className="text-sm whitespace-pre-line">{msg.message}</p>
                                  {msg.actions && msg.actions.length > 0 && (
                                    <div className="mt-2 text-xs opacity-75">
                                      {msg.actions.map((action, idx) => (
                                        <Badge key={idx} variant="outline" className="mr-1 text-xs">
                                          {action.type}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Type a message on ${platform}...`}
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          disabled={processConversationMutation.isPending}
                        />
                        <Button 
                          onClick={sendMessage}
                          disabled={processConversationMutation.isPending || !currentMessage.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Quick Messages */}
                      <div className="flex flex-wrap gap-2">
                        {quickMessages[platform].map((msg, idx) => (
                          <Button 
                            key={idx}
                            variant="outline" 
                            size="sm"
                            onClick={() => setCurrentMessage(msg)}
                            className="text-xs"
                          >
                            {msg}
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Calendar Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Available Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calendarSlots ? (
                  <div className="space-y-3">
                    {calendarSlots.slice(0, 3).map((slot: any, idx: number) => (
                      <div key={slot.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">Slot {idx + 1}</span>
                          <Badge variant="outline">{slot.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {new Date(slot.datetime).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">{slot.duration} minutes</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading calendar slots...</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['UPI', 'Google Pay', 'PhonePe', 'Paytm'].map((method) => (
                    <div key={method} className="p-2 border rounded text-center text-xs">
                      {method}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Insights Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Live Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insightsReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Revenue</span>
                      <span className="font-medium">₹{insightsReport.paymentMetrics?.totalRevenue || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transactions</span>
                      <span className="font-medium">{insightsReport.paymentMetrics?.totalTransactions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="font-medium">{(insightsReport.paymentMetrics?.conversionRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customers</span>
                      <span className="font-medium">{insightsReport.customerInsights?.totalCustomers || 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading insights...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <MessageCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">WhatsApp Integration</h3>
            <p className="text-sm text-gray-600">
              Natural payment conversations within WhatsApp Business API
            </p>
          </Card>

          <Card className="text-center p-6">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Calendar Booking</h3>
            <p className="text-sm text-gray-600">
              Real-time slot availability with automatic email notifications
            </p>
          </Card>

          <Card className="text-center p-6">
            <Smartphone className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Indian Payments</h3>
            <p className="text-sm text-gray-600">
              UPI, Google Pay, PhonePe, and Paytm integration support
            </p>
          </Card>

          <Card className="text-center p-6">
            <BarChart className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Live Insights</h3>
            <p className="text-sm text-gray-600">
              Real-time payment analytics and customer insights tracking
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}