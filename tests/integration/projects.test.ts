import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRemixStub } from '@remix-run/testing';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { loader as projectsLoader, action as projectsAction } from '~/routes/projects';
import { loader as createProjectLoader, action as createProjectAction } from '~/routes/projects.create';

// Mock services
vi.mock('~/services/directus.server', () => ({
  directusService: {
    getSession: vi.fn(),
    getMemberByEmail: vi.fn(),
    getCommunityMembers: vi.fn(),
    createItem: vi.fn(),
    updateCommunityMember: vi.fn(),
  }
}));

vi.mock('~/services/github.server', () => ({
  githubService: {
    isConfigured: vi.fn(() => true),
    getAuthorizationUrl: vi.fn(() => 'https://github.com/login/oauth/authorize'),
    exchangeCodeForToken: vi.fn(),
    getUserProfile: vi.fn(),
    getPublicRepositories: vi.fn(),
  }
}));

vi.mock('~/services/email.server', () => ({
  emailService: {
    sendProjectProposalNotification: vi.fn(),
  }
}));

vi.mock('~/lib/validation.server', () => ({
  validateInput: vi.fn((value, type, options) => ({
    isValid: true,
    value,
    error: null
  }))
}));

vi.mock('~/lib/logger.server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Projects Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Projects Showcase Page', () => {
    it('should display projects from community members with GitHub profiles', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      // Mock authenticated user
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      // Mock member data
      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: {
          id: 'member-1',
          email: 'test@example.com',
          github_username: 'johndoe',
          skills: ['JavaScript', 'React'],
          experience_level: 75
        }
      });

      // Mock community members with GitHub profiles
      vi.mocked(directusService.getCommunityMembers).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'member-1',
            email: 'test@example.com',
            github_username: 'johndoe',
            skills: ['JavaScript', 'React'],
            experience_level: 75
          },
          {
            id: 'member-2',
            email: 'jane@example.com',
            github_username: 'janedoe',
            skills: ['Python', 'Django'],
            experience_level: 85
          }
        ]
      });

      const request = new Request('http://localhost:3000/projects');
      const result = await projectsLoader({ request, params: {}, context: {} });
      const data = await result.json();

      expect(data.projects).toBeDefined();
      expect(data.membersWithGitHub).toBe(2);
      expect(data.totalProjects).toBeGreaterThan(0);
    });

    it('should filter projects by category', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', github_username: 'johndoe' }
      });

      vi.mocked(directusService.getCommunityMembers).mockResolvedValue({
        success: true,
        data: [{ id: 'member-1', github_username: 'johndoe' }]
      });

      const request = new Request('http://localhost:3000/projects?filter=web');
      const result = await projectsLoader({ request, params: {}, context: {} });
      const data = await result.json();

      // Projects should be filtered to web development projects
      const webProjects = data.projects.filter((p: any) => 
        p.category === 'web' || 
        p.languages.some((lang: string) => ['JavaScript', 'TypeScript', 'React'].includes(lang))
      );
      expect(webProjects.length).toBeGreaterThan(0);
    });

    it('should search projects by name and description', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', github_username: 'johndoe' }
      });

      vi.mocked(directusService.getCommunityMembers).mockResolvedValue({
        success: true,
        data: [{ id: 'member-1', github_username: 'johndoe' }]
      });

      const request = new Request('http://localhost:3000/projects?search=portfolio');
      const result = await projectsLoader({ request, params: {}, context: {} });
      const data = await result.json();

      // Should find projects with "portfolio" in name or description
      const portfolioProjects = data.projects.filter((p: any) => 
        p.name.toLowerCase().includes('portfolio') || 
        p.description?.toLowerCase().includes('portfolio')
      );
      expect(portfolioProjects.length).toBeGreaterThan(0);
    });

    it('should handle collaboration interest action', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      const formData = new FormData();
      formData.append('action', 'toggle-collaboration');
      formData.append('projectId', 'project-123');

      const request = new Request('http://localhost:3000/projects', {
        method: 'POST',
        body: formData
      });

      const result = await projectsAction({ request, params: {}, context: {} });
      const data = await result.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('Collaboration interest updated');
    });
  });

  describe('GitHub Integration', () => {
    it('should initiate GitHub OAuth flow for authenticated users', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { githubService } = await import('~/services/github.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(githubService.isConfigured).mockReturnValue(true);
      vi.mocked(githubService.getAuthorizationUrl).mockReturnValue(
        'https://github.com/login/oauth/authorize?client_id=test&redirect_uri=callback&scope=user:email,public_repo'
      );

      const request = new Request('http://localhost:3000/auth/github');
      const { loader } = await import('~/routes/auth.github');
      const result = await loader({ request, params: {}, context: {} });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('github.com/login/oauth/authorize');
    });

    it('should handle GitHub OAuth callback and update user profile', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { githubService } = await import('~/services/github.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', email: 'test@example.com' }
      });

      vi.mocked(githubService.exchangeCodeForToken).mockResolvedValue('github-token-123');
      
      vi.mocked(githubService.getUserProfile).mockResolvedValue({
        user: { login: 'johndoe', name: 'John Doe' },
        repositories: [],
        languages: { JavaScript: 1000, TypeScript: 800 },
        totalCommits: 150,
        contributionScore: 250,
        skillLevel: 'intermediate',
        primaryLanguages: ['JavaScript', 'TypeScript'],
        projectCategories: ['web']
      });

      vi.mocked(directusService.updateCommunityMember).mockResolvedValue({
        success: true,
        data: { id: 'member-1', github_username: 'johndoe' }
      });

      const request = new Request('http://localhost:3000/auth/github/callback?code=github-code-123');
      const { loader } = await import('~/routes/auth.github.callback');
      const result = await loader({ request, params: {}, context: {} });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/dashboard?success=github_connected');
      expect(directusService.updateCommunityMember).toHaveBeenCalledWith('member-1', {
        github_username: 'johndoe',
        skills: ['JavaScript', 'TypeScript'],
        experience_level: 50
      });
    });
  });

  describe('Project Proposal Creation', () => {
    it('should create a project proposal successfully', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { emailService } = await import('~/services/email.server');
      const { validateInput } = await import('~/lib/validation.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', email: 'test@example.com' }
      });

      vi.mocked(validateInput).mockReturnValue({
        isValid: true,
        value: 'test-value',
        error: null
      });

      vi.mocked(emailService.sendProjectProposalNotification).mockResolvedValue({
        success: true,
        messageId: 'email-123'
      });

      const formData = new FormData();
      formData.append('action', 'create-proposal');
      formData.append('title', 'AI-Powered Task Manager');
      formData.append('description', 'A smart task management app using AI to prioritize tasks');
      formData.append('category', 'ai');
      formData.append('skillsNeeded', 'Python, Machine Learning, React');
      formData.append('timeCommitment', '10-20 hours/week');
      formData.append('experienceLevel', 'intermediate');
      formData.append('contactEmail', 'test@example.com');
      formData.append('isRemote', 'on');
      formData.append('lookingForCollaborators', 'on');

      const request = new Request('http://localhost:3000/projects/create', {
        method: 'POST',
        body: formData
      });

      const result = await createProjectAction({ request, params: {}, context: {} });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/projects?success=proposal_created');
      expect(emailService.sendProjectProposalNotification).toHaveBeenCalled();
    });

    it('should validate project proposal form data', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { validateInput } = await import('~/lib/validation.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      // Mock validation failure
      vi.mocked(validateInput).mockReturnValue({
        isValid: false,
        value: '',
        error: 'Title is required'
      });

      const formData = new FormData();
      formData.append('action', 'create-proposal');
      formData.append('title', ''); // Empty title should fail validation

      const request = new Request('http://localhost:3000/projects/create', {
        method: 'POST',
        body: formData
      });

      const result = await createProjectAction({ request, params: {}, context: {} });
      const data = await result.json();

      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.title).toBe('Title is required');
    });

    it('should require authentication for project proposal creation', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/projects/create');
      const result = await createProjectLoader({ request, params: {}, context: {} });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toBe('/login');
    });

    it('should show GitHub connection recommendation for users without GitHub', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', email: 'test@example.com', github_username: null }
      });

      const request = new Request('http://localhost:3000/projects/create');
      const result = await createProjectLoader({ request, params: {}, context: {} });
      const data = await result.json();

      expect(data.hasGitHub).toBe(false);
      // This would trigger the GitHub connection recommendation in the UI
    });
  });

  describe('Project Collaboration Features', () => {
    it('should allow users to express collaboration interest', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      const formData = new FormData();
      formData.append('action', 'toggle-collaboration');
      formData.append('projectId', 'project-123');

      const request = new Request('http://localhost:3000/projects', {
        method: 'POST',
        body: formData
      });

      const result = await projectsAction({ request, params: {}, context: {} });
      const data = await result.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('Collaboration interest updated');
    });

    it('should filter projects seeking collaborators', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', github_username: 'johndoe' }
      });

      vi.mocked(directusService.getCommunityMembers).mockResolvedValue({
        success: true,
        data: [{ id: 'member-1', github_username: 'johndoe' }]
      });

      const request = new Request('http://localhost:3000/projects?filter=seeking-collaborators');
      const result = await projectsLoader({ request, params: {}, context: {} });
      const data = await result.json();

      // All returned projects should be seeking collaborators
      const collaboratorProjects = data.projects.filter((p: any) => p.seekingCollaborators);
      expect(collaboratorProjects.length).toBe(data.projects.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle Directus service errors gracefully', async () => {
      const { directusService } = await import('~/services/directus.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1' }
      });

      // Mock service failure
      vi.mocked(directusService.getCommunityMembers).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const request = new Request('http://localhost:3000/projects');
      const result = await projectsLoader({ request, params: {}, context: {} });
      const data = await result.json();

      // Should handle error gracefully and return empty projects list
      expect(data.projects).toEqual([]);
      expect(data.membersWithGitHub).toBe(0);
    });

    it('should handle GitHub service errors during OAuth', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { githubService } = await import('~/services/github.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      // Mock GitHub service not configured
      vi.mocked(githubService.isConfigured).mockReturnValue(false);

      const request = new Request('http://localhost:3000/auth/github');
      const { loader } = await import('~/routes/auth.github');
      const result = await loader({ request, params: {}, context: {} });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/dashboard?error=github_not_configured');
    });

    it('should handle email service errors during proposal notification', async () => {
      const { directusService } = await import('~/services/directus.server');
      const { emailService } = await import('~/services/email.server');
      const { validateInput } = await import('~/lib/validation.server');
      
      vi.mocked(directusService.getSession).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }
      });

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue({
        success: true,
        data: { id: 'member-1', email: 'test@example.com' }
      });

      vi.mocked(validateInput).mockReturnValue({
        isValid: true,
        value: 'test-value',
        error: null
      });

      // Mock email service failure
      vi.mocked(emailService.sendProjectProposalNotification).mockRejectedValue(
        new Error('SMTP connection failed')
      );

      const formData = new FormData();
      formData.append('action', 'create-proposal');
      formData.append('title', 'Test Project');
      formData.append('description', 'Test description');
      formData.append('category', 'web');
      formData.append('skillsNeeded', 'JavaScript');
      formData.append('timeCommitment', '5-10 hours/week');
      formData.append('experienceLevel', 'beginner');
      formData.append('contactEmail', 'test@example.com');

      const request = new Request('http://localhost:3000/projects/create', {
        method: 'POST',
        body: formData
      });

      const result = await createProjectAction({ request, params: {}, context: {} });

      // Should still succeed even if email fails (email failure is logged but not blocking)
      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/projects?success=proposal_created');
    });
  });
}); 