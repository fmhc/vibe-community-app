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