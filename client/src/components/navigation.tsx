import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Settings, BarChart3, CreditCard, Bot, Users, Home, Database, MessageCircle, Smartphone } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/agents", label: "Agent Wizard", icon: Bot },
    { path: "/my-agents", label: "My Agents", icon: Users },
    { path: "/consultation", label: "Book Consultation", icon: MessageCircle },
    { path: "/payment-demo", label: "Payment Demo", icon: Smartphone },
    { path: "/conversational-payment", label: "Conversational Payments", icon: MessageCircle },
    { path: "/rag", label: "RAG Knowledge", icon: Database },
    { path: "/admin", label: "Admin Dashboard", icon: Settings },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AgentHub</span>
          </div>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Help
          </Button>
          <Button variant="outline" size="sm">
            Account
          </Button>
        </div>
      </div>
    </nav>
  );
}