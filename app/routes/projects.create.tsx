import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Form, useNavigation, useActionData } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";
import { validateInput } from "~/lib/validation.server";
import { logger } from "~/lib/logger.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Create Project Proposal - Vibe Coding Hamburg" },
    { name: "description", content: "Propose a new project and find collaborators in the Hamburg tech community." },
    { property: "og:title", content: "Create Project Proposal - Vibe Coding Hamburg" },
    { property: "og:description", content: "Propose a new project and find collaborators in the Hamburg tech community." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  // Get current user's member data
  const memberResult = session.user.email 
    ? await directusService.getMemberByEmail(session.user.email)
    : { success: false, data: null };
  
  if (!memberResult.success || !memberResult.data) {
    return redirect("/login?error=member_not_found");
  }

  const member = memberResult.data;

  // Check if user has GitHub connected (recommended for project proposals)
  const hasGitHub = !!member.github_username;

  const t = await i18next.getFixedT(request);
  return json({
    title: t('site.title'),
    user: session.user,
    member,
    hasGitHub
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create-proposal") {
    // Validate form data using the validation utility
    const title = validateInput(formData.get("title") as string, 'string', { required: true, maxLength: 100 });
    const description = validateInput(formData.get("description") as string, 'string', { required: true, maxLength: 2000 });
    const category = validateInput(formData.get("category") as string, 'string', { required: true });
    const skillsNeeded = validateInput(formData.get("skillsNeeded") as string, 'string', { required: true, maxLength: 500 });
    const timeCommitment = validateInput(formData.get("timeCommitment") as string, 'string', { required: true });
    const experienceLevel = validateInput(formData.get("experienceLevel") as string, 'string', { required: true });
    const contactEmail = validateInput(formData.get("contactEmail") as string, 'email', { required: true });
    const githubRepo = validateInput(formData.get("githubRepo") as string, 'url', { required: false, maxLength: 200 });
    
    const isRemote = formData.get("isRemote") === 'on';
    const lookingForCollaborators = formData.get("lookingForCollaborators") === 'on';

    // Check for validation errors
    const errors: Record<string, string> = {};
    if (!title.isValid) errors.title = title.error || 'Title is required';
    if (!description.isValid) errors.description = description.error || 'Description is required';
    if (!category.isValid) errors.category = category.error || 'Category is required';
    if (!skillsNeeded.isValid) errors.skillsNeeded = skillsNeeded.error || 'Skills needed is required';
    if (!timeCommitment.isValid) errors.timeCommitment = timeCommitment.error || 'Time commitment is required';
    if (!experienceLevel.isValid) errors.experienceLevel = experienceLevel.error || 'Experience level is required';
    if (!contactEmail.isValid) errors.contactEmail = contactEmail.error || 'Valid email is required';
    if (githubRepo.value && !githubRepo.isValid) errors.githubRepo = githubRepo.error || 'Invalid GitHub URL';

    if (Object.keys(errors).length > 0) {
      return json({
        errors,
        formData: {
          title: title.value,
          description: description.value,
          category: category.value,
          skillsNeeded: skillsNeeded.value,
          timeCommitment: timeCommitment.value,
          experienceLevel: experienceLevel.value,
          contactEmail: contactEmail.value,
          githubRepo: githubRepo.value,
          isRemote: isRemote ? 'on' : undefined,
          lookingForCollaborators: lookingForCollaborators ? 'on' : undefined,
        }
      }, { status: 400 });
    }

    try {
      // Get current user's member data
      const memberResult = await directusService.getMemberByEmail(session.user.email || '');
      if (!memberResult.success || !memberResult.data) {
        return json({ 
          errors: { general: 'Unable to find your community profile. Please contact support.' }
        }, { status: 400 });
      }

      // Create project proposal in Directus
      const proposalData = {
        title: title.value,
        description: description.value,
        category: category.value,
        skills_needed: skillsNeeded.value,
        time_commitment: timeCommitment.value,
        experience_level: experienceLevel.value,
        contact_email: contactEmail.value,
        github_repo: githubRepo.value || null,
        is_remote: isRemote,
        looking_for_collaborators: lookingForCollaborators,
        status: 'pending',
        created_by: memberResult.data.id,
        created_at: new Date().toISOString(),
      };

      // Save to Directus (assuming a project_proposals collection exists)
      const createResult = await directusService.createItem('project_proposals', proposalData);
      
      if (!createResult.success) {
        console.error('Failed to create project proposal:', createResult.error);
        return json({ 
          errors: { general: 'Failed to create project proposal. Please try again.' }
        }, { status: 500 });
      }

      // Send notification email to admin
      try {
        await emailService.sendProjectProposalNotification({
          to: process.env.ADMIN_EMAIL || 'admin@vibe-coding.hamburg',
          proposalData: {
            id: createResult.data?.id || 'unknown',
            title: title.value,
            description: description.value,
            category: category.value,
            skills_needed: skillsNeeded.value,
            time_commitment: timeCommitment.value,
            experience_level: experienceLevel.value,
            contact_email: contactEmail.value,
            github_repo: githubRepo.value,
            is_remote: isRemote,
            looking_for_collaborators: lookingForCollaborators,
            proposer_name: memberResult.data.name || session.user.first_name || 'Community Member',
            proposer_email: session.user.email || contactEmail.value,
          }
        });
      } catch (emailError) {
        console.warn('Failed to send project proposal notification email:', emailError);
        // Don't fail the whole request if email fails
      }

      // Redirect to success page
      return redirect("/projects?created=success");

    } catch (error) {
      console.error('Error creating project proposal:', error);
      return json({ 
        errors: { general: 'An unexpected error occurred. Please try again.' }
      }, { status: 500 });
    }
  }

  return json({ errors: { general: "Invalid action" } }, { status: 400 });
}

export default function CreateProjectProposal() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  
  // Type guards for action data
  const hasFormData = actionData && 'formData' in actionData;
  const errors = actionData?.errors || {};
  const formData = hasFormData ? actionData.formData : {} as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-vaporwave-card/50 backdrop-blur-sm border-b border-vaporwave-cyan/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌊</span>
              <span className="text-xl font-bold glow-text">Vibe Coding Hamburg</span>
            </Link>
            <span className="text-gray-400">→</span>
            <Link to="/projects" className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors">
              Projects
            </Link>
            <span className="text-gray-400">→</span>
            <span className="text-vaporwave-pink font-medium">Create Proposal</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <Link
              to="/dashboard"
              className="bg-vaporwave-card/80 border border-vaporwave-cyan/30 text-vaporwave-cyan px-4 py-2 rounded-lg hover:bg-vaporwave-cyan/10 transition-all duration-300"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold glow-text mb-4">
              🚀 Create Project Proposal
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Share your project idea and find collaborators in the Hamburg tech community
            </p>
            
            {!data.hasGitHub && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <div className="flex items-center space-x-2 text-yellow-300">
                  <span>💡</span>
                  <span className="font-medium">Tip: Connect your GitHub profile for better project visibility!</span>
                </div>
                <Link
                  to="/auth/github"
                  className="inline-block mt-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Connect GitHub
                </Link>
              </div>
            )}
          </div>

          {/* Project Proposal Form */}
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-8 shadow-2xl">
            <Form method="post" className="space-y-6">
              <input type="hidden" name="action" value="create-proposal" />
              
              {/* General Error */}
              {'general' in errors && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400">{errors.general}</p>
                </div>
              )}

              {/* Project Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  maxLength={100}
                  defaultValue={formData?.title || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white ${
                    'title' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                  placeholder="Enter your project title"
                />
                {'title' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Project Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Project Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  maxLength={2000}
                  rows={5}
                  defaultValue={formData?.description || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white resize-vertical ${
                    'description' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                  placeholder="Describe your project, its goals, and what you hope to achieve..."
                ></textarea>
                {'description' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              {/* Project Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Project Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  defaultValue={formData?.category || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white ${
                    'category' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                >
                  <option value="">Select a category</option>
                  <option value="web">Web Development</option>
                  <option value="mobile">Mobile App</option>
                  <option value="ai">AI/Machine Learning</option>
                  <option value="game">Game Development</option>
                  <option value="blockchain">Blockchain/Crypto</option>
                  <option value="iot">IoT/Hardware</option>
                  <option value="data">Data Science</option>
                  <option value="other">Other</option>
                </select>
                {'category' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              {/* Experience Level */}
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Required Experience Level *
                </label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  required
                  defaultValue={formData?.experienceLevel || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white ${
                    'experienceLevel' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                >
                  <option value="">Select experience level</option>
                  <option value="beginner">Beginner (0-1 years)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                  <option value="any">Any level welcome</option>
                </select>
                {'experienceLevel' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.experienceLevel}</p>
                )}
              </div>

              {/* Skills Needed */}
              <div>
                <label htmlFor="skillsNeeded" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Skills Needed *
                </label>
                <textarea
                  id="skillsNeeded"
                  name="skillsNeeded"
                  required
                  maxLength={500}
                  rows={3}
                  defaultValue={formData?.skillsNeeded || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white resize-vertical ${
                    'skillsNeeded' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                  placeholder="e.g., React, TypeScript, UI/UX Design, Python, Machine Learning..."
                ></textarea>
                {'skillsNeeded' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.skillsNeeded}</p>
                )}
              </div>

              {/* Time Commitment */}
              <div>
                <label htmlFor="timeCommitment" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Expected Time Commitment *
                </label>
                <select
                  id="timeCommitment"
                  name="timeCommitment"
                  required
                  defaultValue={formData?.timeCommitment || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white ${
                    'timeCommitment' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                >
                  <option value="">Select time commitment</option>
                  <option value="1-5">1-5 hours/week</option>
                  <option value="5-10">5-10 hours/week</option>
                  <option value="10-20">10-20 hours/week</option>
                  <option value="20+">20+ hours/week</option>
                  <option value="flexible">Flexible</option>
                </select>
                {'timeCommitment' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.timeCommitment}</p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  required
                  defaultValue={formData?.contactEmail || data.user.email || ''}
                  className={`w-full px-4 py-2 bg-vaporwave-dark/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan text-white ${
                    'contactEmail' in errors ? 'border-red-500' : 'border-vaporwave-cyan/30 focus:border-vaporwave-cyan'
                  }`}
                  placeholder="your.email@example.com"
                />
                {'contactEmail' in errors && (
                  <p className="text-red-400 text-sm mt-1">{errors.contactEmail}</p>
                )}
              </div>

              {/* GitHub Repository (Optional) */}
              <div>
                <label htmlFor="githubRepo" className="block text-sm font-medium text-vaporwave-cyan mb-2">
                  GitHub Repository (Optional)
                </label>
                <input
                  type="url"
                  id="githubRepo"
                  name="githubRepo"
                  maxLength={200}
                  defaultValue={formData?.githubRepo || ''}
                  className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan focus:border-vaporwave-cyan text-white"
                  placeholder="https://github.com/username/repository"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Link to existing repository if you have one
                </p>
              </div>

              {/* Project Options */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRemote"
                    name="isRemote"
                    defaultChecked={formData?.isRemote === 'on'}
                    className="w-4 h-4 text-vaporwave-cyan bg-vaporwave-dark border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan focus:ring-2"
                  />
                  <label htmlFor="isRemote" className="ml-2 text-sm text-gray-300">
                    Remote work friendly
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lookingForCollaborators"
                    name="lookingForCollaborators"
                    defaultChecked={formData?.lookingForCollaborators === 'on'}
                    className="w-4 h-4 text-vaporwave-cyan bg-vaporwave-dark border-vaporwave-cyan/30 rounded focus:ring-vaporwave-cyan focus:ring-2"
                  />
                  <label htmlFor="lookingForCollaborators" className="ml-2 text-sm text-gray-300">
                    Actively looking for collaborators
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink hover:from-vaporwave-pink hover:to-vaporwave-cyan'
                  } text-white`}
                >
                  {isSubmitting ? 'Creating Proposal...' : 'Create Project Proposal'}
                </button>
                
                <Link
                  to="/projects"
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}