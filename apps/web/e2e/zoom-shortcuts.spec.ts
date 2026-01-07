import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
    translate: () => { tx: number; ty: number };
    zoom: () => number;
    getCellById: (id: string) => unknown | null;
    addNode: (config: unknown) => void;
    cleanSelection: () => void;
    select: (cell: unknown) => void;
    getNodes: () => unknown[];
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
                    const probeId = '__probe_mind_node_shape__';

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
                                type: 'topic',
                                isEditing: false,
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

async function getZoom(page: Page) {
    return page.evaluate(() => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        return graph?.zoom?.() ?? 1;
    });
}

async function getTranslate(page: Page) {
    return page.evaluate(() => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        return graph?.translate?.() ?? { tx: 0, ty: 0 };
    });
}

async function setZoom(page: Page, scale: number) {
    await page.evaluate((s) => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        graph?.zoomTo?.(s);
    }, scale);
}

async function seedNodes(page: Page) {
    await waitForMindNodeShape(page);
    await page.evaluate(() => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        if (!graph) return;
        const now = new Date().toISOString();

        const ensureNode = (id: string, label: string, x: number, y: number) => {
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
                    isEditing: false,
                    createdAt: now,
                    updatedAt: now,
                },
            });
        };

        ensureNode('zoom-n1', 'Node 1', 100, 100);
        ensureNode('zoom-n2', 'Node 2', 500, 300);
        ensureNode('zoom-n3', 'Node 3', 300, 500);
    });
}

