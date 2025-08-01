import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Bot, Star, Users, Zap } from "lucide-react";
import type { Agent } from "@shared/schema";

const INDUSTRIES = [
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "finance", label: "Finance & Banking" },
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "real-estate", label: "Real Estate" },
  { value: "hospitality", label: "Hospitality" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "legal", label: "Legal Services" },
  { value: "consulting", label: "Consulting" },
];

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.businessDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "all" || agent.industry === industryFilter;
    
    return matchesSearch && matchesIndustry;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'paused': return 'outline';
      default: return 'secondary';
    }
  };

  // Mock marketplace data for featured agents
  const featuredAgents = [
    {
      id: "market_1",
      name: "Customer Support Pro",
      description: "Advanced customer service agent with sentiment analysis",
      industry: "retail",
      rating: 4.9,
      users: 1200,
      price: "$29/month",
      features: ["24/7 Support", "Multi-language", "Sentiment Analysis"]
    },
    {
      id: "market_2", 
      name: "Healthcare Assistant",
      description: "HIPAA-compliant healthcare information agent",
      industry: "healthcare",
      rating: 4.8,
      users: 850,
      price: "$49/month",
      features: ["HIPAA Compliant", "Medical Knowledge", "Appointment Scheduling"]
    },
    {
      id: "market_3",
      name: "Financial Advisor Bot",
      description: "Personal finance and investment guidance agent",
      industry: "finance", 
      rating: 4.7,
      users: 630,
      price: "$39/month",
      features: ["Investment Tips", "Budget Planning", "Market Analysis"]
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Discover and browse pre-built AI agents for your business
          </p>
        </div>
        <Button>
          <Bot className="h-4 w-4 mr-2" />
          Create Custom Agent
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search agents and templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured Agents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Featured Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <Badge variant="outline">Featured</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{agent.rating}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{agent.users} users</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-lg font-bold text-primary">{agent.price}</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Preview
                      </Button>
                      <Button size="sm">
                        <Zap className="h-3 w-3 mr-1" />
                        Install
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Agents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Agents</h2>
        {filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || industryFilter !== "all" ? "No agents found" : "No agents yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || industryFilter !== "all"
                  ? "Try adjusting your search criteria"
                  : "Create your first agent or install one from the marketplace"
                }
              </p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline">Browse Marketplace</Button>
                <Button>
                  <Bot className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agent.businessName}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.industry}</p>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {agent.businessDescription}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Interface</p>
                      <p className="text-sm font-medium capitalize">{agent.interfaceType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="text-sm font-medium">{agent.llmModel}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button size="sm">
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
