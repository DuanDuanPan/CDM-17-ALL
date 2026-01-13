/**
 * Story 9.8: Node Tree View Component
 * Task 4.1-4.8: Merged PBS+Task tree view with checkbox multi-select
 * 
 * This component displays a projected tree of PBS and TASK nodes,
 * supporting single node focus (activeNodeId) and multi-selection (selectedNodeIds).
 */

'use client';

import { useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn, Button } from '@cdm/ui';
import { useNodeTreeProjection, type ProjectedNode } from '@/features/data-library/hooks/useNodeTreeProjection';
import { NodeType } from '@cdm/types';
import { escapeRegex } from './DualSearch';

// ========================================
// Types
// ========================================

export interface NodeTreeViewProps {
    /** Current active node (for breadcrumb/single-node display) */
    activeNodeId: string | null;
    /** Callback when active node changes */
    onActiveNodeChange: (nodeId: string | null) => void;
    /** Set of selected node IDs (for multi-select/batch operations) */
    selectedNodeIds: Set<string>;
    /** Callback when selection changes */
    onSelectedNodeIdsChange: (ids: Set<string>) => void;
    /** Set of expanded node IDs */
    expandedIds: Set<string>;
    /** Callback to toggle node expansion */
    onToggleExpand: (nodeId: string) => void;
    /** Search query for filtering nodes */
    searchQuery?: string;
}

// ========================================
// Helper: Node Icon by Type
// ========================================

function NodeTypeIcon({ nodeType }: { nodeType: NodeType }) {
    if (nodeType === NodeType.PBS) {
        return <span className="text-sm mr-1" title="PBS">📦</span>;
    }
    if (nodeType === NodeType.TASK) {
        return <span className="text-sm mr-1" title="任务">✅</span>;
    }
    return null;
}

// ========================================
// NodeTreeItem Component
// ========================================

interface NodeTreeItemProps {
    node: ProjectedNode;
    level: number;
    activeNodeId: string | null;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onActiveChange: (nodeId: string) => void;
    onToggleSelect: (nodeId: string) => void;
    onToggleExpand: (nodeId: string) => void;
    searchQuery?: string;
}

