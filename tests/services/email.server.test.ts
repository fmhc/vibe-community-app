import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { emailService } from '../../app/services/email.server';

// Mock i18next
vi.mock('~/i18n.server', () => ({
  default: {
    getFixedT: vi.fn(() => (key: string, options?: any) => {
      // Mock translations for English
      const translations: Record<string, string> = {
        'email.verification.subject': 'Please verify your email address - Vibe Coding Hamburg',
        'email.verification.title': 'Welcome to Vibe Coding Hamburg!',
        'email.verification.subtitle': 'Please verify your email address to complete your registration',
        'email.verification.greeting': `Hi ${options?.name || 'User'}! 👋`,
        'email.verification.message': 'Thank you for joining our community of developers exploring AI and software development in Hamburg!',
        'email.verification.instruction': 'To complete your registration and start receiving community updates, please verify your email address by clicking the button below:',
        'email.verification.button': 'Verify Email Address',
        'email.verification.linkText': 'Or copy and paste this link into your browser:',
        'email.verification.expiry': 'This verification link will expire in 24 hours.',
        'email.verification.ignore': 'If you didn\'t create an account with Vibe Coding Hamburg, you can safely ignore this email.',
        'email.welcome.subject': 'Welcome to Vibe Coding Hamburg! 🚀',
        'email.welcome.title': 'Welcome to Vibe Coding Hamburg!',
        'email.welcome.subtitle': 'Where AI meets creativity in Hamburg\'s tech scene',
        'email.welcome.greeting': `Hi ${options?.name || 'User'}! 👋`,
        'email.welcome.message': 'We\'re excited to have you join our community of developers exploring the intersection of artificial intelligence and software development.',
        'email.welcome.projectInterest': `We noticed you're interested in ${options?.projectInterest} projects - that's awesome! Our community is full of like-minded developers who love to collaborate and share knowledge.`,
        'email.welcome.fallbackMessage': 'Our community is full of like-minded developers who love to collaborate and share knowledge.',
        'email.welcome.nextSteps': 'What\'s Next?',
        'email.welcome.steps.events': 'Join our upcoming AI Builder Cafe events',
        'email.welcome.steps.connect': 'Connect with fellow developers on our Discord/Mattermost',
        'email.welcome.steps.projects': 'Share your project ideas and get feedback',
        'email.welcome.steps.learn': 'Learn about the latest AI tools and techniques',
        'email.welcome.keepInTouch': 'Keep an eye on your inbox for event invitations and community updates!',
        'email.welcome.button': 'Visit Our Website',
        'email.welcome.signature': 'Happy coding!<br>The Vibe Coding Hamburg Team',
        'email.welcome.unsubscribe': 'You\'re receiving this email because you verified your account with Vibe Coding Hamburg.',
        'email.welcome.unsubscribeLink': 'Unsubscribe from all emails',
        'email.welcome.preferencesLink': 'Manage email preferences',
      };
      return translations[key] || key;
    }),
  },
}));

// Mock nodemailer
vi.mock('nodemailer');

const mockTransporter = {
  sendMail: vi.fn(),
  verify: vi.fn(),
};

const mockCreateTransporter = vi.mocked(nodemailer.createTransport);

