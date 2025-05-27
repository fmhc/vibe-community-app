import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard (may redirect to login if not authenticated)
      await page.goto('/dashboard');
    });

    test('should display dashboard or redirect to login', async ({ page }) => {
      // Wait for page to load and potential redirects
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      
      if (currentUrl.includes('/login')) {
        // If redirected to login, that's expected behavior
        await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
      } else {
        // If on dashboard, check for dashboard elements
        await expect(page).toHaveTitle(/Dashboard.*Vibe Coding Hamburg/i);
        await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
      }
    });

    test('should display user profile section when authenticated', async ({ page }) => {
      // Skip if redirected to login
      if (page.url().includes('/login')) {
        test.skip();
      }
      
      // Look for profile/user information
      const profileSection = page.locator('[data-testid="user-profile"], .profile-section, .user-info');
      await expect(profileSection).toBeVisible();
    });

    test('should display community stats', async ({ page }) => {
      // Skip if redirected to login
      if (page.url().includes('/login')) {
        test.skip();
      }
      
      // Look for community statistics
      const statsSection = page.locator('[data-testid="community-stats"], .stats-section, .community-overview');
      await expect(statsSection).toBeVisible();
    });

    test('should display upcoming events section', async ({ page }) => {
      // Skip if redirected to login
      if (page.url().includes('/login')) {
        test.skip();
      }
      
      // Look for events section
      const eventsSection = page.locator('[data-testid="upcoming-events"], .events-section');
      const eventsHeading = page.getByRole('heading', { name: /events|upcoming/i });
      
      await expect(eventsSection.or(eventsHeading)).toBeVisible();
    });

    test('should display GitHub integration section', async ({ page }) => {
      // Skip if redirected to login
      if (page.url().includes('/login')) {
        test.skip();
      }
      
      // Look for GitHub integration
      const githubSection = page.locator('[data-testid="github-integration"], .github-section');
      const githubHeading = page.getByRole('heading', { name: /github/i });
      const githubButton = page.getByRole('button', { name: /github/i });
      
      // Should have some GitHub-related element
      const hasGithubElement = await githubSection.isVisible() || 
                              await githubHeading.isVisible() || 
                              await githubButton.isVisible();
      
      expect(hasGithubElement).toBeTruthy();
    });
  });

  test.describe('Events Section', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/events');
    });

    test('should display events page', async ({ page }) => {
      // Check page loads
      await expect(page).toHaveTitle(/Events.*Vibe Coding Hamburg/i);
      await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
    });

    test('should display event list or empty state', async ({ page }) => {
      // Look for events list or empty state message
      const eventsList = page.locator('[data-testid="events-list"], .events-list, .event-item');
      const emptyState = page.getByText(/no.*events|coming.*soon|events.*available/i);
      
      const hasEvents = await eventsList.isVisible();
      const hasEmptyState = await emptyState.isVisible();
      
      expect(hasEvents || hasEmptyState).toBeTruthy();
    });

    test('should allow filtering events if available', async ({ page }) => {
      // Look for filter controls
      const filterSection = page.locator('[data-testid="event-filters"], .filters, .event-filter');
      
      if (await filterSection.isVisible()) {
        // Test that filters exist and are interactive
        const filterInputs = filterSection.locator('input, select, button');
        const filterCount = await filterInputs.count();
        
        expect(filterCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Admin Section', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin');
    });

    test('should handle admin access appropriately', async ({ page }) => {
      // Wait for potential redirects
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      
      if (currentUrl.includes('/login')) {
        // Redirected to login - expected for non-authenticated users
        await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
      } else if (currentUrl.includes('/admin')) {
        // On admin page - check for admin elements
        await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
      } else {
        // Redirected elsewhere or access denied - that's also valid
        const accessDenied = page.getByText(/access.*denied|unauthorized|permission/i);
        await expect(accessDenied).toBeVisible();
      }
    });

    test('should display admin navigation if accessible', async ({ page }) => {
      // Skip if redirected away from admin
      if (!page.url().includes('/admin')) {
        test.skip();
      }
      
      // Look for admin navigation
      const adminNav = page.locator('[data-testid="admin-nav"], .admin-navigation, .admin-menu');
      await expect(adminNav).toBeVisible();
    });
  });

  test.describe('User Settings', () => {
    test('should access email preferences', async ({ page }) => {
      await page.goto('/email-preferences');
      
      // Wait for potential redirects
      await page.waitForTimeout(2000);
      
      if (page.url().includes('/login')) {
        // Not authenticated - expected
        test.skip();
      } else {
        // Should show email preferences
        await expect(page.getByRole('heading', { name: /preferences|settings/i })).toBeVisible();
        
        // Look for preference controls
        const preferenceControls = page.locator('input[type="checkbox"], input[type="radio"], select');
        const controlCount = await preferenceControls.count();
        
        expect(controlCount).toBeGreaterThan(0);
      }
    });

    test('should handle unsubscribe functionality', async ({ page }) => {
      // Test unsubscribe page (should be accessible without login)
      await page.goto('/unsubscribe');
      
      // Should display unsubscribe form or confirmation
      await expect(page.getByRole('heading', { name: /unsubscribe/i })).toBeVisible();
      
      // Look for unsubscribe form or confirmation message
      const unsubscribeForm = page.locator('form');
      const confirmationMessage = page.getByText(/unsubscribed|removed|preferences.*updated/i);
      
      const hasForm = await unsubscribeForm.isVisible();
      const hasConfirmation = await confirmationMessage.isVisible();
      
      expect(hasForm || hasConfirmation).toBeTruthy();
    });
  });

  test.describe('Privacy and Legal', () => {
    test('should display privacy policy', async ({ page }) => {
      await page.goto('/privacy');
      
      // Check privacy policy page
      await expect(page).toHaveTitle(/Privacy.*Vibe Coding Hamburg/i);
      await expect(page.getByRole('heading', { name: /privacy.*policy/i })).toBeVisible();
      
      // Should have substantial content
      const content = page.locator('main, .content, .privacy-content');
      const textContent = await content.textContent();
      
      expect(textContent?.length || 0).toBeGreaterThan(500);
    });

    test('should display GDPR tools', async ({ page }) => {
      await page.goto('/gdpr-tools');
      
      // Check GDPR tools page
      await expect(page.getByRole('heading', { name: /gdpr|data.*protection/i })).toBeVisible();
      
      // Should have GDPR-related controls
      const gdprControls = page.getByText(/download.*data|delete.*account|data.*request/i);
      await expect(gdprControls).toBeVisible();
    });
  });
}); 