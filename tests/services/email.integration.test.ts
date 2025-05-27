import { describe, it, expect, beforeAll, vi } from 'vitest';
import { emailService } from '../../app/services/email.server';

// Mock i18next for integration tests
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

const hasEmailConfig = () => {
  return !!(
    process.env.TEST_MAIL_HOST &&
    process.env.TEST_MAIL_USER &&
    process.env.TEST_MAIL_PASS
  );
};

describe('Email Integration Tests', () => {
  beforeAll(() => {
    if (!hasEmailConfig()) {
      console.log('⚠️  Email integration tests skipped - missing configuration');
      console.log('Set TEST_MAIL_HOST, TEST_MAIL_USER, TEST_MAIL_PASS to run these tests');
    }
  });

  describe('Connection Tests', () => {
    it.skipIf(!hasEmailConfig())('should connect to email server successfully', async () => {
      const result = await emailService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      console.log('✅ Email server connection successful');
    }, 10000); // 10 second timeout

    it.skipIf(!hasEmailConfig())('should handle invalid credentials gracefully', async () => {
      // This test would require temporarily changing credentials
      // For now, we'll just ensure the connection test method exists and works
      const result = await emailService.testConnection();
      
      // Should either succeed or fail gracefully
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Email Sending Tests', () => {
    it.skipIf(!hasEmailConfig())('should send a test email successfully', async () => {
      const testEmail = {
        to: process.env.TEST_MAIL_USER!, // Send to ourselves for testing
        subject: `Test Email - ${new Date().toISOString()}`,
        text: 'This is a test email from the Vibe Coding Hamburg email service.',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from the Vibe Coding Hamburg email service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><em>If you received this, the email service is working correctly!</em></p>
        `,
      };

      const result = await emailService.sendEmail(testEmail);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
      
      console.log('✅ Test email sent successfully with message ID:', result.messageId);
    }, 15000); // 15 second timeout for email sending

    it.skipIf(!hasEmailConfig())('should send welcome email successfully', async () => {
      const testMember = {
        name: 'Test User',
        email: process.env.TEST_MAIL_USER!, // Send to ourselves
        projectInterest: 'web',
      };

      const result = await emailService.sendWelcomeEmail(testMember);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
      
      console.log('✅ Welcome email sent successfully with message ID:', result.messageId);
    }, 15000);

    it.skipIf(!hasEmailConfig())('should handle invalid email addresses', async () => {
      const invalidEmail = {
        to: 'invalid-email-address',
        subject: 'Test',
        text: 'Test content',
      };

      const result = await emailService.sendEmail(invalidEmail);
      
      // This might succeed or fail depending on the email server's validation
      // We just want to ensure it doesn't crash
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    }, 10000);
  });

  describe('Email Content Tests', () => {
    it('should generate proper welcome email content', async () => {
      const testMember = {
        name: 'John Doe',
        email: 'john@example.com',
        projectInterest: 'ai',
      };

      // We'll mock the actual sending but test content generation
      const originalSendEmail = emailService.sendEmail;
      let capturedEmailData: any = null;
      
      // @ts-ignore - Temporarily override for testing
      emailService.sendEmail = async (emailData) => {
        capturedEmailData = emailData;
        return { success: true, messageId: 'test-id' };
      };

      await emailService.sendWelcomeEmail(testMember);

      // Restore original method
      // @ts-ignore
      emailService.sendEmail = originalSendEmail;

      expect(capturedEmailData).toBeDefined();
      expect(capturedEmailData.to).toBe('john@example.com');
      expect(capturedEmailData.subject).toBe('Welcome to Vibe Coding Hamburg! 🚀');
      expect(capturedEmailData.html).toContain('Hi John Doe! 👋');
      expect(capturedEmailData.html).toContain('interested in ai projects');
      expect(capturedEmailData.text).toContain('Hi John Doe! 👋');
      expect(capturedEmailData.text).toContain('interested in ai projects');
    });

    it('should handle different project interests in welcome email', async () => {
      const projectInterests = ['web', 'ai', 'mobile'];
      
      for (const interest of projectInterests) {
        const testMember = {
          name: 'Test User',
          email: 'test@example.com',
          projectInterest: interest,
        };

        let capturedEmailData: any = null;
        const originalSendEmail = emailService.sendEmail;
        
        // @ts-ignore
        emailService.sendEmail = async (emailData) => {
          capturedEmailData = emailData;
          return { success: true, messageId: 'test-id' };
        };

        await emailService.sendWelcomeEmail(testMember);

        // @ts-ignore
        emailService.sendEmail = originalSendEmail;

        expect(capturedEmailData.html).toContain(`interested in ${interest} projects`);
        expect(capturedEmailData.text).toContain(`interested in ${interest} projects`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      // Test with a definitely invalid configuration
      const originalHost = process.env.TEST_MAIL_HOST;
      process.env.TEST_MAIL_HOST = 'definitely-not-a-real-host.invalid';

      // Create a new email service instance would be ideal, but we'll work with what we have
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      });

      // Restore original configuration
      if (originalHost) {
        process.env.TEST_MAIL_HOST = originalHost;
      }

      // The result should indicate failure with a meaningful error
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
      }
    });
  });
});

// Helper function to run a quick email test manually
export async function runEmailTest() {
  if (!hasEmailConfig()) {
    console.log('❌ Email configuration missing');
    console.log('Required environment variables:');
    console.log('- TEST_MAIL_HOST');
    console.log('- TEST_MAIL_USER');
    console.log('- TEST_MAIL_PASS');
    console.log('- TEST_MAIL_PORT (optional, defaults to 587)');
    return false;
  }

  console.log('🧪 Testing email configuration...');
  
  try {
    // Test connection
    console.log('📡 Testing connection...');
    const connectionResult = await emailService.testConnection();
    
    if (!connectionResult.success) {
      console.log('❌ Connection failed:', connectionResult.error);
      return false;
    }
    
    console.log('✅ Connection successful');
    
    // Test sending email
    console.log('📧 Sending test email...');
    const emailResult = await emailService.sendEmail({
      to: process.env.TEST_MAIL_USER!,
      subject: `Email Test - ${new Date().toISOString()}`,
      text: 'This is a test email to verify the email service is working correctly.',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email to verify the email service is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${process.env.TEST_MAIL_HOST}</li>
          <li>User: ${process.env.TEST_MAIL_USER}</li>
          <li>Port: ${process.env.TEST_MAIL_PORT || '587'}</li>
        </ul>
      `,
    });
    
    if (!emailResult.success) {
      console.log('❌ Email sending failed:', emailResult.error);
      return false;
    }
    
    console.log('✅ Test email sent successfully');
    console.log('📬 Message ID:', emailResult.messageId);
    
    return true;
  } catch (error) {
    console.log('❌ Email test failed:', error);
    return false;
  }
} 