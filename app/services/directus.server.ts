import { createDirectus, rest, authentication, readItems, createItem, updateItem, deleteItem, createUser, readUsers, updateUser, readUser, staticToken } from '@directus/sdk';
import { randomBytes } from 'crypto';
import { createCookieSessionStorage } from '@remix-run/node';
import { logger, withErrorLogging, type LogContext } from '~/lib/logger.server';
import { directusCache, cacheKeys, withCache, invalidateUserCache, invalidateEmailCache } from '~/lib/cache.server';
import { optimizedQuery } from '~/lib/database-optimizer.server';

// Define the schema for Directus users
interface DirectusUser {
  id?: string;
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  status: 'invited' | 'active' | 'suspended' | 'archived';
  role?: string;
  date_created?: string;
  date_updated?: string;
}

// Define the schema for our community members
interface CommunityMember {
  id?: string;
  directus_user_id?: string;
  email: string;
  name?: string;
  experience_level: number;
  project_interest?: string;
  project_details?: string;
  skills?: string[];
  ai_tools_experience?: string[];
  github_username?: string;
  linkedin_url?: string;
  discord_username?: string;
  mattermost_invited?: boolean;
  discord_invited?: boolean;
  email_verified?: boolean;
  email_verification_token?: string;
  email_verification_sent_at?: string;
  email_verified_at?: string;
  email_preferences?: {
    welcome_emails: boolean;
    event_invitations: boolean;
    newsletter: boolean;
    project_notifications: boolean;
  };
  unsubscribe_token?: string;
  status: 'pending' | 'verified' | 'active' | 'inactive';
  date_created?: string;
  date_updated?: string;
}

interface DirectusSchema {
  community_members: CommunityMember[];
  directus_users: DirectusUser[];
}

// Session storage for user authentication
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default-secret"],
    secure: process.env.NODE_ENV === "production",
  },
});

class DirectusService {
  private client;
  private isAuthenticated = false;
  private authPromise: Promise<boolean> | null = null;
  
