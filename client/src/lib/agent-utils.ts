import { INDUSTRIES, LLM_MODELS } from "@shared/schema";

export function getIndustryLabel(industryValue: string): string {
  const industry = INDUSTRIES.find(i => i.value === industryValue);
  return industry?.label || industryValue;
}

export function getModelLabel(modelValue: string): string {
  const model = LLM_MODELS.find(m => m.value === modelValue);
  return model?.label || modelValue;
}

export function getModelPrice(modelValue: string): number {
  const model = LLM_MODELS.find(m => m.value === modelValue);
  return model?.price || 0;
}

export function calculateMonthlyCost(
  modelValue: string,
  estimatedConversations: number = 500,
  avgTokensPerConversation: number = 2000
): number {
  const pricePerToken = getModelPrice(modelValue) / 1000;
  return estimatedConversations * avgTokensPerConversation * pricePerToken;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "draft":
      return "outline";
    default:
      return "outline";
  }
}

export function generateAgentSystemPrompt(
  businessName: string,
  businessDescription: string,
  industry: string
): string {
  const industryLabel = getIndustryLabel(industry);
  
  return `You are an AI assistant for ${businessName}, a business in the ${industryLabel} industry.

Business Description: ${businessDescription}

Your role is to:
1. Help customers with inquiries about products, services, and general business information
2. Provide helpful, accurate, and professional responses
3. Direct customers to appropriate resources when needed
4. Maintain a friendly and professional tone
5. Ask clarifying questions when needed to better assist customers

Guidelines:
- Always be helpful and professional
- If you don't know something specific about the business, acknowledge this and offer to connect them with a human representative
- Keep responses concise but informative
- Focus on solving the customer's problem or answering their question
- Use the business context provided to give relevant responses

Remember: You represent ${businessName} and should always maintain their professional image.`;
}
