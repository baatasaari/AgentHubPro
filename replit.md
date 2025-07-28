# AgentHub - Industry-Specialized AI Assistant SaaS Platform

## Overview

AgentHub is a comprehensive SaaS platform that enables businesses to create, customize, and deploy industry-specific AI chatbot agents. The platform provides end-to-end solutions for building specialized AI assistants with professional interfaces (web chat widgets, WhatsApp integration) that can be easily embedded into customer websites with generated code snippets.

## System Architecture

### Microservices Architecture
- **🤖 Agent Wizard Service (8001)**: Agent creation, management, and system prompt generation
- **📊 Analytics Service (8002)**: Usage tracking, performance metrics, and conversation analytics
- **💰 Billing Service (8003)**: Cost tracking, billing, invoicing, and payment management
- **📈 Dashboard Service (8004)**: Data aggregation, real-time metrics, and cross-service orchestration
- **🎨 Widget Service (8005)**: Widget customization, code generation, and template management
- **🌐 API Gateway (8000)**: Request routing, load balancing, and service discovery

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Code Organization (Separated Architecture)
- **`/components`**: Pure UI components with minimal business logic
- **`/core`**: Business logic utilities (AgentUtils, FormatUtils)
- **`/services`**: API communication layer (AgentService, UsageService)
- **`/types`**: Centralized type definitions and interfaces
- **`/pages`**: Route-level components using services and core utilities
- **Clear Separation**: UI completely separated from business logic and API calls

### Microservices Communication
- **Protocol**: HTTP REST APIs with JSON
- **Service Discovery**: Environment-based URL configuration
- **Health Monitoring**: Standardized health check endpoints
- **Data Consistency**: Event-driven updates and cross-service validation
- **Storage**: Dual system - BigQuery for production, in-memory for development

### Build System
- **Development**: Vite dev server with HMR
- **Production**: Vite build + esbuild for server bundling
- **Deployment**: Autoscale deployment on Replit

## Key Features & Components

### 1. Comprehensive Agent Creation System
- **Multi-step Agent Form**: Business information, AI model selection, interface configuration
- **Industry Specialization**: 12 pre-configured industry templates (Healthcare, Retail, Finance, Real Estate, etc.)
- **LLM Model Selection**: Support for GPT-4, GPT-3.5, Claude 3, Gemini Pro with pricing transparency
- **Interface Types**: Web chat widgets and WhatsApp Business API integration
- **Real-time Preview**: Live agent preview with industry-specific responses

### 2. Advanced Widget Customization
- **Visual Customizer**: Color themes, positioning, sizing, border radius controls
- **Behavioral Settings**: Auto-open, branding options, responsive design
- **Live Preview**: Real-time widget appearance preview
- **Custom Code Generation**: Tailored embed codes with user configurations

### 3. Intelligent Agent Management
- **Agent Dashboard**: Complete CRUD operations with filtering and search
- **Status Management**: Draft, Active, Paused states with easy transitions
- **Industry-specific System Prompts**: Automatically generated contextual AI instructions
- **Performance Tracking**: Individual agent metrics and usage statistics

### 4. Comprehensive Analytics Platform
- **Usage Analytics**: Total conversations, revenue tracking, active agent monitoring
- **Performance Metrics**: Response times, satisfaction scores, conversion tracking
- **Industry Insights**: Usage breakdown by business vertical
- **Real-time Activity**: Live feed of agent interactions and events

### 5. Professional Billing & Usage Tracking
- **Transparent Pricing**: Real-time cost calculations based on token usage
- **Usage Monitoring**: Detailed conversation and cost tracking per agent
- **Payment History**: Complete billing records and payment tracking
- **Cost Estimation**: Predictive monthly cost calculations

### 6. Code Generation & Deployment
- **Embed Code Generation**: Production-ready JavaScript snippets
- **Easy Integration**: Copy-paste deployment with detailed instructions
- **Customizable Widgets**: Branded or white-label options
- **Multi-platform Support**: Web, mobile-responsive designs

## Database Schema & Data Management

### Storage Architecture
- **Dual Storage System**: Automatic detection between BigQuery (production) and in-memory (development)
- **BigQuery Integration**: Google Cloud BigQuery with comprehensive configuration options
- **Configurable Settings**: All database parameters configurable via environment variables
- **Environment-based Selection**: Uses BigQuery when `GOOGLE_CLOUD_PROJECT_ID` is set, otherwise falls back to memory storage
- **Interactive Setup**: Guided configuration script for easy database setup
- **Seamless Migration**: Same API interface regardless of storage backend

