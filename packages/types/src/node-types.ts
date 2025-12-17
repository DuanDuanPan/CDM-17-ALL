/**
 * Story 2.1: Semantic Node Types & Dynamic Properties
 * Node type definitions and property interfaces
 */

// Node Type Enum - matches Prisma schema
export enum NodeType {
  ORDINARY = 'ORDINARY',
  TASK = 'TASK',
  REQUIREMENT = 'REQUIREMENT',
  PBS = 'PBS',
  DATA = 'DATA',
}

// Task Node Properties
export interface TaskProps {
  status?: 'todo' | 'in-progress' | 'done';
  assigneeId?: string;
  dueDate?: string; // ISO 8601 format
  priority?: 'low' | 'medium' | 'high';
}

// Requirement Node Properties
export interface RequirementProps {
  reqType?: string; // e.g., 'functional', 'non-functional'
  acceptanceCriteria?: string;
  priority?: 'must' | 'should' | 'could' | 'wont'; // MoSCoW
}

// PBS (Product Breakdown Structure) Node Properties
export interface PBSProps {
  code?: string; // e.g., 'PBS-001'
  version?: string; // e.g., 'v1.0.0'
  ownerId?: string;
}

// Data Type Enum for DATA nodes
export type DataType = 'document' | 'model' | 'drawing';

// Data Node Properties
export interface DataProps {
  dataType?: DataType; // 数据类型: 文档、模型、图纸
  version?: string; // 版本号: v1.0.0
  secretLevel?: 'public' | 'internal' | 'secret';
  storagePath?: string;
}

// Union type for all node properties
export type NodeProps = TaskProps | RequirementProps | PBSProps | DataProps | Record<string, never>;

// Enhanced Node Data with polymorphic properties
export interface EnhancedNodeData {
  id: string;
  label: string;
  type: NodeType;
  props?: NodeProps;

  // Yjs sync fields
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // UI state
  isEditing?: boolean;
  isSelected?: boolean;

  // Timestamps and metadata (readonly)
  createdAt?: string;
  updatedAt?: string;
  creator?: string;  // [AI-Review][MEDIUM-4] Added creator field
}

// DTOs for API requests

// Update Node Type Request
export interface UpdateNodeTypeDto {
  type: NodeType;
}

// Update Node Properties Request (polymorphic)
export interface UpdateNodePropsDto {
  type: NodeType;
  props: NodeProps;
}

// Create Node Request
export interface CreateNodeDto {
  label: string;
  type?: NodeType; // defaults to ORDINARY
  graphId: string;
  parentId?: string;
  x?: number;
  y?: number;
}

// Update Node Request
export interface UpdateNodeDto {
  label?: string;
  type?: NodeType;
  props?: NodeProps;
  x?: number;
  y?: number;
}

// [AI-Review][MEDIUM-2] Response DTOs for type-safe API returns

// Node Response (returned by API endpoints)
export interface NodeResponse {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  graphId: string;
  createdAt: string;
  updatedAt: string;
  props: NodeProps;
}

// Node Type Change Response
export interface NodeTypeChangeResponse extends NodeResponse {
  oldType: NodeType;
  newType: NodeType;
}
