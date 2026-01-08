/**
 * Story 8.6: Node Order Persistence E2E Tests (VERTICAL LAYOUT)
 *
 * Tests order-based sibling node behavior:
 * - AC1: Tab creates child with order = max(siblings) + 1
 * - AC2: Enter creates sibling with order = selected.order + 1
 * - AC3: Arrow key navigation follows order (Left/Right for siblings)
 * - AC6: Outline drag-and-drop updates order
 * - AC7: Order persists after page reload
 *
 * VERTICAL LAYOUT Navigation:
 * - ArrowUp: Navigate to parent
 * - ArrowDown: Navigate to first child
 * - ArrowLeft/Right: Navigate between siblings
 */
import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

async function getNodeOrder(page: Page, label: string): Promise<number | null> {
    return page.evaluate((l: string) => (window as any).__CDM_E2E__?.getNodeOrderByLabel?.(l) ?? null, label);
}

async function getSelectedLabel(page: Page): Promise<string | null> {
    return page.evaluate(() => (window as any).__CDM_E2E__?.getSelectedNodeLabel?.() ?? null);
}

test.describe('Story 8.6: Node Order Persistence', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
        await page.waitForFunction(() => (window as any).__CDM_E2E__?.version === 1);
        await page.waitForTimeout(500);
    });

    test('AC1: Tab creates child nodes with correct order', async ({ page }) => {
        // Use #graph-container scope to exclude minimap
        const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create first child (order = 0)
        await page.keyboard.press('Tab');
        const child1Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(child1Input).toBeVisible();
        await child1Input.fill('子节点A');
        await child1Input.press('Enter');

        // Create second child (order = 1)
        await centerNode.click();
        await page.keyboard.press('Tab');
        const child2Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(child2Input).toBeVisible();
        await child2Input.fill('子节点B');
        await child2Input.press('Enter');

        // Create third child (order = 2)
        await centerNode.click();
        await page.keyboard.press('Tab');
        const child3Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(child3Input).toBeVisible();
        await child3Input.fill('子节点C');
        await child3Input.press('Enter');

        // Verify all children are visible
        await expect(page.locator('#graph-container .x6-node', { hasText: '子节点A' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: '子节点B' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: '子节点C' }).first()).toBeVisible();

        // Story 8.6: Assert data.order values are correct
        expect(await getNodeOrder(page, '子节点A')).toBe(0);
        expect(await getNodeOrder(page, '子节点B')).toBe(1);
        expect(await getNodeOrder(page, '子节点C')).toBe(2);

        // Navigate from root to first child via ArrowDown (vertical layout)
        await centerNode.click();
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('子节点A');

        // Navigate through siblings in order: A -> B -> C via ArrowRight (vertical layout)
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('子节点B');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('子节点C');

        // All three should be reachable
        await expect(page.locator('#graph-container .x6-node', { hasText: '子节点C' }).first()).toBeVisible();
    });

    test('AC2: Enter creates sibling with correct order (insertion)', async ({ page }) => {
        const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create first child
        await page.keyboard.press('Tab');
        const child1Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(child1Input).toBeVisible();
        await child1Input.fill('第一个孩子');
        await child1Input.press('Enter');

        // Now create a sibling with Enter (should insert after first child)
        await page.keyboard.press('Enter');
        const sibling2Input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await expect(sibling2Input).toBeVisible();
        await sibling2Input.fill('第二个兄弟');
        await sibling2Input.press('Enter');

        // Verify both siblings exist
        await expect(page.locator('#graph-container .x6-node', { hasText: '第一个孩子' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: '第二个兄弟' }).first()).toBeVisible();

        // Story 8.6: Assert insertion order in data.order
        expect(await getNodeOrder(page, '第一个孩子')).toBe(0);
        expect(await getNodeOrder(page, '第二个兄弟')).toBe(1);
    });

    test('AC3: Arrow Left/Right navigation follows order (vertical layout)', async ({ page }) => {
        const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create siblings
        await page.keyboard.press('Tab');
        let input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-0');
        await input.press('Enter');

        await centerNode.click();
        await page.keyboard.press('Tab');
        input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-1');
        await input.press('Enter');

        await centerNode.click();
        await page.keyboard.press('Tab');
        input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-2');
        await input.press('Enter');

        // Navigate to first sibling via ArrowDown from root (vertical layout)
        await centerNode.click();
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);

        // Now navigate through siblings - should follow order 0 -> 1 -> 2 via ArrowRight
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        expect(await getSelectedLabel(page)).toBe('Node-1');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        expect(await getSelectedLabel(page)).toBe('Node-2');

        // Navigate back to first via ArrowLeft
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        expect(await getSelectedLabel(page)).toBe('Node-1');
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        expect(await getSelectedLabel(page)).toBe('Node-0');

        // All nodes should remain visible
        await expect(page.locator('#graph-container .x6-node', { hasText: 'Node-0' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: 'Node-1' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: 'Node-2' }).first()).toBeVisible();
    });

    test('AC6: Outline drag-and-drop updates order and navigation', async ({ page }) => {
        const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create siblings (0, 1, 2)
        await page.keyboard.press('Tab');
        let input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-0');
        await input.press('Enter');

        await centerNode.click();
        await page.keyboard.press('Tab');
        input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-1');
        await input.press('Enter');

        await centerNode.click();
        await page.keyboard.press('Tab');
        input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('Node-2');
        await input.press('Enter');

        // Switch left sidebar to Outline view
        await page.locator('button[data-nav-id="outline"]').click();

        // Ensure outline is ready
        const outline = page.locator('[data-testid="outline-panel"]');
        await expect(outline).toBeVisible();
        await expect(outline).toContainText('Node-0');
        await expect(outline).toContainText('Node-1');
        await expect(outline).toContainText('Node-2');

        // Drag Node-2 above Node-1 (so order becomes Node-0, Node-2, Node-1)
        const item2 = outline.locator('[data-testid^="outline-item-"]', { hasText: 'Node-2' }).first();
        const item1 = outline.locator('[data-testid^="outline-item-"]', { hasText: 'Node-1' }).first();
        await item2.dragTo(item1, { targetPosition: { x: 10, y: 1 } });
        await page.waitForTimeout(800);

        expect(await getNodeOrder(page, 'Node-0')).toBe(0);
        expect(await getNodeOrder(page, 'Node-2')).toBe(1);
        expect(await getNodeOrder(page, 'Node-1')).toBe(2);

        // Navigation should follow new order: Node-0 -> Node-2 -> Node-1
        await centerNode.click();
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('Node-0');

        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('Node-2');

        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('Node-1');
    });

    test('AC7: Order persists after page reload', async ({ page }) => {
        const centerNode = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(centerNode).toBeVisible();
        await centerNode.click();

        // Create children in order
        await page.keyboard.press('Tab');
        let input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('持久化节点A');
        await input.press('Enter');

        await centerNode.click();
        await page.keyboard.press('Tab');
        input = page.locator('#graph-container input[placeholder="New Topic"]').first();
        await input.fill('持久化节点B');
        await input.press('Enter');

        // Wait for data to sync
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload();
        await page.waitForSelector('#graph-container');
        await page.waitForFunction(() => (window as any).__CDM_E2E__?.version === 1);
        await page.waitForTimeout(500);

        // Verify nodes are still visible after reload
        await expect(page.locator('#graph-container .x6-node', { hasText: '持久化节点A' }).first()).toBeVisible();
        await expect(page.locator('#graph-container .x6-node', { hasText: '持久化节点B' }).first()).toBeVisible();

        // Story 8.6: Assert orders survived reload
        expect(await getNodeOrder(page, '持久化节点A')).toBe(0);
        expect(await getNodeOrder(page, '持久化节点B')).toBe(1);

        // Verify navigation still works (order preserved) - use vertical layout keys
        const rootAfterReload = page.locator('#graph-container .x6-node[data-cell-id="center-node"]').first();
        await expect(rootAfterReload).toBeVisible();
        await rootAfterReload.click();
        await page.keyboard.press('ArrowDown'); // Navigate to first child (vertical layout)
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('持久化节点A');

        // Should be able to navigate to next sibling
        await page.keyboard.press('ArrowRight'); // Navigate to next sibling (vertical layout)
        await page.waitForTimeout(200);
        expect(await getSelectedLabel(page)).toBe('持久化节点B');

        await expect(page.locator('#graph-container .x6-node', { hasText: '持久化节点B' }).first()).toBeVisible();
    });
});
