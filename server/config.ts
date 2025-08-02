// Centralized configuration management for AgentHub
import { z } from "zod";

// Configuration schema validation
const configSchema = z.object({
  // Server configuration
  server: z.object({
    port: z.number().default(5000),
    host: z.string().default("0.0.0.0"),
    nodeEnv: z.enum(["development", "production", "test"]).default("development"),
    corsOrigins: z.array(z.string()).default(["http://localhost:3000", "http://localhost:5000"]),
  }),
  
  // Database configuration
  database: z.object({
    url: z.string().optional(),
    host: z.string().default("localhost"),
    port: z.number().default(5432),
    name: z.string().default("agenthub"),
    user: z.string().default("postgres"),
    password: z.string().optional(),
    ssl: z.boolean().default(false),
  }),
  
  // Cache configuration
  cache: z.object({
    type: z.enum(["memcached", "redis"]).default("memcached"),
    servers: z.array(z.string()).default(["localhost:11211"]),
    ttl: z.number().default(3600), // 1 hour
  }),
  
  // API configuration
  api: z.object({
    baseUrl: z.string().default("http://localhost:5000"),
    version: z.string().default("v1"),
    rateLimit: z.object({
      windowMs: z.number().default(900000), // 15 minutes
      max: z.number().default(100), // limit each IP to 100 requests per windowMs
    }),
  }),
  
  // External services
  services: z.object({
    openai: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().default("https://api.openai.com/v1"),
      model: z.string().default("gpt-4o"),
    }),
    sendgrid: z.object({
      apiKey: z.string().optional(),
      fromEmail: z.string().default("noreply@agenthub.com"),
    }),
    stripe: z.object({
      secretKey: z.string().optional(),
      publicKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    }),
  }),
  
  // Cloud configuration
  cloud: z.object({
    provider: z.enum(["gcp", "aws", "azure"]).default("gcp"),
    region: z.string().default("asia-south1"),
    projectId: z.string().optional(),
    credentials: z.string().optional(),
  }),
  
  // Microservices configuration
  microservices: z.object({
    enabled: z.boolean().default(false),
    registry: z.string().default("http://localhost:8027"),
    services: z.record(z.object({
      port: z.number(),
      host: z.string().default("localhost"),
      healthCheck: z.string().default("/health"),
      timeout: z.number().default(30000),
    })).default({}),
  }),
  
  // Widget configuration
  widget: z.object({
    cdnUrl: z.string().default("https://cdn.agenthub.com"),
    defaultTheme: z.string().default("modern"),
    position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).default("bottom-right"),
  }),
  
  // Security configuration
  security: z.object({
    jwtSecret: z.string().optional(),
    jwtExpiry: z.string().default("24h"),
    bcryptRounds: z.number().default(12),
    cors: z.object({
      credentials: z.boolean().default(true),
      optionsSuccessStatus: z.number().default(200),
    }),
  }),
  
  // Logging configuration
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug"]).default("info"),
    format: z.enum(["json", "pretty"]).default("pretty"),
    file: z.string().optional(),
  }),
  
  // Business configuration
  business: z.object({
    companyName: z.string().default("AgentHub"),
    supportEmail: z.string().default("support@agenthub.com"),
    baseUrl: z.string().default("https://agenthub.com"),
    domains: z.object({
      main: z.string().default("agenthub.com"),
      api: z.string().default("api.agenthub.com"),
      cdn: z.string().default("cdn.agenthub.com"),
      meet: z.string().default("meet.agenthub.in"),
    }),
  }),
});

type Config = z.infer<typeof configSchema>;

// Load configuration from environment variables
function loadConfig(): Config {
  const config = {
    server: {
      port: parseInt(process.env.PORT || "5000"),
      host: process.env.HOST || "0.0.0.0",
      nodeEnv: (process.env.NODE_ENV || "development") as "development" | "production" | "test",
      corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5000"],
    },
    
    database: {
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      name: process.env.DB_NAME || "agenthub",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === "true",
    },
    
    cache: {
      type: (process.env.CACHE_TYPE || "memcached") as "memcached" | "redis",
      servers: process.env.CACHE_SERVERS?.split(",") || ["localhost:11211"],
      ttl: parseInt(process.env.CACHE_TTL || "3600"),
    },
    
    api: {
      baseUrl: process.env.API_BASE_URL || "http://localhost:5000",
      version: process.env.API_VERSION || "v1",
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
        max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
      },
    },
    
    services: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        model: process.env.OPENAI_MODEL || "gpt-4o",
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.FROM_EMAIL || "noreply@agenthub.com",
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.VITE_STRIPE_PUBLIC_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
    
    cloud: {
      provider: (process.env.CLOUD_PROVIDER || "gcp") as "gcp" | "aws" | "azure",
      region: process.env.CLOUD_REGION || "asia-south1",
      projectId: process.env.GCP_PROJECT_ID || process.env.PROJECT_ID,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
    
    microservices: {
      enabled: process.env.MICROSERVICES_ENABLED === "true",
      registry: process.env.SERVICE_REGISTRY_URL || "http://localhost:8027",
      services: {},
    },
    
    widget: {
      cdnUrl: process.env.WIDGET_CDN_URL || "https://cdn.agenthub.com",
      defaultTheme: process.env.WIDGET_DEFAULT_THEME || "modern",
      position: (process.env.WIDGET_POSITION || "bottom-right") as "bottom-right" | "bottom-left" | "top-right" | "top-left",
    },
    
    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiry: process.env.JWT_EXPIRY || "24h",
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12"),
      cors: {
        credentials: process.env.CORS_CREDENTIALS !== "false",
        optionsSuccessStatus: parseInt(process.env.CORS_OPTIONS_SUCCESS_STATUS || "200"),
      },
    },
    
    logging: {
      level: (process.env.LOG_LEVEL || "info") as "error" | "warn" | "info" | "debug",
      format: (process.env.LOG_FORMAT || "pretty") as "json" | "pretty",
      file: process.env.LOG_FILE,
    },
    
    business: {
      companyName: process.env.COMPANY_NAME || "AgentHub",
      supportEmail: process.env.SUPPORT_EMAIL || "support@agenthub.com",
      baseUrl: process.env.BUSINESS_BASE_URL || "https://agenthub.com",
      domains: {
        main: process.env.DOMAIN_MAIN || "agenthub.com",
        api: process.env.DOMAIN_API || "api.agenthub.com",
        cdn: process.env.DOMAIN_CDN || "cdn.agenthub.com",
        meet: process.env.DOMAIN_MEET || "meet.agenthub.in",
      },
    },
  };
  
  return configSchema.parse(config);
}

// Export the configuration singleton
export const config = loadConfig();
export type { Config };
export default config;