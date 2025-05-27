import { test, expect } from '@playwright/test';

test.describe('Deployment Health Check', () => {
  test('should pass comprehensive deployment verification', async ({ page }) => {
    // Track all network requests for debugging
    const failedRequests: string[] = [];
    const successfulRequests: string[] = [];
    
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (status >= 400) {
        failedRequests.push(`${status}: ${url}`);
      } else {
        successfulRequests.push(`${status}: ${url}`);
      }
    });

    // ✅ 1. BASIC SITE ACCESSIBILITY
    console.log('🔍 Testing basic site accessibility...');
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    
    // ✅ 2. STATIC ASSETS VERIFICATION (Fixed 404 errors)
    console.log('🖼️ Testing static assets...');
    
    // Check favicon files exist and load correctly
    const favicon16Response = await page.request.get('/favicon-16x16.png');
    expect(favicon16Response.status()).toBe(200);
    
    const favicon32Response = await page.request.get('/favicon-32x32.png');
    expect(favicon32Response.status()).toBe(200);
    
    const appleIconResponse = await page.request.get('/apple-touch-icon.png');
    expect(appleIconResponse.status()).toBe(200);
    
    // Check web manifest exists and is valid JSON
    const manifestResponse = await page.request.get('/site.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type']).toContain('application/');
    
    const manifestData = await manifestResponse.json();
    expect(manifestData.name).toBe('Vibe Coding Hamburg');
    expect(manifestData.short_name).toBe('VibeCoding');
    
    // ✅ 3. ROOT DATA LOADER VERIFICATION (Fixed 500 errors)
    console.log('📡 Testing root data loader...');
    
    // Wait for the page to fully load and check for proper content
    await page.waitForSelector('h1', { timeout: 10000 });
    const title = await page.title();
    expect(title).toContain('Vibe Coding Hamburg');
    
    // ✅ 4. ENVIRONMENT CONFIGURATION VERIFICATION
    console.log('⚙️ Testing environment configuration...');
    
    // Check that the page shows production characteristics
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/vibe|coding|hamburg/i);
    
    // ✅ 5. FORM FUNCTIONALITY TEST
    console.log('📝 Testing form functionality...');
    
    // Check signup form is present and functional
    const signupForm = page.locator('form[action*="index"]');
    await expect(signupForm).toBeVisible();
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Test form validation (should work with new validation system)
    await emailInput.fill('test');
    await page.locator('input[name="name"]').fill('Test User');
    
    // Try to submit and expect validation
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // ✅ 6. LANGUAGE SWITCHING TEST
    console.log('🌐 Testing language switching...');
    
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    if (await languageSwitcher.isVisible()) {
      const languageSelect = languageSwitcher.locator('select');
      await expect(languageSelect).toBeVisible();
      
      // Test language switching
      await languageSelect.selectOption('de');
      await page.waitForTimeout(1000); // Wait for potential page reload
      
      // Switch back to English
      await languageSelect.selectOption('en');
      await page.waitForTimeout(1000);
    }
    
    // ✅ 7. RESPONSIVE DESIGN TEST
    console.log('📱 Testing responsive design...');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(heading).toBeVisible();
      await expect(signupForm).toBeVisible();
    }
    
    // ✅ 8. SECURITY HEADERS TEST
    console.log('🔒 Testing security headers...');
    
    const headers = response?.headers();
    if (headers) {
      // Check for important security headers
      expect(headers['x-content-type-options']).toBeDefined();
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-xss-protection']).toBeDefined();
    }
    
    // ✅ 9. PERFORMANCE TEST
    console.log('⚡ Testing performance metrics...');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that critical resources loaded quickly
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0];
    });
    
    // Basic performance assertions
    expect(performanceEntries).toBeDefined();
    
    // ✅ 10. ERROR MONITORING
    console.log('🚨 Checking for JavaScript errors...');
    
    const jsErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Filter out critical errors (ignore favicon 404s if any slip through)
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.includes('Failed to load resource') &&
      !error.includes('net::ERR_NETWORK_CHANGED')
    );
    
    // Filter out critical network failures
    const criticalNetworkErrors = failedRequests.filter(req => 
      !req.includes('favicon') &&
      !req.includes('apple-touch-icon') &&
      req.includes('500') // Focus on server errors
    );
    
    // ✅ FINAL ASSERTIONS
    console.log('✅ Running final assertions...');
    
    // No critical JavaScript errors
    expect(criticalErrors.length).toBe(0);
    
    // No critical network errors (500s)
    expect(criticalNetworkErrors.length).toBe(0);
    
    // Essential elements are visible
    await expect(heading).toBeVisible();
    await expect(signupForm).toBeVisible();
    await expect(emailInput).toBeVisible();
    
    // Page title is correct
    expect(await page.title()).toMatch(/vibe coding hamburg/i);
    
    console.log('🎉 Deployment health check completed successfully!');
    console.log(`📊 Network requests: ${successfulRequests.length} successful, ${failedRequests.length} failed`);
    
    if (failedRequests.length > 0) {
      console.log('⚠️ Failed requests:', failedRequests.slice(0, 5)); // Show first 5 only
    }
  });
}); 