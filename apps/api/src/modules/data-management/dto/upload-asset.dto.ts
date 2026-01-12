/**
 * Story 9.5: Data Upload & Node Linking
 * DTO for uploading a data asset
 */

import { IsString, IsOptional } from 'class-validator';

export class UploadAssetDto {
  @IsString()
  graphId: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
