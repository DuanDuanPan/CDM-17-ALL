/**
 * Plugin Base Class
 *
 * NocoBase-inspired plugin architecture with complete lifecycle management.
 * All business functionality should extend this base class.
 */

import {
  PluginOptions,
  PluginContext,
  PluginState,
  PluginLifecycle,
  PluginLogger,
} from './types';

/**
 * Default console logger
 */
const defaultLogger: PluginLogger = {
  info: (msg, ...args) => console.log(`[INFO]`, msg, ...args),
  warn: (msg, ...args) => console.warn(`[WARN]`, msg, ...args),
  error: (msg, ...args) => console.error(`[ERROR]`, msg, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG]`, msg, ...args),
};

/**
 * Abstract Plugin base class
 *
 * @example
 * ```typescript
 * export class MindmapPlugin extends Plugin {
 *   async beforeLoad() {
 *     // Register collections
 *     this.db.collection({ name: 'mindmaps', fields: [...] });
 *   }
 *
 *   async load() {
 *     // Register routes, middleware
 *     this.app.resourcer.define({ name: 'mindmaps', actions: {...} });
 *   }
 *
 *   async install() {
 *     // Initialize default data
 *     await this.db.getRepository('mindmaps').create({ values: {...} });
 *   }
 * }
 * ```
 */
export abstract class Plugin implements PluginLifecycle {
  /** Plugin name */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Plugin description */
  readonly description?: string;

  /** Plugin dependencies */
  readonly dependencies: string[];

  /** Whether enabled by default */
  readonly enabledByDefault: boolean;

  /** Current plugin state */
  private _state: PluginState = PluginState.REGISTERED;

  /** Plugin context (injected by PluginManager) */
  protected context: PluginContext = {};

  /** Logger instance */
  protected logger: PluginLogger;

  constructor(options: PluginOptions) {
    this.name = options.name;
    this.version = options.version;
    this.description = options.description;
    this.dependencies = options.dependencies ?? [];
    this.enabledByDefault = options.enabledByDefault ?? true;
    this.logger = defaultLogger;
  }

  /**
   * Get current plugin state
   */
  get state(): PluginState {
    return this._state;
  }

  /**
   * Set plugin state (internal use)
   */
  setState(state: PluginState): void {
    this._state = state;
  }

  /**
   * Set plugin context (called by PluginManager)
   */
  setContext(context: PluginContext): void {
    this.context = context;
    if (context.logger) {
      this.logger = context.logger;
    }
  }

  /**
   * Get database instance from context
   */
  protected get db(): any {
    return this.context.db;
  }

  /**
   * Get application instance from context
   */
  protected get app(): any {
    return this.context.app;
  }

  /**
   * Get plugin configuration
   */
  protected get config(): Record<string, any> {
    return this.context.config ?? {};
  }

  // ═══════════════════════════════════════════════════════════
  // Lifecycle Methods (Override in subclasses)
  // ═══════════════════════════════════════════════════════════

  /**
   * Called before the plugin is loaded.
   * Register data models, migrations, field types here.
   */
  async beforeLoad(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when the plugin is loaded.
   * Register resources, middleware, event listeners here.
   */
  async load(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called after all plugins are loaded.
   */
  async afterLoad(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when the plugin is first installed.
   * Initialize default data, create system configurations here.
   */
  async install(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called after the plugin is enabled.
   */
  async afterEnable(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called after the plugin is disabled.
   * Clean up runtime resources here.
   */
  async afterDisable(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when the plugin is removed.
   * Clean up database data, revert migrations here.
   */
  async remove(): Promise<void> {
    // Override in subclass
  }

  /**
   * Get plugin metadata
   */
  toJSON(): PluginOptions & { state: PluginState } {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      dependencies: this.dependencies,
      enabledByDefault: this.enabledByDefault,
      state: this.state,
    };
  }
}
