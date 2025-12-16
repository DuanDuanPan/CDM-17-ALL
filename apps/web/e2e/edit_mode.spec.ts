import { test, expect } from '@playwright/test';

test.describe('Edit Mode', () => {
  test('should enter edit mode on double-click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await expect(centerNode).toBeVisible();

    // Double-click to enter edit mode
    await centerNode.dblclick();
    await page.waitForTimeout(300);

    // Verify edit input is visible and focused
    const editInput = page.locator('input[type="text"]');
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();
  });

  test('should enter edit mode on Space key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await centerNode.click();

    // Press Space to enter edit mode
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Verify edit input is visible
    const editInput = page.locator('input[type="text"]');
    await expect(editInput).toBeVisible();
  });

  test('should save text on Enter key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await centerNode.dblclick();
    await page.waitForTimeout(300);

    // Clear and type new text
    await page.keyboard.press('Control+A');
    await page.keyboard.type('修改后的标题');

    // Press Enter to save
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify text was saved
    await expect(page.locator('text=修改后的标题')).toBeVisible();
  });

  test('should cancel edit on Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    const centerNode = page.locator('text=中心主题').first();
    await centerNode.dblclick();
    await page.waitForTimeout(300);

    // Type new text
    await page.keyboard.press('Control+A');
    await page.keyboard.type('临时文本');

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify original text is still there
    await expect(page.locator('text=中心主题')).toBeVisible();
    await expect(page.locator('text=临时文本')).not.toBeVisible();
  });
});
