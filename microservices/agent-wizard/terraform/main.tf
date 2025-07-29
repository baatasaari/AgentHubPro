# Agent Wizard Microservice - Google Cloud Infrastructure
# Terraform configuration for BigQuery, Service Account, and API setup

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "service_name" {
  description = "Service name for resource naming"
  type        = string
  default     = "agent-wizard"
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "bigquery_api" {
  project = var.project_id
  service = "bigquery.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

resource "google_project_service" "cloud_resource_manager_api" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

resource "google_project_service" "iam_api" {
  project = var.project_id
  service = "iam.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

# Vertex AI and AI Platform APIs
resource "google_project_service" "vertex_ai_api" {
  project = var.project_id
  service = "aiplatform.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

resource "google_project_service" "ml_api" {
  project = var.project_id
  service = "ml.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

resource "google_project_service" "generative_ai_api" {
  project = var.project_id
  service = "generativelanguage.googleapis.com"
  
  disable_dependent_services = true
  disable_on_destroy         = false
}

# Service Account for Agent Wizard
resource "google_service_account" "agent_wizard_sa" {
  account_id   = "${var.service_name}-${var.environment}"
  display_name = "Agent Wizard Service Account (${var.environment})"
  description  = "Service account for Agent Wizard microservice BigQuery operations"
  project      = var.project_id
  
  depends_on = [google_project_service.iam_api]
}

# Service Account Key
resource "google_service_account_key" "agent_wizard_key" {
  service_account_id = google_service_account.agent_wizard_sa.name
  public_key_type    = "TYPE_X509_PEM_FILE"
}

# BigQuery Dataset
resource "google_bigquery_dataset" "agent_hub_dataset" {
  dataset_id    = "agenthub_${var.environment}"
  friendly_name = "AgentHub ${title(var.environment)} Dataset"
  description   = "Dataset for AgentHub ${var.environment} environment data"
  location      = var.region
  project       = var.project_id

  # Access control
  access {
    role          = "OWNER"
    user_by_email = google_service_account.agent_wizard_sa.email
  }

  access {
    role           = "READER"
    special_group  = "projectReaders"
  }

  access {
    role           = "WRITER"
    special_group  = "projectWriters"
  }

  # Data retention and lifecycle
  default_table_expiration_ms = 365 * 24 * 60 * 60 * 1000 # 1 year
  
  labels = {
    environment = var.environment
    service     = var.service_name
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.bigquery_api]
}

# BigQuery Table - Agents
resource "google_bigquery_table" "agents_table" {
  dataset_id = google_bigquery_dataset.agent_hub_dataset.dataset_id
  table_id   = "agents"
  project    = var.project_id

  description = "Table storing agent configurations and metadata"

  schema = jsonencode([
    {
      name = "id"
      type = "STRING"
      mode = "REQUIRED"
      description = "Unique agent identifier"
    },
    {
      name = "business_name"
      type = "STRING"
      mode = "REQUIRED"
      description = "Business or organization name"
    },
    {
      name = "business_description"
      type = "STRING"
      mode = "REQUIRED"
      description = "Business description and purpose"
    },
    {
      name = "business_domain"
      type = "STRING"
      mode = "REQUIRED"
      description = "Business website domain"
    },
    {
      name = "industry"
      type = "STRING"
      mode = "REQUIRED"
      description = "Industry classification"
    },
    {
      name = "llm_model"
      type = "STRING"
      mode = "REQUIRED"
      description = "Selected LLM model"
    },
    {
      name = "interface_type"
      type = "STRING"
      mode = "REQUIRED"
      description = "Interface type (webchat, whatsapp)"
    },
    {
      name = "status"
      type = "STRING"
      mode = "REQUIRED"
      description = "Agent status (draft, active, paused)"
    },
    {
      name = "system_prompt"
      type = "STRING"
      mode = "NULLABLE"
      description = "Generated system prompt"
    },
    {
      name = "created_at"
      type = "TIMESTAMP"
      mode = "REQUIRED"
      description = "Creation timestamp"
    },
    {
      name = "updated_at"
      type = "TIMESTAMP"
      mode = "NULLABLE"
      description = "Last update timestamp"
    },
    {
      name = "metadata"
      type = "JSON"
      mode = "NULLABLE"
      description = "Additional agent metadata and configuration"
    }
  ])

  labels = {
    environment = var.environment
    service     = var.service_name
    table_type  = "agents"
  }
}

# BigQuery Table - Agent Conversations
resource "google_bigquery_table" "conversations_table" {
  dataset_id = google_bigquery_dataset.agent_hub_dataset.dataset_id
  table_id   = "conversations"
  project    = var.project_id

  description = "Table storing agent conversation logs and analytics"

  schema = jsonencode([
    {
      name = "id"
      type = "STRING"
      mode = "REQUIRED"
      description = "Unique conversation identifier"
    },
    {
      name = "agent_id"
      type = "STRING"
      mode = "REQUIRED"
      description = "Reference to agent ID"
    },
    {
      name = "session_id"
      type = "STRING"
      mode = "REQUIRED"
      description = "User session identifier"
    },
    {
      name = "user_message"
      type = "STRING"
      mode = "NULLABLE"
      description = "User input message"
    },
    {
      name = "agent_response"
      type = "STRING"
      mode = "NULLABLE"
      description = "Agent response message"
    },
    {
      name = "tokens_used"
      type = "INTEGER"
      mode = "NULLABLE"
      description = "Number of tokens consumed"
    },
    {
      name = "cost"
      type = "FLOAT"
      mode = "NULLABLE"
      description = "Cost of the conversation"
    },
    {
      name = "timestamp"
      type = "TIMESTAMP"
      mode = "REQUIRED"
      description = "Conversation timestamp"
    },
    {
      name = "metadata"
      type = "JSON"
      mode = "NULLABLE"
      description = "Additional conversation metadata"
    }
  ])

  labels = {
    environment = var.environment
    service     = var.service_name
    table_type  = "conversations"
  }
}

# IAM Binding for BigQuery
resource "google_project_iam_member" "bigquery_data_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

resource "google_project_iam_member" "bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

# IAM Bindings for Vertex AI and AI Services
resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

resource "google_project_iam_member" "vertex_ai_prediction_service" {
  project = var.project_id
  role    = "roles/aiplatform.predictionServiceAgent"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

resource "google_project_iam_member" "ml_developer" {
  project = var.project_id
  role    = "roles/ml.developer"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

resource "google_project_iam_member" "generative_ai_editor" {
  project = var.project_id
  role    = "roles/generativelanguage.editor"
  member  = "serviceAccount:${google_service_account.agent_wizard_sa.email}"
}

# Outputs
output "project_id" {
  description = "Google Cloud Project ID"
  value       = var.project_id
}

output "dataset_id" {
  description = "BigQuery Dataset ID"
  value       = google_bigquery_dataset.agent_hub_dataset.dataset_id
}

output "service_account_email" {
  description = "Service Account Email"
  value       = google_service_account.agent_wizard_sa.email
}

output "service_account_key" {
  description = "Service Account Key (base64 encoded)"
  value       = google_service_account_key.agent_wizard_key.private_key
  sensitive   = true
}

output "agents_table_id" {
  description = "Agents Table ID"
  value       = google_bigquery_table.agents_table.table_id
}

output "conversations_table_id" {
  description = "Conversations Table ID"
  value       = google_bigquery_table.conversations_table.table_id
}

output "bigquery_dataset_url" {
  description = "BigQuery Dataset URL"
  value       = "https://console.cloud.google.com/bigquery?project=${var.project_id}&ws=!1m4!1m3!3m2!1s${var.project_id}!2s${google_bigquery_dataset.agent_hub_dataset.dataset_id}"
}