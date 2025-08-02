/**
 * AgentHub Service Communication Library
 * Handles RESTful API and gRPC communication between microservices
 * with authentication, retry logic, and graceful latency handling
 */

const axios = require('axios');
const CircuitBreaker = require('opossum');

class ServiceCommunicator {
  constructor(options = {}) {
    this.projectId = process.env.GCP_PROJECT || options.projectId;
    this.region = process.env.REGION || options.region || 'asia-south1';
    this.environment = process.env.ENVIRONMENT || options.environment || 'prod';
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.retries = options.retries || 3;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Service registry - maps service names to URLs
    this.serviceRegistry = new Map();
    
    // Circuit breakers for each service
    this.circuitBreakers = new Map();
    
    // Initialize axios with default config
    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentHub-ServiceCommunicator/1.0'
      }
    });
    
    this.initializeServices();
  }
  
  /**
   * Initialize service registry with Cloud Run URLs
   */
  async initializeServices() {
    const services = [
      'api-gateway',
      'agent-management-service',
      'conversation-management-service',
      'rag-query-service',
      'payment-intent-service',
      'document-processing-service',
      'embedding-generation-service',
      'similarity-search-service',
      'knowledge-base-service',
      'faq-management-service',
      'payment-link-service',
      'metrics-collection-service',
      'billing-calculation-service',
      'slot-management-service',
      'booking-management-service',
      'calendar-provider-service',
      'notification-service',
      'widget-generation-service',
      'usage-analytics-service',
      'analytics-calculation-service',
      'insights-generation-service',
      'data-storage-service',
      'system-health-service',
      'configuration-service',
      'response-generation-service',
      'service-discovery-service',
      'authentication-service',
      'database-operations-service',
      'logging-service',
      'industry-configuration-service',
      'conversation-processing-service'
    ];
    
    // In production, these URLs would be discovered dynamically
    // For now, we'll use the Cloud Run URL pattern
    services.forEach(service => {
      const url = `https://${service}-${this.generateUrlHash()}-${this.getRegionCode()}.a.run.app`;
      this.serviceRegistry.set(service, url);
      
      // Create circuit breaker for each service
      this.createCircuitBreaker(service);
    });
    
    console.log(`Initialized ${services.length} services in registry`);
  }
  
  /**
   * Generate URL hash (in production, get from actual Cloud Run service)
   */
  generateUrlHash() {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Get region code for Cloud Run URLs
   */
  getRegionCode() {
    const regionMap = {
      'asia-south1': 'as',
      'us-central1': 'uc',
      'europe-west1': 'ew'
    };
    return regionMap[this.region] || 'uc';
  }
  
  /**
   * Create circuit breaker for a service
   */
  createCircuitBreaker(serviceName) {
    const options = {
      timeout: this.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
      rollingCountTimeout: 10000, // 10 seconds
      rollingCountBuckets: 10,
      name: serviceName,
      group: 'microservices'
    };
    
    const breaker = new CircuitBreaker(this.executeRequest.bind(this), options);
    
    breaker.on('open', () => {
      console.warn(`Circuit breaker OPENED for ${serviceName}`);
      this.logEvent('circuit_breaker_open', { service: serviceName });
    });
    
    breaker.on('halfOpen', () => {
      console.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
      this.logEvent('circuit_breaker_half_open', { service: serviceName });
    });
    
    breaker.on('close', () => {
      console.info(`Circuit breaker CLOSED for ${serviceName}`);
      this.logEvent('circuit_breaker_close', { service: serviceName });
    });
    
    this.circuitBreakers.set(serviceName, breaker);
  }
  
  /**
   * Get or refresh access token for service-to-service authentication
   */
  async getAccessToken() {
    const now = Date.now();
    
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry && (this.tokenExpiry - now) > 300000) {
      return this.accessToken;
    }
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('gcloud auth print-access-token');
      this.accessToken = stdout.trim();
      this.tokenExpiry = now + 3600000; // 1 hour
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error.message);
      throw new Error('Authentication failed');
    }
  }
  
  /**
   * Execute HTTP request with retry logic
   */
  async executeRequest(config) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.httpClient(config);
        const duration = Date.now() - startTime;
        
        // Log successful request
        this.logEvent('request_success', {
          service: config.serviceName,
          method: config.method,
          path: config.url,
          duration,
          attempt,
          statusCode: response.status
        });
        
        return response;
      } catch (error) {
        lastError = error;
        const duration = Date.now() - (config.startTime || Date.now());
        
        this.logEvent('request_error', {
          service: config.serviceName,
          method: config.method,
          path: config.url,
          duration,
          attempt,
          error: error.message,
          statusCode: error.response?.status
        });
        
        // Don't retry on 4xx errors (except 408, 429)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (![408, 429].includes(error.response.status)) {
            throw error;
          }
        }
        
        // Exponential backoff for retries
        if (attempt < this.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.retries})`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Make authenticated request to a microservice
   */
  async callService(serviceName, path, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      timeout = this.timeout,
      authenticated = true
    } = options;
    
    const serviceUrl = this.serviceRegistry.get(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }
    
    const url = `${serviceUrl}${path}`;
    const config = {
      url,
      method,
      data,
      timeout,
      serviceName,
      startTime: Date.now(),
      headers: { ...headers }
    };
    
    // Add authentication for internal services
    if (authenticated && serviceName !== 'api-gateway') {
      try {
        const token = await this.getAccessToken();
        config.headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error(`Failed to authenticate request to ${serviceName}:`, error.message);
        throw error;
      }
    }
    
    // Use circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      return circuitBreaker.fire(config);
    } else {
      return this.executeRequest(config);
    }
  }
  
  /**
   * Health check for a specific service
   */
  async healthCheck(serviceName) {
    try {
      const response = await this.callService(serviceName, '/health', {
        timeout: 5000,
        authenticated: serviceName !== 'api-gateway'
      });
      
      return {
        service: serviceName,
        healthy: response.status === 200,
        response: response.data,
        responseTime: Date.now() - response.config.startTime
      };
    } catch (error) {
      return {
        service: serviceName,
        healthy: false,
        error: error.message,
        responseTime: error.config?.startTime ? Date.now() - error.config.startTime : 0
      };
    }
  }
  
  /**
   * Check health of all services
   */
  async healthCheckAll() {
    const services = Array.from(this.serviceRegistry.keys());
    const promises = services.map(service => this.healthCheck(service));
    return Promise.all(promises);
  }
  
  /**
   * Agent Management Service calls
   */
  async getAgent(agentId) {
    const response = await this.callService('agent-management-service', `/agents/${agentId}`);
    return response.data;
  }
  
  async createAgent(agentData) {
    const response = await this.callService('agent-management-service', '/agents', {
      method: 'POST',
      data: agentData
    });
    return response.data;
  }
  
  async updateAgent(agentId, agentData) {
    const response = await this.callService('agent-management-service', `/agents/${agentId}`, {
      method: 'PUT',
      data: agentData
    });
    return response.data;
  }
  
  /**
   * Conversation Management Service calls
   */
  async createConversation(conversationData) {
    const response = await this.callService('conversation-management-service', '/conversations', {
      method: 'POST',
      data: conversationData
    });
    return response.data;
  }
  
  async getConversation(conversationId) {
    const response = await this.callService('conversation-management-service', `/conversations/${conversationId}`);
    return response.data;
  }
  
  /**
   * RAG Query Service calls
   */
  async queryRAG(query, agentId) {
    const response = await this.callService('rag-query-service', '/query', {
      method: 'POST',
      data: { query, agentId },
      timeout: 45000 // RAG queries can take longer
    });
    return response.data;
  }
  
  /**
   * Payment Service calls
   */
  async createPaymentIntent(paymentData) {
    const response = await this.callService('payment-intent-service', '/payment-intents', {
      method: 'POST',
      data: paymentData
    });
    return response.data;
  }
  
  /**
   * Document Processing Service calls
   */
  async processDocument(documentData) {
    const response = await this.callService('document-processing-service', '/process', {
      method: 'POST',
      data: documentData,
      timeout: 120000 // Document processing can take longer
    });
    return response.data;
  }
  
  /**
   * Authentication Service calls
   */
  async authenticateUser(credentials) {
    const response = await this.callService('authentication-service', '/authenticate', {
      method: 'POST',
      data: credentials
    });
    return response.data;
  }
  
  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  logEvent(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      projectId: this.projectId,
      environment: this.environment
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  /**
   * Get service registry for debugging
   */
  getServiceRegistry() {
    return Object.fromEntries(this.serviceRegistry);
  }
  
  /**
   * Get circuit breaker status for all services
   */
  getCircuitBreakerStatus() {
    const status = {};
    this.circuitBreakers.forEach((breaker, serviceName) => {
      status[serviceName] = {
        state: breaker.state,
        stats: breaker.stats
      };
    });
    return status;
  }
}

module.exports = ServiceCommunicator;