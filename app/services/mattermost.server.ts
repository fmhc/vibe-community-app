import { logger } from '~/lib/logger.server';

interface MattermostConfig {
  baseUrl: string;
  botToken: string;
  teamId: string;
  defaultChannelId: string;
  adminUserId: string;
}

interface MattermostUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  create_at: number;
  delete_at: number;
}

interface MattermostInviteResult {
  success: boolean;
  userId?: string;
  inviteUrl?: string;
  error?: string;
}

interface MattermostChannelInfo {
  id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P' | 'D'; // Open, Private, Direct
  purpose: string;
  header: string;
}

class MattermostService {
  private config: MattermostConfig;
  private baseHeaders: HeadersInit;

  constructor() {
    this.config = {
      baseUrl: process.env.MATTERMOST_URL || '',
      botToken: process.env.MATTERMOST_BOT_TOKEN || '',
      teamId: process.env.MATTERMOST_TEAM_ID || '',
      defaultChannelId: process.env.MATTERMOST_DEFAULT_CHANNEL_ID || '',
      adminUserId: process.env.MATTERMOST_ADMIN_USER_ID || ''
    };

    this.baseHeaders = {
      'Authorization': `Bearer ${this.config.botToken}`,
      'Content-Type': 'application/json',
    };

    if (!this.config.baseUrl || !this.config.botToken) {
      logger.warn('Mattermost configuration incomplete', {
        service: 'mattermost',
        hasUrl: !!this.config.baseUrl,
        hasToken: !!this.config.botToken
      });
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}/api/v4${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.baseHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mattermost API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.serviceError('mattermost', 'makeRequest', `API request failed: ${endpoint}`, error as Error, {
        endpoint,
        status: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
  }

  // Check if Mattermost is configured and accessible
  async checkConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/users/me');
      logger.serviceCall('mattermost', 'checkConnection', 'Connection successful');
      return true;
    } catch (error) {
      logger.serviceError('mattermost', 'checkConnection', 'Connection failed', error as Error);
      return false;
    }
  }

  // Find user by email
  async findUserByEmail(email: string): Promise<MattermostUser | null> {
    try {
      const response = await this.makeRequest(`/users/email/${encodeURIComponent(email)}`);
      logger.serviceCall('mattermost', 'findUserByEmail', 'User found', { email: email.toLowerCase() });
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        logger.serviceCall('mattermost', 'findUserByEmail', 'User not found', { email: email.toLowerCase() });
        return null;
      }
      logger.serviceError('mattermost', 'findUserByEmail', 'Failed to find user', error as Error, { email: email.toLowerCase() });
      throw error;
    }
  }

