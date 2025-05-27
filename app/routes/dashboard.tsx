import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - Vibe Coding Hamburg" },
    { name: "description", content: "Your personal dashboard for the Vibe Coding Hamburg community." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  return json({ 
    title: t('site.title'),
    description: t('site.description')
  });
}

export default function Dashboard() {
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

      {/* Header */}
      <header className="relative z-10 pt-12 pb-8">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold glow-text mb-4">
            Welcome to Your Dashboard
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Your hub for the Vibe Coding Hamburg community
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Community Features */}
            <div className="card">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Community</h3>
              <p className="text-gray-400 mb-4">
                Connect with fellow developers and explore collaboration opportunities.
              </p>
              <div className="space-y-2">
                <Link to="/admin" className="block text-vaporwave-cyan hover:text-vaporwave-pink text-sm underline">
                  View Community Stats
                </Link>
              </div>
            </div>

            {/* Events & Meetups */}
            <div className="card">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Events</h3>
              <p className="text-gray-400 mb-4">
                Stay updated on AI Builder Cafe events, workshops, and meetups.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Coming soon: Event calendar integration</p>
              </div>
            </div>

            {/* Projects */}
            <div className="card">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Projects</h3>
              <p className="text-gray-400 mb-4">
                Showcase your projects and discover collaboration opportunities.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Coming soon: Project showcase</p>
              </div>
            </div>

            {/* AI Tools */}
            <div className="card">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">AI Tools</h3>
              <p className="text-gray-400 mb-4">
                Explore the latest AI development tools and techniques.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Coming soon: AI tools directory</p>
              </div>
            </div>

            {/* Learning Resources */}
            <div className="card">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Learning</h3>
              <p className="text-gray-400 mb-4">
                Access tutorials, guides, and learning resources.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Coming soon: Learning hub</p>
              </div>
            </div>

            {/* Profile Settings */}
            <div className="card">
              <div className="text-3xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Settings</h3>
              <p className="text-gray-400 mb-4">
                Manage your profile and email preferences.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Coming soon: Profile management</p>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold glow-text mb-6 text-center">Quick Actions</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/" className="btn-secondary">
                Back to Home
              </Link>
              <Link to="/test-email" className="btn-secondary">
                Test Email System
              </Link>
              <Link to="/admin" className="btn-primary">
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-vaporwave-cyan/20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <p className="text-gray-400">
            © 2024 Vibe Coding Hamburg. Building the future, one line of code at a time.
          </p>
        </div>
      </footer>
    </div>
  );
} 