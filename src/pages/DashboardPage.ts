import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly welcomeHeader: Locator;
  readonly logoutButton: Locator;
  readonly usersMetric: Locator;
  readonly ordersMetric: Locator;
  readonly systemStatusMetric: Locator;
  readonly usersTableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeHeader = page.locator('#welcome-msg');
    this.logoutButton = page.locator('#logout-btn');
    this.usersMetric = page.locator('#metric-users');
    this.ordersMetric = page.locator('#metric-orders');
    this.systemStatusMetric = page.locator('#metric-status');
    this.usersTableRows = page.locator('#users-table tbody tr');
  }

  async goto(): Promise<void> {
    await this.navigate('/dashboard');
  }

  async logout(): Promise<void> {
    await this.click(this.logoutButton);
  }

  async getTableRowsCount(): Promise<number> {
    return await this.usersTableRows.count();
  }
}
