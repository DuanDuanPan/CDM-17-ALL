import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DATA_ASSET_FORMATS, SECRET_LEVELS } from './constants';
import type { DataAssetFormat, SecretLevel } from '@cdm/types';

export class CreateDataAssetDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(DATA_ASSET_FORMATS)
  format?: DataAssetFormat;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  storagePath?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  graphId!: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsIn(SECRET_LEVELS)
  secretLevel?: SecretLevel;
}

