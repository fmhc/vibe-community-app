import type { ActionFunctionArgs, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import CommunitySignupForm from "~/components/CommunitySignupForm";
import LanguageSwitcher from "~/components/LanguageSwitcher";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import { mattermostService } from "~/services/mattermost.server";
import i18next from "~/i18n.server";
import { communitySignupSchema, validateFormData, sanitizeEmail } from "~/lib/validation.server";
import { logger, getRequestContext, checkRateLimit } from "~/lib/logger.server";

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
  const requestContext = getRequestContext(request);
  const t = await i18next.getFixedT(request);
  
  logger.request(request.method, requestContext.path!, requestContext);
  
  try {
    // Rate limiting check
    const rateLimitKey = `signup:${requestContext.ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, 15 * 60 * 1000, 3); // 3 attempts per 15 minutes
    
    if (!rateLimit.allowed) {
      logger.security('Signup rate limit exceeded', 'medium', {
        ...requestContext,
        rateLimitKey,
        resetTime: rateLimit.resetTime
      });
      
      return json({ 
        error: 'Too many signup attempts. Please try again later.',
        rateLimited: true,
        resetTime: rateLimit.resetTime
      }, { status: 429 });
    }

    const formData = await request.formData();
    
    // Validate form data using schema
    const validation = validateFormData(communitySignupSchema, formData);
    
    if (!validation.success) {
      logger.warn('Form validation failed', {
        ...requestContext,
        service: 'signup',
        method: 'validateForm',
        errors: validation.errors
      });
      
      return json({ 
        error: Object.values(validation.errors)[0], // Return first error
        validationErrors: validation.errors 
      }, { status: 400 });
    }

    const { email: rawEmail, name, experienceLevel, projectInterest, projectDetails, githubUsername, linkedinUrl, discordUsername } = validation.data;
    const email = sanitizeEmail(rawEmail);

    logger.serviceCall('directus', 'checkEmailExists', 'Checking if email exists', {
      email: email.split('@')[0] + '@***' // Log partial email for privacy
    });

    // Check if email already exists
    const emailExists = await directusService.checkEmailExists(email);
    if (emailExists) {
      logger.warn('Signup attempt with existing email', {
        ...requestContext,
        service: 'signup',
        email: email.split('@')[0] + '@***'
      });
      
      return json({ error: t('form.email.exists') }, { status: 400 });
    }

    // Create new user account with Directus integration
    logger.serviceCall('directus', 'createUserAccount', 'Creating new user account', {
      email: email.split('@')[0] + '@***',
      hasName: !!name,
      experienceLevel
    });

    const result = await directusService.createUserAccount({
      email,
      name: name || undefined,
      experience_level: experienceLevel,
      project_interest: projectInterest || undefined,
      project_details: projectDetails || undefined,
      github_username: githubUsername || undefined,
      linkedin_url: linkedinUrl || undefined,
      discord_username: discordUsername || undefined,
    });

    if (!result.success || !result.data) {
      logger.serviceError('directus', 'createUserAccount', 'Failed to create user account', 
        new Error(result.error || 'Unknown error'), {
          ...requestContext,
          email: email.split('@')[0] + '@***'
        });
      
      return json({ error: result.error || t('form.messages.error') }, { status: 500 });
    }

    // Send verification email (don't fail the signup if email fails)
    try {
      const locale = await i18next.getLocale(request);
      
      logger.serviceCall('email', 'sendVerificationEmail', 'Sending verification email', {
        email: email.split('@')[0] + '@***',
        locale
      });

      await emailService.sendVerificationEmail({
        name: name || 'New Member',
        email,
        verificationToken: result.data.verificationToken,
      }, locale);
      
      logger.info('Verification email sent successfully', {
        ...requestContext,
        service: 'email',
        email: email.split('@')[0] + '@***'
      });
    } catch (emailError) {
      logger.serviceError('email', 'sendVerificationEmail', 'Failed to send verification email',
        emailError instanceof Error ? emailError : new Error(String(emailError)), {
          ...requestContext,
          email: email.split('@')[0] + '@***'
        });
      // Continue with successful signup even if email fails
    }

    logger.info('User signup completed successfully', {
      ...requestContext,
      service: 'signup',
      email: email.split('@')[0] + '@***',
      userId: result.data.directusUser.id
    });

    return json({ 
      success: true, 
      message: t('form.messages.accountCreated')
    });
    
  } catch (error) {
    logger.serviceError('signup', 'action', 'Unexpected error during signup',
      error instanceof Error ? error : new Error(String(error)), 
      requestContext);
    
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