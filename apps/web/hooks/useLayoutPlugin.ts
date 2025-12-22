import { useEffect, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { layoutPlugin } from '@cdm/plugin-layout';
import { useToast } from '@cdm/ui';

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
    layoutPlugin.changeLayout(currentMode, false).catch((err) => {
      console.error('Failed to apply initial layout:', err);
      addToast({
        type: 'error',
        title: '布局初始化失败',
        description: err instanceof Error ? err.message : '无法应用初始布局',
      });
    });
  }, [graph, isReady, currentMode, addToast]);

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
    layoutPlugin.changeLayout(currentMode, true).catch((err) => {
      console.error('Failed to change layout:', err);
      addToast({
        type: 'error',
        title: '布局切换失败',
        description: err instanceof Error ? err.message : '无法切换到新布局',
      });
    });
  }, [graph, isReady, currentMode, addToast]);

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

    const handleGraphChange = () => {
      const layoutManager = layoutPlugin.getLayoutManager();
      if (layoutManager) {
        // Recalculate layout with animation
        layoutManager.recalculate(true).catch((err) => {
          console.error('Failed to recalculate layout:', err);
          addToast({
            type: 'error',
            title: '布局重新计算失败',
            description: err instanceof Error ? err.message : '无法重新计算布局',
          });
        });
      }
    };

    // Listen for node add/remove events
    graph.on('node:added', handleGraphChange);
    graph.on('node:removed', handleGraphChange);

    // Story 2.7: Listen for node visibility changes (archive/restore)
    // When a node is archived (hidden) or restored (shown), recalculate layout
    graph.on('node:change:visible', handleGraphChange);

    return () => {
      if (graph && typeof graph.off === 'function') {
        graph.off('node:added', handleGraphChange);
        graph.off('node:removed', handleGraphChange);
        graph.off('node:change:visible', handleGraphChange);
      }
    };
  }, [graph, isReady, currentMode, addToast]);

  // In non-free mode, transform drag-drop into hierarchy/order changes
  useEffect(() => {
    if (!graph || !isReady) return;

    const handleNodeMouseUp = ({ node, e }: { node: any; e: MouseEvent }) => {
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

      normalizeSiblingOrder(graph, parentId);

      const layoutManager = layoutPlugin.getLayoutManager();
      layoutManager?.recalculate(true);
    };

    graph.on('node:mouseup', handleNodeMouseUp);
    return () => {
      graph.off('node:mouseup', handleNodeMouseUp);
    };
  }, [graph, isReady, currentMode]);

  return {
    gridEnabled,
    handleLayoutChange,
    handleGridToggle,
  };
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
function normalizeSiblingOrder(graph: Graph, parentId?: string) {
  const siblings = graph.getNodes().filter((n) => {
    const data = n.getData() || {};
    const pid = data.parentId ?? (data.type === 'root' ? undefined : undefined);
    return pid === parentId;
  });

  // Sort by position: right-to-left (X descending), top-to-bottom (Y ascending)
  siblings
    .sort((a, b) => {
      const posA = a.getPosition();
      const posB = b.getPosition();
      // Primary: X descending (right to left)
      if (posA.x !== posB.x) {
        return posB.x - posA.x;
      }
      // Secondary: Y ascending (top to bottom)
      if (posA.y !== posB.y) {
        return posA.y - posB.y;
      }
      // Tertiary: ID for stable sort
      return a.id.localeCompare(b.id);
    })
    .forEach((n, idx) => {
      const data = n.getData() || {};
      n.setData({ ...data, order: idx });
    });
}
