/**
 * Story 5.1: Template Library Types
 * Story 5.2: Subtree Template Save & Reuse - Extended types
 * Types for template management and instantiation
 */

import type { NodeType } from './node-types';
import type { DependencyType } from './edge-types';

// Template status enum (matches Prisma TemplateStatus)
export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';

// Template category for organizing templates
export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string | null; // Lucide icon name
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Template node structure (recursive)
export interface TemplateNode {
  label: string;
  type?: NodeType; // Node type from node-types
  description?: string; // Story 5.2: Node description (optional)
  tags?: string[]; // Story 5.2: Node tags (optional)
  metadata?: Record<string, unknown>;
  order?: number; // Story 8.6: Sibling order for stable layout/serialization
  children?: TemplateNode[];
  _tempId?: string; // Story 5.2: Temporary ID for edge references during instantiation
}

// Story 5.2: Template edge for dependency relationships
export interface TemplateEdge {
  sourceRef: string; // Source node's _tempId
  targetRef: string; // Target node's _tempId
  kind: 'dependency'; // Only dependency edges stored (hierarchical derived from children/parentId)
  dependencyType?: DependencyType; // FS, SS, FF, SF - required for dependency edges
}

// Template structure containing the root node
export interface TemplateStructure {
  rootNode: TemplateNode;
  edges?: TemplateEdge[]; // Story 5.2: Dependency edges (hierarchical derived from children)
}

// Full template interface (matches Prisma Template model)
export interface Template {
  id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  structure: TemplateStructure;
  defaultClassification: string; // public, internal, confidential, secret
  requiredFields?: string[] | null;
  status: TemplateStatus;
  version: number;
  categoryId?: string | null;
  category?: TemplateCategory | null;
  creatorId?: string | null;
  usageCount: number;
  isPublic?: boolean; // Story 5.2: Visibility control (true=public, false=private)
  createdAt?: string;
  updatedAt?: string;
}

// Template list item (lightweight for list display)
export interface TemplateListItem {
  id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  defaultClassification: string;
  usageCount: number;
  version: number;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  creatorId?: string | null; // Story 5.2: Creator ID for "My Templates" filter
  isPublic?: boolean; // Story 5.2: Visibility control
  createdAt?: string;
  updatedAt?: string;
}

// Query options for fetching templates
export interface TemplateQueryOptions {
  categoryId?: string;
  search?: string;
  status?: TemplateStatus;
  limit?: number;
  offset?: number;
  userId?: string; // Story 5.2: Viewer user ID (for private template access control)
  mine?: boolean; // Story 5.2: Filter to only user's own templates
}

// Request to create a graph from a template
export interface CreateFromTemplateRequest {
  name?: string; // Optional custom name for the new graph
}

// Response from template instantiation
export interface CreateFromTemplateResponse {
  graphId: string;
  graphName: string;
  nodeCount: number;
}

// Story 5.2: Request to create a new template from subtree
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  categoryId?: string;
  structure: TemplateStructure;
  defaultClassification?: string;
  isPublic?: boolean; // Default: true (public)
}

// Story 5.2: Response from template creation
export interface CreateTemplateResponse {
  id: string;
  name: string;
  createdAt: string;
}

// Template detail response (for preview)
export interface TemplateDetailResponse {
  template: Template;
}

// Templates list response
export interface TemplatesListResponse {
  templates: TemplateListItem[];
  total?: number;
}

// Categories list response
export interface CategoriesListResponse {
  categories: TemplateCategory[];
}

// Story 5.3: Delete template response
export interface DeleteTemplateResponse {
  success: boolean;
  deletedId: string;
}
