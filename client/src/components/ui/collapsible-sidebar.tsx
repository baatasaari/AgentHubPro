import React, { useState, createContext, useContext } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Bot, 
  BarChart3, 
  CreditCard, 
  Calendar,
  Settings,
  Users,
  BookOpen,
  MessageSquare,
  Shield,
  Menu,
  ChevronLeft
} from 'lucide-react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Overview and analytics'
  },
  {
    name: 'My Agents',
    href: '/my-agents',
    icon: Bot,
    description: 'Manage AI agents'
  },
  {
    name: 'Agent Marketplace',
    href: '/agents',
    icon: Users,
    description: 'Browse available agents'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance metrics'
  },
  {
    name: 'Conversations',
    href: '/conversations',
    icon: MessageSquare,
    description: 'Chat history'
  },
  {
    name: 'RAG Management',
    href: '/rag-management',
    icon: BookOpen,
    description: 'Knowledge base'
  },
  {
    name: 'Calendar',
    href: '/consultation-booking',
    icon: Calendar,
    description: 'Schedule meetings'
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
    description: 'Payment & usage'
  },
  {
    name: 'Admin Dashboard',
    href: '/admin-dashboard',
    icon: Shield,
    description: 'Admin controls'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Platform settings'
  }
];

interface CollapsibleSidebarProps {
  className?: string;
}

export function CollapsibleSidebar({ className }: CollapsibleSidebarProps) {
  const [location] = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo and Toggle */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className={cn(
          "flex items-center min-w-0 transition-all duration-300",
          isCollapsed ? "px-3" : "px-4"
        )}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white truncate transition-opacity duration-300">
              AgentHub
            </span>
          )}
        </div>
        
        <div className={cn(
          "transition-all duration-300",
          isCollapsed ? "px-2" : "px-4"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto py-4">
        <ul className={cn(
          "flex flex-1 flex-col gap-y-1 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href !== '/' && location.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a 
                    className={cn(
                      'group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700',
                      isCollapsed ? 'justify-center px-2' : ''
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate transition-opacity duration-300">
                        {item.name}
                      </span>
                    )}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}