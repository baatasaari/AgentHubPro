import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AgentForm from "@/components/agent-form";
import ChatWidget from "@/components/chat-widget";
import CodeGenerator from "@/components/code-generator";
import WidgetCustomizer from "@/components/widget-customizer";
import AgentPreview from "@/components/agent-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Settings, BarChart3, Download } from "lucide-react";
import { LLM_MODELS } from "@shared/schema";
import type { Agent } from "@shared/schema";

export default function Dashboard() {
  const [previewAgent, setPreviewAgent] = useState<Partial<Agent>>({
    businessName: "Business Assistant",
    industry: "technology",
    interfaceType: "webchat",
  });

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["/api/usage/stats"],
  });

  const handleFormChange = (formData: Partial<Agent>) => {
    setPreviewAgent(formData);
  };

  const handleAgentCreated = (agent: Agent) => {
    setSelectedAgentId(agent.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Creation Form */}
        <div className="lg:col-span-2 space-y-6">
          <AgentForm 
            onFormChange={handleFormChange}
            onAgentCreated={handleAgentCreated}
          />
          
          {selectedAgentId && (
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">Embed Code</TabsTrigger>
                <TabsTrigger value="customize">Customize Widget</TabsTrigger>
              </TabsList>
              <TabsContent value="code">
                <CodeGenerator agentId={selectedAgentId} />
              </TabsContent>
              <TabsContent value="customize">
                <WidgetCustomizer agentId={selectedAgentId} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Preview */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Agent Details</TabsTrigger>
              <TabsTrigger value="chat">Chat Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <AgentPreview agent={previewAgent} />
            </TabsContent>
            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Chat Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChatWidget agent={previewAgent} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Cost Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewAgent.llmModel ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{LLM_MODELS.find((m: any) => m.value === previewAgent.llmModel)?.label}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Price per 1K tokens:</span>
                    <span className="font-medium">${LLM_MODELS.find((m: any) => m.value === previewAgent.llmModel)?.price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Est. monthly conversations</span>
                    <span className="font-medium">~500</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Avg tokens per conversation</span>
                    <span className="font-medium">~2,000</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Monthly Cost</span>
                    <span className="text-lg font-bold text-primary">
                      ${((LLM_MODELS.find((m: any) => m.value === previewAgent.llmModel)?.price || 0) * 2).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Select an AI model to see cost estimate
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center text-green-700 text-sm">
                  <span>✓ Pay only for what you use</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start">
                <Eye className="w-4 h-4 mr-3" />
                Preview Agent
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-3" />
                Advanced Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-3" />
                Analytics Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Download className="w-4 h-4 mr-3" />
                Export Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
