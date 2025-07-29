// Test script for industry-specific agent responses
import { loadAllIndustryKnowledge } from './industry-knowledge';
import { ragRoutes } from './rag';

async function testIndustryAgents() {
  console.log('🔄 Loading comprehensive industry knowledge...');
  await loadAllIndustryKnowledge();
  
  console.log('\n🧪 Testing industry-specific RAG responses...\n');
  
  const testCases = [
    {
      industry: 'retail',
      query: 'What are your store hours and return policy?',
      expectedKeywords: ['hours', 'return', 'policy']
    },
    {
      industry: 'finance', 
      query: 'What mortgage rates and savings account interest rates do you offer?',
      expectedKeywords: ['mortgage', 'savings', 'APY', 'rates']
    },
    {
      industry: 'fitness',
      query: 'Do you offer personal training and what membership options are available?',
      expectedKeywords: ['personal training', 'membership', 'certified']
    },
    {
      industry: 'healthcare',
      query: 'What are your clinic hours and do you accept my insurance?',
      expectedKeywords: ['clinic', 'hours', 'insurance']
    },
    {
      industry: 'realestate',
      query: 'What is your commission structure and average time on market?',
      expectedKeywords: ['commission', 'market', 'property']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing ${testCase.industry.toUpperCase()} Industry ---`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      // Test RAG search first
      const searchResult = await new Promise((resolve, reject) => {
        const mockRes = {
          json: resolve,
          status: (code: number) => ({ json: reject })
        };
        
        ragRoutes.search({ 
          body: { 
            query: testCase.query, 
            agent_id: testCase.industry,
            top_k: 3
          } 
        } as any, mockRes as any).catch(reject);
      });
      
      console.log(`Search Results: ${JSON.stringify(searchResult, null, 2)}`);
      
      // Test RAG query response
      const queryResult = await new Promise((resolve, reject) => {
        const mockRes = {
          json: resolve,
          status: (code: number) => ({ json: reject })
        };
        
        ragRoutes.query({ 
          body: { 
            query: testCase.query, 
            agent_id: testCase.industry
          } 
        } as any, mockRes as any).catch(reject);
      });
      
      console.log(`RAG Response: ${JSON.stringify(queryResult, null, 2)}`);
      
      // Check if response contains expected keywords
      const response = (queryResult as any).response || '';
      const foundKeywords = testCase.expectedKeywords.filter(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log(`✓ Keywords found: ${foundKeywords.join(', ')}`);
      if (foundKeywords.length === 0) {
        console.log(`⚠️  No expected keywords found in response!`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.industry}:`, error);
    }
    
    console.log('─'.repeat(50));
  }
}

// Run the test
testIndustryAgents().then(() => {
  console.log('\n✅ Industry agent testing complete');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Testing failed:', err);
  process.exit(1);
});