function NodeTreeItem({
    node,
    level,
    activeNodeId,
    selectedIds,
    expandedIds,
    onActiveChange,
    onToggleSelect,
    onToggleExpand,
    searchQuery,
}: NodeTreeItemProps) {
    const isExpanded = expandedIds.has(node.id);
    const isActive = activeNodeId === node.id;
    const isSelected = selectedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    // Highlight matching text with proper escaping
    const highlightedLabel = useMemo(() => {
        if (!searchQuery?.trim()) return node.label;
        const escapedQuery = escapeRegex(searchQuery.trim());
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parts = node.label.split(regex);
        return parts.map((part: string, i: number) =>
            i % 2 === 1 ? (
                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    }, [node.label, searchQuery]);

    const handleCheckboxChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            onToggleSelect(node.id);
        },
        [node.id, onToggleSelect]
    );

    const handleExpandClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(node.id);
        },
        [hasChildren, node.id, onToggleExpand]
    );

    return (
        <div
            data-testid={`node-tree-item-${node.id}`}
            data-node-type={node.nodeType}
        >
            <div
                className={cn(
                    'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    isActive && 'bg-blue-50 dark:bg-blue-900/30',
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => onActiveChange(node.id)}
            >
                {/* Expand/Collapse */}
                <button
                    onClick={handleExpandClick}
                    className="w-4 h-4 flex items-center justify-center"
                    disabled={!hasChildren}
                    type="button"
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )
                    ) : (
                        <span className="w-3" />
                    )}
                </button>

                {/* Checkbox for multi-select - using native input */}
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleCheckboxChange}
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`选择 ${node.label}`}
                />

                {/* Node Type Icon */}
                <NodeTypeIcon nodeType={node.nodeType} />

                {/* Label */}
                <span
                    className={cn(
                        'text-sm truncate flex-1',
                        isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    )}
                >
                    {highlightedLabel}
                </span>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((child: ProjectedNode) => (
                        <NodeTreeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            activeNodeId={activeNodeId}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onActiveChange={onActiveChange}
                            onToggleSelect={onToggleSelect}
                            onToggleExpand={onToggleExpand}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ========================================
// NodeTreeView Component
// ========================================

export function NodeTreeView({
    activeNodeId,
    onActiveNodeChange,
    selectedNodeIds,
    onSelectedNodeIdsChange,
    expandedIds,
    onToggleExpand,
    searchQuery = '',
}: NodeTreeViewProps) {
    const { projectedTree, isLoading, error } = useNodeTreeProjection();

    const hasSearch = !!searchQuery.trim();

    // Filter tree by search query
    const filteredTree = useMemo(() => {
        if (!hasSearch) return projectedTree;

        const normalizedQuery = searchQuery.trim().toLowerCase();

        function filterNode(nodeToFilter: ProjectedNode): ProjectedNode | null {
            const matchesSelf = nodeToFilter.label.toLowerCase().includes(normalizedQuery);
            const filteredChildren = nodeToFilter.children
                .map((n: ProjectedNode) => filterNode(n))
                .filter((n: ProjectedNode | null): n is ProjectedNode => n !== null);

            if (matchesSelf || filteredChildren.length > 0) {
                return { ...nodeToFilter, children: filteredChildren };
            }
            return null;
        }

        return projectedTree
            .map((n: ProjectedNode) => filterNode(n))
            .filter((n: ProjectedNode | null): n is ProjectedNode => n !== null);
    }, [projectedTree, searchQuery, hasSearch]);

    // Auto-expand matched paths when searching (AC6)
    const expandedIdsEffective = useMemo(() => {
        if (!hasSearch) return expandedIds;

        const autoExpanded = new Set<string>(expandedIds);

        const walk = (nodeToWalk: ProjectedNode) => {
            if (nodeToWalk.children.length > 0) {
                autoExpanded.add(nodeToWalk.id);
                nodeToWalk.children.forEach(walk);
            }
        };

        filteredTree.forEach(walk);
        return autoExpanded;
    }, [expandedIds, filteredTree, hasSearch]);

    const handleToggleSelect = useCallback(
        (nodeId: string) => {
            const newSet = new Set(selectedNodeIds);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            onSelectedNodeIdsChange(newSet);
            // Also set as active when toggling checkbox
            onActiveNodeChange(nodeId);
        },
        [selectedNodeIds, onSelectedNodeIdsChange, onActiveNodeChange]
    );

    const handleClearSelection = useCallback(() => {
        onSelectedNodeIdsChange(new Set());
    }, [onSelectedNodeIdsChange]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10 text-gray-400">
                <span className="text-sm">加载节点树...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center py-10 text-red-500">
                <span className="text-sm">加载失败: {error}</span>
            </div>
        );
    }

    // Empty state
    if (filteredTree.length === 0) {
        return (
            <div className="flex items-center justify-center py-10 text-gray-400">
                <span className="text-sm">
                    {searchQuery ? `未找到匹配 "${searchQuery}" 的节点` : '无可用节点'}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Selection bar */}
            {selectedNodeIds.size > 0 && (
                <div
                    className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800"
                    data-testid="node-selection-bar"
                >
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                        已选 {selectedNodeIds.size} 个节点
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                        清空选择
                    </Button>
                </div>
            )}

            {/* Tree content */}
            <div className="flex-1 overflow-y-auto py-2">
                {filteredTree.map((node: ProjectedNode) => (
                    <NodeTreeItem
                        key={node.id}
                        node={node}
                        level={0}
                        activeNodeId={activeNodeId}
                        selectedIds={selectedNodeIds}
                        expandedIds={expandedIdsEffective}
                        onActiveChange={onActiveNodeChange}
                        onToggleSelect={handleToggleSelect}
                        onToggleExpand={onToggleExpand}
                        searchQuery={searchQuery}
                    />
                ))}
            </div>
        </div>
    );
}

export default NodeTreeView;
