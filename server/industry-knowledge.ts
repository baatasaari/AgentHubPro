// India-specific industry knowledge base for AgentHub platform
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
        title: 'Healthcare Services and Patient Information - India',
        content: 'HealthCare Assistant Clinic Hours: Monday-Friday: 9:00 AM - 7:00 PM, Saturday: 9:00 AM - 5:00 PM, Sunday: 10:00 AM - 2:00 PM (Emergency only). Emergency Services: 24/7 emergency care available at +91-11-2345-6789. Telehealth: Available during business hours via WhatsApp video calls. Appointment Booking: Call +91-11-2345-6700, WhatsApp +91-98765-43210, or use our mobile app. Insurance: We accept Ayushman Bharat, Star Health, HDFC ERGO, ICICI Lombard, New India Assurance, and most TPAs. Specialties: General Medicine, Cardiology, Orthopedics, Gynecology, Pediatrics, Ayurveda consultation. Consultation Fees: ₹500-₹1500 depending on specialist. Wait Times: Average 20 minutes for scheduled appointments, same-day appointments available for ₹200 extra. Digital Services: e-prescription, online reports, Aadhaar-linked health records.',
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
        title: 'Retail Store Operations and Customer Service Guide - India',
        content: 'Store Hours: Monday-Saturday 10:00 AM - 9:00 PM, Sunday 11:00 AM - 8:00 PM. Festival Hours: Extended hours during Diwali, Dussehra, Eid seasons. Return Policy: 15-day return window with receipt and original packaging, 7 days for electronics and mobile phones. Exchange Policy: Size/color exchange within 7 days with tags intact. Product Categories: Ethnic Wear, Western Clothing, Electronics, Home Decor, Sports, Beauty, Books, Groceries. Customer Service: WhatsApp chat +91-98765-43210, phone support in Hindi/English 9:00 AM - 9:00 PM. Loyalty Program: 3% cashback on purchases over ₹2000, free delivery on orders over ₹1500. Payment Methods: Cash, UPI (PhonePe, Google Pay, Paytm), Credit/Debit Cards, Buy Now Pay Later (Simpl, LazyPay). GST: All prices inclusive of 18% GST. EMI Options: 0% EMI available on purchases above ₹10,000 with select cards.',
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
        title: 'Financial Services and Banking Information - India',
        content: 'Banking Services: Savings Account (4% to 7% interest per annum), Current Account for businesses, Fixed Deposits (6.5% to 8.2% for senior citizens). Loan Services: Personal loans up to ₹25 lakhs (10.5% to 24% interest), Home loans (8.15% to 9.65% interest, up to ₹10 crores), Car loans (7.25% to 12.5% interest). Investment Services: Mutual Funds, SIP, PPF, NSC, ELSS, Portfolio management. Branch Hours: Monday-Friday 10:00 AM - 4:00 PM, Saturday 10:00 AM - 2:00 PM, closed on 2nd & 4th Saturdays. ATM Network: 2,50,000+ ATMs across India, UPI-enabled. Digital Banking: Internet banking, mobile app with UPI, IMPS, NEFT, RTGS. Customer Support: 24/7 phone +91-1800-XXX-XXXX, branch support during banking hours. Credit Cards: Rewards card (1% to 5% cashback), travel card (2X reward points), lifetime free cards available. Tax Services: ITR filing, Form 16, TDS certificates, tax-saving investment advice.',
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
        title: 'Real Estate Services and Property Information - India',
        content: 'Real Estate Services: Residential buying/selling, commercial properties, rental management, property valuation, RERA compliance assistance. Market Areas: Central Delhi (avg ₹15,000/sqft), Gurgaon (₹8,000/sqft), Noida (₹6,500/sqft), Mumbai suburbs (₹12,000/sqft). Services Included: Property photography, virtual tours, legal document verification, Vastu consultation, market analysis. Agent Availability: Monday-Saturday 9:00 AM - 8:00 PM, Sunday 10:00 AM - 6:00 PM, site visits on weekends. Commission Structure: 1% to 2% for buyers, 2% to 3% for sellers, negotiable for premium properties above ₹2 crores. Property Types: 1/2/3/4 BHK apartments, independent houses, plots, commercial spaces, co-working spaces. Financing Partners: SBI, HDFC, ICICI, Axis Bank, LIC Housing Finance. Home loan assistance provided. Average Time on Market: 45-60 days residential, 90-120 days commercial. Legal Services: Property title verification, NOC clearances, stamp duty calculation, registration assistance.',
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
        title: 'Educational Institution Information and Services - India',
        content: 'Academic Programs: CBSE/ICSE curriculum, IIT-JEE preparation, NEET coaching, skill development courses, online learning platforms. Class Schedule: School hours 8:00 AM - 2:30 PM, coaching classes 3:00 PM - 7:00 PM, weekend doubt clearing sessions. Enrollment Process: Online application, entrance exam, parent-teacher meeting, document verification (Aadhaar, birth certificate, transfer certificate). Tuition Fees: Primary ₹50,000/year, Secondary ₹75,000/year, Senior Secondary ₹1,00,000/year, EMI options available. Extracurricular Activities: Cricket, football, classical dance, music, debate competitions, science exhibitions, NCC/NSS. Student Support: Career counseling, scholarship assistance, special education support, mental health counseling. Campus Facilities: Smart classrooms, science laboratories, computer lab with Wi-Fi, library, playground, canteen, transport facility. Teacher-Student Ratio: 1:25 primary, 1:30 secondary, 1:35 senior secondary. Academic Calendar: April-March, summer vacation (May-June), Diwali break, winter vacation, board exam preparation classes.',
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
        title: 'Hospitality and Hotel Services Guide - India',
        content: 'Hotel Services: 120 rooms (Standard, Deluxe, Executive Suites), 24/7 front desk with multilingual staff (Hindi, English, regional languages), concierge services, room service until 11:30 PM. Amenities: Swimming pool, gym, spa with Ayurvedic treatments, business center, complimentary Wi-Fi, parking (₹300/night valet, ₹150/night self). Dining: Multi-cuisine restaurant (6:00 AM - 11:00 PM), rooftop bar (4:00 PM - 1:00 AM), coffee shop (5:30 AM - 11:30 PM), pure vegetarian options available. Meeting Facilities: 6 conference halls (15-150 capacity), AV equipment, vegetarian/Jain catering, live streaming setup. Check-in/Check-out: 2:00 PM check-in, 12:00 PM check-out, early/late options available. Special Services: Vastu-compliant rooms, prayer room, festival celebration arrangements. Loyalty Program: Points for stays, complimentary upgrades, late checkout, airport transfers. Local Attractions: Shopping mall (1 km), metro station (500m), airport (8 km), business district (2 km), historical monuments nearby. Event Services: Indian weddings, sangeet ceremonies, corporate events, banquet halls for up to 300 guests, mandap decoration.',
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
        title: 'Legal Services and Practice Areas Information - India',
        content: 'Legal Practice Areas: Civil litigation, criminal defense, family law (divorce, maintenance), property disputes, corporate law, consumer protection, labour law, GST matters. Advocate Availability: Monday-Friday 10:00 AM - 6:00 PM, Saturday 10:00 AM - 2:00 PM, emergency consultations available. Consultation Process: Initial consultation ₹500-₹1000, case analysis, fee structure discussion in Hindi/English. Fee Structure: Court appearance ₹2000-₹5000/hearing, document drafting ₹1500-₹3000, retainer fees ₹25,000-₹1,00,000 for corporate cases. Court Representation: District courts, High Court, Supreme Court, tribunals, arbitration proceedings. Document Services: Agreement drafting, property registration, company incorporation, trademark filing, legal notices. Client Communication: WhatsApp updates, court date reminders, document sharing via secure portal. Payment Options: Cash, UPI transfers, cheque, EMI available for major cases. Success Rate: 85% favorable outcomes in civil cases, 80% success in family court matters. Professional Credentials: Bar Council registration, specialized certifications in corporate law, taxation, family law.',
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
        title: 'Automotive Services and Vehicle Information - India',
        content: 'Automotive Services: New and used car sales, authorized service center, spare parts, insurance assistance, vehicle registration. Service Hours: Monday-Saturday 9:00 AM - 7:00 PM, Sunday 10:00 AM - 5:00 PM (service only). Vehicle Brands: Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Honda, Toyota, Kia, genuine pre-owned vehicles. Financing Options: Car loans 7.25%-12% interest, zero down payment schemes, exchange bonus up to ₹50,000, extended warranty available. Service Department: Engine oil change ₹800-₹1500, brake service ₹2000-₹5000, AC service ₹1200-₹2500, PUC certification, insurance claim assistance. Parts Department: Genuine spare parts, aftermarket components, online ordering, doorstep delivery, 1-year parts warranty. Customer Amenities: Complimentary tea/coffee, waiting lounge with Wi-Fi, customer shuttle within 10 km, alternate vehicle during major repairs. Warranty Coverage: New vehicles (3 years/1,00,000 km comprehensive), certified pre-owned (1 year/15,000 km). Special Offers: Festival discounts during Diwali/Dussehra, student discounts, loyalty rewards, seasonal maintenance packages. Service Booking: WhatsApp booking +91-98765-43210, mobile app, SMS reminders, pickup/drop facility available.',
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
        title: 'Technology Services and IT Solutions Guide - India',
        content: 'Technology Services: Custom software development, web/mobile app development, cloud migration, cybersecurity, digital transformation, AI/ML solutions. Service Hours: Monday-Friday 9:00 AM - 6:00 PM, 24/7 support for critical systems. Development Platforms: React, Angular, Python, Node.js, Java, .NET, Flutter, React Native, blockchain development. Cloud Services: AWS, Microsoft Azure, Google Cloud Platform, Digital India initiatives, data localization compliance. Cybersecurity: Penetration testing, security audits, compliance (RBI guidelines, SEBI regulations, GDPR), employee cyber awareness training. Support Services: Remote support, on-site visits within Delhi NCR/Mumbai/Bangalore, hardware procurement, software licensing, AMC contracts. Project Management: Agile/Scrum methodology, dedicated project managers, weekly sprint reviews, milestone-based delivery. Pricing Models: Fixed cost projects, hourly rates ₹1500-₹3500/hour, monthly retainers ₹50,000-₹2,00,000, maintenance contracts available. Client Portfolio: Startups, SMEs, government projects, healthcare, fintech, edtech, e-commerce platforms. Technology Stack: Latest frameworks, DevSecOps practices, automated testing, CI/CD pipelines, microservices architecture.',
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
        title: 'Business Consulting Services and Expertise Areas - India',  
        content: 'Consulting Services: Strategic planning, business process improvement, financial advisory, HR consulting, digital marketing, GST compliance, startup advisory. Industry Expertise: Manufacturing, IT/ITeS, healthcare, retail, FMCG, financial services, agriculture, textile, pharmaceuticals. Engagement Types: Project-based consulting, interim CXO roles, training workshops, retainer-based advisory, startup mentoring. Consultant Availability: Monday-Friday 10:00 AM - 7:00 PM, weekend calls for urgent matters, pan-India travel capability. Service Delivery: On-site consulting, video conferencing, hybrid engagement models, regional office support. Pricing Structure: Daily rates ₹15,000-₹50,000, project fees ₹2-25 lakhs, annual retainers ₹5-50 lakhs, success fee arrangements. Methodology: Best practice frameworks, industry benchmarking, data analytics, process optimization, change management. Client Results: Average 20-30% operational efficiency improvement, 10-20% cost optimization, 85% client retention rate. Team Composition: IIM/ISB alumni, CA/CS professionals, industry veterans, sector specialists, former corporate executives. Deliverables: Detailed project reports, implementation roadmaps, SOP documentation, training modules, dashboard setup.',
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
        title: 'Fitness Center Services and Membership Information - India',
        content: 'Fitness Services: Gym access 5:00 AM - 11:00 PM, personal training, group fitness classes, nutrition counseling, physiotherapy consultation. Facility Features: Cardio equipment (40+ machines), strength training zone, free weights, functional training area, swimming pool, steam room, separate ladies section. Membership Options: Basic ₹2500/month, Premium ₹4000/month (includes classes), Family ₹6500/month (up to 4 members), Student discount 25% with ID. Group Classes: Yoga, Pilates, Aerobics, Zumba, Bollywood dance fitness, martial arts, power yoga, meditation sessions. Personal Training: Certified trainers (ACSM/NASM), fitness assessment, customized diet charts, workout plans, ₹800-₹1500/session. Pool Services: Swimming lessons, aqua aerobics, separate timings for ladies, pool parties, competitive training. Operating Hours: Monday-Sunday 5:00 AM - 11:00 PM, special early morning slots for working professionals. Amenities: Air-conditioned workout areas, changing rooms, lockers, towel service, protein bar, supplement store, parking facility. Special Programs: Corporate wellness packages, senior citizen programs, kids fitness (8-16 years), weight loss challenges, festival fitness camps.',
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
        title: 'Restaurant and Food Service Information - India',
        content: 'Restaurant Services: Dine-in, takeaway, home delivery (Zomato/Swiggy), catering, private party booking, cooking workshops. Operating Hours: Monday-Sunday 11:00 AM - 11:00 PM, extended hours during festivals (Diwali, Eid, Christmas). Menu Categories: North Indian, South Indian, Chinese, Continental, street food, pure vegetarian, Jain food, kids menu, sugar-free desserts. Cuisine Style: Multi-cuisine restaurant, authentic regional flavors, seasonal specialties, festival special menus. Pricing: Starters ₹150-₹400, Main course ₹200-₹600, Desserts ₹100-₹250, fresh lime water/lassi ₹80-₹150. Reservations: Phone booking, online table reservation, walk-ins welcome, advance booking for parties (min 10 people). Catering Services: Corporate events, wedding catering, birthday parties, home delivery for occasions, live counters, bulk orders. Dietary Accommodations: Pure veg/non-veg sections, Jain food, diabetic-friendly options, no onion-garlic preparations available. Beverage Services: Fresh juices, lassi, soft drinks, tea/coffee varieties, mocktails, happy hours 4:00-7:00 PM (buy 1 get 1). Special Events: Festival buffets, live music on weekends, cooking classes, birthday celebrations with complimentary cake.',
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