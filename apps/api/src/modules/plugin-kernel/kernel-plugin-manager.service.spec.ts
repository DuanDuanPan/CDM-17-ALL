/**
 * Story 7.5: PluginManager integration test
 *
 * Tests that the kernel can use PluginManager from @cdm/plugins
 * to register and manage plugins. This test validates the plugin
 * infrastructure contract without importing full NestJS modules.
 */
import { Plugin, PluginManager, PluginState, type PluginContext, type PluginLogger } from '@cdm/plugins';

class MockServerPlugin extends Plugin {
  constructor(name: string) {
    super({
      name,
      version: '0.0.1',
      description: `Mock plugin: ${name}`,
      dependencies: [],
      enabledByDefault: true,
    });
  }

  async load(): Promise<void> {
    // Mock load - in real implementation this validates NestJS providers
  }
}

describe('Story 7.5 - PluginManager kernel integration', () => {
  it('PluginManager can register, load and enable plugins', async () => {
    const logs: string[] = [];
    const mockLogger: PluginLogger = {
      info: (msg: string) => logs.push(`INFO: ${msg}`),
      warn: (msg: string) => logs.push(`WARN: ${msg}`),
      error: (msg: string) => logs.push(`ERROR: ${msg}`),
      debug: (msg: string) => logs.push(`DEBUG: ${msg}`),
    };

    const context: PluginContext = {
      logger: mockLogger,
    };

    const manager = new PluginManager({ context });

    // Register mock plugins (simulating what kernel does in app.module.ts)
    manager
      .register(new MockServerPlugin('plugin-mindmap-core'))
      .register(new MockServerPlugin('plugin-workflow-approval'))
      .register(new MockServerPlugin('plugin-comments'));

    await manager.load();
    await manager.enableAll();

    const status = manager.getStatus();

    expect(status['plugin-mindmap-core']).toBe(PluginState.ENABLED);
    expect(status['plugin-workflow-approval']).toBe(PluginState.ENABLED);
    expect(status['plugin-comments']).toBe(PluginState.ENABLED);
    // Verify manager is functional
    expect(Object.keys(status)).toHaveLength(3);
  });

  it('PluginManager handles duplicate plugin registration gracefully', () => {
    const warnLogs: string[] = [];
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation((msg) => warnLogs.push(msg));

    const manager = new PluginManager({ context: {} });

    manager.register(new MockServerPlugin('my-plugin'));
    manager.register(new MockServerPlugin('my-plugin')); // Should warn, not throw

    expect(warnLogs.some((l) => l.includes('already registered'))).toBe(true);
    expect(manager.getStatus()['my-plugin']).toBe(PluginState.REGISTERED);

    consoleSpy.mockRestore();
  });
});

