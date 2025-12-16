import { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { BaseLayout } from './strategies/BaseLayout';
import { MindmapLayout } from './strategies/MindmapLayout';
import { LogicLayout } from './strategies/LogicLayout';

/**
 * LayoutManager - Orchestrates layout transitions and mode switching
 *
 * Responsibilities:
 * - Maintain current layout mode
 * - Apply layout algorithms based on mode
 * - Handle smooth transitions with animations
 * - Manage grid visibility and snapping
 */
export class LayoutManager {
  private graph: Graph;
  private strategies: Map<LayoutMode, BaseLayout>;
  private currentMode: LayoutMode = 'mindmap';
  private nodeAddedListener: ((args: { node: any }) => void) | null = null;

  constructor(graph: Graph) {
    this.graph = graph;
    this.strategies = new Map<LayoutMode, BaseLayout>([
      ['mindmap' as LayoutMode, new MindmapLayout(graph)],
      ['logic' as LayoutMode, new LogicLayout(graph)],
      // 'free' mode doesn't use a strategy (manual positioning)
    ]);

    // Listen for node additions to apply movable setting
    this.setupNodeAddedListener();
  }

  /**
   * Apply layout based on current mode
   * @param mode - Layout mode to apply
   * @param animate - Whether to animate the transition
   */
  async applyLayout(mode: LayoutMode, animate: boolean = true): Promise<void> {
    this.currentMode = mode;

    if (mode === 'free') {
      // Free mode: No automatic layout, enable grid
      this.enableGridSnapping(true);
      this.enableNodeDragging(true);
      return;
    }

    // Auto layout modes (mindmap, logic)
    const strategy = this.strategies.get(mode);
    if (!strategy) {
      throw new Error(`Unknown layout mode: ${mode}`);
    }

    this.enableGridSnapping(false);
    this.enableNodeDragging(false);

    await strategy.apply(animate);
  }

  /**
   * Recalculate and apply current layout
   * Used when graph structure changes (add/remove nodes)
   */
  async recalculate(animate: boolean = true): Promise<void> {
    if (this.currentMode === 'free') {
      // Don't auto-layout in free mode
      return;
    }

    const strategy = this.strategies.get(this.currentMode);
    if (strategy) {
      await strategy.apply(animate);
    }
  }

  /**
   * Enable/disable grid snapping
   */
  private enableGridSnapping(enable: boolean): void {
    // X6 options type definitions are incomplete - use type assertion for snapline
    const graphOptions = this.graph.options as any;

    if (enable) {
      // Draw grid
      this.graph.drawGrid({
        type: 'dot',
        args: {
          color: '#e0e0e0',
          thickness: 1,
        },
      });

      // Enable snap to grid for node positioning
      if (graphOptions.snapline) {
        graphOptions.snapline = {
          ...graphOptions.snapline,
          enabled: true,
        };
      }

      // Enable grid-based snapping via interacting options
      if (typeof this.graph.options.interacting === 'object') {
        this.graph.options.interacting = {
          ...this.graph.options.interacting,
          nodeMovable: true,
        };
      }

    } else {
      this.graph.clearGrid();

      // Disable snapline
      if (graphOptions.snapline) {
        graphOptions.snapline = {
          ...graphOptions.snapline,
          enabled: false,
        };
      }

    }
  }

  /**
   * Setup listener for node additions to apply cursor style
   */
  private setupNodeAddedListener(): void {
    this.nodeAddedListener = ({ node }: { node: any }) => {
      // Apply cursor style to newly added node based on current mode
      const isDraggingEnabled = this.currentMode === 'free';

      node.setAttrs({
        body: {
          ...node.getAttrs().body,
          cursor: isDraggingEnabled ? 'move' : 'default',
        },
      });
    };

    this.graph.on('node:added', this.nodeAddedListener);
  }

  /**
   * Enable/disable node dragging
   */
  private enableNodeDragging(enable: boolean): void {
    // Update graph interacting configuration
    if (typeof this.graph.options.interacting === 'object') {
      this.graph.options.interacting = {
        ...this.graph.options.interacting,
        nodeMovable: enable,
      };
    } else {
      this.graph.options.interacting = { nodeMovable: enable };
    }

    // Update cursor style for visual feedback
    const nodes = this.graph.getNodes();
    nodes.forEach((node) => {
      node.setAttrs({
        body: {
          ...node.getAttrs().body,
          cursor: enable ? 'move' : 'default',
        },
      });
    });
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    if (this.nodeAddedListener) {
      this.graph.off('node:added', this.nodeAddedListener);
      this.nodeAddedListener = null;
    }
  }

  /**
   * Get current layout mode
   */
  getCurrentMode(): LayoutMode {
    return this.currentMode;
  }
}
