import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { githubService } from '~/services/github.server';
import { directusService } from '~/services/directus.server';
import { logger } from '~/lib/logger.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    logger.warn('GitHub OAuth error', {
      service: 'auth',
      method: 'github_callback',
      error,
      description: url.searchParams.get('error_description')
    });
    
    return redirect('/dashboard?error=github_auth_failed');
  }

  // Validate required parameters
  if (!code) {
    logger.warn('GitHub OAuth callback missing code parameter', {
      service: 'auth',
      method: 'github_callback'
    });
    
    return redirect('/dashboard?error=github_auth_invalid');
  }

  try {
    // Get current user session
    const session = await directusService.getSession(request);
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.warn('GitHub OAuth callback without authenticated user', {
        service: 'auth',
        method: 'github_callback'
      });
      
      return redirect('/login?error=authentication_required');
    }

    // Exchange code for access token
    const accessToken = await githubService.exchangeCodeForToken(code);
    
    if (!accessToken) {
      logger.error('Failed to exchange GitHub code for token', {
        service: 'auth',
        method: 'github_callback',
        userId
      });
      
      return redirect('/dashboard?error=github_token_failed');
    }

    // Get GitHub user profile
    const githubProfile = await githubService.getUserProfile(accessToken);
    
    if (!githubProfile) {
      logger.error('Failed to fetch GitHub user profile', {
        service: 'auth',
        method: 'github_callback',
        userId
      });
      
      return redirect('/dashboard?error=github_profile_failed');
    }

    // Find the community member record for this user
    const userEmail = session.user.email;
    if (!userEmail) {
      logger.error('User email not found in session', {
        service: 'auth',
        method: 'github_callback',
        userId
      });
      
      return redirect('/dashboard?error=email_not_found');
    }

    const memberResult = await directusService.getMemberByEmail(userEmail);
    
    if (!memberResult.success || !memberResult.data) {
      logger.error('Failed to find community member for GitHub connection', {
        service: 'auth',
        method: 'github_callback',
        userId,
        email: userEmail
      });
      
      return redirect('/dashboard?error=member_not_found');
    }

    // Update community member with GitHub information
    const updateData = {
      github_username: githubProfile.user.login,
      // Store additional GitHub data in a JSON field or extend the schema
      skills: githubProfile.primaryLanguages,
      experience_level: githubProfile.skillLevel === 'expert' ? 90 : 
                       githubProfile.skillLevel === 'advanced' ? 75 :
                       githubProfile.skillLevel === 'intermediate' ? 50 : 25
    };

    // Update community member in Directus
    const updateResult = await directusService.updateCommunityMember(memberResult.data.id!, updateData);
    
    if (!updateResult.success) {
      logger.error('Failed to update community member with GitHub profile', {
        service: 'auth',
        method: 'github_callback',
        userId,
        githubUsername: githubProfile.user.login,
        error: updateResult.error
      });
      
      return redirect('/dashboard?error=profile_update_failed');
    }

    logger.info('GitHub profile successfully connected', {
      service: 'auth',
      method: 'github_callback',
      userId,
      githubUsername: githubProfile.user.login,
      skillLevel: githubProfile.skillLevel,
      repoCount: githubProfile.repositories.length,
      contributionScore: githubProfile.contributionScore
    });

    return redirect('/dashboard?success=github_connected');

  } catch (error) {
    logger.error('GitHub OAuth callback error', {
      service: 'auth',
      method: 'github_callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return redirect('/dashboard?error=github_connection_failed');
  }
} 