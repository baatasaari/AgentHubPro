import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Edit, BarChart3, Code, MoreHorizontal, Play, Pause, Trash2 } from "lucide-react";
import { INDUSTRIES, LLM_MODELS } from "@shared/schema";
import type { Agent } from "@shared/schema";

interface AgentCardProps {
  agent: Agent;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

export default function AgentCard({ agent, onStatusChange, onDelete }: AgentCardProps) {
  const industry = INDUSTRIES.find(i => i.value === agent.industry);
  const model = LLM_MODELS.find(m => m.value === agent.llmModel);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getIndustryIcon = (industryValue: string) => {
    switch (industryValue) {
      case "healthcare":
        return "🏥";
      case "retail":
        return "🛒";
      case "finance":
        return "🏦";
      case "realestate":
        return "🏠";
      case "education":
        return "🎓";
      case "hospitality":
        return "✈️";
      case "legal":
        return "⚖️";
      case "automotive":
        return "🚗";
      case "technology":
        return "💻";
      case "consulting":
        return "💼";
      case "fitness":
        return "💪";
      case "food":
        return "🍽️";
      default:
        return "🤖";
    }
  };

  // Mock usage data - in real app this would come from API
  const mockUsage = {
    conversations: Math.floor(Math.random() * 1000) + 100,
    cost: (Math.random() * 50 + 5).toFixed(2),
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl">
              {getIndustryIcon(agent.industry)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{agent.businessName}</h3>
              <p className="text-sm text-muted-foreground">{industry?.label}</p>
            </div>
          </div>
          <Badge className={getStatusColor(agent.status)} variant="outline">
            <div className="w-2 h-2 rounded-full bg-current mr-1"></div>
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-medium text-slate-700">{model?.label || agent.llmModel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interface:</span>
            <span className="font-medium text-slate-700">
              {agent.interfaceType === "webchat" ? "Web Chat" : "WhatsApp"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Usage:</span>
            <span className="font-medium text-slate-700">${mockUsage.cost}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Code className="w-4 h-4" />
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {agent.status === "active" ? (
                <DropdownMenuItem onClick={() => onStatusChange(agent.id, "paused")}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Agent
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onStatusChange(agent.id, "active")}>
                  <Play className="w-4 h-4 mr-2" />
                  Activate Agent
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(agent.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
