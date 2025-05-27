import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, Form, useNavigation, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - Vibe Coding Hamburg" },
    { name: "description", content: "Login to your Vibe Coding Hamburg community account." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is already logged in
  const session = await directusService.getSession(request);
  if (session?.user) {
    return redirect("/dashboard");
  }
  
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return json({
      error: "Email and password are required",
      fields: { email, password }
    }, { status: 400 });
  }

  try {
    // Authenticate with Directus
    const authResult = await directusService.authenticateUser(email, password);
    
    if (!authResult.success) {
      return json({
        error: authResult.error || "Invalid email or password",
        fields: { email, password }
      }, { status: 401 });
    }

    // Create session and redirect
    const headers = await directusService.createSession(authResult.user!, authResult.token!, remember);
    
    return redirect("/dashboard", { headers });
  } catch (error) {
    console.error("Login error:", error);
    return json({
      error: "An error occurred during login. Please try again.",
      fields: { email, password }
    }, { status: 500 });
  }
}

export default function Login() {
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
              Welcome back to the community
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">
              Sign In
            </h2>

            {actionData?.error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                {actionData.error}
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
                  required
                  defaultValue={actionData?.fields?.email || ""}
                  className="w-full px-4 py-3 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 focus:border-vaporwave-cyan/50"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 focus:border-vaporwave-cyan/50"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="remember"
                    className="w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan/50 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-300">Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm text-vaporwave-cyan hover:text-vaporwave-pink transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-3 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </Form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-300">
                Don't have an account?{" "}
                <Link
                  to="/"
                  className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors font-medium"
                >
                  Sign up here
                </Link>
              </p>
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