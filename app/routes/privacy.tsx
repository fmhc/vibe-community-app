import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - Vibe Coding Hamburg" },
    { name: "description", content: "Privacy policy and data protection information for Vibe Coding Hamburg community." },
    { name: "robots", content: "index, follow" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  return json({ 
    title: t('privacy.title'),
    lastUpdated: "2024-01-15"
  });
}

export default function Privacy() {
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
      <div className="absolute top-6 right-6 z-10">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="relative z-10 bg-vaporwave-card/50 backdrop-blur-sm border-b border-vaporwave-cyan/20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-vaporwave-cyan hover:text-vaporwave-pink transition-colors mb-6">
            <span className="text-xl">🌊</span>
            <span className="font-semibold">Vibe Coding Hamburg</span>
          </Link>
          <h1 className="text-3xl font-bold glow-text mb-2">Privacy Policy & Data Protection</h1>
          <p className="text-gray-300">Last updated: {data.lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-8 shadow-2xl">
            
            {/* GDPR Notice */}
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-200 mb-4 flex items-center">
                🇪🇺 GDPR Compliance Notice
              </h2>
              <p className="text-blue-100 mb-4">
                As a community based in Hamburg, Germany, we fully comply with the General Data Protection Regulation (GDPR) 
                and German data protection laws (BDSG). Your privacy and data protection rights are our priority.
              </p>
              <p className="text-blue-100">
                <strong>Contact our Data Protection Officer:</strong> dpo@vibe-coding.hamburg
              </p>
            </div>

            {/* Table of Contents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#data-controller" className="text-vaporwave-cyan hover:text-vaporwave-pink">1. Data Controller</a></li>
                <li><a href="#data-collection" className="text-vaporwave-cyan hover:text-vaporwave-pink">2. Data We Collect</a></li>
                <li><a href="#legal-basis" className="text-vaporwave-cyan hover:text-vaporwave-pink">3. Legal Basis for Processing</a></li>
                <li><a href="#data-usage" className="text-vaporwave-cyan hover:text-vaporwave-pink">4. How We Use Your Data</a></li>
                <li><a href="#data-sharing" className="text-vaporwave-cyan hover:text-vaporwave-pink">5. Data Sharing</a></li>
                <li><a href="#your-rights" className="text-vaporwave-cyan hover:text-vaporwave-pink">6. Your Rights</a></li>
                <li><a href="#cookies" className="text-vaporwave-cyan hover:text-vaporwave-pink">7. Cookies</a></li>
                <li><a href="#retention" className="text-vaporwave-cyan hover:text-vaporwave-pink">8. Data Retention</a></li>
                <li><a href="#security" className="text-vaporwave-cyan hover:text-vaporwave-pink">9. Data Security</a></li>
                <li><a href="#contact" className="text-vaporwave-cyan hover:text-vaporwave-pink">10. Contact Information</a></li>
              </ul>
            </div>

            {/* Content Sections */}
            <div className="space-y-8 text-gray-300">
              
              <section id="data-controller">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">1. Data Controller</h2>
                <div className="bg-vaporwave-dark/30 rounded-lg p-6">
                  <p className="mb-4"><strong>Responsible Entity:</strong></p>
                  <p>Vibe Coding Hamburg<br />
                  [Address to be provided]<br />
                  Hamburg, Germany<br />
                  Email: privacy@vibe-coding.hamburg<br />
                  Data Protection Officer: dpo@vibe-coding.hamburg</p>
                </div>
              </section>

              <section id="data-collection">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">2. Data We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Personal Information</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Email address (required for account creation)</li>
                      <li>Name (optional)</li>
                      <li>Professional information (experience level, skills, interests)</li>
                      <li>Social media profiles (GitHub, LinkedIn, Discord - optional)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Technical Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>IP address (anonymized after processing)</li>
                      <li>Browser information</li>
                      <li>Session data</li>
                      <li>Usage analytics (anonymized)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Communication Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Email interaction data (opens, clicks - anonymized)</li>
                      <li>Communication preferences</li>
                      <li>Event participation data</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="legal-basis">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">3. Legal Basis for Processing</h2>
                <div className="space-y-4">
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-200 mb-2">✓ Consent (Art. 6(1)(a) GDPR)</h3>
                    <p>For marketing emails, newsletters, and optional features</p>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-200 mb-2">✓ Contract Performance (Art. 6(1)(b) GDPR)</h3>
                    <p>For providing community services and account management</p>
                  </div>
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-200 mb-2">✓ Legitimate Interest (Art. 6(1)(f) GDPR)</h3>
                    <p>For security, fraud prevention, and service improvement</p>
                  </div>
                </div>
              </section>

              <section id="data-usage">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">4. How We Use Your Data</h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Providing community services and account management</li>
                  <li>Sending transactional emails (account verification, password resets)</li>
                  <li>Sending marketing emails (only with your consent)</li>
                  <li>Organizing events and meetups</li>
                  <li>Facilitating project collaboration</li>
                  <li>Improving our services through analytics</li>
                  <li>Ensuring security and preventing fraud</li>
                </ul>
              </section>

              <section id="data-sharing">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">5. Data Sharing</h2>
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
                  <h3 className="font-semibold text-red-200 mb-2">🔒 We do NOT sell your data</h3>
                  <p className="mb-4">We only share data in these limited circumstances:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>With your explicit consent</li>
                    <li>With service providers (email services, hosting) under strict data processing agreements</li>
                    <li>When required by law or to protect rights and safety</li>
                    <li>In anonymized form for analytics and research</li>
                  </ul>
                </div>
              </section>

              <section id="your-rights">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">6. Your Rights Under GDPR</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Access</h3>
                    <p className="text-sm">Request a copy of your personal data</p>
                  </div>
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Rectification</h3>
                    <p className="text-sm">Correct inaccurate personal data</p>
                  </div>
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Erasure</h3>
                    <p className="text-sm">Request deletion of your data</p>
                  </div>
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Portability</h3>
                    <p className="text-sm">Export your data in a machine-readable format</p>
                  </div>
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Object</h3>
                    <p className="text-sm">Object to processing based on legitimate interest</p>
                  </div>
                  <div className="bg-vaporwave-dark/30 rounded-lg p-4">
                    <h3 className="font-semibold text-vaporwave-pink mb-2">Right to Withdraw Consent</h3>
                    <p className="text-sm">Withdraw consent at any time</p>
                  </div>
                </div>
                <div className="mt-6 bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                  <p><strong>Exercise Your Rights:</strong></p>
                  <p>Email us at <a href="mailto:privacy@vibe-coding.hamburg" className="text-vaporwave-cyan">privacy@vibe-coding.hamburg</a> or use your dashboard settings.</p>
                  <p className="mt-2"><strong>Response Time:</strong> We will respond within 30 days (1 month) as required by GDPR.</p>
                </div>
              </section>

              <section id="cookies">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">7. Cookies and Tracking</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Essential Cookies</h3>
                    <p>Required for login sessions and security. Cannot be disabled.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Analytics Cookies</h3>
                    <p>Help us improve our services. You can opt-out in cookie settings.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Preference Cookies</h3>
                    <p>Remember your language and display preferences.</p>
                  </div>
                </div>
              </section>

              <section id="retention">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">8. Data Retention</h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Account Data:</strong> Until account deletion + 30 days for security</li>
                  <li><strong>Email Data:</strong> Until unsubscribe + 3 years for legal compliance</li>
                  <li><strong>Analytics Data:</strong> Anonymized after 14 months</li>
                  <li><strong>Security Logs:</strong> 12 months maximum</li>
                </ul>
              </section>

              <section id="security">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">9. Data Security</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-200 mb-2">🔐 Encryption</h3>
                    <p className="text-sm">Data encrypted in transit and at rest</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-200 mb-2">🛡️ Access Control</h3>
                    <p className="text-sm">Strict access controls and authentication</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-200 mb-2">🏥 EU Hosting</h3>
                    <p className="text-sm">Data hosted in EU data centers</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-200 mb-2">📋 Regular Audits</h3>
                    <p className="text-sm">Security audits and vulnerability assessments</p>
                  </div>
                </div>
              </section>

              <section id="contact">
                <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">10. Contact Information</h2>
                <div className="bg-vaporwave-dark/30 rounded-lg p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-white mb-2">General Privacy Questions</h3>
                      <p>Email: <a href="mailto:privacy@vibe-coding.hamburg" className="text-vaporwave-cyan">privacy@vibe-coding.hamburg</a></p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Data Protection Officer</h3>
                      <p>Email: <a href="mailto:dpo@vibe-coding.hamburg" className="text-vaporwave-cyan">dpo@vibe-coding.hamburg</a></p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-vaporwave-cyan/20">
                    <h3 className="font-semibold text-white mb-2">Supervisory Authority</h3>
                    <p>If you believe we have not addressed your concerns, you can contact:</p>
                    <p className="mt-2">
                      <strong>Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit</strong><br />
                      Ludwig-Erhard-Str. 22<br />
                      20459 Hamburg, Germany<br />
                      Website: <a href="https://datenschutz-hamburg.de" className="text-vaporwave-cyan">datenschutz-hamburg.de</a>
                    </p>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="mt-12 pt-8 border-t border-vaporwave-cyan/20 text-center">
              <div className="space-x-4">
                <Link
                  to="/gdpr-tools"
                  className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300"
                >
                  Manage Your Data
                </Link>
                <Link
                  to="/cookie-settings"
                  className="inline-block bg-vaporwave-card border border-vaporwave-cyan/30 text-white font-semibold py-2 px-6 rounded-lg hover:border-vaporwave-cyan/50 transition-all duration-300"
                >
                  Cookie Settings
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
} 