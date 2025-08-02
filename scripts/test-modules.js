// Test script to verify module loading
try {
  console.log('Testing module loading...');
  
  // Test service-communication
  const serviceComm = require('./service-communication');
  console.log('service-communication type:', typeof serviceComm);
  console.log('service-communication keys:', Object.keys(serviceComm));
  
  if (typeof serviceComm === 'function') {
    const comm = new serviceComm({ projectId: 'test' });
    console.log('✓ ServiceCommunicator (direct) works');
  }
  
  if (serviceComm.ServiceCommunicator) {
    const comm = new serviceComm.ServiceCommunicator({ projectId: 'test' });
    console.log('✓ ServiceCommunicator (property) works');
  }
  
} catch (e) {
  console.log('✗ Error:', e.message);
}