/**
 * Story 2.1: Node Request DTOs with validation
 * [AI-Review-2][HIGH-3] Added custom validator for type-specific props
 */
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { NodeType, type NodeProps, NODE_PROP_KEYS_BY_TYPE, type AppInput, type AppOutput, type AppSourceType } from '@cdm/types';

/**
 * [AI-Review-2][HIGH-3] Custom validator for type-specific node properties
 * Validates that props structure matches the specified node type
 */
@ValidatorConstraint({ name: 'nodePropsValidator', async: false })
class NodePropsValidator implements ValidatorConstraintInterface {
  validate(props: NodeProps, args: ValidationArguments): boolean {
    const object = args.object as { type?: NodeType };
    const nodeType = object.type;

    // If no type specified, allow any props
    if (!nodeType || nodeType === NodeType.ORDINARY) {
      return true;
    }

    // Type-specific validation
    if (typeof props !== 'object' || props === null) {
      return false;
    }

    const allowed = NODE_PROP_KEYS_BY_TYPE[nodeType] || [];
    const propsKeys = Object.keys(props);

    // All provided keys must be in allowed list
    return propsKeys.every((key) => allowed.includes(key));
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as { type?: NodeType };
    return `Invalid props structure for node type ${object.type}`;
  }
}

export class CreateNodeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(NodeType)
  @IsOptional()
  type?: NodeType;

  @IsString()
  @IsNotEmpty()
  graphId!: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  x?: number;

  @IsNumber()
  @IsOptional()
  y?: number;

  @IsString()
  @IsOptional()
  creatorName?: string;
}

export class UpdateNodeDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(NodeType)
  @IsOptional()
  type?: NodeType;

  @IsObject()
  @IsOptional()
  @Validate(NodePropsValidator)
  props?: NodeProps;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsNumber()
  @IsOptional()
  x?: number;

  @IsNumber()
  @IsOptional()
  y?: number;
}

export class UpdateNodeTypeDto {
  @IsEnum(NodeType)
  type!: NodeType;
}

export class UpdateNodePropsDto {
  @IsEnum(NodeType)
  type!: NodeType;

  @IsObject()
  @Validate(NodePropsValidator)
  props!: NodeProps;
}

// ============================
// Story 2.9: APP Execution DTO
// ============================

export class ExecuteAppNodeDto {
  @IsEnum(['local', 'remote', 'library'] as const)
  appSourceType!: AppSourceType;

  @IsString()
  @IsOptional()
  appPath?: string;

  @IsString()
  @IsOptional()
  appUrl?: string;

  @IsString()
  @IsOptional()
  libraryAppId?: string;

  @IsString()
  @IsOptional()
  libraryAppName?: string;

  @IsArray()
  @IsOptional()
  inputs?: AppInput[];

  @IsArray()
  @IsOptional()
  outputs?: AppOutput[];
}

/**
 * Story 2.4: Feedback DTO for task accept/reject
 * [AI-Review][MEDIUM-5] Added proper validation for feedback action
 */
export class FeedbackTaskDto {
  @IsEnum(['accept', 'reject'] as const)
  action!: 'accept' | 'reject';

  @IsString()
  @IsOptional()
  reason?: string;
}

// ============================
// Story 2.5: Search & Tag DTOs
// ============================

/**
 * Story 2.5: Search Query Request DTO
 * For query parameter validation in search endpoint
 */
export class SearchQueryRequestDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;

  @IsString()
  @IsOptional()
  graphId?: string;

  @IsOptional()
  nodeTypes?: NodeType[];

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;
}

/**
 * Story 2.5: Tag Update Request DTO
 * For updating node tags
 */
export class TagUpdateRequestDto {
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
}
