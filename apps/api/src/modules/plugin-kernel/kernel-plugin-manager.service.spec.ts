import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PluginState } from '@cdm/plugins';
import { MindmapCoreServerModule } from '@cdm/plugin-mindmap-core/server';
import { WorkflowApprovalServerModule } from '@cdm/plugin-workflow-approval/server';
import { CommentsServerModule } from '@cdm/plugin-comments/server';
import { KernelPluginManagerService } from './kernel-plugin-manager.service';

describe('KernelPluginManagerService', () => {
  it('registers and loads server plugins via PluginManager', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        MindmapCoreServerModule.register(),
        WorkflowApprovalServerModule.register(),
        CommentsServerModule.register(),
      ],
      providers: [KernelPluginManagerService],
    }).compile();

    const service = moduleRef.get(KernelPluginManagerService);
    await service.onModuleInit();
    const manager = service.getManager();

    expect(manager).toBeDefined();
    const status = manager!.getStatus();
    expect(status['plugin-mindmap-core']).toBe(PluginState.ENABLED);
    expect(status['plugin-workflow-approval']).toBe(PluginState.ENABLED);
    expect(status['plugin-comments']).toBe(PluginState.ENABLED);
  });
});
