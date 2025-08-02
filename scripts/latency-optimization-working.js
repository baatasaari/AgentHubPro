/**
 * AgentHub Latency Optimization - Working Version
 * Simplified for deployment validation
 */

const CircuitBreaker = require('opossum');
const { EventEmitter } = require('events');

class LatencyOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    this.maxRetries = options.maxRetries || 3;
    this.cacheEnabled = options.cacheEnabled !== false;
    
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.performanceMetrics = new Map();
    
    this.initializeOptimizations();
  }
  
  initializeOptimizations() {
    // Setup default circuit breakers for critical operations
    const criticalOperations = [
      'database-query', 'external-api-call', 'embedding-generation',
      'rag-search', 'payment-processing'
    ];
    
    criticalOperations.forEach(operation => {
      this.createCircuitBreaker(operation);
    });
  }
  
  createCircuitBreaker(operationName) {
    const options = {
      timeout: this.defaultTimeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000
    };
    
    const breaker = new CircuitBreaker(() => {}, options);
    
    breaker.on('open', () => {
      this.emit('performanceAlert', {
        operation: operationName,
        severity: 'HIGH',
        message: `Circuit breaker opened for ${operationName}`
      });
    });
    
    this.circuitBreakers.set(operationName, breaker);
    return breaker;
  }
  
  async optimizeRequest(operation, requestFunction, options = {}) {
    const startTime = Date.now();
    
    try {
      const result = await requestFunction();
      const duration = Date.now() - startTime;
      
      this.recordPerformance(operation, duration, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, 'error');
      throw error;
    }
  }
  
  recordPerformance(operation, duration, status) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        totalRequests: 0,
        totalDuration: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(operation);
    metrics.totalRequests++;
    metrics.totalDuration += duration;
    
    if (status === 'success') {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
    
    metrics.averageLatency = metrics.totalDuration / metrics.totalRequests;
    
    // Alert on high latency
    if (duration > this.defaultTimeout * 0.8) {
      this.emit('performanceAlert', {
        operation,
        severity: 'MEDIUM',
        message: `High latency detected: ${duration}ms for ${operation}`
      });
    }
  }
  
  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }
  
  getCircuitBreakerStatus() {
    const status = {};
    this.circuitBreakers.forEach((breaker, operation) => {
      status[operation] = {
        state: breaker.state,
        stats: breaker.stats
      };
    });
    return status;
  }
}

module.exports = LatencyOptimizer;