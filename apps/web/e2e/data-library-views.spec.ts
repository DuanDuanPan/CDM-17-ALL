/**
 * Story 9.2: Multi-Dimensional Organization Views E2E Tests
 *
 * Covers PBS/Task/Folder tabs, empty states, and basic drag-drop flow.
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

async function createFolder(page: Page, graphId: string, name: string) {
  const response = await page.request.post('/api/data-assets/folders', {
    data: {
      graphId,
      name,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { folder?: { id: string; name: string } };
  if (!body.folder?.id) throw new Error('Create folder response missing folder.id');
  return body.folder;
}

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

test.describe('Data Library Organization Views (Story 9.2)', () => {
  let graphId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    graphId = await createTestGraph(page, testInfo);
    await seedDataAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();
  });

  test('AC6: shows empty states for PBS/Task/Folder views', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Default PBS view
    await expect(page.getByTestId('organization-tabs')).toBeVisible();
    await expect(page.getByTestId('empty-state-pbs')).toBeVisible();

    // Task view
    await page.getByTestId('org-tab-task').click();
    await expect(page.getByTestId('empty-state-task')).toBeVisible();

    // Folder view (no folders yet)
    await page.getByTestId('org-tab-folder').click();
    await expect(page.getByTestId('empty-state-folder')).toBeVisible();
  });

  test('AC4: drag asset into folder updates folder label in list view', async ({ page }) => {
    const folder = await createFolder(page, graphId, '结构设计');

    await openDataLibraryDrawer(page);
    await page.getByTestId('org-tab-folder').click();

    // Folder tree should show the created folder
    await expect(page.getByTestId('folder-tree')).toBeVisible();
    await expect(page.getByTestId(`folder-tree-node-${folder.id}`)).toBeVisible();

    // Assets should be draggable in folder view
    const assetCard = page
      .getByText('卫星总体结构')
      .locator('xpath=ancestor::div[@draggable][1]');
    await expect(assetCard).toHaveAttribute('draggable', 'true');

    // Drag into folder
    await assetCard.dragTo(page.getByTestId(`folder-tree-node-${folder.id}`));

    // Switch to list view to verify the folder label is visible
    await page.getByTitle('列表视图').click();
    await expect(page.getByTestId('asset-list')).toBeVisible();
    await expect(page.getByText(`📁 ${folder.name}`)).toBeVisible();
  });
});
