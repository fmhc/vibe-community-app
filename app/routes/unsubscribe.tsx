import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.title || "Unsubscribe - Vibe Coding Hamburg" },
    { name: "description", content: data?.description || "Unsubscribe from Vibe Coding Hamburg emails." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return json({ 
      success: false, 
      error: "Invalid unsubscribe link. Please check your email for the correct link.",
      title: "Unsubscribe - Vibe Coding Hamburg",
      description: "Unsubscribe from Vibe Coding Hamburg emails."
    });
  }

  try {
    // Unsubscribe the user
    const result = await directusService.unsubscribeFromEmails(token);
    
    if (!result.success) {
      return json({ 
        success: false, 
        error: result.error || "Invalid or expired unsubscribe link.",
        title: "Unsubscribe - Vibe Coding Hamburg",
        description: "Unsubscribe from Vibe Coding Hamburg emails."
      });
    }

    return json({ 
      success: true, 
      message: "You have been successfully unsubscribed from all Vibe Coding Hamburg emails.",
      title: "Unsubscribe - Vibe Coding Hamburg",
      description: "Unsubscribe from Vibe Coding Hamburg emails."
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return json({ 
      success: false, 
      error: "Something went wrong. Please try again or contact support.",
      title: "Unsubscribe - Vibe Coding Hamburg",
      description: "Unsubscribe from Vibe Coding Hamburg emails."
    });
  }
}

export default function Unsubscribe() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();

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
            {data.success ? (
              <>
                {/* Success State */}
                <div className="text-6xl mb-6">✅</div>
                <h1 className="text-2xl font-bold glow-text mb-4">
                  Unsubscribed Successfully
                </h1>
                <p className="text-gray-300 mb-6">
                  {'message' in data ? data.message : "You have been successfully unsubscribed from all Vibe Coding Hamburg emails."}
                </p>
                
                <div className="space-y-4">
                  <div className="bg-vaporwave-dark/50 rounded-lg p-4 text-left">
                    <h3 className="text-lg font-semibold text-vaporwave-cyan mb-2">What this means:</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• You won't receive welcome emails</li>
                      <li>• You won't receive event invitations</li>
                      <li>• You won't receive newsletters</li>
                      <li>• You won't receive project notifications</li>
                    </ul>
                    <p className="text-xs text-gray-400 mt-3">
                      Note: You may still receive important account-related emails like password resets.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link 
                      to="/" 
                      className="btn-primary flex-1"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Error State */}
                <div className="text-6xl mb-6">❌</div>
                <h1 className="text-2xl font-bold text-red-400 mb-4">
                  Unsubscribe Failed
                </h1>
                <p className="text-gray-300 mb-6">
                  {'error' in data ? data.error : "Something went wrong. Please try again or contact support."}
                </p>
                
                <div className="space-y-4">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-left">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Common Issues:</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Unsubscribe link may have expired</li>
                      <li>• Link may have been used already</li>
                      <li>• Email client may have modified the link</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link 
                      to="/" 
                      className="btn-secondary flex-1"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 