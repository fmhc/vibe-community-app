import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - Vibe Coding Hamburg" },
    { name: "description", content: "Your personal dashboard for the Vibe Coding Hamburg community." },
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
    title: t('site.title'),
    description: t('site.description'),
    user: session.user,
    member: memberResult.success ? memberResult.data : null
  });
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header with User Info */}
      <div className="relative z-10 bg-vaporwave-card/50 backdrop-blur-sm border-b border-vaporwave-cyan/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌊</span>
              <span className="text-xl font-bold glow-text">Vibe Coding Hamburg</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-white font-medium">
                {data.user.first_name} {data.user.last_name}
              </p>
              <p className="text-gray-400 text-sm">{data.user.email}</p>
            </div>
            <LanguageSwitcher />
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="text-red-400 hover:text-red-300 transition-colors text-sm px-3 py-1 border border-red-400/30 rounded hover:border-red-300/50"
              >
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold glow-text mb-4">
              Welcome back, {data.user.first_name}! 👋
            </h1>
            <p className="text-gray-300 text-lg">
              Your Vibe Coding Hamburg community dashboard
            </p>
            
            {data.member && (
              <div className="mt-4 inline-flex items-center space-x-2 bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-2">
                <span className="text-green-400">✓</span>
                <span className="text-green-200">
                  {data.member.email_verified ? 'Email verified' : 'Email pending verification'}
                </span>
              </div>
            )}
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">👤</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Profile</h3>
              </div>
              <p className="text-gray-300 mb-4">Manage your profile information and preferences.</p>
              {data.member && (
                <div className="text-sm text-gray-400 mb-4">
                  <p>Experience Level: {data.member.experience_level}%</p>
                  <p>Status: {data.member.status}</p>
                </div>
              )}
              <Link
                to="/profile"
                className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-4 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300"
              >
                Edit Profile
              </Link>
            </div>

            {/* Email Preferences Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">📧</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Email Preferences</h3>
              </div>
              <p className="text-gray-300 mb-4">Control what emails you receive from us.</p>
              {data.member?.unsubscribe_token && (
                <Link
                  to={`/email-preferences?token=${data.member.unsubscribe_token}`}
                  className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-4 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300"
                >
                  Manage Emails
                </Link>
              )}
            </div>

            {/* Community Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🏘️</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Community</h3>
              </div>
              <p className="text-gray-300 mb-4">Connect with other members and join events.</p>
              <Link
                to="/admin"
                className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-4 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300"
              >
                View Stats
              </Link>
            </div>

            {/* Projects Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">💡</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Projects</h3>
              </div>
              <p className="text-gray-300 mb-4">Discover and collaborate on exciting projects.</p>
              {data.member?.project_interest && (
                <p className="text-sm text-gray-400 mb-4">
                  Interested in: {data.member.project_interest}
                </p>
              )}
              <div className="text-sm text-gray-400">Coming soon: Project showcase</div>
            </div>

            {/* Events Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">📅</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Events</h3>
              </div>
              <p className="text-gray-300 mb-4">Join upcoming meetups and workshops.</p>
              <div className="text-sm text-gray-400">Coming soon: Event calendar</div>
            </div>

            {/* Settings Card */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">⚙️</span>
                <h3 className="text-xl font-semibold text-vaporwave-cyan">Settings</h3>
              </div>
              <p className="text-gray-300 mb-4">Manage your account settings and privacy.</p>
              <div className="text-sm text-gray-400">Coming soon: Account settings</div>
            </div>
          </div>

          {/* Quick Stats */}
          {data.member && (
            <div className="mt-12 bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-4">Your Community Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-vaporwave-pink">{data.member.experience_level}%</p>
                  <p className="text-gray-400 text-sm">Experience Level</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-vaporwave-cyan">
                    {data.member.email_verified ? '✓' : '⏳'}
                  </p>
                  <p className="text-gray-400 text-sm">Email Status</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-vaporwave-pink">
                    {data.member.status === 'verified' ? 'Active' : 'Pending'}
                  </p>
                  <p className="text-gray-400 text-sm">Membership</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-vaporwave-cyan">
                    {new Date(data.member.date_created || '').toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 text-sm">Member Since</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 