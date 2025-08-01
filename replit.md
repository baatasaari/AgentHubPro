# AgentHub - Industry-Specialized AI Assistant SaaS Platform

## Overview
AgentHub is a SaaS platform for creating, customizing, and deploying industry-specific AI chatbot agents. It offers end-to-end solutions for building specialized AI assistants with professional interfaces (web chat widgets, WhatsApp integration) that can be embedded into customer websites. The platform aims to provide comprehensive tools for businesses to leverage AI chatbots for customer engagement and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language for non-technical users.

## Recent Changes (August 1, 2025)
- ✅ **RAG Integration Complete**: Successfully integrated RAG functionality into both Agent Wizard (3-step process) and My Agents management page
- ✅ **Agent Wizard Enhancement**: Restructured to 3-step flow: Business Information → AI Model Configuration → RAG Knowledge Base Setup
- ✅ **My Agents RAG Controls**: Added RAG status indicators, enable/disable controls, and comprehensive RAG configuration management
- ✅ **Server RAG Support**: Complete backend integration for RAG configuration data handling in agent creation and updates
- ✅ **Collapsible Sidebar**: Implemented smooth 300ms animated collapsible left-hand sidebar with toggle functionality
- ✅ **Comprehensive Testing**: Full platform test covering UI, microservices, database, embeddings, connections, routes, navigation, workflows
- ✅ **Agent CRUD Complete**: Full agent lifecycle management with create, read, update, delete, enable/disable, pause functionality tested
- ✅ **Conversational Payments**: Multi-platform payment system tested with WhatsApp, Instagram, UPI, Google Pay, and Indian payment methods
- ✅ **Complete Customer Journey**: Full 6-step flow tested (Enquiry → RAG → Selection → Payment Suggestion → Method Selection → Processing) across 3 industry verticals with multi-language support
- ✅ **Platform Production Ready**: All 10 navigation routes, 5 API endpoints, microservices architecture, and core functionality fully operational

## System Architecture

### Microservices Architecture
AgentHub employs an ultra-granular microservices architecture, consisting of 29 highly-focused services categorized into domains:
- **Knowledge Management**: Document processing, embedding generation, similarity search, knowledge base management, FAQ management, and RAG query processing.
- **Payment Processing**: Payment intent, payment link generation, metrics collection, and billing calculation.
- **Calendar & Booking**: Slot management, booking management, calendar provider integration, and notifications.
- **Core Business Logic**: Agent lifecycle management, conversation management, widget generation, and usage analytics.
- **Analytics & Insights**: Analytics calculation, insights generation, data storage, and system health monitoring.
- **Platform Infrastructure**: Configuration, LLM response generation, service discovery, authentication, database operations, centralized logging, and industry configurations.
- **Communication & Processing**: Conversation processing.

**Platform Infrastructure Components**:
- **API Gateway (NGINX)**: Handles request routing, load balancing, and service discovery.
- **Orchestration Service**: Manages cross-service workflows and event-driven communication.
- **Data Management Service**: Manages database operations and BigQuery integration.
- **Configuration Service**: Provides central configuration management and feature flags.

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite.
- **UI Library**: Shadcn/ui (built on Radix UI primitives).
- **Styling**: Tailwind CSS with CSS variables.
- **State Management**: TanStack Query (React Query).
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.

### Code Organization
A clear separation of concerns is maintained with directories for pure UI components (`/components`), business logic utilities (`/core`), API communication (`/services`), centralized type definitions (`/types`), and route-level components (`/pages`).

### Microservices Communication
- **Protocol**: HTTP REST APIs with JSON.
- **Service Discovery**: Environment-based URL configuration.
- **Health Monitoring**: Standardized health check endpoints.
- **Data Consistency**: Event-driven updates and cross-service validation.
- **Storage**: Dual system, utilizing BigQuery for production and in-memory for development.

### Key Features
- **Comprehensive Agent Creation System**: 3-step wizard (Business Info → AI Configuration → RAG Setup), 12 industry templates, LLM model selection (GPT-4, Claude 3, Gemini Pro), web chat and WhatsApp integration, real-time preview.
- **Advanced RAG Integration**: Complete knowledge base configuration with document upload, query modes (semantic, hybrid), chunk size optimization, confidence thresholds, and real-time RAG management.
- **Advanced Widget Customization**: Visual customizer for themes, positioning, behavior, and custom code generation.
- **Intelligent Agent Management**: Dashboard with CRUD operations, RAG enable/disable controls, status management, industry-specific prompts, and performance tracking.
- **Comprehensive Analytics Platform**: Usage analytics, performance metrics, industry insights, and real-time activity feed.
- **Professional Billing & Usage Tracking**: Transparent usage-based pricing, detailed tracking, payment history, and cost estimation.
- **Code Generation & Deployment**: Embeddable JavaScript snippets for easy integration.

### Database Schema & Data Management
- **Storage Architecture**: Dual storage system with automatic detection between Google Cloud BigQuery (production) and in-memory (development).
- **Core Entities**: Agents (business info, AI config, interface, status), Conversations (usage, token consumption, cost).
- **BigQuery Configuration**: Configurable via environment variables, with comprehensive settings and an interactive setup script.
- **Industry Specialization**: 12 pre-configured industry templates with specialized prompts and model recommendations.

### Docker Deployment
- **Docker Configuration**: Optimized production Dockerfile (Node.js 20 Alpine), development Dockerfile with hot reload, Docker Compose for orchestration.
- **Deployment Options**: Single container, Docker Compose for production and development, Kubernetes ready.

## External Dependencies

- **UI Framework Primitives**: Radix UI
- **Validation**: Zod
- **Utilities**: `date-fns`, Lucide React icons, `class-variance-authority`
- **Forms**: React Hook Form
- **LLM Providers**: Google Vertex AI, OpenAI, Anthropic, Azure
- **Database**: Google Cloud BigQuery
- **API Gateway**: NGINX
- **Logging**: Pino
- **Payment Gateway**: Universal payment flows (system-agnostic)
- **Calendar Integrations**: Google Calendar, Outlook, Apple Calendar, Calendly
- **Messaging Platforms**: WhatsApp Business API, Instagram, Messenger, Web Chat, SMS
- **Containerization**: Docker
- **Cloud Infrastructure**: Google Cloud Platform (for BigQuery)