import { test, expect } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

test.describe('Tab Key Creates Child Node', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  test('should create a child node and enter edit mode', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    await page.keyboard.press('Tab');

    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();

    const newNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(newNodeCount).toBeGreaterThan(initialNodeCount);
  });

  test('should create multiple children under the same parent', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    // Child 1
    await page.keyboard.press('Tab');
    const child1Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(child1Input).toBeVisible();
    await child1Input.fill('子节点1');
    await child1Input.press('Enter'); // save
    await expect(page.locator('.x6-node', { hasText: '子节点1' }).first()).toBeVisible();

    // Re-select parent and create Child 2
    await centerNode.click();
    await page.keyboard.press('Tab');
    const child2Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(child2Input).toBeVisible();
    await child2Input.fill('子节点2');
    await child2Input.press('Enter'); // save
    await expect(page.locator('.x6-node', { hasText: '子节点2' }).first()).toBeVisible();
  });
});
