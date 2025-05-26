import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import CommunitySignupForm from "~/components/CommunitySignupForm";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Vibe Coding Hamburg - Join Our AI Community" },
    { name: "description", content: "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools." },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const experienceLevel = parseInt(formData.get("experienceLevel") as string);
  const projectInterest = formData.get("projectInterest") as string;
  const projectDetails = formData.get("projectDetails") as string;
  const githubUsername = formData.get("githubUsername") as string;
  const linkedinUrl = formData.get("linkedinUrl") as string;
  const discordUsername = formData.get("discordUsername") as string;

  // Validate required fields
  if (!email || !name || !projectInterest) {
    return json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    // Check if email already exists
    const emailExists = await directusService.checkEmailExists(email);
    if (emailExists) {
      return json({ error: "This email is already registered. Please use a different email or contact us if you need help." }, { status: 400 });
    }

    // Create new community member
    const result = await directusService.createCommunityMember({
      email,
      name,
      experience_level: experienceLevel,
      project_interest: projectInterest,
      project_details: projectDetails || undefined,
      github_username: githubUsername || undefined,
      linkedin_url: linkedinUrl || undefined,
      discord_username: discordUsername || undefined,
      status: 'pending',
    });

    if (!result.success) {
      return json({ error: result.error || "Failed to create account. Please try again." }, { status: 500 });
    }

    // Send welcome email (don't fail the signup if email fails)
    try {
      await emailService.sendWelcomeEmail({
        name,
        email,
        projectInterest,
      });
      console.log('Welcome email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with successful signup even if email fails
    }

    return json({ success: true, message: "Welcome to the community! We'll be in touch soon." });
  } catch (error) {
    console.error("Signup error:", error);
    return json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-vaporwave-purple/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 pb-8">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold glow-text mb-6 animate-float">
            Vibe Coding Hamburg
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4">
            Where AI meets creativity in Hamburg's tech scene
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Join our community of developers exploring the intersection of artificial intelligence 
            and software development. Build projects, share knowledge, and shape the future of coding.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-12">
        <CommunitySignupForm />
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center glow-text mb-12">
            What Makes Us Special
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">AI-Powered Development</h3>
              <p className="text-gray-400">
                Explore cutting-edge AI tools and techniques that are revolutionizing how we build software.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Collaborative Projects</h3>
              <p className="text-gray-400">
                Work together on real projects, from web apps to AI tools, and learn from each other.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-xl font-semibold text-vaporwave-cyan mb-3">Community Learning</h3>
              <p className="text-gray-400">
                Regular meetups, workshops, and coding sessions in Hamburg's vibrant tech ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

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
