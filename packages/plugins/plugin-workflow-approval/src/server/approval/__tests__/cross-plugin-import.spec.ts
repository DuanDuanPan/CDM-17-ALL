/**
 * Story 7.5: Cross-plugin import contract tests
 *
 * Validates that plugin-workflow-approval can import and use
 * exports from plugin-mindmap-core/server.
 */
import {
  MindmapCoreServerModule,
  NodeRepository,
  NodesModule,
  EdgesModule,
  NodesService,
  EdgesService,
} from '@cdm/plugin-mindmap-core/server';

describe('Story 7.5 - Cross-plugin imports', () => {
  describe('Module exports', () => {
    it('MindmapCoreServerModule is a valid NestJS module class', () => {
      expect(MindmapCoreServerModule).toBeDefined();
      expect(typeof MindmapCoreServerModule).toBe('function');
      // Verify it has register/forRoot methods (dynamic module pattern)
      expect(typeof MindmapCoreServerModule.register).toBe('function');
      expect(typeof MindmapCoreServerModule.forRoot).toBe('function');
    });

    it('NodesModule and EdgesModule are exported', () => {
      expect(NodesModule).toBeDefined();
      expect(EdgesModule).toBeDefined();
    });
  });

  describe('Service exports', () => {
    it('NodesService is a valid injectable class', () => {
      expect(NodesService).toBeDefined();
      expect(typeof NodesService).toBe('function');
    });

    it('EdgesService is a valid injectable class', () => {
      expect(EdgesService).toBeDefined();
      expect(typeof EdgesService).toBe('function');
    });
  });

  describe('Repository exports', () => {
    it('NodeRepository is a valid injectable class', () => {
      expect(NodeRepository).toBeDefined();
      expect(typeof NodeRepository).toBe('function');
    });
  });

  describe('Dynamic module configuration', () => {
    it('MindmapCoreServerModule.register() returns valid DynamicModule', () => {
      const dynamicModule = MindmapCoreServerModule.register();

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(MindmapCoreServerModule);
      expect(Array.isArray(dynamicModule.imports)).toBe(true);
      expect(Array.isArray(dynamicModule.exports)).toBe(true);
    });

    it('MindmapCoreServerModule.forRoot() accepts configuration', () => {
      const dynamicModule = MindmapCoreServerModule.forRoot({
        nodesImports: [],
        edgesImports: [],
      });

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(MindmapCoreServerModule);
    });
  });
});
