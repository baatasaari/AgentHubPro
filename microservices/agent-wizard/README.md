# Agent Wizard Microservice

Independent FastAPI-based microservice for AI agent creation and management.

## Features

- **Agent Creation**: Create AI agents with industry specialization
- **Validation**: Comprehensive input validation and business rule enforcement
- **Model Management**: Support for multiple LLM providers (OpenAI, Anthropic, Google)
- **Interface Types**: Web chat and WhatsApp integration support
- **Status Management**: Draft, active, and paused states
- **System Prompts**: Auto-generated industry-specific prompts
- **Deployment Validation**: Check agent readiness for deployment

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Configuration
- `GET /api/industries` - Available industry options
- `GET /api/models` - Available LLM models with pricing
- `GET /api/interfaces` - Available interface types

### Agent Management
- `POST /api/agents` - Create new agent
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Get specific agent
- `PATCH /api/agents/{id}` - Update agent
- `PATCH /api/agents/{id}/status` - Update agent status
- `DELETE /api/agents/{id}` - Delete agent

### Agent Operations
- `POST /api/agents/{id}/system-prompt` - Generate system prompt
- `POST /api/agents/{id}/validate-deployment` - Validate deployment readiness

## Installation

### Local Development
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Docker
```bash
docker build -t agent-wizard-service .
docker run -p 8001:8001 agent-wizard-service
```

## Configuration

Copy `.env.example` to `.env` and configure:
- Database credentials
- External API keys
- Security settings
- CORS origins

## Validation Rules

### Business Name
- Minimum 2 characters
- Maximum 100 characters
- Required field

### Description
- Minimum 10 characters
- Maximum 500 characters
- Required field

### Domain
- Must include protocol (http:// or https://)
- Valid URL format

### Model Compatibility
- WhatsApp: Limited to specific models for reliability
- WebChat: Supports all available models

## Industry Specialization

Supports 12 industries with specialized system prompts:
- Healthcare & Medical
- Retail & E-commerce
- Finance & Banking
- Real Estate
- Education & Training
- Hospitality & Travel
- Legal Services
- Automotive
- Technology & Software
- Consulting & Professional
- Fitness & Wellness
- Food & Beverage

## Development

### Testing
```bash
# Run tests (when available)
pytest

# Manual API testing
curl http://localhost:8001/health
```

### API Documentation
Visit `http://localhost:8001/docs` for interactive API documentation.

## Production Deployment

1. Configure environment variables
2. Set up database (PostgreSQL recommended)
3. Configure Redis for caching
4. Deploy using Docker or container orchestration
5. Set up monitoring and logging

## Security Features

- Input validation and sanitization
- Business rule enforcement
- Model compatibility validation
- Status-based access control
- CORS configuration