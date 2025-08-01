import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smartphone, Database, ChevronRight, ChevronLeft } from "lucide-react";
import { insertAgentSchema, INDUSTRIES, LLM_MODELS, INTERFACE_TYPES, type Agent, type InsertAgent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RAGConfiguration from "@/components/rag-configuration";

interface AgentFormProps {
  onFormChange?: (formData: Partial<Agent>) => void;
  onAgentCreated?: (agent: Agent) => void;
}

export default function AgentForm({ onFormChange, onAgentCreated }: AgentFormProps) {
  const [step, setStep] = useState(1);
  const [ragConfig, setRagConfig] = useState({
    enabled: false,
    knowledgeBase: '',
    documents: [],
    queryMode: 'hybrid' as const,
    chunkSize: 1000,
    overlap: 200,
    maxResults: 5,
    confidenceThreshold: 0.7
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAgent>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      businessName: "",
      businessDescription: "",
      businessDomain: "",
      industry: "",
      llmModel: "",
      interfaceType: "",
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: InsertAgent) => {
      // Combine form data with RAG configuration
      const agentData = {
        ...data,
        ragEnabled: ragConfig.enabled.toString(),
        ragKnowledgeBase: ragConfig.knowledgeBase,
        ragDocuments: JSON.stringify(ragConfig.documents),
        ragQueryMode: ragConfig.queryMode,
        ragChunkSize: ragConfig.chunkSize,
        ragOverlap: ragConfig.overlap,
        ragMaxResults: ragConfig.maxResults,
        ragConfidenceThreshold: ragConfig.confidenceThreshold.toString()
      };
      
      const response = await apiRequest("POST", "/api/agents", agentData);
      return response.json();
    },
    onSuccess: (agent: Agent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: "Agent created successfully with RAG configuration!",
      });
      onAgentCreated?.(agent);
      setStep(4); // Show completion step
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();

  // Update preview when form changes
  React.useEffect(() => {
    const previewData = {
      ...watchedValues,
      ragEnabled: ragConfig.enabled,
      ragKnowledgeBase: ragConfig.knowledgeBase,
      ragDocuments: ragConfig.documents
    };
    onFormChange?.(previewData);
  }, [watchedValues, ragConfig, onFormChange]);

  const onSubmit = (data: InsertAgent) => {
    createAgentMutation.mutate(data);
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedModel = LLM_MODELS.find(model => model.value === watchedValues.llmModel);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Create New Agent</CardTitle>
          <Badge variant="outline">Step {step} of 3</Badge>
        </div>
        <div className="flex items-center space-x-2 mt-4">
          <div className={`h-2 w-16 rounded ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-16 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-16 rounded ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Step 1: Business Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Business Information
                  </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your business, services, and what the agent should help customers with..."
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Domain/Website</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://yourbusiness.com"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                  <div className="flex justify-end pt-6">
                    <Button type="button" onClick={nextStep}>
                      Next: AI Configuration <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: AI Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    AI Model & Interface Configuration
                  </h3>
              
              <FormField
                control={form.control}
                name="llmModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select LLM Model</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LLM_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label} - ${model.price}/1K tokens
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedModel && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center text-blue-700 text-sm">
                    <span>
                      Selected: {selectedModel.label} by {selectedModel.provider} - 
                      Estimated cost for 1000 conversations/month: ${(selectedModel.price * 2000).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

                  <FormField
                    control={form.control}
                    name="interfaceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interface Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            {INTERFACE_TYPES.map((interfaceType) => (
                              <div key={interfaceType.value}>
                                <RadioGroupItem
                                  value={interfaceType.value}
                                  id={interfaceType.value}
                                  className="peer sr-only"
                                />
                                <Label
                                  htmlFor={interfaceType.value}
                                  className="flex items-center space-x-3 p-4 border-2 border-border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-slate-300 transition-colors"
                                >
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    {interfaceType.value === "webchat" ? (
                                      <MessageSquare className="w-5 h-5 text-primary" />
                                    ) : (
                                      <Smartphone className="w-5 h-5 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-slate-900">{interfaceType.label}</h4>
                                    <p className="text-sm text-muted-foreground">{interfaceType.description}</p>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-6">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next: Knowledge Base <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: AI Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    AI Model & Interface Configuration
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="llmModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select LLM Model</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose Model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LLM_MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label} - ${model.price}/1K tokens
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interfaceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interface Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            {INTERFACE_TYPES.map((interfaceType) => (
                              <div key={interfaceType.value}>
                                <RadioGroupItem
                                  value={interfaceType.value}
                                  id={interfaceType.value}
                                  className="peer sr-only"
                                />
                                <Label
                                  htmlFor={interfaceType.value}
                                  className="flex items-center space-x-3 p-4 border-2 border-border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-slate-300 transition-colors"
                                >
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    {interfaceType.value === "webchat" ? (
                                      <MessageSquare className="w-5 h-5 text-primary" />
                                    ) : (
                                      <Smartphone className="w-5 h-5 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-slate-900">{interfaceType.label}</h4>
                                    <p className="text-sm text-muted-foreground">{interfaceType.description}</p>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-6">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next: Knowledge Base <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: RAG Configuration */}
            {step === 3 && (
              <div className="space-y-6">
                <RAGConfiguration 
                  value={ragConfig}
                  onChange={setRagConfig}
                  mode="wizard"
                />

                <div className="flex justify-between pt-6">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline">
                      Save Draft
                    </Button>
                    <Button
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={createAgentMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {createAgentMutation.isPending ? "Creating Agent..." : "Create Agent"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
