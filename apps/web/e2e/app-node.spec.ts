/**
 * Story 2.9: APP Node Type E2E Tests
 * Covers library selection, default I/O population, execution, and output preview/download
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

const waitForApi = (page: Page, method: string, path: string) =>
  page.waitForResponse((res) => res.url().includes(path) && res.request().method() === method && res.ok());

const waitForNodeReady = async (page: Page) => {
  const timeout = 5000;
  await Promise.race([
    page.waitForResponse(
      (res) => res.url().includes('/api/nodes/') && res.request().method() === 'GET' && res.status() === 200,
      { timeout }
    ),
    page.waitForResponse(
      (res) => res.url().includes('/api/nodes') && res.request().method() === 'POST' && res.status() < 300,
      { timeout }
    ),
    page.locator('aside:has-text("属性面板")').waitFor({ state: 'visible', timeout }),
  ]).catch(() => {});
};

test.describe('Story 2.9: APP Node Type', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
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
    await expect(page.getByRole('heading', { name: '卫星应用库' })).toBeVisible();

    // Select app and confirm
    await page.getByRole('button', { name: /Orbit Designer Pro/ }).click();
    await page.getByRole('button', { name: '选择应用' }).click();

    // Defaults should be populated
    await expect(propertyPanel.locator('input[placeholder="参数名称"][value="轨道高度"]')).toBeVisible();
    await expect(propertyPanel.locator('input[placeholder="参数名称"][value="轨道倾角"]')).toBeVisible();
    await expect(propertyPanel.locator('input[placeholder="参数名称"][value="偏心率"]')).toBeVisible();

    // Execute
    await propertyPanel.getByRole('button', { name: '启动应用' }).click();
    await waitForApi(page, 'POST', '/execute');

    // Output download/preview buttons visible
    await expect(propertyPanel.locator('button[title="下载"]').first()).toBeVisible();
    await expect(propertyPanel.locator('button[title="预览"]').first()).toBeVisible();
  });
});
