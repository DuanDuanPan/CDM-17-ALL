import { MindmapCoreServerModule, NodeRepository } from '@cdm/plugin-mindmap-core/server';

describe('Story 7.5 - Cross-plugin imports', () => {
  it('plugin-workflow-approval can import @cdm/plugin-mindmap-core/server', () => {
    expect(MindmapCoreServerModule).toBeDefined();
    expect(NodeRepository).toBeDefined();
  });
});

