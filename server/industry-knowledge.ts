// Industry-specific knowledge base for AgentHub platform
import { ragRoutes } from './rag';

export interface IndustryKnowledge {
  industry: string;
  documents: Array<{
    title: string;
    content: string;
    doc_type: string;
    source: string;
    metadata?: Record<string, any>;
  }>;
}

export const industryKnowledgeBases: IndustryKnowledge[] = [
  {
    industry: 'healthcare',
    documents: [
      {
        title: 'Healthcare Services and Patient Information',
        content: 'HealthCare Assistant Clinic Hours: Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 2:00 PM, Sunday: Closed. Emergency Services: 24/7 on-call team available at (555) 123-4567. Telehealth: Available during business hours and for emergency consultations. Appointment Booking: Call main line, use online portal, or mobile app. Insurance: We accept Blue Cross Blue Shield, Aetna, Cigna, Medicare, and most major plans. Specialties: Primary care, cardiology, dermatology, orthopedics, mental health services. Wait Times: Average 15 minutes for scheduled appointments, same-day appointments available. Patient Portal: Access test results, prescription refills, appointment scheduling 24/7.',
        doc_type: 'knowledge_base',
        source: 'healthcare_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'retail',
    documents: [
      {
        title: 'Retail Store Operations and Customer Service Guide',
        content: 'Store Hours: Monday-Saturday 9:00 AM - 9:00 PM, Sunday 10:00 AM - 7:00 PM. Return Policy: 30-day return window with receipt, 14 days for electronics. Product Categories: Clothing, Electronics, Home & Garden, Sports, Beauty, Books. Customer Service: Live chat available during store hours, phone support 8:00 AM - 10:00 PM. Loyalty Program: 5% cashback on purchases over $50, free shipping on orders over $75. Payment Methods: Cash, Credit/Debit Cards, PayPal, Apple Pay, Google Pay. Size Guide: Available for all clothing items, try-before-you-buy service. Gift Cards: Available in $25, $50, $100 denominations, no expiration date. Price Matching: We match competitor prices on identical items with proof.',
        doc_type: 'knowledge_base',
        source: 'retail_operations_guide',
        metadata: { priority: 'high', category: 'operations' }
      }
    ]
  },
  {
    industry: 'finance',
    documents: [
      {
        title: 'Financial Services and Banking Information',
        content: 'Banking Services: Checking Accounts (no minimum balance), Savings Accounts (2.5% APY), Certificate of Deposits (4.2% APY 12-month term). Loan Services: Personal loans up to $50,000, Home mortgages (30-year fixed 6.8%, 15-year fixed 6.2%), Auto loans (5.9% APR). Investment Services: Portfolio management, retirement planning, 401k rollovers. Branch Hours: Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 2:00 PM. ATM Network: 50,000+ fee-free ATMs nationwide. Online Banking: 24/7 access, mobile app available. Customer Support: 24/7 phone support, live chat during business hours. Credit Cards: Rewards card (2% cashback), travel card (3x points on travel), student card (no annual fee). Financial Planning: Free consultations, retirement planning, tax preparation services.',
        doc_type: 'knowledge_base',
        source: 'financial_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'realestate',
    documents: [
      {
        title: 'Real Estate Services and Property Information',
        content: 'Real Estate Services: Residential buying/selling, commercial properties, rental management, property valuation. Market Areas: Downtown (avg $450/sqft), Suburbs ($320/sqft), Waterfront ($650/sqft). Services Included: Professional photography, virtual tours, staging consultation, market analysis. Agent Availability: Monday-Saturday 8:00 AM - 8:00 PM, Sunday 10:00 AM - 6:00 PM, emergency showings available. Commission Structure: 6% total (3% listing, 3% buying agent), negotiable for luxury properties. Property Types: Single-family homes, condos, townhouses, multi-family properties, commercial buildings. Financing Partners: Work with 15+ local lenders, pre-approval assistance available. Average Time on Market: 35 days residential, 90 days commercial. Closing Services: Coordinate with title companies, home inspectors, appraisers.',
        doc_type: 'knowledge_base',
        source: 'real_estate_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'education',
    documents: [
      {
        title: 'Educational Institution Information and Services',
        content: 'Academic Programs: K-12 education, college prep courses, adult education, online learning platforms. Class Schedule: School hours 8:00 AM - 3:30 PM, after-school programs until 6:00 PM, weekend enrichment classes. Enrollment Process: Online application, placement tests, parent meetings, document verification. Tuition Fees: Elementary $8,500/year, Middle School $9,200/year, High School $11,500/year, payment plans available. Extracurricular Activities: Sports teams, music programs, debate club, science olympiad, art classes. Student Support: Counseling services, tutoring programs, special needs accommodation, college guidance. Campus Facilities: Library, science labs, computer center, gymnasium, cafeteria, playground. Teacher-Student Ratio: 1:15 elementary, 1:18 middle school, 1:20 high school. Academic Calendar: September-June, winter break, spring break, summer programs available.',
        doc_type: 'knowledge_base',
        source: 'education_services_guide',
        metadata: { priority: 'high', category: 'academics' }
      }
    ]
  },
  {
    industry: 'hospitality',
    documents: [
      {
        title: 'Hospitality and Hotel Services Guide',
        content: 'Hotel Services: 150 rooms (Standard, Deluxe, Suites), 24/7 front desk, concierge services, room service until 11:00 PM. Amenities: Outdoor pool, fitness center, business center, free WiFi, parking ($15/night valet, $8/night self). Dining: Restaurant (6:00 AM - 10:00 PM), sports bar (2:00 PM - midnight), coffee shop (5:30 AM - 11:00 AM). Meeting Facilities: 5 conference rooms (10-100 capacity), audiovisual equipment, catering services. Check-in/Check-out: 3:00 PM check-in, 11:00 AM check-out, early/late options available. Pet Policy: Pet-friendly rooms available ($75 fee), weight limit 50 lbs. Loyalty Program: Points for stays, free nights, room upgrades, late checkout. Local Attractions: Downtown shopping (0.5 miles), airport (12 miles), beach (3 miles), business district (1 mile). Event Services: Weddings, corporate events, banquet facilities for up to 200 guests.',
        doc_type: 'knowledge_base',
        source: 'hospitality_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'legal',
    documents: [
      {
        title: 'Legal Services and Practice Areas Information',
        content: 'Legal Practice Areas: Personal injury, family law, criminal defense, business law, estate planning, real estate law. Attorney Availability: Monday-Friday 8:00 AM - 6:00 PM, emergency consultations available 24/7. Consultation Process: Free 30-minute initial consultation, case evaluation, fee structure discussion. Fee Structure: Contingency fees (personal injury 33%), hourly rates ($250-$450/hour), flat fees (estate planning $1,500-$3,500). Court Representation: State and federal courts, appellate work, mediation and arbitration. Document Services: Contract review, will preparation, business formation, trademark applications. Client Communication: Regular case updates, online portal access, dedicated paralegal support. Payment Options: Payment plans available, major credit cards accepted, retainer agreements. Success Rate: 90% favorable outcomes in personal injury cases, 85% successful business transactions. Professional Credentials: Licensed in multiple states, AV-rated attorneys, board certifications.',
        doc_type: 'knowledge_base',
        source: 'legal_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'automotive',
    documents: [
      {
        title: 'Automotive Services and Vehicle Information',
        content: 'Automotive Services: New and used car sales, auto repair, maintenance services, parts department. Service Hours: Monday-Friday 7:00 AM - 7:00 PM, Saturday 8:00 AM - 5:00 PM, Sunday closed. Vehicle Brands: Ford, Chevrolet, Toyota, Honda, BMW, Mercedes-Benz, certified pre-owned vehicles. Financing Options: 0% APR financing available, lease options, trade-in evaluations, extended warranties. Service Department: Oil changes ($29.95), brake service, transmission repair, diagnostic testing, state inspections. Parts Department: OEM and aftermarket parts, online ordering, installation services, parts warranty. Customer Amenities: Free WiFi, coffee, shuttle service within 5 miles, loaner cars available. Warranty Coverage: New vehicles (3 years/36,000 miles bumper-to-bumper), certified pre-owned (12 months/12,000 miles). Special Offers: Military discounts, student incentives, loyalty program, seasonal promotions. Service Appointments: Online scheduling, text notifications, service reminders, pickup/delivery service.',
        doc_type: 'knowledge_base',
        source: 'automotive_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'technology',
    documents: [
      {
        title: 'Technology Services and IT Solutions Guide',
        content: 'Technology Services: Software development, web design, cloud solutions, cybersecurity, IT consulting, data analytics. Service Hours: Monday-Friday 8:00 AM - 6:00 PM, 24/7 emergency support available. Development Platforms: React, Angular, Python, Node.js, Java, .NET, mobile app development (iOS/Android). Cloud Services: AWS, Azure, Google Cloud migrations, hybrid cloud solutions, disaster recovery. Cybersecurity: Penetration testing, security audits, compliance (HIPAA, SOX, PCI-DSS), employee training. Support Services: Help desk, remote monitoring, on-site support, hardware procurement, software licensing. Project Management: Agile methodology, dedicated project managers, weekly progress reports, milestone deliveries. Pricing Models: Fixed price projects, hourly rates ($95-$175/hour), monthly retainers, maintenance contracts. Client Portfolio: Startups to Fortune 500, healthcare, finance, education, e-commerce sectors. Technology Stack: Latest frameworks, DevOps practices, automated testing, continuous integration/deployment.',
        doc_type: 'knowledge_base',
        source: 'technology_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'consulting',
    documents: [
      {
        title: 'Business Consulting Services and Expertise Areas',
        content: 'Consulting Services: Strategic planning, operations improvement, financial advisory, human resources, marketing strategy, digital transformation. Industry Expertise: Manufacturing, healthcare, technology, retail, financial services, non-profit organizations. Engagement Types: Project-based consulting, interim management, training workshops, ongoing advisory services. Consultant Availability: Monday-Friday 8:00 AM - 7:00 PM, weekend appointments available for urgent projects. Service Delivery: On-site consulting, virtual engagements, hybrid models, global project teams. Pricing Structure: Daily rates ($1,200-$2,500), project fees, retainer agreements, success-based pricing. Methodology: Proprietary frameworks, data-driven insights, benchmarking analysis, best practice implementation. Client Results: Average 25% efficiency improvement, 15% cost reduction, 90% project success rate. Team Composition: MBA consultants, industry experts, subject matter specialists, former executives. Deliverables: Comprehensive reports, implementation roadmaps, training materials, ongoing support documentation.',
        doc_type: 'knowledge_base',
        source: 'consulting_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'fitness',
    documents: [
      {
        title: 'Fitness Center Services and Membership Information',
        content: 'Fitness Services: 24/7 gym access, personal training, group fitness classes, nutrition counseling, physical therapy. Facility Features: Cardio equipment (50+ machines), strength training, free weights, indoor track, swimming pool, sauna, steam room. Membership Options: Basic ($29/month), Premium ($49/month includes classes), Family ($89/month up to 4 members), Student discount (20% off). Group Classes: Yoga, Pilates, Zumba, CrossFit, spin classes, aqua aerobics, seniors fitness. Personal Training: Certified trainers, fitness assessments, customized workout plans, nutrition guidance, $60-$85/session. Pool Services: Lap swimming, water aerobics, swimming lessons, pool parties, competitive swim teams. Operating Hours: 24/7 access for members, staffed hours Monday-Friday 5:00 AM - 10:00 PM, weekends 6:00 AM - 8:00 PM. Amenities: Locker rooms, showers, towel service, childcare during peak hours, smoothie bar, pro shop. Special Programs: Corporate wellness, senior fitness, youth programs, rehabilitation services, sports performance training.',
        doc_type: 'knowledge_base',
        source: 'fitness_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  },
  {
    industry: 'foodbeverage',
    documents: [
      {
        title: 'Restaurant and Food Service Information',
        content: 'Restaurant Services: Dine-in, takeout, delivery, catering, private events, cooking classes. Operating Hours: Monday-Thursday 11:00 AM - 10:00 PM, Friday-Saturday 11:00 AM - 11:00 PM, Sunday 10:00 AM - 9:00 PM (brunch until 3:00 PM). Menu Categories: Appetizers, salads, pasta, seafood, steaks, vegetarian/vegan options, gluten-free dishes, kids menu, desserts. Cuisine Style: Modern American with international influences, farm-to-table ingredients, seasonal menu changes. Pricing: Appetizers $8-$16, Main courses $18-$38, Desserts $8-$12, Wine list $35-$150/bottle. Reservations: Online booking, phone reservations, walk-ins welcome, special occasion packages. Catering Services: Corporate events, weddings, parties, drop-off or full-service options, custom menus available. Dietary Accommodations: Vegetarian, vegan, gluten-free, keto, low-sodium options clearly marked. Bar Services: Full bar, craft cocktails, local beer selection, wine flights, happy hour Monday-Friday 4:00-6:00 PM. Special Events: Wine tastings, chef specials, live music weekends, cooking classes monthly.',
        doc_type: 'knowledge_base',
        source: 'restaurant_services_guide',
        metadata: { priority: 'high', category: 'services' }
      }
    ]
  }
];

// Function to load industry-specific knowledge for an agent
export async function loadIndustryKnowledge(industry: string, agentId: string): Promise<boolean> {
  try {
    const knowledgeBase = industryKnowledgeBases.find(kb => kb.industry === industry);
    
    if (!knowledgeBase) {
      console.log(`No knowledge base found for industry: ${industry}`);
      return false;
    }

    let documentsAdded = 0;
    
    for (const document of knowledgeBase.documents) {
      try {
        const documentData = {
          title: document.title,
          content: document.content,
          doc_type: document.doc_type,
          source: document.source,
          agent_id: agentId,
          industry: industry,
          metadata: document.metadata || {}
        };

        // Add document using ragRoutes
        await new Promise((resolve, reject) => {
          const mockRes = {
            json: (data: any) => {
              if (data.message === 'Document added successfully') {
                console.log(`✓ Added ${document.title} for ${industry} agent ${agentId}`);
                documentsAdded++;
                resolve(data);
              } else {
                reject(new Error(`Failed to add document: ${JSON.stringify(data)}`));
              }
            },
            status: (code: number) => ({
              json: (data: any) => {
                reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`));
              }
            })
          };

          ragRoutes.addDocument({ body: documentData } as any, mockRes as any)
            .catch(reject);
        });

      } catch (error) {
        console.error(`Failed to add document ${document.title}:`, error);
      }
    }

    console.log(`✓ Successfully loaded ${documentsAdded} documents for ${industry} industry (agent ${agentId})`);
    return documentsAdded > 0;

  } catch (error) {
    console.error(`Failed to load knowledge for industry ${industry}:`, error);
    return false;
  }
}

// Function to load all industry knowledge bases
export async function loadAllIndustryKnowledge(): Promise<void> {
  console.log('🔄 Loading comprehensive industry knowledge bases...');
  
  for (const knowledgeBase of industryKnowledgeBases) {
    await loadIndustryKnowledge(knowledgeBase.industry, knowledgeBase.industry);
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ All industry knowledge bases loaded successfully');
}

// Function to get industry-specific agent response
export async function getIndustryAgentResponse(query: string, industry: string, agentData: any): Promise<any> {
  try {
    // First search for relevant knowledge in the industry-specific documents
    const searchResult = await new Promise((resolve, reject) => {
      const mockRes = {
        json: resolve,
        status: (code: number) => ({
          json: (data: any) => {
            if (code !== 200) reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`));
            else resolve(data);
          }
        })
      };

      ragRoutes.search({ 
        body: { 
          query, 
          agent_id: industry,
          top_k: 3
        } 
      } as any, mockRes as any).catch(reject);
    });

    // Generate response using RAG
    const ragResponse = await new Promise((resolve, reject) => {
      const mockRes = {
        json: resolve,
        status: (code: number) => ({
          json: (data: any) => {
            if (code !== 200) reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`));
            else resolve(data);
          }
        })
      };

      ragRoutes.query({ 
        body: { 
          query, 
          agent_id: industry
        } 
      } as any, mockRes as any).catch(reject);
    });

    return {
      ...(ragResponse as any),
      agent: agentData,
      industry_enhanced: true,
      search_results: searchResult
    };

  } catch (error) {
    console.error('Error getting industry agent response:', error);
    
    // Fallback response
    return {
      query,
      response: `Hello! I'm ${agentData.businessName}, your ${industry} assistant. How can I help you today?`,
      sources: [],
      agent_id: agentData.id.toString(),
      timestamp: new Date().toISOString(),
      agent: agentData,
      industry_enhanced: false,
      rag_enhanced: false
    };
  }
}