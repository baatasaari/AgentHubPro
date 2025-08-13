// Agent Wizard Test Runner - Execute comprehensive tests
import { agentWizardTester } from './test-agent-wizard-comprehensive.js';

async function runAgentWizardTests() {
  console.log('🚀 AGENT WIZARD COMPREHENSIVE TESTING');
  console.log('=====================================');
  console.log('Starting end-to-end tests across all platforms...\n');

  // Add some delay to ensure server is ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    await agentWizardTester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
runAgentWizardTests().catch(console.error);