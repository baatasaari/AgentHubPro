import { INDUSTRIES, LLM_MODELS } from "@/types";

export class AgentUtils {
  static getIndustryLabel(industryValue: string): string {
    const industry = INDUSTRIES.find(i => i.value === industryValue);
    return industry?.label || industryValue;
  }

  static getModelLabel(modelValue: string): string {
    const model = LLM_MODELS.find(m => m.value === modelValue);
    return model?.label || modelValue;
  }

  static getModelPrice(modelValue: string): number {
    const model = LLM_MODELS.find(m => m.value === modelValue);
    return model?.price || 0;
  }

  static calculateMonthlyCost(
    modelValue: string,
    estimatedConversations: number = 500,
    avgTokensPerConversation: number = 2000
  ): number {
    const pricePerToken = this.getModelPrice(modelValue) / 1000;
    return estimatedConversations * avgTokensPerConversation * pricePerToken;
  }

  static generateSystemPrompt(
    businessName: string,
    businessDescription: string,
    industry: string
  ): string {
    const industryLabel = this.getIndustryLabel(industry);
    
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

  static getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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
}