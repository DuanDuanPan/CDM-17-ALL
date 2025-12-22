/**
 * Story 2.1: Semantic Node Types & Dynamic Properties
 * Story 2.3: Multi-View Synchronization (added startDate, customStage)
 * Story 2.5: Data Organization & Search (added tags, isArchived, archivedAt)
 * Node type definitions and property interfaces
 */

import { z } from 'zod';

// Node Type Enum - matches Prisma schema
export enum NodeType {
  ORDINARY = 'ORDINARY',
  TASK = 'TASK',
  REQUIREMENT = 'REQUIREMENT',
  PBS = 'PBS',
  DATA = 'DATA',
}

// Task Status Enum - for type safety across views
export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Story 2.4: Assignment Status for task dispatch & feedback
export type AssignmentStatus = 'idle' | 'dispatched' | 'accepted' | 'rejected';

// Story 2.5: Base properties for all node types (tags & archive support)
export interface BaseNodeProps {
  tags?: string[];           // 标签数组
  isArchived?: boolean;      // 归档状态 (软删除)
  archivedAt?: string | null; // 归档时间 (ISO 8601)
}

// Task Node Properties
export interface TaskProps extends BaseNodeProps {
  status?: TaskStatus;
  assigneeId?: string | null;
  startDate?: string | null; // Story 2.3: ISO 8601 format - Gantt start date
  dueDate?: string | null; // ISO 8601 format - Gantt end date
  priority?: 'low' | 'medium' | 'high' | null;
  customStage?: string | null; // Story 2.3: Dynamic Kanban grouping field
  progress?: number | null; // Story 2.3: 0-100 percentage for Gantt progress bar

  // Story 2.4: Task dispatch & feedback fields
  assignmentStatus?: AssignmentStatus; // 下发状态 (默认 'idle')
  ownerId?: string | null; // 任务创建者/下发者 ID
  rejectionReason?: string | null; // 驳回理由
  dispatchedAt?: string | null; // 下发时间 (ISO 8601)
  feedbackAt?: string | null; // 接收/驳回时间 (ISO 8601)
}

// Requirement Node Properties
export interface RequirementProps extends BaseNodeProps {
  reqType?: string; // e.g., 'functional', 'non-functional'
  acceptanceCriteria?: string;
  priority?: 'must' | 'should' | 'could' | 'wont' | null; // MoSCoW
}

// Story 2.7: PBS Indicator for technical parameters
export interface PBSIndicator {
  id: string;           // nanoid generated
  name: string;         // E.g., "Weight", "Power" (质量, 功率)
  unit?: string;        // E.g., "kg", "W"
  targetValue: string;  // Target requirement
  actualValue?: string; // Actual measured value
}

// Story 2.7: Product Reference for linking to product library
export interface ProductReference {
  productId: string;
  productName: string;
  productCode?: string;
  category?: string;
}

// PBS (Product Breakdown Structure) Node Properties
export interface PBSProps extends BaseNodeProps {
  code?: string | null; // e.g., 'PBS-001'
  version?: string | null; // e.g., 'v1.0.0'
  ownerId?: string | null;
  // Story 2.7: PBS Indicators and Product Library
  // HIGH-1 Fix: Support null to allow explicit clearing of these fields
  indicators?: PBSIndicator[] | null;     // 技术指标数组
  productRef?: ProductReference | null;   // 产品库引用
}

// Data Type Enum for DATA nodes
export type DataType = 'document' | 'model' | 'drawing';

// Data Node Properties
export interface DataProps extends BaseNodeProps {
  dataType?: DataType; // 数据类型: 文档、模型、图纸
  version?: string | null; // 版本号: v1.0.0
  secretLevel?: 'public' | 'internal' | 'secret' | null;
  storagePath?: string | null;
}

// Union type for all node properties
export type NodeProps = TaskProps | RequirementProps | PBSProps | DataProps | Record<string, never>;

// Allowed prop keys per node type (shared by frontend and backend)
export const NODE_PROP_KEYS_BY_TYPE: Record<NodeType, readonly string[]> = {
  [NodeType.ORDINARY]: [],
  [NodeType.TASK]: [
    'status',
    'assigneeId',
    'startDate',
    'dueDate',
    'priority',
    'customStage',
    'progress',
    'assignmentStatus',
    'ownerId',
    'rejectionReason',
    'dispatchedAt',
    'feedbackAt',
  ],
  [NodeType.REQUIREMENT]: ['reqType', 'acceptanceCriteria', 'priority'],
  [NodeType.PBS]: ['code', 'version', 'ownerId', 'indicators', 'productRef'],
  [NodeType.DATA]: ['dataType', 'version', 'secretLevel', 'storagePath'],
};

