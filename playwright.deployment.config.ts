import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing the deployed environment
 * Run with: npx playwright test --config=playwright.deployment.config.ts
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/deployment',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry failed tests - important for deployment testing */
  retries: process.env.CI ? 3 : 2,
  
  /* Use fewer workers for deployment tests to avoid overwhelming server */
  workers: process.env.CI ? 2 : 3,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report/deployment' }],
    ['list'],
    ['json', { outputFile: 'test-results/deployment-results.json' }]
  ],
  
  /* Global test timeout for deployment tests (longer due to network) */
  timeout: 60 * 1000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10 * 1000,
  },
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL - deployed environment */
    baseURL: 'https://vibe-coding.looks-rare.at',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Record video for failures */
    video: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Longer timeouts for deployed environment */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    
    /* Ignore HTTPS errors in case of certificate issues */
    ignoreHTTPSErrors: false,
    
    /* User agent */
    userAgent: 'Vibe-Community-Deployment-Test/1.0',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'deployment-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'deployment-firefox',
      use: { 
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'deployment-mobile',
      use: { 
        ...devices['iPhone 12'],
      },
    },
  ],

  /* No web server - we're testing the deployed app */
  // webServer: undefined,
}); 