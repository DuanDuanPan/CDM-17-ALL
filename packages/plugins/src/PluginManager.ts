/**
 * Plugin Manager
 *
 * Manages plugin registration, lifecycle, and dependency resolution.
 * Inspired by NocoBase's plugin management system.
 */

import { Plugin } from './Plugin';
import {
  PluginState,
  PluginContext,
  PluginManagerEvents,
  PluginEvent,
} from './types';

/**
 * Plugin Manager Options
 */
export interface PluginManagerOptions {
  /** Application context to pass to plugins */
  context?: PluginContext;
  /** Event handlers */
  events?: PluginManagerEvents;
}

/**
 * Plugin Manager
 *
 * @example
 * ```typescript
 * const manager = new PluginManager({
 *   context: { db, app, logger }
 * });
 *
 * // Register plugins
 * manager.register(new MindmapPlugin());
 * manager.register(new CollaborationPlugin());
 *
 * // Load all plugins (respects dependencies)
 * await manager.load();
 *
 * // Enable/disable individual plugins
 * await manager.enable('collaboration');
 * await manager.disable('collaboration');
 * ```
 */
export class PluginManager {
  /** Registered plugins */
  private plugins: Map<string, Plugin> = new Map();

  /** Plugin context */
  private context: PluginContext;

  /** Event handlers */
  private events: PluginManagerEvents;

  /** Installation status tracking */
  private installedPlugins: Set<string> = new Set();

  constructor(options: PluginManagerOptions = {}) {
    this.context = options.context ?? {};
    this.events = options.events ?? {};
  }

  /**
   * Set plugin context (can be updated after construction)
   */
  setContext(context: PluginContext): void {
    this.context = { ...this.context, ...context };
    // Update context for all registered plugins
    for (const plugin of this.plugins.values()) {
      plugin.setContext(this.context);
    }
  }

  /**
   * Register a plugin
   */
  register(plugin: Plugin): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Skipping.`);
      return this;
    }

    plugin.setContext(this.context);
    this.plugins.set(plugin.name, plugin);

    this.emit('onPluginRegistered', {
      type: 'beforeLoad',
      plugin: plugin.name,
      timestamp: new Date(),
    });

    return this;
  }

  /**
   * Get a registered plugin by name
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get plugins sorted by dependencies (topological sort)
   */
  private getSortedPlugins(): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      const plugin = this.plugins.get(name);
      if (!plugin) return;

      visiting.add(name);

      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(
            `Plugin "${name}" depends on "${dep}" which is not registered`
          );
        }
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(plugin);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Load all registered plugins
   */
  async load(): Promise<void> {
    const sorted = this.getSortedPlugins();

    // Phase 1: beforeLoad
    for (const plugin of sorted) {
      try {
        plugin.setState(PluginState.LOADING);
        await plugin.beforeLoad();
      } catch (error) {
        plugin.setState(PluginState.ERROR);
        this.emit('onPluginError', {
          type: 'error',
          plugin: plugin.name,
          timestamp: new Date(),
          error: error as Error,
        });
        throw error;
      }
    }

    // Phase 2: load
    for (const plugin of sorted) {
      try {
        await plugin.load();
        plugin.setState(PluginState.LOADED);

        this.emit('onPluginLoaded', {
          type: 'load',
          plugin: plugin.name,
          timestamp: new Date(),
        });
      } catch (error) {
        plugin.setState(PluginState.ERROR);
        this.emit('onPluginError', {
          type: 'error',
          plugin: plugin.name,
          timestamp: new Date(),
          error: error as Error,
        });
        throw error;
      }
    }

    // Phase 3: afterLoad
    for (const plugin of sorted) {
      try {
        await plugin.afterLoad();
      } catch (error) {
        plugin.setState(PluginState.ERROR);
        throw error;
      }
    }
  }

  /**
   * Install a plugin (first-time setup)
   */
  async install(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" is not registered`);
    }

    if (this.installedPlugins.has(name)) {
      console.warn(`Plugin "${name}" is already installed. Skipping.`);
      return;
    }

    try {
      await plugin.install();
      plugin.setState(PluginState.INSTALLED);
      this.installedPlugins.add(name);
    } catch (error) {
      plugin.setState(PluginState.ERROR);
      throw error;
    }
  }

  /**
   * Install all plugins that haven't been installed
   */
  async installAll(): Promise<void> {
    const sorted = this.getSortedPlugins();

    for (const plugin of sorted) {
      if (!this.installedPlugins.has(plugin.name)) {
        await this.install(plugin.name);
      }
    }
  }

  /**
   * Enable a plugin
   */
  async enable(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" is not registered`);
    }

    if (plugin.state === PluginState.ENABLED) {
      return;
    }

    // Ensure dependencies are enabled
    for (const dep of plugin.dependencies) {
      const depPlugin = this.plugins.get(dep);
      if (depPlugin && depPlugin.state !== PluginState.ENABLED) {
        await this.enable(dep);
      }
    }

    try {
      await plugin.afterEnable();
      plugin.setState(PluginState.ENABLED);

      this.emit('onPluginEnabled', {
        type: 'afterEnable',
        plugin: plugin.name,
        timestamp: new Date(),
      });
    } catch (error) {
      plugin.setState(PluginState.ERROR);
      throw error;
    }
  }

  /**
   * Enable all plugins that are enabled by default
   */
  async enableAll(): Promise<void> {
    const sorted = this.getSortedPlugins();

    for (const plugin of sorted) {
      if (plugin.enabledByDefault) {
        await this.enable(plugin.name);
      }
    }
  }

  /**
   * Disable a plugin
   */
  async disable(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" is not registered`);
    }

    if (plugin.state === PluginState.DISABLED) {
      return;
    }

    // Check if any enabled plugins depend on this one
    for (const [depName, depPlugin] of this.plugins) {
      if (
        depPlugin.state === PluginState.ENABLED &&
        depPlugin.dependencies.includes(name)
      ) {
        throw new Error(
          `Cannot disable "${name}": plugin "${depName}" depends on it`
        );
      }
    }

    try {
      await plugin.afterDisable();
      plugin.setState(PluginState.DISABLED);

      this.emit('onPluginDisabled', {
        type: 'afterDisable',
        plugin: plugin.name,
        timestamp: new Date(),
      });
    } catch (error) {
      plugin.setState(PluginState.ERROR);
      throw error;
    }
  }

  /**
   * Remove a plugin
   */
  async remove(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" is not registered`);
    }

    // Disable first if enabled
    if (plugin.state === PluginState.ENABLED) {
      await this.disable(name);
    }

    try {
      await plugin.remove();
      this.plugins.delete(name);
      this.installedPlugins.delete(name);
    } catch (error) {
      plugin.setState(PluginState.ERROR);
      throw error;
    }
  }

  /**
   * Get plugin states summary
   */
  getStatus(): Record<string, PluginState> {
    const status: Record<string, PluginState> = {};
    for (const [name, plugin] of this.plugins) {
      status[name] = plugin.state;
    }
    return status;
  }

  /**
   * Emit an event
   */
  private emit(
    eventName: keyof PluginManagerEvents,
    event: PluginEvent
  ): void {
    const handler = this.events[eventName];
    if (handler) {
      handler(event);
    }
  }
}
