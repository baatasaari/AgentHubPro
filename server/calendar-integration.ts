import * as nodemailer from 'nodemailer';

export interface CalendarSlot {
  id: string;
  datetime: string;
  duration: number;
  type: 'video' | 'phone' | 'whatsapp' | 'in_person';
  available: boolean;
  consultantName: string;
  consultantEmail: string;
}

export interface BookingRequest {
  consultationId: string;
  agentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  slotId: string;
  industry: string;
  description?: string;
  consultationType: string;
  amount: number;
  paymentMethod: string;
}

export interface CalendarConfig {
  customerId: string;
  provider: 'google' | 'outlook' | 'apple' | 'calendly' | 'acuity' | 'internal';
  credentials: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    apiKey?: string;
    webhookUrl?: string;
    calendarId?: string;
  };
  settings: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
      days: string[];
    };
    bufferTime: number; // minutes between appointments
    maxAdvanceBooking: number; // days
    minAdvanceBooking: number; // hours
  };
  notifications: {
    customer: boolean;
    consultant: boolean;
    reminders: boolean;
    reminderTimes: number[]; // hours before appointment
  };
  consultantEmail: string;
  businessEmail: string;
}

export class CalendarIntegrationService {
  private emailTransporter: nodemailer.Transporter;
  private customerConfigs: Map<string, CalendarConfig> = new Map();
  
