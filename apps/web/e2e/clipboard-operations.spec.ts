/**
 * Story 7.4: Clipboard Operations E2E Tests
 * Tests for complete copy/paste/cut user flows
 *
 * Test Cases:
 * - TC-E2E-Copy-Paste: Basic copy and paste flow
 * - TC-E2E-Cut-Paste: Cut and paste (move) flow
 * - TC-E2E-Multi-Select: Multi-node copy paste
 * - TC-E2E-Hierarchy: Hierarchy preservation
 */

import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

async function getNodeId(locator: Locator): Promise<string> {
    const nodeId = await locator.getAttribute('data-cell-id');
    if (!nodeId) {
        throw new Error('Failed to resolve node id (missing data-cell-id)');
    }
    return nodeId;
}

async function createChildNode(page: Page, parentNode: Locator, label: string): Promise<{ nodeId: string; locator: Locator }> {
    await parentNode.click();
    await page.keyboard.press('Tab');

    const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
    await expect(editInput).toBeVisible({ timeout: 15000 });
    await editInput.fill(label);
    await editInput.press('Enter');

    const node = page.locator('.x6-node', { hasText: label }).first();
    await expect(node).toBeVisible({ timeout: 15000 });
    return { nodeId: await getNodeId(node), locator: node };
}

async function getNodeIdsByLabel(page: Page, label: string): Promise<string[]> {
    const ids = await page.locator('.x6-node', { hasText: label }).evaluateAll((els) =>
        els
            .map((el) => el.getAttribute('data-cell-id'))
            .filter((id): id is string => Boolean(id))
    );
    return Array.from(new Set(ids));
}

test.describe('Clipboard Operations E2E', () => {
    test.beforeEach(async ({ page, context }, testInfo) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await gotoTestGraph(page, testInfo);
    });

    test.describe('TC-E2E-Copy-Paste: Basic Copy and Paste', () => {
        test('copy node with Cmd+C and paste with Cmd+V creates new node', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const label = 'Clipboard E2E Copy Paste';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { nodeId: originalId, locator: createdNode } = await createChildNode(page, centerNode, label);

            await createdNode.click();

            // Copy with Cmd+C
            await page.keyboard.press('Meta+c');
            await page.waitForTimeout(300);

            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            const clipboardData = JSON.parse(clipboardText) as { nodes?: Array<{ originalId?: string; label?: string }> };
            expect(clipboardData.nodes?.some((node) => node.originalId === originalId && node.label === label)).toBe(true);

            // Paste with Cmd+V
            await page.keyboard.press('Meta+v');

            await expect
                .poll(async () => (await getNodeIdsByLabel(page, label)).length, { timeout: 15000 })
                .toBeGreaterThan(1);

            const ids = await getNodeIdsByLabel(page, label);
            expect(ids).toContain(originalId);
            expect(ids.length).toBeGreaterThanOrEqual(2);
        });

        test('paste button in toolbar works', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const label = 'Clipboard E2E Toolbar Paste';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { nodeId: originalId, locator: createdNode } = await createChildNode(page, centerNode, label);
            await createdNode.click();

            // Copy via toolbar
            await page.locator('[data-testid="clipboard-copy"]').click();
            await page.waitForTimeout(300);

            // Paste via toolbar
            await page.locator('[data-testid="clipboard-paste"]').click();

            await expect
                .poll(async () => (await getNodeIdsByLabel(page, label)).length, { timeout: 15000 })
                .toBeGreaterThan(1);

            const ids = await getNodeIdsByLabel(page, label);
            expect(ids).toContain(originalId);
        });
    });

    test.describe('TC-E2E-Cut-Paste: Cut and Paste (Move)', () => {
        test('cut node with Cmd+X hides the node', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const label = 'Clipboard E2E Cut';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { locator: createdNode } = await createChildNode(page, centerNode, label);
            await createdNode.click();

            // Cut with Cmd+X
            await page.keyboard.press('Meta+x');

            // The cut node should be hidden (archived)
            await expect(createdNode).not.toBeVisible({ timeout: 15000 });
        });

        test('paste after cut in same graph moves the node', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const label = 'Clipboard E2E Cut Paste Move';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { nodeId: originalId, locator: createdNode } = await createChildNode(page, centerNode, label);
            await createdNode.click();

            await page.keyboard.press('Meta+x');
            await expect(createdNode).not.toBeVisible({ timeout: 15000 });

            // Paste (same graph should trigger move semantics)
            await page.keyboard.press('Meta+v');

            const movedNode = page.locator(`.x6-node[data-cell-id="${originalId}"]`).first();
            await expect(movedNode).toBeVisible({ timeout: 15000 });

            const ids = await getNodeIdsByLabel(page, label);
            expect(ids).toEqual([originalId]);
        });
    });

    test.describe('TC-E2E-Delete: Delete Key Operations', () => {
        test('Delete key soft-deletes selected node', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const label = 'Clipboard E2E Delete';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { locator: createdNode } = await createChildNode(page, centerNode, label);
            await createdNode.click();

            // Press Delete
            await page.keyboard.press('Delete');

            // Node should be archived (hidden)
            await expect(createdNode).not.toBeVisible({ timeout: 15000 });
        });

        test('cannot delete root node', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            // Click the root/center node (usually labeled as graph name or "新话题")
            const rootNode = page.locator('.x6-node').first();
            await rootNode.click();
            await page.waitForTimeout(100);

            // Try to delete
            await page.keyboard.press('Delete');
            await page.waitForTimeout(300);

            // Root node should still be visible
            await expect(rootNode).toBeVisible();
        });
    });

    test.describe('TC-E2E-Hierarchy: Hierarchy Preservation', () => {
        test('copying parent includes children in clipboard', async ({ page }) => {
            await page.waitForSelector('#graph-container');

            const parentLabel = 'Clipboard E2E Parent';
            const childLabel = 'Clipboard E2E Child';
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible({ timeout: 15000 });

            const { nodeId: parentId, locator: parentNode } = await createChildNode(page, centerNode, parentLabel);
            const { nodeId: childId } = await createChildNode(page, parentNode, childLabel);

            await parentNode.click();

            // Copy
            await page.keyboard.press('Meta+c');

            // Read clipboard to verify structure
            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            const data = JSON.parse(clipboardText) as {
                nodes?: Array<{ originalId: string; label: string }>;
                edges?: Array<{ sourceOriginalId: string; targetOriginalId: string }>;
            };

            // Should have nodes array with parent and child
            expect(data.nodes).toBeDefined();
            expect(data.nodes).toHaveLength(2);
            expect(data.nodes?.map((n) => n.label).sort()).toEqual([childLabel, parentLabel].sort());
            expect(data.nodes?.map((n) => n.originalId).sort()).toEqual([childId, parentId].sort());
            expect(data.edges?.some((edge) => edge.sourceOriginalId === parentId && edge.targetOriginalId === childId)).toBe(true);
        });
    });
});
