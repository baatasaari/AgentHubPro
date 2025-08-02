# AgentHub Cloud Run Microservices Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.84.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-south1"  # Mumbai region for Indian customers
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# Microservices configuration
locals {
  microservices = {
    # API Gateway (Public)
    "api-gateway" = {
      port      = 8000
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 2
      max_scale = 100
      ingress   = "all"
      public    = true
    }

    # Knowledge Management Domain
    "document-processing-service" = {
      port      = 8001
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 0
      max_scale = 20
      ingress   = "internal"
      public    = false
    }
    "embedding-generation-service" = {
      port      = 8002
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 1
      max_scale = 30
      ingress   = "internal"
      public    = false
    }
    "similarity-search-service" = {
      port      = 8010
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 25
      ingress   = "internal"
      public    = false
    }
    "knowledge-base-service" = {
      port      = 8011
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 20
      ingress   = "internal"
      public    = false
    }
    "faq-management-service" = {
      port      = 8013
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 0
      max_scale = 10
      ingress   = "internal"
      public    = false
    }
    "rag-query-service" = {
      port      = 8111
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 1
      max_scale = 50
      ingress   = "internal"
      public    = false
    }

    # Payment Processing Domain
    "payment-intent-service" = {
      port      = 8003
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 30
      ingress   = "internal"
      public    = false
    }
    "payment-link-service" = {
      port      = 8015
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 0
      max_scale = 15
      ingress   = "internal"
      public    = false
    }
    "metrics-collection-service" = {
      port      = 8023
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 1
      max_scale = 10
      ingress   = "internal"
      public    = false
    }
    "billing-calculation-service" = {
      port      = 8119
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 0
      max_scale = 20
      ingress   = "internal"
      public    = false
    }

    # Calendar & Booking Domain
    "slot-management-service" = {
      port      = 8004
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 0
      max_scale = 15
      ingress   = "internal"
      public    = false
    }
    "booking-management-service" = {
      port      = 8021
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 25
      ingress   = "internal"
      public    = false
    }
    "calendar-provider-service" = {
      port      = 8120
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 0
      max_scale = 10
      ingress   = "internal"
      public    = false
    }
    "notification-service" = {
      port      = 8005
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 1
      max_scale = 20
      ingress   = "internal"
      public    = false
    }

    # Core Business Logic Domain
    "agent-management-service" = {
      port      = 8101
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 2
      max_scale = 50
      ingress   = "internal"
      public    = false
    }
    "conversation-management-service" = {
      port      = 8102
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 2
      max_scale = 75
      ingress   = "internal"
      public    = false
    }
    "widget-generation-service" = {
      port      = 8104
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 20
      ingress   = "internal"
      public    = false
    }
    "usage-analytics-service" = {
      port      = 8103
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 30
      ingress   = "internal"
      public    = false
    }

    # Analytics & Insights Domain
    "analytics-calculation-service" = {
      port      = 8107
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 1
      max_scale = 25
      ingress   = "internal"
      public    = false
    }
    "insights-generation-service" = {
      port      = 8125
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 0
      max_scale = 20
      ingress   = "internal"
      public    = false
    }
    "data-storage-service" = {
      port      = 8128
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 15
      ingress   = "internal"
      public    = false
    }
    "system-health-service" = {
      port      = 8106
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 1
      max_scale = 5
      ingress   = "internal"
      public    = false
    }

    # Platform Infrastructure Domain
    "configuration-service" = {
      port      = 8030
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 1
      max_scale = 10
      ingress   = "internal"
      public    = false
    }
    "response-generation-service" = {
      port      = 8012
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 1
      max_scale = 40
      ingress   = "internal"
      public    = false
    }
    "service-discovery-service" = {
      port      = 8027
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 2
      max_scale = 5
      ingress   = "internal"
      public    = false
    }
    "authentication-service" = {
      port      = 8031
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 2
      max_scale = 30
      ingress   = "internal"
      public    = false
    }
    "database-operations-service" = {
      port      = 8028
      cpu       = "500m"
      memory    = "512Mi"
      min_scale = 1
      max_scale = 25
      ingress   = "internal"
      public    = false
    }
    "logging-service" = {
      port      = 8033
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 1
      max_scale = 10
      ingress   = "internal"
      public    = false
    }
    "industry-configuration-service" = {
      port      = 8105
      cpu       = "250m"
      memory    = "256Mi"
      min_scale = 0
      max_scale = 5
      ingress   = "internal"
      public    = false
    }

    # Communication & Processing
    "conversation-processing-service" = {
      port      = 8126
      cpu       = "1000m"
      memory    = "1Gi"
      min_scale = 1
      max_scale = 50
      ingress   = "internal"
      public    = false
    }
  }
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "container.googleapis.com",
    "cloudbuild.googleapis.com",
    "sql.googleapis.com",
    "redis.googleapis.com",
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "secretmanager.googleapis.com"
  ])

  service = each.key
  project = var.project_id

  disable_dependent_services = true
}

# VPC Network for internal communication
resource "google_compute_network" "microservices_network" {
  name                    = "agenthub-microservices-network"
  auto_create_subnetworks = false
  project                 = var.project_id

  depends_on = [google_project_service.required_apis]
}

