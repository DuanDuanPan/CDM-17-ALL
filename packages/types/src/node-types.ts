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
  APP = 'APP', // Story 2.9: APP 节点类型
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

  // Story 2.8: Knowledge association
  knowledgeRefs?: KnowledgeReference[]; // 关联的知识资源列表
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

// Story 2.8: Knowledge Reference for linking knowledge resources to tasks
export interface KnowledgeReference {
  id: string;                                    // UUID
  title: string;                                 // "Design Guidelines 2024"
  type: 'document' | 'link' | 'video';           // Resource type
  url?: string;                                  // External link or file path
  summary?: string;                              // Brief description
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

// ===========================
// Story 2.9: APP Node Types
// ===========================

/**
 * Story 2.9: APP 节点的应用来源类型
 */
export type AppSourceType = 'local' | 'remote' | 'library';

/**
 * Story 2.9: APP 执行状态
 */
export type AppExecutionStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Story 2.9: APP 输入参数配置
 */
export interface AppInput {
  id: string;                    // nanoid 生成
  key: string;                   // 参数名称 (e.g., "Orbit Altitude")
  value?: string;                // 参数值
  type: 'text' | 'number' | 'file';  // 参数类型
  required?: boolean;            // 是否必填
  fileId?: string;               // 如果 type='file'，关联上传文件的 ID
  fileName?: string;             // 上传文件名
}

/**
 * Story 2.9: APP 输出结果配置
 */
export interface AppOutput {
  id: string;                    // nanoid 生成
  key: string;                   // 输出名称 (e.g., "Trajectory File")
  type: 'text' | 'file';         // 输出类型
  value?: string;                // 文本值或文件 URL
  fileName?: string;             // 输出文件名
  mimeType?: string;             // 文件 MIME 类型 (用于预览)
  generatedAt?: string;          // 生成时间 (ISO 8601)
}

/**
 * Story 2.9: APP 节点属性
 */
export interface AppProps extends BaseNodeProps {
  // 来源配置
  appSourceType?: AppSourceType;      // 应用来源类型
  appPath?: string | null;            // 本地应用路径 (local)
  appUrl?: string | null;             // 远程应用 URL (remote)
  libraryAppId?: string | null;       // 应用库 ID (library)
  libraryAppName?: string | null;     // 应用库名称 (显示用)

  // I/O 配置
  inputs?: AppInput[];                // 输入参数列表
  outputs?: AppOutput[];              // 输出结果列表

  // 执行状态 (transient, 通常不持久化)
  executionStatus?: AppExecutionStatus;
  lastExecutedAt?: string | null;     // 上次执行时间
  errorMessage?: string | null;       // 错误信息
}

// Union type for all node properties
export type NodeProps = TaskProps | RequirementProps | PBSProps | DataProps | AppProps | Record<string, never>;

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
    'knowledgeRefs', // Story 2.8: Knowledge association
  ],
  [NodeType.REQUIREMENT]: ['reqType', 'acceptanceCriteria', 'priority'],
  [NodeType.PBS]: ['code', 'version', 'ownerId', 'indicators', 'productRef'],
  [NodeType.DATA]: ['dataType', 'version', 'secretLevel', 'storagePath'],
  [NodeType.APP]: [  // Story 2.9: APP 节点属性
    'appSourceType',
    'appPath',
    'appUrl',
    'libraryAppId',
    'libraryAppName',
    'inputs',
    'outputs',
    'executionStatus',
    'lastExecutedAt',
    'errorMessage',
  ],
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

// Story 2.8: Knowledge Reference Schema
export const KnowledgeReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['document', 'link', 'video']),
  url: z.string().optional(),
  summary: z.string().optional(),
});

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
    // Story 2.8: Knowledge association
    knowledgeRefs: z.array(KnowledgeReferenceSchema).optional(),
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
    // HIGH-1 Fix: Support null to allow explicit clearing of these fields (matching PBSProps interface)
    indicators: z.array(PBSIndicatorSchema).nullable().optional(),
    productRef: ProductReferenceSchema.nullable().optional(),
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

// ===========================
// Story 2.9: APP Node Schemas
// ===========================

export const AppInputSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string().optional(),
  type: z.enum(['text', 'number', 'file']),
  required: z.boolean().optional(),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
});

export const AppOutputSchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.enum(['text', 'file']),
  value: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  generatedAt: z.string().optional(),
});

export const AppPropsSchema = z
  .object({
    appSourceType: z.enum(['local', 'remote', 'library']).optional(),
    appPath: z.string().nullable().optional(),
    appUrl: z.string().nullable().optional(),
    libraryAppId: z.string().nullable().optional(),
    libraryAppName: z.string().nullable().optional(),
    inputs: z.array(AppInputSchema).optional(),
    outputs: z.array(AppOutputSchema).optional(),
    executionStatus: z.enum(['idle', 'running', 'success', 'error']).optional(),
    lastExecutedAt: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
  })
  .strict();

export const UpdateNodePropsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(NodeType.TASK), props: TaskPropsSchema }),
  z.object({ type: z.literal(NodeType.REQUIREMENT), props: RequirementPropsSchema }),
  z.object({ type: z.literal(NodeType.PBS), props: PBSPropsSchema }),
  z.object({ type: z.literal(NodeType.DATA), props: DataPropsSchema }),
  z.object({ type: z.literal(NodeType.APP), props: AppPropsSchema }), // Story 2.9
  z.object({ type: z.literal(NodeType.ORDINARY), props: z.record(z.never()).optional() }),
]);
