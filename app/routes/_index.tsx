import type { ActionFunctionArgs, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import CommunitySignupForm from "~/components/CommunitySignupForm";
import LanguageSwitcher from "~/components/LanguageSwitcher";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.title || "Vibe Coding Hamburg - Join Our AI Community" },
    { name: "description", content: data?.description || "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  return json({ 
    title: t('site.title'),
    description: t('site.description')
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const formData = await request.formData();
  
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const experienceLevel = parseInt(formData.get("experienceLevel") as string) || 50;
  const projectInterest = formData.get("projectInterest") as string;
  const projectDetails = formData.get("projectDetails") as string;
  const githubUsername = formData.get("githubUsername") as string;
  const linkedinUrl = formData.get("linkedinUrl") as string;
  const discordUsername = formData.get("discordUsername") as string;

  // Helper function to convert empty strings to undefined
  const emptyToUndefined = (value: string) => value && value.trim() !== '' ? value.trim() : undefined;

  // Validate required fields - only email is required
  if (!email || email.trim() === '') {
    return json({ error: t('form.email.required') }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return json({ error: t('form.email.invalid') }, { status: 400 });
  }

  try {
    // Check if email already exists
    const emailExists = await directusService.checkEmailExists(email.trim());
    if (emailExists) {
      return json({ error: t('form.email.exists') }, { status: 400 });
    }

    // Create new user account with Directus integration
    const result = await directusService.createUserAccount({
      email: email.trim(),
      name: emptyToUndefined(name),
      experience_level: experienceLevel,
      project_interest: emptyToUndefined(projectInterest),
      project_details: emptyToUndefined(projectDetails),
      github_username: emptyToUndefined(githubUsername),
      linkedin_url: emptyToUndefined(linkedinUrl),
      discord_username: emptyToUndefined(discordUsername),
    });

    if (!result.success || !result.data) {
      console.error("Directus createUserAccount failed:", result.error);
      return json({ error: result.error || t('form.messages.error') }, { status: 500 });
    }

    // Send verification email (don't fail the signup if email fails)
    try {
      const locale = await i18next.getLocale(request);
      await emailService.sendVerificationEmail({
        name: emptyToUndefined(name) || 'New Member', // Fallback name if not provided
        email: email.trim(),
        verificationToken: result.data.verificationToken,
      }, locale);
      console.log('Verification email sent successfully to:', email.trim());
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with successful signup even if email fails
    }

    return json({ 
      success: true, 
      message: t('form.messages.accountCreated')
    });
  } catch (error) {
    console.error("Signup error:", error);
    return json({ error: t('form.messages.error') }, { status: 500 });
  }
}

export default function Index() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-vaporwave-purple/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 pb-8">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold glow-text mb-6 animate-float">
            {t('header.title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4">
            {t('header.subtitle')}
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('header.description')}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-12">
        <CommunitySignupForm />
        
        {/* Login Link for Existing Users */}
        <div className="max-w-md mx-auto mt-8 text-center px-6">
          <div className="bg-vaporwave-card/50 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-3">
              Already a member?
            </p>
            <Link
              to="/login"
              className="inline-block text-vaporwave-cyan hover:text-vaporwave-pink transition-colors font-medium underline"
            >
              Sign in to your dashboard →
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center glow-text mb-12">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">{t('features.ai.title')}</h3>
              <p className="text-gray-400">
                {t('features.ai.description')}
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">{t('features.projects.title')}</h3>
              <p className="text-gray-400">
                {t('features.projects.description')}
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">{t('features.community.title')}</h3>
              <p className="text-gray-400">
                {t('features.community.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-vaporwave-cyan/20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <p className="text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
} 