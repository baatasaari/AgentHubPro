/**
 * Performance Optimization for AgentHub
 * Implements code splitting, lazy loading, and bundle optimization
 */

// Lazy load heavy components for better initial load performance
export const LazyDashboard = () => import('../pages/dashboard');
export const LazyAgents = () => import('../pages/my-agents');
export const LazyAnalytics = () => import('../pages/analytics');
export const LazyBilling = () => import('../pages/billing');
export const LazySettings = () => import('../pages/settings');
export const LazyConversations = () => import('../pages/conversations');
export const LazyRAGManagement = () => import('../pages/rag-management');
export const LazyUserManagement = () => import('../pages/user-management');
export const LazyAdminDashboard = () => import('../pages/admin-dashboard');

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalScripts = scripts.length;
  
  console.log(`📊 Bundle Analysis: ${totalScripts} scripts loaded`);
  
  // Performance recommendations
  const recommendations = [
    'Implement lazy loading for non-critical components',
    'Use code splitting for route-based chunks',
    'Optimize images with modern formats (WebP, AVIF)',
    'Enable tree shaking for unused code elimination',
    'Implement service worker for caching'
  ];
  
  return { totalScripts, recommendations };
}

// Preload critical resources
export function preloadCriticalResources() {
  // Preload fonts
  const fontUrls = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
  ];
  
  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    document.head.appendChild(link);
  });

  // Preload critical API endpoints
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      fetch('/api/agents', { method: 'HEAD' }).catch(() => {});
      fetch('/api/analytics', { method: 'HEAD' }).catch(() => {});
    });
  }
}

// Performance monitoring
export function monitorPerformance() {
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const { name, startTime } = entry;
      console.log(`Performance: ${name} = ${startTime.toFixed(2)}ms`);
    }
  });

  observer.observe({ entryTypes: ['paint', 'navigation'] });

  // Monitor resource loading
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    console.log('📊 Load Performance:', {
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
      loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
    });
  });
}

// Initialize optimizations
export function initializeOptimizations() {
  preloadCriticalResources();
  monitorPerformance();
  
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => analyzeBundleSize(), 2000);
  }
}