# BigQuery Setup Guide for Agent Wizard

This guide explains how to set up BigQuery as the persistent storage backend for the Agent Wizard microservice.

## Overview

The Agent Wizard microservice supports dual storage modes:
- **In-Memory Storage**: Development and testing (default)
- **BigQuery Storage**: Production and persistent data storage

## Automated Setup with Terraform

### Prerequisites

1. **Google Cloud CLI**: Install and authenticate
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   
   # Authenticate
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Terraform**: Install Terraform
   ```bash
   # macOS with Homebrew
   brew install terraform
   
   # Linux/Windows - Download from terraform.io
   ```

3. **Google Cloud Project**: Create or select a project
   ```bash
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

### Automated Setup

Run the setup script to provision all resources:

```bash
cd microservices/agent-wizard/terraform
./setup.sh
```

The script will:
1. Check dependencies
2. Guide you through configuration
3. Create Terraform resources
4. Generate environment configuration
5. Display completion information

### Manual Terraform Setup

If you prefer manual setup:

```bash
cd microservices/agent-wizard/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and apply
terraform init
terraform plan
terraform apply
```

## Resources Created

The Terraform configuration creates:

### 1. Service Account
- **Name**: `agent-wizard-{environment}`
- **Purpose**: BigQuery operations for the microservice
- **Permissions**: BigQuery Data Editor, Job User

### 2. BigQuery Dataset
- **Name**: `agenthub_{environment}`
- **Location**: Configurable (default: us-central1)
- **Access**: Service account has full access

### 3. BigQuery Tables

#### Agents Table
Stores agent configurations and metadata:
```sql
- id (STRING, REQUIRED): Unique agent identifier
- business_name (STRING, REQUIRED): Business name
- business_description (STRING, REQUIRED): Business description
- business_domain (STRING, REQUIRED): Website domain
- industry (STRING, REQUIRED): Industry classification
- llm_model (STRING, REQUIRED): Selected LLM model
- interface_type (STRING, REQUIRED): Interface type
- status (STRING, REQUIRED): Agent status
- system_prompt (STRING, NULLABLE): Generated system prompt
- created_at (TIMESTAMP, REQUIRED): Creation time
- updated_at (TIMESTAMP, NULLABLE): Last update time
- metadata (JSON, NULLABLE): Additional configuration
```

#### Conversations Table
Stores conversation logs and analytics:
```sql
- id (STRING, REQUIRED): Unique conversation ID
- agent_id (STRING, REQUIRED): Reference to agent
- session_id (STRING, REQUIRED): User session ID
- user_message (STRING, NULLABLE): User input
- agent_response (STRING, NULLABLE): Agent response
- tokens_used (INTEGER, NULLABLE): Token consumption
- cost (FLOAT, NULLABLE): Conversation cost
- timestamp (TIMESTAMP, REQUIRED): Message timestamp
- metadata (JSON, NULLABLE): Additional data
```

### 4. API Services
Automatically enables required Google Cloud APIs:
- BigQuery API
- Cloud Resource Manager API
- IAM API

## Configuration

### Environment Variables

After setup, configure your environment:

```bash
# Load BigQuery configuration
source .env.bigquery

# Or manually set variables
export USE_BIGQUERY=true
export GOOGLE_CLOUD_PROJECT_ID=your-project-id
export BIGQUERY_DATASET_ID=agenthub_dev
export GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-key
```

### Configuration File

The `config/bigquery.yaml` file provides comprehensive configuration:

```yaml
bigquery:
  project_id: "${GOOGLE_CLOUD_PROJECT_ID}"
  dataset_id: "${BIGQUERY_DATASET_ID:agenthub_dev}"
  location: "${BIGQUERY_LOCATION:us-central1}"
  
  # Authentication
  service_account:
    key_file: "${GOOGLE_APPLICATION_CREDENTIALS}"
    key_json: "${GOOGLE_SERVICE_ACCOUNT_KEY}"
  
  # Performance settings
  query_settings:
    timeout: 30
    max_retries: 3
    enable_logging: true
