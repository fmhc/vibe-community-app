import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, Form, useNavigation } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Resend Verification - Vibe Coding Hamburg" },
    { name: "description", content: "Resend your email verification link for Vibe Coding Hamburg." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email || email.trim() === '') {
    return json({ error: "Email address is required." }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    // Resend verification email
    const result = await directusService.resendVerificationEmail(email.trim());
    
    if (!result.success) {
      return json({ error: result.error || "Failed to resend verification email." }, { status: 400 });
    }

    // Send the verification email
    try {
      const locale = await i18next.getLocale(request);
      await emailService.sendVerificationEmail({
        name: 'Community Member', // We don't have the name in this context
        email: email.trim(),
        verificationToken: result.data!.verificationToken,
      }, locale);
      console.log('Verification email resent successfully to:', email.trim());
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return json({ error: "Failed to send verification email. Please try again later." }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: "Verification email sent! Please check your inbox and spam folder."
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}

export default function ResendVerification() {
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

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">📧</div>
              <h1 className="text-2xl font-bold glow-text mb-4">
                Resend Verification Email
              </h1>
              <p className="text-gray-300">
                Enter your email address to receive a new verification link
              </p>
            </div>

            {actionData && 'success' in actionData && actionData.success && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span>✅</span>
                  <span className="font-medium">Email Sent!</span>
                </div>
                <p>{'message' in actionData ? actionData.message : 'Verification email sent successfully!'}</p>
              </div>
            )}

            {actionData && 'error' in actionData && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span>❌</span>
                  <span className="font-medium">Error</span>
                </div>
                <p>{actionData.error}</p>
              </div>
            )}

            <Form method="post" className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input-field w-full"
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  We'll send a new verification link to this email address
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Verification Email"}
              </button>
            </Form>

            <div className="mt-6 pt-6 border-t border-vaporwave-cyan/20 text-center">
              <p className="text-sm text-gray-400 mb-3">
                Remember your verification link?
              </p>
              <a
                href="/"
                className="text-vaporwave-cyan hover:text-vaporwave-pink text-sm underline"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 