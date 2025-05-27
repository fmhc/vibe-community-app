# Test info

- Name: Homepage >> should load the homepage successfully
- Location: /home/fmh/ai/vibe-coding-hamburg/vibe-coding-hamburg/vibe-community-app/e2e/homepage.spec.ts:9:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

    at /home/fmh/ai/vibe-coding-hamburg/vibe-coding-hamburg/vibe-community-app/e2e/homepage.spec.ts:6:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Homepage', () => {
   4 |   test.beforeEach(async ({ page }) => {
   5 |     // Navigate to the homepage before each test
>  6 |     await page.goto('/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
   7 |   });
   8 |
   9 |   test('should load the homepage successfully', async ({ page }) => {
   10 |     // Check that the page loaded
   11 |     await expect(page).toHaveTitle(/Vibe Coding Hamburg/i);
   12 |     
   13 |     // Check for main navigation elements
   14 |     await expect(page.getByRole('navigation')).toBeVisible();
   15 |     
   16 |     // Check for main content
   17 |     await expect(page.getByRole('main')).toBeVisible();
   18 |   });
   19 |
   20 |   test('should display language switcher', async ({ page }) => {
   21 |     // Look for language switcher component
   22 |     const languageSwitcher = page.locator('[data-testid="language-switcher"]');
   23 |     await expect(languageSwitcher).toBeVisible();
   24 |   });
   25 |
   26 |   test('should display main navigation links', async ({ page }) => {
   27 |     // Check for common navigation links
   28 |     const nav = page.getByRole('navigation');
   29 |     await expect(nav).toBeVisible();
   30 |     
   31 |     // Test navigation items that should be present
   32 |     const expectedNavItems = ['Events', 'Dashboard', 'Community'];
   33 |     
   34 |     for (const item of expectedNavItems) {
   35 |       // Look for navigation items (case-insensitive)
   36 |       const navLink = page.getByRole('link', { name: new RegExp(item, 'i') });
   37 |       await expect(navLink).toBeVisible();
   38 |     }
   39 |   });
   40 |
   41 |   test('should have responsive design', async ({ page }) => {
   42 |     // Test desktop view
   43 |     await page.setViewportSize({ width: 1280, height: 720 });
   44 |     await expect(page.getByRole('main')).toBeVisible();
   45 |     
   46 |     // Test tablet view
   47 |     await page.setViewportSize({ width: 768, height: 1024 });
   48 |     await expect(page.getByRole('main')).toBeVisible();
   49 |     
   50 |     // Test mobile view
   51 |     await page.setViewportSize({ width: 375, height: 667 });
   52 |     await expect(page.getByRole('main')).toBeVisible();
   53 |   });
   54 |
   55 |   test('should handle language switching', async ({ page }) => {
   56 |     // Find language switcher
   57 |     const languageSwitcher = page.locator('[data-testid="language-switcher"]');
   58 |     
   59 |     if (await languageSwitcher.isVisible()) {
   60 |       // Get current language
   61 |       const currentLang = await page.locator('html').getAttribute('lang');
   62 |       
   63 |       // Click language switcher to change language
   64 |       await languageSwitcher.click();
   65 |       
   66 |       // Wait for language change (URL or content change)
   67 |       await page.waitForTimeout(1000);
   68 |       
   69 |       // Verify language changed
   70 |       const newLang = await page.locator('html').getAttribute('lang');
   71 |       expect(newLang).not.toBe(currentLang);
   72 |     }
   73 |   });
   74 |
   75 |   test('should load without JavaScript errors', async ({ page }) => {
   76 |     const errors: string[] = [];
   77 |     
   78 |     // Listen for console errors
   79 |     page.on('console', msg => {
   80 |       if (msg.type() === 'error') {
   81 |         errors.push(msg.text());
   82 |       }
   83 |     });
   84 |     
   85 |     // Listen for page errors
   86 |     page.on('pageerror', error => {
   87 |       errors.push(error.message);
   88 |     });
   89 |     
   90 |     // Navigate and wait for page to load
   91 |     await page.goto('/');
   92 |     await page.waitForLoadState('networkidle');
   93 |     
   94 |     // Check that there are no critical JavaScript errors
   95 |     const criticalErrors = errors.filter(error => 
   96 |       !error.includes('favicon') && // Ignore favicon errors
   97 |       !error.includes('404') && // Ignore 404 errors for non-critical resources
   98 |       !error.includes('Failed to load resource') // Ignore resource loading errors
   99 |     );
  100 |     
  101 |     expect(criticalErrors).toHaveLength(0);
  102 |   });
  103 | }); 
```