/**
 * AgentHub gRPC Communication Manager - Working Version
 * Simplified for deployment validation
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

class GRPCCommunicationManager {
  constructor(options = {}) {
    this.projectId = options.projectId || 'test-project';
    this.region = options.region || 'asia-south1';
    this.services = new Map();
    this.clients = new Map();
    
    // Initialize gRPC services
    this.initializeGRPCServices();
  }
  
  initializeGRPCServices() {
    const grpcServices = [
      { name: 'rag-query-service', port: 9001 },
      { name: 'embedding-generation-service', port: 9002 },
      { name: 'conversation-processing-service', port: 9003 },
      { name: 'analytics-calculation-service', port: 9004 },
      { name: 'system-health-service', port: 9005 }
    ];
    
    grpcServices.forEach(service => {
      this.services.set(service.name, {
        host: `${service.name}-${this.projectId}.${this.region}.run.app`,
        port: service.port,
        proto: `./proto/${service.name}.proto`
      });
    });
  }
  
  async setupGRPCService(serviceName, protoPath) {
    try {
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });
      
      return { serviceName, status: 'configured', proto: protoPath };
    } catch (error) {
      return { serviceName, status: 'error', error: error.message };
    }
  }
  
  getServices() {
    return Object.fromEntries(this.services);
  }
}

module.exports = GRPCCommunicationManager;