/**
 * Database Optimization for AgentHub
 * Implements connection pooling, query optimization, and indexing strategies
 */

import { Pool, PoolClient } from 'pg';
import { performance } from 'perf_hooks';

interface QueryStats {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
}

interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  // Pool configuration
  max: number; // Maximum connections
  min: number; // Minimum connections
  idle: number; // Idle timeout
  acquire: number; // Acquire timeout
  evict: number; // Eviction timeout
}

export class OptimizedDatabaseConnection {
  private pool: Pool;
  private queryStats: QueryStats[] = [];
  private isConnected = false;

  constructor(config: ConnectionPoolConfig) {
    this.initializePool(config);
  }

  private initializePool(config: ConnectionPoolConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      
      // Connection pool optimization
      max: config.max || 20, // Maximum connections
      min: config.min || 5,  // Minimum connections
      idleTimeoutMillis: config.idle || 30000, // 30 seconds
      connectionTimeoutMillis: config.acquire || 2000, // 2 seconds
      
      // Advanced pool settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 30000, // 30 seconds query timeout
      query_timeout: 30000,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
    });

    // Pool event handlers
    this.pool.on('connect', (client) => {
      console.log('✅ New database connection established');
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      console.error('❌ Database pool error:', err.message);
      this.isConnected = false;
    });

    this.pool.on('acquire', () => {
      console.log('📊 Connection acquired from pool');
    });

    this.pool.on('release', () => {
      console.log('📊 Connection released back to pool');
    });
  }

  // Optimized query execution with performance monitoring
  async executeQuery<T = any>(
    query: string, 
    params: any[] = [],
    options: { timeout?: number; retries?: number } = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const { timeout = 30000, retries = 3 } = options;

    let attempt = 0;
    while (attempt < retries) {
      try {
        const client = await this.pool.connect();
        
        try {
          // Set query timeout
          await client.query(`SET statement_timeout = ${timeout}`);
          
          // Execute optimized query
          const result = await client.query(query, params);
          
          // Track performance
          const duration = performance.now() - startTime;
          this.trackQueryStats(query, duration, true);
          
          console.log(`✅ Query executed in ${duration.toFixed(2)}ms`);
          return result.rows;
          
        } finally {
          client.release();
        }
        
      } catch (error) {
        attempt++;
        const duration = performance.now() - startTime;
        this.trackQueryStats(query, duration, false);
        
        console.error(`❌ Query attempt ${attempt} failed:`, error.message);
        
        if (attempt >= retries) {
          throw new Error(`Query failed after ${retries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // Bulk operations optimization
  async executeBulkInsert<T>(
    tableName: string,
    columns: string[],
    data: T[][],
    options: { batchSize?: number; onConflict?: string } = {}
  ): Promise<number> {
    const { batchSize = 1000, onConflict } = options;
    let totalInserted = 0;

    // Process in batches for better performance
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const placeholders = batch.map((_, rowIndex) => {
        const rowPlaceholders = columns.map((_, colIndex) => 
          `$${rowIndex * columns.length + colIndex + 1}`
        ).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');
      
      const flatParams = batch.flat();
      
      let query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
      `;
      
      if (onConflict) {
        query += ` ${onConflict}`;
      }
      
      const result = await this.executeQuery(query, flatParams);
      totalInserted += result.length;
      
      console.log(`✅ Bulk inserted batch ${i / batchSize + 1}: ${batch.length} rows`);
    }
    
    return totalInserted;
  }

  // Transaction management
  async executeTransaction<T>(
    operations: ((client: PoolClient) => Promise<T>)[]
  ): Promise<T[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully');
      
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
      
    } finally {
      client.release();
    }
  }

  // Database indexing strategies
  async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      // Organizations indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_subscription ON organizations(subscription_plan, subscription_status)',
      
      // Users indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_id ON users(organization_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role, permission_level)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE is_active = true',
      
      // Agents indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_status ON agents(organization_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_industry ON agents(industry) WHERE status = \'active\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_rag_enabled ON agents(rag_enabled) WHERE status = \'active\'',
      
      // Analytics events indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_org_time ON analytics_events(organization_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_session ON analytics_events(user_id, session_id)',
      
      // Payment transactions indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_status ON payment_transactions(organization_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_transaction_id ON payment_transactions(transaction_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payment_transactions(created_at DESC)',
      
      // RAG documents indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rag_org_category ON rag_documents(organization_id, category)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rag_content_search ON rag_documents USING gin(to_tsvector(\'english\', content))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rag_title_search ON rag_documents USING gin(to_tsvector(\'english\', title))',
      
      // Conversations indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_agent ON conversations(organization_id, agent_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_session ON conversations(session_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status_channel ON conversations(status, channel)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)',
      
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_industry_status ON agents(organization_id, industry, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_role_active ON users(organization_id, role, is_active)',
    ];

    console.log('📊 Creating optimized database indexes...');
    
    for (const indexQuery of indexes) {
      try {
        await this.executeQuery(indexQuery);
        console.log('✅ Index created successfully');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ Index already exists, skipping');
        } else {
          console.error('❌ Failed to create index:', error.message);
        }
      }
    }
    
    console.log('✅ Database indexing optimization completed');
  }

  // Query optimization suggestions
  getQueryOptimizationSuggestions(): string[] {
    const slowQueries = this.queryStats
      .filter(stat => stat.duration > 1000) // Queries over 1 second
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const suggestions = [
      '1. Use LIMIT clauses for large result sets',
      '2. Implement proper WHERE clause indexing',
      '3. Consider using EXISTS instead of IN for subqueries',
      '4. Use connection pooling for high-traffic scenarios',
      '5. Implement query result caching for frequently accessed data',
    ];

    if (slowQueries.length > 0) {
      suggestions.push(
        `6. Optimize these slow queries (>1s): ${slowQueries.length} found`,
        ...slowQueries.slice(0, 3).map((query, i) => 
          `   ${i + 1}. ${query.query.substring(0, 50)}... (${query.duration.toFixed(2)}ms)`
        )
      );
    }

    return suggestions;
  }

  // Performance monitoring
  getPerformanceStats() {
    const totalQueries = this.queryStats.length;
    const successfulQueries = this.queryStats.filter(s => s.success).length;
    const avgDuration = this.queryStats.reduce((sum, s) => sum + s.duration, 0) / totalQueries;
    const slowQueries = this.queryStats.filter(s => s.duration > 1000).length;

    return {
      totalQueries,
      successRate: (successfulQueries / totalQueries) * 100,
      averageDuration: avgDuration,
      slowQueries,
      connectionPoolActive: this.pool.totalCount,
      connectionPoolIdle: this.pool.idleCount,
      connectionPoolWaiting: this.pool.waitingCount,
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency: number; connections: any }> {
    const startTime = performance.now();
    
    try {
      await this.executeQuery('SELECT 1 as health_check');
      const latency = performance.now() - startTime;
      
      return {
        status: 'healthy',
        latency: Math.round(latency),
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        connections: {
          total: 0,
          idle: 0,
          waiting: 0,
        },
      };
    }
  }

  private trackQueryStats(query: string, duration: number, success: boolean) {
    this.queryStats.push({
      query: query.substring(0, 100), // Truncate for storage
      duration,
      timestamp: new Date(),
      success,
    });

    // Keep only last 1000 queries
    if (this.queryStats.length > 1000) {
      this.queryStats = this.queryStats.slice(-1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  async close(): Promise<void> {
    await this.pool.end();
    console.log('✅ Database connection pool closed');
  }
}

// Export optimized database instance
export const optimizedDB = new OptimizedDatabaseConnection({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'agenthub',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: 20,
  min: 5,
  idle: 30000,
  acquire: 2000,
  evict: 60000,
});