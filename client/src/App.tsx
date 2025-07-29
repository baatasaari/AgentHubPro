import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import MyAgents from "@/pages/my-agents";
import Billing from "@/pages/billing";
import Analytics from "@/pages/analytics";
import RAGManagement from "@/pages/rag-management"; 
import Navigation from "@/components/navigation";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agents" component={Agents} />
        <Route path="/my-agents" component={MyAgents} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/billing" component={Billing} />
        <Route path="/rag" component={RAGManagement} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
