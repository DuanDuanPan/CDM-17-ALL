import { Injectable } from '@nestjs/common';
import { RequirementProps } from '@cdm/types';
import { NodeRequirementRepository } from '../repositories/node-requirement.repository';

@Injectable()
export class RequirementService {
  constructor(private readonly requirementRepo: NodeRequirementRepository) {}

  async initialize(nodeId: string) {
    return this.requirementRepo.upsert(nodeId, { priority: 'must' });
  }

  async upsertProps(nodeId: string, props: RequirementProps) {
    const data = {
      reqType: props.reqType || null,
      acceptanceCriteria: props.acceptanceCriteria || null,
      priority: props.priority || 'must',
    };
    return this.requirementRepo.upsert(nodeId, data);
  }
}
