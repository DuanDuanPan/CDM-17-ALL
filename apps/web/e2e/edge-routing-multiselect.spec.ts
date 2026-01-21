import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
  getCellById: (id: string) => any;
  getEdges: () => any[];
  getNodes: () => any[];
  addNode: (config: unknown) => void;
  addEdge: (config: unknown) => void;
  getSelectedCells: () => any[];
  zoomToFit?: (options?: unknown) => void;
  centerContent?: () => void;
};

async function waitForGraphReady(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph))
    )
    .toBe(true);

  await expect(page.locator('.x6-node[data-cell-id="center-node"]').first()).toBeVisible({
    timeout: 10000,
  });
}

async function seedLargeLogicTree(page: Page) {
  await waitForGraphReady(page);

  // Switch to logic layout to match production routing/anchors.
  await page.locator('[data-testid="layout-logic"]').click();
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) return;

    const now = new Date().toISOString();

    const ensureNode = (
      id: string,
      label: string,
      x: number,
      y: number,
      parentId: string,
      nodeType: 'ORDINARY' | 'TASK' | 'REQUIREMENT' | 'PBS' | 'DATA' | 'APP' = 'ORDINARY'
    ) => {
      if (graph.getCellById(id)) return;
      graph.addNode({
        shape: 'mind-node',
        id,
        x,
        y,
        width: 180,
        height: 60,
        data: {
          id,
          label,
          type: 'topic',
          parentId,
          order: 0,
          nodeType,
          isEditing: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    };

    const ensureEdge = (id: string, source: string, target: string) => {
      const exists = graph
        .getEdges()
        .some((e) => e?.getSourceCellId?.() === source && e?.getTargetCellId?.() === target);
      if (exists) return;
      graph.addEdge({
        id,
        shape: 'cdm-hierarchical-edge',
        source: { cell: source, anchor: { name: 'bottom' } },
        target: { cell: target, anchor: { name: 'top' } },
        router: { name: 'vertical-shared-trunk' },
        connector: { name: 'rounded', args: { radius: 8 } },
        data: { type: 'hierarchical', metadata: { kind: 'hierarchical' } },
      });
    };

    // Mirror the seeded "星载软件研发" template structure (PBS/TASK/DATA/APP mix)
    // and a few dependency edges (FS). This matches the reported bug context.

    const center = graph.getCellById('center-node') as any;
    if (center?.isNode?.()) {
      const centerData = center.getData?.() ?? {};
      center.setData({
        ...centerData,
        label: '星载软件研发',
        type: 'root',
        nodeType: 'PBS',
      });
    }

    const phases = [
      {
        id: 'req-phase',
        label: '需求阶段',
        children: [
          { id: 'sw-srs', label: '软件需求规格', nodeType: 'REQUIREMENT' as const },
          { id: 'req-report', label: '需求分析报告', nodeType: 'DATA' as const },
          { id: 'req-review', label: '需求评审', nodeType: 'TASK' as const },
        ],
      },
      {
        id: 'design-phase',
        label: '设计阶段',
        children: [
          { id: 'high-design', label: '概要设计', nodeType: 'DATA' as const },
          { id: 'detail-design', label: '详细设计', nodeType: 'DATA' as const },
          { id: 'design-rev', label: '设计评审', nodeType: 'TASK' as const },
        ],
      },
      {
        id: 'code-phase',
        label: '编码阶段',
        children: [
          { id: 'code-repo', label: '代码仓库', nodeType: 'APP' as const },
          { id: 'code-review', label: '代码审查', nodeType: 'TASK' as const },
          { id: 'static-analysis', label: '静态分析', nodeType: 'TASK' as const },
        ],
      },
      {
        id: 'test-phase',
        label: '测试阶段',
        children: [
          { id: 'unit-test', label: '单元测试', nodeType: 'TASK' as const },
          { id: 'integration-test', label: '集成测试', nodeType: 'TASK' as const },
          { id: 'system-test', label: '系统测试', nodeType: 'TASK' as const },
          { id: 'test-report', label: '测试报告', nodeType: 'DATA' as const },
        ],
      },
      {
        id: 'config-mgmt',
        label: '配置管理',
        children: [
          { id: 'baseline-mgmt', label: '基线管理', nodeType: 'PBS' as const },
          { id: 'change-control', label: '变更控制', nodeType: 'TASK' as const },
          { id: 'release', label: '版本发布', nodeType: 'PBS' as const },
        ],
      },
      {
        id: 'sw-qual',
        label: '软件鉴定',
        children: [
          { id: 'qual-test', label: '鉴定测试', nodeType: 'TASK' as const },
          { id: 'qual-report', label: '鉴定报告', nodeType: 'DATA' as const },
          { id: 'sw-archive', label: '软件归档', nodeType: 'TASK' as const },
        ],
      },
    ] as const;

    phases.forEach((phase, phaseIndex) => {
      const phaseX = (phaseIndex - phases.length / 2) * 320;
      ensureNode(phase.id, phase.label, phaseX, 180, 'center-node', 'PBS');
      ensureEdge(`h-center-${phase.id}`, 'center-node', phase.id);

      phase.children.forEach((child, childIndex) => {
        const childX = phaseX + (childIndex - (phase.children.length - 1) / 2) * 260;
        ensureNode(child.id, child.label, childX, 420, phase.id, child.nodeType);
        ensureEdge(`h-${phase.id}-${child.id}`, phase.id, child.id);
      });
    });

    const ensureDependency = (
      id: string,
      source: string,
      target: string,
      dependencyType: string = 'FS'
    ) => {
      const exists = graph.getEdges().some((e) => {
        const data = e?.getData?.() as any;
        return (
          data?.metadata?.kind === 'dependency' &&
          e?.getSourceCellId?.() === source &&
          e?.getTargetCellId?.() === target
        );
      });
      if (exists) return;

      graph.addEdge({
        id,
        source,
        target,
        data: {
          metadata: {
            kind: 'dependency',
            dependencyType,
          },
        },
        router: {
          name: 'manhattan',
          args: {
            padding: 20,
          },
        },
        connector: {
          name: 'rounded',
          args: { radius: 10 },
        },
        attrs: {
          line: {
            stroke: '#9ca3af',
            strokeWidth: 1.5,
            strokeDasharray: '5 5',
            targetMarker: {
              name: 'block',
              width: 8,
              height: 8,
              offset: -1,
            },
          },
        },
      });
    };

    // Dependency edges from the template seed
    ensureDependency('d-sw-srs-req-review', 'sw-srs', 'req-review');
    ensureDependency('d-req-review-design-phase', 'req-review', 'design-phase');
    ensureDependency('d-design-rev-code-phase', 'design-rev', 'code-phase');
    ensureDependency('d-code-review-test-phase', 'code-review', 'test-phase');
    ensureDependency('d-unit-integration', 'unit-test', 'integration-test');
    ensureDependency('d-integration-system', 'integration-test', 'system-test');
    ensureDependency('d-system-qual-test', 'system-test', 'qual-test');
    ensureDependency('d-qual-test-archive', 'qual-test', 'sw-archive');

    try {
      graph.zoomToFit?.({ padding: 60, maxScale: 1 });
    } catch {
      graph.centerContent?.();
    }
  });

  await expect(page.locator('.x6-edge').first()).toBeVisible();
}

