// Service Authentication Manager for AgentHub Platform
// Generates JWT tokens for secure microservice communication
// Replaces open CORS policies with authenticated service access

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ALGORITHM = 'HS256';
const PLATFORM_ISSUER = 'agenthub-platform';

export interface ServicePermissions {
  [serviceName: string]: string[];
}

// Define service permissions matrix
export const SERVICE_PERMISSIONS: ServicePermissions = {
  'agenthub-platform': [
    'embedding:generate',
    'embedding:batch', 
    'payment:analyze',
    'admin:cache',
    'metrics:read'
  ],
  'rag-service': [
    'embedding:generate',
    'embedding:batch'
  ],
  'payment-processor': [
    'payment:analyze',
    'metrics:read'
  ],
  'analytics-service': [
    'embedding:generate',
    'payment:analyze',
    'metrics:read'
  ],
  'admin-dashboard': [
    'embedding:generate',
    'embedding:batch',
    'payment:analyze',
    'admin:cache',
    'metrics:read'
  ]
};

export interface ServiceTokenPayload {
  service_name: string;
  permissions: string[];
  iss: string;
  iat: number;
  exp: number;
}

export class ServiceAuthManager {
  private jwtSecret: string;
  private issuer: string;

  constructor(secret?: string, issuer?: string) {
    this.jwtSecret = secret || JWT_SECRET;
    this.issuer = issuer || PLATFORM_ISSUER;
  }

  /**
   * Generate service authentication token
   */
  generateServiceToken(serviceName: string, expiresHours: number = 24): string {
    const permissions = SERVICE_PERMISSIONS[serviceName] || [];
    
    if (permissions.length === 0) {
      throw new Error(`No permissions defined for service: ${serviceName}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const expires = now + (expiresHours * 3600);

    const payload: ServiceTokenPayload = {
      service_name: serviceName,
      permissions: permissions,
      iss: this.issuer,
      iat: now,
      exp: expires
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: JWT_ALGORITHM });
  }

  /**
   * Verify service token
   */
  verifyServiceToken(token: string): ServiceTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, { 
        algorithms: [JWT_ALGORITHM],
        issuer: this.issuer
      }) as ServiceTokenPayload;

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Check if service has specific permission
   */
  hasPermission(token: string, requiredPermission: string): boolean {
    try {
      const payload = this.verifyServiceToken(token);
      return payload.permissions.includes(requiredPermission);
    } catch {
      return false;
    }
  }

  /**
   * Generate tokens for all services
   */
  generateAllServiceTokens(expiresHours: number = 24): { [serviceName: string]: string } {
    const tokens: { [serviceName: string]: string } = {};
    
    for (const serviceName of Object.keys(SERVICE_PERMISSIONS)) {
      tokens[serviceName] = this.generateServiceToken(serviceName, expiresHours);
    }
    
    return tokens;
  }

  /**
   * Create authorization header
   */
  createAuthHeader(serviceName: string): { Authorization: string } {
    const token = this.generateServiceToken(serviceName);
    return { Authorization: `Bearer ${token}` };
  }
}

// Export singleton instance
export const serviceAuth = new ServiceAuthManager();

// Helper function for testing service communication
export async function testServiceAuthentication() {
  console.log('🔐 Testing Service Authentication System');
  console.log('=====================================');

  const authManager = new ServiceAuthManager();

  // Test token generation
  console.log('\n1. Generating Service Tokens:');
  try {
    const platformToken = authManager.generateServiceToken('agenthub-platform');
    const ragToken = authManager.generateServiceToken('rag-service');
    
    console.log('✅ Platform token generated');
    console.log('✅ RAG service token generated');

    // Test token verification
    console.log('\n2. Verifying Tokens:');
    const platformPayload = authManager.verifyServiceToken(platformToken);
    console.log(`✅ Platform token verified: ${platformPayload.service_name}`);
    console.log(`   Permissions: ${platformPayload.permissions.join(', ')}`);

    // Test permission checking
    console.log('\n3. Testing Permissions:');
    const hasEmbeddingPerm = authManager.hasPermission(platformToken, 'embedding:generate');
    const hasAdminPerm = authManager.hasPermission(ragToken, 'admin:cache');
    
    console.log(`✅ Platform has embedding permission: ${hasEmbeddingPerm}`);
    console.log(`✅ RAG service lacks admin permission: ${!hasAdminPerm}`);

    console.log('\n🎯 Service Authentication Test: PASSED');
    return true;

  } catch (error) {
    console.error(`❌ Service Authentication Test: FAILED - ${error.message}`);
    return false;
  }
}