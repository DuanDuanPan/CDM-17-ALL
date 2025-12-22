'use client';

/**
 * Story 2.5: Archive Drawer Component
 * Refined UI Implementation based on mockup
 * Story 2.7: Fixed multi-client sync for archive/restore operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Search,
    FileText,
    CheckCircle,
    Box,
    Database,
    Circle,
    Loader2,
    Trash2,
    Package,
} from 'lucide-react';
import { NodeType, SearchResultItem } from '@cdm/types';
import { format } from 'date-fns';
import { useConfirmDialog } from '@cdm/ui';
import { toast } from 'sonner';
import { useGraphContextOptional } from '@/contexts';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ArchiveDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    graphId?: string;
    onRestore?: (nodeId: string) => void;
}

/**
 * Node Type Icon Component with Colored Background
 */
function NodeTypeIcon({ type }: { type: NodeType }) {
    let bgColor = 'bg-gray-400';
    let Icon = Circle;

    switch (type) {
        case NodeType.TASK:
            bgColor = 'bg-emerald-500';
            Icon = CheckCircle;
            break;
        case NodeType.REQUIREMENT:
            bgColor = 'bg-violet-500';
            Icon = FileText;
            break;
        case NodeType.PBS:
            bgColor = 'bg-sky-500';
            Icon = Box;
            break;
        case NodeType.DATA:
            bgColor = 'bg-amber-500';
            Icon = Database;
            break;
    }

    return (
        <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
    );
}

/**
 * Archive Drawer Component
 */
