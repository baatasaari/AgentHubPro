import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Smartphone, Globe, DollarSign } from "lucide-react";
import { INDUSTRIES, LLM_MODELS } from "@shared/schema";
import { generateAgentSystemPrompt, getModelPrice, formatCurrency } from "@/lib/agent-utils";
import type { Agent } from "@shared/schema";

interface AgentPreviewProps {
  agent: Partial<Agent>;
}

export default function AgentPreview({ agent }: AgentPreviewProps) {
  const industry = INDUSTRIES.find(i => i.value === agent.industry);
  const model = LLM_MODELS.find(m => m.value === agent.llmModel);
  
  const systemPrompt = agent.businessName && agent.businessDescription && agent.industry 
    ? generateAgentSystemPrompt(agent.businessName, agent.businessDescription, agent.industry)
    : null;

  const estimatedMonthlyCost = agent.llmModel 
    ? getModelPrice(agent.llmModel) * 1000 // Assuming 1000 conversations/month with 1K tokens each
    : 0;

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Bot className="w-5 h-5 mr-2 text-primary" />
          Agent Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              {agent.businessName || "Your Business Assistant"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {industry?.label || "Select an industry"}
            </p>
          </div>

          {agent.businessDescription && (
            <p className="text-sm text-slate-700 bg-muted/30 p-3 rounded-lg">
              {agent.businessDescription}
            </p>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI Model:</span>
            <span className="font-medium">{model?.label || "Not selected"}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Interface:</span>
            <div className="flex items-center space-x-1">
              {agent.interfaceType === "webchat" && (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span className="font-medium">Web Chat</span>
                </>
              )}
              {agent.interfaceType === "whatsapp" && (
                <>
                  <Smartphone className="w-3 h-3" />
                  <span className="font-medium">WhatsApp</span>
                </>
              )}
              {!agent.interfaceType && (
                <span className="font-medium text-muted-foreground">Not selected</span>
              )}
            </div>
          </div>

          {agent.businessDomain && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Website:</span>
              <div className="flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span className="font-medium text-xs truncate max-w-24">
                  {agent.businessDomain.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cost Estimate */}
        {agent.llmModel && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Est. Monthly Cost</span>
              </div>
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(estimatedMonthlyCost)}
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Based on {model?.price}/1K tokens
            </p>
          </div>
        )}

        {/* Capabilities */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="text-sm font-medium text-slate-900">Agent Capabilities</h4>
          <div className="space-y-2">
            {agent.industry && (
              <Badge variant="outline" className="text-xs">
                {industry?.label} Expert
              </Badge>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">24/7 Availability</Badge>
              <Badge variant="secondary" className="text-xs">Multi-language</Badge>
              <Badge variant="secondary" className="text-xs">Lead Capture</Badge>
            </div>
          </div>
        </div>

        {/* System Prompt Preview */}
        {systemPrompt && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-sm font-medium text-slate-900">AI Instructions Preview</h4>
            <div className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto">
              {systemPrompt.slice(0, 200)}...
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-center pt-2 border-t border-border">
          <Badge 
            variant={
              agent.businessName && agent.industry && agent.llmModel && agent.interfaceType 
                ? "default" 
                : "secondary"
            }
            className="text-xs"
          >
            {agent.businessName && agent.industry && agent.llmModel && agent.interfaceType 
              ? "Ready to Deploy" 
              : "Configuration Incomplete"
            }
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}