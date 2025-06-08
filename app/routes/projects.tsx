import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Form, useSubmit, useNavigation } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { githubService } from "~/services/github.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";
import { useState, useEffect } from "react";

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

interface CommunityProject {
  id: string;
  name: string;
  description: string;
  category: string;
  languages: string[];
  skills: string[];
  stars: number;
  forks: number;
  topics: string[];
  githubUrl: string;
  homepage?: string;
  collaborationInterest: boolean;
  owner: {
    name: string;
    githubUsername: string;
    avatarUrl: string;
    profileUrl: string;
  };
  lastUpdated: string;
  isLookingForCollaborators?: boolean;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Projects - Vibe Coding Hamburg" },
    { name: "description", content: "Discover and collaborate on exciting coding projects in the Hamburg tech community." },
    { property: "og:title", content: "Projects - Vibe Coding Hamburg" },
    { property: "og:description", content: "Discover and collaborate on exciting coding projects in the Hamburg tech community." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await directusService.getSession(request);
  
  try {
    // Get all community members with GitHub profiles
    const membersResult = await directusService.getCommunityMembers();
    const allMembers = membersResult.success ? (membersResult.data || []) : [];
    
    // Filter members who have GitHub usernames
    const membersWithGitHub = allMembers.filter(member => member.github_username);
    
    // Fetch GitHub repositories for all members with GitHub profiles
    const allProjects: CommunityProject[] = [];
    
    for (const member of membersWithGitHub) {
      try {
        // Fetch repositories for this member
        const repos = await githubService.getPublicRepositories(member.github_username!);
        
        // Convert GitHub repos to community projects
        const memberProjects = repos
          .filter((repo: any) => !repo.fork && repo.description) // Filter out forks and repos without descriptions
          .map((repo: any) => {
            // Determine category based on language and topics
            const category = categorizeRepository({
              ...repo,
              homepage: repo.homepage || null,
              owner: repo.owner || { login: '', avatar_url: '', html_url: '' }
            });
            
            return {
              id: `github-${repo.id}`,
              name: repo.name,
              description: repo.description || 'No description available',
              category,
              languages: repo.language ? [repo.language] : [],
              skills: [...(repo.topics || []), ...(repo.language ? [repo.language] : [])],
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              topics: repo.topics || [],
              githubUrl: repo.html_url,
              homepage: repo.homepage || undefined,
              collaborationInterest: true, // Default to true for GitHub projects
              owner: {
                name: member.name || member.github_username!,
                githubUsername: member.github_username!,
                avatarUrl: repo.owner?.avatar_url || '/favicon.ico',
                profileUrl: repo.owner?.html_url || `https://github.com/${member.github_username}`,
              },
              lastUpdated: repo.pushed_at || new Date().toISOString(),
              isLookingForCollaborators: (repo.stargazers_count || 0) > 0 || (repo.forks_count || 0) > 0,
            };
          });
        
        allProjects.push(...memberProjects);
      } catch (error) {
        console.warn(`Failed to fetch GitHub repositories for ${member.github_username}:`, error);
        // Continue with other members even if one fails
      }
    }
    
    // Sort projects by last updated (most recent first)
    allProjects.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    
    return json({
      projects: allProjects,
      user: session?.user || null,
      hasGitHub: session?.user ? !!(await directusService.getMemberByEmail(session.user.email || ''))?.data?.github_username : false,
      totalMembers: allMembers.length,
      membersWithGitHub: membersWithGitHub.length,
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    
    // Fallback to a few sample projects if GitHub API fails
    const fallbackProjects: CommunityProject[] = [
      {
        id: 'fallback-1',
        name: 'Community Projects Loading...',
        description: 'We\'re currently loading community projects from GitHub. Please check back in a moment.',
        category: 'web',
        languages: ['TypeScript'],
        skills: ['React', 'TypeScript'],
        stars: 0,
        forks: 0,
        topics: ['community', 'loading'],
        githubUrl: 'https://github.com',
        collaborationInterest: false,
        owner: {
          name: 'Vibe Coding Hamburg',
          githubUsername: 'vibe-coding-hamburg',
          avatarUrl: '/favicon.ico',
          profileUrl: 'https://github.com',
        },
        lastUpdated: new Date().toISOString(),
      }
    ];
    
    return json({
      projects: fallbackProjects,
      user: session?.user || null,
      hasGitHub: false,
      totalMembers: 0,
      membersWithGitHub: 0,
    });
  }
}

function categorizeRepository(repo: GitHubRepository): string {
  const language = repo.language?.toLowerCase() || '';
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const name = repo.name.toLowerCase();
  const description = (repo.description || '').toLowerCase();
  
  // AI/ML keywords
  if (topics.some(t => ['ai', 'ml', 'machine-learning', 'artificial-intelligence', 'tensorflow', 'pytorch', 'keras'].includes(t)) ||
      description.includes('machine learning') || description.includes('artificial intelligence') || 
      description.includes('neural network') || language === 'python' && (description.includes('model') || description.includes('prediction'))) {
    return 'ai';
  }
  
  // Mobile keywords
  if (topics.some(t => ['android', 'ios', 'mobile', 'react-native', 'flutter', 'kotlin', 'swift'].includes(t)) ||
      ['kotlin', 'swift', 'dart'].includes(language) ||
      description.includes('mobile') || description.includes('android') || description.includes('ios')) {
    return 'mobile';
  }
  
  // Game development
  if (topics.some(t => ['game', 'unity', 'unreal', 'gamedev', 'gaming'].includes(t)) ||
      ['c#', 'c++'].includes(language) && (description.includes('game') || name.includes('game')) ||
      description.includes('game development') || description.includes('unity')) {
    return 'game';
  }
  
  // Blockchain/Crypto
  if (topics.some(t => ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'solidity', 'web3', 'defi', 'nft'].includes(t)) ||
      language === 'solidity' || description.includes('blockchain') || description.includes('crypto') || description.includes('smart contract')) {
    return 'blockchain';
  }
  
  // Data Science
  if (topics.some(t => ['data-science', 'analytics', 'visualization', 'jupyter', 'pandas', 'numpy'].includes(t)) ||
      description.includes('data analysis') || description.includes('visualization') || description.includes('analytics')) {
    return 'data';
  }
  
  // IoT/Hardware
  if (topics.some(t => ['iot', 'hardware', 'arduino', 'raspberry-pi', 'embedded'].includes(t)) ||
      ['c', 'c++', 'rust'].includes(language) && (description.includes('hardware') || description.includes('embedded') || description.includes('iot'))) {
    return 'iot';
  }
  
  // Web development (default for most web technologies)
  if (['javascript', 'typescript', 'html', 'css', 'php', 'python', 'go', 'rust', 'java'].includes(language) ||
      topics.some(t => ['web', 'frontend', 'backend', 'fullstack', 'react', 'vue', 'angular', 'nodejs'].includes(t))) {
    return 'web';
  }
  
  // Default to 'other' for everything else
  return 'other';
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "toggle-collaboration") {
    const projectId = formData.get("projectId") as string;
    // Here you would implement collaboration interest logic
    // For now, we'll just return success
    return json({ success: true, message: "Collaboration interest updated" });
  }

  return json({ success: false, message: "Invalid action" });
}

export default function Projects() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

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
            <span className="text-vaporwave-cyan font-medium">Projects</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {data.user ? (
              <Link
                to="/dashboard"
                className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white px-4 py-2 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold glow-text mb-4">
              Community Projects 🚀
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Discover amazing projects from our community members and find collaboration opportunities
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm mb-6">
              <div className="bg-vaporwave-card/60 px-4 py-2 rounded-lg">
                <span className="text-vaporwave-cyan font-medium">{data.totalMembers}</span>
                <span className="text-gray-400 ml-1">Members</span>
              </div>
              <div className="bg-vaporwave-card/60 px-4 py-2 rounded-lg">
                <span className="text-vaporwave-pink font-medium">{data.membersWithGitHub}</span>
                <span className="text-gray-400 ml-1">Contributors</span>
              </div>
              <div className="bg-vaporwave-card/60 px-4 py-2 rounded-lg">
                <span className="text-green-400 font-medium">
                  {data.projects.filter(p => p.isLookingForCollaborators).length}
                </span>
                <span className="text-gray-400 ml-1">Seeking Collaborators</span>
              </div>
            </div>

            {/* Action Buttons */}
            {data.user && (
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/projects/create"
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center space-x-2"
                >
                  <span>✨</span>
                  <span>Propose New Project</span>
                </Link>
                {!data.hasGitHub && (
                  <Link
                    to="/auth/github"
                    className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>🐙</span>
                    <span>Connect GitHub</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 mb-8">
            <Form method="get" className="space-y-4">
              {/* Search and Skill Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-vaporwave-cyan text-sm font-medium mb-2">
                    Search Projects
                  </label>
                  <input
                    type="text"
                    name="search"
                    defaultValue=""
                    placeholder="Search by name, description, or topic..."
                    className="w-full bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-vaporwave-cyan focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-vaporwave-cyan text-sm font-medium mb-2">
                    Filter by Skill
                  </label>
                  <select
                    name="skill"
                    defaultValue=""
                    className="w-full bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg px-4 py-2 text-white focus:border-vaporwave-cyan focus:outline-none"
                  >
                    <option value="">All Skills</option>
                    {Array.from(new Set(
                      data.projects.flatMap(project => [...project.languages, ...project.topics, ...project.skills])
                    )).sort().map((skill: string) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Filter Row */}
              <div>
                <label className="block text-vaporwave-cyan text-sm font-medium mb-2">
                  Project Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Projects', icon: '🎯' },
                    { value: 'web', label: 'Web Development', icon: '🌐' },
                    { value: 'mobile', label: 'Mobile Apps', icon: '📱' },
                    { value: 'ai', label: 'AI/ML', icon: '🤖' },
                    { value: 'game', label: 'Game Development', icon: '🎮' },
                    { value: 'seeking-collaborators', label: 'Seeking Collaborators', icon: '🤝' }
                  ].map(category => (
                    <label key={category.value} className="flex items-center">
                      <input
                        type="radio"
                        name="filter"
                        value={category.value}
                        defaultChecked={category.value === 'all'}
                        className="sr-only"
                      />
                      <div className={`px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center space-x-2 ${
                        category.value === 'all'
                          ? 'bg-vaporwave-cyan text-vaporwave-dark font-medium'
                          : 'bg-vaporwave-dark/50 text-gray-300 hover:bg-vaporwave-cyan/20'
                      }`}>
                        <span>{category.icon}</span>
                        <span>{category.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? 'Filtering...' : 'Apply Filters'}
                </button>
              </div>
            </Form>
          </div>

          {/* Projects Grid */}
          {data.projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No projects found</h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your filters or{' '}
                {!data.user && (
                  <>
                    <Link to="/login" className="text-vaporwave-cyan hover:underline">
                      sign in
                    </Link>
                    {' '}to see more projects
                  </>
                )}
              </p>
              {data.hasGitHub && !data.hasGitHub && (
                <Link
                  to="/auth/github"
                  className="inline-block bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  Connect GitHub to Share Your Projects
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl hover:shadow-vaporwave-cyan/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {project.name}
                      </h3>
                      <div className="flex items-center text-gray-400 text-sm">
                        <img
                          src={`https://github.com/${project.owner.githubUsername}.png`}
                          alt={project.owner.githubUsername}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                        <span>@{project.owner.githubUsername}</span>
                      </div>
                    </div>
                    {project.isLookingForCollaborators && (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-2 py-1 text-xs text-green-400">
                        🤝 Seeking Collaborators
                      </div>
                    )}
                  </div>

                  {/* Project Description */}
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {project.description || "No description available"}
                  </p>

                  {/* Languages */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.languages.slice(0, 3).map((lang: string) => (
                      <span
                        key={lang}
                        className="bg-vaporwave-cyan/20 text-vaporwave-cyan text-xs px-2 py-1 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                    {project.languages.length > 3 && (
                      <span className="bg-gray-600/20 text-gray-400 text-xs px-2 py-1 rounded">
                        +{project.languages.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Topics */}
                  {project.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {project.topics.slice(0, 2).map((topic: string) => (
                        <span
                          key={topic}
                          className="bg-vaporwave-pink/20 text-vaporwave-pink text-xs px-2 py-1 rounded"
                        >
                          #{topic}
                        </span>
                      ))}
                      {project.topics.length > 2 && (
                        <span className="text-gray-400 text-xs px-2 py-1">
                          +{project.topics.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-gray-400 text-sm mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        ⭐ {project.stars}
                      </span>
                      <span className="flex items-center">
                        🍴 {project.forks}
                      </span>
                    </div>
                    <span>
                      Updated {new Date(project.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white text-center py-2 px-4 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all text-sm font-medium"
                    >
                      View on GitHub
                    </a>
                    {data.user && project.isLookingForCollaborators && (
                      <Form method="post" className="flex-1">
                        <input type="hidden" name="action" value="toggle-collaboration" />
                        <input type="hidden" name="projectId" value={project.id} />
                        <button
                          type="submit"
                          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          Collaborate
                        </button>
                      </Form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Call to Action */}
          {data.hasGitHub && !data.hasGitHub && (
            <div className="mt-16 text-center">
              <div className="bg-gradient-to-r from-vaporwave-cyan/20 to-vaporwave-pink/20 border border-vaporwave-cyan/30 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Share Your Projects! 🚀
                </h3>
                <p className="text-gray-300 mb-6">
                  Connect your GitHub account to showcase your projects to the community
                </p>
                <Link
                  to="/auth/github"
                  className="inline-block bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-semibold py-3 px-8 rounded-lg transition-all"
                >
                  Connect GitHub Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}