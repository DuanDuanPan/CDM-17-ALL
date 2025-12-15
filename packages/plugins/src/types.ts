/**
 * Plugin System Types
 *
 * NocoBase-inspired plugin lifecycle and configuration types.
 */

/**
 * Plugin lifecycle state
 */
export enum PluginState {
  /** Plugin is registered but not loaded */
  REGISTERED = 'registered',
  /** Plugin is loading */
  LOADING = 'loading',
  /** Plugin is loaded and ready */
  LOADED = 'loaded',
  /** Plugin is installed (first-time setup complete) */
  INSTALLED = 'installed',
  /** Plugin is enabled and running */
  ENABLED = 'enabled',
  /** Plugin is disabled */
  DISABLED = 'disabled',
  /** Plugin encountered an error */
  ERROR = 'error',
}

/**
 * Plugin metadata configuration
 */
export interface PluginOptions {
  /** Unique plugin name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Plugin dependencies (other plugin names) */
  dependencies?: string[];
  /** Whether plugin is enabled by default */
  enabledByDefault?: boolean;
}

/**
 * Application context passed to plugins
 */
export interface PluginContext {
  /** Database instance */
  db?: any;
  /** Application instance */
  app?: any;
  /** Logger instance */
  logger?: PluginLogger;
  /** Plugin configuration from environment/settings */
  config?: Record<string, any>;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Plugin lifecycle hooks interface
 */
export interface PluginLifecycle {
  /**
   * Called before the plugin is loaded.
   * Use for registering data models, migrations, field types.
   */
  beforeLoad?(): Promise<void>;

  /**
   * Called when the plugin is loaded.
   * Use for registering resources, middleware, event listeners.
   */
  load?(): Promise<void>;

  /**
   * Called after all plugins are loaded.
   */
  afterLoad?(): Promise<void>;

  /**
   * Called when the plugin is first installed.
   * Use for initializing default data, creating system configurations.
   */
  install?(): Promise<void>;

  /**
   * Called after the plugin is enabled.
   */
  afterEnable?(): Promise<void>;

  /**
   * Called after the plugin is disabled.
   * Use for cleaning up runtime resources.
   */
  afterDisable?(): Promise<void>;

  /**
   * Called when the plugin is removed.
   * Use for cleaning up database data, reverting migrations.
   */
  remove?(): Promise<void>;
}

/**
 * Plugin event types
 */
export type PluginEventType =
  | 'beforeLoad'
  | 'load'
  | 'afterLoad'
  | 'install'
  | 'afterEnable'
  | 'afterDisable'
  | 'remove'
  | 'error';

/**
 * Plugin event payload
 */
export interface PluginEvent {
  type: PluginEventType;
  plugin: string;
  timestamp: Date;
  error?: Error;
}

/**
 * Plugin manager events
 */
export interface PluginManagerEvents {
  onPluginRegistered?(event: PluginEvent): void;
  onPluginLoaded?(event: PluginEvent): void;
  onPluginEnabled?(event: PluginEvent): void;
  onPluginDisabled?(event: PluginEvent): void;
  onPluginError?(event: PluginEvent): void;
}
