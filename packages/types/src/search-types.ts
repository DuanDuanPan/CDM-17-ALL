/**
 * Story 2.5: Data Organization & Search
 * Search and Tag related type definitions
 */

import { z } from 'zod';
import { NodeType } from './node-types';

// ============================
// Search Query DTOs
// ============================

/**
 * Search Query DTO - Parameters for global node search
 */
export interface SearchQueryDto {
    q?: string;              // 关键字搜索 (匹配 label/description)
    tags?: string[];         // 标签过滤 (hasAny)
    includeArchived?: boolean; // 是否包含归档节点 (默认 false)
    graphId?: string;        // 限定搜索范围到特定 Graph
    nodeTypes?: NodeType[];  // 过滤节点类型
    limit?: number;          // 结果数量限制 (默认 50, 最大 100)
    offset?: number;         // 分页偏移
}

/**
 * Match type for search result highlighting
 */
export type SearchMatchType = 'label' | 'description' | 'tag';

/**
 * Search Result Item - Individual search result
 */
export interface SearchResultItem {
    id: string;
    label: string;
    description?: string;
    type: NodeType;
    tags: string[];
    isArchived: boolean;
    graphId: string;
    graphName: string;
    x: number;
    y: number;
    matchType: SearchMatchType;      // 匹配类型
    matchHighlight?: string;         // 高亮匹配的片段
    relevanceScore?: number;         // 相关度评分
    archivedAt?: string | null;      // 归档时间
}

/**
 * Search Response - Full search result response
 */
export interface SearchResponse {
    results: SearchResultItem[];
    total: number;
    hasMore: boolean;
    query: SearchQueryDto;
}

// ============================
// Tag Management DTOs
// ============================

/**
 * Tag Update DTO - For updating node tags
 */
export interface TagUpdateDto {
    tags: string[];
}

/**
 * Archive Node DTO - For archiving/unarchiving nodes
 */
export interface ArchiveNodeDto {
    isArchived: boolean;
}

/**
 * Popular Tag Item - Tag with usage count
 */
export interface PopularTagItem {
    name: string;
    count: number;
}

/**
 * Popular Tags Response - List of most used tags
 */
export interface PopularTagsResponse {
    tags: PopularTagItem[];
}

// ============================
// Archived Nodes DTOs
// ============================

/**
 * Archived Node Item - Simplified node data for archive list
 */
export interface ArchivedNodeItem {
    id: string;
    label: string;
    type: NodeType;
    tags: string[];
    archivedAt: string;
    graphId: string;
    graphName: string;
}

/**
 * Archived Nodes Response - List of archived nodes
 */
export interface ArchivedNodesResponse {
    nodes: ArchivedNodeItem[];
    total: number;
}

// ============================
// Zod Schemas (API Validation)
// ============================

/**
 * Search Query Schema - Validation for search parameters
 */
export const SearchQuerySchema = z.object({
    q: z.string().max(200).optional(),
    tags: z.preprocess((val) => {
        if (typeof val === 'string') {
            const tags = val
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);
            return tags.length ? tags : undefined;
        }
        if (Array.isArray(val)) {
            const tags = val
                .flatMap((t) => String(t).split(','))
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);
            return tags.length ? tags : undefined;
        }
        return val;
    }, z.array(z.string().max(50)).max(10)).optional(),
    includeArchived: z.coerce.boolean().default(false),
    graphId: z.string().optional(),
    nodeTypes: z.array(z.nativeEnum(NodeType)).optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
});

/**
 * Tag Update Schema - Validation for tag updates
 */
export const TagUpdateSchema = z.object({
    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag too long')
            .transform((val) => val.trim().toLowerCase())
    ).max(20, 'Maximum 20 tags allowed'),
});

/**
 * Archive Node Schema - Validation for archive operations
 */
export const ArchiveNodeSchema = z.object({
    isArchived: z.boolean(),
});

// Type inference from Zod schemas
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type TagUpdateInput = z.infer<typeof TagUpdateSchema>;
export type ArchiveNodeInput = z.infer<typeof ArchiveNodeSchema>;
