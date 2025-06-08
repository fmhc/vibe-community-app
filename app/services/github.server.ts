import { logger } from '~/lib/logger.server';
import { directusCache } from '~/lib/cache.server';

// GitHub API Types
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  visibility: 'public' | 'private';
  archived: boolean;
  disabled: boolean;
  fork: boolean;
}

export interface GitHubLanguages {
  [language: string]: number;
}

export interface GitHubUserProfile {
  user: GitHubUser;
  repositories: GitHubRepository[];
  languages: Record<string, number>;
  totalCommits: number;
  contributionScore: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryLanguages: string[];
  projectCategories: string[];
}

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || `${process.env.BASE_URL}/auth/github/callback`;

// GitHub API Base URL
const GITHUB_API_BASE = 'https://api.github.com';

class GitHubService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      logger.warn('GitHub OAuth credentials not configured', {
        service: 'GitHubService',
        hasClientId: !!GITHUB_CLIENT_ID,
        hasClientSecret: !!GITHUB_CLIENT_SECRET
      });
    }

    this.clientId = GITHUB_CLIENT_ID || '';
    this.clientSecret = GITHUB_CLIENT_SECRET || '';
    this.redirectUri = GITHUB_REDIRECT_URI;
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email,public_repo,read:user',
      state: state || ''
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string | null> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub OAuth token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
      }

      logger.info('GitHub OAuth token exchange successful', {
        service: 'GitHubService',
        method: 'exchangeCodeForToken'
      });

      return data.access_token;
    } catch (error) {
      logger.error('Failed to exchange GitHub code for token', {
        service: 'GitHubService',
        method: 'exchangeCodeForToken',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Make authenticated request to GitHub API
   */
  private async makeGitHubRequest<T>(
    endpoint: string, 
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    try {
      const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vibe-Community-App/1.0',
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('GitHub access token is invalid or expired');
        }
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error(`GitHub API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('GitHub API request failed', {
        service: 'GitHubService',
        method: 'makeGitHubRequest',
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get authenticated user information
   */
  async getUser(accessToken: string): Promise<GitHubUser | null> {
    const cacheKey = `github:user:${accessToken.slice(-8)}`;
    
    // Try cache first
    const cached = directusCache.get<GitHubUser>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.makeGitHubRequest<GitHubUser>('/user', accessToken);
    
    if (user) {
      // Cache for 15 minutes
      directusCache.set(cacheKey, user, 15 * 60 * 1000);
    }

    return user;
  }

  /**
   * Get user's public repositories
   */
  async getUserRepositories(accessToken: string, username?: string): Promise<GitHubRepository[]> {
    const endpoint = username ? `/users/${username}/repos` : '/user/repos';
    const cacheKey = `github:repos:${username || accessToken.slice(-8)}`;
    
    // Try cache first
    const cached = directusCache.get<GitHubRepository[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const repos = await this.makeGitHubRequest<GitHubRepository[]>(
      `${endpoint}?sort=updated&per_page=100`,
      accessToken
    );

    if (repos) {
      // Filter out forks and archived repos for main profile
      const activeRepos = repos.filter(repo => !repo.fork && !repo.archived);
      
      // Cache for 30 minutes
      directusCache.set(cacheKey, activeRepos, 30 * 60 * 1000);
      return activeRepos;
    }

    return [];
  }

  /**
   * Get public repositories for any GitHub user (no authentication required)
   */
  async getPublicRepositories(username: string): Promise<any[]> {
    const cacheKey = `github:public-repos:${username}`;
    
    // Try cache first
    const cached = directusCache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=30`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vibe-Community-App/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('GitHub user not found', {
            service: 'GitHubService',
            method: 'getPublicRepositories',
            username
          });
          return [];
        }
        throw new Error(`GitHub API request failed: ${response.status}`);
      }

      const repos = await response.json();
      
      // Filter out forks and archived repos, and only include repos with descriptions
      const activeRepos = repos.filter((repo: any) => 
        !repo.fork && 
        !repo.archived && 
        repo.description &&
        repo.description.trim().length > 0
      );
      
      // Cache for 1 hour
      directusCache.set(cacheKey, activeRepos, 60 * 60 * 1000);
      
      logger.info('Fetched public repositories', {
        service: 'GitHubService',
        method: 'getPublicRepositories',
        username,
        totalRepos: repos.length,
        activeRepos: activeRepos.length
      });
      
      return activeRepos;
    } catch (error) {
      logger.error('Failed to fetch public repositories', {
        service: 'GitHubService',
        method: 'getPublicRepositories',
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(accessToken: string, owner: string, repo: string): Promise<GitHubLanguages> {
    const cacheKey = `github:languages:${owner}:${repo}`;
    
    // Try cache first
    const cached = directusCache.get<GitHubLanguages>(cacheKey);
    if (cached) {
      return cached;
    }

    const languages = await this.makeGitHubRequest<GitHubLanguages>(
      `/repos/${owner}/${repo}/languages`,
      accessToken
    );

    if (languages) {
      // Cache for 1 hour
      directusCache.set(cacheKey, languages, 60 * 60 * 1000);
      return languages;
    }

    return {};
  }

  /**
   * Get user's commit activity
   */
  async getUserCommitActivity(accessToken: string, username: string): Promise<number> {
    const cacheKey = `github:commits:${username}`;
    
    // Try cache first
    const cached = directusCache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get recent activity from user's events
    const events = await this.makeGitHubRequest<any[]>(
      `/users/${username}/events?per_page=100`,
      accessToken
    );

    if (events) {
      // Count push events in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentCommits = events.filter(event => 
        event.type === 'PushEvent' && 
        new Date(event.created_at) > thirtyDaysAgo
      ).reduce((total, event) => total + (event.payload?.commits?.length || 0), 0);

      // Cache for 1 hour
      directusCache.set(cacheKey, recentCommits, 60 * 60 * 1000);
      return recentCommits;
    }

    return 0;
  }

  /**
   * Calculate user's skill level based on GitHub activity
   */
  private calculateSkillLevel(
    totalRepos: number,
    totalCommits: number,
    languages: Record<string, number>,
    accountAge: number
  ): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const languageCount = Object.keys(languages).length;
    const avgCommitsPerMonth = totalCommits / Math.max(accountAge, 1);

    // Calculate score based on multiple factors
    let score = 0;
    
    // Repository count (0-30 points)
    score += Math.min(totalRepos * 2, 30);
    
    // Language diversity (0-25 points)
    score += Math.min(languageCount * 3, 25);
    
    // Commit frequency (0-25 points)
    score += Math.min(avgCommitsPerMonth * 2, 25);
    
    // Account age bonus (0-20 points)
    score += Math.min(accountAge * 2, 20);

    if (score >= 80) return 'expert';
    if (score >= 60) return 'advanced';
    if (score >= 30) return 'intermediate';
    return 'beginner';
  }

  /**
   * Get comprehensive user profile with analysis
   */
  async getUserProfile(accessToken: string): Promise<GitHubUserProfile | null> {
    try {
      const user = await this.getUser(accessToken);
      if (!user) return null;

      const repositories = await this.getUserRepositories(accessToken);
      const totalCommits = await this.getUserCommitActivity(accessToken, user.login);

      // Aggregate languages from all repositories
      const allLanguages: Record<string, number> = {};
      
      for (const repo of repositories.slice(0, 20)) { // Limit to top 20 repos
        const repoLanguages = await this.getRepositoryLanguages(
          accessToken, 
          user.login, 
          repo.name
        );
        
        Object.entries(repoLanguages).forEach(([lang, bytes]) => {
          allLanguages[lang] = (allLanguages[lang] || 0) + bytes;
        });
      }

      // Calculate account age in months
      const accountAge = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      // Determine skill level
      const skillLevel = this.calculateSkillLevel(
        repositories.length,
        totalCommits,
        allLanguages,
        accountAge
      );

      // Get primary languages (top 5)
      const primaryLanguages = Object.entries(allLanguages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang]) => lang);

      // Categorize projects based on languages and topics
      const projectCategories = this.categorizeProjects(repositories, allLanguages);

      // Calculate contribution score
      const contributionScore = Math.min(
        repositories.length * 10 + 
        totalCommits * 2 + 
        Object.keys(allLanguages).length * 5,
        1000
      );

      const profile: GitHubUserProfile = {
        user,
        repositories,
        languages: allLanguages,
        totalCommits,
        contributionScore,
        skillLevel,
        primaryLanguages,
        projectCategories
      };

      logger.info('GitHub user profile generated', {
        service: 'GitHubService',
        method: 'getUserProfile',
        username: user.login,
        skillLevel,
        repoCount: repositories.length,
        languageCount: Object.keys(allLanguages).length
      });

      return profile;
    } catch (error) {
      logger.error('Failed to generate GitHub user profile', {
        service: 'GitHubService',
        method: 'getUserProfile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Categorize projects based on languages and repository topics
   */
  private categorizeProjects(repositories: GitHubRepository[], languages: Record<string, number>): string[] {
    const categories = new Set<string>();

    // Language-based categorization
    const topLanguages = Object.keys(languages).slice(0, 3);
    
    topLanguages.forEach(lang => {
      switch (lang.toLowerCase()) {
        case 'javascript':
        case 'typescript':
        case 'react':
        case 'vue':
        case 'angular':
        case 'html':
        case 'css':
          categories.add('web');
          break;
        case 'python':
        case 'r':
        case 'jupyter notebook':
          categories.add('ai');
          categories.add('data-science');
          break;
        case 'swift':
        case 'kotlin':
        case 'java':
        case 'dart':
          categories.add('mobile');
          break;
        case 'c#':
        case 'c++':
        case 'unity':
          categories.add('gaming');
          break;
        case 'rust':
        case 'go':
        case 'c':
          categories.add('systems');
          break;
        case 'php':
        case 'ruby':
          categories.add('backend');
          break;
      }
    });

    // Topic-based categorization
    repositories.forEach(repo => {
      repo.topics.forEach(topic => {
        if (topic.includes('ai') || topic.includes('ml') || topic.includes('machine-learning')) {
          categories.add('ai');
        }
        if (topic.includes('web') || topic.includes('frontend') || topic.includes('backend')) {
          categories.add('web');
        }
        if (topic.includes('mobile') || topic.includes('ios') || topic.includes('android')) {
          categories.add('mobile');
        }
        if (topic.includes('game') || topic.includes('unity') || topic.includes('gamedev')) {
          categories.add('gaming');
        }
      });
    });

    return Array.from(categories);
  }

  /**
   * Find potential project collaborators based on skills
   */
  async findCollaborators(
    requiredSkills: string[],
    excludeUsername?: string
  ): Promise<GitHubUserProfile[]> {
    // This would typically query your database of connected GitHub users
    // For now, return empty array - will implement when we have user storage
    logger.info('Collaborator search requested', {
      service: 'GitHubService',
      method: 'findCollaborators',
      requiredSkills,
      excludeUsername
    });
    
    return [];
  }

  /**
   * Check if GitHub integration is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

// Export singleton instance
export const githubService = new GitHubService(); 