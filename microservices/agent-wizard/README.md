# Agent Wizard Microservice

A comprehensive FastAPI-based microservice for creating, managing, and deploying industry-specific AI chatbot agents with BigQuery storage support and YAML configuration management.

## Features

### 🤖 Agent Management
- Complete CRUD operations for AI agents
- Industry-specific system prompt generation
- LLM model selection and validation
- Interface type configuration (webchat, whatsapp)
- Status management (draft, active, paused)

### 🏗️ Storage Options
- **Dual Storage System**: BigQuery for production, in-memory for development
- **Automatic Detection**: Seamlessly switches based on environment variables
- **Terraform Provisioning**: Complete infrastructure setup automation
- **Data Persistence**: Reliable agent and conversation storage

### 📝 YAML Configuration
- **Industry Prompts**: 12 comprehensive industry-specific system prompts
- **Dynamic Loading**: Real-time configuration updates without restart
- **Template System**: Customizable prompts with business name placeholders
- **Metadata Management**: Icon, name, and configuration per industry

### 🔧 API Features
- **OpenAPI Documentation**: Complete API specs at `/docs`
- **Health Checks**: Service and storage health monitoring
- **Validation**: Comprehensive business logic enforcement
- **Error Handling**: Detailed error responses and logging

## Quick Start

### Development (In-Memory Storage)

```bash
# Install dependencies
pip install -r requirements.txt

# Start service
python main.py

# Service available at http://localhost:8001
# API docs at http://localhost:8001/docs
```

### Production (BigQuery Storage)

```bash
# 1. Set up BigQuery infrastructure
cd terraform
./setup.sh

# 2. Configure environment
source .env.bigquery

# 3. Start service with BigQuery
python main.py
```

## Configuration

### Environment Variables

```bash
# Storage Configuration
USE_BIGQUERY=true                          # Enable BigQuery storage
GOOGLE_CLOUD_PROJECT_ID=your-project       # GCP Project ID
BIGQUERY_DATASET_ID=agenthub_prod          # Dataset name

# Authentication
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json  # Service account key
# OR
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-key     # Base64 encoded key

# Performance Settings
BIGQUERY_QUERY_TIMEOUT=30                  # Query timeout (seconds)
BIGQUERY_MAX_RETRIES=3                     # Retry attempts
BIGQUERY_ENABLE_LOGGING=true               # Enable query logging
```

### YAML Configuration

The service uses `config/industry_prompts.yaml` for industry-specific system prompts:

```yaml
industries:
  healthcare:
    name: "Healthcare & Medical"
    icon: "stethoscope"
    system_prompt: |
      You are a professional healthcare assistant for {business_name}...
```

## API Endpoints

### Core Endpoints

- `GET /health` - Service health check with storage status
- `GET /api/industries` - List available industries
- `GET /api/models` - List available LLM models
- `GET /api/interfaces` - List interface types

### Agent Management

- `POST /api/agents` - Create new agent
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Get specific agent
- `PATCH /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent
- `PATCH /api/agents/{id}/status` - Update agent status

### System Prompts

- `POST /api/agents/{id}/system-prompt` - Generate system prompt
- `POST /api/runtime/chat/{id}` - Get runtime chat prompt
- `GET /api/config/industries/{industry}` - Get industry configuration
- `GET /api/config/reload` - Reload YAML configuration

### Validation

- `POST /api/agents/{id}/validate-deployment` - Validate deployment readiness

## Infrastructure Setup

### Automated Terraform Setup

```bash
cd terraform
./setup.sh
```

This creates:
- BigQuery dataset and tables
- Service account with proper permissions
- Required API enablements
- Environment configuration

### Manual Terraform Setup

```bash
# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
edit terraform.tfvars