### Core Entities
- **Agents**: Business info, AI configuration, interface settings, deployment status
- **Conversations**: Usage metrics, token consumption, cost tracking, timestamps
- **Sample Data**: Pre-loaded with realistic examples across industries
- **Automatic Setup**: Tables and schemas created automatically on first run

### BigQuery Configuration
- **Comprehensive Settings**: All database parameters configurable via environment variables
- **Environment Templates**: Pre-configured settings for development, staging, and production
- **Interactive Setup Script**: Guided configuration for easy database setup
- **Custom Table Names**: Configurable table names for multi-environment deployments
- **Performance Tuning**: Configurable timeouts, retries, and query logging
- **Security Features**: Parameterized queries, service account authentication, and audit logging

### BigQuery Schema
- **agents table**: ID, business details, industry, AI model configuration, interface type, status, timestamps
- **conversations table**: ID, agent reference, token usage, cost tracking, timestamps
- **Flexible Schema**: Table names and dataset locations fully configurable

### Industry Specialization
- **12 Industry Templates**: Healthcare, Retail, Finance, Real Estate, Education, Hospitality, Legal, Automotive, Technology, Consulting, Fitness, Food & Beverage
- **Specialized Prompts**: Industry-specific AI behavior and knowledge
- **Cost Optimization**: Model recommendations per industry use case

## Advanced UI Components

### Form Systems
- **Multi-step Forms**: Progressive disclosure with validation
- **Real-time Validation**: Zod schema validation with error handling
- **Dynamic Previews**: Live updates as users configure agents

### Dashboard Components
- **Interactive Tables**: Sortable, filterable agent listings
- **Analytics Cards**: Performance metrics with visual indicators
- **Chat Widgets**: Functional preview with industry-specific responses
- **Code Generators**: Syntax-highlighted embed code display

### Customization Tools
- **Color Pickers**: Professional color selection interface
- **Slider Controls**: Precise numerical adjustments
- **Toggle Switches**: Boolean configuration options
- **Tabbed Interfaces**: Organized feature grouping

## Data Flow & User Experience

1. **Agent Creation**: Business info → Industry selection → AI model choice → Interface setup → Preview → Deploy
2. **Customization**: Visual theme selection → Behavioral configuration → Code generation → Integration
3. **Management**: Agent monitoring → Performance analytics → Usage tracking → Billing oversight
4. **Deployment**: Embed code → Website integration → Live agent activation

## External Dependencies & Integrations

### Core Technologies
- **UI Framework**: Radix UI primitives for accessibility
- **Validation**: Zod for runtime type safety
- **Utilities**: date-fns, Lucide React icons, class-variance-authority
- **Forms**: React Hook Form with resolver integration

### Development Environment
- **Replit Integration**: Seamless development and deployment
- **Hot Reload**: Real-time development updates
- **TypeScript**: Full type safety across frontend and backend

## Business Model & Monetization

### SaaS Features
- **Usage-based Pricing**: Pay-per-conversation model
- **Tiered AI Models**: Different pricing levels for various capabilities
- **Industry Specialization**: Premium features for specific verticals
- **White-label Options**: Branded vs. co-branded widget deployment

### Scalability
- **Multi-tenant Architecture**: Support for multiple business customers
- **API Rate Limiting**: Controlled usage and cost management
- **Performance Monitoring**: Real-time system health tracking

## User Preferences

Preferred communication style: Simple, everyday language for non-technical users.

## Docker Deployment

### Docker Configuration
- **Production Dockerfile**: Optimized Node.js 20 Alpine build with security best practices
- **Development Dockerfile**: Hot reload support for development environments  
- **Docker Compose**: Complete orchestration setup with health checks and volume mounting
- **Multi-environment Support**: Separate configurations for development and production
- **BigQuery Integration**: Environment variable configuration for Google Cloud deployment
- **Security Features**: Non-root user, minimal attack surface, health monitoring

### Deployment Options
- **Single Container**: `docker build -t agenthub . && docker run -p 5000:5000 agenthub`
- **Docker Compose Production**: `docker-compose up -d` 
- **Docker Compose Development**: `docker-compose -f docker-compose.dev.yml up`
- **Kubernetes Ready**: Includes example K8s deployment configurations
- **Container Registry**: Ready for deployment to AWS ECR, Docker Hub, or Google Container Registry

## Recent Changes

