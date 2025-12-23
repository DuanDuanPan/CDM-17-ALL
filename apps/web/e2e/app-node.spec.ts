/**
 * Story 2.9: APP Node Type E2E Tests
 * Covers library selection, default I/O population, execution, and output preview/download
 */

import { test, expect, type Page } from '@playwright/test';

const waitForApi = (page: Page, method: string, path: string) =>
  page.waitForResponse((res) => res.url().includes(path) && res.request().method() === method && res.ok());

const waitForNodeReady = (page: Page) =>
  Promise.race([
    page.waitForResponse((res) => res.url().includes('/api/nodes/') && res.request().method() === 'GET' && res.status() === 200),
    page.waitForResponse((res) => res.url().includes('/api/nodes') && res.request().method() === 'POST' && res.status() < 300),
  ]);

test.describe('Story 2.9: APP Node Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');
  });

  test('AC2.2/AC2.3/AC4.2: Select library app, defaults populate, execute, outputs show', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await expect(rootNode).toBeVisible();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    await expect(propertyPanel).toBeVisible();

    const typeSelect = propertyPanel.locator('select').first();
    await typeSelect.selectOption('APP');
    await waitForApi(page, 'PATCH', '/type');
    await page.waitForTimeout(200);

    // Open library dialog
    await propertyPanel.getByRole('button', { name: '从应用库选择' }).click();
    const dialog = page.locator('text=卫星应用库');
    await expect(dialog).toBeVisible();

    // Select app and confirm
    await page.getByRole('button', { name: /Orbit Designer Pro/ }).click();
    await page.getByRole('button', { name: '选择应用' }).click();

    // Defaults should be populated
    await expect(propertyPanel.locator('input[value="Orbit Altitude"]')).toBeVisible();
    await expect(propertyPanel.locator('input[value="Inclination"]')).toBeVisible();
    await expect(propertyPanel.locator('input[value="Trajectory File"]')).toBeVisible();

    // Execute
    await propertyPanel.getByRole('button', { name: '启动应用' }).click();
    await waitForApi(page, 'POST', '/execute');

    // Output download/preview buttons visible
    await expect(propertyPanel.locator('button[title="下载"]')).toBeVisible();
    await expect(propertyPanel.locator('button[title="预览"]')).toBeVisible();
  });
});
