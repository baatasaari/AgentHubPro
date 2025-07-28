"""
BigQuery Client for Agent Wizard Microservice
Handles all BigQuery operations with configuration management
"""

import os
import json
import base64
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import yaml
from google.cloud import bigquery
from google.oauth2 import service_account
from google.api_core import exceptions
import logging

logger = logging.getLogger(__name__)

class BigQueryClient:
    """BigQuery client with configuration management for Agent Wizard"""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize BigQuery client with configuration"""
        self.config = self._load_config(config_path)
        self.client = self._create_client()
        self.dataset_id = self.config['bigquery']['dataset_id']
        self.project_id = self.config['bigquery']['project_id']
        self.tables = self.config['bigquery']['tables']
        
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load BigQuery configuration from YAML file"""
        if config_path is None:
            config_path = Path(__file__).parent / "config" / "bigquery.yaml"
        
        try:
            with open(config_path, 'r', encoding='utf-8') as file:
                config_content = file.read()
                
            # Replace environment variables in config
            for env_var in os.environ:
                config_content = config_content.replace(f"${{{env_var}}}", os.environ[env_var])
                # Handle default values like ${VAR:default}
                import re
                pattern = r'\$\{([^:}]+):([^}]+)\}'
                def replace_with_default(match):
                    var_name, default_value = match.groups()
                    return os.environ.get(var_name, default_value)
                config_content = re.sub(pattern, replace_with_default, config_content)
            
            return yaml.safe_load(config_content)
        except FileNotFoundError:
            logger.error(f"BigQuery config file not found: {config_path}")
            return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading BigQuery config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for fallback"""
        return {
            'bigquery': {
                'project_id': os.environ.get('GOOGLE_CLOUD_PROJECT_ID', ''),
                'dataset_id': os.environ.get('BIGQUERY_DATASET_ID', 'agenthub_dev'),
                'location': os.environ.get('BIGQUERY_LOCATION', 'us-central1'),
                'tables': {
                    'agents': 'agents',
                    'conversations': 'conversations'
                },
                'service_account': {
                    'key_file': os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''),
                    'key_json': os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY', '')
                },
                'query_settings': {
                    'timeout': 30,
                    'max_retries': 3,
                    'retry_delay': 1,
                    'enable_logging': True
                }
            }
        }
    
    def _create_client(self) -> bigquery.Client:
        """Create BigQuery client with authentication"""
        try:
            # Try service account key file first
            key_file = self.config['bigquery']['service_account'].get('key_file')
            if key_file and os.path.exists(key_file):
                credentials = service_account.Credentials.from_service_account_file(key_file)
                return bigquery.Client(
                    project=self.project_id,
                    credentials=credentials,
                    location=self.config['bigquery']['location']
                )
            
            # Try base64 encoded key
            key_json = self.config['bigquery']['service_account'].get('key_json')
            if key_json:
                # Decode base64 if needed
                try:
                    decoded_key = base64.b64decode(key_json).decode('utf-8')
                    key_data = json.loads(decoded_key)
                except Exception:
                    # Assume it's already JSON
                    key_data = json.loads(key_json)
                
                credentials = service_account.Credentials.from_service_account_info(key_data)
                return bigquery.Client(
                    project=self.project_id,
                    credentials=credentials,
                    location=self.config['bigquery']['location']
                )
            
            # Fall back to default authentication
            return bigquery.Client(project=self.project_id)
            
        except Exception as e:
            logger.error(f"Failed to create BigQuery client: {e}")
            raise
    
    def ensure_dataset_exists(self) -> bool:
        """Ensure the dataset exists, create if it doesn't"""
        try:
            dataset_ref = self.client.dataset(self.dataset_id)
            
            try:
                self.client.get_dataset(dataset_ref)
                logger.info(f"Dataset {self.dataset_id} already exists")
                return True
            except exceptions.NotFound:
                # Create dataset
                dataset = bigquery.Dataset(dataset_ref)
                dataset.location = self.config['bigquery']['location']
                dataset.description = f"AgentHub microservice data for {self.dataset_id}"
                
                dataset = self.client.create_dataset(dataset)
                logger.info(f"Created dataset {self.dataset_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error ensuring dataset exists: {e}")
            return False
    
    def ensure_tables_exist(self) -> bool:
        """Ensure all required tables exist"""
        try:
            self.ensure_dataset_exists()
            
            # Agents table
            agents_table_ref = self.client.dataset(self.dataset_id).table(self.tables['agents'])
            if not self._table_exists(agents_table_ref):
                self._create_agents_table(agents_table_ref)
            
            # Conversations table
            conversations_table_ref = self.client.dataset(self.dataset_id).table(self.tables['conversations'])
            if not self._table_exists(conversations_table_ref):
                self._create_conversations_table(conversations_table_ref)
            
            return True
            
        except Exception as e:
            logger.error(f"Error ensuring tables exist: {e}")
            return False
    
    def _table_exists(self, table_ref) -> bool:
        """Check if table exists"""
        try:
            self.client.get_table(table_ref)
            return True
        except exceptions.NotFound:
            return False
    
    def _create_agents_table(self, table_ref):
        """Create agents table with schema"""
        schema = [
            bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("business_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("business_description", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("business_domain", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("industry", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("llm_model", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("interface_type", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("status", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("system_prompt", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE"),
            bigquery.SchemaField("metadata", "JSON", mode="NULLABLE"),
        ]
        
        table = bigquery.Table(table_ref, schema=schema)
        table.description = "Agent configurations and metadata"
        
        # Configure partitioning and clustering
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field="created_at"
        )
        table.clustering_fields = ["industry", "status"]
        
        table = self.client.create_table(table)
        logger.info(f"Created agents table: {table.table_id}")
    
    def _create_conversations_table(self, table_ref):
        """Create conversations table with schema"""
        schema = [
            bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("agent_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("session_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("user_message", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("agent_response", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("tokens_used", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("cost", "FLOAT", mode="NULLABLE"),
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("metadata", "JSON", mode="NULLABLE"),
        ]
        
        table = bigquery.Table(table_ref, schema=schema)
        table.description = "Agent conversation logs and analytics"
        
        # Configure partitioning and clustering
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field="timestamp"
        )
        table.clustering_fields = ["agent_id", "timestamp"]
        
        table = self.client.create_table(table)
        logger.info(f"Created conversations table: {table.table_id}")
    
    def insert_agent(self, agent_data: Dict[str, Any]) -> bool:
        """Insert agent into BigQuery"""
        try:
            table_ref = self.client.dataset(self.dataset_id).table(self.tables['agents'])
            table = self.client.get_table(table_ref)
            
            # Prepare data for insertion
            rows_to_insert = [{
                "id": agent_data["id"],
                "business_name": agent_data["business_name"],
                "business_description": agent_data["business_description"],
                "business_domain": agent_data["business_domain"],
                "industry": agent_data["industry"],
                "llm_model": agent_data["llm_model"],
                "interface_type": agent_data["interface_type"],
                "status": agent_data["status"],
                "system_prompt": agent_data.get("system_prompt"),
                "created_at": agent_data["created_at"].isoformat() if isinstance(agent_data["created_at"], datetime) else agent_data["created_at"],
                "updated_at": agent_data.get("updated_at").isoformat() if agent_data.get("updated_at") and isinstance(agent_data["updated_at"], datetime) else agent_data.get("updated_at"),
                "metadata": json.dumps(agent_data.get("metadata", {}))
            }]
            
            errors = self.client.insert_rows_json(table, rows_to_insert)
            if errors:
                logger.error(f"Error inserting agent: {errors}")
                return False
            
            logger.info(f"Inserted agent {agent_data['id']} into BigQuery")
            return True
            
        except Exception as e:
            logger.error(f"Failed to insert agent: {e}")
            return False
    
    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent by ID from BigQuery"""
        try:
            query = f"""
            SELECT * FROM `{self.project_id}.{self.dataset_id}.{self.tables['agents']}`
            WHERE id = @agent_id
            LIMIT 1
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id)
                ]
            )
            
            result = self.client.query(query, job_config=job_config)
            rows = list(result)
            
            if rows:
                row = rows[0]
                return {
                    "id": row.id,
                    "business_name": row.business_name,
                    "business_description": row.business_description,
                    "business_domain": row.business_domain,
                    "industry": row.industry,
                    "llm_model": row.llm_model,
                    "interface_type": row.interface_type,
                    "status": row.status,
                    "system_prompt": row.system_prompt,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                    "metadata": json.loads(row.metadata) if row.metadata else {}
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get agent {agent_id}: {e}")
            return None
    
    def get_all_agents(self) -> List[Dict[str, Any]]:
        """Get all agents from BigQuery"""
        try:
            query = f"""
            SELECT * FROM `{self.project_id}.{self.dataset_id}.{self.tables['agents']}`
            ORDER BY created_at DESC
            """
            
            result = self.client.query(query)
            agents = []
            
            for row in result:
                agents.append({
                    "id": row.id,
                    "business_name": row.business_name,
                    "business_description": row.business_description,
                    "business_domain": row.business_domain,
                    "industry": row.industry,
                    "llm_model": row.llm_model,
                    "interface_type": row.interface_type,
                    "status": row.status,
                    "system_prompt": row.system_prompt,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                    "metadata": json.loads(row.metadata) if row.metadata else {}
                })
            
            return agents
            
        except Exception as e:
            logger.error(f"Failed to get all agents: {e}")
            return []
    
    def update_agent(self, agent_id: str, update_data: Dict[str, Any]) -> bool:
        """Update agent in BigQuery"""
        try:
            # Build UPDATE query dynamically
            set_clauses = []
            query_params = [bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id)]
            
            for field, value in update_data.items():
                if field != "id":  # Don't update ID
                    set_clauses.append(f"{field} = @{field}")
                    
                    if field in ["created_at", "updated_at"] and isinstance(value, datetime):
                        value = value.isoformat()
                    elif field == "metadata":
                        value = json.dumps(value)
                    
                    query_params.append(bigquery.ScalarQueryParameter(field, "STRING", str(value)))
            
            if not set_clauses:
                return True
            
            query = f"""
            UPDATE `{self.project_id}.{self.dataset_id}.{self.tables['agents']}`
            SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP()
            WHERE id = @agent_id
            """
            
            job_config = bigquery.QueryJobConfig(query_parameters=query_params)
            self.client.query(query, job_config=job_config)
            
            logger.info(f"Updated agent {agent_id} in BigQuery")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update agent {agent_id}: {e}")
            return False
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete agent from BigQuery"""
        try:
            query = f"""
            DELETE FROM `{self.project_id}.{self.dataset_id}.{self.tables['agents']}`
            WHERE id = @agent_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id)
                ]
            )
            
            self.client.query(query, job_config=job_config)
            logger.info(f"Deleted agent {agent_id} from BigQuery")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete agent {agent_id}: {e}")
            return False
    
    def insert_conversation(self, conversation_data: Dict[str, Any]) -> bool:
        """Insert conversation into BigQuery"""
        try:
            table_ref = self.client.dataset(self.dataset_id).table(self.tables['conversations'])
            table = self.client.get_table(table_ref)
            
            rows_to_insert = [{
                "id": conversation_data["id"],
                "agent_id": conversation_data["agent_id"],
                "session_id": conversation_data["session_id"],
                "user_message": conversation_data.get("user_message"),
                "agent_response": conversation_data.get("agent_response"),
                "tokens_used": conversation_data.get("tokens_used"),
                "cost": conversation_data.get("cost"),
                "timestamp": conversation_data["timestamp"].isoformat() if isinstance(conversation_data["timestamp"], datetime) else conversation_data["timestamp"],
                "metadata": json.dumps(conversation_data.get("metadata", {}))
            }]
            
            errors = self.client.insert_rows_json(table, rows_to_insert)
            if errors:
                logger.error(f"Error inserting conversation: {errors}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to insert conversation: {e}")
            return False
    
    def get_agent_conversations(self, agent_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get conversations for a specific agent"""
        try:
            query = f"""
            SELECT * FROM `{self.project_id}.{self.dataset_id}.{self.tables['conversations']}`
            WHERE agent_id = @agent_id
            ORDER BY timestamp DESC
            LIMIT @limit
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
                    bigquery.ScalarQueryParameter("limit", "INTEGER", limit)
                ]
            )
            
            result = self.client.query(query, job_config=job_config)
            conversations = []
            
            for row in result:
                conversations.append({
                    "id": row.id,
                    "agent_id": row.agent_id,
                    "session_id": row.session_id,
                    "user_message": row.user_message,
                    "agent_response": row.agent_response,
                    "tokens_used": row.tokens_used,
                    "cost": row.cost,
                    "timestamp": row.timestamp,
                    "metadata": json.loads(row.metadata) if row.metadata else {}
                })
            
            return conversations
            
        except Exception as e:
            logger.error(f"Failed to get conversations for agent {agent_id}: {e}")
            return []
    
    def health_check(self) -> Dict[str, Any]:
        """Perform BigQuery health check"""
        try:
            # Test connection and query
            query = f"SELECT COUNT(*) as count FROM `{self.project_id}.{self.dataset_id}.{self.tables['agents']}`"
            result = self.client.query(query)
            
            for row in result:
                agent_count = row.count
            
            return {
                "status": "healthy",
                "connection": "ok",
                "dataset": self.dataset_id,
                "project": self.project_id,
                "agent_count": agent_count,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "dataset": self.dataset_id,
                "project": self.project_id,
                "timestamp": datetime.now().isoformat()
            }