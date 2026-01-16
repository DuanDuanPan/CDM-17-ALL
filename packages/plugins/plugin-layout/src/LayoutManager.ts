import { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { BaseLayout } from './strategies/BaseLayout';
import { MindmapLayout } from './strategies/MindmapLayout';
import { LogicLayout } from './strategies/LogicLayout';
import { NetworkLayout } from './strategies/NetworkLayout';

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

  // Node panning behavior state
  private nodePanningCleanup: (() => void) | null = null;

  constructor(graph: Graph) {
    this.graph = graph;
    this.strategies = new Map<LayoutMode, BaseLayout>([
      ['mindmap' as LayoutMode, new MindmapLayout(graph)],
      ['logic' as LayoutMode, new LogicLayout(graph)],
      ['network' as LayoutMode, new NetworkLayout(graph)],
      // 'free' mode doesn't use a strategy (manual positioning)
    ]);

    // Listen for node additions to apply movable setting
    this.setupNodeAddedListener();

    // Setup node drag -> canvas pan behavior for auto-layout modes
    this.setupNodePanningBehavior();
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
   * Setup node panning behavior for auto-layout modes
   * In mindmap/logic modes, dragging a node will pan the canvas instead of moving the node
   */
  private setupNodePanningBehavior(): void {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const onNodeMouseDown = ({ e }: { e: MouseEvent }) => {
      // Only intercept in auto-layout modes (not free mode)
      if (this.currentMode === 'free') return;

      // Start panning
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;

      // Get current scroll position
      const transform = this.graph.translate();
      startScrollLeft = transform.tx;
      startScrollTop = transform.ty;

      // Update cursor to grabbing
      document.body.style.cursor = 'grabbing';

      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Apply panning
      this.graph.translate(startScrollLeft + dx, startScrollTop + dy);
    };

    const onMouseUp = () => {
      if (!isPanning) return;

      isPanning = false;
      document.body.style.cursor = '';
    };

    // Attach event listeners
    this.graph.on('node:mousedown', onNodeMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Store cleanup function
    this.nodePanningCleanup = () => {
      this.graph.off('node:mousedown', onNodeMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * Setup listener for node additions to apply cursor style
   */
  private setupNodeAddedListener(): void {
    this.nodeAddedListener = ({ node }: { node: any }) => {
      // Apply cursor style to newly added node based on current mode
      // Use 'grab' for auto-layout modes to indicate canvas can be panned
      const isFreeMode = this.currentMode === 'free';

      node.setAttrs({
        body: {
          ...node.getAttrs().body,
          cursor: isFreeMode ? 'move' : 'grab',
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
          cursor: enable ? 'move' : 'grab',
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

    if (this.nodePanningCleanup) {
      this.nodePanningCleanup();
      this.nodePanningCleanup = null;
    }
  }

  /**
   * Get current layout mode
   */
  getCurrentMode(): LayoutMode {
    return this.currentMode;
  }
}
