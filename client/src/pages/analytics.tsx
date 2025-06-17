import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  Bot
} from "lucide-react";
import { formatCurrency, formatDate, getIndustryLabel } from "@/lib/agent-utils";
import type { Agent } from "@shared/schema";
import { useState } from "react";

export default function Analytics() {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/usage/stats"],
  });

  const activeAgents = agents.filter(agent => agent.status === "active");
  const draftAgents = agents.filter(agent => agent.status === "draft");
  const pausedAgents = agents.filter(agent => agent.status === "paused");

  // Mock detailed analytics data - in production this would come from real analytics
  const analyticsData = {
    totalSessions: 1247,
    avgSessionDuration: "3m 42s",
    conversionRate: 12.8,
    topPerformingAgent: agents.find(a => a.id === 1),
    recentActivity: [
      { time: "2 minutes ago", agent: "Healthcare Assistant", action: "New conversation started" },
      { time: "5 minutes ago", agent: "E-commerce Helper", action: "Lead captured" },
      { time: "8 minutes ago", agent: "Realty Assistant", action: "Appointment scheduled" },
      { time: "12 minutes ago", agent: "Healthcare Assistant", action: "FAQ answered" },
    ],
    performanceMetrics: [
      { agent: "Healthcare Assistant", conversations: 342, satisfaction: 4.8, avgResponse: "1.2s" },
      { agent: "E-commerce Helper", conversations: 198, satisfaction: 4.6, avgResponse: "0.9s" },
      { agent: "Realty Assistant", conversations: 89, satisfaction: 4.9, avgResponse: "1.5s" },
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id.toString()}>
                {agent.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Conversations</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(stats as any)?.totalConversations || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Revenue Generated</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency((stats as any)?.totalCost || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Active Agents</p>
                <p className="text-2xl font-bold text-purple-900">
                  {(stats as any)?.activeAgents || 0}
                </p>
              </div>
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-900">1.2s</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.performanceMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{metric.agent}</p>
                      <p className="text-sm text-muted-foreground">
                        {metric.conversations} conversations
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Satisfaction:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {metric.satisfaction}/5.0
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Response:</span>
                      <span className="text-sm font-medium">{metric.avgResponse}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-900">Active</span>
              </div>
              <span className="text-lg font-bold text-green-900">{activeAgents.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-medium text-yellow-900">Paused</span>
              </div>
              <span className="text-lg font-bold text-yellow-900">{pausedAgents.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Draft</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{draftAgents.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border-l-2 border-primary/20 bg-muted/30 rounded-r-lg">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.agent}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage by Industry */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats as any)?.monthlyUsage?.map((usage: any) => {
                const agent = agents.find(a => a.id === usage.agentId);
                if (!agent || usage.conversations === 0) return null;
                
                return (
                  <div key={usage.agentId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{getIndustryLabel(agent.industry)}</p>
                      <p className="text-sm text-muted-foreground">
                        {usage.conversations} conversations
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-slate-900">
                        {formatCurrency(usage.cost)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}