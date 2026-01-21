/**
 * Story 10.4: Upload File DTO
 */

import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FileOwnerType, type FileOwnerType as FileOwnerTypeType } from '@cdm/database';

export class UploadFileDto {
    @IsString()
    @IsNotEmpty()
    graphId: string;

    @IsOptional()
    @IsEnum(FileOwnerType)
    ownerType?: FileOwnerTypeType;

    @IsOptional()
    @IsString()
    ownerId?: string;
}
