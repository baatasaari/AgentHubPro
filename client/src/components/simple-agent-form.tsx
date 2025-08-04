import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const agentSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessDescription: z.string().min(10, "Description must be at least 10 characters"),
  businessDomain: z.string().url().optional().or(z.literal("")),
  industry: z.string().min(1, "Industry is required"),
  llmModel: z.string().min(1, "LLM model is required"),
  interfaceType: z.string().min(1, "Interface type is required"),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface SimpleAgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SimpleAgentForm({ onSuccess, onCancel }: SimpleAgentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      businessName: "",
      businessDescription: "",
      businessDomain: "",
      industry: "technology",
      llmModel: "gpt-4-turbo",
      interfaceType: "webchat",
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      return apiRequest("POST", "/api/agents", {
        ...data,
        organizationId: 1,
        createdBy: 1,
        ragEnabled: "false",
        ragKnowledgeBase: "",
        ragDocuments: "[]",
        ragQueryMode: "hybrid",
        ragChunkSize: 1000,
        ragOverlap: 200,
        ragMaxResults: 5,
        ragConfidenceThreshold: "0.7",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agent created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AgentFormData) => {
    setIsLoading(true);
    createAgentMutation.mutate(data);
    setIsLoading(false);
  };

  const industries = [
    { value: "technology", label: "Technology" },
    { value: "healthcare", label: "Healthcare" },
    { value: "finance", label: "Finance" },
    { value: "retail", label: "Retail" },
    { value: "education", label: "Education" },
    { value: "realestate", label: "Real Estate" },
    { value: "legal", label: "Legal" },
    { value: "hospitality", label: "Hospitality" },
  ];

  const llmModels = [
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
    { value: "gemini-pro", label: "Gemini Pro" },
  ];

  const interfaceTypes = [
    { value: "webchat", label: "Web Chat" },
    { value: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              {...form.register("businessName")}
              placeholder="Enter business name"
            />
            {form.formState.errors.businessName && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="businessDescription">Business Description</Label>
            <Textarea
              id="businessDescription"
              {...form.register("businessDescription")}
              placeholder="Describe your business and how the agent will help customers"
              rows={4}
            />
            {form.formState.errors.businessDescription && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.businessDescription.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="businessDomain">Website URL (Optional)</Label>
            <Input
              id="businessDomain"
              {...form.register("businessDomain")}
              placeholder="https://yourwebsite.com"
            />
            {form.formState.errors.businessDomain && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.businessDomain.message}
              </p>
            )}
          </div>

          <div>
            <Label>Industry</Label>
            <Select
              onValueChange={(value) => form.setValue("industry", value)}
              defaultValue={form.getValues("industry")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>LLM Model</Label>
            <Select
              onValueChange={(value) => form.setValue("llmModel", value)}
              defaultValue={form.getValues("llmModel")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {llmModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Interface Type</Label>
            <RadioGroup
              onValueChange={(value) => form.setValue("interfaceType", value)}
              defaultValue={form.getValues("interfaceType")}
              className="mt-2"
            >
              {interfaceTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value}>{type.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading || createAgentMutation.isPending}
              className="flex-1"
            >
              {isLoading || createAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}