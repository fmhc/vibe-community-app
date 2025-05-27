import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, Form, useNavigation, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

type ActionData = 
  | { error: string; fields: { email: string } }
  | { success: true; message: string };

export const meta: MetaFunction = () => {
  return [
    { title: "Forgot Password - Vibe Coding Hamburg" },
    { name: "description", content: "Reset your password for Vibe Coding Hamburg community account." },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email) {
    return json({
      error: "Email address is required",
      fields: { email }
    }, { status: 400 });
  }

  try {
    // Check if user exists
    const memberResult = await directusService.getMemberByEmail(email);
    
    if (!memberResult.success) {
      // Don't reveal if email exists or not for security
      return json({
        success: true,
        message: "If an account with that email exists, you will receive a password reset link shortly."
      });
    }

    // Generate password reset token (reuse verification token logic)
    const resetResult = await directusService.resendVerificationEmail(email);
    
    if (resetResult.success && memberResult.data && resetResult.data) {
      // Send password reset email
      await emailService.sendPasswordResetEmail(
        email,
        memberResult.data.name || 'Member',
        resetResult.data.verificationToken
      );
    }

    return json({
      success: true,
      message: "If an account with that email exists, you will receive a password reset link shortly."
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return json({
      success: true,
      message: "If an account with that email exists, you will receive a password reset link shortly."
    });
  }
}

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";

  const hasError = actionData && 'error' in actionData;
  const hasSuccess = actionData && 'success' in actionData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10">
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="text-4xl mb-4">🌊</div>
              <h1 className="text-2xl font-bold glow-text mb-2">
                Vibe Coding Hamburg
              </h1>
            </Link>
            <p className="text-gray-300">
              Reset your password
            </p>
          </div>

          {/* Reset Form */}
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">
              Forgot Password
            </h2>

            {hasError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                {actionData.error}
              </div>
            )}

            {hasSuccess && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200 mb-6">
                {actionData.message}
              </div>
            )}

            {!hasSuccess && (
              <>
                <p className="text-gray-300 mb-6 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <Form method="post" className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      defaultValue={hasError ? actionData.fields.email : ""}
                      className="w-full px-4 py-3 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 focus:border-vaporwave-cyan/50"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-3 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </button>
                </Form>
              </>
            )}

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors font-medium"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 