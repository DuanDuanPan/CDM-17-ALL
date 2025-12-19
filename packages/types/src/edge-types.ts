/**
 * Story 2.2: Task Dependency Network - Edge Types & Properties
 * Edge type definitions and property interfaces for dependency management
 */

import { z } from 'zod';

// ===========================
// Edge Kind (Structural Classification)
// ===========================

/**
 * EdgeKind distinguishes structural edges from relationship edges:
 * - hierarchical: Parent-child structure (affects layout, navigation, subtree operations)
 * - dependency: Task execution logic (FS/SS/FF/SF, does NOT affect layout)
 */
export type EdgeKind = 'hierarchical' | 'dependency';

// ===========================
// Dependency Types
// ===========================

/**
 * DependencyType defines execution order relationships between tasks:
 * - FS (Finish-to-Start): Task B cannot start until Task A finishes (default)
 * - SS (Start-to-Start): Task B cannot start until Task A starts
 * - FF (Finish-to-Finish): Task B cannot finish until Task A finishes
 * - SF (Start-to-Finish): Task B cannot finish until Task A starts
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

// Default dependency type when creating new dependency edges
// Configurable via EdgeConfig.setDefaultDependencyType()
let configuredDefaultDependencyType: DependencyType = 'FS';

/**
 * Get the default dependency type for new dependency edges.
 * Can be configured via EdgeConfig.setDefaultDependencyType().
 * @returns The configured default dependency type (default: 'FS')
 */
export function getDefaultDependencyType(): DependencyType {
  return configuredDefaultDependencyType;
}

/**
 * EdgeConfig provides runtime configuration for edge-related settings.
 * Use this to customize defaults without modifying source code.
 */
export const EdgeConfig = {
  /**
   * Set the default dependency type for new dependency edges.
   * @param type - The dependency type to use as default ('FS', 'SS', 'FF', 'SF')
   * @example
   * ```typescript
   * import { EdgeConfig } from '@cdm/types';
   * EdgeConfig.setDefaultDependencyType('SS'); // Start-to-Start as default
   * ```
   */
  setDefaultDependencyType(type: DependencyType): void {
    configuredDefaultDependencyType = type;
  },

  /**
   * Reset the default dependency type to the original value ('FS').
   */
  resetDefaultDependencyType(): void {
    configuredDefaultDependencyType = 'FS';
  },

  /**
   * Get the current default dependency type.
   */
  getDefaultDependencyType(): DependencyType {
    return configuredDefaultDependencyType;
  },
};

/**
 * @deprecated Use getDefaultDependencyType() or EdgeConfig for configurability.
 * Kept for backward compatibility.
 */
export const DEFAULT_DEPENDENCY_TYPE: DependencyType = 'FS';

// ===========================
// Edge Metadata Interface
// ===========================

/**
 * EdgeMetadata stores edge classification and dependency information.
 * Stored in the `metadata` JSON field of the Edge model.
 */
export interface EdgeMetadata {
  kind: EdgeKind;
  dependencyType?: DependencyType; // Only valid when kind === 'dependency'
}

// ===========================
// Enhanced Edge Data Interface
// ===========================

/**
 * EnhancedEdgeData extends basic edge data with dependency support.
 * Used for frontend/Yjs synchronization.
 */
export interface EnhancedEdgeData {
  id: string;
  source: string;
  target: string;
  graphId?: string;

  // Edge classification (Story 2.2)
  kind: EdgeKind;
  dependencyType?: DependencyType;

