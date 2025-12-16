import { test, expect } from '@playwright/test';

test.describe('Tab Key Creates Child Node', () => {
  test('should create a child node and enter edit mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

    await page.keyboard.press('Tab');

    const editInput = page.locator('input[type="text"]');
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();

    const newNodeCount = await page.locator('[data-shape="mind-node"]').count();
    expect(newNodeCount).toBeGreaterThan(initialNodeCount);
  });

  test('should create multiple children under the same parent', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await expect(centerNode).toBeVisible();
    await centerNode.click();

    // Child 1
    await page.keyboard.press('Tab');
    await page.keyboard.type('子节点1');
    await page.keyboard.press('Enter'); // save
    await expect(page.locator('text=子节点1')).toBeVisible();

    // Re-select parent and create Child 2
    await centerNode.click();
    await page.keyboard.press('Tab');
    await page.keyboard.type('子节点2');
    await page.keyboard.press('Enter'); // save
    await expect(page.locator('text=子节点2')).toBeVisible();
  });
});

