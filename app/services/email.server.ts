import nodemailer from 'nodemailer';
import i18next from '~/i18n.server';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  
  constructor() {
    this.initializeTransporter();
  }
  
  private initializeTransporter() {
    const host = process.env.TEST_MAIL_HOST;
    const user = process.env.TEST_MAIL_USER;
    const pass = process.env.TEST_MAIL_PASS;
    const port = parseInt(process.env.TEST_MAIL_PORT || '587');
    
    if (!host || !user || !pass) {
      console.warn('Email configuration missing. Email functionality will be disabled.');
      return;
    }
    
    const config: EmailConfig = {
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    };
    
    this.transporter = nodemailer.createTransport(config);
  }
  
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const info = await this.transporter.sendMail({
        from: process.env.TEST_MAIL_USER,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  async sendVerificationEmail(memberData: { name: string; email: string; verificationToken: string }, locale: string = 'en') {
    const t = await i18next.getFixedT(locale);
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${memberData.verificationToken}`;
    
    const subject = t('email.verification.subject');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff006e, #8338ec); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { color: #8338ec; font-weight: bold; }
            .cta { background: #00f5ff; color: #0a0a0f; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t('email.verification.title')}</h1>
              <p>${t('email.verification.subtitle')}</p>
            </div>
            <div class="content">
              <h2>${t('email.verification.greeting', { name: memberData.name })}</h2>
              <p>${t('email.verification.message')}</p>
              
              <p>${t('email.verification.instruction')}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="cta">${t('email.verification.button')}</a>
              </div>
              
              <p>${t('email.verification.linkText')}</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
              
              <p><strong>${t('email.verification.expiry')}</strong></p>
              
              <div class="footer">
                <p>${t('email.verification.ignore')}</p>
                <p>© 2024 Vibe Coding Hamburg</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      ${t('email.verification.title')}
      
      ${t('email.verification.greeting', { name: memberData.name })}
      
      ${t('email.verification.message')}
      
      ${t('email.verification.instruction')}
      
      ${verificationUrl}
      
      ${t('email.verification.expiry')}
      
      ${t('email.verification.ignore')}
      
      © 2024 Vibe Coding Hamburg
    `;
    
    return this.sendEmail({
      to: memberData.email,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string, locale: string = 'en') {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const subject = 'Reset Your Password - Vibe Coding Hamburg';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff006e, #8338ec); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta { background: #00f5ff; color: #0a0a0f; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌊 Vibe Coding Hamburg</h1>
              <p>Reset Your Password</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              
              <p>We received a request to reset your password for your Vibe Coding Hamburg account.</p>
              
              <p>Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="cta">Reset Password</a>
              </div>
              
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p><strong>This link will expire in 24 hours for security reasons.</strong></p>
              
              <div class="footer">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Reset Your Password - Vibe Coding Hamburg
      
      Hi ${name},
      
      We received a request to reset your password for your Vibe Coding Hamburg account.
      
      Click this link to create a new password: ${resetUrl}
      
      If you didn't request this password reset, you can safely ignore this email.
      
      This link will expire in 24 hours for security reasons.
      
      © 2024 Vibe Coding Hamburg
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  async sendAccountDeletionEmail(to: string, name: string, locale: string = 'en') {
    const subject = 'Account Deletion Confirmation - Vibe Coding Hamburg';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff006e, #8338ec); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌊 Vibe Coding Hamburg</h1>
              <p>Account Deletion Confirmation</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              
              <p>This email confirms that your Vibe Coding Hamburg account has been successfully deleted.</p>
              
              <p><strong>What was deleted:</strong></p>
              <ul>
                <li>Your account information</li>
                <li>Community profile and preferences</li>
                <li>Email subscription settings</li>
                <li>All personal data associated with your account</li>
              </ul>
              
              <p>As required by GDPR, we have removed all your personal data from our systems. Some anonymized data may be retained for statistical purposes only.</p>
              
              <p>Thank you for being part of the Vibe Coding Hamburg community. You're always welcome to rejoin in the future!</p>
              
              <div class="footer">
                <p>If you have any questions about this deletion, please contact: <a href="mailto:privacy@vibe-coding.hamburg">privacy@vibe-coding.hamburg</a></p>
                <p>© 2024 Vibe Coding Hamburg</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Account Deletion Confirmation - Vibe Coding Hamburg
      
      Hi ${name},
      
      This email confirms that your Vibe Coding Hamburg account has been successfully deleted.
      
      What was deleted:
      - Your account information
      - Community profile and preferences
      - Email subscription settings
      - All personal data associated with your account
      
      As required by GDPR, we have removed all your personal data from our systems.
      
      Thank you for being part of the Vibe Coding Hamburg community!
      
      If you have questions, contact: privacy@vibe-coding.hamburg
      
      © 2024 Vibe Coding Hamburg
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  async sendDataRequestEmail(request: {
    userEmail: string;
    userName: string;
    requestType: string;
    description: string;
    userId: string;
  }) {
    const subject = `GDPR Data Request: ${request.requestType} - ${request.userEmail}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #333; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 GDPR Data Request</h1>
              <p>Privacy Team Notification</p>
            </div>
            <div class="content">
              <h2>New Data Request Submitted</h2>
              
              <div class="highlight">
                <p><strong>User:</strong> ${request.userName} (${request.userEmail})</p>
                <p><strong>User ID:</strong> ${request.userId}</p>
                <p><strong>Request Type:</strong> ${request.requestType}</p>
                <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
              </div>
              
              <h3>Request Description:</h3>
              <p>${request.description}</p>
              
              <h3>Required Actions:</h3>
              <ul>
                <li>Verify user identity</li>
                <li>Process request according to GDPR requirements</li>
                <li>Respond within 30 days</li>
                <li>Document the response</li>
              </ul>
              
              <p><strong>Response required by:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      GDPR Data Request - Privacy Team Notification
      
      User: ${request.userName} (${request.userEmail})
      User ID: ${request.userId}
      Request Type: ${request.requestType}
      Submitted: ${new Date().toISOString()}
      
      Description:
      ${request.description}
      
      Required Actions:
      - Verify user identity
      - Process request according to GDPR
      - Respond within 30 days
      - Document the response
      
      Response required by: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
    `;

    return this.sendEmail({
      to: 'privacy@vibe-coding.hamburg',
      subject,
      text,
      html,
    });
  }

  async sendCampaignEmail(campaign: {
    to: string;
    name: string;
    subject: string;
    content: string;
    templateType: 'newsletter' | 'event' | 'project' | 'announcement';
    unsubscribeToken?: string;
  }) {
    const templateStyles = {
      newsletter: { headerColor: '#8338ec', emoji: '📰' },
      event: { headerColor: '#06d6a0', emoji: '📅' },
      project: { headerColor: '#ffd166', emoji: '💡' },
      announcement: { headerColor: '#ef233c', emoji: '📢' }
    };

    const template = templateStyles[campaign.templateType];
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${template.headerColor}, #ff006e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .button { background: #00f5ff; color: #0a0a0f; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${template.emoji} Vibe Coding Hamburg</h1>
              <p>${campaign.templateType.charAt(0).toUpperCase() + campaign.templateType.slice(1)}</p>
            </div>
            <div class="content">
              <h2>Hi ${campaign.name},</h2>
              
              <div>
                ${campaign.content}
              </div>
              
              <div class="footer">
                <p>Best regards,<br>The Vibe Coding Hamburg Team</p>
                ${campaign.unsubscribeToken ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="font-size: 12px; color: #888;">
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?token=${campaign.unsubscribeToken}" style="color: #666;">Unsubscribe</a> | 
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/email-preferences?token=${campaign.unsubscribeToken}" style="color: #666;">Email Preferences</a>
                  </p>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ${template.emoji} Vibe Coding Hamburg - ${campaign.templateType.charAt(0).toUpperCase() + campaign.templateType.slice(1)}
      
      Hi ${campaign.name},
      
      ${campaign.content.replace(/<[^>]*>/g, '')}
      
      Best regards,
      The Vibe Coding Hamburg Team
      
      ${campaign.unsubscribeToken ? `
      ---
      Unsubscribe: ${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?token=${campaign.unsubscribeToken}
      Email Preferences: ${process.env.APP_URL || 'http://localhost:3000'}/email-preferences?token=${campaign.unsubscribeToken}
      ` : ''}
    `;

    return this.sendEmail({
      to: campaign.to,
      subject: campaign.subject,
      text,
      html,
    });
  }

  async sendWelcomeEmail(memberData: { name: string; email: string; projectInterest?: string; unsubscribeToken?: string }, locale: string = 'en') {
    const t = await i18next.getFixedT(locale);
    const subject = t('email.welcome.subject');
    
    const projectInterestMessage = memberData.projectInterest 
      ? t('email.welcome.projectInterest', { projectInterest: memberData.projectInterest })
      : t('email.welcome.fallbackMessage');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff006e, #8338ec); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { color: #8338ec; font-weight: bold; }
            .cta { background: #00f5ff; color: #0a0a0f; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t('email.welcome.title')}</h1>
              <p>${t('email.welcome.subtitle')}</p>
            </div>
            <div class="content">
              <h2>${t('email.welcome.greeting', { name: memberData.name })}</h2>
              <p>${t('email.welcome.message')}</p>
              
              <p>${projectInterestMessage}</p>
              
              <h3>${t('email.welcome.nextSteps')}</h3>
              <ul>
                <li>🤖 ${t('email.welcome.steps.events')}</li>
                <li>🚀 ${t('email.welcome.steps.connect')}</li>
                <li>💡 ${t('email.welcome.steps.projects')}</li>
                <li>📚 ${t('email.welcome.steps.learn')}</li>
              </ul>
              
              <p>${t('email.welcome.keepInTouch')}</p>
              
              <a href="https://vibe-coding.hamburg" class="cta">${t('email.welcome.button')}</a>
              
              <p>${t('email.welcome.signature')}</p>
              
              ${memberData.unsubscribeToken ? `
              <div class="footer">
                <p>${t('email.welcome.unsubscribe')}</p>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?token=${memberData.unsubscribeToken}" style="color: #666; text-decoration: underline;">${t('email.welcome.unsubscribeLink')}</a> | <a href="${process.env.APP_URL || 'http://localhost:3000'}/email-preferences?token=${memberData.unsubscribeToken}" style="color: #666; text-decoration: underline;">${t('email.welcome.preferencesLink')}</a></p>
              </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      ${t('email.welcome.title')}
      
      ${t('email.welcome.greeting', { name: memberData.name })}
      
      ${t('email.welcome.message')}
      
      ${projectInterestMessage}
      
      ${t('email.welcome.nextSteps')}:
      - ${t('email.welcome.steps.events')}
      - ${t('email.welcome.steps.connect')}
      - ${t('email.welcome.steps.projects')}
      - ${t('email.welcome.steps.learn')}
      
      ${t('email.welcome.keepInTouch')}
      
      ${t('email.welcome.signature')}
      
      ${memberData.unsubscribeToken ? `
      ---
      ${t('email.welcome.unsubscribe')}
      ${t('email.welcome.unsubscribeLink')}: ${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?token=${memberData.unsubscribeToken}
      ${t('email.welcome.preferencesLink')}: ${process.env.APP_URL || 'http://localhost:3000'}/email-preferences?token=${memberData.unsubscribeToken}
      ` : ''}
    `;
    
    return this.sendEmail({
      to: memberData.email,
      subject,
      text,
      html,
    });
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

export const emailService = new EmailService();
export type { EmailData }; 