'use client';

/**
 * Story 2.5: Archive Drawer Component
 * Displays archived nodes and allows restore operations
 * AC#4.3
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Archive,
    X,
    RefreshCw,
    Search,
    FileText,
    CheckCircle,
    Box,
    Database,
    Circle,
    Loader2,
} from 'lucide-react';
import { NodeType, SearchResultItem } from '@cdm/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ArchiveDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    graphId?: string;
    onRestore?: (nodeId: string) => void;
}

/**
 * Node Type Icon Component
 */
function NodeTypeIcon({ type }: { type: NodeType }) {
    const iconClass = 'w-4 h-4';
    switch (type) {
        case NodeType.TASK:
            return <CheckCircle className={`${iconClass} text-emerald-500`} />;
        case NodeType.REQUIREMENT:
            return <FileText className={`${iconClass} text-violet-500`} />;
        case NodeType.PBS:
            return <Box className={`${iconClass} text-sky-500`} />;
        case NodeType.DATA:
            return <Database className={`${iconClass} text-amber-500`} />;
        default:
            return <Circle className={`${iconClass} text-gray-400`} />;
    }
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
    const [archivedNodes, setArchivedNodes] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

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
                setArchivedNodes(data.results || []);
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
        }
    }, [isOpen, fetchArchivedNodes]);

    // Restore node
    const handleRestore = async (nodeId: string) => {
        setRestoringIds((prev) => new Set(prev).add(nodeId));
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/nodes/${nodeId}:unarchive`,
                { method: 'POST' }
            );
            if (response.ok) {
                setArchivedNodes((prev) => prev.filter((n) => n.id !== nodeId));
                onRestore?.(nodeId);
            }
        } catch (error) {
            console.error('Failed to restore node:', error);
        } finally {
            setRestoringIds((prev) => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        }
    };

    // Filter by search
    const filteredNodes = archivedNodes.filter(
        (node) =>
            !searchQuery ||
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.tags.some((t) => t.includes(searchQuery.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed right-0 top-0 h-full w-[360px] bg-white dark:bg-gray-900
                   shadow-xl z-50 flex flex-col 
                   transform transition-transform duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Archive className="w-5 h-5 text-gray-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            归档箱
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索归档节点..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700
                         rounded-lg bg-gray-50 dark:bg-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         dark:text-white dark:placeholder:text-gray-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto"
                    style={{ height: 'calc(100vh - 260px)', backgroundColor: '#ffffff' }}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                    ) : filteredNodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Archive className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">
                                {searchQuery ? '未找到匹配的归档节点' : '归档箱为空'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredNodes.map((node) => (
                                <div
                                    key={node.id}
                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >
                                    <div className="flex items-start gap-3">
                                        <NodeTypeIcon type={node.type} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {node.label}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                来自: {node.graphName}
                                            </div>
                                            {node.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {node.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="text-[10px] px-1.5 py-0.5 rounded
                                         bg-gray-100 text-gray-600
                                         dark:bg-gray-700 dark:text-gray-300"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-2 ml-7">
                                        <button
                                            onClick={() => handleRestore(node.id)}
                                            disabled={restoringIds.has(node.id)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs
                                 text-blue-600 hover:text-blue-700 hover:bg-blue-50
                                 dark:text-blue-400 dark:hover:bg-blue-900/30
                                 rounded transition-colors disabled:opacity-50"
                                        >
                                            {restoringIds.has(node.id) ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3 h-3" />
                                            )}
                                            恢复
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                    共 {archivedNodes.length} 个归档节点
                </div>
            </div>
        </>
    );
}

export default ArchiveDrawer;
