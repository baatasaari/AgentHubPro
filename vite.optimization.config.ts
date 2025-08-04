import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Advanced Vite optimization configuration for AgentHub
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for development
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    }),
  ],
  
  // Build optimizations
  build: {
    // Enable source maps for production debugging
    sourcemap: true,
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor libraries
          vendor: ['react', 'react-dom'],
          
          // UI components
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-avatar',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-switch',
          ],
          
          // Form handling
          forms: [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],
          
          // Data fetching
          data: [
            '@tanstack/react-query',
            'axios',
          ],
          
          // Routing and utilities
          routing: [
            'wouter',
            'lucide-react',
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
          ],
          
          // Charts and visualization
          charts: [
            'recharts',
            'framer-motion',
          ],
        },
        
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        },
        
        // Optimize chunk naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: true,
        drop_debugger: true,
        // Remove unused code
        dead_code: true,
        // Optimize conditionals
        conditionals: true,
        // Optimize loops
        loops: true,
        // Remove unused variables
        unused: true,
      },
      mangle: {
        // Preserve function names for better debugging
        keep_fnames: false,
        // Optimize property names
        properties: true,
      },
      format: {
        // Remove comments
        comments: false,
      },
    },
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Optimize CSS
    cssMinify: true,
  },
  
  // Development optimizations
  server: {
    // Enable file system caching
    fs: {
      cachedChecks: false,
    },
  },
  
  // Dependency optimization
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      '@tanstack/react-query',
      'wouter',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    
    // Exclude dependencies from pre-bundling
    exclude: [
      // Large dependencies that are better loaded on-demand
    ],
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@assets': resolve(__dirname, './client/src/assets'),
    },
  },
  
  // Environment variables
  define: {
    // Replace process.env with import.meta.env for better tree shaking
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  
  // CSS optimization
  css: {
    // PostCSS optimizations
    postcss: {
      plugins: [
        // Remove unused CSS
        require('@fullhuman/postcss-purgecss')({
          content: ['./client/src/**/*.{js,jsx,ts,tsx}', './client/index.html'],
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          safelist: [
            // Preserve dynamic classes
            /^data-/,
            /^aria-/,
            /^role-/,
            // Preserve animation classes
            /animate-/,
            // Preserve responsive classes
            /^sm:/,
            /^md:/,
            /^lg:/,
            /^xl:/,
            /^2xl:/,
          ],
        }),
        
        // Optimize CSS
        require('cssnano')({
          preset: 'default',
        }),
      ],
    },
  },
  
  // Experimental features
  experimental: {
    // Enable render built-in optimizations
    renderBuiltUrl: (filename) => {
      // Use CDN for static assets in production
      if (process.env.NODE_ENV === 'production' && process.env.CDN_URL) {
        return `${process.env.CDN_URL}/${filename}`;
      }
      return filename;
    },
  },
});