import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.title || "Email Preferences - Vibe Coding Hamburg" },
    { name: "description", content: data?.description || "Manage your email preferences for Vibe Coding Hamburg." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return json({ 
      success: false, 
      error: "Invalid preferences link. Please check your email for the correct link.",
      title: "Email Preferences - Vibe Coding Hamburg",
      description: "Manage your email preferences for Vibe Coding Hamburg."
    });
  }

  try {
    // Find the member by unsubscribe token to get their current preferences
    const members = await directusService.getCommunityMembers({ unsubscribe_token: { _eq: token } });
    
    if (!members.success || !members.data || members.data.length === 0) {
      return json({ 
        success: false, 
        error: "Invalid or expired preferences link.",
        title: "Email Preferences - Vibe Coding Hamburg",
        description: "Manage your email preferences for Vibe Coding Hamburg."
      });
    }

    const member = members.data[0];

    return json({ 
      success: true, 
      member: {
        email: member.email,
        name: member.name,
        preferences: member.email_preferences || {
          welcome_emails: true,
          event_invitations: true,
          newsletter: true,
          project_notifications: true,
        }
      },
      token,
      title: "Email Preferences - Vibe Coding Hamburg",
      description: "Manage your email preferences for Vibe Coding Hamburg."
    });
  } catch (error) {
    console.error("Email preferences loader error:", error);
    return json({ 
      success: false, 
      error: "Something went wrong. Please try again or contact support.",
      title: "Email Preferences - Vibe Coding Hamburg",
      description: "Manage your email preferences for Vibe Coding Hamburg."
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  
  if (!token) {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Get current member to find their email
    const members = await directusService.getCommunityMembers({ unsubscribe_token: { _eq: token } });
    
    if (!members.success || !members.data || members.data.length === 0) {
      return json({ error: "Invalid or expired preferences link." }, { status: 400 });
    }

    const member = members.data[0];

    // Update preferences based on form data
    const preferences = {
      welcome_emails: formData.get("welcome_emails") === "on",
      event_invitations: formData.get("event_invitations") === "on",
      newsletter: formData.get("newsletter") === "on",
      project_notifications: formData.get("project_notifications") === "on",
    };

    const result = await directusService.updateEmailPreferences(member.email, preferences);
    
    if (!result.success) {
      return json({ error: result.error || "Failed to update preferences" }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: "Your email preferences have been updated successfully!" 
    });
  } catch (error) {
    console.error("Email preferences action error:", error);
    return json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export default function EmailPreferences() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";

  if (!data.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>

        {/* Main Content */}
        <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="text-6xl mb-6">❌</div>
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                Invalid Link
              </h1>
              <p className="text-gray-300 mb-6">
                {'error' in data ? data.error : 'Something went wrong'}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          <div className="card">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">⚙️</div>
              <h1 className="text-2xl font-bold glow-text mb-4">
                Email Preferences
              </h1>
              <p className="text-gray-300">
                Manage your email subscriptions for <strong>{'member' in data ? data.member.email : 'Unknown'}</strong>
              </p>
            </div>

            {actionData && 'success' in actionData && actionData.success && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200 mb-6">
                {'message' in actionData ? actionData.message : 'Success!'}
              </div>
            )}

            {actionData && 'error' in actionData && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                {actionData.error}
              </div>
            )}

            <Form method="post" className="space-y-6">
              <input type="hidden" name="token" value={'token' in data ? data.token : ''} />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4">
                  Choose which emails you'd like to receive:
                </h3>
                
                                 <label className="flex items-start gap-3 cursor-pointer">
                   <input
                     type="checkbox"
                     name="welcome_emails"
                     defaultChecked={'member' in data ? data.member.preferences.welcome_emails : true}
                     className="mt-1 w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan/50 focus:ring-2"
                   />
                   <div>
                     <div className="font-medium text-white">Welcome Emails</div>
                     <div className="text-sm text-gray-400">
                       Receive welcome messages when you join or verify your account
                     </div>
                   </div>
                 </label>

                 <label className="flex items-start gap-3 cursor-pointer">
                   <input
                     type="checkbox"
                     name="event_invitations"
                     defaultChecked={'member' in data ? data.member.preferences.event_invitations : true}
                     className="mt-1 w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan/50 focus:ring-2"
                   />
                   <div>
                     <div className="font-medium text-white">Event Invitations</div>
                     <div className="text-sm text-gray-400">
                       Get notified about AI Builder Cafe events, workshops, and meetups
                     </div>
                   </div>
                 </label>

                 <label className="flex items-start gap-3 cursor-pointer">
                   <input
                     type="checkbox"
                     name="newsletter"
                     defaultChecked={'member' in data ? data.member.preferences.newsletter : true}
                     className="mt-1 w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan/50 focus:ring-2"
                   />
                   <div>
                     <div className="font-medium text-white">Newsletter</div>
                     <div className="text-sm text-gray-400">
                       Receive community updates, featured projects, and AI tool highlights
                     </div>
                   </div>
                 </label>

                 <label className="flex items-start gap-3 cursor-pointer">
                   <input
                     type="checkbox"
                     name="project_notifications"
                     defaultChecked={'member' in data ? data.member.preferences.project_notifications : true}
                     className="mt-1 w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan/50 focus:ring-2"
                   />
                   <div>
                     <div className="font-medium text-white">Project Notifications</div>
                     <div className="text-sm text-gray-400">
                       Get updates about collaboration opportunities and project showcases
                     </div>
                   </div>
                 </label>
              </div>

              <div className="pt-4 border-t border-vaporwave-cyan/20">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </Form>

            <div className="mt-6 pt-6 border-t border-vaporwave-cyan/20 text-center">
              <p className="text-sm text-gray-400 mb-3">
                Want to unsubscribe from all emails?
              </p>
                             <a
                 href={`/unsubscribe?token=${'token' in data ? data.token : ''}`}
                 className="text-red-400 hover:text-red-300 text-sm underline"
               >
                 Unsubscribe from all emails
               </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 