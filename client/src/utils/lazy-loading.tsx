import { lazy, Suspense, ComponentType, ReactNode, Component, ComponentProps } from 'react';

/**
 * Advanced lazy loading utilities for AgentHub components
 * Implements code splitting and dynamic imports for better performance
 */

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy-loaded components
class LazyLoadErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <p className="text-destructive">Failed to load component</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyLoadedComponent(props: ComponentProps<T>) {
    return (
      <LazyLoadErrorBoundary fallback={errorFallback}>
        <Suspense fallback={fallback || <LoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };
}

// Preload function for critical components
export function preloadComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  // Preload on idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFn();
    }, 1);
  }
}

// Lazy-loaded page components for route-based code splitting
export const LazyDashboard = withLazyLoading(
  () => import('../pages/dashboard'),
  <LoadingFallback message="Loading Dashboard..." />
);

export const LazyAgents = withLazyLoading(
  () => import('../pages/my-agents'),
  <LoadingFallback message="Loading Agents..." />
);

export const LazyAnalytics = withLazyLoading(
  () => import('../pages/analytics'),
  <LoadingFallback message="Loading Analytics..." />
);

export const LazySettings = withLazyLoading(
  () => import('../pages/settings'),
  <LoadingFallback message="Loading Settings..." />
);

export const LazyBilling = withLazyLoading(
  () => import('../pages/billing'),
  <LoadingFallback message="Loading Billing..." />
);

export const LazyConversations = withLazyLoading(
  () => import('../pages/conversations'),
  <LoadingFallback message="Loading Conversations..." />
);

export const LazyRAGManagement = withLazyLoading(
  () => import('../pages/rag-management'),
  <LoadingFallback message="Loading RAG Management..." />
);

export const LazyUserManagement = withLazyLoading(
  () => import('../pages/user-management'),
  <LoadingFallback message="Loading User Management..." />
);

export const LazyAdminDashboard = withLazyLoading(
  () => import('../pages/admin-dashboard'),
  <LoadingFallback message="Loading Admin Dashboard..." />
);

// Utility for conditional loading based on user permissions
export function conditionalLazyLoad(
  condition: boolean,
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback?: ComponentType<any>
) {
  if (!condition) {
    return fallback || (() => null);
  }
  
  return withLazyLoading(importFn);
}

// Bundle analyzer helper for development
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis:', {
      totalScripts: document.querySelectorAll('script').length,
      totalStyles: document.querySelectorAll('link[rel="stylesheet"]').length,
      totalImages: document.querySelectorAll('img').length,
    });
  }
}

// Performance monitoring for lazy-loaded components
export function measureLazyLoadPerformance(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`${componentName} lazy load time: ${loadTime.toFixed(2)}ms`);
    
    // Track in analytics if needed
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'lazy_load_performance', {
        component_name: componentName,
        load_time: Math.round(loadTime),
      });
    }
  };
}