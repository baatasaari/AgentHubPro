# BigQuery Integration Setup

Your AgentHub platform now supports BigQuery as the database backend with fully configurable settings. The system automatically detects whether to use BigQuery or memory storage based on environment variables.

## Quick Setup Methods

### Method 1: Interactive Setup Script
Run the setup script for guided configuration:

```bash
node scripts/setup-database.js
```

This script will:
- Guide you through environment selection (dev/staging/production)
- Configure all BigQuery settings interactively
- Generate a complete .env file
- Provide next steps for authentication

### Method 2: Manual Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings (see Configuration Options below)

## Configuration Options

### Core Settings (Required)
```bash
# Your Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### BigQuery Settings (Optional)
```bash
# Dataset name (default: agenthub)
BIGQUERY_DATASET=agenthub

# BigQuery location/region (default: US)
BIGQUERY_LOCATION=US

# Service account key file path (optional)
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
```

### Table Configuration (Optional)
```bash
# Custom table names for different environments
AGENTS_TABLE_NAME=agents
CONVERSATIONS_TABLE_NAME=conversations
```

### Performance Settings (Optional)
```bash
# Query timeout in milliseconds (default: 30000)
BIGQUERY_TIMEOUT=30000

# Number of retries for failed queries (default: 3)
BIGQUERY_RETRIES=3
```

### Development Settings (Optional)
```bash
# Enable sample data insertion (default: true)
ENABLE_SAMPLE_DATA=true

# Log all BigQuery queries for debugging (default: false)
LOG_BIGQUERY_QUERIES=false
```

## Environment-Specific Examples

### Development Environment
```bash
GOOGLE_CLOUD_PROJECT_ID=my-dev-project
BIGQUERY_DATASET=agenthub_dev
ENABLE_SAMPLE_DATA=true
LOG_BIGQUERY_QUERIES=true
```

### Staging Environment
```bash
GOOGLE_CLOUD_PROJECT_ID=my-staging-project
BIGQUERY_DATASET=agenthub_staging
AGENTS_TABLE_NAME=agents_staging
CONVERSATIONS_TABLE_NAME=conversations_staging
ENABLE_SAMPLE_DATA=false
```

### Production Environment
```bash
GOOGLE_CLOUD_PROJECT_ID=my-production-project
BIGQUERY_DATASET=agenthub_prod
BIGQUERY_LOCATION=US
ENABLE_SAMPLE_DATA=false
LOG_BIGQUERY_QUERIES=false
BIGQUERY_TIMEOUT=60000
BIGQUERY_RETRIES=5
```

## Google Cloud Setup

### 1. Create Google Cloud Project
1. Visit https://console.cloud.google.com
2. Create a new project or select existing one
3. Enable the BigQuery API
4. Note your Project ID

### 2. Authentication Options

**Option A: Service Account Key (Recommended for production)**
1. Go to IAM & Admin > Service Accounts
2. Create a service account with BigQuery permissions:
   - BigQuery Data Editor
   - BigQuery Job User
3. Download JSON key file
4. Set `GOOGLE_CLOUD_KEY_FILE` path in your .env

**Option B: Application Default Credentials (For development)**
1. Install Google Cloud CLI
2. Run: `gcloud auth login`
3. Run: `gcloud auth application-default login`

## How It Works

- **Configuration Detection**: System uses BigQuery when `GOOGLE_CLOUD_PROJECT_ID` is set
- **Automatic Fallback**: Uses in-memory storage when BigQuery isn't configured
- **Environment Validation**: Validates all settings before initialization
- **Error Handling**: Clear error messages for configuration issues

## Automatic Features

The BigQuery integration automatically:
- Creates datasets and tables with proper schemas
- Handles table location settings
- Inserts sample data (if enabled)
- Logs queries (if enabled for debugging)
- Validates configuration on startup
- Maintains identical API interface

## Tables Structure

1. **agents**: ID, business details, industry, AI model, interface type, status, timestamps
2. **conversations**: ID, agent reference, token usage, cost tracking, timestamps

## Security Features

- Parameterized SQL queries prevent injection attacks
- Configurable timeouts and retry logic
- Optional query logging for security auditing
- Service account authentication for production

No code changes are needed - the platform automatically switches between storage backends based on your configuration.