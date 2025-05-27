import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { githubService } from '~/services/github.server';
import { directusService } from '~/services/directus.server';
import { logger } from '~/lib/logger.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Check if user is authenticated
    const session = await directusService.getSession(request);
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.warn('GitHub OAuth initiation without authenticated user', {
        service: 'auth',
        method: 'github_initiate'
      });
      
      return redirect('/login?error=authentication_required');
    }

    // Check if GitHub integration is configured
    if (!githubService.isConfigured()) {
      logger.error('GitHub OAuth not configured', {
        service: 'auth',
        method: 'github_initiate',
        userId
      });
      
      return redirect('/dashboard?error=github_not_configured');
    }

    // Generate state parameter for security
    const state = crypto.randomUUID();
    
    // Get GitHub authorization URL
    const authUrl = githubService.getAuthorizationUrl(state);
    
    logger.info('GitHub OAuth flow initiated', {
      service: 'auth',
      method: 'github_initiate',
      userId,
      state
    });

    // Redirect to GitHub for authorization
    return redirect(authUrl);

  } catch (error) {
    logger.error('GitHub OAuth initiation error', {
      service: 'auth',
      method: 'github_initiate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return redirect('/dashboard?error=github_initiation_failed');
  }
} 