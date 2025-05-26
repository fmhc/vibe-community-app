import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { emailService } from "~/services/email.server";
import { runEmailTest } from "~/services/__tests__/email.integration.test";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if email configuration is available
  const hasConfig = !!(
    process.env.TEST_MAIL_HOST &&
    process.env.TEST_MAIL_USER &&
    process.env.TEST_MAIL_PASS
  );

  const config = hasConfig ? {
    host: process.env.TEST_MAIL_HOST,
    user: process.env.TEST_MAIL_USER,
    port: process.env.TEST_MAIL_PORT || '587',
  } : null;

  return json({ hasConfig, config });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    switch (action) {
      case "test-connection": {
        const result = await emailService.testConnection();
        return json({ 
          type: "connection", 
          success: result.success, 
          message: result.success ? "Connection successful!" : result.error 
        });
      }

      case "send-test-email": {
        const to = formData.get("to") as string;
        if (!to) {
          return json({ type: "email", success: false, message: "Email address is required" });
        }

        const result = await emailService.sendEmail({
          to,
          subject: `Test Email - ${new Date().toISOString()}`,
          text: "This is a test email from the Vibe Coding Hamburg email service.",
          html: `
            <h2>Test Email</h2>
            <p>This is a test email from the Vibe Coding Hamburg email service.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><em>If you received this, the email service is working correctly!</em></p>
          `,
        });

        return json({ 
          type: "email", 
          success: result.success, 
          message: result.success 
            ? `Email sent successfully! Message ID: ${result.messageId}` 
            : result.error 
        });
      }

      case "send-welcome-email": {
        const to = formData.get("to") as string;
        const name = formData.get("name") as string;
        const projectInterest = formData.get("projectInterest") as string;

        if (!to || !name || !projectInterest) {
          return json({ 
            type: "welcome", 
            success: false, 
            message: "All fields are required for welcome email" 
          });
        }

        const result = await emailService.sendWelcomeEmail({
          email: to,
          name,
          projectInterest,
        });

        return json({ 
          type: "welcome", 
          success: result.success, 
          message: result.success 
            ? `Welcome email sent successfully! Message ID: ${result.messageId}` 
            : result.error 
        });
      }

      case "run-full-test": {
        const testResult = await runEmailTest();
        return json({ 
          type: "full-test", 
          success: testResult, 
          message: testResult ? "All tests passed!" : "Some tests failed - check console for details" 
        });
      }

      default:
        return json({ type: "error", success: false, message: "Unknown action" });
    }
  } catch (error) {
    return json({ 
      type: "error", 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}

export default function TestEmail() {
  const { hasConfig, config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold glow-text mb-4">Email Service Test</h1>
          <p className="text-gray-300">Test the email functionality for Vibe Coding Hamburg</p>
        </header>

        {/* Configuration Status */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Configuration Status</h2>
          {hasConfig ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>Email configuration found</span>
              </div>
              <div className="bg-vaporwave-card/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400">
                  <div><strong>Host:</strong> {config?.host}</div>
                  <div><strong>User:</strong> {config?.user}</div>
                  <div><strong>Port:</strong> {config?.port}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-red-400">❌</span>
                <span>Email configuration missing</span>
              </div>
              <div className="bg-red-500/20 p-4 rounded-lg text-red-200">
                <p>Required environment variables:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>TEST_MAIL_HOST</li>
                  <li>TEST_MAIL_USER</li>
                  <li>TEST_MAIL_PASS</li>
                  <li>TEST_MAIL_PORT (optional, defaults to 587)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Test Results */}
        {actionData && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Test Results</h2>
            <div className={`p-4 rounded-lg ${
              actionData.success 
                ? 'bg-green-500/20 border border-green-500/50 text-green-200' 
                : 'bg-red-500/20 border border-red-500/50 text-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{actionData.success ? '✅' : '❌'}</span>
                <span className="font-medium capitalize">{actionData.type} Test</span>
              </div>
              <p>{actionData.message}</p>
            </div>
          </div>
        )}

        {/* Test Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Connection Test */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4">Connection Test</h3>
            <p className="text-gray-400 mb-4">Test if we can connect to the email server</p>
            <Form method="post">
              <input type="hidden" name="action" value="test-connection" />
              <button
                type="submit"
                disabled={!hasConfig || isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Testing...' : 'Test Connection'}
              </button>
            </Form>
          </div>

          {/* Send Test Email */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4">Send Test Email</h3>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="action" value="send-test-email" />
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-gray-300 mb-2">
                  Send to:
                </label>
                <input
                  type="email"
                  id="to"
                  name="to"
                  defaultValue={config?.user || ''}
                  className="input-field w-full"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!hasConfig || isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Test Email'}
              </button>
            </Form>
          </div>

          {/* Send Welcome Email */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4">Send Welcome Email</h3>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="action" value="send-welcome-email" />
              <div>
                <label htmlFor="welcome-to" className="block text-sm font-medium text-gray-300 mb-2">
                  Send to:
                </label>
                <input
                  type="email"
                  id="welcome-to"
                  name="to"
                  defaultValue={config?.user || ''}
                  className="input-field w-full"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name:
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue="Test User"
                  className="input-field w-full"
                  placeholder="Full Name"
                  required
                />
              </div>
              <div>
                <label htmlFor="projectInterest" className="block text-sm font-medium text-gray-300 mb-2">
                  Project Interest:
                </label>
                <select
                  id="projectInterest"
                  name="projectInterest"
                  className="input-field w-full"
                  required
                >
                  <option value="web">Web App</option>
                  <option value="ai">AI Tool</option>
                  <option value="mobile">Mobile App</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!hasConfig || isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Welcome Email'}
              </button>
            </Form>
          </div>

          {/* Full Test Suite */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4">Full Test Suite</h3>
            <p className="text-gray-400 mb-4">Run all email tests including connection and sending</p>
            <Form method="post">
              <input type="hidden" name="action" value="run-full-test" />
              <button
                type="submit"
                disabled={!hasConfig || isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Running Tests...' : 'Run Full Test Suite'}
              </button>
            </Form>
          </div>
        </div>

        {/* Instructions */}
        <div className="card mt-8">
          <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Instructions</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">1. Set up environment variables</h4>
              <p>Create a <code className="bg-vaporwave-card px-2 py-1 rounded">.env</code> file with your email configuration:</p>
              <pre className="bg-vaporwave-card p-4 rounded-lg mt-2 text-sm overflow-x-auto">
{`TEST_MAIL_HOST=your-smtp-server.com
TEST_MAIL_USER=your-email@domain.com
TEST_MAIL_PASS=your-password
TEST_MAIL_PORT=587`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">2. Test connection</h4>
              <p>Start by testing the connection to ensure your SMTP settings are correct.</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">3. Send test emails</h4>
              <p>Send test emails to verify the email content and delivery.</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">4. Run automated tests</h4>
              <p>Use the command line to run the full test suite:</p>
              <pre className="bg-vaporwave-card p-4 rounded-lg mt-2 text-sm">
                npm run test -- email
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 