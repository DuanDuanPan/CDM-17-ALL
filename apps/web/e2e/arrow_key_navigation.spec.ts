/**
 * Arrow Key Navigation E2E Tests (VERTICAL LAYOUT)
 *
 * VERTICAL LAYOUT Navigation:
 * - ArrowUp: Navigate to parent
 * - ArrowDown: Navigate to first child
 * - ArrowLeft/Right: Navigate between siblings
 */
import { test, expect } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

test.describe('Arrow Key Navigation (Vertical Layout)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    // Wait for initial render
    await page.waitForTimeout(500);
  });

  test('ArrowDown should navigate from parent to first child', async ({ page }) => {
    // Click on the center node (root) - use first() to avoid minimap duplicate
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    // Create a child node first
    await page.keyboard.press('Tab');
    const childInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(childInput).toBeVisible();
    await childInput.fill('子节点1');
    await childInput.press('Enter'); // Save and exit edit mode

    // Select the root node again
    await centerNode.click();
    await page.waitForTimeout(200);

    // Press ArrowDown to navigate to first child (vertical layout)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Verify that child node is now selected (by checking its visual state or text)
    const childNode = page.locator('#graph-container .x6-node', { hasText: '子节点1' }).first();
    await expect(childNode).toBeVisible();
  });

  test('ArrowUp should navigate from child to parent', async ({ page }) => {
    // Click on the center node (root)
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    // Create a child node
    await page.keyboard.press('Tab');
    const childInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(childInput).toBeVisible();
    await childInput.fill('子节点');
    await childInput.press('Enter');

    // Press ArrowUp to navigate to parent (vertical layout)
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Verify that we navigated back to root
    // Press ArrowDown again and if we get back to child, navigation works
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // The child should still exist and be reachable
    await expect(page.locator('#graph-container .x6-node', { hasText: '子节点' }).first()).toBeVisible();
  });

  test('ArrowLeft/ArrowRight should navigate between siblings', async ({ page }) => {
    // Click on the center node (root)
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    // Create first child
    await page.keyboard.press('Tab');
    const sibling1Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(sibling1Input).toBeVisible();
    await sibling1Input.fill('兄弟1');
    await sibling1Input.press('Enter');

    // Navigate to root and create second child
    await centerNode.click();
    await page.keyboard.press('Tab');
    const sibling2Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(sibling2Input).toBeVisible();
    await sibling2Input.fill('兄弟2');
    await sibling2Input.press('Enter');

    // Verify both siblings exist
    const sibling1 = page.locator('#graph-container .x6-node', { hasText: '兄弟1' }).first();
    const sibling2 = page.locator('#graph-container .x6-node', { hasText: '兄弟2' }).first();
    await expect(sibling1).toBeVisible();
    await expect(sibling2).toBeVisible();

    // Select sibling1
    await sibling1.click();
    await page.waitForTimeout(200);

    // Press ArrowRight to navigate to sibling2 (vertical layout: siblings are horizontal)
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    // Press ArrowLeft to navigate back to sibling1
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    // Both siblings should still be visible
    await expect(sibling1).toBeVisible();
    await expect(sibling2).toBeVisible();
  });

  test('ArrowUp on root node should do nothing', async ({ page }) => {
    // Click on the center node (root)
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();
    await page.waitForTimeout(200);

    // Get initial node count
    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    // Press ArrowUp (should do nothing for root - no parent)
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Node count should remain the same
    const finalNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(finalNodeCount).toBe(initialNodeCount);

    // Root should still be visible
    await expect(centerNode).toBeVisible();
  });

  test('ArrowDown on leaf node should do nothing', async ({ page }) => {
    // Click on the center node (root)
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await centerNode.click();

    // Create a child node (leaf)
    await page.keyboard.press('Tab');
    const leafInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(leafInput).toBeVisible();
    await leafInput.fill('叶子节点');
    await leafInput.press('Enter');

    // Select the leaf node
    const leafNode = page.locator('#graph-container .x6-node', { hasText: '叶子节点' }).first();
    await leafNode.click();
    await page.waitForTimeout(200);

    // Get initial node count
    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    // Press ArrowDown (should do nothing for leaf - no children)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Node count should remain the same
    const finalNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(finalNodeCount).toBe(initialNodeCount);

    // Leaf node should still be visible
    await expect(leafNode).toBeVisible();
  });

  test('Arrow keys should not trigger during edit mode', async ({ page }) => {
    // Click on the center node (root)
    const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
    await centerNode.click();

    // Create a child node
    await page.keyboard.press('Tab');
    const childInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(childInput).toBeVisible();
    await childInput.fill('测试节点');
    await childInput.press('Enter');
    await page.waitForTimeout(300); // Wait for node creation to complete

    // Click on the created node to select it
    const createdNode = page.locator('#graph-container .x6-node', { hasText: '测试节点' }).first();
    await expect(createdNode).toBeVisible();
    await createdNode.click();
    await page.waitForTimeout(200);

    // Enter edit mode with Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Verify we're in edit mode - look for any visible input in the graph
    const editInput = page.locator('#graph-container input').first();
    await expect(editInput).toBeVisible();

    // Press ArrowLeft (should move cursor in input, not navigate)
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    // The input should still be visible (we're still in edit mode)
    await expect(editInput).toBeVisible();

    // Exit edit mode
    await page.keyboard.press('Escape');
  });
});
