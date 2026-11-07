import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

test.describe('Dashboard Operations E2E Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // Perform login first
    await loginPage.goto();
    await loginPage.login('admin', 'password123');
    await page.waitForURL('**/dashboard');
  });

  test('should display dashboard header and operational metrics', async () => {
    await expect(dashboardPage.welcomeHeader).toContainText('Welcome to Operations Dashboard');
    await expect(dashboardPage.usersMetric).toBeVisible();
    await expect(dashboardPage.ordersMetric).toBeVisible();
    await expect(dashboardPage.systemStatusMetric).toHaveText('Operational');
  });

  test('should populate users table with records', async () => {
    const rowCount = await dashboardPage.getTableRowsCount();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('should log out and redirect back to login page', async ({ page }) => {
    await dashboardPage.logout();
    await page.waitForURL('**/login');
    await expect(loginPage.submitButton).toBeVisible();
  });
});
