import { test, expect, type Page } from '@playwright/test';

type ExposedGraphCell = {
  isNode: () => boolean;
  getBBox?: () => { center?: { x: number; y: number } };
};

type ExposedGraph = {
  getCellById?: (id: string) => ExposedGraphCell | null;
  getNodes?: () => ExposedGraphCell[];
  cleanSelection?: () => void;
  select: (cell: ExposedGraphCell) => void;
  getSelectedCells: () => ExposedGraphCell[];
  localToClient: (x: number, y: number) => { x: number; y: number };
};

async function openFirstGraph(page: Page) {
  await page.goto('/');
  const graphContainer = page.locator('#graph-container');
  if (!(await graphContainer.isVisible({ timeout: 3000 }).catch(() => false))) {
    await page.waitForSelector('main .cursor-pointer', { timeout: 15000 });
    await page.locator('main .cursor-pointer').first().click();
  }
  await page.waitForSelector('#graph-container', { timeout: 15000 });
}

async function selectCenterNode(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __cdmGraph?: unknown }).__cdmGraph, null, { timeout: 10000 });
  await page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) throw new Error('Graph not exposed on window');
    const cell = graph.getCellById?.('center-node') ?? graph.getNodes?.()?.[0];
    if (!cell) throw new Error('No node found to select');
    graph.cleanSelection?.();
    graph.select(cell);
  });
}

async function getSelectedNodeCount(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) return 0;
    return graph.getSelectedCells().filter((c) => c.isNode()).length;
  });
}

async function getNodeCenterClientPoint(page: Page, nodeId: string) {
  return page.evaluate((id) => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) throw new Error('Graph not exposed on window');
    const cell = graph.getCellById?.(id);
    if (!cell) throw new Error(`Node not found: ${id}`);
    const bbox = cell.getBBox?.();
    if (!bbox?.center) throw new Error(`No bbox for node: ${id}`);
    const p = graph.localToClient(bbox.center.x, bbox.center.y);
    return { x: p.x, y: p.y };
  }, nodeId);
}

test.describe('Context Menu keeps selection', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstGraph(page);
  });

  test('Right-click on selected node keeps selection and menu items', async ({ page }) => {
    await selectCenterNode(page);

    const before = await getSelectedNodeCount(page);
    expect(before).toBeGreaterThan(0);

    const center = await getNodeCenterClientPoint(page, 'center-node');
    await page.mouse.click(center.x, center.y, { button: 'right' });

    const pasteItem = page.locator('button:has-text("粘贴到此处")');
    await expect(pasteItem).toBeVisible();

    const copyItem = page.locator('button:has-text("复制")');
    await expect(copyItem).toBeVisible();
    await page.waitForTimeout(200);
    await expect(copyItem).toBeVisible();

    const after = await getSelectedNodeCount(page);
    expect(after).toBe(before);
  });
});
