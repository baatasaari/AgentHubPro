/**
 * Bundle Analysis and Optimization for AgentHub
 * Analyzes bundle size, identifies optimization opportunities, and provides recommendations
 */

interface BundleStats {
  totalSize: number;
  compressedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  duplicates: string[];
  recommendations: string[];
}

interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
  isEntry: boolean;
  isVendor: boolean;
}

interface DependencyInfo {
  name: string;
  size: number;
  version: string;
  isTreeShakeable: boolean;
  alternatives?: string[];
}

export class BundleAnalyzer {
  private stats: BundleStats;
  private thresholds = {
    maxChunkSize: 500 * 1024, // 500KB
    maxTotalSize: 2 * 1024 * 1024, // 2MB
    maxDependencySize: 100 * 1024, // 100KB
  };

  constructor() {
    this.stats = {
      totalSize: 0,
      compressedSize: 0,
      chunks: [],
      dependencies: [],
      duplicates: [],
      recommendations: [],
    };
  }

  // Analyze current bundle
  async analyzeBundleSize(): Promise<BundleStats> {
    console.log('📊 Analyzing bundle size and optimization opportunities...');

    // Get bundle information from window object (populated by build tools)
    const bundleInfo = (window as any).__BUNDLE_INFO__ || {};
    
    // Analyze chunks
    await this.analyzeChunks();
    
    // Analyze dependencies
    await this.analyzeDependencies();
    
    // Find duplicates
    await this.findDuplicates();
    
    // Generate recommendations
    this.generateRecommendations();

    return this.stats;
  }

