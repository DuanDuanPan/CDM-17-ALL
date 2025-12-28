import { test, expect } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

test.describe('Edit Mode', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  test('should enter edit mode on double-click', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();

    // Double-click to enter edit mode
    await centerNode.dblclick();

    // Verify edit input is visible and focused
    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();
  });

  test('should enter edit mode on Space key', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await centerNode.click();

    // Press Space to enter edit mode
    await page.keyboard.press('Space');

    // Verify edit input is visible
    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible();
  });

  test('should save text on Enter key', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await centerNode.click();

    const originalTitle = (await centerNode.locator('span').first().textContent())?.trim() || '';

    await centerNode.dblclick();

    // Clear and type new text
    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible();
    await editInput.fill('修改后的标题');

    // Press Enter to save
    await editInput.press('Enter');

    // Verify text was saved
    await expect(page.locator('.x6-node', { hasText: '修改后的标题' }).first()).toBeVisible();

    // Restore original title to avoid cross-test pollution (center-node is persisted)
    if (originalTitle) {
      await centerNode.dblclick();
      const restoreInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
      await expect(restoreInput).toBeVisible();
      await restoreInput.fill(originalTitle);
      await restoreInput.press('Enter');
      await expect(centerNode.locator('span').first()).toHaveText(originalTitle);
    }
  });

  test('should cancel edit on Escape key', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await centerNode.click();
    const originalTitle = (await centerNode.locator('span').first().textContent())?.trim() || '';

    await centerNode.dblclick();

    // Type new text
    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible();
    await editInput.fill('临时文本');

    // Press Escape to cancel
    await editInput.press('Escape');

    // Verify original text is still there
    await expect(centerNode.locator('span').first()).toHaveText(originalTitle);
  });
});
