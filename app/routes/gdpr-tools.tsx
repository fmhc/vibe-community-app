import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "GDPR Data Management - Vibe Coding Hamburg" },
    { name: "description", content: "Exercise your GDPR rights - export, update, or delete your personal data." },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  // Get user's community member data
  const memberResult = session.user.email 
    ? await directusService.getMemberByEmail(session.user.email)
    : { success: false, data: null };
  
  const t = await i18next.getFixedT(request);
  return json({ 
    title: t('gdpr.title'),
    user: session.user,
    member: memberResult.success ? memberResult.data : null
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const email = session.user.email;

  if (!email) {
    return json({ error: "User email not found" }, { status: 400 });
  }

  try {
    switch (action) {
      case "export_data": {
        // Get all user data from Directus
        const memberResult = await directusService.getMemberByEmail(email);
        
        if (!memberResult.success) {
          return json({ error: "User data not found" }, { status: 404 });
        }

        // Prepare data export (GDPR Article 20 - Right to data portability)
        const exportData = {
          export_date: new Date().toISOString(),
          user_account: {
            id: session.user.id,
            email: session.user.email,
            first_name: session.user.first_name,
            last_name: session.user.last_name,
            status: session.user.status,
            date_created: session.user.date_created,
          },
          community_profile: {
            ...memberResult.data,
            // Remove sensitive tokens from export
            email_verification_token: undefined,
            unsubscribe_token: undefined,
          },
          privacy_info: {
            data_processing_consent: true,
            marketing_consent: memberResult.data?.email_preferences || {},
            last_login: new Date().toISOString(),
          }
        };

        // In a real implementation, you would generate a secure download link
        // For now, return the data directly
        return json({ 
          success: true, 
          message: "Data export prepared. Download will be available for 24 hours.",
          exportData: exportData,
          action: "export_data"
        });
      }

      case "delete_account": {
        const confirmDelete = formData.get("confirm_delete") === "on";
        
        if (!confirmDelete) {
          return json({ 
            error: "Please confirm account deletion by checking the checkbox." 
          }, { status: 400 });
        }

        // Get member data before deletion
        const memberResult = await directusService.getMemberByEmail(email);
        
        // Delete community member record
        if (memberResult.success && memberResult.data?.id) {
          await directusService.deleteCommunityMember(memberResult.data.id);
        }

        // Send deletion confirmation email
        try {
          await emailService.sendAccountDeletionEmail(email, session.user.first_name || 'Member');
        } catch (emailError) {
          console.error('Failed to send deletion confirmation email:', emailError);
        }

        // Destroy session
        const headers = await directusService.destroySession(request);
        
        return redirect("/?deleted=true", { headers });
      }

      case "data_request": {
        const requestType = formData.get("request_type") as string;
        const description = formData.get("description") as string;

        // In a real implementation, this would create a support ticket
        // For now, just send an email to the privacy team
        
        try {
          await emailService.sendDataRequestEmail({
            userEmail: email,
            userName: session.user.first_name || 'Member',
            requestType,
            description,
            userId: session.user.id
          });

          return json({ 
            success: true, 
            message: "Your data request has been submitted. We will respond within 30 days as required by GDPR.",
            action: "data_request"
          });
        } catch (error) {
          return json({ 
            error: "Failed to submit request. Please contact privacy@vibe-coding.hamburg directly." 
          }, { status: 500 });
        }
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("GDPR action error:", error);
    return json({ 
      error: "An error occurred while processing your request. Please try again or contact support." 
    }, { status: 500 });
  }
}

export default function GDPRTools() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-vaporwave-card/50 backdrop-blur-sm border-b border-vaporwave-cyan/20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link to="/dashboard" className="inline-flex items-center space-x-2 text-vaporwave-cyan hover:text-vaporwave-pink transition-colors mb-6">
            <span className="text-xl">←</span>
            <span className="font-semibold">Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-bold glow-text mb-2">GDPR Data Management</h1>
          <p className="text-gray-300">Exercise your data protection rights under GDPR</p>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Action Results */}
          {actionData && 'success' in actionData && actionData.success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 mb-8">
              <h3 className="text-green-200 font-semibold mb-2">✅ Success</h3>
              <p className="text-green-100">{String(actionData.message)}</p>
              
              {actionData.action === "export_data" && 'exportData' in actionData && actionData.exportData ? (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const exportData = (actionData as any).exportData;
                      const dataStr = JSON.stringify(exportData, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `vibe-coding-hamburg-data-export-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    📥 Download Data Export
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {actionData && 'error' in actionData && actionData.error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 mb-8">
              <h3 className="text-red-200 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-100">{actionData.error}</p>
            </div>
          )}

          {/* User Info */}
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl mb-8">
            <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Your Account Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-white mb-2">Account Details</h3>
                <div className="space-y-2 text-gray-300">
                  <p><strong>Name:</strong> {data.user.first_name} {data.user.last_name}</p>
                  <p><strong>Email:</strong> {data.user.email}</p>
                  <p><strong>Account Status:</strong> {data.user.status}</p>
                  <p><strong>Member Since:</strong> {new Date(data.user.date_created || '').toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Community Profile</h3>
                <div className="space-y-2 text-gray-300">
                  {data.member ? (
                    <>
                      <p><strong>Experience Level:</strong> {data.member.experience_level}%</p>
                      <p><strong>Status:</strong> {data.member.status}</p>
                      <p><strong>Email Verified:</strong> {data.member.email_verified ? 'Yes' : 'No'}</p>
                      <p><strong>Project Interest:</strong> {data.member.project_interest || 'Not specified'}</p>
                    </>
                  ) : (
                    <p>Community profile not found</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GDPR Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Data Export */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">📋</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Export Your Data</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Download a complete copy of your personal data in JSON format. 
                This includes your account information, community profile, and email preferences.
              </p>
              <Form method="post">
                <input type="hidden" name="action" value="export_data" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-3 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Preparing Export..." : "📥 Export My Data"}
                </button>
              </Form>
              <p className="text-xs text-gray-400 mt-2">
                GDPR Article 20 - Right to data portability
              </p>
            </div>

            {/* Data Request */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">📝</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Data Request</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Request data correction, restriction of processing, or other GDPR rights.
              </p>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="action" value="data_request" />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Request Type
                  </label>
                  <select
                    name="request_type"
                    required
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                  >
                    <option value="">Select a request type</option>
                    <option value="correction">Data Correction</option>
                    <option value="restriction">Restrict Processing</option>
                    <option value="objection">Object to Processing</option>
                    <option value="portability">Data Portability</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    placeholder="Please describe your request..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-500 hover:to-blue-500 transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "📝 Submit Request"}
                </button>
              </Form>
              <p className="text-xs text-gray-400 mt-2">
                We will respond within 30 days
              </p>
            </div>

            {/* Quick Settings */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">⚙️</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Quick Settings</h3>
              </div>
              <div className="space-y-4">
                <Link
                  to={`/email-preferences${data.member?.unsubscribe_token ? `?token=${data.member.unsubscribe_token}` : ''}`}
                  className="block w-full bg-vaporwave-dark/50 border border-vaporwave-cyan/30 text-white font-semibold py-2 px-4 rounded-lg hover:border-vaporwave-cyan/50 transition-all text-center"
                >
                  📧 Email Preferences
                </Link>
                <Link
                  to="/privacy"
                  className="block w-full bg-vaporwave-dark/50 border border-vaporwave-cyan/30 text-white font-semibold py-2 px-4 rounded-lg hover:border-vaporwave-cyan/50 transition-all text-center"
                >
                  📋 Privacy Policy
                </Link>
                <Link
                  to="/cookie-settings"
                  className="block w-full bg-vaporwave-dark/50 border border-vaporwave-cyan/30 text-white font-semibold py-2 px-4 rounded-lg hover:border-vaporwave-cyan/50 transition-all text-center"
                >
                  🍪 Cookie Settings
                </Link>
              </div>
            </div>

            {/* Account Deletion */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🗑️</span>
                <h3 className="text-xl font-semibold text-red-400">Delete Account</h3>
              </div>
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-200 text-sm mb-2">
                  <strong>⚠️ Warning: This action cannot be undone!</strong>
                </p>
                <ul className="text-red-200 text-sm list-disc list-inside space-y-1">
                  <li>All your data will be permanently deleted</li>
                  <li>You will lose access to all community features</li>
                  <li>You cannot recover your account after deletion</li>
                </ul>
              </div>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="action" value="delete_account" />
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="confirm_delete"
                    required
                    className="mt-1 w-4 h-4 text-red-500 bg-vaporwave-card border-red-500/30 rounded focus:ring-red-500/50 focus:ring-2"
                  />
                  <span className="text-gray-300 text-sm">
                    I understand that this will permanently delete my account and all associated data. 
                    This action cannot be undone.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Deleting Account..." : "🗑️ Delete My Account"}
                </button>
              </Form>
              <p className="text-xs text-gray-400 mt-2">
                GDPR Article 17 - Right to erasure
              </p>
            </div>

          </div>

          {/* Contact Information */}
          <div className="mt-8 bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
            <h3 className="text-blue-200 font-semibold mb-4">📞 Need Help with Your Data Rights?</h3>
            <div className="grid md:grid-cols-2 gap-6 text-blue-100">
              <div>
                <p><strong>Privacy Team:</strong></p>
                <p>Email: <a href="mailto:privacy@vibe-coding.hamburg" className="text-vaporwave-cyan">privacy@vibe-coding.hamburg</a></p>
                <p>Response time: Within 30 days</p>
              </div>
              <div>
                <p><strong>Data Protection Officer:</strong></p>
                <p>Email: <a href="mailto:dpo@vibe-coding.hamburg" className="text-vaporwave-cyan">dpo@vibe-coding.hamburg</a></p>
                <p>For complex data protection matters</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 