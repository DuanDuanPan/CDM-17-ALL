import { test, expect } from '@playwright/test';

test.describe('Enter Key Node Creation', () => {
  test('should support continuous Enter create-flow (create -> edit -> save -> create)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    // Select root
    const centerNode = page.locator('text=中心主题').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    // Enter on root: creates a child and enters edit mode
    await page.keyboard.press('Enter');
    const input1 = page.locator('input[type="text"]');
    await expect(input1).toBeVisible();
    await expect(input1).toBeFocused();

    await page.keyboard.type('节点1');
    await page.keyboard.press('Enter'); // save (edit mode)
    await expect(page.locator('text=节点1')).toBeVisible();

    // Enter again (browse mode): creates next sibling and enters edit mode
    await page.keyboard.press('Enter');
    const input2 = page.locator('input[type="text"]');
    await expect(input2).toBeVisible();
    await expect(input2).toBeFocused();

    await page.keyboard.type('节点2');
    await page.keyboard.press('Enter'); // save
    await expect(page.locator('text=节点2')).toBeVisible();

    const newNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(newNodeCount).toBeGreaterThanOrEqual(initialNodeCount + 2);
  });
});