  constructor() {
    // Configure email transporter
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail', // or your preferred email service
      auth: {
        user: process.env.BUSINESS_EMAIL || 'bookings@agenthub.in',
        pass: process.env.EMAIL_PASSWORD || 'dummy_password'
      }
    });
  }

  async configureCustomerCalendar(config: CalendarConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate configuration
      if (!config.customerId || !config.provider) {
        return { success: false, error: 'Missing required configuration fields' };
      }

      // Store customer configuration
      this.customerConfigs.set(config.customerId, config);
      
      console.log(`Calendar configured for customer ${config.customerId} with provider: ${config.provider}`);
      return { success: true };
    } catch (error: any) {
      console.error('Calendar configuration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerConfig(customerId: string): Promise<CalendarConfig | null> {
    return this.customerConfigs.get(customerId) || null;
  }

  async getSlotsWithCustomerConfig(customerId: string, agentId: string, industry: string): Promise<CalendarSlot[]> {
    const customerConfig = await this.getCustomerConfig(customerId);
    
    if (customerConfig) {
      // Use customer-specific calendar integration
      return await this.getSlotsFromCustomerProvider(customerConfig, agentId, industry);
    } else {
      // Fall back to default calendar slots
      return await this.getAvailableSlots(agentId, industry);
    }
  }

  private async getSlotsFromCustomerProvider(config: CalendarConfig, agentId: string, industry: string): Promise<CalendarSlot[]> {
    const slots: CalendarSlot[] = [];
    
    try {
      // Use customer's calendar provider
      const dateRange = {
        start: new Date(),
        end: new Date(Date.now() + config.settings.maxAdvanceBooking * 24 * 60 * 60 * 1000)
      };

      // Generate slots based on customer's working hours
      const workingHours = config.settings.workingHours;
      
      for (let date = new Date(dateRange.start); date <= dateRange.end; date.setDate(date.getDate() + 1)) {
        const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
        
        if (!workingHours.days.includes(dayName)) {
          continue;
        }

        const startHour = parseInt(workingHours.start.split(':')[0]);
        const endHour = parseInt(workingHours.end.split(':')[0]);

        for (let hour = startHour; hour < endHour; hour++) {
          const slotTime = new Date(date);
          slotTime.setHours(hour, 0, 0, 0);

          // Check minimum advance booking time
          const hoursFromNow = (slotTime.getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursFromNow < config.settings.minAdvanceBooking) {
            continue;
          }

          slots.push({
            id: `${config.provider}_slot_${agentId}_${slotTime.getTime()}`,
            datetime: slotTime.toISOString(),
            duration: 30,
            type: 'video',
            available: true,
            consultantName: await this.getConsultantName(agentId),
            consultantEmail: config.consultantEmail
          });
        }
      }

      console.log(`Generated ${slots.length} slots using ${config.provider} provider`);
      return slots;
    } catch (error) {
      console.error('Error getting slots from customer provider:', error);
      // Fall back to default method
      return await this.getAvailableSlots(agentId, industry);
    }
  }

  async getAvailableSlots(agentId: string, industry: string, dateRange?: { start: Date; end: Date }): Promise<CalendarSlot[]> {
    // In production, this would integrate with actual calendar APIs
    // For now, generating realistic available slots based on Indian business hours
    
    const businessHours = this.getBusinessHours(industry);
    const slots: CalendarSlot[] = [];
    
    const startDate = dateRange?.start || new Date();
    const endDate = dateRange?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      // Skip weekends for most industries
      if (industry !== 'healthcare' && (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }
      
      // Generate slots during business hours
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Skip past times
        if (slotTime <= new Date()) continue;
        
        // Check if slot is available (mock availability check)
        const isAvailable = Math.random() > 0.3; // 70% availability rate
        
        if (isAvailable) {
          slots.push({
            id: `slot_${agentId}_${slotTime.getTime()}`,
            datetime: slotTime.toISOString(),
            duration: this.getSlotDuration(industry),
            type: this.getPreferredConsultationType(industry),
            available: true,
            consultantName: await this.getConsultantName(agentId),
            consultantEmail: await this.getConsultantEmail(agentId)
          });
        }
      }
    }
    
    return slots.slice(0, 20); // Return maximum 20 slots
  }

  async bookSlot(booking: BookingRequest): Promise<{
    success: boolean;
    bookingId?: string;
    calendarEventId?: string;
    error?: string;
  }> {
    try {
      // Create calendar event
      const calendarEvent = await this.createCalendarEvent(booking);
      
      // Send email notifications
      await this.sendBookingNotifications(booking, calendarEvent);
      
      // Store booking in database/system
      const bookingId = await this.storeBooking(booking, calendarEvent.id);
      
      return {
        success: true,
        bookingId,
        calendarEventId: calendarEvent.id
      };
      
    } catch (error) {
      console.error('Booking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createCalendarEvent(booking: BookingRequest): Promise<{ id: string; meetingLink?: string }> {
    // In production, this would create actual calendar events
    // Mock implementation for demonstration
    
    const eventId = `evt_${booking.consultationId}_${Date.now()}`;
    const slot = await this.getSlotDetails(booking.slotId);
    
    // For video calls, generate meeting link
    let meetingLink: string | undefined;
    if (booking.consultationType === 'video_call') {
      meetingLink = await this.generateMeetingLink(booking);
    }
    
    // Mock calendar event creation
    console.log(`Calendar event created: ${eventId} for ${booking.customerName} at ${slot?.datetime}`);
    
    return { id: eventId, meetingLink };
  }

  private async sendBookingNotifications(
    booking: BookingRequest, 
    calendarEvent: { id: string; meetingLink?: string }
  ): Promise<void> {
    const slot = await this.getSlotDetails(booking.slotId);
    const consultantEmail = await this.getConsultantEmail(booking.agentId);
    
    // Email to customer
    await this.sendCustomerNotification(booking, slot, calendarEvent.meetingLink);
    
    // Email to consultant/business
    await this.sendConsultantNotification(booking, slot, consultantEmail);
    
    // Email to business calendar system
    await this.sendCalendarSystemNotification(booking, slot, calendarEvent.id);
  }

  private async sendCustomerNotification(
    booking: BookingRequest, 
    slot: CalendarSlot | null, 
    meetingLink?: string
  ): Promise<void> {
    const formattedDate = slot ? this.formatDateTime(slot.datetime) : 'TBD';
    const paymentInfo = `₹${booking.amount} via ${booking.paymentMethod}`;
    
    let consultationDetails = '';
    if (booking.consultationType === 'video_call' && meetingLink) {
      consultationDetails = `\nMeeting Link: ${meetingLink}`;
    } else if (booking.consultationType === 'whatsapp') {
      consultationDetails = `\nWhatsApp Number: ${booking.customerPhone}`;
    } else if (booking.consultationType === 'phone') {
      consultationDetails = `\nPhone Number: ${booking.customerPhone}`;
    }

    const emailContent = `
Dear ${booking.customerName},

Your consultation has been successfully booked!

Consultation Details:
- Date & Time: ${formattedDate}
- Type: ${booking.consultationType.replace('_', ' ').toUpperCase()}
- Industry: ${booking.industry.toUpperCase()}
- Amount Paid: ${paymentInfo}
- Booking ID: ${booking.consultationId}${consultationDetails}

${booking.description ? `\nNotes: ${booking.description}` : ''}

Please arrive/be available 5 minutes before your scheduled time.

For any changes or queries, please contact us.

Best regards,
AgentHub Team
    `.trim();

    await this.emailTransporter.sendMail({
      from: process.env.BUSINESS_EMAIL || 'bookings@agenthub.in',
      to: booking.customerEmail,
      subject: `Consultation Confirmed - ${booking.consultationId}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    });
  }

  private async sendConsultantNotification(
    booking: BookingRequest, 
    slot: CalendarSlot | null,
    consultantEmail: string
  ): Promise<void> {
    const formattedDate = slot ? this.formatDateTime(slot.datetime) : 'TBD';
    
    const emailContent = `
New Consultation Booking

Customer: ${booking.customerName}
Email: ${booking.customerEmail}
Phone: ${booking.customerPhone}
Date & Time: ${formattedDate}
Type: ${booking.consultationType}
Industry: ${booking.industry}
Amount: ₹${booking.amount}
Payment Method: ${booking.paymentMethod}
Booking ID: ${booking.consultationId}

${booking.description ? `Customer Notes: ${booking.description}` : ''}

Please prepare for the consultation and contact the customer if needed.
    `.trim();

    await this.emailTransporter.sendMail({
      from: process.env.BUSINESS_EMAIL || 'bookings@agenthub.in',
      to: consultantEmail,
      subject: `New Booking: ${booking.customerName} - ${formattedDate}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    });
  }

  private async sendCalendarSystemNotification(
    booking: BookingRequest, 
    slot: CalendarSlot | null, 
    eventId: string
  ): Promise<void> {
    // Send to business calendar system email for integration
    const calendarSystemEmail = process.env.CALENDAR_SYSTEM_EMAIL || 'calendar@agenthub.in';
    
    const calendarData = {
      eventId,
      consultationId: booking.consultationId,
      customerData: {
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone
      },
      appointmentDetails: {
        datetime: slot?.datetime,
        duration: slot?.duration,
        type: booking.consultationType,
        industry: booking.industry
      },
      paymentInfo: {
        amount: booking.amount,
        method: booking.paymentMethod,
        status: 'completed'
      }
    };

    await this.emailTransporter.sendMail({
      from: process.env.BUSINESS_EMAIL || 'bookings@agenthub.in',
      to: calendarSystemEmail,
      subject: `Calendar Integration - New Booking ${booking.consultationId}`,
      text: JSON.stringify(calendarData, null, 2),
      html: `<pre>${JSON.stringify(calendarData, null, 2)}</pre>`
    });
  }

  private async generateMeetingLink(booking: BookingRequest): Promise<string> {
    // In production, integrate with Zoom, Google Meet, or Microsoft Teams API
    // Mock implementation
    return `${process.env.DOMAIN_MEET || 'https://meet.agenthub.in'}/${booking.consultationId}`;
  }

  private async getSlotDetails(slotId: string): Promise<CalendarSlot | null> {
    // Mock slot details - in production, fetch from calendar system
    return {
      id: slotId,
      datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      type: 'whatsapp',
      available: true,
      consultantName: 'Dr. Sample',
      consultantEmail: 'consultant@example.com'
    };
  }

  private async storeBooking(booking: BookingRequest, eventId: string): Promise<string> {
    // Store booking in database - mock implementation
    const bookingId = `BOOKING_${Date.now()}`;
    console.log(`Stored booking ${bookingId} with calendar event ${eventId}`);
    return bookingId;
  }

  private getBusinessHours(industry: string): { start: number; end: number } {
    const hours = {
      healthcare: { start: 9, end: 19 }, // 9 AM to 7 PM
      legal: { start: 10, end: 18 }, // 10 AM to 6 PM
      finance: { start: 9, end: 17 }, // 9 AM to 5 PM
      technology: { start: 10, end: 19 }, // 10 AM to 7 PM
      realestate: { start: 10, end: 18 } // 10 AM to 6 PM
    };
    return hours[industry as keyof typeof hours] || { start: 9, end: 17 };
  }

  private getSlotDuration(industry: string): number {
    const durations = {
      healthcare: 30,
      legal: 45,
      finance: 30,
      technology: 60,
      realestate: 30
    };
    return durations[industry as keyof typeof durations] || 30;
  }

  private getPreferredConsultationType(industry: string): 'video' | 'phone' | 'whatsapp' | 'in_person' {
    const types = {
      healthcare: 'video' as const,
      legal: 'video' as const,
      finance: 'phone' as const,
      technology: 'video' as const,
      realestate: 'video' as const
    };
    return types[industry as keyof typeof types] || 'whatsapp';
  }

  private async getConsultantName(agentId: string): Promise<string> {
    // Mock consultant data - in production, fetch from database
    const consultants = {
      '1': 'Dr. Rajesh Sharma',
      '2': 'Advocate Priya Patel',
      '3': 'CA Amit Kumar'
    };
    return consultants[agentId as keyof typeof consultants] || 'Professional Consultant';
  }

  private async getConsultantEmail(agentId: string): Promise<string> {
    // Mock consultant email - in production, fetch from database
    const emails = {
      '1': 'dr.rajesh@healthclinic.in',
      '2': 'priya@lawfirm.in',
      '3': 'amit@financeadvisors.in'
    };
    return emails[agentId as keyof typeof emails] || 'consultant@agenthub.in';
  }

  private formatDateTime(datetime: string | undefined): string {
    if (!datetime) return 'TBD';
    return new Date(datetime).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  }
}