  // Visual styling hints
  style?: EdgeStyle;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * EdgeStyle defines visual appearance for edges.
 * Dependency edges use dashed style; hierarchical use solid.
 */
export interface EdgeStyle {
  stroke?: string;       // Color (e.g., '#94a3b8' for gray-400)
  strokeWidth?: number;  // Line width
  strokeDasharray?: string; // Dash pattern (e.g., '5 5' for dashed)
  connector?: 'rounded' | 'smooth' | 'normal';
}

// Default styles for edge kinds
export const EDGE_STYLES: Record<EdgeKind, EdgeStyle> = {
  hierarchical: {
    stroke: '#64748b',      // slate-500
    strokeWidth: 2,
    strokeDasharray: '',    // solid line
    connector: 'smooth',
  },
  dependency: {
    stroke: '#94a3b8',      // gray-400
    strokeWidth: 2,
    strokeDasharray: '5 5', // dashed line
    connector: 'rounded',
  },
};

// ===========================
// DTOs for API Requests
// ===========================

/**
 * CreateEdgeDto - Request body for creating edges.
 */
export interface CreateEdgeDto {
  id?: string;           // Optional for sync with frontend/Yjs
  graphId: string;
  sourceId: string;
  targetId: string;
  kind?: EdgeKind;       // Defaults to 'hierarchical'
  dependencyType?: DependencyType; // Required if kind === 'dependency'
}

/**
 * UpdateEdgeDto - Request body for updating edges.
 */
export interface UpdateEdgeDto {
  kind?: EdgeKind;
  dependencyType?: DependencyType;
}

/**
 * EdgeResponse - API response for edge data.
 */
export interface EdgeResponse {
  id: string;
  graphId: string;
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
  dependencyType?: DependencyType;
  createdAt: string;
  updatedAt: string;
}

// ===========================
// Zod Schemas (API Validation)
// ===========================

export const EdgeKindSchema = z.enum(['hierarchical', 'dependency']);
export const DependencyTypeSchema = z.enum(['FS', 'SS', 'FF', 'SF']);

export const EdgeMetadataSchema = z.object({
  kind: EdgeKindSchema,
  dependencyType: DependencyTypeSchema.optional(),
}).refine(
  (data) => {
    // dependencyType is required when kind is 'dependency'
    if (data.kind === 'dependency') {
      return data.dependencyType !== undefined;
    }
    return true;
  },
  {
    message: "dependencyType is required when kind is 'dependency'",
  }
);

export const CreateEdgeSchema = z.object({
  id: z.string().optional(),
  graphId: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  kind: EdgeKindSchema.optional().default('hierarchical'),
  dependencyType: DependencyTypeSchema.optional(),
}).refine(
  (data) => {
    // dependencyType is required when kind is 'dependency'
    if (data.kind === 'dependency') {
      return data.dependencyType !== undefined;
    }
    // dependencyType should not be present for hierarchical edges
    if (data.kind === 'hierarchical' && data.dependencyType !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: "dependencyType is required for dependency edges and should not be present for hierarchical edges",
  }
);

export const UpdateEdgeSchema = z.object({
  kind: EdgeKindSchema.optional(),
  dependencyType: DependencyTypeSchema.optional(),
}).refine(
  (data) => {
    // If kind is being set to dependency, dependencyType must also be provided
    if (data.kind === 'dependency' && data.dependencyType === undefined) {
      return false;
    }
    return true;
  },
  {
    message: "dependencyType is required when setting kind to 'dependency'",
  }
);

// ===========================
// Utility Functions
// ===========================

/**
 * Check if an edge is a dependency edge.
 */
export function isDependencyEdge(edge: { kind?: EdgeKind } | EdgeMetadata): boolean {
  return edge.kind === 'dependency';
}

/**
 * Check if an edge is a hierarchical edge.
 */
export function isHierarchicalEdge(edge: { kind?: EdgeKind } | EdgeMetadata): boolean {
  return edge.kind === 'hierarchical' || edge.kind === undefined;
}

/**
 * Get display label for dependency type (for UI badge).
 */
export function getDependencyTypeLabel(type: DependencyType): string {
  return type; // FS, SS, FF, SF are already short labels
}

/**
 * Create edge metadata from kind and optional dependency type.
 */
export function createEdgeMetadata(
  kind: EdgeKind,
  dependencyType?: DependencyType
): EdgeMetadata {
  if (kind === 'dependency') {
    return {
      kind,
      dependencyType: dependencyType ?? getDefaultDependencyType(),
    };
  }
  return { kind };
}