  constructor() {
    const directusUrl = process.env.DIRECTUS_URL;
    const directusKey = process.env.DIRECTUS_KEY;
    
    if (!directusUrl || !directusKey) {
      const error = new Error('DIRECTUS_URL and DIRECTUS_KEY must be set in environment variables');
      logger.error('DirectusService initialization failed', {
        service: 'directus',
        method: 'constructor',
        hasDirectusUrl: !!directusUrl,
        hasDirectusKey: !!directusKey
      }, error);
      throw error;
    }
    
    try {
      // Use static token authentication instead of login
      this.client = createDirectus<DirectusSchema>(directusUrl)
        .with(rest())
        .with(staticToken(directusKey));
      
      // Mark as authenticated since we're using a static token
      this.isAuthenticated = true;
      
      logger.info('DirectusService initialized successfully with static token', {
        service: 'directus',
        method: 'constructor',
        directusUrl: directusUrl.replace(/\/\/.*@/, '//***@'), // Hide credentials in logs
        authMethod: 'staticToken'
      });
    } catch (error) {
      logger.error('Failed to create Directus client', {
        service: 'directus',
        method: 'constructor'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  async authenticate(): Promise<boolean> {
    // Prevent concurrent authentication attempts
    if (this.authPromise) {
      return this.authPromise;
    }
    
    if (this.isAuthenticated) {
      return true;
    }

    this.authPromise = this.performAuthentication();
    const result = await this.authPromise;
    this.authPromise = null;
    
    return result;
  }
  
  private async performAuthentication(): Promise<boolean> {
    const context: LogContext = { service: 'directus', method: 'authenticate' };
    
    try {
      const directusKey = process.env.DIRECTUS_KEY;
      
      if (!directusKey) {
        const error = new Error('DIRECTUS_KEY must be set');
        logger.error('Authentication failed - missing static token', context, error);
        return false;
      }
      
      // For static tokens, we test connectivity by making a simple request
      await withErrorLogging(
        () => this.client.request(readUser('me')),
        context,
        'Directus token validation failed'
      );
      
      this.isAuthenticated = true;
      logger.info('Directus static token validation successful', context);
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      
      // Provide more detailed error logging
      let errorMessage = 'Unknown authentication error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Directus error objects better
        if ('errors' in error && Array.isArray(error.errors) && error.errors.length > 0) {
          const firstError = error.errors[0];
          if (firstError && typeof firstError === 'object' && 'message' in firstError) {
            errorMessage = firstError.message as string;
          }
        }
        if (errorMessage === 'Unknown authentication error') {
          errorMessage = JSON.stringify(error);
        }
      } else {
        errorMessage = String(error);
      }
      
      logger.serviceError('directus', 'authenticate', `Authentication failed: ${errorMessage}`, 
        error instanceof Error ? error : new Error(errorMessage), context);
      return false;
    }
  }
  
  // Generate secure tokens
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // User authentication methods
  async authenticateUser(email: string, password: string) {
    try {
      // Create a new client instance for user authentication
      const userClient = createDirectus<DirectusSchema>(process.env.DIRECTUS_URL!)
        .with(rest())
        .with(authentication());

      // Attempt to login with user credentials
      const authResult = await userClient.login(email, password);
      
      if (!authResult.access_token) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Get user details
      const user = await userClient.request(readUser('me'));
      
      return { 
        success: true, 
        user: user,
        token: authResult.access_token 
      };
    } catch (error) {
      console.error('User authentication failed:', error);
      return { success: false, error: 'Invalid email or password' };
    }
  }

  async getSession(request: Request) {
    try {
      const session = await sessionStorage.getSession(request.headers.get("Cookie"));
      const userId = session.get("userId");
      const token = session.get("token");
      
      if (!userId || !token) {
        return null;
      }

      // Verify token is still valid by making a request
      const userClient = createDirectus<DirectusSchema>(process.env.DIRECTUS_URL!)
        .with(rest())
        .with(authentication());
      
      userClient.setToken(token);
      const user = await userClient.request(readUser('me'));
      
      return { user, token };
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  async createSession(user: any, token: string, remember: boolean = false) {
    const session = await sessionStorage.getSession();
    session.set("userId", user.id);
    session.set("token", token);
    
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day
    
    return {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: maxAge,
      }),
    };
  }

  async destroySession(request: Request) {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    return {
      "Set-Cookie": await sessionStorage.destroySession(session),
    };
  }

  // User account management
  async createUserAccount(userData: {
    email: string;
    name?: string;
    experience_level: number;
    project_interest?: string;
    project_details?: string;
    github_username?: string;
    linkedin_url?: string;
    discord_username?: string;
  }) {
    const context: LogContext = { 
      service: 'directus', 
      method: 'createUserAccount',
      email: userData.email.split('@')[0] + '@***'
    };
    
    try {
      logger.serviceCall('directus', 'createUserAccount', 'Starting user account creation', {
        hasName: !!userData.name,
        experienceLevel: userData.experience_level,
        hasProjectInterest: !!userData.project_interest
      });
      
      const authResult = await this.authenticate();
      if (!authResult) {
        const error = new Error('Failed to authenticate with Directus');
        logger.serviceError('directus', 'createUserAccount', 'Authentication failed', error, context);
        return { success: false, error: 'Service authentication failed' };
      }
      
      // Generate secure tokens
      const verificationToken = this.generateToken();
      const unsubscribeToken = this.generateToken();
      
      // Create Directus user account (invited status)
      const fullName = userData.name || 'New Member';
      const [firstName, ...lastNameParts] = fullName.split(' ');
      
      logger.debug('Creating Directus user account', context);
      
      const directusUser = await withErrorLogging(
        () => this.client.request(
        createUser({
          email: userData.email,
            first_name: firstName,
            last_name: lastNameParts.join(' ') || '',
          status: 'invited',
            role: process.env.DIRECTUS_COMMUNITY_ROLE_ID || null,
        })
        ),
        context,
        'Failed to create Directus user'
      );
      
      logger.debug('Creating community member record', { ...context, directusUserId: directusUser.id });
      
      // Create community member record linked to Directus user
      const communityMember = await withErrorLogging(
        () => this.client.request(
        createItem('community_members', {
          directus_user_id: directusUser.id,
          email: userData.email,
          name: userData.name,
          experience_level: userData.experience_level,
          project_interest: userData.project_interest,
          project_details: userData.project_details,
          github_username: userData.github_username,
          linkedin_url: userData.linkedin_url,
          discord_username: userData.discord_username,
          email_verified: false,
          email_verification_token: verificationToken,
          email_verification_sent_at: new Date().toISOString(),
          email_preferences: {
            welcome_emails: true,
            event_invitations: true,
            newsletter: true,
            project_notifications: true,
          },
          unsubscribe_token: unsubscribeToken,
          status: 'pending',
          mattermost_invited: false,
          discord_invited: false,
        })
        ),
        context,
        'Failed to create community member record'
      );
      
      // Invalidate caches for this email
      invalidateEmailCache(userData.email);
      
      logger.info('User account created successfully', {
        ...context,
        directusUserId: directusUser.id,
        communityMemberId: communityMember.id
      });
      
      return { 
        success: true, 
        data: { 
          directusUser, 
          communityMember,
          verificationToken 
        } 
      };
    } catch (error) {
      logger.serviceError('directus', 'createUserAccount', 'Failed to create user account',
        error instanceof Error ? error : new Error(String(error)), context);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create user account' 
      };
    }
  }

  async verifyEmail(token: string) {
    try {
      await this.authenticate();
      
      // Find community member by verification token
      const members = await this.client.request(
        readItems('community_members', {
          filter: { email_verification_token: { _eq: token } },
          limit: 1,
        })
      );
      
      if (members.length === 0) {
        return { success: false, error: 'Invalid verification token' };
      }
      
      const member = members[0];
      
      // Update community member as verified
      const updatedMember = await this.client.request(
        updateItem('community_members', member.id!, {
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          email_verification_token: null,
          status: 'verified',
        })
      );
      
      // Activate Directus user account
      if (member.directus_user_id) {
        await this.client.request(
          updateUser(member.directus_user_id, {
            status: 'active',
          })
        );
      }
      
      return { success: true, data: updatedMember };
    } catch (error) {
      console.error('Error verifying email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      await this.authenticate();
      
      const members = await this.client.request(
        readItems('community_members', {
          filter: { 
            email: { _eq: email },
            email_verified: { _eq: false }
          },
          limit: 1,
        })
      );
      
      if (members.length === 0) {
        return { success: false, error: 'Email not found or already verified' };
      }
      
      const member = members[0];
      const newToken = this.generateToken();
      
      // Update verification token
      await this.client.request(
        updateItem('community_members', member.id!, {
          email_verification_token: newToken,
          email_verification_sent_at: new Date().toISOString(),
        })
      );
      
      return { success: true, data: { verificationToken: newToken } };
    } catch (error) {
      console.error('Error resending verification email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Legacy method - kept for backward compatibility
  async createCommunityMember(memberData: Omit<CommunityMember, 'id' | 'date_created' | 'date_updated'>) {
    try {
      await this.authenticate();
      
      const newMember = await this.client.request(
        createItem('community_members', {
          ...memberData,
          status: 'pending',
          mattermost_invited: false,
          discord_invited: false,
        })
      );
      
      return { success: true, data: newMember };
    } catch (error) {
      console.error('Error creating community member:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  async getCommunityMembers(filters?: any) {
    try {
      await this.authenticate();
      
      const members = await this.client.request(
        readItems('community_members', {
          filter: filters,
          sort: ['-date_created'],
        })
      );
      
      return { success: true, data: members };
    } catch (error) {
      console.error('Error fetching community members:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  async updateCommunityMember(id: string, updates: Partial<CommunityMember>) {
    try {
      const result = await optimizedQuery('updateCommunityMember', async () => {
      await this.authenticate();
      
      const updatedMember = await this.client.request(
        updateItem('community_members', id, updates)
      );
      
        // Invalidate caches for this user
        if (updatedMember.email) {
          invalidateEmailCache(updatedMember.email);
        }
        if (updatedMember.id) {
          invalidateUserCache(updatedMember.id);
        }
        
        return updatedMember;
      });
      
      return { success: true, data: result };
    } catch (error) {
      logger.serviceError('directus', 'updateCommunityMember', 'Error updating community member', 
        error instanceof Error ? error : new Error(String(error)), {
          memberId: id
        });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  async deleteCommunityMember(id: string) {
    try {
      await this.authenticate();
      
      await this.client.request(deleteItem('community_members', id));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting community member:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  async checkEmailExists(email: string) {
    const cacheKey = cacheKeys.userByEmail(email);
    
    try {
      return await withCache(
        directusCache,
        cacheKey,
        async () => {
          return await optimizedQuery('checkEmailExists', async () => {
      await this.authenticate();
      
      const existingMembers = await this.client.request(
        readItems('community_members', {
          filter: { email: { _eq: email } },
          limit: 1,
        })
      );
      
      return existingMembers.length > 0;
          });
        },
        5 * 60 * 1000 // 5 minute cache
      );
    } catch (error) {
      logger.serviceError('directus', 'checkEmailExists', 'Error checking email', 
        error instanceof Error ? error : new Error(String(error)), {
          email: email.split('@')[0] + '@***'
        });
      return false;
    }
  }
  
  async updateEmailPreferences(email: string, preferences: Partial<CommunityMember['email_preferences']>) {
    try {
      await this.authenticate();
      
      const members = await this.client.request(
        readItems('community_members', {
          filter: { email: { _eq: email } },
          limit: 1,
        })
      );
      
      if (members.length === 0) {
        return { success: false, error: 'Member not found' };
      }
      
      const member = members[0];
      const updatedPreferences = { ...member.email_preferences, ...preferences };
      
      const updatedMember = await this.client.request(
        updateItem('community_members', member.id!, {
          email_preferences: updatedPreferences,
        })
      );
      
      return { success: true, data: updatedMember };
    } catch (error) {
      console.error('Error updating email preferences:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async unsubscribeFromEmails(token: string) {
    try {
      await this.authenticate();
      
      const members = await this.client.request(
        readItems('community_members', {
          filter: { unsubscribe_token: { _eq: token } },
          limit: 1,
        })
      );
      
      if (members.length === 0) {
        return { success: false, error: 'Invalid unsubscribe token' };
      }
      
      const member = members[0];
      
      // Unsubscribe from all email types except verification emails
      const updatedMember = await this.client.request(
        updateItem('community_members', member.id!, {
          email_preferences: {
            welcome_emails: false,
            event_invitations: false,
            newsletter: false,
            project_notifications: false,
          },
        })
      );
      
      return { success: true, data: updatedMember };
    } catch (error) {
      console.error('Error unsubscribing from emails:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMemberByEmail(email: string) {
    const cacheKey = `member:${cacheKeys.userByEmail(email)}`;
    
    try {
      return await withCache(
        directusCache,
        cacheKey,
        async () => {
          return await optimizedQuery('getMemberByEmail', async () => {
      await this.authenticate();
      
      const members = await this.client.request(
        readItems('community_members', {
          filter: { email: { _eq: email } },
          limit: 1,
        })
      );
      
      if (members.length === 0) {
        return { success: false, error: 'Member not found' };
      }
      
      return { success: true, data: members[0] };
          });
        },
        10 * 60 * 1000 // 10 minute cache
      );
    } catch (error) {
      logger.serviceError('directus', 'getMemberByEmail', 'Error getting member by email', 
        error instanceof Error ? error : new Error(String(error)), {
          email: email.split('@')[0] + '@***'
        });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getStats() {
    try {
      await this.authenticate();
      
      const allMembers = await this.client.request(readItems('community_members'));
      
      const stats = {
        total: allMembers.length,
        verified: allMembers.filter(m => m.email_verified).length,
        active: allMembers.filter(m => m.status === 'active').length,
        pending: allMembers.filter(m => m.status === 'pending').length,
        experienceLevels: {
          beginner: allMembers.filter(m => m.experience_level <= 25).length,
          intermediate: allMembers.filter(m => m.experience_level > 25 && m.experience_level <= 75).length,
          advanced: allMembers.filter(m => m.experience_level > 75).length,
        },
        projectInterests: allMembers.reduce((acc, member) => {
          if (member.project_interest) {
            acc[member.project_interest] = (acc[member.project_interest] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        emailPreferences: {
          welcomeEmails: allMembers.filter(m => m.email_preferences?.welcome_emails).length,
          eventInvitations: allMembers.filter(m => m.email_preferences?.event_invitations).length,
          newsletter: allMembers.filter(m => m.email_preferences?.newsletter).length,
          projectNotifications: allMembers.filter(m => m.email_preferences?.project_notifications).length,
        },
      };
      
      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const directusService = new DirectusService();
export type { CommunityMember }; 