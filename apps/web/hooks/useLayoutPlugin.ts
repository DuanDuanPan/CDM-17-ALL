import { useEffect, useState, useCallback } from 'react';
import { Graph, type Node } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { layoutPlugin } from '@cdm/plugin-layout';
import { useToast } from '@cdm/ui';
import { isDependencyEdge } from '@/lib/edgeValidation';
import { VERTICAL_SHARED_TRUNK_ROUTER } from '@/lib/edgeRoutingConstants';
import { HIERARCHICAL_EDGE_SHAPE } from '@/lib/edgeShapes';

/**
 * Hook to integrate layout plugin with the graph
 *
 * Provides:
 * - Layout mode management
 * - Grid snapping control
 * - Layout switching with animations
 *
 * Story: 1.3 - Advanced Layout Control
 */
export function useLayoutPlugin(graph: Graph | null, isReady: boolean, currentMode: LayoutMode) {
  const [gridEnabled, setGridEnabled] = useState(false);
  const { addToast } = useToast();
  const isDocumentVisible = useCallback(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
    []
  );

  // Initialize layout plugin when graph is ready
  useEffect(() => {
    if (!graph || !isReady) return;

    // Initialize plugin with graph instance
    layoutPlugin.initialize(graph, currentMode);

    // Set initial interacting configuration based on mode
    const nodeMovable = currentMode === 'free';

    // Direct modification of interacting options
    if (typeof graph.options.interacting === 'object') {
      graph.options.interacting = {
        ...graph.options.interacting,
        nodeMovable,
      };
    } else {
      graph.options.interacting = { nodeMovable };
    }

    // Story 1.3 + Story 2.6 FIX: Also control Selection plugin's movable option
    // This prevents dragging selected nodes in mindmap/logic modes
    if (nodeMovable) {
      graph.enableSelectionMovable();
    } else {
      graph.disableSelectionMovable();
    }

    // Apply initial layout
    // In collaboration scenarios, a hidden/minimized browser can have stale node sizes
    // (React-shape auto-resize doesn't run), which leads to incorrect auto-layout that
    // then gets synced to other clients. Avoid running layout while document is hidden.
    if (isDocumentVisible()) {
      layoutPlugin.changeLayout(currentMode, false).then(() => {
        refreshHierarchicalEdges(graph, currentMode);
      }).catch((err) => {
        console.error('Failed to apply initial layout:', err);
        addToast({
          type: 'error',
          title: '布局初始化失败',
          description: err instanceof Error ? err.message : '无法应用初始布局',
        });
      });
    }
  }, [graph, isReady, currentMode, addToast, isDocumentVisible]);

  // React to external layout mode changes (e.g., toolbar toggle)
  useEffect(() => {
    if (!graph || !isReady) return;

    // Update interacting configuration based on mode
    const nodeMovable = currentMode === 'free';

    // Direct modification of interacting options
    if (typeof graph.options.interacting === 'object') {
      graph.options.interacting = {
        ...graph.options.interacting,
        nodeMovable,
      };
    } else {
      graph.options.interacting = { nodeMovable };
    }

    // Story 1.3 + Story 2.6 FIX: Also control Selection plugin's movable option
    // This prevents dragging selected nodes in mindmap/logic modes
    if (nodeMovable) {
      graph.enableSelectionMovable();
    } else {
      graph.disableSelectionMovable();
    }
    if (isDocumentVisible()) {
      layoutPlugin.changeLayout(currentMode, true).then(() => {
        refreshHierarchicalEdges(graph, currentMode);
      }).catch((err) => {
        console.error('Failed to change layout:', err);
        addToast({
          type: 'error',
          title: '布局切换失败',
          description: err instanceof Error ? err.message : '无法切换到新布局',
        });
      });
    }
  }, [graph, isReady, currentMode, addToast, isDocumentVisible]);

  // Handle layout mode change
  const handleLayoutChange = useCallback(
    async (mode: LayoutMode) => {
      if (!graph || !isReady) return;

      await layoutPlugin.changeLayout(mode, true).catch((err) => {
        console.error('Failed to change layout:', err);
        addToast({
          type: 'error',
          title: '布局切换失败',
          description: err instanceof Error ? err.message : '无法切换到新布局',
        });
      });
    },
    [graph, isReady, addToast]
  );

  // Handle grid toggle
  const handleGridToggle = useCallback(
    (enabled: boolean) => {
      if (!graph || !isReady) return;

      setGridEnabled(enabled);

      const layoutManager = layoutPlugin.getLayoutManager();
      if (layoutManager) {
        // Grid management is handled by LayoutManager
        // Re-apply current layout to update grid state
        layoutPlugin.changeLayout(currentMode, false).catch((err) => {
          console.error('Failed to toggle grid:', err);
          addToast({
            type: 'error',
            title: '网格切换失败',
            description: err instanceof Error ? err.message : '无法切换网格状态',
          });
        });
      }
    },
    [graph, isReady, currentMode, addToast]
  );

  // Recalculate layout when graph structure changes (nodes added/removed/visibility changed)
  useEffect(() => {
    if (!graph || !isReady || currentMode === 'free') return;

    // Debounce recalculation to avoid thrashing when many nodes mount/resize at once.
    // This is especially important on page refresh: React-shape nodes are created with
    // a small default size, then auto-resized after render. If we layout too early,
    // siblings can overlap because the layout algorithm used outdated heights.
    let recalcTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingStructuralChanges = 0;
    let pendingSizeChanges = 0;

    const scheduleRecalculate = (reason: 'structure' | 'size') => {
      if (!isDocumentVisible()) return;
      if (reason === 'size') {
        pendingSizeChanges += 1;
      } else {
        pendingStructuralChanges += 1;
      }
      if (recalcTimer) clearTimeout(recalcTimer);
      recalcTimer = setTimeout(() => {
        recalcTimer = null;
        if (!isDocumentVisible()) return;
        const layoutManager = layoutPlugin.getLayoutManager();
        if (!layoutManager) return;
        const shouldAnimate = pendingStructuralChanges <= 1 && pendingSizeChanges <= 1;
        pendingStructuralChanges = 0;
        pendingSizeChanges = 0;

        const recalcPromise = layoutManager?.recalculate(shouldAnimate);
        Promise.resolve(recalcPromise).then(() => {
          refreshHierarchicalEdges(graph, currentMode);
        }).catch((err) => {
          console.error('Failed to recalculate layout:', err);
          addToast({
            type: 'error',
            title: '布局重新计算失败',
            description: err instanceof Error ? err.message : '无法重新计算布局',
          });
        });
      }, 120);
    };

    const handleNodeAdded = () => scheduleRecalculate('structure');
    const handleNodeRemoved = () => scheduleRecalculate('structure');
    const handleNodeVisibilityChange = () => scheduleRecalculate('structure');
    const handleNodeSizeChange = () => scheduleRecalculate('size');

    // Listen for node add/remove events
    graph.on('node:added', handleNodeAdded);
    graph.on('node:removed', handleNodeRemoved);

    // Story 2.7: Listen for node visibility changes (archive/restore)
    // When a node is archived (hidden) or restored (shown), recalculate layout
    graph.on('node:change:visible', handleNodeVisibilityChange);
    // When a node auto-resizes after render (React shape), recalculate layout to prevent overlap
    graph.on('node:change:size', handleNodeSizeChange);

    return () => {
      if (recalcTimer) {
        clearTimeout(recalcTimer);
        recalcTimer = null;
      }
      if (graph && typeof graph.off === 'function') {
        graph.off('node:added', handleNodeAdded);
        graph.off('node:removed', handleNodeRemoved);
        graph.off('node:change:visible', handleNodeVisibilityChange);
        graph.off('node:change:size', handleNodeSizeChange);
      }
    };
  }, [graph, isReady, currentMode, addToast, isDocumentVisible]);

  // In non-free mode, transform drag-drop into hierarchy/order changes
  useEffect(() => {
    if (!graph || !isReady) return;

    // Debounce edge refresh to avoid O(n^2) updates during batch inserts (e.g. template import).
    let edgeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const handleEdgeAdded = () => {
      if (edgeRefreshTimer) clearTimeout(edgeRefreshTimer);
      edgeRefreshTimer = setTimeout(() => {
        edgeRefreshTimer = null;
        refreshHierarchicalEdges(graph, currentMode);
      }, 0);
    };

    graph.on('edge:added', handleEdgeAdded);

    const handleNodeMouseUp = ({ node, e }: { node: Node; e: MouseEvent }) => {
      if (currentMode === 'free') return;
      if (!graph.clientToLocal) return;

      const local = graph.clientToLocal(e.clientX, e.clientY);
      const dropTarget = findTargetNode(graph, node.id, local.x, local.y);
      if (!dropTarget) return;

      const targetData = dropTarget.getData() || {};
      const parentId = targetData.parentId ?? (targetData.type === 'root' ? targetData.id : undefined);

      // Re-parent and insert after target (order uses fractional then normalize)
      const currentData = node.getData() || {};
      const newOrder = (targetData.order ?? 0) + 0.5;
      node.setData({ ...currentData, parentId, order: newOrder });

      normalizeSiblingOrder(graph, parentId, currentMode);

      const layoutManager = layoutPlugin.getLayoutManager();
      layoutManager?.recalculate(true);
    };

    graph.on('node:mouseup', handleNodeMouseUp);
    return () => {
      if (edgeRefreshTimer) {
        clearTimeout(edgeRefreshTimer);
        edgeRefreshTimer = null;
      }
      graph.off('edge:added', handleEdgeAdded);
      graph.off('node:mouseup', handleNodeMouseUp);
    };
  }, [graph, isReady, currentMode]);

  return {
    gridEnabled,
    handleLayoutChange,
    handleGridToggle,
  };
}

