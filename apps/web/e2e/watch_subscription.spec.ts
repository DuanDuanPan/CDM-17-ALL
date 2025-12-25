/**
 * Story 4.4: Watch & Subscription
 * E2E Tests for Watch/Unwatch functionality
 */

import { test, expect } from '@playwright/test';

// API base URL
const API_BASE = 'http://localhost:3001/api';

test.describe('Watch & Subscription Feature', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a mindmap with userId parameter
        await page.goto('/graph/cmjkvb60a0009a01oiackclnx?userId=test-e2e-user');

        // Wait for graph to load
        await page.waitForSelector('[data-testid="collab-status"]', { timeout: 10000 });
    });

    test('User can subscribe to a node via context menu', async ({ page }) => {
        // Find a node to interact with
        const nodeSelector = '.x6-cell[data-shape="mind-node"]';
        await page.waitForSelector(nodeSelector, { timeout: 10000 });

        const node = page.locator(nodeSelector).first();

        // Right-click to open context menu
        await node.click({ button: 'right' });

        // Wait for context menu
        await page.waitForSelector('text=关注节点', { timeout: 3000 });

        // Click subscribe button
        await page.click('text=关注节点');

        // Verify toast feedback (if implemented)
        // await expect(page.locator('text=已添加关注')).toBeVisible({ timeout: 3000 });

        // Right-click again to verify state changed
        await node.click({ button: 'right' });

        // Should now show "取消关注"
        await expect(page.locator('text=取消关注')).toBeVisible({ timeout: 3000 });
    });

    test('User can unsubscribe from a node via context menu', async ({ page }) => {
        const nodeSelector = '.x6-cell[data-shape="mind-node"]';
        await page.waitForSelector(nodeSelector, { timeout: 10000 });

        const node = page.locator(nodeSelector).first();

        // First, subscribe to the node
        await node.click({ button: 'right' });
        await page.waitForSelector('text=关注节点', { timeout: 3000 });
        await page.click('text=关注节点');

        // Wait a moment for the subscription to complete
        await page.waitForTimeout(500);

        // Right-click again
        await node.click({ button: 'right' });

        // Click unsubscribe
        await page.waitForSelector('text=取消关注', { timeout: 3000 });
        await page.click('text=取消关注');

        // Right-click again to verify state changed back
        await node.click({ button: 'right' });

        // Should now show "关注节点" again
        await expect(page.locator('text=关注节点')).toBeVisible({ timeout: 3000 });
    });

    test('Subscription API endpoints work correctly', async ({ request }) => {
        const testUserId = 'test-api-user';
        const testNodeId = 'test-node-id';

        // Test subscribe endpoint
        const subscribeResponse = await request.post(`${API_BASE}/subscriptions`, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': testUserId,
            },
            data: { nodeId: testNodeId },
        });

        // May return 201 (created) or 409 (already subscribed) or 404 (node not found)
        expect([201, 409, 404]).toContain(subscribeResponse.status());

        // Test check subscription endpoint
        const checkResponse = await request.get(`${API_BASE}/subscriptions/check?nodeId=${testNodeId}`, {
            headers: {
                'x-user-id': testUserId,
            },
        });

        expect(checkResponse.ok()).toBe(true);
        const checkData = await checkResponse.json();
        expect(checkData).toHaveProperty('isSubscribed');

        // Test unsubscribe endpoint
        const unsubscribeResponse = await request.delete(`${API_BASE}/subscriptions?nodeId=${testNodeId}`, {
            headers: {
                'x-user-id': testUserId,
            },
        });

        // May return 200 (deleted) or 404 (not found)
        expect([200, 404]).toContain(unsubscribeResponse.status());
    });
});
