/**
 * CDM Plugin System
 *
 * This package serves as the root for all CDM plugins following the
 * Nocobase-style microkernel architecture.
 *
 * Plugins should be placed in subdirectories and registered here.
 */

// Plugin interface definition
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  initialize: () => Promise<void>;
  destroy?: () => Promise<void>;
}

// Plugin registry (will be populated as plugins are added)
export const plugins: Map<string, Plugin> = new Map();

// Plugin registration function
export function registerPlugin(plugin: Plugin): void {
  if (plugins.has(plugin.name)) {
    console.warn(`Plugin "${plugin.name}" is already registered. Skipping.`);
    return;
  }
  plugins.set(plugin.name, plugin);
}

// Plugin retrieval function
export function getPlugin(name: string): Plugin | undefined {
  return plugins.get(name);
}

// Initialize all registered plugins
export async function initializePlugins(): Promise<void> {
  for (const [name, plugin] of plugins) {
    try {
      await plugin.initialize();
      console.log(`Plugin "${name}" initialized successfully.`);
    } catch (error) {
      console.error(`Failed to initialize plugin "${name}":`, error);
    }
  }
}
