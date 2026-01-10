import { IsIn, IsOptional, IsString } from 'class-validator';
import { DATA_LINK_TYPES } from './constants';
import type { DataLinkType } from '@cdm/types';

export class CreateNodeDataLinkDto {
  @IsString()
  nodeId!: string;

  @IsString()
  assetId!: string;

  @IsOptional()
  @IsIn(DATA_LINK_TYPES)
  linkType?: DataLinkType;

  @IsOptional()
  @IsString()
  note?: string;
}

