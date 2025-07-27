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
import { MessageSquare, Smartphone } from "lucide-react";
import { insertAgentSchema, INDUSTRIES, LLM_MODELS, INTERFACE_TYPES, type Agent, type InsertAgent } from "@shared/schema";
import { ValidationRules } from "@/core";
import { ModernAgentService } from "@/services";
import { useToast } from "@/hooks/use-toast";

interface AgentFormProps {
  onFormChange?: (formData: Partial<Agent>) => void;
  onAgentCreated?: (agent: Agent) => void;
}

export default function AgentForm({ onFormChange, onAgentCreated }: AgentFormProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAgent>({
    resolver: zodResolver(ValidationRules.agentValidationSchema),
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
    mutationFn: (data: InsertAgent) => ModernAgentService.create(data),
    onSuccess: (agent: Agent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: "Agent created successfully!",
      });
      onAgentCreated?.(agent);
      setStep(2);
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
    onFormChange?.(watchedValues);
  }, [watchedValues, onFormChange]);

  const onSubmit = (data: InsertAgent) => {
    createAgentMutation.mutate(data);
  };

  const selectedModel = LLM_MODELS.find(model => model.value === watchedValues.llmModel);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Create New Agent</CardTitle>
          <Badge variant="outline">Step {step} of 2</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Business Information</h3>
              
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
            </div>

            {/* AI Model Configuration */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-medium text-slate-900">AI Model Configuration</h3>
              
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

            {/* Interface Selection */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-medium text-slate-900">Interface Type</h3>
              
              <FormField
                control={form.control}
                name="interfaceType"
                render={({ field }) => (
                  <FormItem>
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
              <Button type="button" variant="outline">
                Save Draft
              </Button>
              <Button
                type="submit"
                disabled={createAgentMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createAgentMutation.isPending ? "Generating..." : "Generate Agent Code"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
