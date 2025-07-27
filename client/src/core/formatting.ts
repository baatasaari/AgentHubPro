export class FormatUtils {
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  static formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  /**
   * Get industry label from value
   */
  static getIndustryLabel(industryValue: string): string {
    const INDUSTRIES = [
      { value: "healthcare", label: "Healthcare & Medical" },
      { value: "retail", label: "Retail & E-commerce" },
      { value: "finance", label: "Finance & Banking" },
      { value: "realestate", label: "Real Estate" },
      { value: "education", label: "Education & Training" },
      { value: "hospitality", label: "Hospitality & Travel" },
      { value: "legal", label: "Legal Services" },
      { value: "automotive", label: "Automotive" },
      { value: "technology", label: "Technology & Software" },
      { value: "consulting", label: "Consulting & Professional" },
      { value: "fitness", label: "Fitness & Wellness" },
      { value: "food", label: "Food & Beverage" },
    ];
    
    const industry = INDUSTRIES.find(i => i.value === industryValue);
    return industry?.label || industryValue;
  }
}