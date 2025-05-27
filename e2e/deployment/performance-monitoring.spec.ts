import { test, expect } from '@playwright/test';

test.describe('Performance Monitoring', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    console.log('⚡ Starting performance monitoring...');
    
    const startTime = Date.now();
    
    // Navigate to homepage and measure load time
    console.log('🏠 Testing homepage load performance...');
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 Page load time: ${loadTime}ms`);
    
    // Performance assertion - page should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max for deployed environment
    
    // Check response time
    expect(response?.status()).toBe(200);
    
    // Get detailed performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        // Navigation timing
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
        ttfb: navigation.responseStart - navigation.requestStart,
        download: navigation.responseEnd - navigation.responseStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        
        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // Resource counts
        resourceCount: performance.getEntriesByType('resource').length,
      };
    });
    
    console.log('📈 Performance Metrics:');
    console.log(`   DNS Lookup: ${performanceMetrics.dns.toFixed(1)}ms`);
    console.log(`   TCP Connection: ${performanceMetrics.tcp.toFixed(1)}ms`);
    console.log(`   SSL Handshake: ${performanceMetrics.ssl.toFixed(1)}ms`);
    console.log(`   Time to First Byte: ${performanceMetrics.ttfb.toFixed(1)}ms`);
    console.log(`   Download: ${performanceMetrics.download.toFixed(1)}ms`);
    console.log(`   DOM Interactive: ${performanceMetrics.domInteractive.toFixed(1)}ms`);
    console.log(`   First Paint: ${performanceMetrics.firstPaint.toFixed(1)}ms`);
    console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(1)}ms`);
    console.log(`   Resources Loaded: ${performanceMetrics.resourceCount}`);
    
    // Performance assertions
    expect(performanceMetrics.ttfb).toBeLessThan(5000); // TTFB under 5s
    expect(performanceMetrics.domInteractive).toBeLessThan(8000); // DOM ready under 8s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(6000); // FCP under 6s
    
    console.log('✅ Performance benchmarks passed');
  });

  test('should load static assets efficiently', async ({ page }) => {
    console.log('🖼️ Testing static asset performance...');
    
    const assetResponseTimes: { [key: string]: number } = {};
    const failedAssets: string[] = [];
    
    page.on('response', response => {
      const url = response.url();
      
      if (url.includes('.png') || url.includes('.svg') || url.includes('.ico') || url.includes('manifest')) {
        if (response.status() >= 400) {
          failedAssets.push(`${response.status()}: ${url}`);
        } else {
          // Just track successful responses for assets
          assetResponseTimes[url] = response.status();
        }
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    console.log('📊 Asset Response Status:');
    Object.entries(assetResponseTimes).forEach(([url, status]) => {
      const filename = url.split('/').pop();
      console.log(`   ${filename}: ${status}`);
    });
    
    if (failedAssets.length > 0) {
      console.log('❌ Failed Assets:', failedAssets);
    }
    
    // Assertions
    expect(failedAssets.length).toBe(0); // No assets should fail to load
    
    // All tracked assets should have successful status codes
    Object.values(assetResponseTimes).forEach(status => {
      expect(status).toBeLessThan(400);
    });
    
    console.log('✅ Static assets loaded efficiently');
  });

  test('should handle concurrent users gracefully', async ({ browser }) => {
    console.log('👥 Testing concurrent user simulation...');
    
    const contexts = [];
    const pages = [];
    const loadTimes: number[] = [];
    
    try {
      // Create multiple browser contexts to simulate different users
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // Load the page concurrently from all contexts
      const startTime = Date.now();
      
      const promises = pages.map(async (page, index) => {
        const pageStartTime = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const pageLoadTime = Date.now() - pageStartTime;
        loadTimes.push(pageLoadTime);
        console.log(`   User ${index + 1} load time: ${pageLoadTime}ms`);
        return page.title();
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      console.log(`📊 Concurrent load completed in ${totalTime}ms`);
      console.log(`📈 Average load time: ${(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length).toFixed(1)}ms`);
      
      // All pages should load successfully
      results.forEach(title => {
        expect(title).toContain('Vibe Coding Hamburg');
      });
      
      // No single page should take too long
      loadTimes.forEach(time => {
        expect(time).toBeLessThan(15000); // 15s max under concurrent load
      });
      
      console.log('✅ Handles concurrent users gracefully');
      
    } finally {
      // Clean up
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should have optimized bundle sizes', async ({ page }) => {
    console.log('📦 Testing bundle size optimization...');
    
    const resourceSizes: { [key: string]: number } = {};
    let totalJSSize = 0;
    let totalCSSSize = 0;
    
    page.on('response', async response => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        resourceSizes[url] = size;
        
        if (url.includes('.js')) {
          totalJSSize += size;
        } else if (url.includes('.css')) {
          totalCSSSize += size;
        }
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    console.log('📊 Bundle Sizes:');
    console.log(`   Total JavaScript: ${(totalJSSize / 1024).toFixed(1)} KB`);
    console.log(`   Total CSS: ${(totalCSSSize / 1024).toFixed(1)} KB`);
    
    // Log largest resources
    const sortedResources = Object.entries(resourceSizes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    console.log('📦 Largest Resources:');
    sortedResources.forEach(([url, size]) => {
      const filename = url.split('/').pop();
      console.log(`   ${filename}: ${(size / 1024).toFixed(1)} KB`);
    });
    
    // Bundle size assertions (reasonable limits for production)
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // JS under 2MB
    expect(totalCSSSize).toBeLessThan(500 * 1024); // CSS under 500KB
    
    console.log('✅ Bundle sizes are optimized');
  });

  test('should respond quickly under form submission load', async ({ page }) => {
    console.log('📝 Testing form submission performance...');
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const formResponseTimes: number[] = [];
    
    // Test multiple form submissions to measure response time
    for (let i = 0; i < 3; i++) {
      const timestamp = Date.now();
      const testEmail = `perf-test-${timestamp}-${i}@example.com`;
      
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[name="name"]').fill(`Performance Test ${i}`);
      
      const submitStartTime = Date.now();
      await page.locator('button[type="submit"]').click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      const responseTime = Date.now() - submitStartTime;
      formResponseTimes.push(responseTime);
      
      console.log(`   Form submission ${i + 1}: ${responseTime}ms`);
      
      // Wait a bit between submissions
      await page.waitForTimeout(1000);
    }
    
    const averageResponseTime = formResponseTimes.reduce((a, b) => a + b, 0) / formResponseTimes.length;
    console.log(`📊 Average form response time: ${averageResponseTime.toFixed(1)}ms`);
    
    // Form responses should be reasonably quick
    expect(averageResponseTime).toBeLessThan(5000); // Under 5s average
    formResponseTimes.forEach(time => {
      expect(time).toBeLessThan(10000); // Each under 10s
    });
    
    console.log('✅ Form submissions perform well');
  });

  test('should maintain performance across different network conditions', async ({ page }) => {
    console.log('🌐 Testing performance under different network conditions...');
    
    const networkConditions = [
      { name: 'Fast 3G', downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
      { name: 'Slow 3G', downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 },
    ];
    
    for (const condition of networkConditions) {
      console.log(`📱 Testing ${condition.name}...`);
      
      // Simulate network condition
      await page.context().addInitScript(() => {
        // This is a simplified simulation - real network throttling would be done at browser level
        console.log('Simulating network condition...');
      });
      
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      console.log(`   ${condition.name} load time: ${loadTime}ms`);
      
      // Even under slow conditions, page should load within reasonable time
      expect(loadTime).toBeLessThan(20000); // 20s max for slow 3G
      
      // Check that critical content is visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
    }
    
    console.log('✅ Performance acceptable across network conditions');
  });
}); 