```

## Development Workflow

### Local Development

1. **Use In-Memory Storage** (default):
   ```bash
   # No BigQuery setup needed
   python main.py
   ```

2. **Test with BigQuery**:
   ```bash
   # Set environment variables
   export USE_BIGQUERY=true
   export GOOGLE_CLOUD_PROJECT_ID=your-dev-project
   
   # Start service
   python main.py
   ```

### Production Deployment

1. **Environment Configuration**:
   ```bash
   # Production environment variables
   USE_BIGQUERY=true
   GOOGLE_CLOUD_PROJECT_ID=your-prod-project
   BIGQUERY_DATASET_ID=agenthub_prod
   GOOGLE_SERVICE_ACCOUNT_KEY=<base64-encoded-key>
   ```

2. **Container Deployment**:
   ```dockerfile
   # Dockerfile already includes BigQuery dependencies
   ENV USE_BIGQUERY=true
   ENV GOOGLE_CLOUD_PROJECT_ID=your-project
   ```

## Testing BigQuery Integration

### Health Check

Test the BigQuery connection:

```bash
curl http://localhost:8001/health
```

Expected response with BigQuery:
```json
{
  "status": "healthy",
  "service": "agent-wizard",
  "storage": "bigquery",
  "bigquery": {
    "status": "healthy",
    "connection": "ok",
    "dataset": "agenthub_dev",
    "project": "your-project-id",
    "agent_count": 0
  }
}
```

### Python Testing

```python
from bigquery_client import BigQueryClient

# Test connection
client = BigQueryClient()
health = client.health_check()
print(health)

# Test table creation
client.ensure_tables_exist()
```

## Monitoring and Troubleshooting

### Common Issues

1. **Authentication Errors**:
   ```bash
   # Check authentication
   gcloud auth list
   gcloud auth application-default print-access-token
   ```

2. **Permission Errors**:
   ```bash
   # Verify service account permissions
   gcloud projects get-iam-policy your-project-id
   ```

3. **Table Not Found**:
   ```bash
   # Recreate tables
   python -c "from bigquery_client import BigQueryClient; BigQueryClient().ensure_tables_exist()"
   ```

### Logging

Enable BigQuery logging for debugging:

```python
import logging
logging.basicConfig(level=logging.INFO)
```

### Performance Monitoring

Monitor BigQuery usage:
- **Console**: https://console.cloud.google.com/bigquery
- **Cost**: Monitor in Google Cloud Console
- **Query Performance**: Enable query logging in configuration

## Security Best Practices

### Service Account Security

1. **Principle of Least Privilege**: Only grant necessary permissions
2. **Key Rotation**: Regularly rotate service account keys
3. **Environment Isolation**: Separate keys for dev/staging/prod

### Data Security

1. **Encryption**: Data encrypted at rest by default
2. **Access Control**: Dataset-level access controls
3. **Audit Logging**: Enable BigQuery audit logs
4. **Network Security**: Use VPC if required

### Configuration Security

1. **Environment Variables**: Never commit secrets to code
2. **Key Management**: Use Google Secret Manager for production
3. **Access Logging**: Monitor service account usage

## Cost Optimization

### Storage Costs

1. **Partitioning**: Tables partitioned by date for cost efficiency
2. **Clustering**: Clustered by frequently queried fields
3. **Expiration**: Automatic data expiration configured

### Query Costs

1. **Query Optimization**: Use specific field selection
2. **Caching**: Enable query result caching
3. **Monitoring**: Set up cost alerts

## Backup and Recovery

### Automatic Backups

BigQuery provides automatic backups:
- **7-day history**: Query historical data
- **Table snapshots**: Point-in-time recovery
- **Export options**: Export to Cloud Storage

### Manual Backups

```bash
# Export table to Cloud Storage
bq extract --destination_format=NEWLINE_DELIMITED_JSON \
  your-project:agenthub_prod.agents \
  gs://your-backup-bucket/agents_backup.json
```

## Migration and Scaling

### Environment Migration

```bash
# Copy data between environments
bq cp source_project:source_dataset.agents \
      target_project:target_dataset.agents
```

### Multi-Region Setup

Configure datasets in multiple regions for global deployment:

```hcl
# Terraform configuration for multiple regions
resource "google_bigquery_dataset" "agent_hub_us" {
  location = "us-central1"
}

resource "google_bigquery_dataset" "agent_hub_eu" {
  location = "europe-west1"
}
```

## Next Steps

1. **Complete Setup**: Run the automated setup script
2. **Test Connection**: Verify BigQuery integration works
3. **Deploy Service**: Deploy with BigQuery configuration
4. **Monitor Usage**: Set up monitoring and alerts
5. **Scale**: Configure for production workloads

## Support

For issues with BigQuery setup:
1. Check Google Cloud Console logs
2. Verify IAM permissions
3. Test with BigQuery CLI
4. Review Terraform state