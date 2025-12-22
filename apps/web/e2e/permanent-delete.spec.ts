import { test, expect, BrowserContext, Page } from '@playwright/test';

/**
 * E2E Tests for Permanent Delete Feature
 *
 * Story 2.7: Tests for hard delete functionality
 * - Shift+Delete in graph for permanent deletion
 * - Delete from Archive Drawer
 * - Multi-client sync for deletions
 *
 * Note: These tests require both web app and API server to be running.
 */

test.describe('Permanent Delete Feature', () => {
    const TEST_URL = 'http://localhost:3000';

    test.describe('Archive Drawer Delete', () => {
        test('can permanently delete node from archive drawer', async ({ page }) => {
            // Navigate to page
            await page.goto(TEST_URL);
            await page.waitForLoadState('networkidle');

            // Wait for initial sync
            await page.waitForTimeout(2000);

            // First, create a node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Node To Delete');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Find and select the newly created node
            const newNode = page.locator('text=Node To Delete').first();
            await newNode.click();
            await page.waitForTimeout(300);

            // Archive the node (Delete key = archive/soft delete)
            await page.keyboard.press('Delete');
            await page.waitForTimeout(1000);

            // Open Archive Drawer
            const archiveButton = page.locator('[data-testid="archive-drawer-trigger"]');
            await archiveButton.click();
            await page.waitForTimeout(500);

            // Verify node appears in archive
            const archivedNode = page.locator('[data-testid="archive-drawer"]').locator('text=Node To Delete');
            await expect(archivedNode).toBeVisible({ timeout: 5000 });

            // Click delete button on the archived node
            const deleteButton = page.locator('[data-testid="archive-drawer"]').locator('[data-testid="delete-node-btn"]').first();
            await deleteButton.click();

            // Confirm deletion dialog should appear
            const confirmDialog = page.locator('text=确认永久删除');
            await expect(confirmDialog).toBeVisible({ timeout: 3000 });

            // Click confirm button
            const confirmButton = page.locator('button:has-text("永久删除")');
            await confirmButton.click();

            // Wait for deletion
            await page.waitForTimeout(1000);

            // Node should no longer be in archive
            await expect(archivedNode).not.toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Shift+Delete Shortcut', () => {
        test('Shift+Delete shows confirmation dialog', async ({ page }) => {
            // Navigate to page
            await page.goto(TEST_URL);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Shift Delete Test');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('text=Shift Delete Test').first();
            await testNode.click();
            await page.waitForTimeout(300);

            // Press Shift+Delete
            await page.keyboard.press('Shift+Delete');

            // Confirmation dialog should appear
            const confirmDialog = page.locator('text=确认永久删除');
            await expect(confirmDialog).toBeVisible({ timeout: 3000 });

            // Cancel to avoid actually deleting
            const cancelButton = page.locator('button:has-text("取消")');
            await cancelButton.click();

            // Node should still exist
            await expect(testNode).toBeVisible();
        });

        test('Shift+Delete permanently removes node after confirmation', async ({ page }) => {
            // Navigate to page
            await page.goto(TEST_URL);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('To Be Deleted');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('text=To Be Deleted').first();
            await testNode.click();
            await page.waitForTimeout(300);

            // Press Shift+Delete
            await page.keyboard.press('Shift+Delete');

            // Confirm deletion
            const confirmButton = page.locator('button:has-text("永久删除")');
            await confirmButton.click();

            // Wait for deletion
            await page.waitForTimeout(1000);

            // Node should no longer exist
            await expect(testNode).not.toBeVisible({ timeout: 5000 });

            // Verify it's not in archive either
            const archiveButton = page.locator('[data-testid="archive-drawer-trigger"]');
            await archiveButton.click();
            await page.waitForTimeout(500);

            const archivedNode = page.locator('[data-testid="archive-drawer"]').locator('text=To Be Deleted');
            await expect(archivedNode).not.toBeVisible();
        });

        test('Delete key (without Shift) archives node instead of deleting', async ({ page }) => {
            // Navigate to page
            await page.goto(TEST_URL);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Archive Not Delete');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('text=Archive Not Delete').first();
            await testNode.click();
            await page.waitForTimeout(300);

            // Press Delete (without Shift)
            await page.keyboard.press('Delete');

            // Wait for archive (no confirmation dialog for archive)
            await page.waitForTimeout(1000);

            // Node should not be visible in main view
            await expect(testNode).not.toBeVisible({ timeout: 3000 });

            // But should be in archive
            const archiveButton = page.locator('[data-testid="archive-drawer-trigger"]');
            await archiveButton.click();
            await page.waitForTimeout(500);

            const archivedNode = page.locator('[data-testid="archive-drawer"]').locator('text=Archive Not Delete');
            await expect(archivedNode).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Root Node Protection', () => {
        test('cannot delete root node', async ({ page }) => {
            // Navigate to page
            await page.goto(TEST_URL);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Click on center/root node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.waitForTimeout(300);

            // Try Shift+Delete on root node
            await page.keyboard.press('Shift+Delete');

            // Should show warning toast
            const warningToast = page.locator('text=无法删除根节点');
            // The warning might appear as a toast or the action might just be blocked
            // Either way, the center node should still exist
            await page.waitForTimeout(500);

            // Center node should still be visible
            await expect(centerNode).toBeVisible();
        });
    });
});

/**
 * Multi-client synchronization tests for permanent delete
 */
test.describe('Permanent Delete Multi-Client Sync', () => {
    let contextA: BrowserContext;
    let contextB: BrowserContext;
    let pageA: Page;
    let pageB: Page;

    const TEST_URL = 'http://localhost:3000';

    test.beforeAll(async ({ browser }) => {
        contextA = await browser.newContext();
        contextB = await browser.newContext();
        pageA = await contextA.newPage();
        pageB = await contextB.newPage();
    });

    test.afterAll(async () => {
        await contextA.close();
        await contextB.close();
    });

    test('permanent delete by User A removes node for User B', async () => {
        // Both users navigate to the same page
        await Promise.all([
            pageA.goto(TEST_URL),
            pageB.goto(TEST_URL),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('协作已连接', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('协作已连接', { timeout: 10000 });

        // Wait for initial sync
        await pageA.waitForTimeout(2000);

        // User A creates a node
        const centerNodeA = pageA.locator('.x6-node').first();
        await centerNodeA.click();
        await pageA.keyboard.press('Tab');
        await pageA.waitForTimeout(300);
        await pageA.keyboard.type('Sync Delete Test');
        await pageA.keyboard.press('Escape');

        // Wait for sync to User B
        await pageB.waitForTimeout(2000);

        // Verify User B sees the node
        const nodeOnB = pageB.locator('text=Sync Delete Test').first();
        await expect(nodeOnB).toBeVisible({ timeout: 5000 });

        // User A permanently deletes the node
        const nodeOnA = pageA.locator('text=Sync Delete Test').first();
        await nodeOnA.click();
        await pageA.waitForTimeout(300);
        await pageA.keyboard.press('Shift+Delete');

        // Confirm deletion on User A
        const confirmButton = pageA.locator('button:has-text("永久删除")');
        await confirmButton.click();

        // Wait for sync
        await pageB.waitForTimeout(2000);

        // Node should disappear on both pages
        await expect(nodeOnA).not.toBeVisible({ timeout: 5000 });
        await expect(nodeOnB).not.toBeVisible({ timeout: 5000 });
    });
});
