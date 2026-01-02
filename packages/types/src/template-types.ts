/**
 * Story 5.1: Template Library Types
 * Types for template management and instantiation
 */

import type { NodeType } from './node-types';

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
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
}

// Template structure containing the root node
export interface TemplateStructure {
  rootNode: TemplateNode;
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
