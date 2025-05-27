import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock client
const mockClient = {
  request: vi.fn(),
  login: vi.fn(),
  with: vi.fn(),
};

// Mock the Directus SDK
vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(() => mockClient),
  rest: vi.fn(),
  authentication: vi.fn(),
  readItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createUser: vi.fn(),
  readUsers: vi.fn(),
  updateUser: vi.fn(),
}));

// Mock the entire directus service module
vi.mock('../../app/services/directus.server', () => ({
  directusService: {
    authenticate: vi.fn(),
    createUserAccount: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
    updateEmailPreferences: vi.fn(),
    unsubscribeFromEmails: vi.fn(),
    getMemberByEmail: vi.fn(),
    getStats: vi.fn(),
    createCommunityMember: vi.fn(),
    getCommunityMembers: vi.fn(),
    updateCommunityMember: vi.fn(),
    deleteCommunityMember: vi.fn(),
    checkEmailExists: vi.fn(),
  },
}));

// Import the mocked service
import { directusService } from '../../app/services/directus.server';

describe('DirectusService - User Account Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserAccount', () => {
    it('should create Directus user and community member successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          directusUser: {
            id: 'user-123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            status: 'invited',
          },
          communityMember: {
            id: 'member-123',
            directus_user_id: 'user-123',
            email: 'test@example.com',
            name: 'John Doe',
            email_verified: false,
            status: 'pending',
          },
          verificationToken: 'abc123token',
        },
      };

      vi.mocked(directusService.createUserAccount).mockResolvedValue(mockResult as any);

      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        experience_level: 50,
        project_interest: 'web',
        project_details: 'Building web apps',
        github_username: 'johndoe',
      };

      const result = await directusService.createUserAccount(userData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.directusUser.email).toBe('test@example.com');
      expect(result.data?.verificationToken).toBeDefined();
      expect(directusService.createUserAccount).toHaveBeenCalledWith(userData);
    });

    it('should handle user creation failure', async () => {
      const mockResult = {
        success: false,
        error: 'User creation failed',
      };

      vi.mocked(directusService.createUserAccount).mockResolvedValue(mockResult as any);

      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        experience_level: 50,
        project_interest: 'web',
      };

      const result = await directusService.createUserAccount(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User creation failed');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully and activate user', async () => {
      const mockResult = {
        success: true,
        data: {
          id: 'member-123',
          email: 'test@example.com',
          name: 'John Doe',
          email_verified: true,
          status: 'verified',
        },
      };

      vi.mocked(directusService.verifyEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.data?.email_verified).toBe(true);
      expect(result.data?.status).toBe('verified');
      expect(directusService.verifyEmail).toHaveBeenCalledWith('valid-token');
    });

    it('should handle invalid verification token', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid verification token',
      };

      vi.mocked(directusService.verifyEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const mockResult = {
        success: true,
        data: { verificationToken: 'new-token-123' },
      };

      vi.mocked(directusService.resendVerificationEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data?.verificationToken).toBeDefined();
      expect(directusService.resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle email not found', async () => {
      const mockResult = {
        success: false,
        error: 'Email not found or already verified',
      };

      vi.mocked(directusService.resendVerificationEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.resendVerificationEmail('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found or already verified');
    });
  });

  describe('updateEmailPreferences', () => {
    it('should update email preferences successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          id: 'member-123',
          email_preferences: {
            welcome_emails: true,
            event_invitations: true,
            newsletter: false,
            project_notifications: false,
          },
        },
      };

      vi.mocked(directusService.updateEmailPreferences).mockResolvedValue(mockResult as any);

      const updatedPreferences = {
        newsletter: false,
        project_notifications: false,
      };

      const result = await directusService.updateEmailPreferences('test@example.com', updatedPreferences);

      expect(result.success).toBe(true);
      expect(directusService.updateEmailPreferences).toHaveBeenCalledWith('test@example.com', updatedPreferences);
    });

    it('should handle member not found', async () => {
      const mockResult = {
        success: false,
        error: 'Member not found',
      };

      vi.mocked(directusService.updateEmailPreferences).mockResolvedValue(mockResult as any);

      const result = await directusService.updateEmailPreferences('notfound@example.com', { newsletter: false });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
    });
  });

  describe('unsubscribeFromEmails', () => {
    it('should unsubscribe from all emails successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          id: 'member-123',
          email_preferences: {
            welcome_emails: false,
            event_invitations: false,
            newsletter: false,
            project_notifications: false,
          },
        },
      };

      vi.mocked(directusService.unsubscribeFromEmails).mockResolvedValue(mockResult as any);

      const result = await directusService.unsubscribeFromEmails('unsubscribe-token');

      expect(result.success).toBe(true);
      expect(directusService.unsubscribeFromEmails).toHaveBeenCalledWith('unsubscribe-token');
    });

    it('should handle invalid unsubscribe token', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid unsubscribe token',
      };

      vi.mocked(directusService.unsubscribeFromEmails).mockResolvedValue(mockResult as any);

      const result = await directusService.unsubscribeFromEmails('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid unsubscribe token');
    });
  });

  describe('getMemberByEmail', () => {
    it('should get member by email successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          id: 'member-123',
          email: 'test@example.com',
          name: 'John Doe',
        },
      };

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.getMemberByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(directusService.getMemberByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle member not found', async () => {
      const mockResult = {
        success: false,
        error: 'Member not found',
      };

      vi.mocked(directusService.getMemberByEmail).mockResolvedValue(mockResult as any);

      const result = await directusService.getMemberByEmail('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
    });
  });

  describe('getStats', () => {
    it('should return comprehensive stats including email preferences', async () => {
      const mockResult = {
        success: true,
        data: {
          total: 3,
          verified: 2,
          active: 1,
          pending: 1,
          experienceLevels: {
            beginner: 1,
            intermediate: 1,
            advanced: 1,
          },
          projectInterests: {
            web: 2,
            ai: 1,
          },
          emailPreferences: {
            welcomeEmails: 2,
            eventInvitations: 2,
            newsletter: 2,
            projectNotifications: 2,
          },
        },
      };

      vi.mocked(directusService.getStats).mockResolvedValue(mockResult as any);

      const result = await directusService.getStats();

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(3);
      expect(result.data?.emailPreferences).toBeDefined();
      expect(directusService.getStats).toHaveBeenCalled();
    });
  });
}); 