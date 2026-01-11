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

async function seedModelAsset(page: Page, graphId: string) {
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

async function seedContourAssets(page: Page, graphId: string) {
  const vtpAsset = await page.request.post('/api/data-assets', {
    data: {
      name: '热控系统温度场.vtp',
      description: 'VTP contour for preview testing',
      format: 'OTHER',
      fileSize: 4096,
      storagePath: '/mock/storage/热控系统温度场.vtp',
      version: 'v1.0.0',
      tags: ['CONTOUR'],
      graphId,
      secretLevel: 'internal',
    },
  });
  expect(vtpAsset.ok()).toBeTruthy();

  const jsonAsset = await page.request.post('/api/data-assets', {
    data: {
      name: '结构应力分析.scalar.json',
      description: 'Scalar-field-json contour for preview testing',
      format: 'JSON',
      fileSize: 1024,
      storagePath: '/mock/storage/结构应力分析.scalar.json',
      version: 'v1.0.0',
      tags: ['CONTOUR'],
      graphId,
      secretLevel: 'internal',
    },
  });
  expect(jsonAsset.ok()).toBeTruthy();
}

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

test.describe('Model Viewer (Story 9.3)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await seedModelAsset(page, graphId);
    await seedContourAssets(page, graphId);

    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();
  });

  // === AC1: Preview button appears on hover for 3D formats ===

  test('AC1: shows preview button on hover for glTF format assets', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
    await expect(assetCard).toBeVisible();

    // Hover to reveal preview button
    await assetCard.hover();
    const previewButton = assetCard.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
  });

  test('AC2: opens modal on preview button click', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Find and hover over asset card
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
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
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
    await expect(assetCard).toBeVisible();

    // Double-click to open preview
    await assetCard.dblclick();

    // Verify modal opens
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });

  test('AC4: closes modal on ESC key', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    // Press ESC to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="model-viewer-modal"]')).not.toBeVisible();
  });

  test('AC5: closes modal on backdrop click', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Open preview modal
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
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
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
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
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
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
    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
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
    const listRow = page.locator('[data-testid="asset-list-row"]', { hasText: 'Box.glb' });
    await listRow.hover();

    // Preview button should be visible
    const previewButton = listRow.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
  });

  test('Story 9.4 AC2: toggles render mode in toolbar', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'Box.glb' });
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();

    const renderModeToggle = page.locator('[data-testid="render-mode-toggle"]');
    await expect(renderModeToggle).toBeVisible({ timeout: 15000 });
    await expect(renderModeToggle).toHaveAttribute('data-mode', 'solid');

    await renderModeToggle.click();
    await expect(renderModeToggle).toHaveAttribute('data-mode', 'wireframe');

    await renderModeToggle.click();
    await expect(renderModeToggle).toHaveAttribute('data-mode', 'solid');
  });

  test('Story 9.4 AC3/4/5: opens contour modal and shows controls', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '热控系统温度场.vtp' });
    await expect(assetCard).toBeVisible();
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="color-scale-control"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="colormap-select"] option')).toHaveCount(3);
    await expect(page.locator('[data-testid="scalar-min"]')).toBeVisible();
    await expect(page.locator('[data-testid="scalar-max"]')).toBeVisible();
  });

  // === Story 9.4 H2: Additional E2E Tests ===

  test('Story 9.4 AC1: opens mesh preview for STL format (Grid view)', async ({ page }) => {
    // Seed STL asset
    const graphId = await page.evaluate(() => window.location.pathname.split('/').pop());
    await page.request.post('/api/data-assets', {
      data: {
        name: '帆板网格模型.stl',
        description: 'STL mesh for preview testing',
        format: 'STL',
        fileSize: 2048,
        storagePath: '/mock/storage/帆板网格模型.stl',
        version: 'v1.0.0',
        tags: ['MESH'],
        graphId,
        secretLevel: 'internal',
      },
    });

    // Refresh drawer to see new asset
    await page.keyboard.press('Escape');
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '帆板网格模型.stl' });
    await expect(assetCard).toBeVisible();
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });

  test('Story 9.4 AC1: opens mesh preview for OBJ format', async ({ page }) => {
    // Seed OBJ asset
    const graphId = await page.evaluate(() => window.location.pathname.split('/').pop());
    await page.request.post('/api/data-assets', {
      data: {
        name: 'SolarPanel.obj',
        description: 'OBJ mesh for preview testing',
        format: 'OBJ',
        fileSize: 2048,
        storagePath: '/mock/storage/SolarPanel.obj',
        version: 'v1.0.0',
        tags: ['MESH'],
        graphId,
        secretLevel: 'internal',
      },
    });

    await page.keyboard.press('Escape');
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: 'SolarPanel.obj' });
    await expect(assetCard).toBeVisible();
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });

  test('Story 9.4 AC3: opens JSON scalar field contour preview (M4)', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '结构应力分析.scalar.json' });
    await expect(assetCard).toBeVisible();
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="contour-viewer-container"]')).toBeVisible({ timeout: 15000 });
  });

  test('Story 9.4 AC4: colormap select changes trigger update (M3)', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '热控系统温度场.vtp' });
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
    const colormapSelect = page.locator('[data-testid="colormap-select"]');
    await expect(colormapSelect).toBeVisible({ timeout: 15000 });

    // Change colormap to Jet
    await colormapSelect.selectOption('jet');
    await expect(colormapSelect).toHaveValue('jet');

    // Change colormap to Coolwarm
    await colormapSelect.selectOption('coolwarm');
    await expect(colormapSelect).toHaveValue('coolwarm');
  });

  test('Story 9.4 AC5: range input displays initial values and accepts changes', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '热控系统温度场.vtp' });
    await assetCard.dblclick();

    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
    const minInput = page.locator('[data-testid="scalar-min"]');
    const maxInput = page.locator('[data-testid="scalar-max"]');
    await expect(minInput).toBeVisible({ timeout: 15000 });
    await expect(maxInput).toBeVisible({ timeout: 15000 });

    // Check initial values exist
    const minValue = await minInput.inputValue();
    const maxValue = await maxInput.inputValue();
    expect(minValue).toBeTruthy();
    expect(maxValue).toBeTruthy();

    // Modify range values
    await minInput.fill('10');
    await minInput.blur();
    await maxInput.fill('90');
    await maxInput.blur();

    // Verify values are updated
    await expect(minInput).toHaveValue('10');
    await expect(maxInput).toHaveValue('90');
  });

  test('Story 9.4: contour modal closes on ESC key', async ({ page }) => {
    await openDataLibraryDrawer(page);

    const assetCard = page.locator('[data-testid="asset-card"]', { hasText: '热控系统温度场.vtp' });
    await assetCard.dblclick();
    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="contour-viewer-modal"]')).not.toBeVisible();
  });

  test('Story 9.4 AC1: opens mesh preview in List view', async ({ page }) => {
    await openDataLibraryDrawer(page);

    // Switch to list view
    await page.getByTitle('列表视图').click();
    await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();

    // Double-click list row to open preview
    const listRow = page.locator('[data-testid="asset-list-row"]', { hasText: 'Box.glb' });
    await expect(listRow).toBeVisible();
    await listRow.dblclick();

    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });
});
