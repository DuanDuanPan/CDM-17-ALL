/**
 * Story 9.9: Data Library Toolbar Redesign E2E Tests
 *
 * Covers:
 * - AC1: Toolbar action controls (view toggle, org panel toggle, trash, batch delete visibility)
 * - AC2: AssetFilterBar search/type/date filtering
 * - AC3: Scope selector (all/unlinked) + hide linkType grouping
 * - AC4: Switching org views resets filters + toast
 */

import { test, expect, type Page } from '@playwright/test';
import { createTestGraph, makeTestGraphUrl } from './testUtils';

const waitForApi = (page: Page, method: string, pathPart: string) =>
  page.waitForResponse((res) => res.url().includes(pathPart) && res.request().method() === method && res.ok());

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
  const assetAJson = (await assetA.json()) as { asset?: { id?: string } };
  if (!assetAJson.asset?.id) throw new Error('Create assetA response missing asset.id');

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
  const assetBJson = (await assetB.json()) as { asset?: { id?: string } };
  if (!assetBJson.asset?.id) throw new Error('Create assetB response missing asset.id');

  return { assetAId: assetAJson.asset.id, assetBId: assetBJson.asset.id };
}

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

async function createTypedNode(page: Page, label: string, type: 'PBS' | 'TASK') {
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
  if (!nodeId) throw new Error('Failed to resolve created node id');

  await newNode.click();
  const propertyPanel = page.locator('aside:has-text("属性面板")');
  await expect(propertyPanel).toBeVisible();

  // Ensure backend has created the node before switching type.
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

  return { nodeId, label };
}

