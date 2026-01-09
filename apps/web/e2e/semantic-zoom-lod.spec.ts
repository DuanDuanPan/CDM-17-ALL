import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
    zoom: () => number;
    addNode: (config: unknown) => void;
    getCellById: (id: string) => unknown | null;
    zoomTo: (scale: number) => void;
};

async function waitForGraph(page: Page) {
    await expect
        .poll(async () => page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph)))
        .toBe(true);
}

async function waitForMindNodeShape(page: Page) {
    await waitForGraph(page);

    await expect
        .poll(
            async () =>
                page.evaluate(() => {
                    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as unknown as {
                        addNode?: (config: unknown) => void;
                        getCellById?: (id: string) => { remove?: () => void } | null;
                    } | undefined;
                    if (!graph?.addNode || !graph.getCellById) return false;

                    const now = new Date().toISOString();
                    const probeId = '__probe_mind_node_shape_semantic_zoom__';

                    try {
                        graph.addNode({
                            shape: 'mind-node',
                            id: probeId,
                            x: 0,
                            y: 0,
                            width: 1,
                            height: 1,
                            data: {
                                id: probeId,
                                label: '',
                                description: '',
                                isEditing: false,
                                isSelected: false,
                                createdAt: now,
                                updatedAt: now,
                            },
                        });

                        graph.getCellById(probeId)?.remove?.();
                        return true;
                    } catch {
                        graph.getCellById(probeId)?.remove?.();
                        return false;
                    }
                }),
            { timeout: 5000 }
        )
        .toBe(true);
}

async function setZoom(page: Page, scale: number) {
    await page.evaluate((s) => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        graph?.zoomTo?.(s);
    }, scale);
}

async function seedRequirementNode(page: Page, nodeId: string, x: number = 240, y: number = 180) {
    await waitForMindNodeShape(page);
    await page.evaluate(({ id, x: nodeX, y: nodeY }) => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        if (!graph) return;

        const now = new Date().toISOString();

        if (graph.getCellById(id)) return;

        graph.addNode({
            shape: 'mind-node',
            id,
            x: nodeX,
            y: nodeY,
            width: 240,
            height: 120,
            data: {
                id,
                label: 'LOD Rich',
                description: 'Detail description',
                isEditing: false,
                isSelected: false,
                nodeType: 'REQUIREMENT',
                props: { reqType: 'functional', priority: 'must' },
                tags: ['alpha', 'beta'],
                createdAt: now,
                updatedAt: now,
            },
        });
    }, { id: nodeId, x, y });
}

async function getFoOpacity(page: Page, nodeId: string) {
    return page.evaluate((id) => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as unknown as {
            getCellById?: (cellId: string) => { getAttrByPath?: (path: string) => unknown } | null;
        } | undefined;
        const node = graph?.getCellById?.(id);
        return node?.getAttrByPath?.('fo/opacity') ?? null;
    }, nodeId);
}

test.describe('Semantic Zoom LOD (Story 8.8)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
        await waitForGraph(page);
    });

    test('updates LOD level at thresholds and toggles rich content (AC1/AC2/AC3)', async ({ page }) => {
        const nodeId = 'lod-rich-n1';
        await seedRequirementNode(page, nodeId);

        const nodeGroup = page.locator('#graph-container').locator(`g[data-cell-id="${nodeId}"]`);
        await expect(nodeGroup).toBeVisible({ timeout: 2000 });

        const mindNode = nodeGroup.locator('[data-testid="mind-node"]');
        await expect(mindNode).toBeVisible();

        // Full boundary: 0.5 is full (AC1)
        await setZoom(page, 0.5);
        await expect(mindNode).toHaveAttribute('data-lod', 'full');

        // Compact: < 0.5 (AC1)
        await setZoom(page, 0.4);
        await expect(mindNode).toHaveAttribute('data-lod', 'compact');
        await expect(nodeGroup.locator('[data-testid="rich-node-metrics"]')).toHaveCount(0);
        await expect(nodeGroup.locator('[data-testid="rich-node-tags"]')).toHaveCount(0);
        await expect(nodeGroup.locator('[data-testid="rich-node-footer"]')).toHaveCount(0);

        // Compact boundary: 0.25 is compact (AC2)
        await setZoom(page, 0.25);
        await expect(mindNode).toHaveAttribute('data-lod', 'compact');

        // Micro: < 0.25 (AC2)
        await setZoom(page, 0.2);
        await expect(mindNode).toHaveAttribute('data-lod', 'micro');
        await expect(nodeGroup.locator('[data-testid="rich-node-micro"]')).toHaveCount(1);
        await expect(nodeGroup.locator('[data-testid="mind-node-title"]')).toHaveCount(0);

        // Restore to full (AC3)
        await setZoom(page, 0.6);
        await expect(mindNode).toHaveAttribute('data-lod', 'full');
        await expect(nodeGroup.locator('[data-testid="rich-node-metrics"]')).toHaveCount(1);
        await expect(nodeGroup.locator('[data-testid="rich-node-tags"]')).toHaveCount(1);
        await expect(nodeGroup.locator('[data-testid="rich-node-footer"]')).toHaveCount(1);
    });

    test('works with Focus Mode opacity (AC5)', async ({ page }) => {
        const focusedId = 'lod-focus-n1';
        const dimmedId = 'lod-focus-n2';

        await seedRequirementNode(page, focusedId, 240, 180);
        await seedRequirementNode(page, dimmedId, 520, 180);

        const focusedGroup = page.locator('#graph-container').locator(`g[data-cell-id="${focusedId}"]`);
        const dimmedGroup = page.locator('#graph-container').locator(`g[data-cell-id="${dimmedId}"]`);

        await expect(focusedGroup).toBeVisible({ timeout: 2000 });
        await expect(dimmedGroup).toBeVisible({ timeout: 2000 });

        // Select focused node, then enable focus mode
        await focusedGroup.click();
        await page.getByTestId('focus-mode-button').click();

        await expect
            .poll(async () => getFoOpacity(page, dimmedId), { timeout: 2000 })
            .toBe(0.2);

        // LOD should not override fo/opacity changes from focus mode
        await setZoom(page, 0.2);

        await expect
            .poll(async () => getFoOpacity(page, dimmedId), { timeout: 2000 })
            .toBe(0.2);
    });
});
