# AgentHub - Industry-Specialized AI Assistant SaaS Platform

## Overview
AgentHub is a SaaS platform for creating, customizing, and deploying industry-specific AI chatbot agents. It provides businesses with end-to-end solutions for building specialized AI assistants with professional interfaces (web chat widgets, WhatsApp integration) that can be embedded into customer websites. The platform aims to enhance customer engagement and operational efficiency through AI chatbots.

## User Preferences
- Preferred communication style: Simple, everyday language for non-technical users
- Platform access: Internal team only - NO customer access to platform
- Access control: Owner-only full control, strict permission management for internal team
- DevOps access: Infrastructure and codebase access as needed
- Testing Focus: Conversational agents with payment systems using dummy data

## Recent Changes
- **August 13, 2025**: AGENT WIZARD FINAL VALIDATION COMPLETED
- **Critical Bug Fixed**: "Create Custom Agent button not working" issue resolved with proper dialog integration and click handlers
- **Complete UI Testing Suite**: Every field, navigation, flow, button, and feature tested with positive/negative scenarios
- **Form Validation Confirmed**: All input fields (business name, description, domain, industry, LLM model, interface type) working correctly
- **RAG Configuration UI Validated**: Enable/disable toggle, knowledge base setup, document upload, query modes, advanced settings all functional
- **Multi-Platform Interface Testing**: All 6 platforms (webchat, WhatsApp, Instagram, Messenger, SMS, Telegram) tested through UI
- **Navigation & Button Testing**: Create buttons, cancel/submit actions, status toggles, management operations all validated
- **Error Handling UI**: Comprehensive validation messages, API error handling, edge cases, and boundary conditions tested
- **Agent Management UI**: Status changes, RAG configuration dialogs, agent editing, and CRUD operations fully functional
- **Production Ready Status**: Agent Wizard UI completely tested and ready for deployment across all platforms

## System Architecture

### Microservices Architecture
AgentHub employs a domain-based microservices architecture, consolidating services to optimize operational complexity while maintaining full functionality. Key service domains include Knowledge Management, Payment Processing, Calendar & Booking, Core Business Logic, Analytics & Insights, Platform Infrastructure, and Communication & Processing.

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
- **Security**: JWT-based service-to-service authentication with permission-based access control, rate limiting, and input sanitization.
- **Data Consistency**: Event-driven updates and cross-service validation.

### Key Features
- **Comprehensive Agent Creation System**: 3-step wizard (Business Info → AI Configuration → RAG Setup), 12 industry templates, LLM model selection, web chat and WhatsApp integration.
- **Advanced RAG Integration**: Complete knowledge base configuration with document upload, query modes, chunk size optimization, confidence thresholds, and real-time RAG management.
- **Advanced Widget Customization**: Visual customizer for themes, positioning, behavior, and custom code generation.
- **Intelligent Agent Management**: Dashboard with CRUD operations, RAG enable/disable controls, status management, industry-specific prompts, and performance tracking.
- **Comprehensive Analytics Platform**: Usage analytics, performance metrics, industry insights, and real-time activity feed.
- **Professional Billing & Usage Tracking**: Transparent usage-based pricing, detailed tracking, and payment history.
- **Code Generation & Deployment**: Embeddable JavaScript snippets for easy integration.
- **Enterprise User Management**: Role-based access control with multiple roles, granular permission matrix, multi-tenancy, session management, audit logging, and organization management.
- **Owner-Controlled Authentication**: Secure email/password authentication with owner-only user creation, role assignment control, session management, audit logging, and permission-based route filtering.

### Database Schema & Data Management
- **Storage Architecture**: Production-ready PostgreSQL persistence layer replacing all global dictionaries with thread-safe, ACID-compliant storage. BigQuery is used for data warehousing.
- **Core Entities**: Organizations, Users, Agents, Conversations, User Sessions, Permissions, Audit Logs.
- **Persistent Tables**: Analytics Events, Payment Transactions, RAG Documents, Conversations, Agent Configurations, Embeddings Cache, System Metrics.
- **Multi-Tenancy**: Complete organization isolation with subscription management, usage tracking, and billing integration.
- **User Management**: Role personas with granular permissions across platform operations, organization management, agent operations, knowledge management, conversations, analytics, and API access.
- **Security & Compliance**: Session management, audit logging, permission inheritance, role-based access control, and comprehensive user activity tracking.
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
- **Database**: Google Cloud BigQuery, PostgreSQL
- **Caching**: Memcached
- **API Gateway**: NGINX
- **Logging**: Pino
- **Payment Gateway**: Universal payment flows (system-agnostic)
- **Calendar Integrations**: Google Calendar, Outlook, Apple Calendar, Calendly
- **Messaging Platforms**: WhatsApp Business API, Instagram, Messenger, Web Chat, SMS
- **Containerization**: Docker
- **Cloud Infrastructure**: Google Cloud Platform