/**
 * Database Query Optimization for AgentHub
 * Implements indexing strategies and query performance improvements
 */

export class QueryOptimizer {
  
  // Optimized agent queries with proper indexing
  static getOptimizedAgentQueries() {
    return {
      // Get active agents with organization filter
      getActiveAgents: `
        SELECT a.*, o.name as organization_name 
        FROM agents a 
        JOIN organizations o ON a.organization_id = o.id 
        WHERE a.status = 'active' 
          AND a.organization_id = $1 
        ORDER BY a.updated_at DESC 
        LIMIT $2
      `,
      
      // Get agent analytics with time-based partitioning
      getAgentAnalytics: `
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as event_count,
          event_type
        FROM analytics_events 
        WHERE organization_id = $1 
          AND created_at >= $2 
          AND created_at <= $3
        GROUP BY DATE_TRUNC('day', created_at), event_type
        ORDER BY date DESC
      `,
      
      // Get conversation history with pagination
      getConversationHistory: `
        SELECT c.*, a.name as agent_name
        FROM conversations c
        LEFT JOIN agents a ON c.agent_id = a.id
        WHERE c.organization_id = $1
          AND c.created_at >= $2
        ORDER BY c.updated_at DESC
        LIMIT $3 OFFSET $4
      `,
      
      // Get payment transaction summary
      getPaymentSummary: `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
          AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_transaction
        FROM payment_transactions
        WHERE organization_id = $1
          AND created_at >= $2
      `,
      
      // Search RAG documents efficiently
      searchRAGDocuments: `
        SELECT 
          id, title, 
          ts_headline('english', content, plainto_tsquery('english', $2)) as highlighted_content,
          ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as rank
        FROM rag_documents
        WHERE organization_id = $1
          AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
        ORDER BY rank DESC
        LIMIT $3
      `
    };
  }

  // Database indexing recommendations
  static getIndexingStrategy() {
    return [
      // Primary performance indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_status ON agents(organization_id, status) WHERE status = \'active\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_org_time ON analytics_events(organization_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_updated ON conversations(organization_id, updated_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_status ON payment_transactions(organization_id, status)',
      
      // Full-text search indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rag_content_fts ON rag_documents USING gin(to_tsvector(\'english\', content))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rag_title_fts ON rag_documents USING gin(to_tsvector(\'english\', title))',
      
      // Composite indexes for common query patterns
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_industry ON agents(organization_id, industry) WHERE status = \'active\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_type_time ON analytics_events(event_type, created_at DESC)',
    ];
  }

  // Connection pool configuration
  static getOptimalPoolConfig() {
    return {
      max: 20, // Maximum connections
      min: 5,  // Minimum connections
      idle: 30000, // 30 seconds idle timeout
      acquire: 2000, // 2 seconds acquire timeout
      evict: 60000, // 1 minute eviction timeout
      
      // Query optimization settings
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  }

  // Query performance analysis
  static analyzeQueryPerformance(queries: { query: string; duration: number }[]) {
    const slowQueries = queries.filter(q => q.duration > 1000);
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length;
    
    const recommendations = [];
    
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} slow queries detected (>1s)`);
    }
    
    if (avgDuration > 500) {
      recommendations.push('Average query time is high - consider indexing optimization');
    }
    
    recommendations.push('Use EXPLAIN ANALYZE for slow queries');
    recommendations.push('Implement query result caching for frequent reads');
    recommendations.push('Consider read replicas for analytics queries');
    
    return {
      totalQueries: queries.length,
      slowQueries: slowQueries.length,
      avgDuration: Math.round(avgDuration),
      recommendations
    };
  }
}