/**
 * Sanitize props by node type: drop any keys not allowed for that type.
 */
export function sanitizeNodeProps(
  nodeType: NodeType | undefined,
  props: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!props || typeof props !== 'object') return {};
  const type = nodeType ?? NodeType.ORDINARY;
  const allowed = NODE_PROP_KEYS_BY_TYPE[type] || [];
  if (allowed.length === 0) return {};
  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      sanitized[key] = (props as Record<string, unknown>)[key];
    }
  }
  return sanitized;
}

// Enhanced Node Data with polymorphic properties
export interface EnhancedNodeData {
  id: string;
  label: string;
  description?: string; // Story 2.2: Node description for card UI
  type: NodeType;
  props?: NodeProps;

  // Story 2.5: Tags & Archive support
  tags?: string[];           // 标签数组
  isArchived?: boolean;      // 归档状态
  archivedAt?: string | null; // 归档时间

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
  creator?: string;  // Creator name (mocked until auth integration)
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
  id?: string; // optional for sync with frontend/Yjs
  label: string;
  description?: string;
  type?: NodeType; // defaults to ORDINARY
  graphId: string;
  parentId?: string;
  x?: number;
  y?: number;
  creatorName?: string;
}

// Update Node Request
export interface UpdateNodeDto {
  label?: string;
  description?: string;
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
  description?: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  graphId: string;
  createdAt: string;
  updatedAt: string;
  creator: string;
  props: NodeProps;
  // Story 2.5: Tags & Archive support
  tags?: string[];
  isArchived?: boolean;
  archivedAt?: string | null;
}

// Node Type Change Response
export interface NodeTypeChangeResponse extends NodeResponse {
  oldType: NodeType;
  newType: NodeType;
}

// =========================
// Zod Schemas (API Validation)
// =========================

export const TaskPropsSchema = z
  .object({
    status: z.enum(['todo', 'in-progress', 'done']).optional(),
    assigneeId: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(), // Story 2.3: ISO 8601 format
    dueDate: z.string().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
    customStage: z.string().nullable().optional(), // Story 2.3: Dynamic Kanban grouping
    progress: z.number().min(0).max(100).nullable().optional(), // Story 2.3: Gantt progress
    // Story 2.4: Task dispatch & feedback fields
    assignmentStatus: z.enum(['idle', 'dispatched', 'accepted', 'rejected']).optional(),
    ownerId: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    dispatchedAt: z.string().nullable().optional(),
    feedbackAt: z.string().nullable().optional(),
  })
  .strict();

export const RequirementPropsSchema = z
  .object({
    reqType: z.string().optional(),
    acceptanceCriteria: z.string().optional(),
    priority: z.enum(['must', 'should', 'could', 'wont']).nullable().optional(),
  })
  .strict();

// Story 2.7: PBS Indicator Schema
export const PBSIndicatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().optional(),
  targetValue: z.string(),
  actualValue: z.string().optional(),
});

// Story 2.7: Product Reference Schema
export const ProductReferenceSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productCode: z.string().optional(),
  category: z.string().optional(),
});

export const PBSPropsSchema = z
  .object({
    code: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    ownerId: z.string().nullable().optional(),
    // Story 2.7: PBS Indicators and Product Library
    indicators: z.array(PBSIndicatorSchema).optional(),
    productRef: ProductReferenceSchema.optional(),
  })
  .strict();

export const DataPropsSchema = z
  .object({
    dataType: z.enum(['document', 'model', 'drawing']).optional(),
    version: z.string().nullable().optional(),
    secretLevel: z.enum(['public', 'internal', 'secret']).nullable().optional(),
    storagePath: z.string().nullable().optional(),
  })
  .strict();

export const UpdateNodePropsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(NodeType.TASK), props: TaskPropsSchema }),
  z.object({ type: z.literal(NodeType.REQUIREMENT), props: RequirementPropsSchema }),
  z.object({ type: z.literal(NodeType.PBS), props: PBSPropsSchema }),
  z.object({ type: z.literal(NodeType.DATA), props: DataPropsSchema }),
  z.object({ type: z.literal(NodeType.ORDINARY), props: z.record(z.never()).optional() }),
]);
