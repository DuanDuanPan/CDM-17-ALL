import { Plugin } from '@cdm/plugins';
import { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { LayoutManager } from './LayoutManager';

/**
 * LayoutPlugin - Advanced layout control for mindmap
 *
 * Provides:
 * - Mindmap layout (radial/tree structure)
 * - Logic layout (horizontal hierarchy, left-to-right)
 * - Free mode (manual positioning with grid snapping)
 * - Smooth transitions between layout modes
 *
 * Story: 1.3 - Advanced Layout Control
 */
export class LayoutPlugin extends Plugin {
  private graph: Graph | null = null;
  private layoutManager: LayoutManager | null = null;
  private currentMode: LayoutMode = 'mindmap';

  constructor() {
    super({
      name: 'plugin-layout',
      version: '0.0.1',
      description: 'Advanced layout control with multiple layout modes',
      dependencies: ['plugin-mindmap-core'],
      enabledByDefault: true,
    });
  }

  /**
   * Load lifecycle: Initialize plugin
   */
  async load(): Promise<void> {
    this.logger.info('LayoutPlugin: Loading...');
    this.logger.info('LayoutPlugin: Loaded successfully');
  }

  /**
   * Initialize plugin with graph instance
   * Called from frontend after graph is created
   */
  initialize(graph: Graph, initialMode: LayoutMode = 'mindmap'): void {
    if (!graph) {
      throw new Error('Graph instance is required');
    }

    this.graph = graph;
    this.currentMode = initialMode;
    this.layoutManager = new LayoutManager(graph);

    this.logger.info(`LayoutPlugin: Initialized with mode '${initialMode}'`);
  }

  /**
   * Get current layout mode
   */
  getCurrentMode(): LayoutMode {
    return this.currentMode;
  }

  /**
   * Change layout mode
   * @param mode - New layout mode
   * @param animate - Whether to animate the transition (default: true)
   */
  async changeLayout(mode: LayoutMode, animate: boolean = true): Promise<void> {
    if (!this.layoutManager) {
      throw new Error('LayoutPlugin not initialized');
    }

    this.logger.info(`Changing layout from '${this.currentMode}' to '${mode}'`);
    this.currentMode = mode;

    await this.layoutManager.applyLayout(mode, animate);
  }

  /**
   * Get layout manager instance for advanced control
   */
  getLayoutManager(): LayoutManager | null {
    return this.layoutManager;
  }

  /**
   * Cleanup on plugin disable
   */
  async afterDisable(): Promise<void> {
    if (this.layoutManager) {
      this.layoutManager.dispose();
    }
    this.layoutManager = null;
    this.graph = null;
    this.logger.info('LayoutPlugin: Disabled');
  }
}

// Export singleton instance
export const layoutPlugin = new LayoutPlugin();

export * from './LayoutManager';
export * from './strategies/BaseLayout';
export * from './strategies/MindmapLayout';
export * from './strategies/LogicLayout';
