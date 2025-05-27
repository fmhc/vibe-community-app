import { createDirectus, rest, authentication, readItems, createItem, updateItem, deleteItem, createUser, readUsers, updateUser } from '@directus/sdk';
import { randomBytes } from 'crypto';

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

class DirectusService {
  private client;
  
  constructor() {
    const directusUrl = process.env.DIRECTUS_URL;
    const directusKey = process.env.DIRECTUS_KEY;
    
    if (!directusUrl || !directusKey) {
      throw new Error('DIRECTUS_URL and DIRECTUS_KEY must be set in environment variables');
    }
    
    this.client = createDirectus<DirectusSchema>(directusUrl)
      .with(rest())
      .with(authentication());
  }
  
  async authenticate() {
    try {
      await this.client.login(process.env.DIRECTUS_KEY!, process.env.DIRECTUS_SECRET!);
      return true;
    } catch (error) {
      console.error('Directus authentication failed:', error);
      return false;
    }
  }
  
  // Generate secure tokens
  private generateToken(): string {
    return randomBytes(32).toString('hex');
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
    try {
      await this.authenticate();
      
      // Generate verification token
      const verificationToken = this.generateToken();
      const unsubscribeToken = this.generateToken();
      
      // Create Directus user account (invited status)
      const fullName = userData.name || 'New Member';
      const directusUser = await this.client.request(
        createUser({
          email: userData.email,
          first_name: fullName.split(' ')[0],
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          status: 'invited',
          role: process.env.DIRECTUS_COMMUNITY_ROLE_ID || null, // Set community member role
        })
      );
      
      // Create community member record linked to Directus user
      const communityMember = await this.client.request(
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
      );
      
      return { 
        success: true, 
        data: { 
          directusUser, 
          communityMember,
          verificationToken 
        } 
      };
    } catch (error) {
      console.error('Error creating user account:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      await this.authenticate();
      
      const updatedMember = await this.client.request(
        updateItem('community_members', id, updates)
      );
      
      return { success: true, data: updatedMember };
    } catch (error) {
      console.error('Error updating community member:', error);
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
    try {
      await this.authenticate();
      
      const existingMembers = await this.client.request(
        readItems('community_members', {
          filter: { email: { _eq: email } },
          limit: 1,
        })
      );
      
      return existingMembers.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
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
      
      return { success: true, data: members[0] };
    } catch (error) {
      console.error('Error getting member by email:', error);
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