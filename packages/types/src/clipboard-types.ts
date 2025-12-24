/**
 * Story 2.6: Multi-Select & Clipboard
 * Clipboard data types for copy/cut/paste operations
 */

import { NodeType } from './node-types';
import { EdgeKindSchema, DependencyTypeSchema } from './edge-types';
import type { EdgeKind, DependencyType } from './edge-types';

// ===========================
// Clipboard Data Structures
// ===========================

/**
 * ClipboardData represents the serialized format of copied nodes and edges.
 * Used for system clipboard storage and cross-graph paste operations.
 */
export interface ClipboardData {
    /** Version for future migration support */
    version: string; // "1.0" - for future migration support

    /** Source application identifier */
    source: 'cdm-17';

    /** Timestamp when content was copied */
    timestamp: number; // Date.now() when copied

    /** Operation type for clipboard semantics (copy vs cut) */
    operation?: ClipboardOperation;

    /** ID of the graph where content was copied from */
    sourceGraphId: string;

    /** Array of copied node data */
    nodes: ClipboardNodeData[];

    /** Array of edges between copied nodes only */
    edges: ClipboardEdgeData[];

    /** Layout information for positioning pasted content */
    layout: ClipboardLayout;
}

/**
 * ClipboardLayout stores the bounding box and center of copied content.
 * Used to preserve relative positioning when pasting.
 */
export interface ClipboardLayout {
    /** Minimum X coordinate of bounding box */
    minX: number;

    /** Minimum Y coordinate of bounding box */
    minY: number;

    /** Width of bounding box */
    width: number;

    /** Height of bounding box */
    height: number;

    /** Center point of copied content */
    center: { x: number; y: number };
}

/**
 * ClipboardNodeData represents a single node in clipboard format.
 * Positions are stored relative to the selection center.
 */
export interface ClipboardNodeData {
    /** Original node ID (for reference, NOT used as ID when pasting) */
    originalId: string;

    /** Node label/title */
    label: string;

    /** Node semantic type (ORDINARY, TASK, REQUIREMENT, PBS, DATA) */
    type: NodeType;

    /** X position relative to layout.center */
    x: number;

    /** Y position relative to layout.center */
    y: number;

    /** Node width */
    width: number;

    /** Node height */
    height: number;

    /** Original parent node ID (to reconstruct hierarchy) */
    parentOriginalId?: string;

    /** Node description (Story 2.2 card UI) */
    description?: string;

    /** Node properties (polymorphic based on type) */
    metadata: Record<string, unknown>;

    /** Tags array (Story 2.5) */
    tags?: string[];
}

/**
 * ClipboardEdgeData represents an edge in clipboard format.
 * Only edges where BOTH source and target are in the selection are copied.
 */
export interface ClipboardEdgeData {
    /** Source node's original ID */
    sourceOriginalId: string;

    /** Target node's original ID */
    targetOriginalId: string;

    /** Edge kind: 'hierarchical' or 'dependency' */
    kind: EdgeKind;

    /** Dependency type (only for dependency edges) */
    dependencyType?: DependencyType;

    /** Optional edge label */
    label?: string;
}

// ===========================
// Clipboard Operation Types
// ===========================

/**
 * ClipboardOperation defines the type of clipboard action.
 */
export type ClipboardOperation = 'copy' | 'cut';

/**
 * PastePosition defines where to paste content.
 */
export interface PastePosition {
    /** X coordinate for paste position */
    x: number;

    /** Y coordinate for paste position */
    y: number;
}

/**
 * ClipboardResult represents the result of a clipboard operation.
 */
export interface ClipboardResult {
    /** Whether the operation was successful */
    success: boolean;

    /** Number of nodes involved in the operation */
    nodeCount: number;

    /** Number of edges involved in the operation */
    edgeCount: number;

    /** Error message if operation failed */
    error?: string;
}

/**
 * PasteResult extends ClipboardResult with pasted node IDs.
 */
export interface PasteResult extends ClipboardResult {
    /** IDs of newly created nodes (for selection after paste) */
    newNodeIds: string[];

    /** IDs of newly created edges */
    newEdgeIds: string[];
}

// ===========================
// Constants
// ===========================

/** Current clipboard data format version */
export const CLIPBOARD_VERSION = '1.0';

/** Clipboard source identifier */
export const CLIPBOARD_SOURCE = 'cdm-17' as const;

/** Maximum number of nodes for clipboard operations (performance limit) */
export const MAX_CLIPBOARD_NODES = 100;

// ===========================
// Zod Schemas (Validation)
// ===========================

import { z } from 'zod';

/** Schema for clipboard layout */
export const ClipboardLayoutSchema = z.object({
    minX: z.number(),
    minY: z.number(),
    width: z.number(),
    height: z.number(),
    center: z.object({
        x: z.number(),
        y: z.number(),
    }),
});

/** Schema for clipboard node data */
export const ClipboardNodeDataSchema = z.object({
    originalId: z.string(),
    label: z.string(),
    type: z.nativeEnum(NodeType),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    parentOriginalId: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.unknown()),
    tags: z.array(z.string()).optional(),
});

/** Schema for clipboard edge data */
export const ClipboardEdgeDataSchema = z.object({
    sourceOriginalId: z.string(),
    targetOriginalId: z.string(),
    kind: EdgeKindSchema,
    dependencyType: DependencyTypeSchema.optional(),
    label: z.string().optional(),
});

/** Schema for full clipboard data (AC2.3: Serialization format) */
export const ClipboardDataSchema = z.object({
    version: z.string(),
    source: z.literal('cdm-17'),
    timestamp: z.number(),
    operation: z.enum(['copy', 'cut']).optional(),
    sourceGraphId: z.string(),
    nodes: z.array(ClipboardNodeDataSchema),
    edges: z.array(ClipboardEdgeDataSchema),
    layout: ClipboardLayoutSchema,
});

/**
 * Type inference from schema (useful for runtime parsing)
 */
export type ClipboardDataParsed = z.infer<typeof ClipboardDataSchema>;

/**
 * Validate clipboard data from string (used in paste operation)
 * @param text - JSON string from clipboard
 * @returns Parsed ClipboardData or null if invalid
 */
export function parseClipboardData(text: string): ClipboardData | null {
    try {
        const parsed = JSON.parse(text);
        const result = ClipboardDataSchema.safeParse(parsed);
        if (result.success) {
            return result.data as ClipboardData;
        }
        console.warn('[Clipboard] Validation failed:', result.error.issues);
        return null;
    } catch (error) {
        console.warn('[Clipboard] Parse failed:', error);
        return null;
    }
}
