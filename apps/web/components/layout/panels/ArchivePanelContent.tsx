'use client';

/**
 * ArchivePanelContent - Archive panel content for unified left sidebar
 * 
 * Extracted from ArchiveDrawer to work within the left sidebar layout.
 * Displays archived nodes with restore/delete functionality.
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Search,
    FileText,
    CheckCircle,
    Box,
    Database,
    Circle,
    Loader2,
    Package,
} from 'lucide-react';
import { NodeType } from '@cdm/types';
import { format } from 'date-fns';
import { useConfirmDialog } from '@cdm/ui';
import { toast } from 'sonner';
import { useGraphContextOptional } from '@/contexts';
import { useArchive } from '@/hooks/useArchive';

export interface ArchivePanelContentProps {
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
        <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
    );
}

export function ArchivePanelContent({
    graphId,
    onRestore,
}: ArchivePanelContentProps) {
    const graphContext = useGraphContextOptional();
    const yDoc = graphContext?.yDoc ?? null;
    const graph = graphContext?.graph ?? null;

    const { showConfirm } = useConfirmDialog();

    const {
        archivedNodes,
        isLoading,
        processingIds,
        error,
        refresh,
        restoreNodes,
        deleteNodes,
    } = useArchive({ graphId, yDoc, graph });

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Load on mount
    useEffect(() => {
        refresh();
        setSelectedIds(new Set());
    }, [refresh, graphId]);

    // Show error toast
    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    // Filter by search
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const filteredNodes = useMemo(
        () =>
            archivedNodes.filter(
                (node) =>
                    !normalizedSearchQuery ||
                    node.label.toLowerCase().includes(normalizedSearchQuery) ||
                    node.tags.some((t) => t.toLowerCase().includes(normalizedSearchQuery))
            ),
        [archivedNodes, normalizedSearchQuery]
    );

    // Selection Handlers
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Restore Logic
    const handleRestore = async (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        try {
            await restoreNodes(nodeIds);
            setSelectedIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });
            nodeIds.forEach(id => onRestore?.(id));
        } catch {
            // Error already handled by hook
        }
    };

    // Delete Logic
    const handleDelete = (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        const count = nodeIds.length;
        showConfirm({
            title: '确认永久删除',
            description: `确定要永久删除这 ${count} 个节点吗？此操作无法撤销。`,
            confirmText: '永久删除',
            cancelText: '取消',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await deleteNodes(nodeIds);
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        nodeIds.forEach(id => next.delete(id));
                        return next;
                    });
                    toast.success(`已永久删除 ${count} 个节点`);
                } catch {
                    // Error already handled by hook
                }
            },
        });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search */}
            <div className="px-3 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索归档节点..."
                        className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                    </div>
                ) : filteredNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Package className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-xs font-medium">
                            {searchQuery ? '无匹配节点' : '归档箱为空'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredNodes.map((node) => {
                            const isSelected = selectedIds.has(node.id);
                            const isProcessing = processingIds.has(node.id);

                            return (
                                <div
                                    key={node.id}
                                    className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-all
                    ${isSelected
                                            ? 'bg-blue-50 border border-blue-100'
                                            : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(node.id)}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />

                                    {/* Icon */}
                                    <NodeTypeIcon type={node.type} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-semibold text-gray-900 truncate">
                                            {node.label}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            {node.archivedAt ? format(new Date(node.archivedAt), 'MM-dd HH:mm') : '未知'}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isProcessing ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleRestore([node.id])}
                                                    className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                                                >
                                                    恢复
                                                </button>
                                                <button
                                                    onClick={() => handleDelete([node.id])}
                                                    className="text-[10px] font-medium text-red-500 hover:text-red-600"
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
            <div className="px-3 py-3 border-t border-gray-100 bg-white/50">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">
                        共 {archivedNodes.length} 个
                    </span>

                    <div className="flex gap-2">
                        {selectedIds.size > 0 ? (
                            <>
                                <button
                                    onClick={() => handleRestore(Array.from(selectedIds))}
                                    className="px-2.5 py-1 text-[10px] font-medium text-blue-600 bg-white border border-blue-200 
                           rounded hover:bg-blue-50 transition-all"
                                >
                                    恢复 ({selectedIds.size})
                                </button>
                                <button
                                    onClick={() => handleDelete(Array.from(selectedIds))}
                                    className="px-2.5 py-1 text-[10px] font-medium text-red-600 bg-white border border-red-200 
                           rounded hover:bg-red-50 transition-all"
                                >
                                    删除
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => refresh()}
                                className="px-2.5 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 
                         rounded hover:bg-gray-50 transition-all"
                            >
                                刷新
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ArchivePanelContent;
