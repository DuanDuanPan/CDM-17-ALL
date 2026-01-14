import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { DATA_LINK_TYPES } from './constants';
import type { DataLinkType } from '@cdm/types';

export class CreateNodeDataLinksBatchDto {
  @IsString()
  nodeId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  assetIds!: string[];

  @IsOptional()
  @IsIn(DATA_LINK_TYPES)
  linkType?: DataLinkType;
}

