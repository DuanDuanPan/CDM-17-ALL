import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraphCell = {
  isVisible?: () => boolean;
  getData?: () => unknown;
};

type ExposedGraphEdge = {
  getSourceCellId?: () => string;
  getTargetCellId?: () => string;
};

type ExposedGraph = {
  getCellById: (id: string) => ExposedGraphCell | null;
  getOutgoingEdges?: (id: string) => ExposedGraphEdge[] | null;
  getEdges: () => ExposedGraphEdge[];
  addNode: (config: unknown) => void;
  addEdge: (config: unknown) => void;
  getSelectedCells: () => unknown[];
  unselect: (cells: unknown[]) => void;
  select: (cell: unknown) => void;
};

test.describe('Node Collapse & Expand (Story 8.1)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  // Prefer Ctrl in E2E: Cmd+[ / Cmd+] are browser navigation shortcuts on macOS and may not reach the app.
  const collapseShortcut = 'Control+BracketLeft';
  const expandShortcut = 'Control+BracketRight';

  async function waitForGraphCell(page: Page, nodeId: string) {
    await expect
      .poll(async () => page.evaluate((id) => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        return Boolean(graph?.getCellById?.(id));
      }, nodeId))
      .toBe(true);
  }

  async function isGraphNodeVisible(page: Page, nodeId: string): Promise<boolean> {
    return page.evaluate((id) => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      const cell = graph?.getCellById?.(id);
      return Boolean(cell?.isVisible?.());
    }, nodeId);
  }

  async function isGraphNodeCollapsed(page: Page, nodeId: string): Promise<boolean> {
    return page.evaluate((id) => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      const cell = graph?.getCellById?.(id);
      const data = cell?.getData?.() as { collapsed?: unknown } | undefined;
      return data?.collapsed === true;
    }, nodeId);
  }

  async function expectGraphNodeVisible(page: Page, nodeId: string, visible: boolean) {
    await expect.poll(async () => isGraphNodeVisible(page, nodeId)).toBe(visible);
  }

  async function expectGraphNodeCollapsed(page: Page, nodeId: string, collapsed: boolean) {
    await expect.poll(async () => isGraphNodeCollapsed(page, nodeId)).toBe(collapsed);
  }

  async function seedTree(page: Page) {
    // Graph is exposed in dev mode for debugging; use it to seed a stable tree for collapse tests.
    await expect
      .poll(async () => page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph)))
      .toBe(true);

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

      ensureNode('child-1', '子节点1', 200, 0, 'center-node');
      ensureNode('grandchild-1', '孙节点1', 400, 0, 'child-1');
      ensureEdge('center-node', 'child-1');
      ensureEdge('child-1', 'grandchild-1');
    });

    const child = page.locator('.x6-node[data-cell-id="child-1"]');
    const grandchild = page.locator('.x6-node[data-cell-id="grandchild-1"]');
    await expect(child).toBeVisible();
    await expect(grandchild).toBeVisible();

    // Ensure edges are connected so UI can reflect child counts
    await expect
      .poll(async () => page.evaluate(() => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        return graph?.getOutgoingEdges?.('center-node')?.length ?? 0;
      }))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => page.evaluate(() => {
        const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
        return graph?.getOutgoingEdges?.('child-1')?.length ?? 0;
      }))
      .toBeGreaterThan(0);
    return { child, grandchild };
  }

  test('should collapse/expand subtree via hotkeys and keep positions', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();

    const { child, grandchild } = await seedTree(page);
    await centerNode.click();

    const childBoxBefore = await child.boundingBox();
    const grandchildBoxBefore = await grandchild.boundingBox();
    expect(childBoxBefore).toBeTruthy();
    expect(grandchildBoxBefore).toBeTruthy();

    // Collapse center node
    await page.keyboard.press(collapseShortcut);
    await expectGraphNodeCollapsed(page, 'center-node', true);

    await expectGraphNodeVisible(page, 'child-1', false);
    await expectGraphNodeVisible(page, 'grandchild-1', false);

    const badge = page.getByTestId('child-count-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('+2');

    // Expand
    await page.keyboard.press(expandShortcut);
    await expectGraphNodeCollapsed(page, 'center-node', false);
    await expectGraphNodeVisible(page, 'child-1', true);
    await expectGraphNodeVisible(page, 'grandchild-1', true);

    const childBoxAfter = await child.boundingBox();
    const grandchildBoxAfter = await grandchild.boundingBox();
    expect(childBoxAfter).toBeTruthy();
    expect(grandchildBoxAfter).toBeTruthy();

    // AC2: Node coordinates should remain stable (no layout reflow)
    expect(Math.abs(childBoxAfter!.x - childBoxBefore!.x)).toBeLessThan(6);
    expect(Math.abs(childBoxAfter!.y - childBoxBefore!.y)).toBeLessThan(6);
    expect(Math.abs(grandchildBoxAfter!.x - grandchildBoxBefore!.x)).toBeLessThan(6);
    expect(Math.abs(grandchildBoxAfter!.y - grandchildBoxBefore!.y)).toBeLessThan(6);
  });

	  test('should recursively collapse descendants via context menu', async ({ page }) => {
	    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
	    await expect(centerNode).toBeVisible();

	    await seedTree(page);

    // Right-click menu: "折叠所有后代"
    await centerNode.click({ button: 'right' });
    const collapseAll = page.getByRole('button', { name: /折叠所有后代/ });
    await expect(collapseAll).toBeVisible();
    await collapseAll.click();
    await expectGraphNodeCollapsed(page, 'center-node', true);

    await expectGraphNodeVisible(page, 'child-1', false);
    await expectGraphNodeVisible(page, 'grandchild-1', false);

    // Expand root: child becomes visible but remains collapsed (grandchild stays hidden)
    await centerNode.click();
    await page.keyboard.press(expandShortcut);
    await expectGraphNodeCollapsed(page, 'center-node', false);
    await expectGraphNodeVisible(page, 'child-1', true);
    await expectGraphNodeVisible(page, 'grandchild-1', false);

	    // Expand child to reveal grandchild
	    await page.evaluate(() => {
	      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
	      if (!graph) return;
	      const node = graph?.getCellById?.('child-1');
	      if (!graph || !node) return;
	      graph.unselect(graph.getSelectedCells());
	      graph.select(node);
    });
    await page.locator('#graph-container').focus();
    await page.keyboard.press(expandShortcut);
    await expectGraphNodeCollapsed(page, 'child-1', false);
    await expectGraphNodeVisible(page, 'grandchild-1', true);
  });

  test('should persist collapsed state after reload', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();

    await seedTree(page);
    await centerNode.click();

    await page.keyboard.press(collapseShortcut);
    await expectGraphNodeCollapsed(page, 'center-node', true);
    await expectGraphNodeVisible(page, 'child-1', false);

    // Give collaboration/persistence a moment
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForSelector('#graph-container');
    await waitForGraphCell(page, 'child-1');
    await expectGraphNodeCollapsed(page, 'center-node', true);

    const centerAfterReload = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerAfterReload).toBeVisible();

    await expectGraphNodeVisible(page, 'child-1', false);
    await expect(page.getByTestId('child-count-badge')).toBeVisible();
  });

  test('should auto-expand ancestor path when navigating to a hidden node', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
    await expect(centerNode).toBeVisible();

    const { grandchild } = await seedTree(page);
    await centerNode.click();

    // Collapse root so target becomes hidden
    await page.keyboard.press(collapseShortcut);
    await expectGraphNodeCollapsed(page, 'center-node', true);
    await expectGraphNodeVisible(page, 'grandchild-1', false);

    // Simulate search/notification navigation (TopBar listens to this and calls GraphContext.navigateToNode)
    await page.evaluate((nodeId) => {
      window.dispatchEvent(new CustomEvent('notification:navigate', { detail: { nodeId } }));
    }, 'grandchild-1');

    await expectGraphNodeCollapsed(page, 'center-node', false);
    await expectGraphNodeVisible(page, 'grandchild-1', true);
    await expect(grandchild).toBeVisible();
  });
});