async function getNodePosition(page: Page, nodeId: string) {
  const pos = await page.evaluate((id) => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as any;
    const node = graph?.getCellById?.(id);
    const p = node?.getPosition?.();
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    return { x: p.x, y: p.y };
  }, nodeId);
  if (!pos) throw new Error(`Unable to resolve node position: ${nodeId}`);
  return pos;
}

async function getEdgeLineBox(page: Page, edgeId: string) {
  const box = await page.evaluate((id) => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as any;
    if (!graph) return null;
    const edge = graph.getCellById?.(id);
    if (!edge) return null;

    const view = edge.findView?.(graph);
    const container = view?.container as Element | undefined;
    if (!container) return null;

    const path =
      (container.querySelector('path[data-selector="line"]') as SVGPathElement | null) ??
      (container.querySelector('path[selector="line"]') as SVGPathElement | null) ??
      (container.querySelector('path') as SVGPathElement | null);
    if (!path) return null;

    const rect = path.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, edgeId);

  if (!box) throw new Error(`Unable to resolve edge path bounding box: ${edgeId}`);
  return box;
}

async function getEdgeDebugSnapshot(page: Page, edgeId: string) {
  return page.evaluate((id) => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph as any;
    if (!graph) return null;

    const edge = graph.getCellById?.(id);
    if (!edge) return null;

    const sourceId = edge.getSourceCellId?.();
    const targetId = edge.getTargetCellId?.();
    const source = sourceId ? graph.getCellById?.(sourceId) : null;
    const target = targetId ? graph.getCellById?.(targetId) : null;

    const safeBBox = (cell: any) => {
      try {
        const b = cell?.getBBox?.();
        if (
          b &&
          Number.isFinite(b.x) &&
          Number.isFinite(b.y) &&
          Number.isFinite(b.width) &&
          Number.isFinite(b.height)
        ) {
          return b;
        }
      } catch {
        // ignore
      }
      const pos = cell?.getPosition?.();
      const size = cell?.getSize?.();
      if (!pos || !size) return null;
      return { x: pos.x, y: pos.y, width: size.width, height: size.height };
    };

    const nodeInfo = (cell: any) => {
      if (!cell) return null;
      const pos = cell.getPosition?.();
      const size = cell.getSize?.();
      const bbox = safeBBox(cell);
      const data = cell.getData?.();
      return {
        id: cell.id,
        pos,
        size,
        bbox,
        isSelected: Boolean(data?.isSelected),
        visible: typeof cell.isVisible === 'function' ? Boolean(cell.isVisible()) : undefined,
      };
    };

    const sourceInfo = nodeInfo(source);
    const targetInfo = nodeInfo(target);

    const outgoing = source ? graph.getOutgoingEdges?.(source) ?? [] : [];
    const children = outgoing
      .map((e: any) => {
        const childId = e?.getTargetCellId?.();
        const child = childId ? graph.getCellById?.(childId) : null;
        return nodeInfo(child);
      })
      .filter(Boolean);

    const computed = (() => {
      if (!sourceInfo?.bbox || !targetInfo?.bbox) return null;
      const sourceCenterX = sourceInfo.bbox.x + sourceInfo.bbox.width / 2;
      const sourceBottomY = sourceInfo.bbox.y + sourceInfo.bbox.height;
      const targetCenterX = targetInfo.bbox.x + targetInfo.bbox.width / 2;
      const targetTopY = targetInfo.bbox.y;

      let minChildTopY = targetTopY;
      children.forEach((child: any) => {
        if (!child?.bbox) return;
        if (child.visible === false) return;
        minChildTopY = Math.min(minChildTopY, child.bbox.y);
      });

      const trunkY = (sourceBottomY + minChildTopY) / 2;
      const deltaX = Math.abs(sourceCenterX - targetCenterX);

      return { sourceCenterX, targetCenterX, sourceBottomY, targetTopY, minChildTopY, trunkY, deltaX };
    })();

    const view = edge.findView?.(graph);
    const container = view?.container as Element | undefined;
    const path =
      (container?.querySelector('path[data-selector="line"]') as SVGPathElement | null) ??
      (container?.querySelector('path[selector="line"]') as SVGPathElement | null) ??
      (container?.querySelector('path') as SVGPathElement | null);
    const edgeRect = path ? path.getBoundingClientRect() : null;

    return {
      graph: { zoom: graph.zoom?.(), translate: graph.translate?.() },
      edge: {
        id: edge.id,
        router: edge.getRouter?.(),
        sourceId,
        targetId,
        rect: edgeRect
          ? { x: edgeRect.x, y: edgeRect.y, width: edgeRect.width, height: edgeRect.height }
          : null,
      },
      source: sourceInfo,
      target: targetInfo,
      children,
      computed,
    };
  }, edgeId);
}

