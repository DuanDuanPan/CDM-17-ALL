/**
 * CDM Plugin System
 *
 * NocoBase-inspired microkernel plugin architecture.
 *
 * @example
 * ```typescript
 * import { Plugin, PluginManager } from '@cdm/plugins';
 *
 * // Define a plugin
 * class MyPlugin extends Plugin {
 *   constructor() {
 *     super({
 *       name: 'my-plugin',
 *       version: '1.0.0',
 *       description: 'My custom plugin',
 *     });
 *   }
 *
 *   async beforeLoad() {
 *     // Register data models
 *   }
 *
 *   async load() {
 *     // Register routes, middleware
 *   }
 *
 *   async install() {
 *     // Initialize default data
 *   }
 * }
 *
 * // Use the plugin manager
 * const manager = new PluginManager({ context: { db, app } });
 * manager.register(new MyPlugin());
 * await manager.load();
 * await manager.installAll();
 * await manager.enableAll();
 * ```
 */

// Types
export * from './types';

// Plugin base class
export { Plugin } from './Plugin';

// Plugin manager
export { PluginManager, type PluginManagerOptions } from './PluginManager';
