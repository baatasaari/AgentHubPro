import nodemailer from 'nodemailer';

export class WorkingEmailService {
  private transporter: any;
  private initialized: boolean = false;

  constructor() {
    console.log('Initializing Working Email Service...');
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.createTestAccount();
      this.initialized = true;
    }
  }

  private async createTestAccount() {
    try {
      // Create a test account with Ethereal Email
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Test email account created:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test account:', error);
      
      // Fallback to Gmail configuration (requires app password)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'demo@agenthub.ai',
          pass: 'demo-password'
        }
      });
    }
  }

  async sendExecutiveReport(toEmail: string, reportData: any): Promise<{ success: boolean; error?: string; previewUrl?: string }> {
    try {
      await this.ensureInitialized();
      const html = this.generateReportHTML(reportData);
      
      const mailOptions = {
        from: '"AgentHub Analytics" <noreply@agenthub.ai>',
        to: toEmail,
        subject: `Executive Analytics Report - ${reportData.customerName}`,
        html: html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Message sent:', info.messageId);
      
      // Get the preview URL for Ethereal Email
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }

      return { 
        success: true, 
        previewUrl: previewUrl || undefined 
      };
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private generateReportHTML(reportData: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Analytics Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            color: #2d3748;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }
        .metric-card {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .metric-value {
            font-size: 20px;
            font-weight: 700;
            color: #2b6cb0;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 11px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin: 25px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #48bb78;
        }
        .section h3 {
            margin: 0 0 15px 0;
            color: #2d3748;
            font-size: 16px;
        }
        .platform-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .platform-name {
            font-weight: 600;
            color: #2d3748;
        }
        .platform-stats {
            font-size: 14px;
            color: #4a5568;
        }
        .insights-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .insights-list li {
            background: white;
            padding: 12px 15px;
            margin: 8px 0;
            border-radius: 6px;
            border-left: 3px solid #ed8936;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 14px;
        }
        .competitive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin: 20px 0;
        }
        .competitive-card {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border: 2px solid #68d391;
        }
        .competitive-value {
            font-size: 18px;
            font-weight: 700;
            color: #38a169;
            margin-bottom: 3px;
        }
        .footer {
            background: #2d3748;
            color: white;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
        }
        .footer .brand {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Executive Analytics Report</h1>
            <p>${reportData.customerName} • ${reportData.agentName}</p>
            <p>${reportData.reportPeriod}</p>
        </div>

        <div class="content">
            <h2 style="color: #2d3748; margin-bottom: 20px;">Performance Overview</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${reportData.overview.totalConversations}</div>
                    <div class="metric-label">Total Conversations</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${reportData.overview.totalRevenue}</div>
                    <div class="metric-label">Total Revenue</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${reportData.overview.conversionRate}</div>
                    <div class="metric-label">Conversion Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${reportData.overview.customerSatisfaction}</div>
                    <div class="metric-label">Customer Satisfaction</div>
                </div>
            </div>

            <div class="section">
                <h3>Platform Performance</h3>
                <div class="platform-row">
                    <div class="platform-name">WhatsApp</div>
                    <div class="platform-stats">${reportData.platformPerformance.whatsapp.conversations} conversations | ${reportData.platformPerformance.whatsapp.revenue}</div>
                </div>
                <div class="platform-row">
                    <div class="platform-name">Instagram</div>
                    <div class="platform-stats">${reportData.platformPerformance.instagram.conversations} conversations | ${reportData.platformPerformance.instagram.revenue}</div>
                </div>
                <div class="platform-row">
                    <div class="platform-name">Web Chat</div>
                    <div class="platform-stats">${reportData.platformPerformance.webchat.conversations} conversations | ${reportData.platformPerformance.webchat.revenue}</div>
                </div>
            </div>

            <div class="section">
                <h3>AI Performance Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${reportData.ragPerformance.recommendationAccuracy}</div>
                        <div class="metric-label">Recommendation Accuracy</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${reportData.ragPerformance.avgResponseTime}</div>
                        <div class="metric-label">Avg Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${reportData.ragPerformance.knowledgeUtilization}</div>
                        <div class="metric-label">Knowledge Utilization</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>Key Business Insights</h3>
                <ul class="insights-list">
                    ${reportData.insights.map((insight: string) => `<li>${insight}</li>`).join('')}
                </ul>
            </div>

            <h2 style="color: #2d3748; margin: 25px 0 15px 0;">Competitive Advantage</h2>
            <div class="competitive-grid">
                <div class="competitive-card">
                    <div class="competitive-value">${reportData.competitiveAdvantage.responseTime}</div>
                    <div class="metric-label">Response Time</div>
                </div>
                <div class="competitive-card">
                    <div class="competitive-value">${reportData.competitiveAdvantage.conversionRate}</div>
                    <div class="metric-label">Conversion Rate</div>
                </div>
                <div class="competitive-card">
                    <div class="competitive-value">${reportData.competitiveAdvantage.availability}</div>
                    <div class="metric-label">Availability</div>
                </div>
                <div class="competitive-card">
                    <div class="competitive-value">${reportData.competitiveAdvantage.roi}</div>
                    <div class="metric-label">Annual ROI</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="brand">AgentHub</div>
            <p>Industry-Specialized AI Assistant Platform</p>
            <p>Report generated on ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;
  }
}

export const workingEmailService = new WorkingEmailService();