/**
 * Core Validation Logic - Business rule validation
 */

import { z } from "zod";
import { insertAgentSchema } from "@shared/schema";

export class ValidationRules {
  /**
   * Enhanced agent validation with business rules
   */
  static agentValidationSchema = insertAgentSchema.extend({
    businessName: z.string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be less than 100 characters")
      .regex(/^[a-zA-Z0-9\s&.-]+$/, "Business name contains invalid characters"),
    
    businessDescription: z.string()
      .min(10, "Description must be at least 10 characters")
      .max(500, "Description must be less than 500 characters"),
    
    businessDomain: z.string()
      .url("Must be a valid URL")
      .refine(url => url.startsWith("https://") || url.startsWith("http://"), {
        message: "Domain must include protocol (http:// or https://)"
      }),
  });

  /**
   * Validate agent form data
   */
  static validateAgent(data: unknown) {
    return this.agentValidationSchema.safeParse(data);
  }

  /**
   * Check if model is compatible with interface type
   */
  static isModelCompatible(model: string, interfaceType: string): boolean {
    const whatsappCompatible = ["gpt-3.5-turbo", "gpt-4", "claude-3-haiku"];
    const webChatCompatible = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "claude-3-sonnet", "claude-3-haiku", "gemini-pro"];

    if (interfaceType === "whatsapp") {
      return whatsappCompatible.includes(model);
    }
    return webChatCompatible.includes(model);
  }

  /**
   * Validate embed code generation requirements
   */
  static canGenerateEmbedCode(agent: any): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!agent.businessName?.trim()) {
      reasons.push("Business name is required");
    }
    if (!agent.industry) {
      reasons.push("Industry must be selected");
    }
    if (!agent.llmModel) {
      reasons.push("AI model must be selected");
    }
    if (!agent.interfaceType) {
      reasons.push("Interface type must be selected");
    }
    if (agent.status !== "active") {
      reasons.push("Agent must be active to generate embed code");
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }

  /**
   * Validate widget customization settings
   */
  static validateWidgetSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.primaryColor && !/^#[0-9A-F]{6}$/i.test(settings.primaryColor)) {
      errors.push("Primary color must be a valid hex color");
    }
    if (settings.borderRadius && (settings.borderRadius < 0 || settings.borderRadius > 50)) {
      errors.push("Border radius must be between 0 and 50");
    }
    if (settings.width && (settings.width < 200 || settings.width > 800)) {
      errors.push("Widget width must be between 200 and 800 pixels");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}