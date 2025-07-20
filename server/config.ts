export interface DatabaseConfig {
  // BigQuery Configuration
  projectId?: string;
  dataset: string;
  location: string;
  keyFilename?: string;
  
  // Table Names
  agentsTable: string;
  conversationsTable: string;
  
  // Connection Settings
  timeout: number;
  retries: number;
  
  // Development Settings
  enableSampleData: boolean;
  logQueries: boolean;
}

export const databaseConfig: DatabaseConfig = {
  // BigQuery Configuration
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  dataset: process.env.BIGQUERY_DATASET || 'agenthub',
  location: process.env.BIGQUERY_LOCATION || 'US',
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  
  // Table Names (configurable for different environments)
  agentsTable: process.env.AGENTS_TABLE_NAME || 'agents',
  conversationsTable: process.env.CONVERSATIONS_TABLE_NAME || 'conversations',
  
  // Connection Settings
  timeout: parseInt(process.env.BIGQUERY_TIMEOUT || '30000'),
  retries: parseInt(process.env.BIGQUERY_RETRIES || '3'),
  
  // Development Settings
  enableSampleData: process.env.ENABLE_SAMPLE_DATA !== 'false',
  logQueries: process.env.LOG_BIGQUERY_QUERIES === 'true',
};

export const isDatabaseConfigured = (): boolean => {
  return !!databaseConfig.projectId;
};

export const validateDatabaseConfig = (): string[] => {
  const errors: string[] = [];
  
  if (!databaseConfig.projectId) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID is required for BigQuery');
  }
  
  if (!databaseConfig.dataset) {
    errors.push('BIGQUERY_DATASET cannot be empty');
  }
  
  if (databaseConfig.timeout < 1000) {
    errors.push('BIGQUERY_TIMEOUT must be at least 1000ms');
  }
  
  return errors;
};