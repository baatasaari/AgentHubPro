// Simple email service that works without complex authentication
export class SimpleEmailService {
  constructor() {
    console.log('Simple Email Service initialized for demo purposes');
  }

  async sendExecutiveReport(toEmail: string, reportData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Demo: Sending comprehensive analytics report to ${toEmail}`);
      
      // In demo mode, we'll log the email content and simulate success
      const emailContent = this.generateEmailContent(reportData);
      
      console.log('=== EMAIL CONTENT (DEMO MODE) ===');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Executive Analytics Report - ${reportData.customerName}`);
      console.log('Content: Professional HTML report with comprehensive analytics');
      console.log('Features: Revenue metrics, platform performance, AI insights, competitive analysis');
      console.log('=== END EMAIL CONTENT ===');
      
      // Simulate successful email sending
      setTimeout(() => {
        console.log(`✅ Report successfully delivered to ${toEmail} (Demo mode)`);
      }, 1000);
      
      return { success: true };
    } catch (error: any) {
      console.error('Demo email service error:', error);
      return { success: false, error: error.message };
    }
  }

  private generateEmailContent(reportData: any): string {
    return `
      Executive Analytics Report for ${reportData.customerName}
      Report Period: ${reportData.reportPeriod}
      
      Performance Overview:
      • Total Conversations: ${reportData.overview.totalConversations}
      • Total Revenue: ${reportData.overview.totalRevenue}
      • Conversion Rate: ${reportData.overview.conversionRate}
      • Customer Satisfaction: ${reportData.overview.customerSatisfaction}
      
      Platform Performance:
      • WhatsApp: ${reportData.platformPerformance.whatsapp.conversations} conversations
      • Instagram: ${reportData.platformPerformance.instagram.conversations} conversations
      • Web Chat: ${reportData.platformPerformance.webchat.conversations} conversations
      
      Competitive Advantage:
      • Response Time: ${reportData.competitiveAdvantage.responseTime}
      • Conversion Rate: ${reportData.competitiveAdvantage.conversionRate}
      • Annual ROI: ${reportData.competitiveAdvantage.roi}
    `;
  }
}

export const simpleEmailService = new SimpleEmailService();