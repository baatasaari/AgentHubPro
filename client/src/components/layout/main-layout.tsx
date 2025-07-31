import React from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex flex-1 flex-col ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              AgentHub Platform
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Industry-specialized AI assistant microservices platform
            </p>
          </div>
        </header>

        {/* Page content */}
        <main className={cn(
          "flex-1 overflow-y-auto p-6",
          className
        )}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;