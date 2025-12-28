import { test, expect } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

test.describe('Enter Key Node Creation', () => {
  test('should support continuous Enter create-flow (create -> edit -> save -> create)', async ({
    page,
  }, testInfo) => {
    await gotoTestGraph(page, testInfo);

    // Select root
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    // Enter on root: creates a child and enters edit mode
    await page.keyboard.press('Enter');
    const input1 = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(input1).toBeVisible();
    await expect(input1).toBeFocused();

    await input1.fill('节点1');
    await input1.press('Enter'); // save (edit mode)
    await expect(page.locator('.x6-node', { hasText: '节点1' }).first()).toBeVisible();

    // Enter again (browse mode): creates next sibling and enters edit mode
    await page.keyboard.press('Enter');
    const input2 = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(input2).toBeVisible();
    await expect(input2).toBeFocused();

    await input2.fill('节点2');
    await input2.press('Enter'); // save
    await expect(page.locator('.x6-node', { hasText: '节点2' }).first()).toBeVisible();

    const newNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(newNodeCount).toBeGreaterThanOrEqual(initialNodeCount + 2);
  });
});