test.describe('Zoom Shortcuts System (Story 8.3)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
        await waitForGraph(page);
    });

    test('displays zoom indicator (AC6)', async ({ page }) => {
        await expect(page.getByTestId('zoom-indicator')).toBeVisible();

        const text = await page.getByTestId('zoom-indicator').textContent();
        expect(text).toMatch(/\d+%/);
    });

    test('clicking zoom indicator resets to 100% (AC6)', async ({ page }) => {
        await setZoom(page, 0.5);

        await expect
            .poll(() => getZoom(page))
            .toBeCloseTo(0.5, 1);

        await page.getByTestId('zoom-indicator').click();

        // Wait for animation + some tolerance
        await expect
            .poll(() => getZoom(page), { timeout: 2000 })
            .toBeCloseTo(1, 1);
    });

    test('Cmd/Ctrl+0 fits all nodes to screen (AC2)', async ({ page }) => {
        await seedNodes(page);
        await setZoom(page, 2); // Start zoomed in

        const canvas = page.getByTestId('graph-canvas');
        await canvas.click();

        // Use Alt+0 as browser-safe fallback (browser may intercept Cmd+0)
        await page.keyboard.press('Alt+0');

        await expect
            .poll(() => getZoom(page), { timeout: 2000 })
            .toBeLessThanOrEqual(1); // AC2: max zoom 100%
    });

    test('Cmd/Ctrl+0 does nothing on empty canvas (AC2)', async ({ page }) => {
        // Ensure no extra nodes
        const initialZoom = await getZoom(page);

        const canvas = page.getByTestId('graph-canvas');
        await canvas.click();

        await page.keyboard.press('Alt+0');

        // Wait briefly to ensure nothing happens
        await page.waitForTimeout(500);

        const finalZoom = await getZoom(page);
        expect(finalZoom).toBeCloseTo(initialZoom, 1);
    });

    test('Cmd/Ctrl+1 resets zoom to 100% (AC3)', async ({ page }) => {
        await setZoom(page, 0.5);

        await expect
            .poll(() => getZoom(page))
            .toBeCloseTo(0.5, 1);

        const canvas = page.getByTestId('graph-canvas');
        await canvas.click();

        // Use Alt+1 as browser-safe fallback
        await page.keyboard.press('Alt+1');

        await expect
            .poll(() => getZoom(page), { timeout: 2000 })
            .toBeCloseTo(1, 1);
    });

    test('Cmd/Ctrl+1 maintains viewport center (AC3)', async ({ page }) => {
        await seedNodes(page);
        await setZoom(page, 0.5);

        const canvas = page.getByTestId('graph-canvas');
        await canvas.click();

        const beforeTranslate = await getTranslate(page);

        await page.keyboard.press('Alt+1');

        // After zooming to 100%, translate should adjust to keep center stable
        // (not equal to before because zoom changed, but should still center)
        await expect
            .poll(() => getZoom(page), { timeout: 2000 })
            .toBeCloseTo(1, 1);

        const afterTranslate = await getTranslate(page);
        // Verify translate changed (center adjustment)
        expect(afterTranslate).not.toEqual(beforeTranslate);
    });

    test('double-click on node centers it without zoom change (AC4)', async ({ page }) => {
        await seedNodes(page);

        const initialZoom = await getZoom(page);
        const initialTranslate = await getTranslate(page);

        // Avoid minimap overlay intercepting pointer events.
        // This test validates X6 node:dblclick, so we want a real user interaction on the node.
        if (await page.getByTestId('minimap-container').isVisible()) {
            await page.getByTestId('minimap-toggle').click();
            await expect(page.getByTestId('minimap-container')).toBeHidden();
        }

        // Put the node in a known non-centered position first, so the test fails if dblclick handler doesn't pan.
        await page.evaluate(() => {
            const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as unknown as {
                zoom?: () => number;
                translate?: (tx?: number, ty?: number) => unknown;
            } | undefined;
            const container = document.getElementById('graph-container');
            if (!graph?.translate || !container) return;

            const rect = container.getBoundingClientRect();
            const scale = graph.zoom?.() ?? 1;

            // Seeded node config: x=500,y=300,width=160,height=50 -> center=(580, 325)
            const nodeCenterX = 580;
            const nodeCenterY = 325;

            // Place node near top-left (20% of viewport) before dblclick
            const desiredX = rect.width * 0.2;
            const desiredY = rect.height * 0.2;
            graph.translate(desiredX - nodeCenterX * scale, desiredY - nodeCenterY * scale);
        });

        // Find the actual node element in DOM and double-click it
        // X6 renders nodes with data-cell-id attribute
        const nodeElement = page.locator('#graph-container').locator('g[data-cell-id="zoom-n2"]');
        await expect(nodeElement).toBeVisible({ timeout: 2000 });

        // Perform actual double-click on the node element
        await nodeElement.dblclick();

        // Allow time for center animation (400ms + buffer)
        await page.waitForTimeout(600);

        const finalZoom = await getZoom(page);
        const finalTranslate = await getTranslate(page);

        // Zoom should NOT have changed (AC4)
        expect(finalZoom).toBeCloseTo(initialZoom, 1);

        // Translate MUST have changed (panned to center the node)
        // zoom-n2 is at (500, 300) which is off-center, so translate must change
        expect(
            finalTranslate.tx !== initialTranslate.tx || finalTranslate.ty !== initialTranslate.ty
        ).toBe(true);
    });

    test('zoom shortcuts do not trigger in input fields', async ({ page }) => {
        await seedNodes(page);
        await setZoom(page, 0.5);

        // Create and focus a real input element to test input protection
        await page.evaluate(() => {
            const input = document.createElement('input');
            input.id = 'test-input-protection';
            input.style.cssText = 'position:fixed;top:10px;left:10px;z-index:9999;width:200px;';
            document.body.appendChild(input);
        });

        // Focus the real input element
        const testInput = page.locator('#test-input-protection');
        await testInput.click();
        await testInput.focus();

        // Verify input is focused
        await expect(testInput).toBeFocused();

        const beforeZoom = await getZoom(page);

        // Try pressing Alt+1 while input is focused
        await page.keyboard.press('Alt+1');

        // Wait and verify zoom didn't change
        await page.waitForTimeout(400);
        const afterZoom = await getZoom(page);

        // Zoom should NOT have changed because input was focused
        expect(afterZoom).toBeCloseTo(beforeZoom, 1);

        // Clean up test input
        await page.evaluate(() => {
            document.getElementById('test-input-protection')?.remove();
        });
    });

    test('zoom shortcuts do not trigger in textarea', async ({ page }) => {
        await seedNodes(page);
        await setZoom(page, 0.5);

        // Create and focus a real textarea element
        await page.evaluate(() => {
            const textarea = document.createElement('textarea');
            textarea.id = 'test-textarea-protection';
            textarea.style.cssText = 'position:fixed;top:10px;left:10px;z-index:9999;width:200px;height:50px;';
            document.body.appendChild(textarea);
        });

        const testTextarea = page.locator('#test-textarea-protection');
        await testTextarea.click();
        await testTextarea.focus();

        await expect(testTextarea).toBeFocused();

        const beforeZoom = await getZoom(page);
        await page.keyboard.press('Alt+1');
        await page.waitForTimeout(400);
        const afterZoom = await getZoom(page);

        expect(afterZoom).toBeCloseTo(beforeZoom, 1);

        await page.evaluate(() => {
            document.getElementById('test-textarea-protection')?.remove();
        });
    });

    test('zoom shortcuts do not trigger in contentEditable', async ({ page }) => {
        await seedNodes(page);
        await setZoom(page, 0.5);

        // Create and focus a contentEditable element
        await page.evaluate(() => {
            const div = document.createElement('div');
            div.id = 'test-contenteditable-protection';
            div.contentEditable = 'true';
            div.style.cssText = 'position:fixed;top:10px;left:10px;z-index:9999;width:200px;height:50px;border:1px solid #ccc;';
            div.textContent = 'Editable content';
            document.body.appendChild(div);
        });

        const testDiv = page.locator('#test-contenteditable-protection');
        await testDiv.click();
        await testDiv.focus();

        await expect(testDiv).toBeFocused();

        const beforeZoom = await getZoom(page);
        await page.keyboard.press('Alt+1');
        await page.waitForTimeout(400);
        const afterZoom = await getZoom(page);

        expect(afterZoom).toBeCloseTo(beforeZoom, 1);

        await page.evaluate(() => {
            document.getElementById('test-contenteditable-protection')?.remove();
        });
    });
});
