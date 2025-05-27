import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    // Check that the page loaded
    await expect(page).toHaveTitle(/Vibe Coding Hamburg/i);
    
    // Check for main navigation elements
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check for main content
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should display language switcher', async ({ page }) => {
    // Look for language switcher component
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    await expect(languageSwitcher).toBeVisible();
  });

  test('should display main navigation links', async ({ page }) => {
    // Check for common navigation links
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Test navigation items that should be present
    const expectedNavItems = ['Events', 'Dashboard', 'Community'];
    
    for (const item of expectedNavItems) {
      // Look for navigation items (case-insensitive)
      const navLink = page.getByRole('link', { name: new RegExp(item, 'i') });
      await expect(navLink).toBeVisible();
    }
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole('main')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('main')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should handle language switching', async ({ page }) => {
    // Find language switcher
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    
    if (await languageSwitcher.isVisible()) {
      // Get current language
      const currentLang = await page.locator('html').getAttribute('lang');
      
      // Click language switcher to change language
      await languageSwitcher.click();
      
      // Wait for language change (URL or content change)
      await page.waitForTimeout(1000);
      
      // Verify language changed
      const newLang = await page.locator('html').getAttribute('lang');
      expect(newLang).not.toBe(currentLang);
    }
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate and wait for page to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that there are no critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('404') && // Ignore 404 errors for non-critical resources
      !error.includes('Failed to load resource') // Ignore resource loading errors
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
}); 