export function ArchiveDrawer({
    isOpen,
    onClose,
    graphId,
    onRestore,
}: ArchiveDrawerProps) {
    // Story 2.7: Get yDoc from GraphContext for collaborative sync
    const graphContext = useGraphContextOptional();
    const yDoc = graphContext?.yDoc ?? null;
    const graph = graphContext?.graph ?? null;

    // Use project's styled confirm dialog instead of native confirm()
    const { showConfirm } = useConfirmDialog();

    const [archivedNodes, setArchivedNodes] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fetch archived nodes
    const fetchArchivedNodes = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (graphId) params.set('graphId', graphId);

            const response = await fetch(
                `${API_BASE_URL}/api/nodes/archived?${params.toString()}`
            );
            if (response.ok) {
                const data = await response.json();
                const nodes = data.results || [];
                setArchivedNodes(nodes);
            }
        } catch (error) {
            console.error('Failed to fetch archived nodes:', error);
        } finally {
            setIsLoading(false);
        }
    }, [graphId]);

    // Load on open
    useEffect(() => {
        if (isOpen) {
            fetchArchivedNodes();
            setSelectedIds(new Set());
        }
    }, [isOpen, fetchArchivedNodes]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter by search
    const filteredNodes = useMemo(() => archivedNodes.filter(
        (node) =>
            !searchQuery ||
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.tags.some((t) => t.includes(searchQuery.toLowerCase()))
    ), [archivedNodes, searchQuery]);

    // Selection Handlers
    const handleSelectAll = () => {
        if (selectedIds.size === filteredNodes.length && filteredNodes.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredNodes.map(n => n.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Restore Logic
    // Story 2.7: Fixed to update Yjs for multi-client sync
    const handleRestore = async (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        // Add to processing
        setProcessingIds(prev => {
            const next = new Set(prev);
            nodeIds.forEach(id => next.add(id));
            return next;
        });

        try {
            // 1. Call backend API
            await Promise.all(nodeIds.map(id =>
                fetch(`${API_BASE_URL}/api/nodes/${id}:unarchive`, { method: 'POST' })
            ));

            // 2. Story 2.7: Update Yjs to sync to other clients
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

            // 3. Update local X6 graph visibility (for current client)
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

            // 4. Update local state
            setArchivedNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });

            // 5. Notify parent
            nodeIds.forEach(id => onRestore?.(id));
        } catch (error) {
            console.error('Failed to restore nodes:', error);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    // Delete Logic - Using project's styled confirm dialog
    // Story 2.7: Added Yjs sync for multi-client permanent delete
    const handleDelete = useCallback((nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        const count = nodeIds.length;
        showConfirm({
            title: '确认永久删除',
            description: `确定要永久删除这 ${count} 个节点吗？此操作无法撤销。`,
            confirmText: '永久删除',
            cancelText: '取消',
            variant: 'danger',
            onConfirm: async () => {
                setProcessingIds(prev => {
                    const next = new Set(prev);
                    nodeIds.forEach(id => next.add(id));
                    return next;
                });

                try {
                    // 1. Call backend API to delete nodes
                    await Promise.all(nodeIds.map(id =>
                        fetch(`${API_BASE_URL}/api/nodes/${id}`, { method: 'DELETE' })
                    ));

                    // 2. Delete from Yjs to sync to other clients
                    if (yDoc) {
                        const yNodes = yDoc.getMap<YjsNodeData>('nodes');
                        const yEdges = yDoc.getMap('edges');

                        yDoc.transact(() => {
                            // First, delete related edges
                            yEdges.forEach((edgeData, edgeId) => {
                                const edge = edgeData as { source: string; target: string };
                                if (nodeIds.includes(edge.source) || nodeIds.includes(edge.target)) {
                                    yEdges.delete(edgeId);
                                }
                            });
                            // Then, delete nodes
                            nodeIds.forEach(id => {
                                yNodes.delete(id);
                            });
                        });
                    }

                    // 3. Update local component state
                    setArchivedNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        nodeIds.forEach(id => next.delete(id));
                        return next;
                    });

                    toast.success(`已永久删除 ${count} 个节点`);
                } catch (error) {
                    console.error('Failed to delete nodes:', error);
                    // Show error using toast notification
                    toast.error('删除失败，请稍后重试');
                } finally {
                    setProcessingIds(prev => {
                        const next = new Set(prev);
                        nodeIds.forEach(id => next.delete(id));
                        return next;
                    });
                }
            },
        });
    }, [yDoc, showConfirm]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed right-0 top-0 h-full w-[400px] 
                           bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
                           shadow-2xl z-50 flex flex-col border-l border-gray-200/50 dark:border-gray-700/50
                           animate-in slide-in-from-right duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            归档箱
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索归档节点..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm
                                     border border-gray-200 dark:border-gray-700
                                     rounded-full bg-white dark:bg-gray-800
                                     text-gray-900 dark:text-white
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                     transition-shadow shadow-sm"
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                        </div>
                    ) : filteredNodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Package className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-sm font-medium">
                                {searchQuery ? '无匹配节点' : '归档箱为空'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredNodes.map((node) => {
                                const isSelected = selectedIds.has(node.id);
                                const isProcessing = processingIds.has(node.id);

                                return (
                                    <div
                                        key={node.id}
                                        className={`group relative flex items-center gap-4 py-4 px-3 rounded-xl transition-all duration-200
                                            ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30'
                                                : 'bg-transparent border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }
                                            ${filteredNodes.indexOf(node) !== filteredNodes.length - 1 && !isSelected ? 'border-b-gray-100 dark:border-b-gray-800 border-b-[1px] border-t-0 border-x-0 rounded-none' : ''}
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <div className="flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(node.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>

                                        {/* Icon */}
                                        <NodeTypeIcon type={node.type} />

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate pr-2">
                                                    {node.label}
                                                </h3>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                                                <span className="shrink-0">
                                                    归档于: {node.archivedAt ? format(new Date(node.archivedAt), 'yyyy-MM-dd') : '未知时间'}
                                                </span>
                                                <span className="truncate">来自: {node.graphName}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            {isProcessing ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore([node.id])}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                                                    >
                                                        恢复
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete([node.id])}
                                                        className="text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 transition-colors"
                                                    >
                                                        删除
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            共 {archivedNodes.length} 个归档节点
                        </span>

                        <div className="flex gap-3">
                            {selectedIds.size > 0 ? (
                                <>
                                    <button
                                        onClick={() => handleRestore(Array.from(selectedIds))}
                                        className="px-4 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 
                                                 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                                    >
                                        批量恢复 ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={() => handleDelete(Array.from(selectedIds))}
                                        className="px-4 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 
                                                 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                                    >
                                        删除
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleRestore(filteredNodes.map(n => n.id))}
                                        disabled={filteredNodes.length === 0}
                                        className="px-4 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 
                                                 rounded-lg hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        批量恢复
                                    </button>
                                    <button
                                        onClick={() => handleDelete(filteredNodes.map(n => n.id))}
                                        disabled={filteredNodes.length === 0}
                                        className="px-4 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 
                                                 rounded-lg hover:bg-red-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        清空
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}

export default ArchiveDrawer;
