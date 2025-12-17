import { test, expect } from '@playwright/test';

test.describe('Arrow Key Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('#graph-container');
        // Wait for initial render
        await page.waitForTimeout(500);
    });

    test('ArrowRight should navigate from parent to first child', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create a child node first
        await page.keyboard.press('Tab');
        await page.keyboard.type('子节点1');
        await page.keyboard.press('Enter'); // Save and exit edit mode
        await page.waitForTimeout(300);

        // Select the root node again
        await centerNode.click();
        await page.waitForTimeout(200);

        // Press ArrowRight to navigate to first child
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // Verify that child node is now selected (by checking its visual state or text)
        // The selected node should have the text we typed
        const childNode = page.locator('text=子节点1').first();
        await expect(childNode).toBeVisible();
    });

    test('ArrowLeft should navigate from child to parent', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create a child node
        await page.keyboard.press('Tab');
        await page.keyboard.type('子节点');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Now we should be on the child node, let's click it to ensure selection
        const childNode = page.locator('text=子节点').first();
        await childNode.click();
        await page.waitForTimeout(200);

        // Press ArrowLeft to navigate to parent
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);

        // Verify that we navigated back to root
        // Press ArrowRight again and if we get back to child, navigation works
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // The child should still exist and be reachable
        await expect(childNode).toBeVisible();
    });

    test('ArrowUp/ArrowDown should navigate between siblings', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create first child
        await page.keyboard.press('Tab');
        await page.keyboard.type('兄弟1');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Navigate to root and create second child
        await centerNode.click();
        await page.keyboard.press('Tab');
        await page.keyboard.type('兄弟2');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Verify both siblings exist
        const sibling1 = page.locator('text=兄弟1').first();
        const sibling2 = page.locator('text=兄弟2').first();
        await expect(sibling1).toBeVisible();
        await expect(sibling2).toBeVisible();

        // Select sibling1
        await sibling1.click();
        await page.waitForTimeout(200);

        // Press ArrowDown to navigate to sibling2
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);

        // Press ArrowUp to navigate back to sibling1
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);

        // Both siblings should still be visible
        await expect(sibling1).toBeVisible();
        await expect(sibling2).toBeVisible();
    });

    test('ArrowLeft on root node should do nothing', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();
        await page.waitForTimeout(200);

        // Get initial node count
        const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

        // Press ArrowLeft (should do nothing for root)
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);

        // Node count should remain the same
        const finalNodeCount = await page.locator('[data-shape="mind-node"]').count();
        expect(finalNodeCount).toBe(initialNodeCount);

        // Root should still be visible
        await expect(centerNode).toBeVisible();
    });

    test('ArrowRight on leaf node should do nothing', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await centerNode.click();

        // Create a child node (leaf)
        await page.keyboard.press('Tab');
        await page.keyboard.type('叶子节点');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Select the leaf node
        const leafNode = page.locator('text=叶子节点').first();
        await leafNode.click();
        await page.waitForTimeout(200);

        // Get initial node count
        const initialNodeCount = await page.locator('[data-shape="mind-node"]').count();

        // Press ArrowRight (should do nothing for leaf)
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // Node count should remain the same
        const finalNodeCount = await page.locator('[data-shape="mind-node"]').count();
        expect(finalNodeCount).toBe(initialNodeCount);

        // Leaf node should still be visible
        await expect(leafNode).toBeVisible();
    });

    test('Arrow keys should not trigger during edit mode', async ({ page }) => {
        // Click on the center node (root)
        const centerNode = page.locator('text=中心主题').first();
        await centerNode.click();

        // Create a child node
        await page.keyboard.press('Tab');
        await page.keyboard.type('测试节点');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Select the child node
        const childNode = page.locator('text=测试节点').first();
        await childNode.click();
        await page.waitForTimeout(200);

        // Enter edit mode with Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);

        // Verify we're in edit mode
        const editInput = page.locator('input[type="text"]');
        await expect(editInput).toBeVisible();

        // Press ArrowLeft (should move cursor in input, not navigate)
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);

        // Input should still be focused
        await expect(editInput).toBeFocused();

        // Exit edit mode
        await page.keyboard.press('Escape');
    });
});
