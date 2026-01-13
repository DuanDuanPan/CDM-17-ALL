/**
 * Story 9.5: Data Upload & Node Linking E2E Tests
 *
 * Covers:
 * - AC1/AC2: Upload assets and format detection
 * - AC3: Link asset to TASK node with input/output link types
 * - AC4: Property panel shows linked assets + supports preview
 * - AC5: Unlink removes association but keeps asset
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { createTestGraph, makeTestGraphUrl } from './testUtils';

const waitForApi = (page: Page, method: string, pathPart: string) =>
  page.waitForResponse((res) => res.url().includes(pathPart) && res.request().method() === method && res.ok());

async function openDataLibraryDrawer(page: Page) {
  await page.getByTitle('数据资源库').click();
  await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
}

async function createLinkableTaskNode(page: Page, label: string) {
  const centerNode = page.locator('.x6-node[data-cell-id="center-node"]').first();
  await expect(centerNode).toBeVisible();

  // Create a child node (unique id, avoids cross-graph center-node persistence)
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

  // Ensure node exists in backend (avoid linking to a node that hasn't been created yet)
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`/api/nodes/${encodeURIComponent(nodeId)}`);
    if (res.ok()) break;
    await page.waitForTimeout(200);
  }

  const typeSelect = propertyPanel.locator('select').first();
  await expect(typeSelect).toBeVisible();

  await Promise.all([
    waitForApi(page, 'PATCH', '/type'),
    typeSelect.selectOption('TASK'),
  ]);

  await expect(propertyPanel.locator('[data-testid="linked-assets-section"]')).toBeVisible();

  return { nodeId, label };
}

async function uploadFixture(page: Page, absoluteFilePath: string) {
  // Story 9.7: Upload is context-aware. When no node is selected (unlinked mode),
  // a confirm dialog is shown before uploading to the "unlinked" area.
  const input = page.locator('[data-testid="upload-file-input"]');
  await input.setInputFiles(absoluteFilePath);

  const confirm = page.getByRole('button', { name: '上传到未关联' });
  await expect(confirm).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/data-assets:upload') &&
        res.request().method() === 'POST' &&
        res.ok()
    ),
    confirm.click(),
  ]);
}

async function linkAssetToTaskNode(page: Page, opts: { assetName: string; nodeLabel: string; linkTypeButtonLabel: string }) {
  const assetCard = page.locator('[data-testid="asset-card"]', { hasText: opts.assetName });
  await expect(assetCard).toBeVisible();

  await assetCard.hover();
  await expect(assetCard.locator('[data-testid="link-button"]')).toBeVisible();
  await assetCard.locator('[data-testid="link-button"]').click();

  const dialog = page.locator('[data-testid="link-asset-dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('button').filter({ hasText: opts.nodeLabel }).first().click();
  await dialog.getByRole('button', { name: opts.linkTypeButtonLabel }).click();

  const linkResponse = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/data-assets/links') &&
        res.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: '确认' }).click(),
  ]).then(([res]) => res);

  if (!linkResponse.ok()) {
    const body = await linkResponse.text().catch(() => '');
    throw new Error(`Failed to create link: status=${linkResponse.status()} body=${body}`);
  }

  await expect(dialog).not.toBeVisible();
}

function linkedRowLocator(page: Page, assetName: string) {
  // Find the row container via the title attribute on the asset name element.
  return page.locator(
    `xpath=//div[@data-testid="linked-assets-section"]//div[@title="${assetName}"]/ancestor::div[contains(@class,"group")]`
  ).first();
}

test.describe('Data Upload & Node Linking (Story 9.5)', () => {
  test.describe.configure({ timeout: 90_000 });

  test('uploads, links, previews, and unlinks assets', async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo);
    await page.goto(makeTestGraphUrl(graphId));
    await page.waitForSelector('#graph-container');
    await expect(page.getByTitle('数据资源库')).toBeVisible();

    // Ensure at least one linkable node exists (TASK) and is graph-scoped
    const linkNode = await createLinkableTaskNode(page, `E2E Link Node ${testInfo.testId}`);

    await openDataLibraryDrawer(page);

    const fixturesDir = path.join(__dirname, 'fixtures');
    const stepPath = path.join(fixturesDir, 'upload-sample.step');
    const stlPath = path.join(fixturesDir, 'upload-sample.stl');
    const vtkPath = path.join(fixturesDir, 'upload-sample.vtk');
    const pdfPath = path.join(fixturesDir, 'upload-sample.pdf');
    const unknownPath = path.join(fixturesDir, 'upload-sample.unknown');

    // AC1/AC2: Upload (STEP/STL/VTK/PDF/UNKNOWN)
    await uploadFixture(page, stepPath);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.step' })).toBeVisible();
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.step' })).toContainText('STEP');

    await uploadFixture(page, stlPath);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.stl' })).toBeVisible();
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.stl' })).toContainText('STL');

    await uploadFixture(page, vtkPath);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.vtk' })).toBeVisible();
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.vtk' })).toContainText('OTHER');

    await uploadFixture(page, pdfPath);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.pdf' })).toBeVisible();
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.pdf' })).toContainText('PDF');

    await uploadFixture(page, unknownPath);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.unknown' })).toBeVisible();
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.unknown' })).toContainText('OTHER');

    // AC3: Link to node (input/output)
    await linkAssetToTaskNode(page, { assetName: 'upload-sample.stl', nodeLabel: linkNode.label, linkTypeButtonLabel: '输入 (Input)' });
    await linkAssetToTaskNode(page, { assetName: 'upload-sample.vtk', nodeLabel: linkNode.label, linkTypeButtonLabel: '输出 (Output)' });

    // Close drawer so property panel is accessible
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    await expect(propertyPanel).toBeVisible();

    const linkedSection = propertyPanel.locator('[data-testid="linked-assets-section"]');
    await expect(linkedSection).toBeVisible();

    // AC4: Shows linked assets with format + link type badges
    await expect(linkedSection).toContainText('upload-sample.stl');
    await expect(linkedSection).toContainText('upload-sample.vtk');
    await expect(linkedSection.locator('[data-testid="link-type-badge"]', { hasText: 'INPUT' })).toBeVisible();
    await expect(linkedSection.locator('[data-testid="link-type-badge"]', { hasText: 'OUTPUT' })).toBeVisible();

    // AC4: Preview from property panel (model + contour)
    const stlRow = linkedRowLocator(page, 'upload-sample.stl');
    await stlRow.hover();
    await stlRow.locator('[data-testid="asset-preview-button"]').click();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="model-viewer-modal"]')).not.toBeVisible();

    const vtkRow = linkedRowLocator(page, 'upload-sample.vtk');
    await vtkRow.hover();
    await vtkRow.locator('[data-testid="asset-preview-button"]').click();
    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="contour-viewer-modal"]')).not.toBeVisible();

    // AC5: Unlink removes association but keeps asset
    await vtkRow.hover();
    await Promise.all([
      waitForApi(page, 'DELETE', '/api/data-assets/links:destroy'),
      vtkRow.locator('[data-testid="asset-unlink-button"]').click(),
    ]);

    await expect(linkedSection).not.toContainText('upload-sample.vtk');

    // Asset still exists in the data library drawer
    await openDataLibraryDrawer(page);
    await expect(page.locator('[data-testid="asset-card"]', { hasText: 'upload-sample.vtk' })).toBeVisible();
  });
});
