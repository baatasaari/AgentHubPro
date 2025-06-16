import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AgentForm from "@/components/agent-form";
import ChatWidget from "@/components/chat-widget";
import CodeGenerator from "@/components/code-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Settings, BarChart3, Download } from "lucide-react";
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
            <CodeGenerator agentId={selectedAgentId} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChatWidget agent={previewAgent} />
            </CardContent>
          </Card>

          {/* Cost Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Model: GPT-3.5 Turbo</span>
                <span className="font-medium">$0.002/1K tokens</span>
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
                <span className="text-lg font-bold text-primary">$2.00</span>
              </div>
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
