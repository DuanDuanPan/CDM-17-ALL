import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraphCell = {
  isVisible?: () => boolean;
};

type ExposedGraphEdge = {
  getSourceCellId?: () => string;
  getTargetCellId?: () => string;
};

type ExposedGraph = {
  getCellById: (id: string) => ExposedGraphCell | null;
  getEdges: () => ExposedGraphEdge[];
  addNode: (config: unknown) => void;
  addEdge: (config: unknown) => void;
};

test.describe('Subgraph Drill-Down Navigation (Story 8.9)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  async function waitForGraphCell(page: Page, nodeId: string) {
    await expect
      .poll(async () =>
        page.evaluate((id) => {
          const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
          return Boolean(graph?.getCellById?.(id));
        }, nodeId)
      )
      .toBe(true);
  }

  async function isGraphNodeVisible(page: Page, nodeId: string): Promise<boolean> {
    return page.evaluate((id) => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      const cell = graph?.getCellById?.(id);
      return Boolean(cell?.isVisible?.());
    }, nodeId);
  }

  async function expectGraphNodeVisible(page: Page, nodeId: string, visible: boolean) {
    await expect.poll(async () => isGraphNodeVisible(page, nodeId)).toBe(visible);
  }

  async function seedTree(page: Page) {
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

    const child = page.locator('.x6-node[data-cell-id="child-1"]').first();
    const grandchild = page.locator('.x6-node[data-cell-id="grandchild-1"]').first();
    await expect(child).toBeVisible();
    await expect(grandchild).toBeVisible();
    return { child, grandchild };
  }

  test('drills into subgraph via context menu and persists via URL hash', async ({ page }) => {
    const centerNode = page.locator('.x6-node[data-cell-id="center-node"]').first();
    await expect(centerNode).toBeVisible();

    const { child, grandchild } = await seedTree(page);

    // Leaf node: context menu should NOT show "进入子图" (AC6)
    await grandchild.click({ button: 'right' });
    await expect(page.getByRole('button', { name: /进入子图/ })).toHaveCount(0);
    await page.mouse.click(0, 0);

    // Drill into a node with children (AC1)
    await child.click({ button: 'right' });
    const drillButton = page.getByRole('button', { name: /进入子图/ });
    await expect(drillButton).toBeVisible();
    await drillButton.click();

    await expect(page.getByTestId('drill-breadcrumb')).toBeVisible();
    await expect(page).toHaveURL(/#drill=child-1/);

    await expectGraphNodeVisible(page, 'center-node', false);
    await expectGraphNodeVisible(page, 'child-1', true);
    await expectGraphNodeVisible(page, 'grandchild-1', true);

    // AC5: refresh restores drill state (URL hash is source of truth)
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForSelector('#graph-container');

    await waitForGraphCell(page, 'child-1');
    await expect(page.getByTestId('drill-breadcrumb')).toBeVisible();
    await expectGraphNodeVisible(page, 'center-node', false);
    await expectGraphNodeVisible(page, 'child-1', true);

    // AC3: click Home to return to main view
    await page.getByLabel('返回主视图').click();
    await expect(page.getByTestId('drill-breadcrumb')).toHaveCount(0);
    await expect(page).not.toHaveURL(/#drill=/);
    await expectGraphNodeVisible(page, 'center-node', true);
    await expectGraphNodeVisible(page, 'child-1', true);
  });
});
