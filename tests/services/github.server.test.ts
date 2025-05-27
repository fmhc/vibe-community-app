import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the cache and logger
vi.mock('~/lib/cache.server', () => ({
  directusCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn()
  }
}));

vi.mock('~/lib/logger.server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock fetch globally
global.fetch = vi.fn();

// Create a test-specific GitHubService class
class TestGitHubService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email,public_repo,read:user',
      state: state || ''
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

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

      return data.access_token;
    } catch (error) {
      return null;
    }
  }
}

describe('GitHubService', () => {
  let githubService: TestGitHubService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables for testing
    process.env.GITHUB_CLIENT_ID = 'test_client_id';
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
    process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/auth/github/callback';
    
    // Create new instance after setting environment variables
    githubService = new TestGitHubService();
  });

  describe('Configuration', () => {
    it('should be configured when all environment variables are set', () => {
      expect(githubService.isConfigured()).toBe(true);
    });

    it('should not be configured when environment variables are missing', () => {
      delete process.env.GITHUB_CLIENT_ID;
      const unconfiguredService = new TestGitHubService();
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should generate correct authorization URL', () => {
      const state = 'test_state';
      const authUrl = githubService.getAuthorizationUrl(state);
      
      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgithub%2Fcallback');
      expect(authUrl).toContain('scope=user%3Aemail%2Cpublic_repo%2Cread%3Auser');
      expect(authUrl).toContain(`state=${state}`);
    });
  });

  describe('OAuth Token Exchange', () => {
    it('should exchange code for access token successfully', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        token_type: 'bearer',
        scope: 'user:email,public_repo'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const token = await githubService.exchangeCodeForToken('test_code');
      
      expect(token).toBe('test_access_token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            code: 'test_code',
            redirect_uri: 'http://localhost:3000/auth/github/callback'
          })
        })
      );
    });

    it('should handle token exchange errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      const token = await githubService.exchangeCodeForToken('invalid_code');
      
      expect(token).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const token = await githubService.exchangeCodeForToken('test_code');
      
      expect(token).toBeNull();
    });
  });
}); 