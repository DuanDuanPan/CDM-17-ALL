/**
 * Story 2.9: APP Node Service
 * Handles APP node type-specific property management
 */

import { Injectable } from '@nestjs/common';
import type { AppProps, AppInput, AppOutput } from '@cdm/types';
import { Prisma } from '@cdm/database';
import { NodeAppRepository } from '../repositories/node-app.repository';

@Injectable()
export class AppService {
  constructor(private readonly appRepo: NodeAppRepository) {}

  /**
   * Initialize APP extension table for a node
   */
  async initialize(nodeId: string): Promise<void> {
    await this.appRepo.upsert(nodeId, {
      appSourceType: 'library',
      executionStatus: 'idle',
    });
  }

  /**
   * Convert value to Prisma-compatible JSON value or DbNull
   */
  private getJsonValue<T>(
    value: T | null | undefined
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (value === null) return Prisma.DbNull;
    if (value === undefined) return undefined;
    return value as unknown as Prisma.InputJsonValue;
  }

  /**
   * Upsert APP properties for a node
   */
  async upsertProps(nodeId: string, props: AppProps): Promise<void> {
    await this.appRepo.upsert(nodeId, {
      appSourceType: props.appSourceType ?? 'library',
      appPath: props.appPath,
      appUrl: props.appUrl,
      libraryAppId: props.libraryAppId,
      libraryAppName: props.libraryAppName,
      inputs: this.getJsonValue(props.inputs),
      outputs: this.getJsonValue(props.outputs),
      executionStatus: props.executionStatus ?? 'idle',
      lastExecutedAt: props.lastExecutedAt ? new Date(props.lastExecutedAt) : null,
      errorMessage: props.errorMessage,
    });
  }

  /**
   * Get APP properties for a node
   */
  async getProps(nodeId: string): Promise<AppProps | null> {
    const appProps = await this.appRepo.findByNodeId(nodeId);

    if (!appProps) return null;

    return {
      appSourceType: appProps.appSourceType as AppProps['appSourceType'],
      appPath: appProps.appPath,
      appUrl: appProps.appUrl,
      libraryAppId: appProps.libraryAppId,
      libraryAppName: appProps.libraryAppName,
      inputs: appProps.inputs as unknown as AppInput[] | undefined,
      outputs: appProps.outputs as unknown as AppOutput[] | undefined,
      executionStatus: appProps.executionStatus as AppProps['executionStatus'],
      lastExecutedAt: appProps.lastExecutedAt?.toISOString() ?? null,
      errorMessage: appProps.errorMessage,
    };
  }
}
