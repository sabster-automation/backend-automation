import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';

test.describe('Portal Authentication E2E Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form elements correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Automation Portal - Sign In/);
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should show error message on invalid credentials', async () => {
    await loginPage.login('admin', 'wrongpassword');
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Invalid credentials');
  });

  test('should successfully log in and redirect to dashboard', async ({ page }) => {
    await loginPage.login('admin', 'password123');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('#welcome-msg')).toBeVisible();
  });
});
