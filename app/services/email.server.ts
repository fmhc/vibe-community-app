import nodemailer from 'nodemailer';

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
  
  async sendWelcomeEmail(memberData: { name: string; email: string; projectInterest: string }) {
    const subject = 'Welcome to Vibe Coding Hamburg! 🚀';
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
              <h1>Welcome to Vibe Coding Hamburg!</h1>
              <p>Where AI meets creativity in Hamburg's tech scene</p>
            </div>
            <div class="content">
              <h2>Hi ${memberData.name}! 👋</h2>
              <p>We're excited to have you join our community of developers exploring the intersection of artificial intelligence and software development.</p>
              
              <p>We noticed you're interested in <span class="highlight">${memberData.projectInterest}</span> projects - that's awesome! Our community is full of like-minded developers who love to collaborate and share knowledge.</p>
              
              <h3>What's Next?</h3>
              <ul>
                <li>🤖 Join our upcoming AI Builder Cafe events</li>
                <li>🚀 Connect with fellow developers on our Discord/Mattermost</li>
                <li>💡 Share your project ideas and get feedback</li>
                <li>📚 Learn about the latest AI tools and techniques</li>
              </ul>
              
              <p>Keep an eye on your inbox for event invitations and community updates!</p>
              
              <a href="https://vibe-coding.hamburg" class="cta">Visit Our Website</a>
              
              <p>Happy coding!<br>
              The Vibe Coding Hamburg Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `
      Welcome to Vibe Coding Hamburg!
      
      Hi ${memberData.name}!
      
      We're excited to have you join our community of developers exploring AI and software development.
      
      We noticed you're interested in ${memberData.projectInterest} projects - that's awesome!
      
      What's Next:
      - Join our upcoming AI Builder Cafe events
      - Connect with fellow developers
      - Share your project ideas
      - Learn about AI tools and techniques
      
      Keep an eye on your inbox for updates!
      
      Happy coding!
      The Vibe Coding Hamburg Team
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