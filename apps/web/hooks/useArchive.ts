'use client';

/**
 * Story 7.5: Archive Hook
 * Encapsulates archive-related state and API calls
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Features:
 * - Fetch archived nodes with loading state
 * - Batch restore with Yjs sync
 * - Batch delete with Yjs sync
 * - Error handling
 */

import { useState, useCallback } from 'react';
import type { SearchResultItem } from '@cdm/types';
import type { Graph } from '@antv/x6';
import type * as Y from 'yjs';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';
import {
    fetchArchivedNodes,
    batchUnarchiveNodes,
    batchDeleteNodes,
} from '@/lib/api/archive';

export interface UseArchiveOptions {
    graphId?: string;
    /** For Yjs synchronization across clients */
    yDoc?: Y.Doc | null;
    /** For local X6 graph updates */
    graph?: Graph | null;
}

export interface UseArchiveReturn {
    // State
    archivedNodes: SearchResultItem[];
    isLoading: boolean;
    processingIds: Set<string>;
    error: string | null;

    // Actions
    refresh: () => Promise<void>;
    restoreNodes: (nodeIds: string[]) => Promise<void>;
    deleteNodes: (nodeIds: string[]) => Promise<void>;
    clearError: () => void;
}

export function useArchive(options: UseArchiveOptions = {}): UseArchiveReturn {
    const { graphId, yDoc, graph } = options;

    const [archivedNodes, setArchivedNodes] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // Fetch archived nodes
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const nodes = await fetchArchivedNodes({ graphId });
            setArchivedNodes(nodes);
        } catch (err) {
            const message = err instanceof Error ? err.message : '获取归档节点失败';
            console.error('[useArchive] Failed to fetch archived nodes:', err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [graphId]);

    // Restore nodes with Yjs sync
    const restoreNodes = useCallback(async (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        // Add to processing
        setProcessingIds(prev => {
            const next = new Set(prev);
            nodeIds.forEach(id => next.add(id));
            return next;
        });
        setError(null);

        try {
            // 1. Call backend API
            await batchUnarchiveNodes(nodeIds);

            // 2. Update Yjs for multi-client sync
            if (yDoc) {
                const yNodes = yDoc.getMap<YjsNodeData>('nodes');
                const now = new Date().toISOString();
                yDoc.transact(() => {
                    nodeIds.forEach(id => {
                        const existing = yNodes.get(id);
                        if (existing) {
                            yNodes.set(id, {
                                ...existing,
                                isArchived: false,
                                archivedAt: null,
                                updatedAt: now,
                            });
                        }
                    });
                });
            }

            // 3. Update local X6 graph visibility
            if (graph) {
                nodeIds.forEach(id => {
                    const cell = graph.getCellById(id);
                    if (cell && cell.isNode()) {
                        cell.show();
                        // Also show connected edges if both endpoints are visible
                        const edges = graph.getConnectedEdges(cell);
                        edges?.forEach(edge => {
                            const source = edge.getSourceCell();
                            const target = edge.getTargetCell();
                            if (source?.isVisible() && target?.isVisible()) {
                                edge.show();
                            }
                        });
                    }
                });
            }

            // 4. Update local state (optimistic update)
            setArchivedNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
        } catch (err) {
            const message = err instanceof Error ? err.message : '恢复失败';
            console.error('[useArchive] Failed to restore nodes:', err);
            setError(message);
            throw err;
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });
        }
    }, [yDoc, graph]);

    // Delete nodes permanently with Yjs sync
    const deleteNodes = useCallback(async (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        // Add to processing
        setProcessingIds(prev => {
            const next = new Set(prev);
            nodeIds.forEach(id => next.add(id));
            return next;
        });
        setError(null);

        try {
            // 1. Call backend API
            await batchDeleteNodes(nodeIds);

            // 2. Delete from Yjs for multi-client sync
            const edgeIdsToDelete: string[] = [];
            if (yDoc) {
                const yNodes = yDoc.getMap<YjsNodeData>('nodes');
                const yEdges = yDoc.getMap('edges');

                yDoc.transact(() => {
                    // Find and delete related edges
                    yEdges.forEach((edgeData, edgeId) => {
                        const edge = edgeData as { source: string; target: string };
                        if (nodeIds.includes(edge.source) || nodeIds.includes(edge.target)) {
                            edgeIdsToDelete.push(edgeId);
                            yEdges.delete(edgeId);
                        }
                    });
                    // Delete nodes
                    nodeIds.forEach(id => {
                        yNodes.delete(id);
                    });
                });
            }

            // 3. Remove cells from X6 graph
            if (graph) {
                // Remove edges first
                edgeIdsToDelete.forEach(edgeId => {
                    const cell = graph.getCellById(edgeId);
                    if (cell) graph.removeCell(cell);
                });
                // Then remove nodes
                nodeIds.forEach(nodeId => {
                    const cell = graph.getCellById(nodeId);
                    if (cell) graph.removeCell(cell);
                });
            }

            // 4. Update local state
            setArchivedNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
        } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            console.error('[useArchive] Failed to delete nodes:', err);
            setError(message);
            throw err;
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });
        }
    }, [yDoc, graph]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        archivedNodes,
        isLoading,
        processingIds,
        error,
        refresh,
        restoreNodes,
        deleteNodes,
        clearError,
    };
}

export default useArchive;