  // Create a guest invitation
  async createGuestInvitation(
    email: string,
    firstName: string = '',
    lastName: string = '',
    channelIds: string[] = []
  ): Promise<MattermostInviteResult> {
    try {
      const channels = channelIds.length > 0 ? channelIds : [this.config.defaultChannelId];
      
      const inviteData = {
        emails: [email],
        channels: channels,
        message: `Welcome to the Vibe Coding Hamburg community! 🚀\n\nWe're excited to have you join our developer community. Feel free to introduce yourself and let us know what projects you're working on.\n\nBest regards,\nVibe Coding Hamburg Team`
      };

      const response = await this.makeRequest('/teams/' + this.config.teamId + '/invite-guests/email', {
        method: 'POST',
        body: JSON.stringify(inviteData),
      });

      logger.serviceCall('mattermost', 'createGuestInvitation', 'Guest invitation created', {
        email: email.toLowerCase(),
        channels: channels.length
      });

      return {
        success: true,
        inviteUrl: response.invite_url || undefined
      };
    } catch (error) {
      logger.serviceError('mattermost', 'createGuestInvitation', 'Failed to create guest invitation', error as Error, {
        email: email.toLowerCase()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a full team member invitation
  async createMemberInvitation(
    email: string,
    firstName: string = '',
    lastName: string = ''
  ): Promise<MattermostInviteResult> {
    try {
      const inviteData = {
        emails: [email],
        message: `Welcome to Vibe Coding Hamburg! 🎉\n\nYou've been invited to join our developer community as a full member. This gives you access to all our channels and community features.\n\nWe're looking forward to collaborating with you!\n\nBest regards,\nVibe Coding Hamburg Team`
      };

      const response = await this.makeRequest('/teams/' + this.config.teamId + '/invite/email', {
        method: 'POST',
        body: JSON.stringify(inviteData),
      });

      logger.serviceCall('mattermost', 'createMemberInvitation', 'Member invitation created', {
        email: email.toLowerCase()
      });

      return {
        success: true,
        inviteUrl: response.invite_url || undefined
      };
    } catch (error) {
      logger.serviceError('mattermost', 'createMemberInvitation', 'Failed to create member invitation', error as Error, {
        email: email.toLowerCase()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get team channels
  async getTeamChannels(): Promise<MattermostChannelInfo[]> {
    try {
      const response = await this.makeRequest(`/teams/${this.config.teamId}/channels`);
      logger.serviceCall('mattermost', 'getTeamChannels', `Retrieved ${response.length} channels`);
      return response;
    } catch (error) {
      logger.serviceError('mattermost', 'getTeamChannels', 'Failed to get team channels', error as Error);
      throw error;
    }
  }

  // Create a project-specific channel
  async createProjectChannel(
    name: string,
    displayName: string,
    purpose: string = '',
    isPrivate: boolean = false
  ): Promise<MattermostChannelInfo | null> {
    try {
      const channelData = {
        team_id: this.config.teamId,
        name: name.toLowerCase().replace(/[^a-z0-9\-_]/g, ''),
        display_name: displayName,
        purpose: purpose,
        type: isPrivate ? 'P' : 'O'
      };

      const response = await this.makeRequest('/channels', {
        method: 'POST',
        body: JSON.stringify(channelData),
      });

      logger.serviceCall('mattermost', 'createProjectChannel', 'Project channel created', {
        name: channelData.name,
        displayName,
        isPrivate
      });

      return response;
    } catch (error) {
      logger.serviceError('mattermost', 'createProjectChannel', 'Failed to create project channel', error as Error, {
        name,
        displayName
      });
      return null;
    }
  }

  // Add user to channel
  async addUserToChannel(userId: string, channelId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/channels/${channelId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });

      logger.serviceCall('mattermost', 'addUserToChannel', 'User added to channel', {
        userId,
        channelId
      });

      return true;
    } catch (error) {
      logger.serviceError('mattermost', 'addUserToChannel', 'Failed to add user to channel', error as Error, {
        userId,
        channelId
      });
      return false;
    }
  }

  // Send welcome message to user
  async sendWelcomeMessage(userId: string, userName: string = ''): Promise<boolean> {
    try {
      // Create direct message channel with the user
      const dmChannel = await this.makeRequest('/channels/direct', {
        method: 'POST',
        body: JSON.stringify([this.config.adminUserId, userId]),
      });

      const welcomeMessage = `👋 Welcome to Vibe Coding Hamburg, ${userName || 'there'}!

We're thrilled to have you join our community of passionate developers! Here's how to get started:

🚀 **Getting Started:**
• Introduce yourself in the #general channel
• Check out #projects to see what the community is working on
• Join channels that match your interests

💡 **Community Guidelines:**
• Be respectful and inclusive
• Share knowledge and help others
• Feel free to ask questions - we're here to help!

🔗 **Useful Links:**
• Website: https://vibe-coding.hamburg
• GitHub: https://github.com/vibe-coding-hamburg
• Events: Check #events for upcoming meetups

If you have any questions, feel free to reach out to any of the moderators. Happy coding! 🎉

Best regards,
The Vibe Coding Hamburg Team`;

      await this.makeRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          channel_id: dmChannel.id,
          message: welcomeMessage,
        }),
      });

      logger.serviceCall('mattermost', 'sendWelcomeMessage', 'Welcome message sent', {
        userId,
        userName
      });

      return true;
    } catch (error) {
      logger.serviceError('mattermost', 'sendWelcomeMessage', 'Failed to send welcome message', error as Error, {
        userId,
        userName
      });
      return false;
    }
  }

  // Process new community signup
  async processNewSignup(userData: {
    email: string;
    name?: string;
    experienceLevel: number;
    projectInterest?: string;
    githubUsername?: string;
  }): Promise<{ success: boolean; inviteUrl?: string; channelId?: string; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        logger.serviceCall('mattermost', 'processNewSignup', 'User already exists in Mattermost', {
          email: userData.email.toLowerCase()
        });
        return { success: true };
      }

      // Determine invitation type based on experience level and engagement
      const isExperienced = userData.experienceLevel > 70;
      const hasGitHub = !!userData.githubUsername;
      const isActiveContributor = isExperienced && hasGitHub;

      // Get relevant channels for the user
      const channels = await this.getTeamChannels();
      const relevantChannels = this.getRelevantChannels(channels, userData);

      let result;
      
      if (isActiveContributor) {
        // Full member invitation for experienced contributors
        result = await this.createMemberInvitation(
          userData.email,
          userData.name?.split(' ')[0] || '',
          userData.name?.split(' ').slice(1).join(' ') || ''
        );
      } else {
        // Guest invitation for newcomers
        result = await this.createGuestInvitation(
          userData.email,
          userData.name?.split(' ')[0] || '',
          userData.name?.split(' ').slice(1).join(' ') || '',
          relevantChannels.map(c => c.id)
        );
      }

      if (result.success) {
        logger.serviceCall('mattermost', 'processNewSignup', 'Signup processed successfully', {
          email: userData.email.toLowerCase(),
          invitationType: isActiveContributor ? 'member' : 'guest',
          channelCount: relevantChannels.length
        });

        return {
          success: true,
          inviteUrl: result.inviteUrl,
          channelId: relevantChannels[0]?.id
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      logger.serviceError('mattermost', 'processNewSignup', 'Failed to process signup', error as Error, {
        email: userData.email.toLowerCase()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper: Get channels relevant to user's interests
  private getRelevantChannels(
    channels: MattermostChannelInfo[],
    userData: { projectInterest?: string; experienceLevel: number }
  ): MattermostChannelInfo[] {
    const relevant = channels.filter(channel => {
      // Always include general channels
      if (['general', 'welcome', 'announcements'].includes(channel.name.toLowerCase())) {
        return true;
      }

      // Include beginner channels for less experienced users
      if (userData.experienceLevel < 50 && 
          ['beginners', 'learning', 'help', 'questions'].some(keyword => 
            channel.name.toLowerCase().includes(keyword)
          )) {
        return true;
      }

      // Include project-specific channels based on interests
      if (userData.projectInterest) {
        const interest = userData.projectInterest.toLowerCase();
        if (interest.includes('ai') && channel.name.toLowerCase().includes('ai')) return true;
        if (interest.includes('web') && channel.name.toLowerCase().includes('web')) return true;
        if (interest.includes('mobile') && channel.name.toLowerCase().includes('mobile')) return true;
        if (interest.includes('game') && channel.name.toLowerCase().includes('game')) return true;
      }

      return false;
    });

    // Ensure we always have at least the default channel
    if (relevant.length === 0) {
      const defaultChannel = channels.find(c => c.id === this.config.defaultChannelId);
      if (defaultChannel) {
        relevant.push(defaultChannel);
      }
    }

    return relevant.slice(0, 5); // Limit to 5 channels to avoid overwhelming new users
  }
}

export const mattermostService = new MattermostService();
export type { MattermostInviteResult, MattermostChannelInfo, MattermostUser }; 