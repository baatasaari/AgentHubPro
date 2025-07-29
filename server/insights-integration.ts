export interface PaymentInsight {
  consultationId: string;
  agentId: string;
  customerId: string;
  platform: 'whatsapp' | 'instagram' | 'messenger' | 'web';
  industry: string;
  paymentData: {
    amount: number;
    currency: string;
    method: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    timestamp: string;
    transactionId?: string;
  };
  consultationData: {
    type: string;
    duration: number;
    scheduledAt: string;
    completedAt?: string;
    customerSatisfaction?: number;
  };
  customerData: {
    name: string;
    phone: string;
    email: string;
    location?: string;
    isReturningCustomer: boolean;
  };
  conversationMetrics: {
    messageCount: number;
    responseTime: number;
    conversionRate: number;
    touchpoints: string[];
  };
  revenueAttribution: {
    customerLifetimeValue: number;
    acquisitionCost: number;
    profitMargin: number;
    revenueCategory: 'new_customer' | 'repeat_customer' | 'premium_service';
  };
}

export interface InsightsReport {
  agentId: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  paymentMetrics: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    conversionRate: number;
    platformBreakdown: Record<string, { revenue: number; transactions: number }>;
    paymentMethodBreakdown: Record<string, { revenue: number; transactions: number }>;
  };
  customerInsights: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    customerSatisfactionAverage: number;
    geographicDistribution: Record<string, number>;
  };
  performanceMetrics: {
    averageResponseTime: number;
    consultationCompletionRate: number;
    noShowRate: number;
    rebookingRate: number;
  };
  revenueAnalysis: {
    monthlyGrowth: number;
    industryComparison: number;
    profitabilityTrend: 'increasing' | 'stable' | 'decreasing';
    topRevenueGenerators: Array<{
      customerId: string;
      customerName: string;
      totalSpent: number;
      consultationCount: number;
    }>;
  };
}

export class InsightsIntegrationService {
  private insights: PaymentInsight[] = [];

  async recordPaymentInsight(insight: PaymentInsight): Promise<void> {
    // Add timestamp if not provided
    if (!insight.paymentData.timestamp) {
      insight.paymentData.timestamp = new Date().toISOString();
    }

    // Calculate conversion metrics
    insight.conversationMetrics = await this.calculateConversionMetrics(
      insight.customerId,
      insight.platform,
      insight.agentId
    );

    // Calculate revenue attribution
    insight.revenueAttribution = await this.calculateRevenueAttribution(
      insight.customerId,
      insight.paymentData.amount
    );

    // Store insight
    this.insights.push(insight);

    // Send to analytics microservice
    await this.sendToAnalyticsService(insight);

    // Update customer insights database
    await this.updateCustomerInsights(insight);
  }

  async generateInsightsReport(agentId: string, startDate: Date, endDate: Date): Promise<InsightsReport> {
    const agentInsights = this.insights.filter(
      insight => insight.agentId === agentId &&
      new Date(insight.paymentData.timestamp) >= startDate &&
      new Date(insight.paymentData.timestamp) <= endDate
    );

    const paymentMetrics = this.calculatePaymentMetrics(agentInsights);
    const customerInsights = this.calculateCustomerInsights(agentInsights);
    const performanceMetrics = this.calculatePerformanceMetrics(agentInsights);
    const revenueAnalysis = this.calculateRevenueAnalysis(agentInsights, agentId);

    return {
      agentId,
      reportPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      paymentMetrics,
      customerInsights,
      performanceMetrics,
      revenueAnalysis
    };
  }

