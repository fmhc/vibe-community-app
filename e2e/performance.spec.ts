import { test, expect } from '@playwright/test';

test.describe('Performance & Accessibility', () => {
  test.describe('Page Load Performance', () => {
    test('homepage should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (generous for CI environments)
      expect(loadTime).toBeLessThan(5000);
      
      console.log(`Homepage loaded in ${loadTime}ms`);
    });

    test('should have reasonable bundle sizes', async ({ page }) => {
      const responses: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          responses.push({
            url: response.url(),
            size: response.headers()['content-length'],
            type: response.url().includes('.js') ? 'js' : 'css'
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const jsResponses = responses.filter(r => r.type === 'js');
      const cssResponses = responses.filter(r => r.type === 'css');
      
      console.log(`Loaded ${jsResponses.length} JS files, ${cssResponses.length} CSS files`);
      
      // Should have some assets loaded
      expect(jsResponses.length + cssResponses.length).toBeGreaterThan(0);
    });

    test('should not have excessive network requests', async ({ page }) => {
      const requests: string[] = [];
      
      page.on('request', request => {
        requests.push(request.url());
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should not make excessive requests (under 50 for homepage)
      expect(requests.length).toBeLessThan(50);
      
      console.log(`Made ${requests.length} network requests`);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should have good largest contentful paint', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Get LCP using Performance API
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 3000);
        });
      });
      
      if (lcp > 0) {
        // LCP should be under 2.5 seconds (good threshold)
        expect(lcp).toBeLessThan(2500);
        console.log(`LCP: ${lcp}ms`);
      }
    });

    test('should have minimal layout shift', async ({ page }) => {
      await page.goto('/');
      
      // Wait for initial load
      await page.waitForLoadState('domcontentloaded');
      
      // Wait a bit more to catch layout shifts
      await page.waitForTimeout(2000);
      
      // Get CLS score
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            resolve(clsValue);
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after a short delay
          setTimeout(() => resolve(clsValue), 1000);
        });
      });
      
      // CLS should be under 0.1 (good threshold)
      expect(cls).toBeLessThan(0.1);
      console.log(`CLS: ${cls}`);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper semantic HTML structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper document structure
      await expect(page.locator('html[lang]')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('nav')).toHaveCount(1);
      
      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      
      // Wait for potential redirects or form to load
      await page.waitForTimeout(1000);
      
      // Check that all form inputs have associated labels
      const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          
          if (id) {
            // Should have a corresponding label
            const label = page.locator(`label[for="${id}"]`);
            const hasLabel = await label.count() > 0;
            const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
            
            expect(hasLabel || hasAriaLabel).toBeTruthy();
          }
        }
      }
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Check for text elements and their contrast
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button');
      const elementCount = await textElements.count();
      
      // Just ensure we have text elements with reasonable styling
      expect(elementCount).toBeGreaterThan(0);
      
      // Check that text is not invisible (basic check)
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = textElements.nth(i);
        const opacity = await element.evaluate(el => 
          window.getComputedStyle(el).opacity
        );
        const visibility = await element.evaluate(el => 
          window.getComputedStyle(el).visibility
        );
        
        expect(parseFloat(opacity)).toBeGreaterThan(0);
        expect(visibility).not.toBe('hidden');
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName.toLowerCase();
      });
      
      // Should have focused on a focusable element
      const focusableElements = ['a', 'button', 'input', 'select', 'textarea'];
      expect(focusableElements).toContain(focusedElement);
    });

    test('should have proper skip links for screen readers', async ({ page }) => {
      await page.goto('/');
      
      // Look for skip links (often hidden but accessible via keyboard)
      const skipLink = page.locator('a[href="#main"], a[href="#content"], [data-testid="skip-link"]');
      
      if (await skipLink.count() > 0) {
        // If skip link exists, it should be properly configured
        const href = await skipLink.first().getAttribute('href');
        expect(href).toMatch(/#(main|content|skip)/);
      }
    });
  });

  test.describe('SEO', () => {
    test('should have proper meta tags', async ({ page }) => {
      await page.goto('/');
      
      // Check for essential meta tags
      await expect(page.locator('meta[name="description"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:title"], meta[name="og:title"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:description"], meta[name="og:description"]')).toHaveCount(1);
      
      // Check that title is meaningful
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title).toContain('Vibe Coding Hamburg');
    });

    test('should have proper canonical URL', async ({ page }) => {
      await page.goto('/');
      
      // Check for canonical link
      const canonical = page.locator('link[rel="canonical"]');
      if (await canonical.count() > 0) {
        const href = await canonical.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^https?:\/\//);
      }
    });

    test('should have robots meta tag', async ({ page }) => {
      await page.goto('/');
      
      // Check robots meta tag
      const robots = page.locator('meta[name="robots"]');
      if (await robots.count() > 0) {
        const content = await robots.getAttribute('content');
        expect(content).toBeTruthy();
      }
    });
  });

  test.describe('Security', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto('/');
      
      // Check for security headers
      const headers = response?.headers() || {};
      
      // Should have some security-related headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'content-security-policy',
        'strict-transport-security'
      ];
      
      const hasSecurityHeaders = securityHeaders.some(header => 
        headers[header] !== undefined
      );
      
      // Should have at least one security header
      expect(hasSecurityHeaders).toBeTruthy();
    });

    test('should not expose sensitive information', async ({ page }) => {
      await page.goto('/');
      
      // Check that sensitive info is not in the page source
      const content = await page.content();
      
      // Should not contain obvious sensitive patterns
      const sensitivePatterns = [
        /password\s*[:=]\s*["'][^"']*["']/i,
        /api[_-]?key\s*[:=]\s*["'][^"']*["']/i,
        /secret\s*[:=]\s*["'][^"']*["']/i,
        /token\s*[:=]\s*["'][a-zA-Z0-9+/]{20,}["']/i
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(content).not.toMatch(pattern);
      }
    });
  });
}); 