import nodemailer from 'nodemailer';

interface EmailTemplate {
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

interface ReportData {
  customerName: string;
  agentName: string;
  reportPeriod: string;
  overview: {
    totalConversations: number;
    totalRevenue: string;
    conversionRate: string;
    averageOrderValue: string;
    customerSatisfaction: string;
  };
  platformPerformance: {
    [platform: string]: {
      conversations: number;
      revenue: string;
      avgSessionTime: string;
      language?: string;
    };
  };
  ragPerformance: {
    recommendationAccuracy: string;
    avgResponseTime: string;
    knowledgeUtilization: string;
    customerFollowThrough: string;
  };
  topServices: Array<{
    service: string;
    count: number;
    revenue: string;
    rating?: string;
  }>;
  insights: string[];
  competitiveAdvantage: {
    responseTime: string;
    conversionRate: string;
    availability: string;
    roi: string;
  };
}

export class EmailService {
  private transporter: any;

  constructor() {
    console.log('Initializing EmailService with Nodemailer...');
    
    // Create transporter using Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'agenthub.analytics@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'demo-mode' // Will use environment variable
      }
    });
    
    console.log('EmailService initialized successfully with Gmail SMTP');
  }

  private generateExecutiveReportTemplate(data: ReportData): EmailTemplate {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentHub Analytics Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
            margin: 0;
        }
        .metric-label {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0 0 0;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #495057;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .platform-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #667eea;
        }
        .platform-name {
            font-weight: 600;
            color: #495057;
        }
        .platform-stats {
            font-size: 14px;
            color: #6c757d;
        }
        .insights-list {
            list-style: none;
            padding: 0;
        }
        .insights-list li {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            position: relative;
            padding-left: 40px;
        }
        .insights-list li::before {
            content: "💡";
            position: absolute;
            left: 15px;
            top: 15px;
        }
        .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .services-table th,
        .services-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .services-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        .competitive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .competitive-card {
            background: #e8f5e8;
            border: 1px solid #c3e6c3;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .competitive-improvement {
            font-size: 18px;
            font-weight: 700;
            color: #28a745;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
        }
        .logo {
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin-bottom: 5px;
        }
        @media (max-width: 600px) {
            .metrics-grid {
                grid-template-columns: 1fr 1fr;
            }
            .platform-row {
                flex-direction: column;
                align-items: flex-start;
            }
            .competitive-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">AgentHub</div>
            <h1>Analytics Report</h1>
            <p>${data.customerName} | ${data.agentName} | ${data.reportPeriod}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 Performance Overview</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${data.overview.totalConversations}</div>
                        <div class="metric-label">Total Conversations</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.overview.totalRevenue}</div>
                        <div class="metric-label">Revenue Generated</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.overview.conversionRate}</div>
                        <div class="metric-label">Conversion Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.overview.averageOrderValue}</div>
                        <div class="metric-label">Average Order Value</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.overview.customerSatisfaction}</div>
                        <div class="metric-label">Customer Satisfaction</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🌐 Platform Performance</h2>
                ${Object.entries(data.platformPerformance).map(([platform, stats]) => `
                    <div class="platform-row">
                        <div>
                            <div class="platform-name">${platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
                            <div class="platform-stats">${stats.avgSessionTime} avg session${stats.language ? ` • ${stats.language}` : ''}</div>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${stats.conversations} conversations</div>
                            <div style="color: #28a745; font-weight: 600;">${stats.revenue}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>🏆 Top Performing Services</h2>
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Count</th>
                            <th>Revenue</th>
                            <th>Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.topServices.map(service => `
                            <tr>
                                <td>${service.service}</td>
                                <td>${service.count}</td>
                                <td style="color: #28a745; font-weight: 600;">${service.revenue}</td>
                                <td>${service.rating || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>🧠 AI System Performance</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${data.ragPerformance.recommendationAccuracy}</div>
                        <div class="metric-label">Recommendation Accuracy</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.ragPerformance.avgResponseTime}</div>
                        <div class="metric-label">Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.ragPerformance.knowledgeUtilization}</div>
                        <div class="metric-label">Knowledge Utilization</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.ragPerformance.customerFollowThrough}</div>
                        <div class="metric-label">Customer Follow-Through</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🎯 Competitive Advantage</h2>
                <div class="competitive-grid">
                    <div class="competitive-card">
                        <div class="competitive-improvement">${data.competitiveAdvantage.responseTime}</div>
                        <div>Faster Response</div>
                    </div>
                    <div class="competitive-card">
                        <div class="competitive-improvement">${data.competitiveAdvantage.conversionRate}</div>
                        <div>Higher Conversion</div>
                    </div>
                    <div class="competitive-card">
                        <div class="competitive-improvement">${data.competitiveAdvantage.availability}</div>
                        <div>Better Availability</div>
                    </div>
                    <div class="competitive-card">
                        <div class="competitive-improvement">${data.competitiveAdvantage.roi}</div>
                        <div>Annual ROI</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>💡 Key Insights</h2>
                <ul class="insights-list">
                    ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>AgentHub</strong> - Industry-Specialized AI Assistant Platform</p>
            <p>This report was generated automatically from your AI agent analytics data.</p>
            <p>For questions or support, contact: support@agenthub.com</p>
        </div>
    </div>
</body>
</html>`;

    return {
      subject: `AgentHub Analytics Report - ${data.customerName} - ${data.reportPeriod}`,
      html
    };
  }

  async sendExecutiveReport(
    toEmail: string,
    reportData: ReportData,
    fromEmail: string = 'reports@agenthub.com'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generateExecutiveReportTemplate(reportData);

      const mailOptions = {
        from: '"AgentHub Analytics" <agenthub.analytics@gmail.com>',
        to: toEmail,
        subject: template.subject,
        html: template.html,
      };

      await this.transporter.sendMail(mailOptions);
      
      return { success: true };
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDailySummary(
    toEmail: string,
    summaryData: any,
    fromEmail: string = 'reports@agenthub.com'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mailOptions = {
        from: '"AgentHub Daily Summary" <agenthub.analytics@gmail.com>',
        to: toEmail,
        subject: `Daily Performance Summary - ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Daily Performance Summary</h2>
            <p><strong>Conversations:</strong> ${summaryData.conversations}</p>
            <p><strong>Revenue:</strong> ${summaryData.revenue}</p>
            <p><strong>Conversion Rate:</strong> ${summaryData.conversionRate}</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error: any) {
      console.error('Daily summary email failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();