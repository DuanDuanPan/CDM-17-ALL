/**
 * Story 9.8: Asset Provenance Component
 * Task 5.1-5.5: Displays provenance information for assets - which nodes link to them
 * 
 * Features:
 * - Summary badge showing node count
 * - Expandable detail panel with node paths
 * - Click to navigate to source node
 * - Limits to 10 items with "view more" (Red Team)
 */

'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { cn, Button } from '@cdm/ui';
import { useNodeTreeProjection } from '@/features/data-library/hooks/useNodeTreeProjection';
import { NodeBreadcrumb } from './NodeBreadcrumb';

// ========================================
// Types
// ========================================

export interface AssetProvenanceProps {
    /** Asset ID for display */
    assetId: string;
    /** Node IDs that link to this asset */
    sourceNodeIds: string[];
    /** Callback when a node is clicked */
    onNodeClick?: (nodeId: string) => void;
    /** Whether to show expanded details by default */
    defaultExpanded?: boolean;
    /** Custom class name */
    className?: string;
}

// ========================================
// Constants
// ========================================

const DEFAULT_VISIBLE_COUNT = 10;

// ========================================
// AssetProvenance Component
// ========================================

export function AssetProvenance({
    assetId,
    sourceNodeIds,
    onNodeClick,
    defaultExpanded = false,
    className,
}: AssetProvenanceProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [showAll, setShowAll] = useState(false);
    const { getNodeType } = useNodeTreeProjection();

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleShowAll = useCallback(() => {
        setShowAll(true);
    }, []);

    // No provenance to show
    if (sourceNodeIds.length === 0) {
        return null;
    }

    const nodeCount = sourceNodeIds.length;
    const visibleNodes = showAll
        ? sourceNodeIds
        : sourceNodeIds.slice(0, DEFAULT_VISIBLE_COUNT);
    const hasMore = sourceNodeIds.length > DEFAULT_VISIBLE_COUNT && !showAll;

    return (
        <div
            className={cn('text-xs', className)}
            data-testid={`asset-provenance-${assetId}`}
        >
            {/* Summary badge - always visible */}
            <button
                onClick={handleToggle}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                aria-expanded={isExpanded}
                data-testid="provenance-toggle"
            >
                <Link2 className="w-3 h-3" />
                <span>{nodeCount} 个节点</span>
                {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronRight className="w-3 h-3" />
                )}
            </button>

            {/* Expanded detail panel */}
            {isExpanded && (
                <div
                    className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-700"
                    data-testid="provenance-details"
                >
                    <div className="text-gray-500 dark:text-gray-400 mb-1.5">
                        关联节点:
                    </div>
                    <ul className="space-y-1">
                        {visibleNodes.map((nodeId) => {
                            const nodeType = getNodeType(nodeId);
                            const typeIcon = nodeType === 'PBS' ? '📦' : nodeType === 'TASK' ? '✅' : '📄';

                            return (
                                <li key={nodeId}>
                                    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <span className="flex-shrink-0" aria-hidden="true">
                                            {typeIcon}
                                        </span>
                                        <NodeBreadcrumb
                                            activeNodeId={nodeId}
                                            onNodeClick={onNodeClick}
                                            allowCurrentClick
                                            className="text-xs text-gray-700 dark:text-gray-300"
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {/* View more button (Red Team - Task 5.5) */}
                    {hasMore && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShowAll}
                            className="mt-2 text-blue-600 dark:text-blue-400 w-full"
                            data-testid="provenance-show-more"
                        >
                            查看更多 ({sourceNodeIds.length - DEFAULT_VISIBLE_COUNT} 个)
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default AssetProvenance;
