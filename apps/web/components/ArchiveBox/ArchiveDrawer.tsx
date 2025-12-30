'use client';

/**
 * Story 2.5: Archive Drawer Component
 * Refined UI Implementation based on mockup
 * Story 2.7: Fixed multi-client sync for archive/restore operations
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 3 direct fetch() calls
 * - Now uses useArchive hook following Story 7.2 pattern
 */

import { useState, useEffect, useMemo } from 'react';
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
    Package,
} from 'lucide-react';
import { NodeType } from '@cdm/types';
import { format } from 'date-fns';
import { useConfirmDialog } from '@cdm/ui';
import { toast } from 'sonner';
import { useGraphContextOptional } from '@/contexts';
import { useArchive } from '@/hooks/useArchive';

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

    // Story 7.5: Use Hook-First pattern
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
    const [mounted, setMounted] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Load on open
    useEffect(() => {
        if (isOpen) {
            refresh();
            setSelectedIds(new Set());
        }
    }, [isOpen, refresh]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Show error toast
    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    // Filter by search
    const filteredNodes = useMemo(() => archivedNodes.filter(
        (node) =>
            !searchQuery ||
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.tags.some((t) => t.includes(searchQuery.toLowerCase()))
    ), [archivedNodes, searchQuery]);

    // Selection Handlers
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Restore Logic using hook
    const handleRestore = async (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        try {
            await restoreNodes(nodeIds);
            // Clear selection
            setSelectedIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.delete(id));
                return next;
            });
            // Notify parent
            nodeIds.forEach(id => onRestore?.(id));
        } catch {
            // Error already handled by hook
        }
    };

    // Delete Logic using hook
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
                    // Clear selection
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
