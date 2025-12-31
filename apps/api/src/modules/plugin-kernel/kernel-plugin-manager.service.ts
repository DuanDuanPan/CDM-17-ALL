/**
 * KernelPluginManagerService
 *
 * Story 7.5: Kernel Purification
 * Provides a thin "kernel loader" that uses the shared `@cdm/plugins` PluginManager
 * to register and validate server-side plugins at bootstrap time.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Plugin, PluginManager, type PluginContext, type PluginLogger } from '@cdm/plugins';
import { NodesService, EdgesService } from '@cdm/plugin-mindmap-core/server';
import { ApprovalService } from '@cdm/plugin-workflow-approval/server';
import { CommentsService } from '@cdm/plugin-comments/server';

interface KernelPluginContext extends PluginContext {
  moduleRef: ModuleRef;
}

type PluginContextWithModuleRef = { moduleRef?: ModuleRef };

function requireProvider(moduleRef: ModuleRef, token: unknown, label: string): void {
  try {
    const resolved = moduleRef.get(token as never, { strict: false });
    if (!resolved) {
      throw new Error('resolved to undefined');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Kernel plugin check failed: missing provider "${label}": ${message}`);
  }
}

class MindmapCoreServerPlugin extends Plugin {
  constructor() {
    super({
      name: 'plugin-mindmap-core',
      version: '0.0.1',
      description: 'Mindmap core server plugin (Nest module)',
      dependencies: [],
      enabledByDefault: true,
    });
  }

  async load(): Promise<void> {
    const moduleRef = (this.context as PluginContextWithModuleRef).moduleRef;
    if (!moduleRef) {
      throw new Error('Kernel plugin context missing moduleRef');
    }

    requireProvider(moduleRef, NodesService, 'NodesService');
    requireProvider(moduleRef, EdgesService, 'EdgesService');
  }
}

class WorkflowApprovalServerPlugin extends Plugin {
  constructor() {
    super({
      name: 'plugin-workflow-approval',
      version: '0.0.1',
      description: 'Workflow approval server plugin (Nest module)',
      dependencies: ['plugin-mindmap-core'],
      enabledByDefault: true,
    });
  }

  async load(): Promise<void> {
    const moduleRef = (this.context as PluginContextWithModuleRef).moduleRef;
    if (!moduleRef) {
      throw new Error('Kernel plugin context missing moduleRef');
    }

    requireProvider(moduleRef, EventEmitter2, 'EventEmitter2');
    requireProvider(moduleRef, ApprovalService, 'ApprovalService');
  }
}

class CommentsServerPlugin extends Plugin {
  constructor() {
    super({
      name: 'plugin-comments',
      version: '0.0.1',
      description: 'Comments server plugin (Nest module)',
      dependencies: [],
      enabledByDefault: true,
    });
  }

  async load(): Promise<void> {
    const moduleRef = (this.context as PluginContextWithModuleRef).moduleRef;
    if (!moduleRef) {
      throw new Error('Kernel plugin context missing moduleRef');
    }

    requireProvider(moduleRef, CommentsService, 'CommentsService');
  }
}

@Injectable()
export class KernelPluginManagerService implements OnModuleInit {
  private readonly logger = new Logger(KernelPluginManagerService.name);
  private manager: PluginManager | undefined;

  constructor(private readonly moduleRef: ModuleRef) {}

  getManager(): PluginManager | undefined {
    return this.manager;
  }

  async onModuleInit(): Promise<void> {
    const pluginLogger: PluginLogger = {
      info: (message, ...args) => this.logger.log(message, ...args),
      warn: (message, ...args) => this.logger.warn(message, ...args),
      error: (message, ...args) => this.logger.error(message, ...args),
      debug: (message, ...args) => this.logger.debug(message, ...args),
    };

    const context: KernelPluginContext = {
      logger: pluginLogger,
      moduleRef: this.moduleRef,
    };

    this.manager = new PluginManager({
      context,
    });

    this.manager
      .register(new MindmapCoreServerPlugin())
      .register(new WorkflowApprovalServerPlugin())
      .register(new CommentsServerPlugin());

    await this.manager.load();
    await this.manager.enableAll();
  }
}
