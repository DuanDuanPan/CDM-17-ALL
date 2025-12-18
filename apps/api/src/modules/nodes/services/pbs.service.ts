import { Injectable } from '@nestjs/common';
import { PBSProps } from '@cdm/types';
import { NodePBSRepository } from '../repositories/node-pbs.repository';

@Injectable()
export class PBSService {
  constructor(private readonly pbsRepo: NodePBSRepository) {}

  async initialize(nodeId: string) {
    return this.pbsRepo.upsert(nodeId, { version: 'v1.0.0' });
  }

  async upsertProps(nodeId: string, props: PBSProps) {
    const data = {
      code: props.code || null,
      version: props.version || 'v1.0.0',
      ownerId: props.ownerId || null,
    };
    return this.pbsRepo.upsert(nodeId, data);
  }
}
