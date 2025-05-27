import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.title || "Email Verification - Vibe Coding Hamburg" },
    { name: "description", content: data?.description || "Verify your email address to complete your registration with Vibe Coding Hamburg." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const locale = await i18next.getLocale(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return json({ 
      success: false, 
      error: t('verification.error.invalid'),
      title: t('verification.title'),
      description: t('verification.title')
    });
  }

  try {
    // Verify the email with the token
    const result = await directusService.verifyEmail(token);
    
    if (!result.success) {
      return json({ 
        success: false, 
        error: result.error || t('verification.error.invalid'),
        title: t('verification.title'),
        description: t('verification.title')
      });
    }

    const member = result.data;
    
    if (!member) {
      return json({ 
        success: false, 
        error: t('verification.error.general'),
        title: t('verification.title'),
        description: t('verification.title')
      });
    }

    // Send welcome email after successful verification
    try {
      await emailService.sendWelcomeEmail({
        name: member.name || 'Community Member',
        email: member.email,
        projectInterest: member.project_interest,
        unsubscribeToken: member.unsubscribe_token,
      }, locale);
      console.log('Welcome email sent after verification to:', member.email);
    } catch (emailError) {
      console.error('Failed to send welcome email after verification:', emailError);
      // Don't fail verification if welcome email fails
    }

    return json({ 
      success: true, 
      message: t('verification.success.message'),
      member: {
        name: member.name,
        email: member.email,
        projectInterest: member.project_interest,
      },
      title: t('verification.title'),
      description: t('verification.title')
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return json({ 
      success: false, 
      error: t('verification.error.general'),
      title: t('verification.title'),
      description: t('verification.title')
    });
  }
}

export default function VerifyEmail() {
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
                  {t('verification.success.title')}
                </h1>
                <p className="text-gray-300 mb-6">
                  {'message' in data ? data.message : t('verification.success.message')}
                </p>
                
                {'member' in data && data.member && (
                  <div className="bg-vaporwave-dark/50 rounded-lg p-4 mb-6 text-left">
                    <h3 className="text-lg font-semibold text-vaporwave-cyan mb-2">Your Profile</h3>
                    <p><strong>Name:</strong> {data.member.name}</p>
                    <p><strong>Email:</strong> {data.member.email}</p>
                    <p><strong>Interest:</strong> {data.member.projectInterest}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-vaporwave-dark/50 rounded-lg p-4 text-left">
                    <h3 className="text-lg font-semibold text-vaporwave-cyan mb-2">{t('verification.success.nextSteps')}</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>🤖 {t('verification.success.steps.events')}</li>
                      <li>🚀 {t('verification.success.steps.connect')}</li>
                      <li>💡 {t('verification.success.steps.projects')}</li>
                      <li>📚 {t('verification.success.steps.learn')}</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link 
                      to="/" 
                      className="btn-primary flex-1"
                    >
                      Back to Home
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="btn-secondary flex-1"
                    >
                      {t('verification.success.button')}
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Error State */}
                <div className="text-6xl mb-6">❌</div>
                <h1 className="text-2xl font-bold text-red-400 mb-4">
                  {t('verification.error.title')}
                </h1>
                <p className="text-gray-300 mb-6">
                  {'error' in data ? data.error : t('verification.error.general')}
                </p>
                
                <div className="space-y-4">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-left">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Common Issues:</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Verification link may have expired (24 hours)</li>
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
                    <Link 
                      to="/resend-verification" 
                      className="btn-primary flex-1"
                    >
                      Resend Verification
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