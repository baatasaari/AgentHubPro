import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Bot,
  Download,
  Eye,
  Star,
  TrendingUp
} from "lucide-react";

interface Conversation {
  id: string;
  agentName: string;
  customerName: string;
  startTime: string;
  endTime: string | null;
  messageCount: number;
  status: 'active' | 'completed' | 'abandoned';
  satisfaction: number;
  cost: number;
  summary: string;
  tags: string[];
}

export default function Conversations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Mock conversation data - in production this would come from the API
  const mockConversations: Conversation[] = [
    {
      id: "conv_001",
      agentName: "Healthcare Assistant",
      customerName: "John Smith",
      startTime: "2024-01-15T14:30:00Z",
      endTime: "2024-01-15T14:45:00Z",
      messageCount: 12,
      status: "completed",
      satisfaction: 4.8,
      cost: 0.045,
      summary: "Patient inquired about appointment scheduling and insurance coverage.",
      tags: ["appointment", "insurance", "general-inquiry"]
    },
    {
      id: "conv_002", 
      agentName: "E-commerce Helper",
      customerName: "Sarah Johnson",
      startTime: "2024-01-15T15:20:00Z",
      endTime: "2024-01-15T15:35:00Z",
      messageCount: 18,
      status: "completed",
      satisfaction: 4.6,
      cost: 0.067,
      summary: "Customer asked about product availability and shipping options.",
      tags: ["product-inquiry", "shipping", "customer-service"]
    },
    {
      id: "conv_003",
      agentName: "Healthcare Assistant", 
      customerName: "Mike Davis",
      startTime: "2024-01-15T16:10:00Z",
      endTime: null,
      messageCount: 5,
      status: "active",
      satisfaction: 0,
      cost: 0.023,
      summary: "Ongoing conversation about prescription refill process.",
      tags: ["prescription", "refill", "ongoing"]
    },
    {
      id: "conv_004",
      agentName: "Realty Assistant",
      customerName: "Emily Chen",
      startTime: "2024-01-15T13:45:00Z", 
      endTime: "2024-01-15T13:50:00Z",
      messageCount: 3,
      status: "abandoned",
      satisfaction: 0,
      cost: 0.012,
      summary: "Brief inquiry about property listings, customer disconnected.",
      tags: ["property", "abandoned", "brief"]
    }
  ];

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
    initialData: []
  });

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    const matchesAgent = agentFilter === "all" || conv.agentName === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'abandoned': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Active";
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    return `${duration}m`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Analytics calculations
  const totalConversations = mockConversations.length;
  const activeConversations = mockConversations.filter(c => c.status === 'active').length;
  const completedConversations = mockConversations.filter(c => c.status === 'completed').length;
  const avgSatisfaction = mockConversations
    .filter(c => c.satisfaction > 0)
    .reduce((acc, c) => acc + c.satisfaction, 0) / 
    mockConversations.filter(c => c.satisfaction > 0).length || 0;
  const totalCost = mockConversations.reduce((acc, c) => acc + c.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze all customer interactions across your agents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeConversations}</div>
            <p className="text-xs text-muted-foreground">
              Real-time conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSatisfaction.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0 rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Conversations</TabsTrigger>
            <TabsTrigger value="active">Active ({activeConversations})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedConversations})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="Healthcare Assistant">Healthcare Assistant</SelectItem>
                <SelectItem value="E-commerce Helper">E-commerce Helper</SelectItem>
                <SelectItem value="Realty Assistant">Realty Assistant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{conversation.customerName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{conversation.agentName}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(conversation.startTime)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(conversation.startTime)}</p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium">{conversation.messageCount} msgs</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(conversation.startTime, conversation.endTime)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">${conversation.cost.toFixed(3)}</p>
                        {conversation.satisfaction > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ⭐ {conversation.satisfaction}/5
                          </p>
                        )}
                      </div>

                      <Badge variant={getStatusBadgeVariant(conversation.status)}>
                        {conversation.status}
                      </Badge>

                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredConversations.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No conversations found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || agentFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Conversations will appear here as customers interact with your agents"
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Conversations ({activeConversations})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredConversations
                  .filter(c => c.status === 'active')
                  .map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium">{conversation.customerName}</p>
                          <p className="text-sm text-muted-foreground">{conversation.agentName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Started {formatTime(conversation.startTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversation.messageCount} messages so far
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Conversations ({completedConversations})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredConversations
                  .filter(c => c.status === 'completed')
                  .map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="font-medium">{conversation.customerName}</span>
                          <span className="text-sm text-muted-foreground">{conversation.agentName}</span>
                          <Badge variant="secondary">completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{conversation.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conversation.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium">⭐ {conversation.satisfaction}/5</p>
                        <p className="text-xs text-muted-foreground">${conversation.cost.toFixed(3)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Completion Rate</span>
                    <span className="font-bold">
                      {((completedConversations / totalConversations) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Duration</span>
                    <span className="font-bold">8.5 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Messages per Conversation</span>
                    <span className="font-bold">
                      {(mockConversations.reduce((acc, c) => acc + c.messageCount, 0) / totalConversations).toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Healthcare Assistant</span>
                    <div className="text-right">
                      <p className="font-bold">2 conversations</p>
                      <p className="text-sm text-muted-foreground">4.8 avg rating</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>E-commerce Helper</span>
                    <div className="text-right">
                      <p className="font-bold">1 conversation</p>
                      <p className="text-sm text-muted-foreground">4.6 avg rating</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Realty Assistant</span>
                    <div className="text-right">
                      <p className="font-bold">1 conversation</p>
                      <p className="text-sm text-muted-foreground">No rating</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}