  private calculatePaymentMetrics(insights: PaymentInsight[]) {
    const completedPayments = insights.filter(i => i.paymentData.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, i) => sum + i.paymentData.amount, 0);
    const totalTransactions = completedPayments.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Platform breakdown
    const platformBreakdown: Record<string, { revenue: number; transactions: number }> = {};
    completedPayments.forEach(insight => {
      if (!platformBreakdown[insight.platform]) {
        platformBreakdown[insight.platform] = { revenue: 0, transactions: 0 };
      }
      platformBreakdown[insight.platform].revenue += insight.paymentData.amount;
      platformBreakdown[insight.platform].transactions += 1;
    });

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { revenue: number; transactions: number }> = {};
    completedPayments.forEach(insight => {
      const method = insight.paymentData.method;
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { revenue: 0, transactions: 0 };
      }
      paymentMethodBreakdown[method].revenue += insight.paymentData.amount;
      paymentMethodBreakdown[method].transactions += 1;
    });

    // Conversion rate calculation
    const totalConversations = insights.length;
    const conversionRate = totalConversations > 0 ? (totalTransactions / totalConversations) * 100 : 0;

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      conversionRate,
      platformBreakdown,
      paymentMethodBreakdown
    };
  }

  private calculateCustomerInsights(insights: PaymentInsight[]) {
    const uniqueCustomers = new Set(insights.map(i => i.customerId));
    const totalCustomers = uniqueCustomers.size;
    
    const newCustomers = insights.filter(i => !i.customerData.isReturningCustomer).length;
    const returningCustomers = totalCustomers - newCustomers;

    const satisfactionScores = insights
      .filter(i => i.consultationData.customerSatisfaction)
      .map(i => i.consultationData.customerSatisfaction!);
    
    const customerSatisfactionAverage = satisfactionScores.length > 0 
      ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length 
      : 0;

    // Geographic distribution (mock data based on phone numbers)
    const geographicDistribution: Record<string, number> = {};
    insights.forEach(insight => {
      const location = insight.customerData.location || this.inferLocationFromPhone(insight.customerData.phone);
      geographicDistribution[location] = (geographicDistribution[location] || 0) + 1;
    });

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      customerSatisfactionAverage,
      geographicDistribution
    };
  }

  private calculatePerformanceMetrics(insights: PaymentInsight[]) {
    const averageResponseTime = insights.reduce((sum, i) => sum + i.conversationMetrics.responseTime, 0) / insights.length;
    
    const completedConsultations = insights.filter(i => i.consultationData.completedAt);
    const consultationCompletionRate = insights.length > 0 ? (completedConsultations.length / insights.length) * 100 : 0;
    
    // Mock calculations for no-show and rebooking rates
    const noShowRate = Math.random() * 10; // 0-10% mock data
    const rebookingRate = Math.random() * 30 + 20; // 20-50% mock data

    return {
      averageResponseTime,
      consultationCompletionRate,
      noShowRate,
      rebookingRate
    };
  }

  private calculateRevenueAnalysis(insights: PaymentInsight[], agentId: string) {
    // Calculate monthly growth (mock calculation)
    const currentMonth = insights.length;
    const previousMonth = Math.floor(currentMonth * 0.8); // Mock previous month data
    const monthlyGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

    // Industry comparison (mock data)
    const industryComparison = Math.random() * 40 - 20; // -20% to +20%

    // Profitability trend
    const profitabilityTrend: 'increasing' | 'stable' | 'decreasing' = 
      monthlyGrowth > 5 ? 'increasing' : monthlyGrowth < -5 ? 'decreasing' : 'stable';

    // Top revenue generators
    const customerRevenue: Record<string, { name: string; total: number; count: number }> = {};
    insights.forEach(insight => {
      if (!customerRevenue[insight.customerId]) {
        customerRevenue[insight.customerId] = {
          name: insight.customerData.name,
          total: 0,
          count: 0
        };
      }
      customerRevenue[insight.customerId].total += insight.paymentData.amount;
      customerRevenue[insight.customerId].count += 1;
    });

    const topRevenueGenerators = Object.entries(customerRevenue)
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        totalSpent: data.total,
        consultationCount: data.count
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      monthlyGrowth,
      industryComparison,
      profitabilityTrend,
      topRevenueGenerators
    };
  }

  private async calculateConversionMetrics(customerId: string, platform: string, agentId: string) {
    // Mock conversation metrics - in production, fetch from conversation logs
    return {
      messageCount: Math.floor(Math.random() * 20) + 5, // 5-25 messages
      responseTime: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
      conversionRate: Math.random() * 100, // 0-100%
      touchpoints: [platform, 'payment_link', 'confirmation']
    };
  }

  private async calculateRevenueAttribution(customerId: string, amount: number) {
    // Mock revenue attribution - in production, calculate based on customer history
    const isReturningCustomer = Math.random() > 0.6; // 40% new customers
    
    return {
      customerLifetimeValue: amount * (isReturningCustomer ? 3.5 : 1.2), // Mock CLV calculation
      acquisitionCost: amount * 0.15, // 15% acquisition cost
      profitMargin: amount * 0.7, // 70% profit margin
      revenueCategory: isReturningCustomer ? 'repeat_customer' as const : 'new_customer' as const
    };
  }

  private async sendToAnalyticsService(insight: PaymentInsight): Promise<void> {
    // Send to analytics microservice (port 8002)
    try {
      console.log(`Sending payment insight to analytics service: ${insight.consultationId}`);
      
      // In production, make HTTP request to analytics service
      // await fetch('http://localhost:8002/api/insights/payment', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(insight)
      // });
      
    } catch (error) {
      console.error('Failed to send insight to analytics service:', error);
    }
  }

  private async updateCustomerInsights(insight: PaymentInsight): Promise<void> {
    // Update customer insights database
    console.log(`Updating customer insights for: ${insight.customerData.name}`);
    
    // In production, update customer profile with payment and consultation data
    // This would include:
    // - Payment history
    // - Consultation preferences
    // - Platform usage patterns
    // - Satisfaction scores
    // - Lifetime value calculations
  }

  private inferLocationFromPhone(phone: string): string {
    // Simple location inference based on Indian phone number patterns
    // In production, use proper geolocation services
    if (phone.includes('+91')) {
      const statePatterns = {
        'Mumbai': ['98', '99', '70'],
        'Delhi': ['81', '85', '87'],
        'Bangalore': ['96', '97', '80'],
        'Chennai': ['94', '95', '63'],
        'Kolkata': ['90', '91', '62'],
        'Hyderabad': ['92', '93', '77'],
        'Pune': ['88', '89', '86']
      };
      
      const phoneDigits = phone.replace(/\D/g, '').slice(-10);
      const prefix = phoneDigits.substring(0, 2);
      
      for (const [city, prefixes] of Object.entries(statePatterns)) {
        if (prefixes.includes(prefix)) {
          return city;
        }
      }
    }
    
    return 'India'; // Default location
  }

  // Method to get insights for a specific customer
  async getCustomerPaymentHistory(customerId: string): Promise<PaymentInsight[]> {
    return this.insights.filter(insight => insight.customerId === customerId);
  }

  // Method to get platform performance comparison
  async getPlatformComparison(agentId: string): Promise<Record<string, any>> {
    const agentInsights = this.insights.filter(i => i.agentId === agentId);
    const platforms = ['whatsapp', 'instagram', 'messenger', 'web'];
    
    const comparison: Record<string, any> = {};
    
    platforms.forEach(platform => {
      const platformInsights = agentInsights.filter(i => i.platform === platform);
      const revenue = platformInsights.reduce((sum, i) => sum + i.paymentData.amount, 0);
      const conversions = platformInsights.filter(i => i.paymentData.status === 'completed').length;
      const totalConversations = platformInsights.length;
      
      comparison[platform] = {
        revenue,
        conversions,
        totalConversations,
        conversionRate: totalConversations > 0 ? (conversions / totalConversations) * 100 : 0,
        averageResponseTime: platformInsights.reduce((sum, i) => sum + i.conversationMetrics.responseTime, 0) / platformInsights.length || 0
      };
    });
    
    return comparison;
  }
}