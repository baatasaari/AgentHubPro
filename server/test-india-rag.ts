// Test India-specific RAG system functionality
import { loadAllIndustryKnowledge } from './industry-knowledge';
import { ragRoutes } from './rag';

async function testIndiaSpecificRAG() {
  console.log('🇮🇳 Testing India-specific RAG system...');
  
  // Load India-specific knowledge
  await loadAllIndustryKnowledge();
  
  const testCases = [
    {
      industry: 'retail',
      query: 'What are your store timings and UPI payment options?',
      expectedTerms: ['10:00 AM', '9:00 PM', 'UPI', 'PhonePe', 'Google Pay', 'GST']
    },
    {
      industry: 'finance', 
      query: 'Home loan interest rates and maximum loan amount in India?',
      expectedTerms: ['8.15%', '9.65%', '₹10 crores', 'home loans', 'HDFC', 'SBI']
    },
    {
      industry: 'legal',
      query: 'Legal consultation fees and services in India?', 
      expectedTerms: ['₹500', '₹1000', 'consultation', 'Bar Council', 'GST matters']
    },
    {
      industry: 'healthcare',
      query: 'Clinic timings consultation fees Ayushman Bharat insurance?',
      expectedTerms: ['9:00 AM', '7:00 PM', '₹500', '₹1500', 'Ayushman Bharat', 'WhatsApp']
    },
    {
      industry: 'automotive',
      query: 'Maruti Suzuki service oil change costs?',
      expectedTerms: ['Maruti Suzuki', '₹800', '₹1500', 'oil change', 'WhatsApp booking']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing ${testCase.industry.toUpperCase()} (India-specific) ---`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      // Search for relevant chunks
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
      
      const results = (searchResult as any).results || [];
      console.log(`Found ${results.length} relevant chunks`);
      
      if (results.length > 0) {
        const topResult = results[0];
        console.log(`✓ Top result: ${topResult.document_title}`);
        console.log(`✓ Relevance: ${(topResult.relevance_score * 100).toFixed(1)}%`);
        
        const content = topResult.content;
        const foundTerms = testCase.expectedTerms.filter(term => 
          content.toLowerCase().includes(term.toLowerCase())
        );
        
        console.log(`✓ India-specific terms found: ${foundTerms.join(', ')}`);
        if (foundTerms.length === 0) {
          console.log(`⚠️  Expected terms not found in: ${content.substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ No relevant chunks found for ${testCase.industry}`);
      }
      
      // Test complete RAG query
      const ragResponse = await new Promise((resolve, reject) => {
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
      
      const response = (ragResponse as any).response || '';
      const foundResponseTerms = testCase.expectedTerms.filter(term => 
        response.toLowerCase().includes(term.toLowerCase())
      );
      
      if (foundResponseTerms.length > 0) {
        console.log(`✅ RAG Response contains India-specific info: ${foundResponseTerms.join(', ')}`);
      } else {
        console.log(`⚠️  RAG Response lacks India-specific context`);
        console.log(`Response: ${response.substring(0, 150)}...`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.industry}:`, error);
    }
    
    console.log('─'.repeat(60));
  }
}

testIndiaSpecificRAG().then(() => {
  console.log('\n✅ India-specific RAG testing complete');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Testing failed:', err);
  process.exit(1);
});