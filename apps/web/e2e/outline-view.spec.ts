/**
 * Story 8.4: E2E tests for Outline View
 * Tests: AC1-AC6 covering tab entry, tree display, click navigation, drag reorder,
 * collapse/expand, and bidirectional sync.
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
    getCellById: (id: string) => { isVisible?: () => boolean; getData?: () => unknown } | null;
    getEdges: () => { getSourceCellId?: () => string; getTargetCellId?: () => string }[];
    addNode: (config: unknown) => void;
    addEdge: (config: unknown) => void;
    getSelectedCells: () => unknown[];
    unselect: (cells: unknown[]) => void;
    select: (cell: unknown) => void;
};

test.describe('Outline View (Story 8.4)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
    });

    async function waitForGraphReady(page: Page) {
        await expect
            .poll(async () =>
                page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph))
            )
            .toBe(true);

        // Ensure the base graph is rendered (avoid strict mode violation from minimap)
        await expect(page.locator('.x6-node[data-cell-id="center-node"]').first()).toBeVisible({ timeout: 10000 });
    }

    /**
     * Seed a test tree with parent-child relationships for outline testing.
     */
    async function seedOutlineTree(page: Page) {
        // Wait for graph to be available
        await expect
            .poll(async () =>
                page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph))
            )
            .toBe(true);

        // Wait for center-node to ensure graph and shapes are fully initialized
        await expect(page.locator('.x6-node[data-cell-id="center-node"]').first()).toBeVisible({ timeout: 10000 });

        await page.evaluate(() => {
            const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
            if (!graph) return;
            const now = new Date().toISOString();

            const ensureNode = (id: string, label: string, x: number, y: number, parentId: string) => {
                if (graph.getCellById(id)) return;
                graph.addNode({
                    shape: 'mind-node',
                    id,
                    x,
                    y,
                    width: 160,
                    height: 50,
                    data: {
                        id,
                        label,
                        type: 'topic',
                        parentId,
                        order: 0,
                        isEditing: false,
                        createdAt: now,
                        updatedAt: now,
                    },
                });
            };

            const ensureEdge = (source: string, target: string) => {
                const exists = graph
                    .getEdges()
                    .some((e) => e.getSourceCellId?.() === source && e.getTargetCellId?.() === target);
                if (exists) return;
                graph.addEdge({
                    source: { cell: source },
                    target: { cell: target },
                    connector: { name: 'smooth' },
                    attrs: {
                        line: {
                            stroke: '#3b82f6',
                            strokeWidth: 2,
                            targetMarker: null,
                        },
                    },
                    data: { type: 'hierarchical', metadata: { kind: 'hierarchical' } },
                });
            };

            // Create test structure: center-node -> outline-child-1 -> outline-grandchild-1
            ensureNode('outline-child-1', '大纲子节点1', 200, 0, 'center-node');
            ensureNode('outline-grandchild-1', '大纲孙节点1', 400, 0, 'outline-child-1');
            ensureNode('outline-child-2', '大纲子节点2', 200, 100, 'center-node');
            ensureEdge('center-node', 'outline-child-1');
            ensureEdge('outline-child-1', 'outline-grandchild-1');
            ensureEdge('center-node', 'outline-child-2');
        });

        // Wait for nodes to appear (use .first() to avoid strict mode violation from minimap)
        await expect(page.locator('.x6-node[data-cell-id="outline-child-1"]').first()).toBeVisible();
        await expect(page.locator('.x6-node[data-cell-id="outline-child-2"]').first()).toBeVisible();
    }

    test('AC1: should open outline panel when clicking outline tab', async ({ page }) => {
        await waitForGraphReady(page);

        // Find and click the outline tab (ListTree icon)
        const sidebar = page.locator('aside');
        await expect(sidebar).toBeVisible();

        // Find the outline button by looking for ListTree icon in nav
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        // Panel should expand and show outline content
        const outlinePanel = page.getByTestId('outline-panel');
        await expect(outlinePanel).toBeVisible();

        // Tab should be highlighted (active state)
        await expect(outlineButton).toHaveClass(/bg-blue-50/);
    });

    test('AC2: should display tree structure reflecting graph hierarchy', async ({ page }) => {
        await seedOutlineTree(page);

        // Open outline panel
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        const outlinePanel = page.getByTestId('outline-panel');
        await expect(outlinePanel).toBeVisible();

        // Check that nodes appear in outline
        await expect(page.getByTestId('outline-item-center-node')).toBeVisible();
        await expect(page.getByTestId('outline-item-outline-child-1')).toBeVisible();
        await expect(page.getByTestId('outline-item-outline-grandchild-1')).toBeVisible();
        await expect(page.getByTestId('outline-item-outline-child-2')).toBeVisible();

        // Check labels are displayed (use .first() to avoid strict mode on duplicate text in canvas)
        await expect(page.getByText('大纲子节点1').first()).toBeVisible();
        await expect(page.getByText('大纲孙节点1').first()).toBeVisible();
    });

    test('AC3: should navigate to node when clicking in outline', async ({ page }) => {
        await seedOutlineTree(page);

        // Open outline panel
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        // Click on a node in the outline
        const outlineItem = page.getByTestId('outline-item-outline-child-1');
        await outlineItem.click();

        // The canvas node should be selected (check via graph API)
        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
                    const selected = graph?.getSelectedCells() as { id?: string }[];
                    return selected?.some((cell) => cell.id === 'outline-child-1');
                })
            )
            .toBe(true);
    });

    test('AC5: should collapse/expand nodes in outline independently', async ({ page }) => {
        await seedOutlineTree(page);

        // Open outline panel
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        // Initially grandchild should be visible
        await expect(page.getByTestId('outline-item-outline-grandchild-1')).toBeVisible();

        // Find and click the collapse button on child-1
        const childItem = page.getByTestId('outline-item-outline-child-1');
        const collapseButton = childItem.locator('button');
        await collapseButton.click();

        // Grandchild should be hidden in outline
        await expect(page.getByTestId('outline-item-outline-grandchild-1')).not.toBeVisible();

        // But the canvas node should still be visible (outline collapse is independent)
        await expect(page.locator('.x6-node[data-cell-id="outline-grandchild-1"]').first()).toBeVisible();

        // Click again to expand
        await collapseButton.click();
        await expect(page.getByTestId('outline-item-outline-grandchild-1')).toBeVisible();
    });

    test('AC6: should sync outline when canvas nodes change', async ({ page }) => {
        await waitForGraphReady(page);

        // Open outline panel first
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        const outlinePanel = page.getByTestId('outline-panel');
        await expect(outlinePanel).toBeVisible();

        // Add a new node via graph API
        await page.evaluate(() => {
            const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
            if (!graph) return;
            const now = new Date().toISOString();
            graph.addNode({
                shape: 'mind-node',
                id: 'new-outline-node',
                x: 300,
                y: 200,
                width: 160,
                height: 50,
                data: {
                    id: 'new-outline-node',
                    label: '新建大纲节点',
                    type: 'topic',
                    parentId: null,
                    isEditing: false,
                    createdAt: now,
                    updatedAt: now,
                },
            });
        });

        // The new node should appear in outline (real-time sync)
        await expect(page.getByTestId('outline-item-new-outline-node')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('新建大纲节点').first()).toBeVisible();
    });

    test('AC4: should support drag and drop reordering', async ({ page }) => {
        await seedOutlineTree(page);

        // Open outline panel
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        await expect(page.getByTestId('outline-panel')).toBeVisible();

        // Get source and target elements
        const sourceItem = page.getByTestId('outline-item-outline-child-2');
        const targetItem = page.getByTestId('outline-item-outline-child-1');

        await expect(sourceItem).toBeVisible();
        await expect(targetItem).toBeVisible();

        // Perform drag and drop
        await sourceItem.dragTo(targetItem);

        // Wait for potential reorder and verify parent changed
        // After drag, child-2 should become a child of child-1
        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
                    const edges = graph?.getEdges() ?? [];
                    // Check if there's an edge from outline-child-1 to outline-child-2
                    return edges.some(
                        (e) =>
                            e.getSourceCellId?.() === 'outline-child-1' &&
                            e.getTargetCellId?.() === 'outline-child-2'
                    );
                })
            )
            .toBe(true);

        // Verify auto-select: the moved node should be selected after reorder
        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
                    const selected = graph?.getSelectedCells() as { id?: string }[];
                    return selected?.some((cell) => cell.id === 'outline-child-2');
                }),
                { timeout: 2000 }
            )
            .toBe(true);
    });

    test('should show hint text in outline panel', async ({ page }) => {
        await waitForGraphReady(page);

        // Open outline panel
        const sidebar = page.locator('aside');
        const outlineButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-list-tree') });
        await outlineButton.click();

        // Check for hint text
        await expect(page.getByText('点击节点跳转，拖拽重排层级')).toBeVisible();
    });
});
