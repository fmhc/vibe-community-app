#!/usr/bin/env tsx

import { config } from 'dotenv';
import { emailService } from '../app/services/email.server';
import { runEmailTest } from '../app/services/__tests__/email.integration.test';

// Load environment variables
config();

async function main() {
  console.log('🧪 Vibe Coding Hamburg - Email Service Test');
  console.log('=' .repeat(50));
  
  // Check configuration
  const hasConfig = !!(
    process.env.TEST_MAIL_HOST &&
    process.env.TEST_MAIL_USER &&
    process.env.TEST_MAIL_PASS
  );

  if (!hasConfig) {
    console.log('❌ Email configuration missing!');
    console.log('Required environment variables:');
    console.log('- TEST_MAIL_HOST');
    console.log('- TEST_MAIL_USER');
    console.log('- TEST_MAIL_PASS');
    console.log('- TEST_MAIL_PORT (optional, defaults to 587)');
    process.exit(1);
  }

  console.log('✅ Email configuration found');
  console.log(`Host: ${process.env.TEST_MAIL_HOST}`);
  console.log(`User: ${process.env.TEST_MAIL_USER}`);
  console.log(`Port: ${process.env.TEST_MAIL_PORT || '587'}`);
  console.log('');

  try {
    // Test connection
    console.log('📡 Testing SMTP connection...');
    const connectionResult = await emailService.testConnection();
    
    if (!connectionResult.success) {
      console.log('❌ Connection failed:', connectionResult.error);
      process.exit(1);
    }
    
    console.log('✅ SMTP connection successful');
    console.log('');

    // Test basic email sending
    console.log('📧 Sending test email...');
    const testEmailResult = await emailService.sendEmail({
      to: process.env.TEST_MAIL_USER!,
      subject: `Vibe Coding Hamburg - Test Email ${new Date().toISOString()}`,
      text: 'This is a test email from the Vibe Coding Hamburg email service.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff006e;">Email Service Test</h2>
          <p>This is a test email from the Vibe Coding Hamburg email service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.TEST_MAIL_HOST}</li>
              <li><strong>User:</strong> ${process.env.TEST_MAIL_USER}</li>
              <li><strong>Port:</strong> ${process.env.TEST_MAIL_PORT || '587'}</li>
            </ul>
          </div>
          <p><em>If you received this email, the email service is working correctly! 🎉</em></p>
        </div>
      `,
    });

    if (!testEmailResult.success) {
      console.log('❌ Test email failed:', testEmailResult.error);
      process.exit(1);
    }

    console.log('✅ Test email sent successfully');
    console.log(`📬 Message ID: ${testEmailResult.messageId}`);
    console.log('');

    // Test welcome email
    console.log('🎉 Sending welcome email...');
    const welcomeEmailResult = await emailService.sendWelcomeEmail({
      name: 'Test User',
      email: process.env.TEST_MAIL_USER!,
      projectInterest: 'ai',
    });

    if (!welcomeEmailResult.success) {
      console.log('❌ Welcome email failed:', welcomeEmailResult.error);
      process.exit(1);
    }

    console.log('✅ Welcome email sent successfully');
    console.log(`📬 Message ID: ${welcomeEmailResult.messageId}`);
    console.log('');

    // Run full integration test
    console.log('🔄 Running full integration test suite...');
    const fullTestResult = await runEmailTest();

    if (!fullTestResult) {
      console.log('❌ Some integration tests failed');
      process.exit(1);
    }

    console.log('✅ All integration tests passed!');
    console.log('');
    console.log('🎉 Email service is fully functional!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your email inbox for the test messages');
    console.log('2. Run the automated test suite: npm run test -- email');
    console.log('3. Visit /test-email in your app for interactive testing');

  } catch (error) {
    console.error('❌ Email test failed with error:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Vibe Coding Hamburg - Email Service Test');
  console.log('');
  console.log('Usage: npm run test:email');
  console.log('       tsx scripts/test-email.ts');
  console.log('');
  console.log('Environment variables required:');
  console.log('  TEST_MAIL_HOST - SMTP server hostname');
  console.log('  TEST_MAIL_USER - Email username/address');
  console.log('  TEST_MAIL_PASS - Email password');
  console.log('  TEST_MAIL_PORT - SMTP port (optional, defaults to 587)');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  process.exit(0);
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 