  private async analyzeChunks(): Promise<void> {
    // Analyze loaded script tags to understand chunk sizes
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    
    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src;
      if (!src.includes('node_modules') && src.includes('.js')) {
        try {
          const response = await fetch(src, { method: 'HEAD' });
          const size = parseInt(response.headers.get('content-length') || '0');
          
          const chunkInfo: ChunkInfo = {
            name: this.extractChunkName(src),
            size,
            modules: [], // Would need build tool integration for detailed info
            isEntry: src.includes('index') || src.includes('main'),
            isVendor: src.includes('vendor') || src.includes('chunk'),
          };
          
          this.stats.chunks.push(chunkInfo);
          this.stats.totalSize += size;
        } catch (error) {
          console.warn('Could not analyze chunk:', src);
        }
      }
    }
  }

  private async analyzeDependencies(): Promise<void> {
    // Analyze key dependencies and their impact
    const keyDependencies = [
      { name: 'react', estimatedSize: 45000, isTreeShakeable: false },
      { name: 'react-dom', estimatedSize: 120000, isTreeShakeable: false },
      { name: '@tanstack/react-query', estimatedSize: 45000, isTreeShakeable: true },
      { name: '@radix-ui/*', estimatedSize: 200000, isTreeShakeable: true },
      { name: 'lucide-react', estimatedSize: 150000, isTreeShakeable: true },
      { name: 'framer-motion', estimatedSize: 180000, isTreeShakeable: true },
      { name: 'recharts', estimatedSize: 300000, isTreeShakeable: false },
      { name: 'wouter', estimatedSize: 8000, isTreeShakeable: true },
      { name: 'zod', estimatedSize: 50000, isTreeShakeable: true },
      { name: 'react-hook-form', estimatedSize: 25000, isTreeShakeable: true },
    ];

    this.stats.dependencies = keyDependencies.map(dep => ({
      ...dep,
      version: 'unknown', // Would need package.json parsing
      alternatives: this.getSmallerAlternatives(dep.name),
    }));
  }

  private async findDuplicates(): Promise<void> {
    // Detect potential duplicate code
    const potentialDuplicates = [
      'Multiple CSS-in-JS libraries',
      'Duplicate utility functions',
      'Similar UI components',
      'Overlapping date libraries',
    ];

    this.stats.duplicates = potentialDuplicates;
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Chunk size recommendations
    const largeChunks = this.stats.chunks.filter(chunk => chunk.size > this.thresholds.maxChunkSize);
    if (largeChunks.length > 0) {
      recommendations.push(
        `Split large chunks: ${largeChunks.length} chunks exceed 500KB`,
        'Implement dynamic imports for heavy components',
        'Consider lazy loading for non-critical features'
      );
    }

    // Total size recommendations
    if (this.stats.totalSize > this.thresholds.maxTotalSize) {
      recommendations.push(
        'Total bundle size exceeds 2MB - implement aggressive code splitting',
        'Move heavy dependencies to separate chunks',
        'Consider CDN for large libraries'
      );
    }

    // Dependency recommendations
    const heavyDeps = this.stats.dependencies.filter(dep => dep.estimatedSize > this.thresholds.maxDependencySize);
    if (heavyDeps.length > 0) {
      recommendations.push(
        ...heavyDeps.map(dep => `Consider optimizing ${dep.name} (${(dep.estimatedSize / 1024).toFixed(1)}KB)`)
      );
    }

    // Tree shaking recommendations
    const nonTreeShakeableDeps = this.stats.dependencies.filter(dep => !dep.isTreeShakeable);
    if (nonTreeShakeableDeps.length > 0) {
      recommendations.push(
        'Enable tree shaking for better optimization',
        ...nonTreeShakeableDeps.map(dep => `${dep.name} doesn't support tree shaking`)
      );
    }

    // Specific AgentHub optimizations
    recommendations.push(
      'Lazy load admin components for non-admin users',
      'Split analytics dashboard into separate chunk',
      'Use dynamic imports for chart libraries',
      'Implement component-level code splitting',
      'Optimize Radix UI imports to include only used components',
      'Consider replacing heavy dependencies with lighter alternatives'
    );

    this.stats.recommendations = recommendations;
  }

  private extractChunkName(src: string): string {
    const parts = src.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0] || 'unknown';
  }

  private getSmallerAlternatives(depName: string): string[] | undefined {
    const alternatives: Record<string, string[]> = {
      'framer-motion': ['react-spring', 'react-transition-group'],
      'recharts': ['victory', 'nivo', 'chart.js'],
      'lucide-react': ['react-feather', 'heroicons'],
      '@radix-ui/*': ['headless-ui', 'reach-ui'],
      'date-fns': ['dayjs', 'luxon'],
    };

    return alternatives[depName];
  }

  // Performance monitoring
  measurePerformanceImpact(): void {
    // Measure First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log(`FCP: ${entry.startTime.toFixed(2)}ms`);
        }
        if (entry.name === 'largest-contentful-paint') {
          console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

    // Measure resource loading times
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');

      console.log('📊 Performance Metrics:', {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalResources: resources.length,
        largestResource: Math.max(...resources.map(r => r.transferSize || 0)),
      });
    });
  }

  // Generate optimization report
  generateOptimizationReport(): string {
    const report = `
# AgentHub Bundle Optimization Report

## Current Bundle Stats
- Total Size: ${(this.stats.totalSize / 1024).toFixed(1)}KB
- Number of Chunks: ${this.stats.chunks.length}
- Heavy Dependencies: ${this.stats.dependencies.filter(d => d.estimatedSize > 100000).length}

## Top Recommendations
${this.stats.recommendations.slice(0, 5).map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Chunk Analysis
${this.stats.chunks
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .map(chunk => `- ${chunk.name}: ${(chunk.size / 1024).toFixed(1)}KB`)
  .join('\n')}

## Heavy Dependencies
${this.stats.dependencies
  .filter(dep => dep.estimatedSize > 50000)
  .map(dep => `- ${dep.name}: ${(dep.estimatedSize / 1024).toFixed(1)}KB`)
  .join('\n')}

## Next Steps
1. Implement lazy loading for heavy components
2. Split vendor dependencies into separate chunks
3. Optimize image and asset loading
4. Enable compression and caching
5. Monitor bundle size in CI/CD pipeline
    `;

    return report.trim();
  }
}

// Export analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

// Auto-analyze in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    bundleAnalyzer.analyzeBundleSize().then(stats => {
      console.log('📊 Bundle Analysis Complete:', stats);
      console.log(bundleAnalyzer.generateOptimizationReport());
    });
  }, 2000);
}