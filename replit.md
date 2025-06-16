# AgentHub - AI Assistant Platform

## Overview

AgentHub is a modern web application that allows users to create, manage, and deploy AI-powered chat agents for businesses. The platform provides a complete solution for building custom AI assistants with different interface types (webchat, WhatsApp) and supports various industries and LLM models.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API**: RESTful API with typed endpoints
- **Development**: TSX for TypeScript execution

### Build System
- **Development**: Vite dev server with HMR
- **Production**: Vite build + esbuild for server bundling
- **Deployment**: Autoscale deployment on Replit

## Key Components

### Database Schema
The application uses two main entities:
- **Agents**: Store business information, AI model configuration, and interface settings
- **Conversations**: Track usage metrics including tokens and costs per agent

### UI Components
- Comprehensive component library with consistent design system
- Form components with validation and error handling
- Data visualization components for usage statistics
- Interactive chat widget for agent preview

### Core Features
1. **Agent Creation**: Multi-step form for configuring AI agents
2. **Agent Management**: CRUD operations with status management (draft/active/paused)
3. **Usage Tracking**: Monitor conversations, tokens, and costs
4. **Code Generation**: Generate embed codes for integrating agents
5. **Industry Templates**: Predefined configurations for different business types

## Data Flow

1. **Agent Creation**: User fills form → Validation → API call → Database storage
2. **Agent Management**: Frontend queries → Express API → Drizzle ORM → PostgreSQL
3. **Usage Analytics**: Conversation data aggregation → Statistics calculation → Dashboard display
4. **Real-time Updates**: TanStack Query handles cache invalidation and refetching

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Framework**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type checking
- **Date Handling**: date-fns for date manipulation

### Development Tools
- **TypeScript**: Static type checking
- **ESLint/Prettier**: Code formatting and linting
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development Environment
- Replit development environment with hot reload
- PostgreSQL module integrated
- Environment variables for database connection

### Production Build
- Vite builds client-side assets to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static file serving for production assets

### Database Management
- Drizzle migrations stored in `./migrations`
- Schema definitions in `shared/schema.ts`
- Database URL configuration via environment variables

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 16, 2025. Initial setup