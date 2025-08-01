import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, Bot, Search, TrendingUp, Settings, Eye } from 'lucide-react';
import type { Agent } from "@shared/schema";

export default function MyAgentsPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch agents data from main API
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  // Agent status mutations
  const enableMutation = useMutation({
    mutationFn: (agentId: string) => MyAgentsService.enableAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ title: 'Agent enabled successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to enable agent', variant: 'destructive' });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (agentId: string) => MyAgentsService.disableAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ title: 'Agent disabled successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to disable agent', variant: 'destructive' });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (agentId: string) => MyAgentsService.pauseAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ title: 'Agent paused successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to pause agent', variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (agentId: string) => MyAgentsService.archiveAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ title: 'Agent archived successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to archive agent', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => MyAgentsService.deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ title: 'Agent deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete agent', variant: 'destructive' });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (operation: { agent_ids: string[]; operation: string; reason?: string }) =>
      MyAgentsService.bulkOperation(operation),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents-dashboard'] });
      toast({ 
        title: `Bulk operation completed`,
        description: `${data.successful} agents updated, ${data.failed} failed`
      });
      setSelectedAgents([]);
      setShowBulkDialog(false);
    },
    onError: () => {
      toast({ title: 'Bulk operation failed', variant: 'destructive' });
    },
  });

  // Filter agents by search query
  const filteredAgents = agents.filter(agent =>
    agent.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'disabled': return 'destructive';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPerformanceTrend = (score: number) => {
    if (score >= 4.5) return { icon: TrendingUp, color: 'text-green-500' };
    if (score <= 3.0) return { icon: TrendingDown, color: 'text-red-500' };
    return { icon: Minus, color: 'text-gray-500' };
  };

  const handleBulkOperation = () => {
    if (selectedAgents.length === 0 || !bulkOperation) return;
    
    bulkMutation.mutate({
      agent_ids: selectedAgents,
      operation: bulkOperation,
      reason: `Bulk ${bulkOperation} operation`
    });
  };

  const renderDashboard = () => {
    if (dashboardLoading || !dashboard) {
      return <div className="animate-pulse">Loading dashboard...</div>;
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overview.total_agents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard.overview.active_agents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overview.total_conversations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overview.avg_performance_score.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAgentCard = (agent: AgentSummary) => {
    const isSelected = selectedAgents.includes(agent.id);
    const TrendIcon = getPerformanceTrend(agent.performance_score).icon;
    const trendColor = getPerformanceTrend(agent.performance_score).color;

    return (
      <Card key={agent.id} className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAgents([...selectedAgents, agent.id]);
                  } else {
                    setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                  }
                }}
                className="rounded"
              />
              <CardTitle className="text-lg">{agent.business_name}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusBadgeVariant(agent.status)}>
                {agent.status}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(agent.priority)}>
                {agent.priority}
              </Badge>
            </div>
          </div>
          <CardDescription>{agent.industry}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Conversations</p>
              <p className="text-lg font-semibold">{agent.conversation_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-lg font-semibold">${agent.total_cost.toFixed(3)}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Performance:</span>
              <span className="font-medium">{agent.performance_score.toFixed(1)}</span>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Widget:</span>
              <Badge variant={agent.has_widget ? 'default' : 'outline'}>
                {agent.has_widget ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          
          {agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {agent.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {agent.status === 'disabled' || agent.status === 'paused' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => enableMutation.mutate(agent.id)}
                  disabled={enableMutation.isPending}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Enable
                </Button>
              ) : agent.status === 'active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pauseMutation.mutate(agent.id)}
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Button>
              ) : null}
              
              {agent.status !== 'archived' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => disableMutation.mutate(agent.id)}
                  disabled={disableMutation.isPending}
                >
                  <Square className="h-3 w-3 mr-1" />
                  Disable
                </Button>
              )}
            </div>
            
            <div className="flex space-x-1">
              {agent.status !== 'archived' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Archive className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Agent</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to archive "{agent.business_name}"? This action can be reversed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => archiveMutation.mutate(agent.id)}>
                        Archive
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete "{agent.business_name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteMutation.mutate(agent.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Agents</h1>
        <p className="text-gray-600 mt-2">Manage and monitor all your AI agents</p>
      </div>

      {renderDashboard()}

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Agents</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            {selectedAgents.length > 0 && (
              <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Bulk Actions ({selectedAgents.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Operations</DialogTitle>
                    <DialogDescription>
                      Apply action to {selectedAgents.length} selected agents
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={bulkOperation} onValueChange={setBulkOperation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enable">Enable</SelectItem>
                        <SelectItem value="disable">Disable</SelectItem>
                        <SelectItem value="archive">Archive</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkOperation}
                        disabled={!bulkOperation || bulkMutation.isPending}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Industries</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all">
          {agentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map(renderAgentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents
              .filter(agent => agent.status === 'active')
              .map(renderAgentCard)}
          </div>
        </TabsContent>

        <TabsContent value="paused">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents
              .filter(agent => agent.status === 'paused')
              .map(renderAgentCard)}
          </div>
        </TabsContent>

        <TabsContent value="disabled">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents
              .filter(agent => agent.status === 'disabled')
              .map(renderAgentCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}