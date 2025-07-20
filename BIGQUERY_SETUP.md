# BigQuery Integration Setup

Your AgentHub platform now supports BigQuery as the database backend. The system automatically detects whether to use BigQuery or memory storage based on environment variables.

## Quick Setup

### 1. Google Cloud Project Setup
1. Create a Google Cloud Project at https://console.cloud.google.com
2. Enable the BigQuery API for your project
3. Create a service account with BigQuery permissions

### 2. Environment Variables
Add these environment variables to enable BigQuery:

```bash
# Required: Your Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Optional: Dataset name (defaults to 'agenthub')
BIGQUERY_DATASET=agenthub

# Optional: Path to service account key file
# If not provided, uses Application Default Credentials
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
```

### 3. Authentication Options

**Option A: Service Account Key File**
1. Download service account JSON key from Google Cloud Console
2. Set `GOOGLE_CLOUD_KEY_FILE` to the file path

**Option B: Application Default Credentials**
1. Install Google Cloud CLI: `gcloud auth login`
2. Set application default credentials: `gcloud auth application-default login`

## How It Works

- **With BigQuery**: When `GOOGLE_CLOUD_PROJECT_ID` is set, the system uses BigQuery
- **Without BigQuery**: Falls back to in-memory storage for development

## Automatic Setup

The BigQuery integration automatically:
- Creates the dataset if it doesn't exist
- Creates tables with proper schemas
- Inserts sample data for demonstration
- Maintains the same API interface as memory storage

## Tables Created

1. **agents**: Stores business agent configurations
2. **conversations**: Tracks usage metrics and costs

No code changes are needed - the platform automatically switches between storage backends based on your environment configuration.