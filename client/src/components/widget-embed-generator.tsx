import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Code, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WidgetConfig {
  agentId: string;
  industry: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large';
  showBranding: boolean;
  autoOpen: boolean;
  welcomeMessage: string;
  buttonText: string;
  paymentMethods: string[];
  consultationTypes: string[];
  customDomain: string;
}

export function WidgetEmbedGenerator() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WidgetConfig>({
    agentId: '1',
    industry: 'healthcare',
    primaryColor: '#2563eb',
    position: 'bottom-right',
    size: 'medium',
    showBranding: true,
    autoOpen: false,
    welcomeMessage: 'Hi! How can I help you today?',
    buttonText: 'Book Consultation',
    paymentMethods: ['upi', 'googlepay', 'phonepe'],
    consultationTypes: ['whatsapp', 'web_widget'],
    customDomain: ''
  });

  const generateEmbedCode = () => {
    const baseUrl = config.customDomain || window.location.origin;
    const configParam = encodeURIComponent(JSON.stringify(config));
    
    return `<!-- AgentHub Consultation Widget -->
<div id="agenthub-widget"></div>
<script>
  (function() {
    var config = ${JSON.stringify(config, null, 2)};
    
    // Create widget container
    var widget = document.createElement('div');
    widget.id = 'agenthub-consultation-widget';
    widget.style.cssText = \`
      position: fixed;
      ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: ${config.size === 'small' ? '300px' : config.size === 'large' ? '400px' : '350px'};
      height: ${config.size === 'small' ? '400px' : config.size === 'large' ? '600px' : '500px'};
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: ${config.autoOpen ? 'block' : 'none'};
      overflow: hidden;
    \`;
    
    // Create iframe for secure embedding
    var iframe = document.createElement('iframe');
    iframe.src = '${baseUrl}/consultation?embedded=true&config=' + encodeURIComponent(JSON.stringify(config));
    iframe.style.cssText = \`
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    \`;
    iframe.allow = 'payment';
    
    widget.appendChild(iframe);
    
    // Create floating button
    var button = document.createElement('button');
    button.innerHTML = \`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="margin-left: 8px;">${config.buttonText}</span>
    \`;
    button.style.cssText = \`
      position: fixed;
      ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      background: ${config.primaryColor};
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      z-index: 999998;
      transition: all 0.3s ease;
    \`;
    
    // Toggle widget visibility
    button.onclick = function() {
      if (widget.style.display === 'none') {
        widget.style.display = 'block';
        button.style.display = 'none';
      }
    };
    
    // Close widget functionality
    widget.onclick = function(e) {
      if (e.target === widget) {
        widget.style.display = 'none';
        button.style.display = 'flex';
      }
    };
    
    // Add elements to page
    document.body.appendChild(button);
    document.body.appendChild(widget);
    
    // WhatsApp integration
    window.AgentHub = {
      openWidget: function() {
        widget.style.display = 'block';
        button.style.display = 'none';
      },
      closeWidget: function() {
        widget.style.display = 'none';
        button.style.display = 'flex';
      },
      sendWhatsAppPayment: function(consultationId, phoneNumber) {
        // Generate WhatsApp payment link
        var whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + 
          encodeURIComponent('Payment link for consultation ' + consultationId + ': ' + 
          '${baseUrl}/payment/consultation/' + consultationId);
        window.open(whatsappUrl, '_blank');
      }
    };
  })();
</script>`;
  };

  const generateWordPressShortcode = () => {
    return `[agenthub_consultation agent_id="${config.agentId}" industry="${config.industry}" color="${config.primaryColor}" position="${config.position}"]`;
  };

  const generateReactComponent = () => {
    return `import { PaymentWidget } from 'agenthub-react';

function MyConsultationWidget() {
  return (
    <PaymentWidget
      agentId="${config.agentId}"
      industry="${config.industry}"
      consultationType="web_widget"
      config={{
        primaryColor: "${config.primaryColor}",
        position: "${config.position}",
        welcomeMessage: "${config.welcomeMessage}",
        paymentMethods: ${JSON.stringify(config.paymentMethods)},
        showBranding: ${config.showBranding}
      }}
      onPaymentSuccess={(consultationId) => {
        console.log('Payment successful:', consultationId);
      }}
    />
  );
}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} Code Copied`,
      description: 'The code has been copied to your clipboard.',
    });
  };

  const previewWidget = () => {
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>AgentHub Widget Preview</title>
            <style>
              body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Widget Preview</h1>
            <p>This is how your consultation widget will appear on customer websites.</p>
            ${generateEmbedCode()}
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Consultation Widget Generator</h1>
        <p className="text-gray-600">Create embeddable payment widgets for your customer websites</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Widget</CardTitle>
            <CardDescription>
              Customize the appearance and behavior of your consultation widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  value={config.agentId}
                  onChange={(e) => setConfig({ ...config, agentId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={config.industry} onValueChange={(value) => setConfig({ ...config, industry: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="realestate">Real Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select value={config.position} onValueChange={(value: any) => setConfig({ ...config, position: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Input
                id="welcomeMessage"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={config.buttonText}
                onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showBranding">Show AgentHub Branding</Label>
              <Switch
                id="showBranding"
                checked={config.showBranding}
                onCheckedChange={(checked) => setConfig({ ...config, showBranding: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoOpen">Auto-open Widget</Label>
              <Switch
                id="autoOpen"
                checked={config.autoOpen}
                onCheckedChange={(checked) => setConfig({ ...config, autoOpen: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Code Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Code</CardTitle>
            <CardDescription>
              Copy and paste this code into your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={previewWidget} variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={() => copyToClipboard(generateEmbedCode(), 'HTML')} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy HTML
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">HTML Embed Code</Label>
                <Textarea
                  readOnly
                  value={generateEmbedCode()}
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">WordPress Shortcode</Label>
                <Textarea
                  readOnly
                  value={generateWordPressShortcode()}
                  className="font-mono text-xs"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">React Component</Label>
                <Textarea
                  readOnly
                  value={generateReactComponent()}
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Examples</CardTitle>
          <CardDescription>
            Multiple ways to integrate consultation payments on customer websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Globe className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="font-semibold mb-2">Website Widget</h3>
              <p className="text-sm text-gray-600">Floating consultation button with payment integration</p>
              <div className="mt-2">
                <Badge variant="secondary">UPI</Badge>
                <Badge variant="secondary">PhonePe</Badge>
                <Badge variant="secondary">Google Pay</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <MessageCircle className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-semibold mb-2">WhatsApp Integration</h3>
              <p className="text-sm text-gray-600">Direct WhatsApp consultation with payment links</p>
              <div className="mt-2">
                <Badge variant="secondary">WhatsApp Pay</Badge>
                <Badge variant="secondary">UPI Links</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <Code className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-semibold mb-2">API Integration</h3>
              <p className="text-sm text-gray-600">Custom implementations using our REST API</p>
              <div className="mt-2">
                <Badge variant="secondary">REST API</Badge>
                <Badge variant="secondary">Webhooks</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}