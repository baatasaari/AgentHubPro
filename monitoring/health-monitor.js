#!/usr/bin/env node

/**
 * AgentHub Microservices Health Monitor
 * Continuously monitors all 29 microservices and reports health status
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  project: process.env.GCP_PROJECT || 'your-project-id',
  region: process.env.REGION || 'asia-south1',
  environment: process.env.ENVIRONMENT || 'prod',
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60000, // 1 minute
  timeout: parseInt(process.env.TIMEOUT) || 5000, // 5 seconds
  retries: parseInt(process.env.RETRIES) || 3
};

// All microservices to monitor
const microservices = [
  // API Gateway (Public)
  { name: 'api-gateway', port: 8000, critical: true, public: true },
  
  // Knowledge Management Domain
  { name: 'document-processing-service', port: 8001, critical: false, public: false },
  { name: 'embedding-generation-service', port: 8002, critical: true, public: false },
  { name: 'similarity-search-service', port: 8010, critical: true, public: false },
  { name: 'knowledge-base-service', port: 8011, critical: true, public: false },
  { name: 'faq-management-service', port: 8013, critical: false, public: false },
  { name: 'rag-query-service', port: 8111, critical: true, public: false },
  
  // Payment Processing Domain
  { name: 'payment-intent-service', port: 8003, critical: true, public: false },
  { name: 'payment-link-service', port: 8015, critical: false, public: false },
  { name: 'metrics-collection-service', port: 8023, critical: false, public: false },
  { name: 'billing-calculation-service', port: 8119, critical: false, public: false },
  
  // Calendar & Booking Domain
  { name: 'slot-management-service', port: 8004, critical: false, public: false },
  { name: 'booking-management-service', port: 8021, critical: true, public: false },
  { name: 'calendar-provider-service', port: 8120, critical: false, public: false },
  { name: 'notification-service', port: 8005, critical: false, public: false },
  
  // Core Business Logic Domain
  { name: 'agent-management-service', port: 8101, critical: true, public: false },
  { name: 'conversation-management-service', port: 8102, critical: true, public: false },
  { name: 'widget-generation-service', port: 8104, critical: true, public: false },
  { name: 'usage-analytics-service', port: 8103, critical: true, public: false },
  
  // Analytics & Insights Domain
  { name: 'analytics-calculation-service', port: 8107, critical: false, public: false },
  { name: 'insights-generation-service', port: 8125, critical: false, public: false },
  { name: 'data-storage-service', port: 8128, critical: true, public: false },
  { name: 'system-health-service', port: 8106, critical: true, public: false },
  
  // Platform Infrastructure Domain
  { name: 'configuration-service', port: 8030, critical: true, public: false },
  { name: 'response-generation-service', port: 8012, critical: true, public: false },
  { name: 'service-discovery-service', port: 8027, critical: true, public: false },
  { name: 'authentication-service', port: 8031, critical: true, public: false },
  { name: 'database-operations-service', port: 8028, critical: true, public: false },
  { name: 'logging-service', port: 8033, critical: false, public: false },
  { name: 'industry-configuration-service', port: 8105, critical: false, public: false },
  
  // Communication & Processing
  { name: 'conversation-processing-service', port: 8126, critical: true, public: false }
];

// Health status tracking
const healthStatus = new Map();
const alerts = new Set();

// Utility functions
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Get service URL for Cloud Run
function getServiceUrl(serviceName) {
  // Format: https://service-name-HASH-REGION.a.run.app
  // In practice, you'd get this from gcloud or service discovery
  const regionCode = config.region.split('-').slice(0, 2).join('');
  return `https://${serviceName}-hash-${regionCode}.a.run.app`;
}

// Get access token for authenticated requests
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec('gcloud auth print-access-token', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Perform health check on a single service
async function checkServiceHealth(service, accessToken) {
  return new Promise((resolve) => {
    const url = getServiceUrl(service.name);
    const healthUrl = `${url}/health`;
    
    const options = {
      timeout: config.timeout,
      headers: {}
    };
    
    // Add authentication for private services
    if (!service.public && accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const startTime = Date.now();
    
    const req = https.get(healthUrl, options, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const isHealthy = res.statusCode === 200;
        resolve({
          service: service.name,
          healthy: isHealthy,
          statusCode: res.statusCode,
          responseTime,
          response: data,
          url: healthUrl,
          critical: service.critical
        });
      });
    });
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        service: service.name,
        healthy: false,
        error: error.message,
        responseTime,
        url: healthUrl,
        critical: service.critical
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        service: service.name,
        healthy: false,
        error: 'Timeout',
        responseTime,
        url: healthUrl,
        critical: service.critical
      });
    });
    
    req.setTimeout(config.timeout);
  });
}

// Check all services
async function checkAllServices() {
  logInfo('Starting health check cycle...');
  
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    logWarning('Could not get access token, skipping private service checks');
  }
  
  const startTime = Date.now();
  const promises = microservices.map(service => checkServiceHealth(service, accessToken));
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  // Process results
  let healthyCount = 0;
  let criticalDown = 0;
  
  results.forEach(result => {
    const previousStatus = healthStatus.get(result.service);
    healthStatus.set(result.service, result);
    
    if (result.healthy) {
      healthyCount++;
      logSuccess(`${result.service}: OK (${result.responseTime}ms)`);
      
      // Clear alert if service recovered
      if (previousStatus && !previousStatus.healthy) {
        alerts.delete(result.service);
        logInfo(`${result.service} has recovered!`);
      }
    } else {
      const errorMsg = result.error || `HTTP ${result.statusCode}`;
      
      if (result.critical) {
        criticalDown++;
        logError(`${result.service}: CRITICAL - ${errorMsg} (${result.responseTime}ms)`);
        
        // Add new alert
        if (!alerts.has(result.service)) {
          alerts.add(result.service);
          sendAlert(result);
        }
      } else {
        logWarning(`${result.service}: DOWN - ${errorMsg} (${result.responseTime}ms)`);
      }
    }
  });
  
  // Summary
  const healthPercent = Math.round((healthyCount / microservices.length) * 100);
  const summaryColor = healthPercent >= 90 ? colors.green : 
                      healthPercent >= 70 ? colors.yellow : colors.red;
  
  log(`\n📊 Health Summary: ${healthyCount}/${microservices.length} services healthy (${healthPercent}%)`, summaryColor);
  log(`⏱️  Check completed in ${totalTime}ms`);
  
  if (criticalDown > 0) {
    logError(`🚨 ${criticalDown} critical services are down!`);
  }
  
  log('─'.repeat(80));
}

// Send alert (implement your preferred notification method)
function sendAlert(result) {
  const alertMessage = `🚨 CRITICAL SERVICE DOWN: ${result.service}\nError: ${result.error || 'HTTP ' + result.statusCode}\nURL: ${result.url}`;
  
  // Log to console
  logError(alertMessage);
  
  // TODO: Implement actual alerting (Slack, PagerDuty, email, etc.)
  // Example: sendSlackAlert(alertMessage);
  // Example: sendPagerDutyAlert(result);
}

// Generate detailed health report
function generateHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    environment: config.environment,
    totalServices: microservices.length,
    healthyServices: 0,
    criticalServices: 0,
    criticalDown: 0,
    services: []
  };
  
  healthStatus.forEach((status, serviceName) => {
    const service = microservices.find(s => s.name === serviceName);
    
    report.services.push({
      name: serviceName,
      healthy: status.healthy,
      critical: service?.critical || false,
      responseTime: status.responseTime,
      error: status.error,
      statusCode: status.statusCode,
      url: status.url
    });
    
    if (status.healthy) {
      report.healthyServices++;
    }
    
    if (service?.critical) {
      report.criticalServices++;
      if (!status.healthy) {
        report.criticalDown++;
      }
    }
  });
  
  return report;
}

// Web server for health dashboard
function startHealthDashboard() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health-report' || req.url === '/') {
      const report = generateHealthReport();
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(report, null, 2));
      
    } else if (req.url === '/health-dashboard') {
      // Simple HTML dashboard
      const report = generateHealthReport();
      const healthPercent = Math.round((report.healthyServices / report.totalServices) * 100);
      
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AgentHub Health Dashboard</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .service { background: #fff; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ddd; }
        .healthy { border-left-color: #4CAF50; }
        .unhealthy { border-left-color: #f44336; }
        .critical { background: #ffebee; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { background: #fff; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
        .health-${healthPercent >= 90 ? 'good' : healthPercent >= 70 ? 'warning' : 'critical'} { color: ${healthPercent >= 90 ? '#4CAF50' : healthPercent >= 70 ? '#FF9800' : '#f44336'}; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 AgentHub Microservices Health Dashboard</h1>
        <p>Environment: ${report.environment} | Last Updated: ${report.timestamp}</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <h2 class="health-${healthPercent >= 90 ? 'good' : healthPercent >= 70 ? 'warning' : 'critical'}">${healthPercent}%</h2>
            <p>Overall Health</p>
        </div>
        <div class="stat">
            <h2>${report.healthyServices}/${report.totalServices}</h2>
            <p>Services Online</p>
        </div>
        <div class="stat">
            <h2 style="color: ${report.criticalDown > 0 ? '#f44336' : '#4CAF50'}">${report.criticalServices - report.criticalDown}/${report.criticalServices}</h2>
            <p>Critical Services</p>
        </div>
    </div>
    
    <div class="services">
        ${report.services.map(service => `
            <div class="service ${service.healthy ? 'healthy' : 'unhealthy'} ${service.critical ? 'critical' : ''}">
                <strong>${service.name}</strong>
                <span style="float: right;">
                    ${service.healthy ? '✅' : '❌'} 
                    ${service.responseTime}ms
                    ${service.critical ? '🔴 CRITICAL' : ''}
                </span>
                <br>
                <small>${service.url}</small>
                ${service.error ? `<br><span style="color: #f44336;">Error: ${service.error}</span>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  const port = process.env.MONITOR_PORT || 3000;
  server.listen(port, () => {
    logInfo(`Health dashboard available at http://localhost:${port}/health-dashboard`);
    logInfo(`Health API available at http://localhost:${port}/health-report`);
  });
}

// Main execution
async function main() {
  logInfo('🏥 AgentHub Microservices Health Monitor starting...');
  logInfo(`Monitoring ${microservices.length} services every ${config.checkInterval/1000} seconds`);
  logInfo(`Environment: ${config.environment}`);
  logInfo(`Region: ${config.region}`);
  
  // Start web dashboard
  startHealthDashboard();
  
  // Initial health check
  await checkAllServices();
  
  // Set up periodic checks
  setInterval(async () => {
    try {
      await checkAllServices();
    } catch (error) {
      logError(`Health check failed: ${error.message}`);
    }
  }, config.checkInterval);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    logInfo('Health monitor shutting down...');
    process.exit(0);
  });
}

// Start the monitor
if (require.main === module) {
  main().catch(error => {
    logError(`Monitor startup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkServiceHealth,
  checkAllServices,
  generateHealthReport,
  microservices
};