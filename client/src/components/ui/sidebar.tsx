import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
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
  Shield
} from 'lucide-react';

interface SidebarProps {
  className?: string;
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

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className={cn(
      "flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-gray-900 dark:bg-gray-950",
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center">
          <Bot className="h-8 w-8 text-blue-500" />
          <span className="ml-2 text-xl font-bold text-white">AgentHub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href !== '/' && location.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn(
                    "group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  )}>
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Status */}
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="px-3 py-2">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              <span className="ml-2 text-xs text-gray-400">
                29 Microservices Active
              </span>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;