# Apply infrastructure
terraform init
terraform plan
terraform apply
```

## Storage Architecture

### BigQuery Schema

#### Agents Table
```sql
CREATE TABLE agents (
  id STRING NOT NULL,
  business_name STRING NOT NULL,
  business_description STRING NOT NULL,
  business_domain STRING NOT NULL,
  industry STRING NOT NULL,
  llm_model STRING NOT NULL,
  interface_type STRING NOT NULL,
  status STRING NOT NULL,
  system_prompt STRING,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  metadata JSON
)
PARTITION BY DATE(created_at)
CLUSTER BY industry, status;
```

#### Conversations Table
```sql
CREATE TABLE conversations (
  id STRING NOT NULL,
  agent_id STRING NOT NULL,
  session_id STRING NOT NULL,
  user_message STRING,
  agent_response STRING,
  tokens_used INTEGER,
  cost FLOAT,
  timestamp TIMESTAMP NOT NULL,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id, timestamp;
```

## Industry Support

The service supports 12 industries with specialized system prompts:

1. **Healthcare & Medical** - Patient care and appointments
2. **Retail & E-commerce** - Customer service and sales
3. **Finance & Banking** - Account management and financial guidance
4. **Real Estate** - Property services and market insights
5. **Technology & Software** - Technical support and troubleshooting
6. **Education & Training** - Student support and learning facilitation
7. **Hospitality & Travel** - Guest services and travel planning
8. **Legal Services** - Client services and legal information
9. **Automotive** - Vehicle services and sales support
10. **Consulting & Professional** - Business intelligence and strategy
11. **Fitness & Wellness** - Health coaching and membership services
12. **Food & Beverage** - Dining services and culinary expertise

## Development

### Project Structure

```
agent-wizard/
├── main.py                 # FastAPI application
├── bigquery_client.py      # BigQuery integration
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── config/
│   ├── bigquery.yaml      # BigQuery configuration
│   └── industry_prompts.yaml # Industry prompts
├── terraform/             # Infrastructure as code
│   ├── main.tf           # Terraform configuration
│   ├── setup.sh          # Automated setup script
│   └── terraform.tfvars.example
├── docs/                  # Documentation
│   ├── BIGQUERY_SETUP.md # BigQuery setup guide
│   └── YAML_CONFIGURATION.md
└── .env.example          # Environment template
```

### Adding New Industries

1. Add industry configuration to `config/industry_prompts.yaml`:
```yaml
new_industry:
  name: "Industry Display Name"
  icon: "icon-name"
  system_prompt: |
    Your comprehensive system prompt here...
```

2. Restart service or call `/api/config/reload` endpoint

### Testing

```bash
# Run health check
curl http://localhost:8001/health

# Test agent creation
curl -X POST http://localhost:8001/api/agents \
  -H "Content-Type: application/json" \
  -d '{"business_name": "Test", ...}'

# Test BigQuery connection (when enabled)
python -c "from bigquery_client import BigQueryClient; print(BigQueryClient().health_check())"
```

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t agent-wizard .

# Run with environment variables
docker run -p 8001:8001 \
  -e USE_BIGQUERY=true \
  -e GOOGLE_CLOUD_PROJECT_ID=your-project \
  -e GOOGLE_SERVICE_ACCOUNT_KEY=your-key \
  agent-wizard
```

### Docker Compose

```yaml
version: '3.8'
services:
  agent-wizard:
    build: .
    ports:
      - "8001:8001"
    environment:
      USE_BIGQUERY: "true"
      GOOGLE_CLOUD_PROJECT_ID: "your-project"
    env_file:
      - .env.bigquery
```

## Monitoring

### Health Checks

The service provides comprehensive health monitoring:

```json
{
  "status": "healthy",
  "service": "agent-wizard",
  "version": "1.0.0",
  "storage": "bigquery",
  "timestamp": "2025-07-28T19:00:00Z",
  "bigquery": {
    "status": "healthy",
    "connection": "ok",
    "dataset": "agenthub_prod",
    "project": "your-project-id",
    "agent_count": 42
  }
}
```

### Logging

Enable detailed logging for development:

```python
import logging
logging.basicConfig(level=logging.INFO)
```

## Security

### Authentication
- Service account-based authentication for BigQuery
- Environment variable-based secret management
- Base64 encoded keys for containerized deployments

### Data Security
- Encrypted data at rest (BigQuery default)
- Parameterized SQL queries to prevent injection
- Audit logging for production environments

### Access Control
- Dataset-level permissions
- Service account with minimal required permissions
- Environment-based access isolation

## Performance

### Optimizations
- Table partitioning by date for efficient queries
- Clustering on frequently queried fields
- Query result caching
- Connection pooling

### Monitoring
- Query performance tracking
- Cost monitoring and alerts
- Resource usage metrics

## Troubleshooting

### Common Issues

1. **BigQuery Connection Errors**
   ```bash
   # Check authentication
   gcloud auth application-default print-access-token
   
   # Verify service account permissions
   gcloud projects get-iam-policy your-project-id
   ```

2. **Missing Tables**
   ```python
   from bigquery_client import BigQueryClient
   client = BigQueryClient()
   client.ensure_tables_exist()
   ```

3. **Configuration Issues**
   ```bash
   # Test configuration loading
   python -c "import yaml; print(yaml.safe_load(open('config/bigquery.yaml')))"
   ```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## License

This project is part of the AgentHub platform. See the main repository for license information.

## Support

For support and questions:
- Check the documentation in `/docs`
- Review GitHub issues
- Contact the development team