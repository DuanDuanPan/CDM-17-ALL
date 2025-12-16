import { Plugin } from '@cdm/plugins';
import { Graph } from '@antv/x6';
import {
  AddSiblingCommand,
  AddChildCommand,
  RemoveNodeCommand,
} from './commands';

/**
 * MindmapCorePlugin - Core mindmap functionality
 *
 * Responsibilities:
 * - Register MindNode React shape (handled in frontend)
 * - Provide command execution logic for node operations (AddChild, AddSibling, Remove)
 * - Handle custom DOM events for component communication
 *
 * Note: Keyboard shortcuts are handled in GraphComponent.tsx to avoid focus conflicts
 * Based on NocoBase plugin architecture pattern
 */
export class MindmapCorePlugin extends Plugin {
  private graph: Graph | null = null;
  private addSiblingCommand = new AddSiblingCommand();
  private addChildCommand = new AddChildCommand();
  private removeNodeCommand = new RemoveNodeCommand();

  constructor() {
    super({
      name: 'plugin-mindmap-core',
      version: '0.0.1',
      description: 'Core mindmap functionality with node operation commands',
      dependencies: [],
      enabledByDefault: true,
    });
  }

  /**
   * Load lifecycle: Register shape and keyboard shortcuts
   */
  async load(): Promise<void> {
    this.logger.info('MindmapCorePlugin: Loading...');

    // Shape registration will be handled by the frontend
    // This plugin focuses on command logic that can be tested server-side
    // Frontend integration happens in apps/web/hooks/useMindmapPlugin.ts

    this.logger.info('MindmapCorePlugin: Loaded successfully');
  }

  /**
   * Initialize plugin with graph instance
   * Called from frontend after graph is created
   */
  initialize(graph: Graph): void {
    if (!graph) {
      throw new Error('Graph instance is required');
    }

    this.graph = graph;
    // NOTE: App-level keyboard handling lives in `apps/web/components/graph/GraphComponent.tsx`.
    // Keeping shortcut bindings here caused duplicated behavior and focus conflicts (especially for Tab/Space).
    // This plugin remains responsible for command logic (AddChild/AddSibling/Remove) that can be unit-tested.
    this.logger.info('MindmapCorePlugin: Initialized with graph instance');
  }

  /**
   * Bind custom DOM events for component communication
   */
  private bindCustomEvents(): void {
    if (!this.graph) return;

    this.graph.container.addEventListener(
      'mindmap:node-operation',
      this.handleNodeOperation as EventListener
    );
  }

  /**
   * Handle custom node operations from React components
   */
  private handleNodeOperation = (e: CustomEvent) => {
    if (!this.graph) return;

    const { action, nodeId } = e.detail;
    const node = this.graph.getCellById(nodeId) as any;

    if (!node) return;

    if (action === 'addChild') {
      const newNode = this.addChildCommand.execute(this.graph, node);
      if (newNode) {
        this.graph.select(newNode);
      }
    }
  };

  /**
   * Unbind custom events
   */
  private unbindCustomEvents(): void {
    if (!this.graph) return;

    this.graph.container.removeEventListener(
      'mindmap:node-operation',
      this.handleNodeOperation as EventListener
    );
  }


  /**
   * Cleanup everything
   */
  dispose(): void {
    this.unbindCustomEvents();
  }


  /**
   * Cleanup on plugin disable
   */
  async afterDisable(): Promise<void> {
    this.unbindCustomEvents();
    this.graph = null;
    this.logger.info('MindmapCorePlugin: Disabled');
  }
}

// Export singleton instance
export const mindmapCorePlugin = new MindmapCorePlugin();

export * from './commands';
