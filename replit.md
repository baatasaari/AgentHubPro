# AgentHub - Industry-Specialized AI Assistant SaaS Platform

## Overview
AgentHub is a SaaS platform for creating, customizing, and deploying industry-specific AI chatbot agents. It offers end-to-end solutions for building specialized AI assistants with professional interfaces (web chat widgets, WhatsApp integration) that can be embedded into customer websites. The platform aims to provide comprehensive tools for businesses to leverage AI chatbots for customer engagement and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language for non-technical users.

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
- **Comprehensive Agent Creation System**: Multi-step forms, 12 industry templates, LLM model selection (GPT-4, Claude 3, Gemini Pro), web chat and WhatsApp integration, real-time preview.
- **Advanced Widget Customization**: Visual customizer for themes, positioning, behavior, and custom code generation.
- **Intelligent Agent Management**: Dashboard with CRUD operations, status management, industry-specific prompts, and performance tracking.
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