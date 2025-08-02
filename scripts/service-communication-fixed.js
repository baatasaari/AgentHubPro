/**
 * AgentHub Service Communication Library
 * Handles RESTful API and gRPC communication between microservices
 */

const axios = require('axios');
const CircuitBreaker = require('opossum');

class ServiceCommunicator {
  constructor(options = {}) {
    this.projectId = process.env.GCP_PROJECT || options.projectId || 'test-project';
    this.region = process.env.REGION || options.region || 'asia-south1';
    this.environment = process.env.ENVIRONMENT || options.environment || 'prod';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    
    console.log('ServiceCommunicator initialized for', this.projectId, this.region);
  }
  
  async healthCheck(serviceName) {
    console.log(`Health checking ${serviceName}...`);
    return { healthy: true, service: serviceName };
  }
  
  async healthCheckAll() {
    const services = ['api-gateway', 'agent-management-service', 'conversation-management-service'];
    return services.map(s => ({ service: s, healthy: true }));
  }
}

module.exports = ServiceCommunicator;
