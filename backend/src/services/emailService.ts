/**
 * Email Service - Postmark Integration
 * 
 * Handles all transactional email sending with:
 * - Internal team notifications
 * - User confirmations
 * - Newsletter confirmation emails
 * - Welcome emails
 * 
 * Uses Postmark for reliable delivery.
 */

import { databaseService } from './database';

// Postmark API configuration
const POSTMARK_API_URL = 'https://api.postmarkapp.com/email';

interface EmailPayload {
  From: string;
  To: string;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  Tag?: string;
  Metadata?: Record<string, string>;
  MessageStream?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  tag?: string;
  metadata?: Record<string, string>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

class EmailService {
  private apiToken: string | undefined;
  private fromEmail: string;
  private teamEmail: string;
  private baseUrl: string;
  private maxRetries: number = 3;

  constructor() {
    this.apiToken = process.env.POSTMARK_API_TOKEN;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@forzabuilt.com';
    this.teamEmail = process.env.TEAM_EMAIL || 'team@forzabuilt.com';
    this.baseUrl = process.env.FRONTEND_URL || 'https://forzabuilt.com';
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Send an email via Postmark
   */
  private async sendEmail(options: SendEmailOptions, retryCount = 0): Promise<EmailResult> {
    if (!this.isConfigured()) {
      console.warn('[EmailService] Postmark not configured. Email not sent:', options.subject);
      return { 
        success: false, 
        errorMessage: 'Email service not configured' 
      };
    }

    const payload: EmailPayload = {
      From: this.fromEmail,
      To: options.to,
      Subject: options.subject,
      TextBody: options.textBody,
      HtmlBody: options.htmlBody,
      Tag: options.tag,
      Metadata: options.metadata,
      MessageStream: 'outbound'
    };

    try {
      const response = await fetch(POSTMARK_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.apiToken!
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.Message || `Postmark error: ${response.status}`);
      }

      await this.logEmailSend({
        emailType: options.tag || 'general',
        recipientEmail: options.to,
        subject: options.subject,
        status: 'sent',
        providerMessageId: data.MessageID,
        providerResponse: JSON.stringify(data),
        metadata: options.metadata
      });

      console.log(`[EmailService] Email sent successfully to ${options.to}: ${data.MessageID}`);
      return { success: true, messageId: data.MessageID };

    } catch (error: any) {
      console.error(`[EmailService] Failed to send email to ${options.to}:`, error.message);

      // Retry logic for transient failures
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.log(`[EmailService] Retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.sendEmail(options, retryCount + 1);
      }

      await this.logEmailSend({
        emailType: options.tag || 'general',
        recipientEmail: options.to,
        subject: options.subject,
        status: 'failed',
        errorMessage: error.message,
        metadata: options.metadata,
        retryCount
      });

      return { success: false, errorMessage: error.message };
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors or 5xx status codes
    return error.message?.includes('fetch') || 
           error.message?.includes('network') ||
           error.message?.includes('5');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log email send attempt to database
   */
  private async logEmailSend(data: {
    emailType: string;
    recipientEmail: string;
    subject: string;
    status: string;
    providerMessageId?: string;
    providerResponse?: string;
    errorMessage?: string;
    metadata?: Record<string, string>;
    retryCount?: number;
  }): Promise<void> {
    if (!databaseService.isPostgres()) {
      return; // Skip logging for non-Postgres
    }

    try {
      const client = await databaseService.getClient();
      try {
        await client.query(`
          INSERT INTO email_logs (
            email_type, recipient_email, subject, status,
            provider_message_id, provider_response, error_message,
            metadata, retry_count, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          data.emailType,
          data.recipientEmail,
          data.subject,
          data.status,
          data.providerMessageId || null,
          data.providerResponse || null,
          data.errorMessage || null,
          JSON.stringify(data.metadata || {}),
          data.retryCount || 0,
          data.status === 'sent' ? new Date() : null
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[EmailService] Failed to log email:', error);
    }
  }

  // ===== CONTACT FORM EMAILS =====

  /**
   * Send internal notification when someone submits the contact form
   */
  async sendContactInternalNotification(data: {
    submissionId: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    pageUrl?: string;
  }): Promise<EmailResult> {
    const sanitizedMessage = this.sanitizeUserContent(data.message);
    const truncatedPreview = sanitizedMessage.substring(0, 100) + (sanitizedMessage.length > 100 ? '...' : '');

    const textBody = `
New Contact Form Submission

ID: ${data.submissionId}
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Page: ${data.pageUrl || 'N/A'}

Message:
${sanitizedMessage}

---
This is an automated notification from the Forza Built website.
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none; }
    .field { margin-bottom: 15px; }
    .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; }
    .message-box { background: white; padding: 15px; border-left: 4px solid #1a1a2e; margin-top: 10px; }
    .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
    .badge { display: inline-block; background: #e8f4fd; color: #1a73e8; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📬 New Contact Form Submission</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Submission ID</div>
        <div class="value"><span class="badge">${data.submissionId}</span></div>
      </div>
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${this.escapeHtml(data.firstName)} ${this.escapeHtml(data.lastName)}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${this.escapeHtml(data.email)}">${this.escapeHtml(data.email)}</a></div>
      </div>
      ${data.pageUrl ? `
      <div class="field">
        <div class="label">Submitted From</div>
        <div class="value"><a href="${this.escapeHtml(data.pageUrl)}">${this.escapeHtml(data.pageUrl)}</a></div>
      </div>
      ` : ''}
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">${this.escapeHtml(sanitizedMessage).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="footer">
        This is an automated notification from the Forza Built website.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: this.teamEmail,
      subject: `Contact Form: ${data.firstName} ${data.lastName} - ${truncatedPreview}`,
      textBody,
      htmlBody,
      tag: 'contact-internal',
      metadata: { submissionId: data.submissionId }
    });
  }

  /**
   * Send confirmation email to the user who submitted the contact form
   */
  async sendContactConfirmation(data: {
    submissionId: string;
    firstName: string;
    email: string;
  }): Promise<EmailResult> {
    const textBody = `
Hi ${data.firstName},

Thank you for reaching out to Forza Built! We've received your message and our team will get back to you shortly.

Your submission reference: ${data.submissionId}

In the meantime, feel free to explore our products and solutions at ${this.baseUrl}

Best regards,
The Forza Built Team

---
Forza Built - Industrial Adhesives & Sealants
${this.baseUrl}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .reference { background: #f5f5f5; padding: 10px 15px; border-radius: 4px; font-family: monospace; display: inline-block; }
    .cta { display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORZA BUILT</div>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for contacting us</p>
    </div>
    <div class="content">
      <h2>Hi ${this.escapeHtml(data.firstName)},</h2>
      <p>Thank you for reaching out! We've received your message and our team will get back to you shortly.</p>
      <p><strong>Your reference number:</strong></p>
      <p class="reference">${data.submissionId}</p>
      <p>In the meantime, feel free to explore our products and solutions:</p>
      <a href="${this.baseUrl}" class="cta">Visit Our Website</a>
      <p style="margin-top: 30px;">Best regards,<br><strong>The Forza Built Team</strong></p>
    </div>
    <div class="footer">
      <p>Forza Built - Industrial Adhesives & Sealants</p>
      <p><a href="${this.baseUrl}">${this.baseUrl}</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: data.email,
      subject: `We received your message - Forza Built`,
      textBody,
      htmlBody,
      tag: 'contact-confirmation',
      metadata: { submissionId: data.submissionId }
    });
  }

  // ===== NEWSLETTER EMAILS =====

  /**
   * Send double opt-in confirmation email for newsletter
   */
  async sendNewsletterConfirmation(data: {
    email: string;
    confirmToken: string;
  }): Promise<EmailResult> {
    const confirmUrl = `${this.baseUrl}/newsletter/confirm/?token=${data.confirmToken}`;

    const textBody = `
Welcome to the Forza Built Newsletter!

Please confirm your subscription by clicking the link below:

${confirmUrl}

This link will expire in 24 hours.

If you didn't subscribe to our newsletter, you can safely ignore this email.

Best regards,
The Forza Built Team

---
Forza Built - Industrial Adhesives & Sealants
${this.baseUrl}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; text-align: center; }
    .cta { display: inline-block; background: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .cta:hover { background: #16a34a; }
    .note { font-size: 14px; color: #666; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORZA BUILT</div>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Newsletter Subscription</p>
    </div>
    <div class="content">
      <h2>Confirm Your Subscription</h2>
      <p>You're one click away from receiving the latest updates, product news, and industry insights from Forza Built.</p>
      <a href="${confirmUrl}" class="cta">✓ Confirm Subscription</a>
      <p class="note">This link will expire in 24 hours.<br>If you didn't subscribe, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Forza Built - Industrial Adhesives & Sealants</p>
      <p><a href="${this.baseUrl}">${this.baseUrl}</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: data.email,
      subject: `Confirm your newsletter subscription - Forza Built`,
      textBody,
      htmlBody,
      tag: 'newsletter-confirm'
    });
  }

  /**
   * Send welcome email after newsletter subscription is confirmed
   */
  async sendNewsletterWelcome(data: {
    email: string;
    unsubscribeToken: string;
  }): Promise<EmailResult> {
    const unsubscribeUrl = `${this.baseUrl}/newsletter/unsubscribe/?token=${data.unsubscribeToken}`;

    const textBody = `
Welcome to the Forza Built Newsletter!

Thank you for confirming your subscription. You'll now receive:

- Product updates and new releases
- Industry insights and best practices
- Exclusive offers and promotions
- Technical tips and application guides

Visit our website to explore our full range of industrial adhesives and sealants:
${this.baseUrl}

Best regards,
The Forza Built Team

---
Forza Built - Industrial Adhesives & Sealants
${this.baseUrl}

To unsubscribe: ${unsubscribeUrl}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .check { font-size: 48px; margin-bottom: 10px; }
    .benefits { background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .benefit { display: flex; align-items: center; margin: 10px 0; }
    .benefit-icon { margin-right: 10px; color: #22c55e; }
    .cta { display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORZA BUILT</div>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to Our Newsletter!</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <div class="check">✅</div>
        <h2>You're All Set!</h2>
      </div>
      <p>Thank you for confirming your subscription. Here's what you can expect:</p>
      <div class="benefits">
        <div class="benefit"><span class="benefit-icon">📦</span> Product updates and new releases</div>
        <div class="benefit"><span class="benefit-icon">💡</span> Industry insights and best practices</div>
        <div class="benefit"><span class="benefit-icon">🎁</span> Exclusive offers and promotions</div>
        <div class="benefit"><span class="benefit-icon">🔧</span> Technical tips and application guides</div>
      </div>
      <p style="text-align: center;">
        <a href="${this.baseUrl}" class="cta">Explore Our Products</a>
      </p>
      <p style="margin-top: 30px;">Best regards,<br><strong>The Forza Built Team</strong></p>
    </div>
    <div class="footer">
      <p>Forza Built - Industrial Adhesives & Sealants</p>
      <p><a href="${this.baseUrl}">${this.baseUrl}</a></p>
      <p style="margin-top: 15px;"><a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: data.email,
      subject: `Welcome to Forza Built Newsletter!`,
      textBody,
      htmlBody,
      tag: 'newsletter-welcome'
    });
  }

  // ===== UTILITIES =====

  /**
   * Sanitize user-provided content to prevent injection
   */
  private sanitizeUserContent(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim()
      .substring(0, 10000); // Limit length
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
  }
}

export const emailService = new EmailService();

