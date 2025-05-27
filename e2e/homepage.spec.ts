import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    // Check that the page loaded with the correct title
    await expect(page).toHaveTitle(/Vibe Coding Hamburg/i);
    
    // Check for main header content (h1 might contain i18n key initially)
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Check for main content areas
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display language switcher', async ({ page }) => {
    // Look for language switcher component
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    
    // The component should be visible (it's in the top-right)
    await expect(languageSwitcher).toBeVisible();
    
    // Check for the select element within the switcher
    const languageSelect = languageSwitcher.locator('select');
    await expect(languageSelect).toBeVisible();
  });

  test('should display main heading and content', async ({ page }) => {
    // Check for main heading
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    
    // Check for subtitle/description content
    const description = page.locator('p').first();
    await expect(description).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle language switching', async ({ page }) => {
    // Find language switcher
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    
    if (await languageSwitcher.isVisible()) {
      // Find the select element and check its options
      const languageSelect = languageSwitcher.locator('select');
      await expect(languageSelect).toBeVisible();
      
      // Check that options exist
      const options = languageSelect.locator('option');
      await expect(options).toHaveCount(2); // English and German
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
      !error.includes('Failed to load resource') && // Ignore resource loading errors
      !error.includes('net::ERR_NETWORK_CHANGED') && // Ignore network errors
      !error.includes('X-Frame-Options may only be set via an HTTP header') // Ignore meta tag warnings
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should display signup form', async ({ page }) => {
    // Check for the community signup form specifically (not the language form)
    const signupForm = page.locator('form[action*="index"]');
    await expect(signupForm).toBeVisible();
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
}); 