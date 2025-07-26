import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, MessageSquare, Bot, Clock, CreditCard } from "lucide-react";
import { FormatUtils } from "@/core/formatting";
import { AgentService, UsageService } from "@/services/api";
import type { Agent, UsageStats } from "@/types";

export default function Billing() {
  const { data: stats } = useQuery<UsageStats>({
    queryKey: ["/api/usage/stats"],
    queryFn: () => UsageService.getStats(),
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: () => AgentService.getAll(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Usage</h1>
        <Button className="bg-primary hover:bg-primary/90">
          <CreditCard className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">This Month</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats ? FormatUtils.formatCurrency(stats.totalCost) : "$0.00"}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Conversations</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats ? FormatUtils.formatNumber(stats.totalConversations) : "0"}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Active Agents</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats ? stats.activeAgents : "0"}
                </p>
              </div>
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-amber-900">1.2s</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.monthlyUsage.map((usage) => {
              const agent = agents.find(a => a.id === usage.agentId);
              if (!agent || usage.conversations === 0) return null;
              
              return (
                <div
                  key={usage.agentId}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{agent.businessName}</p>
                      <p className="text-sm text-muted-foreground">
                        {usage.conversations} conversations
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {FormatUtils.formatCurrency(usage.cost)}
                  </span>
                </div>
              );
            }) || (
              <div className="text-center py-8 text-muted-foreground">
                No usage data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <p className="font-medium text-slate-900">December 2024</p>
                <p className="text-sm text-muted-foreground">Paid on Jan 1, 2025</p>
              </div>
              <span className="text-green-600 font-medium">$58.00</span>
            </div>

            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <p className="font-medium text-slate-900">November 2024</p>
                <p className="text-sm text-muted-foreground">Paid on Dec 1, 2024</p>
              </div>
              <span className="text-green-600 font-medium">$42.15</span>
            </div>

            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <p className="font-medium text-slate-900">October 2024</p>
                <p className="text-sm text-muted-foreground">Paid on Nov 1, 2024</p>
              </div>
              <span className="text-green-600 font-medium">$38.90</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
