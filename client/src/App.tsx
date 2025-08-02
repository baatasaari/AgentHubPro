import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import MyAgents from "@/pages/my-agents";
import Billing from "@/pages/billing";
import Analytics from "@/pages/analytics";
import RAGManagement from "@/pages/rag-management";
import AdminDashboard from "@/pages/admin-dashboard"; 
import UserManagement from "@/pages/user-management";
import ConsultationBooking from "@/pages/consultation-booking";
import PaymentDemo from "@/pages/payment-demo";
import ConversationalPaymentDemo from "@/pages/conversational-payment-demo";
import Conversations from "@/pages/conversations";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissionLevel: number;
  organizationId: number;
}

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem("sessionToken");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setSessionToken(token);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData: User, token: string) => {
    setUser(userData);
    setSessionToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("user");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !sessionToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Update query client to include auth headers
  queryClient.setDefaultOptions({
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  });

  // Filter routes based on user permissions
  const hasOwnerAccess = user.role === 'owner';
  const hasAdminAccess = user.permissionLevel >= 3;
  const hasUserAccess = user.permissionLevel >= 2;

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agents" component={Agents} />
        <Route path="/my-agents" component={MyAgents} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/billing" component={Billing} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/settings" component={Settings} />
        
        {/* Admin+ routes */}
        {hasAdminAccess && (
          <>
            <Route path="/rag-management" component={RAGManagement} />
            <Route path="/admin-dashboard" component={AdminDashboard} />
            <Route path="/consultation-booking" component={ConsultationBooking} />
            <Route path="/payment-demo" component={PaymentDemo} />
            <Route path="/conversational-payment-demo" component={ConversationalPaymentDemo} />
          </>
        )}
        
        {/* Owner-only routes */}
        {hasOwnerAccess && (
          <Route path="/user-management" component={UserManagement} />
        )}
        
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
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