### July 28, 2025 - Complete Microservices Architecture Implementation
- ✓ Created independent Agent Wizard microservice using FastAPI
- ✓ Implemented comprehensive validation with Pydantic V2
- ✓ Added business logic enforcement and model compatibility checks
- ✓ Built complete REST API with OpenAPI documentation
- ✓ Created Docker containerization and service orchestration
- ✓ Established microservices development standards and templates
- ✓ Comprehensive testing framework with validation scenarios
- ✓ Production-ready service with health checks and monitoring
- ✓ YAML configuration system for industry-specific system prompts
- ✓ Runtime chat capabilities and system prompt management endpoints
- ✓ Dynamic configuration reloading without service restart
- ✓ Industry metadata management with comprehensive prompt templates
- ✓ BigQuery integration with Terraform infrastructure provisioning
- ✓ Dual storage system (BigQuery for production, in-memory for development)
- ✓ Complete Google Cloud Platform setup with service accounts and API enablement
- ✓ Automated infrastructure provisioning and environment configuration
- ✓ Built complete Analytics Service with conversation tracking and performance metrics
- ✓ Implemented Billing Service with usage tracking, invoicing, and payment management
- ✓ Created Dashboard Service with cross-service data aggregation and real-time updates
- ✓ Developed Widget Service with customization, code generation, and template system
- ✓ Established complete microservices ecosystem with API Gateway and Docker orchestration

### July 22, 2025 - Docker Containerization
- ✓ Created production-optimized Dockerfile with Node.js 20 Alpine
- ✓ Implemented Docker Compose orchestration for easy deployment
- ✓ Added development Docker environment with hot reload support
- ✓ Configured health checks and monitoring for container reliability
- ✓ Created comprehensive Docker deployment documentation
- ✓ Set up multi-environment configuration (dev/prod)
- ✓ Integrated BigQuery environment variable configuration
- ✓ Added security best practices with non-root user execution

### July 27, 2025 - Complete New Architecture Migration
- ✓ Full architectural separation with modern structure (/core, /services, /types, /components)
- ✓ Created comprehensive business logic layer with calculations and validation
- ✓ Implemented modern service classes with type-safe API communication
- ✓ Added enhanced validation rules with business logic integration
- ✓ Migrated all components to use separated architecture
- ✓ Updated to TanStack Query v5.83.0 with latest API patterns
- ✓ Enhanced error handling and loading states throughout application
- ✓ Removed duplicate code structures and consolidated utilities
- ✓ Maintained full functionality while using cutting-edge APIs and architecture

### July 26, 2025 - UI and Application Code Separation
- ✓ Created clean architectural separation between UI and business logic
- ✓ Moved business logic to `/core` utilities (AgentUtils, FormatUtils)
- ✓ Isolated API calls in `/services` layer (AgentService, UsageService)
- ✓ Centralized type definitions in `/types` directory
- ✓ Updated components to use separated architecture
- ✓ Created comprehensive architecture documentation
- ✓ Maintained backwards compatibility during transition

### July 22, 2025 - Code Cleanup and Optimization
- ✓ Massive code cleanup - removed 27 unused UI components (60% reduction)
- ✓ Eliminated duplicate functions and redundant imports
- ✓ Fixed formatting issues and blank lines throughout codebase
- ✓ Comprehensive testing validated all APIs working correctly
- ✓ Platform now significantly more maintainable and performant

### June 16, 2025 - Comprehensive Platform Development
- ✓ Complete agent creation workflow with industry specialization
- ✓ Advanced widget customization with real-time preview
- ✓ Professional analytics dashboard with performance metrics
- ✓ Billing system with transparent usage tracking
- ✓ Code generation system for easy website integration
- ✓ Multi-tab interface design for organized feature access
- ✓ Industry-specific AI prompt generation
- ✓ Responsive design with mobile optimization
- ✓ Sample data across 12 industry verticals
- ✓ Real-time cost estimation and model comparison

### July 20, 2025 - BigQuery Database Migration
- ✓ Implemented BigQuery storage adapter with same interface as memory storage
- ✓ Automatic environment-based storage selection (BigQuery for production, memory for development)
- ✓ Complete BigQuery integration with table creation, schema management, and sample data
- ✓ Parameterized SQL queries for security and performance
- ✓ Seamless migration without changing frontend or API code
- ✓ Setup documentation for Google Cloud configuration

### July 20, 2025 - Configurable Database System
- ✓ Created comprehensive configuration system for all database settings
- ✓ Environment variables for datasets, tables, timeouts, retries, and logging
- ✓ Interactive setup script with guided configuration for dev/staging/production
- ✓ Pre-configured environment templates with optimal settings
- ✓ Configuration validation and error handling with clear messages
- ✓ Sample data and query logging toggles for development vs production
- ✓ Flexible table naming for multi-environment deployments

The platform now offers enterprise-grade BigQuery storage with fully configurable settings, making it easy to deploy across different environments while maintaining complete flexibility and control.