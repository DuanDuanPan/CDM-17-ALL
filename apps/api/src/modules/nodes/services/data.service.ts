import { Injectable } from '@nestjs/common';
import { DataProps } from '@cdm/types';
import { NodeDataRepository } from '../repositories/node-data.repository';

@Injectable()
export class DataService {
  constructor(private readonly dataRepo: NodeDataRepository) {}

  async initialize(nodeId: string) {
    return this.dataRepo.upsert(nodeId, { secretLevel: 'public' });
  }

  async upsertProps(nodeId: string, props: DataProps) {
    const data = {
      dataType: props.dataType || 'document',
      version: props.version || 'v1.0.0',
      secretLevel: props.secretLevel || 'public',
      storagePath: props.storagePath || null,
    };
    return this.dataRepo.upsert(nodeId, data);
  }
}
