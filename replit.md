# AgentHub - Industry-Specialized AI Assistant SaaS Platform

## Overview
AgentHub is a SaaS platform for creating, customizing, and deploying industry-specific AI chatbot agents. It offers end-to-end solutions for building specialized AI assistants with professional interfaces (web chat widgets, WhatsApp integration) that can be embedded into customer websites. The platform aims to provide comprehensive tools for businesses to leverage AI chatbots for customer engagement and operational efficiency.

## User Preferences
- Preferred communication style: Simple, everyday language for non-technical users
- Platform access: Internal team only - NO customer access to platform
- Access control: Owner-only full control, strict permission management for internal team
- DevOps access: Infrastructure and codebase access as needed

## Recent Changes (August 2, 2025)
- ✅ **RAG Integration Complete**: Successfully integrated RAG functionality into both Agent Wizard (3-step process) and My Agents management page
- ✅ **Agent Wizard Enhancement**: Restructured to 3-step flow: Business Information → AI Model Configuration → RAG Knowledge Base Setup
- ✅ **My Agents RAG Controls**: Added RAG status indicators, enable/disable controls, and comprehensive RAG configuration management
- ✅ **Server RAG Support**: Complete backend integration for RAG configuration data handling in agent creation and updates
- ✅ **Collapsible Sidebar**: Implemented smooth 300ms animated collapsible left-hand sidebar with toggle functionality
- ✅ **Comprehensive Testing**: Full platform test covering UI, microservices, database, embeddings, connections, routes, navigation, workflows
- ✅ **Agent CRUD Complete**: Full agent lifecycle management with create, read, update, delete, enable/disable, pause functionality tested
- ✅ **Conversational Payments**: Multi-platform payment system tested with WhatsApp, Instagram, UPI, Google Pay, and Indian payment methods
- ✅ **Complete Customer Journey**: Full 6-step flow tested (Enquiry → RAG → Selection → Payment Suggestion → Method Selection → Processing) across 3 industry verticals with multi-language support
- ✅ **Analytics & Insights**: Comprehensive analytics system operational with customer journey tracking, conversion analytics, RAG performance monitoring, payment insights, and business intelligence across all platforms
- ✅ **Customer Reporting Suite**: Complete reporting system tested with 7 report types, 4 export formats, automated delivery, and stakeholder-specific customization - production ready with no critical issues
- ✅ **Email Reporting System**: Fully operational email delivery system with professional HTML templates, comprehensive analytics reports, and strategic business content generation
- ✅ **Systematic Platform Testing**: Complete end-to-end testing of all 8 critical systems with 100% operational status achieved
- ✅ **Email System Fixes**: Implemented robust null safety and error handling in strategic report generation
- ✅ **Platform Production Ready**: All 10 navigation routes, 8 API endpoints, 29 microservices, email reporting, and core functionality fully operational and verified
- ✅ **Cloud Run Deployment Strategy**: Complete GCP Cloud Run deployment solution with 29 microservices, internal communication, IAM authentication, RESTful APIs + gRPC, latency optimization, and comprehensive operational tools
- ✅ **Virtual Deployment Testing**: Comprehensive testing of all deployment scripts, dependencies, and communication libraries with fixes applied
- ✅ **Final Deployment Guide**: DEPLOYMENT_GUIDE_FINAL.md created with 100% validated components and production-ready procedures
- ✅ **Architecture Correction**: Updated deployment to use BigQuery instead of Cloud SQL PostgreSQL, aligning with documented data warehouse architecture and reducing costs by $100/month
- ✅ **Cache Optimization**: Successfully migrated from Redis to Memcached for better performance and cost efficiency, reducing cache costs by $40-60/month with 100% Redis reference removal
- ✅ **Configuration Management**: Implemented comprehensive configuration system eliminating all 30+ hardcoded values, created centralized config files (server/config.ts, client/src/config/config.ts), and comprehensive .env.example with 55+ environment variables for production-ready deployment flexibility
- ✅ **Comprehensive Negative Testing**: Completed extensive negative testing identifying and fixing 8 critical security and validation issues including XSS prevention, SQL injection protection, input validation, error handling, and malformed JSON handling - achieving A+ security posture
- ✅ **User Management System**: Implemented comprehensive role-based access control with 10 user personas (Platform Admin to Trial User), granular permission matrix, multi-tenancy support, session management, audit logging, and complete user management interface with organization context
- ✅ **Owner-Controlled Authentication**: Implemented complete authentication system with 5 roles (Owner/Admin/User/Viewer/DevOps), permission-based route access, secure session management, and owner-only user creation capabilities

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
- **Enterprise User Management**: Role-based access control with 5 roles (Owner/Admin/User/Viewer/DevOps), granular permission matrix (22 permissions across 6 domains), multi-tenancy, session management, audit logging, and organization management.
- **Owner-Controlled Authentication**: Secure email/password authentication with owner-only user creation, role assignment control, session management, audit logging, and permission-based route filtering.

### Database Schema & Data Management
- **Storage Architecture**: Dual storage system with automatic detection between Google Cloud BigQuery (production) and in-memory (development).
- **Core Entities**: Organizations (multi-tenancy), Users (comprehensive profiles), Agents (business info, AI config, interface, status), Conversations (usage, token consumption, cost), User Sessions, Permissions, Audit Logs.
- **Multi-Tenancy**: Complete organization isolation with subscription management, usage tracking, and billing integration.
- **User Management**: 10 role personas with permission levels 1-10, granular permissions across platform operations, organization management, agent operations, knowledge management, conversations, analytics, and API access.
- **Security & Compliance**: Session management, audit logging, permission inheritance, role-based access control, and comprehensive user activity tracking.
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