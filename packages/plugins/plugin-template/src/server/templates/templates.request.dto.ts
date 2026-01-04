import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import type { TemplateStructure } from '@cdm/types';

/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Request DTOs for TemplatesController
 */

export class TemplatesListQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  // Story 5.2: User ID for visibility filtering
  @IsOptional()
  @IsString()
  userId?: string;

  // Story 5.2: Filter to only user's own templates
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mine?: boolean;
}

export class InstantiateTemplateQueryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class GetTemplateQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

export class InstantiateTemplateBodyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}

// Story 5.2: Query parameters for creating a template
export class CreateTemplateQueryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

// Story 5.2: Request body for creating a template from subtree
export class CreateTemplateBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsObject()
  @IsNotEmpty()
  structure!: TemplateStructure;

  @IsOptional()
  @IsString()
  defaultClassification?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
