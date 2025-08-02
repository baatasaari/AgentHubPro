// Frontend configuration management
interface FrontendConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  widget: {
    cdnUrl: string;
    defaultTheme: string;
  };
  business: {
    name: string;
    supportEmail: string;
    domains: {
      main: string;
      api: string;
      cdn: string;
      meet: string;
    };
  };
  features: {
    enableAnalytics: boolean;
    enableRAG: boolean;
    enablePayments: boolean;
  };
}

// Load configuration from environment variables (Vite)
const config: FrontendConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  },
  widget: {
    cdnUrl: import.meta.env.VITE_WIDGET_CDN_URL || 'https://cdn.agenthub.com',
    defaultTheme: import.meta.env.VITE_WIDGET_THEME || 'modern',
  },
  business: {
    name: import.meta.env.VITE_COMPANY_NAME || 'AgentHub',
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@agenthub.com',
    domains: {
      main: import.meta.env.VITE_DOMAIN_MAIN || 'agenthub.com',
      api: import.meta.env.VITE_DOMAIN_API || 'api.agenthub.com',
      cdn: import.meta.env.VITE_DOMAIN_CDN || 'cdn.agenthub.com',
      meet: import.meta.env.VITE_DOMAIN_MEET || 'meet.agenthub.in',
    },
  },
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    enableRAG: import.meta.env.VITE_ENABLE_RAG !== 'false',
    enablePayments: import.meta.env.VITE_ENABLE_PAYMENTS !== 'false',
  },
};

export default config;
export type { FrontendConfig };