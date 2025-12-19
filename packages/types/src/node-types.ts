/**
 * Story 2.1: Semantic Node Types & Dynamic Properties
 * Story 2.3: Multi-View Synchronization (added startDate, customStage)
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

// Task Node Properties
export interface TaskProps {
  status?: TaskStatus;
  assigneeId?: string | null;
  startDate?: string | null; // Story 2.3: ISO 8601 format - Gantt start date
  dueDate?: string | null; // ISO 8601 format - Gantt end date
  priority?: 'low' | 'medium' | 'high' | null;
  customStage?: string | null; // Story 2.3: Dynamic Kanban grouping field
  progress?: number | null; // Story 2.3: 0-100 percentage for Gantt progress bar
}

// Requirement Node Properties
export interface RequirementProps {
  reqType?: string; // e.g., 'functional', 'non-functional'
  acceptanceCriteria?: string;
  priority?: 'must' | 'should' | 'could' | 'wont' | null; // MoSCoW
}

// PBS (Product Breakdown Structure) Node Properties
export interface PBSProps {
  code?: string | null; // e.g., 'PBS-001'
  version?: string | null; // e.g., 'v1.0.0'
  ownerId?: string | null;
}

// Data Type Enum for DATA nodes
export type DataType = 'document' | 'model' | 'drawing';

// Data Node Properties
export interface DataProps {
  dataType?: DataType; // 数据类型: 文档、模型、图纸
  version?: string | null; // 版本号: v1.0.0
  secretLevel?: 'public' | 'internal' | 'secret' | null;
  storagePath?: string | null;
}

// Union type for all node properties
export type NodeProps = TaskProps | RequirementProps | PBSProps | DataProps | Record<string, never>;

// Enhanced Node Data with polymorphic properties
export interface EnhancedNodeData {
  id: string;
  label: string;
  description?: string; // Story 2.2: Node description for card UI
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
  })
  .strict();

export const RequirementPropsSchema = z
  .object({
    reqType: z.string().optional(),
    acceptanceCriteria: z.string().optional(),
    priority: z.enum(['must', 'should', 'could', 'wont']).nullable().optional(),
  })
  .strict();

export const PBSPropsSchema = z
  .object({
    code: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    ownerId: z.string().nullable().optional(),
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
