/**
 * Story 2.1: Node Request DTOs with validation
 * [AI-Review-2][HIGH-3] Added custom validator for type-specific props
 */
import {
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
import { NodeType, type NodeProps } from '@cdm/types';

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

    const allowedKeys: Record<NodeType, string[]> = {
      [NodeType.ORDINARY]: [],
      [NodeType.TASK]: ['status', 'assigneeId', 'dueDate', 'priority'],
      [NodeType.REQUIREMENT]: ['reqType', 'acceptanceCriteria', 'priority'],
      [NodeType.PBS]: ['code', 'version', 'ownerId'],
      [NodeType.DATA]: ['dataType', 'version', 'secretLevel', 'storagePath'],
    };

    const allowed = allowedKeys[nodeType] || [];
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

  @IsEnum(NodeType)
  @IsOptional()
  type?: NodeType;

  @IsString()
  @IsNotEmpty()
  graphId!: string;

  @IsString()
  @IsOptional()
  parentId?: string;

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

  @IsEnum(NodeType)
  @IsOptional()
  type?: NodeType;

  @IsObject()
  @IsOptional()
  @Validate(NodePropsValidator)
  props?: NodeProps;

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