describe('EmailService', () => {
  let emailService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateTransporter.mockReturnValue(mockTransporter as any);
    
    // Mock environment variables
    process.env.TEST_MAIL_HOST = 'test.example.com';
    process.env.TEST_MAIL_USER = 'test@example.com';
    process.env.TEST_MAIL_PASS = 'testpass';
    process.env.TEST_MAIL_PORT = '587';

    // Reset modules to ensure fresh import with new env vars
    vi.resetModules();
    
    // Dynamically import the service after setting env vars
    const module = await import('../../app/services/email.server');
    emailService = module.emailService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up environment variables
    delete process.env.TEST_MAIL_HOST;
    delete process.env.TEST_MAIL_USER;
    delete process.env.TEST_MAIL_PASS;
    delete process.env.TEST_MAIL_PORT;
  });

  describe('Email Configuration', () => {
    it('should initialize transporter with correct configuration', () => {
      expect(mockCreateTransporter).toHaveBeenCalledWith({
        host: 'test.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpass',
        },
      });
    });

    it('should use secure connection for port 465', async () => {
      process.env.TEST_MAIL_PORT = '465';
      
      // Re-import to trigger new initialization
      vi.resetModules();
      const module = await import('../../app/services/email.server');
      
      expect(mockCreateTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.TEST_MAIL_HOST;
      delete process.env.TEST_MAIL_USER;
      delete process.env.TEST_MAIL_PASS;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Re-import to trigger new initialization
      vi.resetModules();
      const module = await import('../../app/services/email.server');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Email configuration missing. Email functionality will be disabled.'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockMessageId = 'test-message-id';
      mockTransporter.sendMail.mockResolvedValue({ messageId: mockMessageId });

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>',
      };

      const result = await emailService.sendEmail(emailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>',
      });

      expect(result).toEqual({
        success: true,
        messageId: mockMessageId,
      });
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      };

      const result = await emailService.sendEmail(emailData);

      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockTransporter.sendMail.mockRejectedValue('String error');

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      };

      const result = await emailService.sendEmail(emailData);

      expect(result).toEqual({
        success: false,
        error: 'Unknown error',
      });
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct content', async () => {
      const mockMessageId = 'verification-message-id';
      mockTransporter.sendMail.mockResolvedValue({ messageId: mockMessageId });

      const memberData = {
        name: 'John Doe',
        email: 'john@example.com',
        verificationToken: 'abc123token',
      };

      const result = await emailService.sendVerificationEmail(memberData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'john@example.com',
          subject: 'Please verify your email address - Vibe Coding Hamburg',
        })
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Hi John Doe! 👋');
      expect(callArgs.html).toContain('/verify-email?token=abc123token');
      expect(callArgs.text).toContain('Hi John Doe! 👋');
      expect(callArgs.text).toContain('/verify-email?token=abc123token');

      expect(result).toEqual({
        success: true,
        messageId: mockMessageId,
      });
    });

    it('should use APP_URL environment variable for verification link', async () => {
      const originalAppUrl = process.env.APP_URL;
      process.env.APP_URL = 'https://vibe-coding.hamburg';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const memberData = {
        name: 'John Doe',
        email: 'john@example.com',
        verificationToken: 'abc123token',
      };

      await emailService.sendVerificationEmail(memberData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://vibe-coding.hamburg/verify-email?token=abc123token');
      expect(callArgs.text).toContain('https://vibe-coding.hamburg/verify-email?token=abc123token');

      // Restore original value
      process.env.APP_URL = originalAppUrl;
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct content', async () => {
      const mockMessageId = 'welcome-message-id';
      mockTransporter.sendMail.mockResolvedValue({ messageId: mockMessageId });

      const memberData = {
        name: 'John Doe',
        email: 'john@example.com',
        projectInterest: 'web',
      };

      const result = await emailService.sendWelcomeEmail(memberData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'john@example.com',
          subject: 'Welcome to Vibe Coding Hamburg! 🚀',
        })
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Hi John Doe! 👋');
      expect(callArgs.html).toContain('interested in web projects');
      expect(callArgs.text).toContain('Hi John Doe! 👋');
      expect(callArgs.text).toContain('interested in web projects');

      expect(result).toEqual({
        success: true,
        messageId: mockMessageId,
      });
    });

    it('should handle different project interests', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const memberData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        projectInterest: 'ai',
      };

      await emailService.sendWelcomeEmail(memberData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('interested in ai projects');
      expect(callArgs.text).toContain('interested in ai projects');
    });

    it('should include unsubscribe links when token provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const memberData = {
        name: 'John Doe',
        email: 'john@example.com',
        projectInterest: 'web',
        unsubscribeToken: 'unsubscribe123',
      };

      await emailService.sendWelcomeEmail(memberData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('/unsubscribe?token=unsubscribe123');
      expect(callArgs.text).toContain('/unsubscribe?token=unsubscribe123');
    });

    it('should not include unsubscribe links when no token provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const memberData = {
        name: 'John Doe',
        email: 'john@example.com',
        projectInterest: 'web',
      };

      await emailService.sendWelcomeEmail(memberData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('/unsubscribe');
      expect(callArgs.text).not.toContain('/unsubscribe');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailService.testConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should handle connection test failure', async () => {
      const error = new Error('Connection timeout');
      mockTransporter.verify.mockRejectedValue(error);

      const result = await emailService.testConnection();

      expect(result).toEqual({
        success: false,
        error: 'Connection timeout',
      });
    });

    it('should handle non-Error exceptions in connection test', async () => {
      mockTransporter.verify.mockRejectedValue('Connection failed');

      const result = await emailService.testConnection();

      expect(result).toEqual({
        success: false,
        error: 'Connection test failed',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle missing transporter gracefully', async () => {
      // Test the case where transporter is not configured
      const emailData = {
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      };

      // Create a new email service instance without proper configuration
      // by temporarily removing environment variables
      const originalHost = process.env.TEST_MAIL_HOST;
      delete process.env.TEST_MAIL_HOST;
      
      // Reset modules to get a fresh instance
      vi.resetModules();
      const module = await import('../../app/services/email.server');
      
      const result = await module.emailService.sendEmail(emailData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
      
      // Restore environment variable
      process.env.TEST_MAIL_HOST = originalHost;
    });
  });
}); 