/**
 * Story 2.2: Edge Request DTOs with validation
 * Uses class-validator for NestJS automatic validation
 */

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';

// Edge kind enum for validation
const EdgeKindValues = ['hierarchical', 'dependency'] as const;
type EdgeKindType = typeof EdgeKindValues[number];

// Dependency type enum for validation
const DependencyTypeValues = ['FS', 'SS', 'FF', 'SF'] as const;
type DependencyTypeType = typeof DependencyTypeValues[number];

/**
 * Custom validator: dependencyType is required when kind is 'dependency'
 */
@ValidatorConstraint({ name: 'dependencyTypeValidator', async: false })
class DependencyTypeValidator implements ValidatorConstraintInterface {
  validate(dependencyType: string | undefined, args: ValidationArguments): boolean {
    const object = args.object as { kind?: EdgeKindType };

    // If kind is 'dependency', dependencyType must be provided
    if (object.kind === 'dependency') {
      return dependencyType !== undefined && dependencyType !== null;
    }

    // If kind is 'hierarchical', dependencyType should NOT be provided
    if (object.kind === 'hierarchical' && dependencyType !== undefined) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as { kind?: EdgeKindType };

    if (object.kind === 'dependency') {
      return "dependencyType is required when kind is 'dependency'";
    }
    return "dependencyType should not be provided for hierarchical edges";
  }
}

/**
 * DTO for creating edges
 * POST /api/edges
 */
export class CreateEdgeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  graphId!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsEnum(EdgeKindValues, { message: "kind must be 'hierarchical' or 'dependency'" })
  @IsOptional()
  kind?: EdgeKindType;

  @IsEnum(DependencyTypeValues, { message: "dependencyType must be 'FS', 'SS', 'FF', or 'SF'" })
  @IsOptional()
  @Validate(DependencyTypeValidator)
  dependencyType?: DependencyTypeType;
}

/**
 * DTO for updating edges
 * PATCH /api/edges/:id
 */
export class UpdateEdgeDto {
  @IsEnum(EdgeKindValues, { message: "kind must be 'hierarchical' or 'dependency'" })
  @IsOptional()
  kind?: EdgeKindType;

  @IsEnum(DependencyTypeValues, { message: "dependencyType must be 'FS', 'SS', 'FF', or 'SF'" })
  @IsOptional()
  @Validate(DependencyTypeValidator)
  dependencyType?: DependencyTypeType;
}
