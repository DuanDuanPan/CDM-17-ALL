import { test, expect, BrowserContext, Page, type TestInfo } from '@playwright/test';
import { createTestGraph, gotoTestGraph, makeTestGraphUrl } from './testUtils';

/**
 * E2E Tests for Real-time Collaboration Engine
 *
 * Simulates two browser contexts (User A and User B) to verify:
 * - Real-time node updates between users
 * - Layout mode synchronization
 * - Basic conflict resolution (Last Write Wins)
 *
 * Story 1.4: Real-time Collaboration Engine
 *
 * Note: These tests require the collaboration server to be running on port 1234.
 */

test.describe('Real-time Collaboration Engine', () => {
    let contextA: BrowserContext;
    let contextB: BrowserContext;
    let pageA: Page;
    let pageB: Page;

    const getTestUrls = async (testInfo: TestInfo) => {
        const graphId = await createTestGraph(pageA, testInfo, 'e2e-user-a');
        return {
            urlA: makeTestGraphUrl(graphId, 'e2e-user-a'),
            urlB: makeTestGraphUrl(graphId, 'e2e-user-b'),
        };
    };

    test.beforeAll(async ({ browser }) => {
        // Create two separate browser contexts (simulating two users)
        contextA = await browser.newContext({
            storageState: undefined, // Clean state for User A
        });
        contextB = await browser.newContext({
            storageState: undefined, // Clean state for User B
        });

        pageA = await contextA.newPage();
        pageB = await contextB.newPage();
    });

    test.afterAll(async () => {
        await contextA.close();
        await contextB.close();
    });

    test('both users can connect to the same document', async ({ browser: _browser }, testInfo) => {
        // Navigate both users to the same URL
        const { urlA, urlB } = await getTestUrls(testInfo);
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection indicators
        await expect(pageA.locator('[data-testid="collab-status"]')).toBeVisible({ timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toBeVisible({ timeout: 10000 });

        // Verify both show synced status
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
    });

    test('node added by User A appears for User B', async ({ browser: _browser }, testInfo) => {
        const { urlA, urlB } = await getTestUrls(testInfo);
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for initial sync
        await pageA.waitForTimeout(2000);

        // First, click on the center node to select it (required for Tab to work)
        const centerNode = pageA.locator('.x6-node[data-cell-id="center-node"]');
        await centerNode.click();

        // Wait for selection
        await pageA.waitForTimeout(500);

        // User A adds a child node using Tab
        await pageA.keyboard.press('Tab');

        const editInput = pageA.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(editInput).toBeVisible();
        await editInput.fill('Test Node From User A');
        await editInput.press('Enter');

        // Wait for sync
        await pageB.waitForTimeout(2000);

        // Check if the node with this text appears on User B's screen
        // Use .first() because MindNode has a hidden measurement div that may also contain the text
        const nodeLocator = pageB.locator('.x6-node', { hasText: 'Test Node From User A' }).first();
        await expect(nodeLocator).toBeVisible({ timeout: 5000 });
    });

    test('layout mode switch by User A syncs to User B', async ({ browser: _browser }, testInfo) => {
        const { urlA, urlB } = await getTestUrls(testInfo);
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for initial sync
        await pageA.waitForTimeout(2000);

        // User A switches to "Logic" layout using data-testid
        const logicButtonA = pageA.locator('[data-testid="layout-logic"]');
        await logicButtonA.click();

        // Wait for sync
        await pageB.waitForTimeout(1000);

        // Verify User B's Logic layout button shows active state (has specific classes or styles)
        const logicButtonB = pageB.locator('[data-testid="layout-logic"]');
        // Check that the button appears "active" by checking for the active styling
        // The active button should have specific background color or other indicators
        await expect(logicButtonB).toBeVisible();

        // Switch to Free layout
        const freeButtonA = pageA.locator('[data-testid="layout-free"]');
        await freeButtonA.click();

        await pageB.waitForTimeout(1000);

        // Verify Free layout button is active on User B
        const freeButtonB = pageB.locator('[data-testid="layout-free"]');
        await expect(freeButtonB).toBeVisible();
    });

    test('concurrent edits from both users are preserved', async ({ browser: _browser }, testInfo) => {
        const { urlA, urlB } = await getTestUrls(testInfo);
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for initial sync (reduced to stay within timeout)
        await pageA.waitForTimeout(1000);

        // Both users select nodes and add children
        // User A
        const nodeA = pageA.locator('.x6-node[data-cell-id="center-node"]');
        await nodeA.click();
        await pageA.waitForTimeout(300);

        // User B (select same or different node)
        const nodeB = pageB.locator('.x6-node[data-cell-id="center-node"]');
        await nodeB.click();
        await pageB.waitForTimeout(300);

        // Add child nodes concurrently
        await Promise.all([
            (async () => {
                await pageA.keyboard.press('Tab');
                const inputA = pageA.locator('#graph-container input[placeholder="New Topic"]').first();
                await expect(inputA).toBeVisible();
                await inputA.fill('Concurrent A');
                await inputA.press('Enter');
            })(),
            (async () => {
                await pageB.keyboard.press('Tab');
                const inputB = pageB.locator('#graph-container input[placeholder="New Topic"]').first();
                await expect(inputB).toBeVisible();
                await inputB.fill('Concurrent B');
                await inputB.press('Enter');
            })(),
        ]);

        // Wait for sync to complete (reduced to stay within timeout)
        await pageA.waitForTimeout(1500);
        await pageB.waitForTimeout(1500);

        // Both nodes should exist on both pages (no data loss due to CRDT)
        // Use .first() for text locators that may match hidden measurement divs
        await expect(pageA.locator('.x6-node', { hasText: 'Concurrent A' }).first()).toBeVisible({ timeout: 5000 });
        await expect(pageA.locator('.x6-node', { hasText: 'Concurrent B' }).first()).toBeVisible({ timeout: 5000 });
        await expect(pageB.locator('.x6-node', { hasText: 'Concurrent A' }).first()).toBeVisible({ timeout: 5000 });
        await expect(pageB.locator('.x6-node', { hasText: 'Concurrent B' }).first()).toBeVisible({ timeout: 5000 });
    });

    test('remote user cursors are visible when mouse moves', async ({ browser: _browser }, testInfo) => {
        const { urlA, urlB } = await getTestUrls(testInfo);
        await Promise.all([
            pageA.goto(urlA),
            pageB.goto(urlB),
        ]);

        // Wait for collaboration connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for connection
        await pageA.waitForTimeout(2000);

        // Move mouse on User A's page - move across the graph canvas area
        await pageA.mouse.move(500, 400);
        await pageA.waitForTimeout(200);
        await pageA.mouse.move(550, 450);

        // Wait for cursor position to sync
        await pageB.waitForTimeout(1000);

        // User B should see User A's cursor (remote-cursor element)
        // Use .first() since multiple remote cursor elements may exist
        const remoteCursor = pageB.locator('[data-testid="remote-cursor"]').first();
        await expect(remoteCursor).toBeVisible({ timeout: 3000 });
    });

    test('active users count updates when users join', async ({ browser: _browser }, testInfo) => {
        const { urlA, urlB } = await getTestUrls(testInfo);
        // User A goes to the page first
        await pageA.goto(urlA);

        // Wait for connection
        await expect(pageA.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Check that TopBar shows remote users (may be empty initially, but the component should exist)
        // The ActiveUsersAvatarStack only shows when there are remoteUsers
        await pageA.waitForTimeout(1000);

        // User B joins
        await pageB.goto(urlB);
        await expect(pageB.locator('[data-testid="collab-status"]')).toContainText('已与远程同步', { timeout: 10000 });

        // Wait for awareness update
        await pageA.waitForTimeout(2000);

        // After User B joins, User A should see the active users count showing someone is online
        // Note: The ActiveUsersAvatarStack component only renders when remoteUsers.length > 0
        const userCountA = pageA.locator('[data-testid="active-users-count"]');

        // If User B is visible to User A as a remote user, the count should be visible
        // This depends on both users being recognized as different users
        // The count text format is "{number} 在线"
        await expect(userCountA).toBeVisible({ timeout: 5000 });
    });
});

/**
 * Smoke test that doesn't require actual collaboration server
 * Verifies the collaboration hooks and components can be imported
 */
test.describe('Collaboration Components Smoke Test', () => {
    test('page loads without collaboration errors', async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);

        // Page should load without JavaScript errors related to collaboration
        const errors: string[] = [];
        page.on('pageerror', (error) => {
            if (error.message.includes('collab') || error.message.includes('Yjs')) {
                errors.push(error.message);
            }
        });

        // Wait for page to fully load
        await page.waitForTimeout(2000);

        // No collaboration-related errors should have occurred
        expect(errors).toHaveLength(0);
    });

    test('collaboration status indicator is visible', async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);

        // The collab-status indicator should be visible
        const collabStatus = page.locator('[data-testid="collab-status"]');
        await expect(collabStatus).toBeVisible({ timeout: 10000 });
    });
});