test.describe('Data Library Toolbar Redesign (Story 9.9)', () => {
  test.describe.configure({ timeout: 90_000 });

  let graphId: string;
  let assetAId: string;
  let _assetBId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    graphId = await createTestGraph(page, testInfo);
    const seeded = await seedDataAssets(page, graphId);
    assetAId = seeded.assetAId;
    _assetBId = seeded.assetBId;

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();
  });

  test('AC1: toolbar actions (view toggle, panel toggle, trash, batch delete visibility)', async ({ page }) => {
    await openDataLibraryDrawer(page);

    await expect(page.getByTestId('toolbar')).toBeVisible();
    await expect(page.getByTestId('asset-filter-bar')).toBeVisible();

    // Switch to "all" scope so assets render without selecting a node.
    await page.getByTestId('scope-selector-trigger').click();
    await page.getByTestId('scope-option-all').click();

    await expect(page.getByTestId('asset-grid')).toBeVisible();

    // View mode toggle
    await page.getByTestId('view-mode-list').click();
    await expect(page.getByTestId('asset-list')).toBeVisible();
    await page.getByTestId('view-mode-grid').click();
    await expect(page.getByTestId('asset-grid')).toBeVisible();

    // Organization panel toggle
    await expect(page.getByTestId('organization-tabs')).toBeVisible();
    await page.getByTestId('toggle-org-panel').click();
    await expect(page.locator('[data-testid="organization-tabs"]')).toHaveCount(0);
    await page.getByTestId('toggle-org-panel').click();
    await expect(page.getByTestId('organization-tabs')).toBeVisible();

    // Batch delete button is conditional on selection
    const firstCheckbox = page.locator('[data-testid="asset-select-checkbox"]').first();
    await firstCheckbox.check();
    await expect(page.getByTestId('batch-delete-button')).toBeVisible();
    await expect(page.getByTestId('batch-delete-button')).toContainText('删除 (1)');
    await firstCheckbox.uncheck();
    await expect(page.locator('[data-testid="batch-delete-button"]')).toHaveCount(0);

    // Trash drawer opens from toolbar
    await page.getByTestId('trash-button').click();
    await expect(page.getByTestId('trash-drawer')).toBeVisible();
    await page.getByLabel('关闭回收站').click();
    await expect(page.locator('[data-testid="trash-drawer"]')).toHaveCount(0);
  });

  test('AC2: asset filter bar filters by search/type/date and shows badge', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Use "all" scope so assets show without selecting a node.
    await page.getByTestId('scope-selector-trigger').click();
    await page.getByTestId('scope-option-all').click();

    await expect(page.getByTestId('asset-grid')).toBeVisible();
    await expect(page.getByText('卫星总体结构')).toBeVisible();
    await expect(page.getByText('推进系统管路图')).toBeVisible();

    // Search filter
    await page.getByTestId('asset-search-input').fill('卫星');
    await expect(page.getByText('卫星总体结构')).toBeVisible();
    await expect(page.locator('text=推进系统管路图')).toHaveCount(0);
    await expect(page.getByTestId('filter-badge')).toContainText('已应用 1 个筛选');

    // Clear search (keep scope)
    await page.getByLabel('清空搜索').click();
    await expect(page.locator('[data-testid="filter-badge"]')).toHaveCount(0);
    await expect(page.getByText('推进系统管路图')).toBeVisible();

    // Type filter
    await page.getByTestId('type-filter-select').selectOption('PDF');
    await expect(page.getByText('推进系统管路图')).toBeVisible();
    await expect(page.locator('text=卫星总体结构')).toHaveCount(0);
    await expect(page.getByTestId('filter-badge')).toContainText('已应用 1 个筛选');

    // Date filter (future start date -> empty)
    await page.getByTestId('date-filter-start').fill('2099-01-01');
    await expect(page.getByText('无匹配资产')).toBeVisible();
    await expect(page.getByTestId('filter-badge')).toContainText('已应用 2 个筛选');

    // Clear date filter + reset type filter
    await page.getByTestId('date-filter-clear').click();
    await page.getByTestId('type-filter-select').selectOption('');
    await expect(page.getByTestId('asset-grid')).toBeVisible();
    await expect(page.getByText('卫星总体结构')).toBeVisible();
    await expect(page.getByText('推进系统管路图')).toBeVisible();
  });

  test('AC3: scope switching refreshes results and hides linkType grouping in global scopes', async ({ page }, testInfo) => {
    const node = await createTypedNode(page, `E2E Node ${testInfo.testId}`, 'TASK');

    // Link assetA to the node so we can validate "unlinked" scope.
    const linkRes = await page.request.post('/api/data-assets/links', {
      data: { nodeId: node.nodeId, assetId: assetAId, linkType: 'input' },
    });
    expect(linkRes.ok()).toBeTruthy();

    await openDataLibraryDrawer(page);

    // Select node -> grouped view (current-node scope)
    await expect(page.getByTestId(`node-tree-item-${node.nodeId}`)).toBeVisible();
    await page.getByTestId(`node-tree-item-${node.nodeId}`).locator('div').first().click();
    await expect(page.getByTestId('toggle-empty-groups')).toBeVisible();

    // Switch to ALL -> grouped view hidden, flat assets visible
    await page.getByTestId('scope-selector-trigger').click();
    await page.getByTestId('scope-option-all').click();
    await expect(page.locator('[data-testid="toggle-empty-groups"]')).toHaveCount(0);
    await expect(page.getByText('卫星总体结构')).toBeVisible();
    await expect(page.getByText('推进系统管路图')).toBeVisible();

    // Switch to UNLINKED -> only assetB remains
    await page.getByTestId('scope-selector-trigger').click();
    await page.getByTestId('scope-option-unlinked').click();
    await expect(page.getByText('推进系统管路图')).toBeVisible();
    await expect(page.locator('text=卫星总体结构')).toHaveCount(0);
  });

	  test('AC4: switching org views clears filters and shows toast', async ({ page }) => {
	    await openDataLibraryDrawer(page);

    // Use "all" scope so assets are visible for assertions.
    await page.getByTestId('scope-selector-trigger').click();
    await page.getByTestId('scope-option-all').click();

    // Apply filters (badge + empty)
    await page.getByTestId('asset-search-input').fill('卫星');
    await page.getByTestId('type-filter-select').selectOption('STEP');
    await expect(page.getByTestId('filter-badge')).toContainText('已应用 2 个筛选');

	    // Switch to folder view => filters reset + toast
	    await page.getByTestId('org-tab-folder').click();
	    await expect(page.getByText('筛选已重置')).toBeVisible();
	    await expect(page.getByTestId('asset-search-input')).toHaveValue('');
	    await expect(page.getByTestId('type-filter-select')).toHaveValue('');
	    await expect(page.locator('[data-testid="filter-badge"]')).toHaveCount(0);

    // With filters cleared, both assets should be visible in folder view.
    await expect(page.getByText('卫星总体结构')).toBeVisible();
    await expect(page.getByText('推进系统管路图')).toBeVisible();
  });
});
