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

  test('AC3: creating a subfolder from context menu renders input and creates folder', async ({ page }) => {
    const parentFolder = await createFolder(page, graphId, '父文件夹');

    await openDataLibraryDrawer(page);
    await page.getByTestId('org-tab-folder').click();

    const parentRow = page.getByTestId(`folder-tree-node-${parentFolder.id}`);
    await expect(parentRow).toBeVisible();

    await parentRow.hover();
    const menuButton = page.getByTestId(`folder-tree-menu-${parentFolder.id}`);
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    await page.getByRole('button', { name: '新建子文件夹' }).click();

    const input = page.getByPlaceholder('新文件夹名称');
    await expect(input).toBeVisible();
    await input.fill('子文件夹-1');
    await input.press('Enter');

    await expect(page.getByTestId('folder-tree').getByText('子文件夹-1')).toBeVisible();
  });

  test('AC3: deleting an empty folder shows confirm dialog and removes it', async ({ page }) => {
    const folder = await createFolder(page, graphId, '待删除文件夹');

    await openDataLibraryDrawer(page);
    await page.getByTestId('org-tab-folder').click();

    const folderRow = page.getByTestId(`folder-tree-node-${folder.id}`);
    await expect(folderRow).toBeVisible();

    await folderRow.hover();
    const menuButton = page.getByTestId(`folder-tree-menu-${folder.id}`);
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Click "删除" in the folder context menu
    await page.getByRole('button', { name: '删除' }).click();

    // Confirmation dialog should appear
    await expect(page.getByText('删除文件夹')).toBeVisible();
    await expect(page.getByText('确定要删除此文件夹吗？（仅支持删除空文件夹）')).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: '删除' }).click();

    // Folder should no longer be visible in tree
    await expect(folderRow).not.toBeVisible();
  });
});