function refreshHierarchicalEdges(graph: Graph | null, mode: LayoutMode) {
  if (!graph) return;
  const edges = graph.getEdges?.() ?? [];
  // Logic layout is a strict top-to-bottom tree, so we use a shared-trunk router and fixed anchors.
  // Free mode keeps whatever spatial arrangement the user already has (often inherited from mindmap),
  // so forcing a vertical router there will produce incorrect-looking routes.
  const useVertical = mode === 'logic';
  edges.forEach((edge) => {
    if (isDependencyEdge(edge)) return;
    edge.prop('shape', HIERARCHICAL_EDGE_SHAPE);
    const sourceId = edge.getSourceCellId?.();
    const targetId = edge.getTargetCellId?.();
    if (sourceId && targetId) {
      if (useVertical) {
        edge.setSource({ cell: sourceId, anchor: { name: 'bottom' } });
        edge.setTarget({ cell: targetId, anchor: { name: 'top' } });
      } else {
        edge.setSource({ cell: sourceId });
        edge.setTarget({ cell: targetId });
      }
    }
    if (useVertical) {
      edge.setRouter({ name: VERTICAL_SHARED_TRUNK_ROUTER });
      edge.setConnector({ name: 'rounded', args: { radius: 8 } });
    } else {
      edge.removeRouter();
      edge.setConnector({ name: 'smooth' });
    }
  });

  forceUpdateHierarchicalEdgeViews(graph, edges);
}

