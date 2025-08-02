/**
 * AgentHub gRPC Communication Setup
 * Configures gRPC for high-performance, low-latency communication between microservices
 * Complements RESTful APIs for critical real-time operations
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');

// gRPC Service Definitions
const GRPC_SERVICES = {
  // High-frequency services that benefit from gRPC
  'conversation-processing': {
    port: 9001,
    methods: ['ProcessMessage', 'StreamConversation', 'GetConversationState'],
    highThroughput: true
  },
  'rag-query': {
    port: 9002,
    methods: ['QueryKnowledge', 'SearchSimilar', 'StreamResults'],
    highThroughput: true
  },
  'embedding-generation': {
    port: 9003,
    methods: ['GenerateEmbedding', 'BatchEmbedding', 'StreamEmbedding'],
    highThroughput: true
  },
  'response-generation': {
    port: 9004,
    methods: ['GenerateResponse', 'StreamResponse', 'GetModelInfo'],
    highThroughput: true
  },
  'analytics-calculation': {
    port: 9005,
    methods: ['CalculateMetrics', 'StreamAnalytics', 'GetInsights'],
    highThroughput: false
  }
};

class GRPCCommunicationManager {
  constructor(options = {}) {
    this.projectId = process.env.GCP_PROJECT || options.projectId;
    this.region = process.env.REGION || options.region || 'asia-south1';
    this.environment = process.env.ENVIRONMENT || options.environment || 'prod';
    
    this.servers = new Map();
    this.clients = new Map();
    this.protoPath = path.join(__dirname, '../proto');
    
    this.initializeProtoDefinitions();
  }
  
  /**
   * Initialize Protocol Buffer definitions for all services
   */
  initializeProtoDefinitions() {
    // Ensure proto directory exists
    if (!fs.existsSync(this.protoPath)) {
      fs.mkdirSync(this.protoPath, { recursive: true });
    }
    
    // Generate proto files for each service
    Object.keys(GRPC_SERVICES).forEach(serviceName => {
      this.generateProtoFile(serviceName);
    });
    
    console.log('✓ gRPC Protocol Buffer definitions initialized');
  }
  
  /**
   * Generate Protocol Buffer definition for a service
   */
  generateProtoFile(serviceName) {
    const service = GRPC_SERVICES[serviceName];
    const protoFile = path.join(this.protoPath, `${serviceName}.proto`);
    
    let protoContent = `
syntax = "proto3";

package agenthub.${serviceName.replace('-', '')};

option go_package = "github.com/agenthub/${serviceName}";

// Common message types
message HealthRequest {}
message HealthResponse {
  string status = 1;
  string service = 2;
  int64 timestamp = 3;
}

message ErrorResponse {
  string code = 1;
  string message = 2;
  repeated string details = 3;
}

// Service-specific messages and methods
`;
    
    // Add service-specific proto definitions
    switch (serviceName) {
      case 'conversation-processing':
        protoContent += `
message ProcessMessageRequest {
  string conversation_id = 1;
  string message = 2;
  string user_id = 3;
  string agent_id = 4;
  map<string, string> context = 5;
}

message ProcessMessageResponse {
  string response = 1;
  string conversation_id = 2;
  int64 processing_time_ms = 3;
  bool requires_human = 4;
  repeated string suggested_actions = 5;
}

message StreamConversationRequest {
  string conversation_id = 1;
  bool include_history = 2;
}

message ConversationEvent {
  string event_type = 1;
  string data = 2;
  int64 timestamp = 3;
}

service ConversationProcessingService {
  rpc ProcessMessage(ProcessMessageRequest) returns (ProcessMessageResponse);
  rpc StreamConversation(StreamConversationRequest) returns (stream ConversationEvent);
  rpc Health(HealthRequest) returns (HealthResponse);
}`;
        break;
        
      case 'rag-query':
        protoContent += `
message QueryKnowledgeRequest {
  string query = 1;
  string agent_id = 2;
  int32 max_results = 3;
  float similarity_threshold = 4;
  repeated string filters = 5;
}

message QueryKnowledgeResponse {
  repeated KnowledgeResult results = 1;
  float confidence_score = 2;
  int64 processing_time_ms = 3;
}

message KnowledgeResult {
  string content = 1;
  float similarity_score = 2;
  string source = 3;
  map<string, string> metadata = 4;
}

message SearchSimilarRequest {
  string text = 1;
  string knowledge_base_id = 2;
  int32 limit = 3;
}

service RAGQueryService {
  rpc QueryKnowledge(QueryKnowledgeRequest) returns (QueryKnowledgeResponse);
  rpc SearchSimilar(SearchSimilarRequest) returns (QueryKnowledgeResponse);
  rpc StreamResults(QueryKnowledgeRequest) returns (stream KnowledgeResult);
  rpc Health(HealthRequest) returns (HealthResponse);
}`;
        break;
        
      case 'embedding-generation':
        protoContent += `
message GenerateEmbeddingRequest {
  string text = 1;
  string model = 2;
  string embedding_type = 3;
}

message GenerateEmbeddingResponse {
  repeated float embedding = 1;
  int32 dimensions = 2;
  int64 processing_time_ms = 3;
}

message BatchEmbeddingRequest {
  repeated string texts = 1;
  string model = 2;
  string embedding_type = 3;
}

message BatchEmbeddingResponse {
  repeated GenerateEmbeddingResponse embeddings = 1;
  int64 total_processing_time_ms = 2;
}

service EmbeddingGenerationService {
  rpc GenerateEmbedding(GenerateEmbeddingRequest) returns (GenerateEmbeddingResponse);
  rpc BatchEmbedding(BatchEmbeddingRequest) returns (BatchEmbeddingResponse);
  rpc StreamEmbedding(BatchEmbeddingRequest) returns (stream GenerateEmbeddingResponse);
  rpc Health(HealthRequest) returns (HealthResponse);
}`;
        break;
        
      case 'response-generation':
        protoContent += `
message GenerateResponseRequest {
  string prompt = 1;
  string model = 2;
  int32 max_tokens = 3;
  float temperature = 4;
  repeated string context = 5;
  string agent_id = 6;
}

message GenerateResponseResponse {
  string response = 1;
  int32 tokens_used = 2;
  float confidence = 3;
  int64 processing_time_ms = 4;
}

message StreamResponseRequest {
  GenerateResponseRequest request = 1;
  bool enable_streaming = 2;
}

message ResponseChunk {
  string chunk = 1;
  bool is_final = 2;
  int32 sequence = 3;
}

service ResponseGenerationService {
  rpc GenerateResponse(GenerateResponseRequest) returns (GenerateResponseResponse);
  rpc StreamResponse(StreamResponseRequest) returns (stream ResponseChunk);
  rpc Health(HealthRequest) returns (HealthResponse);
}`;
        break;
        
      case 'analytics-calculation':
        protoContent += `
message CalculateMetricsRequest {
  string agent_id = 1;
  string time_range = 2;
  repeated string metric_types = 3;
}

message CalculateMetricsResponse {
  map<string, float> metrics = 1;
  int64 calculation_time_ms = 2;
  string time_range = 3;
}

message StreamAnalyticsRequest {
  string agent_id = 1;
  bool real_time = 2;
}

message AnalyticsEvent {
  string metric_name = 1;
  float value = 2;
  int64 timestamp = 3;
  map<string, string> labels = 4;
}

service AnalyticsCalculationService {
  rpc CalculateMetrics(CalculateMetricsRequest) returns (CalculateMetricsResponse);
  rpc StreamAnalytics(StreamAnalyticsRequest) returns (stream AnalyticsEvent);
  rpc Health(HealthRequest) returns (HealthResponse);
}`;
        break;
    }
    
    fs.writeFileSync(protoFile, protoContent);
    console.log(`✓ Generated proto file: ${protoFile}`);
  }
  
  /**
   * Create gRPC server for a service
   */
  createGRPCServer(serviceName, implementations) {
    const service = GRPC_SERVICES[serviceName];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    const protoFile = path.join(this.protoPath, `${serviceName}.proto`);
    
    // Load proto definition
    const packageDefinition = protoLoader.loadSync(protoFile, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const servicePackage = protoDescriptor.agenthub[serviceName.replace('-', '')];
    
    // Create server
    const server = new grpc.Server({
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 5000,
      'grpc.keepalive_permit_without_calls': true,
      'grpc.http2.max_pings_without_data': 0,
      'grpc.http2.min_time_between_pings_ms': 10000,
      'grpc.http2.min_ping_interval_without_data_ms': 30000
    });
    
    // Add service implementation
    const serviceDef = servicePackage[this.getServiceClassName(serviceName)];
    server.addService(serviceDef.service, implementations);
    
    // Add health check
    if (!implementations.Health) {
      implementations.Health = (call, callback) => {
        callback(null, {
          status: 'SERVING',
          service: serviceName,
          timestamp: Date.now()
        });
      };
    }
    
    // Bind server to port
    const address = `0.0.0.0:${service.port}`;
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        console.error(`Failed to start gRPC server for ${serviceName}:`, error);
        return;
      }
      
      console.log(`✓ gRPC server for ${serviceName} listening on port ${port}`);
      server.start();
    });
    
    this.servers.set(serviceName, server);
    return server;
  }
  
  /**
   * Create gRPC client for a service
   */
  createGRPCClient(serviceName) {
    const service = GRPC_SERVICES[serviceName];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    const protoFile = path.join(this.protoPath, `${serviceName}.proto`);
    
    // Load proto definition
    const packageDefinition = protoLoader.loadSync(protoFile, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const servicePackage = protoDescriptor.agenthub[serviceName.replace('-', '')];
    
    // Create client
    const ServiceClient = servicePackage[this.getServiceClassName(serviceName)];
    const client = new ServiceClient(
      `localhost:${service.port}`, // In production, use service discovery
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': true
      }
    );
    
    this.clients.set(serviceName, client);
    return client;
  }
  
  /**
   * Get service class name from service name
   */
  getServiceClassName(serviceName) {
    return serviceName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Service';
  }
  
  /**
   * Health check for gRPC service
   */
  async healthCheck(serviceName) {
    const client = this.clients.get(serviceName) || this.createGRPCClient(serviceName);
    
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);
      
      client.Health({}, { deadline }, (error, response) => {
        if (error) {
          resolve({
            service: serviceName,
            healthy: false,
            error: error.message,
            protocol: 'gRPC'
          });
        } else {
          resolve({
            service: serviceName,
            healthy: true,
            status: response.status,
            protocol: 'gRPC'
          });
        }
      });
    });
  }
  
  /**
   * Setup interceptors for authentication and monitoring
   */
  setupInterceptors() {
    // Authentication interceptor
    const authInterceptor = (options, nextCall) => {
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          // Add authentication metadata
          const accessToken = process.env.ACCESS_TOKEN;
          if (accessToken) {
            metadata.set('authorization', `Bearer ${accessToken}`);
          }
          metadata.set('user-agent', 'AgentHub-gRPC/1.0');
          next(metadata, listener);
        }
      });
    };
    
    // Monitoring interceptor
    const monitoringInterceptor = (options, nextCall) => {
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          const startTime = Date.now();
          
          const newListener = {
            onReceiveMessage: (message, next) => {
              const duration = Date.now() - startTime;
              console.log(`gRPC call completed in ${duration}ms`);
              next(message);
            },
            onReceiveStatus: (status, next) => {
              const duration = Date.now() - startTime;
              console.log(`gRPC call status: ${status.code}, duration: ${duration}ms`);
              next(status);
            }
          };
          
          next(metadata, newListener);
        }
      });
    };
    
    return [authInterceptor, monitoringInterceptor];
  }
  
  /**
   * Example service implementations
   */
  getExampleImplementations() {
    return {
      'conversation-processing': {
        ProcessMessage: (call, callback) => {
          const request = call.request;
          
          // Simulate processing
          setTimeout(() => {
            callback(null, {
              response: `Processed: ${request.message}`,
              conversation_id: request.conversation_id,
              processing_time_ms: 150,
              requires_human: false,
              suggested_actions: ['continue', 'escalate']
            });
          }, 100);
        },
        
        StreamConversation: (call) => {
          const request = call.request;
          
          // Simulate streaming events
          let eventCount = 0;
          const interval = setInterval(() => {
            call.write({
              event_type: 'message',
              data: `Event ${eventCount} for ${request.conversation_id}`,
              timestamp: Date.now()
            });
            
            eventCount++;
            if (eventCount >= 5) {
              clearInterval(interval);
              call.end();
            }
          }, 1000);
        }
      },
      
      'rag-query': {
        QueryKnowledge: (call, callback) => {
          const request = call.request;
          
          // Simulate knowledge retrieval
          setTimeout(() => {
            callback(null, {
              results: [
                {
                  content: `Knowledge result for: ${request.query}`,
                  similarity_score: 0.95,
                  source: 'knowledge_base_1',
                  metadata: { category: 'general' }
                }
              ],
              confidence_score: 0.95,
              processing_time_ms: 200
            });
          }, 150);
        }
      }
    };
  }
  
  /**
   * Start all gRPC services
   */
  startAllServices() {
    const implementations = this.getExampleImplementations();
    
    Object.keys(GRPC_SERVICES).forEach(serviceName => {
      if (implementations[serviceName]) {
        this.createGRPCServer(serviceName, implementations[serviceName]);
      }
    });
    
    console.log('✓ All gRPC services started');
  }
  
  /**
   * Stop all gRPC services
   */
  stopAllServices() {
    this.servers.forEach((server, serviceName) => {
      server.tryShutdown((error) => {
        if (error) {
          console.error(`Error stopping ${serviceName}:`, error);
        } else {
          console.log(`✓ Stopped gRPC service: ${serviceName}`);
        }
      });
    });
    
    this.clients.forEach((client, serviceName) => {
      client.close();
      console.log(`✓ Closed gRPC client: ${serviceName}`);
    });
  }
  
  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      servers: this.servers.size,
      clients: this.clients.size,
      services: Object.keys(GRPC_SERVICES),
      protoPath: this.protoPath
    };
  }
}

module.exports = GRPCCommunicationManager;
module.exports.GRPCCommunicationManager = GRPCCommunicationManager;

// Example usage and testing
if (require.main === module) {
  const manager = new GRPCCommunicationManager();
  
  // Start services
  manager.startAllServices();
  
  // Test clients after a delay
  setTimeout(async () => {
    console.log('\nTesting gRPC services...');
    
    for (const serviceName of Object.keys(GRPC_SERVICES)) {
      try {
        const result = await manager.healthCheck(serviceName);
        console.log(`${serviceName}: ${result.healthy ? '✓' : '✗'} ${result.error || result.status}`);
      } catch (error) {
        console.log(`${serviceName}: ✗ ${error.message}`);
      }
    }
  }, 2000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gRPC services...');
    manager.stopAllServices();
    process.exit(0);
  });
}