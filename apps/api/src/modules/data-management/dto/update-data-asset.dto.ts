import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { DATA_ASSET_FORMATS, SECRET_LEVELS } from './constants';
import type { DataAssetFormat, SecretLevel } from '@cdm/types';

export class UpdateDataAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(DATA_ASSET_FORMATS)
  format?: DataAssetFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsIn(SECRET_LEVELS)
  secretLevel?: SecretLevel;
}

