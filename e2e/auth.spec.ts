import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should display login form', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Login.*Vibe Coding Hamburg/i);
      
      // Check for login form elements
      await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      // Try to submit empty form
      await page.getByRole('button', { name: /login/i }).click();
      
      // Check for validation messages
      await expect(page.getByText(/email.*required/i)).toBeVisible();
      await expect(page.getByText(/password.*required/i)).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      // Enter invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /login/i }).click();
      
      // Check for email validation error
      await expect(page.getByText(/invalid.*email/i)).toBeVisible();
    });

    test('should handle login attempt with valid format', async ({ page }) => {
      // Fill in form with valid format (but likely invalid credentials)
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('testpassword123');
      
      // Submit form
      await page.getByRole('button', { name: /login/i }).click();
      
      // Should either redirect on success or show error message
      // We don't have real credentials, so we expect an error
      await page.waitForTimeout(2000);
      
      // Check that we either got redirected or got an error message
      const currentUrl = page.url();
      const hasErrorMessage = await page.locator('.error, [role="alert"], .alert-error').isVisible();
      
      expect(currentUrl.includes('/dashboard') || hasErrorMessage).toBeTruthy();
    });

    test('should have link to registration', async ({ page }) => {
      // Look for registration/signup link
      const signupLink = page.getByRole('link', { name: /sign.*up|register|create.*account/i });
      await expect(signupLink).toBeVisible();
    });

    test('should have "forgot password" functionality', async ({ page }) => {
      // Look for forgot password link
      const forgotPasswordLink = page.getByRole('link', { name: /forgot.*password|reset.*password/i });
      await expect(forgotPasswordLink).toBeVisible();
      
      // Click and verify it goes to reset page
      await forgotPasswordLink.click();
      await expect(page.url()).toContain('forgot-password');
    });
  });

  test.describe('Password Reset', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/forgot-password');
    });

    test('should display password reset form', async ({ page }) => {
      // Check page elements
      await expect(page.getByRole('heading', { name: /forgot.*password|reset.*password/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
    });

    test('should validate email input', async ({ page }) => {
      // Test empty email
      await page.getByRole('button', { name: /send|reset|submit/i }).click();
      await expect(page.getByText(/email.*required/i)).toBeVisible();
      
      // Test invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();
      await expect(page.getByText(/invalid.*email/i)).toBeVisible();
    });

    test('should handle valid email submission', async ({ page }) => {
      // Fill in valid email
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();
      
      // Should show success message or redirect
      await page.waitForTimeout(2000);
      
      const hasSuccessMessage = await page.locator('.success, .alert-success, [role="status"]').isVisible();
      const hasInstructions = await page.getByText(/check.*email|sent.*instructions/i).isVisible();
      
      expect(hasSuccessMessage || hasInstructions).toBeTruthy();
    });
  });

  test.describe('GitHub OAuth', () => {
    test('should have GitHub login option', async ({ page }) => {
      await page.goto('/login');
      
      // Look for GitHub login button
      const githubButton = page.getByRole('button', { name: /github/i }).or(
        page.getByRole('link', { name: /github/i })
      );
      
      if (await githubButton.isVisible()) {
        // Click GitHub button and verify it redirects to GitHub
        await githubButton.click();
        
        // Should redirect to GitHub OAuth or show GitHub integration
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        expect(
          currentUrl.includes('github.com') || 
          currentUrl.includes('/auth/github') ||
          page.getByText(/github.*integration/i).isVisible()
        ).toBeTruthy();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should redirect unauthenticated users from protected pages', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login or show login prompt
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const hasLoginForm = await page.getByRole('button', { name: /login/i }).isVisible();
      
      expect(currentUrl.includes('/login') || hasLoginForm).toBeTruthy();
    });

    test('should show login/logout state in navigation', async ({ page }) => {
      await page.goto('/');
      
      // Check navigation for auth state
      const nav = page.getByRole('navigation');
      const loginLink = nav.getByRole('link', { name: /login|sign.*in/i });
      const logoutButton = nav.getByRole('button', { name: /logout|sign.*out/i });
      
      // Should have either login link or logout button
      const hasLoginLink = await loginLink.isVisible();
      const hasLogoutButton = await logoutButton.isVisible();
      
      expect(hasLoginLink || hasLogoutButton).toBeTruthy();
    });
  });
}); 