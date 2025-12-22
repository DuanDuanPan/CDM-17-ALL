import { Injectable } from '@nestjs/common';
import type { PBSProps } from '@cdm/types';
// Import Prisma from @cdm/database (now exported as value for DbNull access)
import { Prisma } from '@cdm/database';
import { NodePBSRepository } from '../repositories/node-pbs.repository';

@Injectable()
export class PBSService {
  constructor(private readonly pbsRepo: NodePBSRepository) { }

  async initialize(nodeId: string) {
    return this.pbsRepo.upsert(nodeId, { version: 'v1.0.0' });
  }

  async upsertProps(nodeId: string, props: PBSProps) {
    // HIGH-1 Fix: Properly handle null to clear JSON fields
    // - undefined: don't update the field (Prisma ignores undefined)
    // - null: explicitly clear the field using Prisma.DbNull
    // - value: update with the new value
    const getJsonValue = <T>(value: T | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined => {
      if (value === null) return Prisma.DbNull;
      if (value === undefined) return undefined;
      return value as unknown as Prisma.InputJsonValue;
    };

    const data = {
      code: props.code || null,
      version: props.version || 'v1.0.0',
      ownerId: props.ownerId || null,
      // Story 2.7: PBS Indicators and Product Library Reference
      indicators: getJsonValue(props.indicators),
      productRef: getJsonValue(props.productRef),
    };
    return this.pbsRepo.upsert(nodeId, data);
  }
}


