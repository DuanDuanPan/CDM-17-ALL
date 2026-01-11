/**
 * Story 9.3: Model Viewer E2E Tests
 *
 * Tests for the 3D model preview functionality in the Data Library.
 *
 * Note: These tests mock the model loading since actual STEP/glTF files
 * require significant setup. The tests verify the UI interaction flow.
 */

import { test, expect, type Page } from '@playwright/test';
import { createTestGraph, makeTestGraphUrl } from './testUtils';

async function seedPreviewableAsset(page: Page, graphId: string) {
  // Create a glTF format asset that supports preview (fast-loading local mock)
  const asset = await page.request.post('/api/data-assets', {
    data: {
      name: 'Box.glb',
      description: 'glTF model for preview testing',
      format: 'GLTF',
      fileSize: 2048,
      storagePath: '/mock/storage/Box.glb',
      version: 'v1.0.0',
      tags: ['3D模型', 'glTF'],
      graphId,
      secretLevel: 'internal',
    },
  });
  expect(asset.ok()).toBeTruthy();
  return asset.json();
}

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

test.describe('Model Viewer (Story 9.3)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedPreviewableAsset(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();
  });

  // === AC1: Preview button appears on hover for 3D formats ===

  test('AC1: shows preview button on hover for glTF format assets', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Find the asset card
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await expect(assetCard).toBeVisible();

    // Hover to reveal preview button
    await assetCard.hover();
    const previewButton = assetCard.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
  });

  test('AC2: opens modal on preview button click', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Find and hover over asset card
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.hover();

    // Click preview button
    const previewButton = assetCard.locator('[data-testid="preview-button"]');
    await previewButton.click();

    // Verify modal opens
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });

  test('AC3: opens modal on double-click for 3D formats', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Find asset card
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await expect(assetCard).toBeVisible();

    // Double-click to open preview
    await assetCard.dblclick();

    // Verify modal opens
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });

  test('AC4: closes modal on ESC key', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    // Press ESC to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="model-viewer-modal"]')).not.toBeVisible();
  });

  test('AC5: closes modal on backdrop click', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.dblclick();
    const modal = page.locator('[data-testid="model-viewer-modal"]');
    await expect(modal).toBeVisible();

    // Click on backdrop (outside modal content)
    await modal.click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });

  test('AC6: closes modal on X button click', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    // Click X button
    await page.getByTitle('关闭').click();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).not.toBeVisible();
  });

  // === Viewer Toolbar Tests ===

  test('shows viewer toolbar in modal', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    // Verify toolbar is visible
    await expect(page.locator('[data-testid="viewer-toolbar"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="edge-toggle"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="reset-view-button"]')).toBeVisible({ timeout: 15000 });
  });

  test('toggles edge display', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]').first();
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    // Find edge toggle
    const edgeToggle = page.locator('[data-testid="edge-toggle"]');
    await expect(edgeToggle).toBeVisible({ timeout: 15000 });

    // Initial state should be checked (edges enabled by default)
    await expect(edgeToggle).toHaveAttribute('data-state', 'checked');

    // Click to toggle off
    await edgeToggle.click();
    await expect(edgeToggle).toHaveAttribute('data-state', 'unchecked');

    // Click to toggle back on
    await edgeToggle.click();
    await expect(edgeToggle).toHaveAttribute('data-state', 'checked');
  });

  // === List View Tests ===

  test('shows preview button in list view', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Switch to list view
    await page.getByTitle('列表视图').click();
    await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();

    // Hover over list row
    const listRow = page.locator('[data-testid="asset-list-row"]').first();
    await listRow.hover();

    // Preview button should be visible
    const previewButton = listRow.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
  });
});
