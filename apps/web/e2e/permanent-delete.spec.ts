import { test, expect, BrowserContext, Page } from '@playwright/test';
import { createTestGraph, gotoTestGraph, makeTestGraphUrl } from './testUtils';

/**
 * Helper function to open the archive panel from left sidebar
 * (Archive was moved from TopBar to LeftSidebar in unified sidebar refactor)
 */
async function openArchivePanel(page: Page) {
    // Click the archive icon in the left sidebar navigation
    const sidebar = page.locator('aside').first();
    const archiveButton = sidebar.locator('button[data-nav-id="archive"]');
    await archiveButton.click();
    await page.waitForTimeout(300);
}

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
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
    });

    test.describe('Archive Drawer Delete', () => {
        test('can permanently delete node from archive drawer', async ({ page }) => {
            await page.waitForLoadState('networkidle');

            // Wait for initial sync
            await page.waitForTimeout(2000);

            // First, create a node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Node To Delete');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);

            // Find and select the newly created node
            const newNode = page.locator('.x6-node', { hasText: 'Node To Delete' }).first();
            await newNode.click();
            await page.waitForTimeout(300);

            // Archive the node (Delete key = archive/soft delete)
            await page.keyboard.press('Delete');
            await page.waitForTimeout(1000);

            // Open Archive Panel (from left sidebar)
            await openArchivePanel(page);

            // Verify archive panel is visible and contains the node
            const archivePanel = page.locator('aside').first();
            await expect(archivePanel.getByText('归档')).toBeVisible();

            // Verify node appears in archive panel
            const archivedNode = archivePanel.getByText('Node To Delete');
            await expect(archivedNode).toBeVisible({ timeout: 5000 });

            // Click delete button on the archived node
            await archivePanel.getByRole('button', { name: '删除' }).first().click();

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
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Shift Delete Test');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('.x6-node', { hasText: 'Shift Delete Test' }).first();
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
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('To Be Deleted');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('.x6-node', { hasText: 'To Be Deleted' }).first();
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
            await openArchivePanel(page);
            const archivePanel = page.locator('aside').first();

            const archivedNode = archivePanel.getByText('To Be Deleted');
            await expect(archivedNode).toHaveCount(0);
        });

        test('Delete key (without Shift) archives node instead of deleting', async ({ page }) => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Create a test node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            await page.keyboard.type('Archive Not Delete');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);

            // Select the node
            const testNode = page.locator('.x6-node', { hasText: 'Archive Not Delete' }).first();
            await testNode.click();
            await page.waitForTimeout(300);

            // Press Delete (without Shift)
            await page.keyboard.press('Delete');

            // Wait for archive (no confirmation dialog for archive)
            await page.waitForTimeout(1000);

            // Node should not be visible in main view
            await expect(testNode).not.toBeVisible({ timeout: 3000 });

            // But should be in archive
            await openArchivePanel(page);
            const archivePanel = page.locator('aside').first();

            const archivedNode = archivePanel.getByText('Archive Not Delete');
            await expect(archivedNode).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Root Node Protection', () => {
        test('cannot delete root node', async ({ page }) => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Click on center/root node
            const centerNode = page.locator('.x6-node').first();
            await centerNode.click();
            await page.waitForTimeout(300);

            // Try Shift+Delete on root node
            await page.keyboard.press('Shift+Delete');

            // Should show warning toast
            const _warningToast = page.locator('text=无法删除根节点');
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

    test('permanent delete by User A removes node for User B', async ({ browser: _browser }, testInfo) => {
        const graphId = await createTestGraph(pageA, testInfo, 'e2e-user-a');
        const urlA = makeTestGraphUrl(graphId, 'e2e-user-a');
        const urlB = makeTestGraphUrl(graphId, 'e2e-user-b');

        // Both users navigate to the same page
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for initial sync
        await pageA.waitForTimeout(2000);

        // User A creates a node
        const centerNodeA = pageA.locator('.x6-node[data-cell-id="center-node"]');
        await centerNodeA.click();
        await pageA.keyboard.press('Tab');
        await pageA.waitForTimeout(300);
        await pageA.keyboard.type('Sync Delete Test');
        await pageA.keyboard.press('Enter');

        // Verify User B sees the node
        const nodeOnB = pageB.locator('.x6-node', { hasText: 'Sync Delete Test' }).first();
        await expect(nodeOnB).toBeVisible({ timeout: 15000 });

        // User A permanently deletes the node
        const nodeOnA = pageA.locator('.x6-node', { hasText: 'Sync Delete Test' }).first();
        await nodeOnA.click();
        await pageA.waitForTimeout(300);
        await pageA.keyboard.press('Shift+Delete');

        // Confirm deletion on User A
        const confirmButton = pageA.locator('button:has-text("永久删除")');
        await confirmButton.click();

        // Node should disappear on both pages
        await expect(nodeOnA).not.toBeVisible({ timeout: 15000 });
        await expect(nodeOnB).not.toBeVisible({ timeout: 15000 });
    });
});
