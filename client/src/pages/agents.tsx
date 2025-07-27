import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import AgentCard from "@/components/agent-card";
import { ModernAgentService } from "@/services";
import { BusinessLogic } from "@/core";
import { INDUSTRIES } from "@/types";
import type { Agent } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [], isPending } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: () => ModernAgentService.getAll(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return ModernAgentService.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: "Agent status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update agent status",
        variant: "destructive",
      });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      return ModernAgentService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent",
        variant: "destructive",
      });
    },
  });

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.businessDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "all" || agent.industry === industryFilter;
    
    return matchesSearch && matchesIndustry;
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      deleteAgentMutation.mutate(id);
    }
  };

  if (isPending) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Agents</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
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
      </div>

      {filteredAgents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No agents found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || industryFilter !== "all" 
              ? "Try adjusting your search criteria"
              : "Create your first agent to get started"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
