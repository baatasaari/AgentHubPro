import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Settings, DollarSign, FileText, Database, MessageSquare, Trash2, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminRAGConfig {
  agentId: string;
  enabledSources: string[];
  embeddingModel: string;
  maxDocuments: number;
  autoUpdate: boolean;
}

interface AdminPaymentConfig {
  agentId: string;
  industry: string;
  pricing: {
    basePrice: number;
    currency: string;
    additionalServices: Array<{
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
  isActive: boolean;
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
}

export default function AdminDashboard() {
  const [adminUserId] = useState("admin_001"); // In production, get from auth
  const [selectedAgentId, setSelectedAgentId] = useState("1");
  const [loading, setLoading] = useState(false);
  
  // RAG Configuration State
  const [ragConfig, setRagConfig] = useState<AdminRAGConfig>({
    agentId: "1",
    enabledSources: ["admin_file", "faq_badge"],
    embeddingModel: "text-embedding-3-small",
    maxDocuments: 1000,
    autoUpdate: true
  });
  
  // Payment Configuration State
  const [paymentConfig, setPaymentConfig] = useState<AdminPaymentConfig>({
    agentId: "1",
    industry: "healthcare",
    pricing: {
      basePrice: 500,
      currency: "INR",
      additionalServices: []
    },
    paymentMethods: {
      stripe: true,
      razorpay: true,
      paypal: false,
      bankTransfer: false,
      upi: true
    },
    platforms: {
      whatsapp: true,
      instagram: true,
      messenger: true,
      webchat: true,
      sms: true
    },
    isActive: true
  });

  // File Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // FAQ Management State
  const [faqBadges, setFaqBadges] = useState([{
    question: "",
    answer: "",
    category: "",
    priority: "medium" as const,
    tags: "",
    applicableAgents: ""
  }]);

  // Website Pages State
  const [websitePages, setWebsitePages] = useState([{
    url: "",
    title: "",
    content: "",
    category: "",
    priority: "medium" as const
  }]);

  // Industry Templates
  const [industryTemplates, setIndustryTemplates] = useState<IndustryTemplate[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadIndustryTemplates();
  }, []);

  const loadIndustryTemplates = async () => {
    try {
      const response = await fetch('/api/admin/payment/templates');
      const templates = await response.json();
      setIndustryTemplates(templates);
    } catch (error) {
      console.error('Failed to load industry templates:', error);
    }
  };

  // RAG Management Functions
  const configureRAG = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("POST", "/api/admin/rag/configure", {
        agentId: selectedAgentId,
        adminUserId,
        config: {
          enabledSources: ragConfig.enabledSources,
          embeddingModel: ragConfig.embeddingModel,
          maxDocuments: ragConfig.maxDocuments,
          autoUpdate: ragConfig.autoUpdate
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "RAG Configuration Updated",
          description: `Knowledge base configured for agent ${selectedAgentId}.`
        });
      }
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to configure RAG system.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAdminFiles = async () => {
    try {
      setLoading(true);
      
      if (uploadFiles.length === 0) {
        toast({
          title: "No Files Selected",
          description: "Please select files to upload.",
          variant: "destructive"
        });
        return;
      }

      const fileData = await Promise.all(
        uploadFiles.map(async (file) => ({
          filename: file.name,
          content: await file.text(),
          mimeType: file.type,
          category: "admin_upload",
          priority: "high"
        }))
      );

      const response = await apiRequest("POST", "/api/admin/rag/upload", {
        agentId: selectedAgentId,
        adminUserId,
        files: fileData
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Files Uploaded Successfully",
          description: `Processed ${result.processedFiles} files. Total documents: ${result.totalDocuments}`
        });
        setUploadFiles([]);
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const manageFAQBadges = async () => {
    try {
      setLoading(true);
      
      const validFAQs = faqBadges.filter(faq => faq.question.trim() && faq.answer.trim());
      
      if (validFAQs.length === 0) {
        toast({
          title: "No Valid FAQs",
          description: "Please add at least one complete FAQ entry.",
          variant: "destructive"
        });
        return;
      }

      const faqData = validFAQs.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        priority: faq.priority,
        tags: faq.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        applicableAgents: faq.applicableAgents ? faq.applicableAgents.split(',').map(id => id.trim()) : []
      }));

      const response = await apiRequest("POST", "/api/admin/rag/faq", {
        adminUserId,
        faqs: faqData
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "FAQ Badges Added Successfully",
          description: `Added ${result.addedFAQs} FAQ badges affecting ${result.affectedAgents.length} agents.`
        });
        setFaqBadges([{ question: "", answer: "", category: "", priority: "medium", tags: "", applicableAgents: "" }]);
      }
    } catch (error) {
      toast({
        title: "FAQ Upload Failed",
        description: "Failed to upload FAQ badges.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const configureWebsitePages = async () => {
    try {
      setLoading(true);
      
      const validPages = websitePages.filter(page => page.url.trim() && page.title.trim() && page.content.trim());
      
      if (validPages.length === 0) {
        toast({
          title: "No Valid Pages",
          description: "Please add at least one complete website page.",
          variant: "destructive"
        });
        return;
      }

      const response = await apiRequest("POST", "/api/admin/rag/website", {
        agentId: selectedAgentId,
        adminUserId,
        pages: validPages
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Website Pages Added Successfully",
          description: `Added ${result.addedPages} pages. Total documents: ${result.totalDocuments}`
        });
        setWebsitePages([{ url: "", title: "", content: "", category: "", priority: "medium" }]);
      }
    } catch (error) {
      toast({
        title: "Page Upload Failed",
        description: "Failed to upload website pages.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Payment Management Functions
  const configurePayment = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest("POST", "/api/admin/payment/configure", {
        agentId: selectedAgentId,
        adminUserId,
        config: {
          industry: paymentConfig.industry,
          pricing: paymentConfig.pricing,
          paymentMethods: paymentConfig.paymentMethods,
          platforms: paymentConfig.platforms,
          conversationalFlow: {
            enableAutoPayment: true,
            requireConfirmation: true,
            allowInstallments: false,
            customMessages: {
              paymentRequest: "Payment required for this service.",
              paymentSuccess: "Payment successful! Thank you.",
              paymentFailure: "Payment failed. Please try again."
            }
          }
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Payment Configuration Updated",
          description: `Payment settings configured for agent ${selectedAgentId}.`
        });
      }
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to configure payment system.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createFromTemplate = async (industry: string) => {
    try {
      setLoading(true);
      
      const response = await apiRequest("POST", "/api/admin/payment/template", {
        agentId: selectedAgentId,
        adminUserId,
        industry,
        customizations: {
          basePrice: paymentConfig.pricing.basePrice,
          enabledMethods: Object.entries(paymentConfig.paymentMethods)
            .filter(([_, enabled]) => enabled)
            .map(([method, _]) => method),
          enabledPlatforms: Object.entries(paymentConfig.platforms)
            .filter(([_, enabled]) => enabled)
            .map(([platform, _]) => platform)
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Template Applied Successfully",
          description: `Payment configuration created from ${industry} template.`
        });
      }
    } catch (error) {
      toast({
        title: "Template Failed",
        description: "Failed to apply industry template.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addFAQRow = () => {
    setFaqBadges([...faqBadges, { question: "", answer: "", category: "", priority: "medium", tags: "", applicableAgents: "" }]);
  };

  const addWebsitePageRow = () => {
    setWebsitePages([...websitePages, { url: "", title: "", content: "", category: "", priority: "medium" }]);
  };

  const addServiceRow = () => {
    setPaymentConfig({
      ...paymentConfig,
      pricing: {
        ...paymentConfig.pricing,
        additionalServices: [
          ...paymentConfig.pricing.additionalServices,
          { name: "", price: 0, description: "" }
        ]
      }
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Configure RAG knowledge bases and payment systems for all agents</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Label htmlFor="agentId">Target Agent ID:</Label>
          <Input
            id="agentId"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-32"
            placeholder="1"
          />
        </div>
      </div>

      <Tabs defaultValue="rag" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rag">
            <Database className="h-4 w-4 mr-2" />
            RAG Management
          </TabsTrigger>
          <TabsTrigger value="payment">
            <DollarSign className="h-4 w-4 mr-2" />
            Payment Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rag">
          <div className="space-y-6">
            {/* RAG Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  RAG System Configuration
                </CardTitle>
                <CardDescription>Configure knowledge base settings for agent {selectedAgentId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Enabled Sources</Label>
                    <div className="space-y-2 mt-2">
                      {['admin_file', 'website_page', 'faq_badge', 'manual'].map(source => (
                        <div key={source} className="flex items-center space-x-2">
                          <Switch
                            checked={ragConfig.enabledSources.includes(source)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRagConfig({
                                  ...ragConfig,
                                  enabledSources: [...ragConfig.enabledSources, source]
                                });
                              } else {
                                setRagConfig({
                                  ...ragConfig,
                                  enabledSources: ragConfig.enabledSources.filter(s => s !== source)
                                });
                              }
                            }}
                          />
                          <Label className="capitalize">{source.replace('_', ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Embedding Model</Label>
                    <Select value={ragConfig.embeddingModel} onValueChange={(value) => setRagConfig({...ragConfig, embeddingModel: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-embedding-3-small">OpenAI Text Embedding 3 Small</SelectItem>
                        <SelectItem value="text-embedding-3-large">OpenAI Text Embedding 3 Large</SelectItem>
                        <SelectItem value="text-embedding-ada-002">OpenAI Ada 002</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Documents</Label>
                    <Input
                      type="number"
                      value={ragConfig.maxDocuments}
                      onChange={(e) => setRagConfig({...ragConfig, maxDocuments: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={ragConfig.autoUpdate}
                      onCheckedChange={(checked) => setRagConfig({...ragConfig, autoUpdate: checked})}
                    />
                    <Label>Auto Update</Label>
                  </div>
                </div>
                
                <Button onClick={configureRAG} disabled={loading}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure RAG System
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Admin File Upload
                </CardTitle>
                <CardDescription>Upload knowledge base files for agent {selectedAgentId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminFiles">Select Files</Label>
                  <Input
                    id="adminFiles"
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload knowledge base content that will be available to the agent
                  </p>
                </div>
                
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files:</Label>
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button onClick={uploadAdminFiles} disabled={loading || uploadFiles.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Admin Files
                </Button>
              </CardContent>
            </Card>

            {/* FAQ Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  FAQ Badge Management
                </CardTitle>
                <CardDescription>Create FAQ badges that apply to multiple agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqBadges.map((faq, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-4">
                      <Label>Question</Label>
                      <Input
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...faqBadges];
                          updated[index].question = e.target.value;
                          setFaqBadges(updated);
                        }}
                        placeholder="What are your business hours?"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Label>Answer</Label>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...faqBadges];
                          updated[index].answer = e.target.value;
                          setFaqBadges(updated);
                        }}
                        placeholder="We are open Monday to Friday..."
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Category</Label>
                      <Input
                        value={faq.category}
                        onChange={(e) => {
                          const updated = [...faqBadges];
                          updated[index].category = e.target.value;
                          setFaqBadges(updated);
                        }}
                        placeholder="General"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Priority</Label>
                      <Select 
                        value={faq.priority}
                        onValueChange={(value: "high" | "medium" | "low") => {
                          const updated = [...faqBadges];
                          updated[index].priority = value;
                          setFaqBadges(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setFaqBadges(faqBadges.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Button onClick={addFAQRow} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add FAQ Badge
                  </Button>
                  <Button onClick={manageFAQBadges} disabled={loading}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Deploy FAQ Badges
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Website Pages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Website Page Configuration
                </CardTitle>
                <CardDescription>Configure website pages for agent {selectedAgentId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {websitePages.map((page, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-3">
                      <Label>URL</Label>
                      <Input
                        value={page.url}
                        onChange={(e) => {
                          const updated = [...websitePages];
                          updated[index].url = e.target.value;
                          setWebsitePages(updated);
                        }}
                        placeholder="https://example.com/about"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Title</Label>
                      <Input
                        value={page.title}
                        onChange={(e) => {
                          const updated = [...websitePages];
                          updated[index].title = e.target.value;
                          setWebsitePages(updated);
                        }}
                        placeholder="About Us"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Label>Content</Label>
                      <Textarea
                        value={page.content}
                        onChange={(e) => {
                          const updated = [...websitePages];
                          updated[index].content = e.target.value;
                          setWebsitePages(updated);
                        }}
                        placeholder="Page content..."
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Category</Label>
                      <Input
                        value={page.category}
                        onChange={(e) => {
                          const updated = [...websitePages];
                          updated[index].category = e.target.value;
                          setWebsitePages(updated);
                        }}
                        placeholder="About"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWebsitePages(websitePages.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Button onClick={addWebsitePageRow} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Website Page
                  </Button>
                  <Button onClick={configureWebsitePages} disabled={loading}>
                    <Eye className="h-4 w-4 mr-2" />
                    Configure Pages
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="space-y-6">
            {/* Industry Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Industry Templates
                </CardTitle>
                <CardDescription>Quick setup using industry-specific payment configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {industryTemplates.map((template) => (
                    <div key={template.industry} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Base Price: ₹{template.defaultPricing.basePrice}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => createFromTemplate(template.industry)}
                        disabled={loading}
                      >
                        Apply Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Configuration
                </CardTitle>
                <CardDescription>Configure payment settings for agent {selectedAgentId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Select value={paymentConfig.industry} onValueChange={(value) => setPaymentConfig({...paymentConfig, industry: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="hospitality">Hospitality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Base Price</Label>
                    <Input
                      type="number"
                      value={paymentConfig.pricing.basePrice}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        pricing: {...paymentConfig.pricing, basePrice: parseFloat(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select 
                      value={paymentConfig.pricing.currency} 
                      onValueChange={(value) => setPaymentConfig({
                        ...paymentConfig,
                        pricing: {...paymentConfig.pricing, currency: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <Label className="text-base font-semibold">Payment Methods</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                    {Object.entries(paymentConfig.paymentMethods).map(([method, enabled]) => (
                      <div key={method} className="flex items-center space-x-2">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => setPaymentConfig({
                            ...paymentConfig,
                            paymentMethods: {...paymentConfig.paymentMethods, [method]: checked}
                          })}
                        />
                        <Label className="capitalize">{method}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <Label className="text-base font-semibold">Platforms</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                    {Object.entries(paymentConfig.platforms).map(([platform, enabled]) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => setPaymentConfig({
                            ...paymentConfig,
                            platforms: {...paymentConfig.platforms, [platform]: checked}
                          })}
                        />
                        <Label className="capitalize">{platform}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Services */}
                <div>
                  <Label className="text-base font-semibold">Additional Services</Label>
                  <div className="space-y-2 mt-2">
                    {paymentConfig.pricing.additionalServices.map((service, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-4">
                          <Input
                            placeholder="Service Name"
                            value={service.name}
                            onChange={(e) => {
                              const updated = [...paymentConfig.pricing.additionalServices];
                              updated[index].name = e.target.value;
                              setPaymentConfig({
                                ...paymentConfig,
                                pricing: {...paymentConfig.pricing, additionalServices: updated}
                              });
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={service.price}
                            onChange={(e) => {
                              const updated = [...paymentConfig.pricing.additionalServices];
                              updated[index].price = parseFloat(e.target.value);
                              setPaymentConfig({
                                ...paymentConfig,
                                pricing: {...paymentConfig.pricing, additionalServices: updated}
                              });
                            }}
                          />
                        </div>
                        <div className="md:col-span-5">
                          <Input
                            placeholder="Description"
                            value={service.description}
                            onChange={(e) => {
                              const updated = [...paymentConfig.pricing.additionalServices];
                              updated[index].description = e.target.value;
                              setPaymentConfig({
                                ...paymentConfig,
                                pricing: {...paymentConfig.pricing, additionalServices: updated}
                              });
                            }}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const updated = paymentConfig.pricing.additionalServices.filter((_, i) => i !== index);
                              setPaymentConfig({
                                ...paymentConfig,
                                pricing: {...paymentConfig.pricing, additionalServices: updated}
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button onClick={addServiceRow} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={paymentConfig.isActive}
                    onCheckedChange={(checked) => setPaymentConfig({...paymentConfig, isActive: checked})}
                  />
                  <Label>Payment System Active</Label>
                </div>

                <Button onClick={configurePayment} disabled={loading}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Configure Payment System
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}