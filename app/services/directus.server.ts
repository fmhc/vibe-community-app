import { createDirectus, rest, authentication, readItems, createItem, updateItem, deleteItem } from '@directus/sdk';

// Define the schema for our community members
interface CommunityMember {
  id?: string;
  email: string;
  name?: string;
  experience_level: number;
  project_interest: string;
  project_details?: string;
  skills?: string[];
  ai_tools_experience?: string[];
  github_username?: string;
  linkedin_url?: string;
  discord_username?: string;
  mattermost_invited?: boolean;
  discord_invited?: boolean;
  status: 'pending' | 'active' | 'inactive';
  date_created?: string;
  date_updated?: string;
}

interface DirectusSchema {
  community_members: CommunityMember[];
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
  
  async getStats() {
    try {
      await this.authenticate();
      
      const allMembers = await this.client.request(readItems('community_members'));
      
      const stats = {
        total: allMembers.length,
        active: allMembers.filter(m => m.status === 'active').length,
        pending: allMembers.filter(m => m.status === 'pending').length,
        experienceLevels: {
          beginner: allMembers.filter(m => m.experience_level <= 25).length,
          intermediate: allMembers.filter(m => m.experience_level > 25 && m.experience_level <= 75).length,
          advanced: allMembers.filter(m => m.experience_level > 75).length,
        },
        projectInterests: allMembers.reduce((acc, member) => {
          acc[member.project_interest] = (acc[member.project_interest] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
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