resource "google_compute_subnetwork" "microservices_subnet" {
  name          = "agenthub-microservices-subnet"
  ip_cidr_range = "10.1.0.0/16"
  region        = var.region
  network       = google_compute_network.microservices_network.id
  project       = var.project_id
}

# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "microservices_connector" {
  name          = "agenthub-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.microservices_network.name
  project       = var.project_id

  depends_on = [google_project_service.required_apis]
}

# Service Account for microservices
resource "google_service_account" "microservices_sa" {
  account_id   = "agenthub-microservices-sa"
  display_name = "AgentHub Microservices Service Account"
  description  = "Service account for AgentHub microservices"
  project      = var.project_id
}

# IAM roles for service account
resource "google_project_iam_member" "microservices_permissions" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/redis.editor",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent"
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.microservices_sa.email}"
}

# Cloud Run services
resource "google_cloud_run_service" "microservices" {
  for_each = local.microservices
  
  name     = each.key
  location = var.region
  project  = var.project_id

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"                = tostring(each.value.min_scale)
        "autoscaling.knative.dev/maxScale"                = tostring(each.value.max_scale)
        "run.googleapis.com/execution-environment"        = "gen2"
        "run.googleapis.com/vpc-access-connector"         = google_vpc_access_connector.microservices_connector.name
        "run.googleapis.com/vpc-access-egress"            = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"               = "false"
      }
    }
    
    spec {
      service_account_name = google_service_account.microservices_sa.email
      
      containers {
        image = "gcr.io/${var.project_id}/${each.key}:latest"
        
        ports {
          name           = "http1"
          container_port = each.value.port
        }
        
        resources {
          limits = {
            cpu    = each.value.cpu
            memory = each.value.memory
          }
        }
        
        env {
          name  = "PORT"
          value = tostring(each.value.port)
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name  = "GCP_PROJECT"
          value = var.project_id
        }
        
        # Service discovery environment variables
        dynamic "env" {
          for_each = local.microservices
          content {
            name  = "${replace(upper(env.key), "-", "_")}_URL"
            value = "https://${env.key}-${random_id.service_suffix[env.key].hex}-${substr(var.region, 0, 2)}.a.run.app"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.required_apis,
    google_service_account.microservices_sa
  ]
}

# Random suffix for service URLs
resource "random_id" "service_suffix" {
  for_each = local.microservices
  
  byte_length = 4
  keepers = {
    service_name = each.key
  }
}

# IAM policy for internal services (no public access)
resource "google_cloud_run_service_iam_policy" "internal_services" {
  for_each = {
    for k, v in local.microservices : k => v if !v.public
  }
  
  location = google_cloud_run_service.microservices[each.key].location
  project  = google_cloud_run_service.microservices[each.key].project
  service  = google_cloud_run_service.microservices[each.key].name

  policy_data = data.google_iam_policy.internal_access.policy_data
}

# IAM policy for public services (API Gateway)
resource "google_cloud_run_service_iam_policy" "public_services" {
  for_each = {
    for k, v in local.microservices : k => v if v.public
  }
  
  location = google_cloud_run_service.microservices[each.key].location
  project  = google_cloud_run_service.microservices[each.key].project
  service  = google_cloud_run_service.microservices[each.key].name

  policy_data = data.google_iam_policy.public_access.policy_data
}

# Internal access policy (service account only)
data "google_iam_policy" "internal_access" {
  binding {
    role = "roles/run.invoker"
    members = [
      "serviceAccount:${google_service_account.microservices_sa.email}",
    ]
  }
}

# Public access policy (allow unauthenticated)
data "google_iam_policy" "public_access" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "main" {
  name             = "agenthub-postgres-${var.environment}"
  database_version = "POSTGRES_14"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-custom-2-4096"  # 2 vCPUs, 4GB RAM
    
    disk_size         = 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    
    availability_type = "REGIONAL"  # High availability
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.microservices_network.id
      require_ssl     = true
    }
    
    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true

  depends_on = [
    google_project_service.required_apis,
    google_compute_network.microservices_network
  ]
}

# Cloud SQL Database
resource "google_sql_database" "agenthub_db" {
  name     = "agenthub"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# Redis instance for caching
resource "google_redis_instance" "cache" {
  name           = "agenthub-redis-${var.environment}"
  tier           = "STANDARD_HA"
  memory_size_gb = 4
  region         = var.region
  project        = var.project_id

  authorized_network = google_compute_network.microservices_network.id
  redis_version      = "REDIS_7_0"

  depends_on = [
    google_project_service.required_apis,
    google_compute_network.microservices_network
  ]
}

# Cloud Storage buckets
resource "google_storage_bucket" "microservices_storage" {
  for_each = toset([
    "documents",
    "embeddings", 
    "uploads",
    "reports"
  ])
  
  name     = "agenthub-${each.key}-${var.environment}-${random_id.bucket_suffix.hex}"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway service"
  value       = google_cloud_run_service.microservices["api-gateway"].status[0].url
}

output "service_urls" {
  description = "URLs of all microservices"
  value = {
    for k, v in google_cloud_run_service.microservices : k => v.status[0].url
  }
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.cache.host
}

output "storage_buckets" {
  description = "Cloud Storage bucket names"
  value = {
    for k, v in google_storage_bucket.microservices_storage : k => v.name
  }
}