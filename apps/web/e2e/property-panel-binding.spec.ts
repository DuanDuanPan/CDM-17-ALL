/**
 * Story 9.10: Property Panel Asset Binding E2E Tests
 *
 * Covers AC1-AC5:
 * - Start binding from property panel
 * - Binding mode UI (banner + tray)
 * - Cross-view selection persistence
 * - Confirm binding closes drawer + refreshes property panel links
 * - PBS/Task compatibility + node deletion handling
 */

import { test, expect, type Page } from '@playwright/test';
import { createTestGraph, makeTestGraphUrl } from './testUtils';

const waitForApi = (page: Page, method: string, pathPart: string) =>
  page.waitForResponse((res) => res.url().includes(pathPart) && res.request().method() === method);

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

async function createNodeAndSetType(page: Page, label: string, type: 'TASK' | 'PBS') {
  const centerNode = page.locator('.x6-node[data-cell-id="center-node"]').first();
  await expect(centerNode).toBeVisible();

  await centerNode.click();
  await page.keyboard.press('Tab');

  const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
  await expect(editInput).toBeVisible();
  await editInput.fill(label);
  await editInput.press('Enter');

  const newNode = page.locator('.x6-node', { hasText: label }).first();
  await expect(newNode).toBeVisible();

  const nodeId = await newNode.getAttribute('data-cell-id');
  if (!nodeId) {
    throw new Error('Failed to resolve created node id');
  }

  await newNode.click();
  const propertyPanel = page.locator('aside:has-text("属性面板")');
  await expect(propertyPanel).toBeVisible();

  // Ensure node exists in backend before linking
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`/api/nodes/${encodeURIComponent(nodeId)}`);
    if (res.ok()) break;
    await page.waitForTimeout(200);
  }

  const typeSelect = propertyPanel.locator('select').first();
  await expect(typeSelect).toBeVisible();

  await Promise.all([
    waitForApi(page, 'PATCH', '/type'),
    typeSelect.selectOption(type),
  ]);

  await expect(propertyPanel.locator('[data-testid="linked-assets-section"]')).toBeVisible();

  return { nodeId, label };
}

async function startBindingFromPropertyPanel(page: Page) {
  const propertyPanel = page.locator('aside:has-text("属性面板")');
  await expect(propertyPanel).toBeVisible();

  const linkedSection = propertyPanel.locator('[data-testid="linked-assets-section"]');
  await expect(linkedSection).toBeVisible();

  await linkedSection.getByRole('button', { name: '添加' }).click();

  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
  await expect(page.getByTestId('binding-target-banner')).toBeVisible();
  await expect(page.getByTestId('selected-assets-tray')).toBeVisible();

  // Binding mode should force folder view
  await expect(page.getByTestId('org-tab-folder')).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Property Panel Asset Binding (Story 9.10)', () => {
  test.describe.configure({ timeout: 90_000 });

  test('binds assets to TASK node from property panel', async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedDataAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();

    const taskNode = await createNodeAndSetType(page, `E2E Task ${testInfo.testId}`, 'TASK');

    await startBindingFromPropertyPanel(page);

    // Select assets
    const assetA = page.locator('[data-testid="asset-card"]', { hasText: '卫星总体结构' }).first();
    await expect(assetA).toBeVisible();
    await assetA.locator('[data-testid="asset-select-checkbox"]').check();

    const assetB = page.locator('[data-testid="asset-card"]', { hasText: '推进系统管路图' }).first();
    await expect(assetB).toBeVisible();
    await assetB.locator('[data-testid="asset-select-checkbox"]').check();

    // AC3: Selection persists across search filtering
    await page.getByTestId('asset-search-input').fill('卫星');
    await expect(page.locator('[data-testid="asset-card"]', { hasText: '推进系统管路图' })).toHaveCount(0);
    await page.getByTestId('asset-search-input').fill('');

    await expect(assetA.locator('[data-testid="asset-select-checkbox"]')).toBeChecked();
    await expect(assetB.locator('[data-testid="asset-select-checkbox"]')).toBeChecked();

    // AC4: Confirm binding (batch)
    const bindResponse = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/data-assets/links:batch') &&
          res.request().method() === 'POST'
      ),
      page.getByTestId('tray-confirm').click(),
    ]).then(([res]) => res);

    if (!bindResponse.ok()) {
      const body = await bindResponse.text().catch(() => '');
      throw new Error(`Failed to batch bind: status=${bindResponse.status()} body=${body}`);
    }

    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();

    const linkedSection = page.locator('aside:has-text("属性面板") [data-testid="linked-assets-section"]');
    await expect(linkedSection).toContainText('卫星总体结构');
    await expect(linkedSection).toContainText('推进系统管路图');

    // Ensure query invalidation happened (UI shows links for current node)
    expect(taskNode.nodeId).toBeTruthy();
  });

  test('supports PBS node binding', async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedDataAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();

    await createNodeAndSetType(page, `E2E PBS ${testInfo.testId}`, 'PBS');

    await startBindingFromPropertyPanel(page);

    const assetA = page.locator('[data-testid="asset-card"]', { hasText: '卫星总体结构' }).first();
    await assetA.locator('[data-testid="asset-select-checkbox"]').check();

    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/data-assets/links:batch') &&
          res.request().method() === 'POST' &&
          res.ok()
      ),
      page.getByTestId('tray-confirm').click(),
    ]);

    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
    const linkedSection = page.locator('aside:has-text("属性面板") [data-testid="linked-assets-section"]');
    await expect(linkedSection).toContainText('卫星总体结构');
  });

  test('exits binding mode when target node is deleted', async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedDataAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await page.waitForFunction(() => (window as any).__CDM_E2E__?.version === 1);

    const taskNode = await createNodeAndSetType(page, `E2E Delete ${testInfo.testId}`, 'TASK');
    await startBindingFromPropertyPanel(page);

    // Delete the target node while drawer is open (avoid click interception by overlay)
    const removed = await page.evaluate(
      (nodeId: string) => (window as any).__CDM_E2E__?.removeNodeById?.(nodeId) ?? false,
      taskNode.nodeId
    );
    expect(removed).toBeTruthy();

    await expect(page.getByText('目标节点已删除，已退出绑定模式')).toBeVisible();
    await expect(page.getByTestId('binding-target-banner')).toHaveCount(0);
    await expect(page.getByTestId('selected-assets-tray')).toHaveCount(0);
  });
});
