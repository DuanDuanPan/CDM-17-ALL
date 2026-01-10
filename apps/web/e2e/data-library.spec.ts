/**
 * Story 9.1: Data Library Drawer E2E Tests
 *
 * Covers AC1/AC2/AC3 for opening, closing, resizing, and filtering.
 */

import { test, expect, type Page } from '@playwright/test';
import { createTestGraph, makeTestGraphUrl } from './testUtils';

async function seedDataAssets(page: Page, graphId: string) {
  const assetA = await page.request.post('/api/data-assets', {
    data: {
      name: '卫星总体结构',
      description: 'E2E asset',
      format: 'STEP',
      fileSize: 1024,
      version: 'v1.0.0',
      tags: ['卫星'],
      graphId,
      secretLevel: 'internal',
    },
  });
  expect(assetA.ok()).toBeTruthy();

  const assetB = await page.request.post('/api/data-assets', {
    data: {
      name: '推进系统管路图',
      description: 'E2E asset',
      format: 'PDF',
      fileSize: 2048,
      version: 'v1.0.0',
      tags: ['推进'],
      graphId,
      secretLevel: 'internal',
    },
  });
  expect(assetB.ok()).toBeTruthy();
}

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

test.describe('Data Library Drawer (Story 9.1)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedDataAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();
  });

  // === AC1: Drawer 入口与展开 ===

  test('AC1.1: opens on toolbar icon click', async ({ page }) => {
    await openDataLibraryDrawer(page);
  });

  test('AC1.2: opens with Cmd/Ctrl + D shortcut', async ({ page }) => {
    // Note: On macOS, Cmd+D is a browser-reserved shortcut (bookmark) and may not be dispatched.
    // We verify the Ctrl+D path here, since the app supports both Ctrl and Meta.
    await page.keyboard.press('Control+d');
    await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
  });

  test('AC1.3: slides in from right', async ({ page }) => {
    await openDataLibraryDrawer(page);
    const drawer = page.locator('[data-testid="data-library-drawer"]');
    await expect(drawer).toBeVisible();

    const box = await drawer.boundingBox();
    expect(box?.x).toBeGreaterThan(page.viewportSize()!.width * 0.3);
  });

  test('AC1.4: drawer width is 60-70% of viewport', async ({ page }) => {
    await openDataLibraryDrawer(page);
    const drawer = page.locator('[data-testid="data-library-drawer"]');
    await expect(drawer).toBeVisible();

    const box = await drawer.boundingBox();
    const viewportWidth = page.viewportSize()!.width;
    expect(box?.width).toBeGreaterThanOrEqual(viewportWidth * 0.6);
    expect(box?.width).toBeLessThanOrEqual(viewportWidth * 0.7);
  });

  test('AC1.5: supports width resize by dragging', async ({ page }) => {
    await openDataLibraryDrawer(page);
    const drawer = page.locator('[data-testid="data-library-drawer"]');
    const resizeHandle = page.locator('[data-testid="drawer-resize-handle"]');

    await expect(drawer).toBeVisible();
    await expect(resizeHandle).toBeVisible();

    const initialBox = await drawer.boundingBox();
    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x - 100, initialBox!.y + 100);
    await page.mouse.up();

    const newBox = await drawer.boundingBox();
    expect(newBox?.width).toBeGreaterThan(initialBox!.width);
  });

  // === AC2: Drawer 关闭 ===

  test('AC2.1: closes on backdrop click', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await page.locator('[data-testid="drawer-backdrop"]').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
  });

  test('AC2.2: closes on close button click', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await page.getByRole('button', { name: /关闭/i }).click();
    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
  });

  test('AC2.3: closes on ESC key', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
  });

  // === AC3: 视图与搜索 ===

  test('AC3.1: toggles between grid and list view', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();

    await page.getByTitle('列表视图').click();
    await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();

    await page.getByTitle('网格视图').click();
    await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();
  });

  test('AC3.2: filters by name search (debounced)', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();

    await expect(page.locator('text=卫星总体结构')).toBeVisible();
    await expect(page.locator('text=推进系统管路图')).toBeVisible();

    await page.getByTestId('data-library-drawer').getByPlaceholder('搜索').fill('卫星');

    await expect(page.locator('text=卫星总体结构')).toBeVisible();
    await expect(page.locator('text=推进系统管路图')).toHaveCount(0);
  });

  test('AC3.3: filters by format type', async ({ page }) => {
    await openDataLibraryDrawer(page);
    await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();

    await expect(page.locator('text=卫星总体结构')).toBeVisible();
    await expect(page.locator('text=推进系统管路图')).toBeVisible();

    await page.getByRole('combobox', { name: '类型' }).selectOption('STEP');

    await expect(page.locator('text=卫星总体结构')).toBeVisible();
    await expect(page.locator('text=推进系统管路图')).toHaveCount(0);
  });
});