test.describe('Hierarchical edge routing stability on multi-select', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    await page.waitForSelector('[data-testid="layout-switcher"]');
    await page.evaluate(() => localStorage.clear());
  });

  test('rubberband selection should not distort hierarchical edge routes', async ({ page }) => {
    await seedLargeLogicTree(page);

    const edgeId = 'h-design-phase-detail-design';

    // Wait for any layout recalculation triggered by node additions to settle.
    await page.waitForTimeout(600);
    const posBeforeA = await getNodePosition(page, 'design-phase');
    await page.waitForTimeout(250);
    const posBeforeB = await getNodePosition(page, 'design-phase');
    expect(posBeforeA).toEqual(posBeforeB);

    const before = await getEdgeLineBox(page, edgeId);
    const beforeDebug = await getEdgeDebugSnapshot(page, edgeId);

    // Rubberband select a large region and intentionally release on top of a node.
    const graphContainer = page.locator('#graph-container');
    const box = await graphContainer.boundingBox();
    if (!box) throw new Error('Unable to resolve graph container box');

    const endNode = page.locator('.x6-node[data-cell-id="sw-archive"]').first();
    await expect(endNode).toBeVisible();
    const endBox = await endNode.boundingBox();
    if (!endBox) throw new Error('Unable to resolve end-node box');

    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 20 });
    await page.mouse.up();

    // Ensure selection happened (stress case).
    const selectedCount = await page.evaluate(() => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      if (!graph) return 0;
      return graph.getSelectedCells().filter((c: any) => c?.isNode?.()).length;
    });
    expect(selectedCount).toBeGreaterThan(18);

    // Give the graph a beat to apply any selection-related updates/transitions.
    await page.waitForTimeout(250);

    // Selection should not trigger any drag-drop reparenting/layout side effects.
    const posAfterSelect = await getNodePosition(page, 'design-phase');
    expect(posAfterSelect).toEqual(posBeforeA);

    const afterSelect = await getEdgeLineBox(page, edgeId);
    const afterSelectDebug = await getEdgeDebugSnapshot(page, edgeId);

    // Clicking any node should not be required to "fix" edge rendering.
    await page.locator('.x6-node[data-cell-id="center-node"]').first().click();
    await page.waitForTimeout(100);
    const afterClick = await getEdgeLineBox(page, edgeId);
    const afterClickDebug = await getEdgeDebugSnapshot(page, edgeId);

    const dist = (a: typeof before, b: typeof before) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.width - b.width) + Math.abs(a.height - b.height);

    // Selection should not move the edge's rendered geometry in a noticeable way.
    // (If it does, dump a debug snapshot to help diagnose the underlying router/view mismatch.)
    const delta = dist(before, afterSelect);
    if (delta >= 10) {
      const summarize = (snapshot: any) => {
        if (!snapshot) return null;
        const pickNode = (n: any) =>
          n
            ? {
              id: n.id,
              isSelected: n.isSelected,
              visible: n.visible,
              pos: n.pos,
              size: n.size,
              bbox: n.bbox,
            }
            : null;
        return {
          graph: snapshot.graph,
          edge: snapshot.edge,
          source: pickNode(snapshot.source),
          target: pickNode(snapshot.target),
          computed: snapshot.computed,
        };
      };
      // eslint-disable-next-line no-console
      console.log(
        '[edge-routing-multiselect] Debug snapshot\n' +
        JSON.stringify(
          {
            edgeId,
            delta,
            before: summarize(beforeDebug),
            afterSelect: summarize(afterSelectDebug),
            afterClick: summarize(afterClickDebug),
          },
          null,
          2
        )
      );
    }
    expect(delta).toBeLessThan(10);
    expect(dist(before, afterClick)).toBeLessThan(10);
  });
});
