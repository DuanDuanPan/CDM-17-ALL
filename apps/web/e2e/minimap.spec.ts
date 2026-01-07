import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
  translate: () => { tx: number; ty: number };
  zoom: () => number;
  getCellById: (id: string) => unknown | null;
  addNode: (config: unknown) => void;
  cleanSelection: () => void;
  select: (cell: unknown) => void;
};

async function waitForGraph(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph)))
    .toBe(true);
}

async function getTranslate(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    return graph?.translate?.() ?? { tx: 0, ty: 0 };
  });
}

async function seedNodes(page: Page) {
  await waitForGraph(page);
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

    ensureNode('minimap-n1', 'Node 1', 400, 0);
    ensureNode('minimap-n2', 'Node 2', 1200, 600);
  });
}

test.describe('Minimap Navigation (Story 8.2)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    await waitForGraph(page);
  });

  test('toggles minimap via button and hotkey (AC1)', async ({ page }) => {
    await expect(page.getByTestId('minimap-container')).toBeVisible();

    await page.getByTestId('minimap-toggle').click();
    await expect(page.getByTestId('minimap-show-button')).toBeVisible();
    await expect(page.getByTestId('minimap-container')).toHaveCount(0);

    await page.getByTestId('minimap-show-button').click();
    await expect(page.getByTestId('minimap-container')).toBeVisible();

    // Hotkey requires focus
    await page.getByTestId('graph-canvas').click();
    await page.keyboard.press('m');
    await expect(page.getByTestId('minimap-show-button')).toBeVisible();

    await page.keyboard.press('m');
    await expect(page.getByTestId('minimap-container')).toBeVisible();
  });

  test('dragging minimap viewport pans the graph (AC2)', async ({ page }) => {
    const viewport = page.getByTestId('minimap-container').locator('.x6-widget-minimap-viewport');
    await expect(viewport).toBeVisible();

    const start = await getTranslate(page);

    const box = await viewport.boundingBox();
    if (!box) throw new Error('Minimap viewport bounding box not available');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
    await page.mouse.up();

    await expect
      .poll(async () => getTranslate(page))
      .not.toEqual(start);
  });

  test('clicking minimap navigates with animation (AC3)', async ({ page }) => {
    await seedNodes(page);

    const miniGraph = page.getByTestId('minimap-container').locator('.x6-graph');
    await expect(miniGraph).toBeVisible();

    const start = await getTranslate(page);

    // Click near the bottom-right of the minimap to force a noticeable pan.
    await miniGraph.click({ position: { x: 180, y: 130 } });

    await expect
      .poll(async () => getTranslate(page))
      .not.toEqual(start);
  });

  test('renders selected/search highlights in minimap (AC5/AC6)', async ({ page }) => {
    await seedNodes(page);

    await page.evaluate(() => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      if (!graph) return;
      const cell = graph.getCellById('minimap-n1');
      if (!cell) return;
      graph.cleanSelection();
      graph.select(cell);
    });

    await expect(page.getByTestId('minimap-container').locator('.selected-node-highlight')).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mindmap:search-results', {
        detail: { graphId: null, nodeIds: ['minimap-n2'] },
      }));
    });

    await expect(page.getByTestId('minimap-container').locator('.search-match-highlight')).toBeVisible();
  });
});