function forceUpdateHierarchicalEdgeViews(graph: Graph, edges: unknown[]) {
  const updateNow = () => {
    edges.forEach((edge: any) => {
      if (!edge || isDependencyEdge(edge)) return;
      const view = edge.findView?.(graph) as { update?: () => void } | null;
      view?.update?.();
    });
  };

  updateNow();

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(updateNow);
  } else {
    setTimeout(updateNow, 0);
  }
}

// Helpers
function findTargetNode(graph: Graph, draggedId: string, x: number, y: number) {
  const nodes = graph.getNodes().filter((n) => n.id !== draggedId);
  return nodes.find((n) => {
    const bbox = n.getBBox();
    return x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height;
  });
}

/**
 * Normalize sibling order based on position: right-to-left (X desc), top-to-bottom (Y asc)
 * This ensures consistent ordering after drag-drop operations
 */
function normalizeSiblingOrder(graph: Graph, parentId: string | undefined, mode: LayoutMode) {
  const siblings = graph.getNodes().filter((n) => {
    const data = n.getData() || {};
    const pid = data.parentId ?? (data.type === 'root' ? undefined : undefined);
    return pid === parentId;
  });

  // Sort by position based on layout mode
  const sortByPosition = (a: Node, b: Node) => {
    const posA = a.getPosition();
    const posB = b.getPosition();

    if (mode === 'logic') {
      // Vertical logic layout: left-to-right (X asc), then top-to-bottom (Y asc)
      if (posA.x !== posB.x) return posA.x - posB.x;
      if (posA.y !== posB.y) return posA.y - posB.y;
      return a.id.localeCompare(b.id);
    }

    // Default: right-to-left (X desc), top-to-bottom (Y asc)
    if (posA.x !== posB.x) return posB.x - posA.x;
    if (posA.y !== posB.y) return posA.y - posB.y;
    return a.id.localeCompare(b.id);
  };

  siblings
    .sort(sortByPosition)
    .forEach((n, idx) => {
      const data = n.getData() || {};
      n.setData({ ...data, order: idx });
    });
}
