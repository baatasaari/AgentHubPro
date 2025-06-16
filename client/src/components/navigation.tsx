import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Plus } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", active: location === "/" },
    { path: "/agents", label: "My Agents", active: location === "/agents" },
    { path: "/billing", label: "Billing", active: location === "/billing" },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">AgentHub</h1>
            </Link>
            <nav className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <span
                    className={`pb-4 font-medium transition-colors ${
                      item.active
                        ? "text-slate-900 border-b-2 border-primary"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                New Agent
              </Button>
            </Link>
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
