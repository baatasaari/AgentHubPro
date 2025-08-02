/**
 * AgentHub Latency Optimization and Graceful Degradation
 * Implements strategies to handle synchronous communication latency gracefully
 */

const EventEmitter = require('events');

class LatencyOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Timeout configurations
      defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
      fastTimeout: options.fastTimeout || 5000,        // 5 seconds for critical paths
      slowTimeout: options.slowTimeout || 60000,       // 60 seconds for heavy operations
      
      // Retry configurations
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,          // 1 second base delay
      backoffMultiplier: options.backoffMultiplier || 2,
      
      // Circuit breaker configurations
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerWindow: options.circuitBreakerWindow || 60000, // 1 minute
      circuitBreakerRecoveryTime: options.circuitBreakerRecoveryTime || 30000, // 30 seconds
      
      // Caching configurations
      cacheEnabled: options.cacheEnabled || true,
      cacheTTL: options.cacheTTL || 300000,            // 5 minutes
      
      // Performance thresholds
      performanceThresholds: {
        excellent: 100,   // < 100ms
        good: 500,        // < 500ms
        acceptable: 2000, // < 2s
        slow: 5000,       // < 5s
        critical: 10000   // < 10s
      }
    };
    
    // State tracking
    this.circuitBreakers = new Map();
    this.cache = new Map();
    this.metrics = new Map();
    this.healthStatus = new Map();
    
    // Start background monitoring
    this.startMonitoring();
  }
  
  /**
   * Optimized service call with multiple fallback strategies
   */
  async optimizedCall(serviceName, operation, params = {}, options = {}) {
    const callId = this.generateCallId();
    const startTime = Date.now();
    
    const config = {
      timeout: options.timeout || this.getTimeoutForOperation(operation),
      enableCache: options.enableCache !== false,
      enableFallback: options.enableFallback !== false,
      priority: options.priority || 'normal',
      ...options
    };
    
    this.emit('callStart', { callId, serviceName, operation, config });
    
    try {
      // 1. Check cache first
      if (config.enableCache) {
        const cached = this.getCachedResult(serviceName, operation, params);
        if (cached) {
          this.recordMetric(serviceName, operation, Date.now() - startTime, 'cache_hit');
          this.emit('callComplete', { callId, source: 'cache', duration: Date.now() - startTime });
          return cached;
        }
      }
      
      // 2. Check circuit breaker
      if (this.isCircuitBreakerOpen(serviceName)) {
        throw new Error(`Circuit breaker open for ${serviceName}`);
      }
      
      // 3. Execute call with optimization strategies
      const result = await this.executeOptimizedCall(serviceName, operation, params, config);
      
      // 4. Cache successful results
      if (config.enableCache && this.isCacheable(operation)) {
        this.setCachedResult(serviceName, operation, params, result);
      }
      
      const duration = Date.now() - startTime;
      this.recordMetric(serviceName, operation, duration, 'success');
      this.emit('callComplete', { callId, source: 'service', duration });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(serviceName, operation, duration, 'error');
      
      // 5. Try fallback strategies
      if (config.enableFallback) {
        const fallbackResult = await this.tryFallbackStrategies(serviceName, operation, params, error);
        if (fallbackResult) {
          this.emit('callComplete', { callId, source: 'fallback', duration: Date.now() - startTime });
          return fallbackResult;
        }
      }
      
      this.emit('callError', { callId, error: error.message, duration });
      throw error;
    }
  }
  
  /**
   * Execute optimized call with multiple strategies
   */
  async executeOptimizedCall(serviceName, operation, params, config) {
    const strategies = this.selectOptimizationStrategies(serviceName, operation, config);
    
    for (const strategy of strategies) {
      try {
        return await this.executeStrategy(strategy, serviceName, operation, params, config);
      } catch (error) {
        console.warn(`Strategy ${strategy} failed for ${serviceName}.${operation}:`, error.message);
        // Continue to next strategy
      }
    }
    
    throw new Error(`All optimization strategies failed for ${serviceName}.${operation}`);
  }
  
  /**
   * Select appropriate optimization strategies based on context
   */
  selectOptimizationStrategies(serviceName, operation, config) {
    const strategies = ['direct'];
    
    // Add parallel strategy for non-critical operations
    if (config.priority !== 'critical' && this.supportsParallelExecution(operation)) {
      strategies.unshift('parallel');
    }
    
    // Add batch strategy for batch operations
    if (operation.includes('batch') || operation.includes('Batch')) {
      strategies.unshift('batch');
    }
    
    // Add streaming strategy for large data operations
    if (operation.includes('stream') || operation.includes('Stream')) {
      strategies.unshift('streaming');
    }
    
    // Add retry strategy for all operations
    strategies.push('retry');
    
    return strategies;
  }
  
  /**
   * Execute a specific optimization strategy
   */
  async executeStrategy(strategy, serviceName, operation, params, config) {
    switch (strategy) {
      case 'direct':
        return this.executeDirect(serviceName, operation, params, config);
        
      case 'parallel':
        return this.executeParallel(serviceName, operation, params, config);
        
      case 'batch':
        return this.executeBatch(serviceName, operation, params, config);
        
      case 'streaming':
        return this.executeStreaming(serviceName, operation, params, config);
        
      case 'retry':
        return this.executeWithRetry(serviceName, operation, params, config);
        
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }
  
  /**
   * Direct execution with timeout
   */
  async executeDirect(serviceName, operation, params, config) {
    return this.timeoutPromise(
      this.callService(serviceName, operation, params),
      config.timeout,
      `${serviceName}.${operation} timed out`
    );
  }
  
  /**
   * Parallel execution for redundancy
   */
  async executeParallel(serviceName, operation, params, config) {
    const replicas = this.getServiceReplicas(serviceName);
    if (replicas.length <= 1) {
      throw new Error('Parallel execution requires multiple replicas');
    }
    
    // Execute on multiple replicas and return the fastest response
    const promises = replicas.slice(0, 3).map(replica => 
      this.timeoutPromise(
        this.callServiceReplica(replica, operation, params),
        config.timeout / 2,
        `${replica} timed out`
      )
    );
    
    return Promise.any(promises);
  }
  
  /**
   * Batch execution for efficiency
   */
  async executeBatch(serviceName, operation, params, config) {
    // Collect similar requests and batch them
    return this.addToBatch(serviceName, operation, params, config);
  }
  
  /**
   * Streaming execution for large data
   */
  async executeStreaming(serviceName, operation, params, config) {
    return new Promise((resolve, reject) => {
      const stream = this.createStream(serviceName, operation, params);
      const chunks = [];
      
      const timeout = setTimeout(() => {
        stream.destroy();
        reject(new Error(`Streaming ${serviceName}.${operation} timed out`));
      }, config.timeout);
      
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        clearTimeout(timeout);
        resolve(this.combineStreamChunks(chunks));
      });
      
      stream.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  /**
   * Execution with exponential backoff retry
   */
  async executeWithRetry(serviceName, operation, params, config) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.executeDirect(serviceName, operation, params, {
          ...config,
          timeout: config.timeout / attempt // Reduce timeout on retries
        });
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
          await this.sleep(Math.min(delay, 10000)); // Max 10 second delay
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Fallback strategies when primary call fails
   */
  async tryFallbackStrategies(serviceName, operation, params, primaryError) {
    const fallbackStrategies = [
      'staleCache',
      'degradedResponse',
      'alternativeService',
      'defaultResponse'
    ];
    
    for (const strategy of fallbackStrategies) {
      try {
        const result = await this.executeFallback(strategy, serviceName, operation, params, primaryError);
        if (result) {
          console.log(`Fallback ${strategy} succeeded for ${serviceName}.${operation}`);
          return result;
        }
      } catch (error) {
        console.warn(`Fallback ${strategy} failed:`, error.message);
      }
    }
    
    return null;
  }
  
  /**
   * Execute fallback strategy
   */
  async executeFallback(strategy, serviceName, operation, params, primaryError) {
    switch (strategy) {
      case 'staleCache':
        return this.getStaleCache(serviceName, operation, params);
        
      case 'degradedResponse':
        return this.generateDegradedResponse(serviceName, operation, params);
        
      case 'alternativeService':
        return this.tryAlternativeService(serviceName, operation, params);
        
      case 'defaultResponse':
        return this.getDefaultResponse(serviceName, operation, params);
        
      default:
        return null;
    }
  }
  
  /**
   * Generate degraded response with limited functionality
   */
  generateDegradedResponse(serviceName, operation, params) {
    const degradedResponses = {
      'agent-management-service': {
        'getAgent': () => ({ id: params.agentId, name: 'Agent (Limited Mode)', status: 'degraded' }),
        'listAgents': () => ({ agents: [], total: 0, message: 'Service temporarily unavailable' })
      },
      'rag-query-service': {
        'queryKnowledge': () => ({ results: [], message: 'Knowledge base temporarily unavailable' }),
        'searchSimilar': () => ({ results: [], confidence: 0 })
      },
      'conversation-management-service': {
        'createConversation': () => ({ id: 'temp-' + Date.now(), status: 'degraded' }),
        'getConversation': () => ({ id: params.conversationId, messages: [], status: 'degraded' })
      }
    };
    
    const serviceResponses = degradedResponses[serviceName];
    if (serviceResponses && serviceResponses[operation]) {
      return serviceResponses[operation](params);
    }
    
    return null;
  }
  
  /**
   * Circuit breaker management
   */
  isCircuitBreakerOpen(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return false;
    
    const now = Date.now();
    
    // Check if in recovery period
    if (breaker.state === 'open' && (now - breaker.openTime) > this.options.circuitBreakerRecoveryTime) {
      breaker.state = 'half-open';
      breaker.consecutiveFailures = 0;
    }
    
    return breaker.state === 'open';
  }
  
  recordCircuitBreakerEvent(serviceName, success) {
    let breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      breaker = {
        state: 'closed',
        consecutiveFailures: 0,
        lastFailureTime: 0,
        openTime: 0
      };
      this.circuitBreakers.set(serviceName, breaker);
    }
    
    if (success) {
      breaker.consecutiveFailures = 0;
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
      }
    } else {
      breaker.consecutiveFailures++;
      breaker.lastFailureTime = Date.now();
      
      if (breaker.consecutiveFailures >= this.options.circuitBreakerThreshold) {
        breaker.state = 'open';
        breaker.openTime = Date.now();
        console.warn(`Circuit breaker opened for ${serviceName}`);
      }
    }
  }
  
  /**
   * Performance monitoring and metrics
   */
  recordMetric(serviceName, operation, duration, status) {
    const key = `${serviceName}.${operation}`;
    let metrics = this.metrics.get(key);
    
    if (!metrics) {
      metrics = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        recentDurations: []
      };
      this.metrics.set(key, metrics);
    }
    
    metrics.totalCalls++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    
    if (status === 'success') {
      metrics.successfulCalls++;
      this.recordCircuitBreakerEvent(serviceName, true);
    } else {
      metrics.failedCalls++;
      this.recordCircuitBreakerEvent(serviceName, false);
    }
    
    // Keep recent durations for percentile calculations
    metrics.recentDurations.push(duration);
    if (metrics.recentDurations.length > 100) {
      metrics.recentDurations.shift();
    }
    
    // Emit performance alerts
    this.checkPerformanceThresholds(serviceName, operation, duration);
  }
  
  /**
   * Check performance thresholds and emit alerts
   */
  checkPerformanceThresholds(serviceName, operation, duration) {
    const thresholds = this.options.performanceThresholds;
    
    if (duration > thresholds.critical) {
      this.emit('performanceAlert', {
        severity: 'critical',
        service: serviceName,
        operation: operation,
        duration: duration,
        message: `Extremely slow response time: ${duration}ms`
      });
    } else if (duration > thresholds.slow) {
      this.emit('performanceAlert', {
        severity: 'warning',
        service: serviceName,
        operation: operation,
        duration: duration,
        message: `Slow response time: ${duration}ms`
      });
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(serviceName = null, operation = null) {
    const stats = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      const [service, op] = key.split('.');
      
      if ((serviceName && service !== serviceName) || (operation && op !== operation)) {
        continue;
      }
      
      const avgDuration = metrics.totalCalls > 0 ? metrics.totalDuration / metrics.totalCalls : 0;
      const successRate = metrics.totalCalls > 0 ? (metrics.successfulCalls / metrics.totalCalls) * 100 : 0;
      
      // Calculate percentiles
      const sortedDurations = [...metrics.recentDurations].sort((a, b) => a - b);
      const p50 = this.getPercentile(sortedDurations, 50);
      const p95 = this.getPercentile(sortedDurations, 95);
      const p99 = this.getPercentile(sortedDurations, 99);
      
      stats[key] = {
        totalCalls: metrics.totalCalls,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        p50Duration: p50,
        p95Duration: p95,
        p99Duration: p99
      };
    }
    
    return stats;
  }
  
  /**
   * Utility functions
   */
  generateCallId() {
    return Math.random().toString(36).substring(2, 15);
  }
  
  getTimeoutForOperation(operation) {
    const timeoutMap = {
      // Fast operations
      'health': this.options.fastTimeout,
      'ping': this.options.fastTimeout,
      'status': this.options.fastTimeout,
      
      // Slow operations
      'processDocument': this.options.slowTimeout,
      'generateEmbedding': this.options.slowTimeout,
      'batchProcess': this.options.slowTimeout,
      
      // Default
      'default': this.options.defaultTimeout
    };
    
    for (const [pattern, timeout] of Object.entries(timeoutMap)) {
      if (operation.toLowerCase().includes(pattern.toLowerCase())) {
        return timeout;
      }
    }
    
    return this.options.defaultTimeout;
  }
  
  timeoutPromise(promise, timeoutMs, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
  
  isNonRetryableError(error) {
    const nonRetryablePatterns = [
      'authentication',
      'authorization',
      'forbidden',
      'not found',
      'bad request',
      'validation'
    ];
    
    const message = error.message.toLowerCase();
    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }
  
  /**
   * Background monitoring
   */
  startMonitoring() {
    // Clean up old cache entries
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute
    
    // Reset circuit breakers in recovery
    setInterval(() => {
      this.checkCircuitBreakers();
    }, 30000); // Every 30 seconds
    
    // Emit performance summary
    setInterval(() => {
      this.emit('performanceSummary', this.getPerformanceStats());
    }, 300000); // Every 5 minutes
  }
  
  cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
  
  checkCircuitBreakers() {
    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'open') {
        const now = Date.now();
        if (now - breaker.openTime > this.options.circuitBreakerRecoveryTime) {
          breaker.state = 'half-open';
          console.log(`Circuit breaker for ${serviceName} moved to half-open state`);
        }
      }
    }
  }
  
  /**
   * Cache management
   */
  getCachedResult(serviceName, operation, params) {
    if (!this.options.cacheEnabled) return null;
    
    const key = this.getCacheKey(serviceName, operation, params);
    const entry = this.cache.get(key);
    
    if (entry && (Date.now() - entry.timestamp) < this.options.cacheTTL) {
      return entry.data;
    }
    
    return null;
  }
  
  setCachedResult(serviceName, operation, params, result) {
    if (!this.options.cacheEnabled) return;
    
    const key = this.getCacheKey(serviceName, operation, params);
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
  }
  
  getCacheKey(serviceName, operation, params) {
    return `${serviceName}:${operation}:${JSON.stringify(params)}`;
  }
  
  isCacheable(operation) {
    const cacheableOperations = ['get', 'list', 'search', 'query', 'health'];
    return cacheableOperations.some(op => operation.toLowerCase().includes(op));
  }
}

module.exports = LatencyOptimizer;
module.exports.LatencyOptimizer = LatencyOptimizer;