/**
 * Story 9.8: Node Breadcrumb Component
 * Task 3.1-3.5: Displays path from root to active node with collapsing and tooltips
 * 
 * Features:
 * - Full path display for short paths
 * - Collapsed display for long paths: Root / … / Parent / Current
 * - Hover tooltip on collapsed section (AC9)
 * - Click to navigate/expand to any node in path
 */

'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@cdm/ui';
import { useNodeTreeProjection } from '@/features/data-library/hooks/useNodeTreeProjection';

// ========================================
// Types
// ========================================

export interface NodeBreadcrumbProps {
    /** Active node ID to show path for */
    activeNodeId: string | null;
    /** Callback when a node in the path is clicked */
    onNodeClick?: (nodeId: string) => void;
    /** Whether the current segment is clickable (default: false) */
    allowCurrentClick?: boolean;
    /** Maximum visible segments before collapsing (default: 4) */
    maxVisibleSegments?: number;
    /** Custom class name */
    className?: string;
}

interface PathSegment {
    id: string;
    label: string;
    isRoot: boolean;
    isCurrent: boolean;
}

// ========================================
// Constants
// ========================================

const DEFAULT_MAX_VISIBLE = 4;

// ========================================
// NodeBreadcrumb Component
// ========================================

export function NodeBreadcrumb({
    activeNodeId,
    onNodeClick,
    allowCurrentClick = false,
    maxVisibleSegments = DEFAULT_MAX_VISIBLE,
    className,
}: NodeBreadcrumbProps) {
    const { getOriginalPath, getNodeLabel } = useNodeTreeProjection();
    const [showTooltip, setShowTooltip] = useState(false);

    // Build path segments
    const pathSegments = useMemo((): PathSegment[] => {
        if (!activeNodeId) return [];

        const pathIds = getOriginalPath(activeNodeId);
        return pathIds.map((id, index) => ({
            id,
            label: getNodeLabel(id),
            isRoot: index === 0,
            isCurrent: index === pathIds.length - 1,
        }));
    }, [activeNodeId, getOriginalPath, getNodeLabel]);

    // Determine if path should be collapsed
    const shouldCollapse = pathSegments.length > maxVisibleSegments;

    // Get visible segments with collapse logic
    const visibleSegments = useMemo(() => {
        if (!shouldCollapse) return { segments: pathSegments, collapsedSegments: [] };

        // Show: root, ellipsis, last (maxVisibleSegments - 2) items
        // e.g. maxVisibleSegments=4 => Root / … / Parent / Current
        const root = pathSegments[0];
        const tailCount = Math.max(maxVisibleSegments - 2, 1);
        const tail = pathSegments.slice(-tailCount);
        const collapsed = pathSegments.slice(1, pathSegments.length - tailCount);

        return {
            segments: [root, ...tail],
            collapsedSegments: collapsed,
        };
    }, [pathSegments, shouldCollapse, maxVisibleSegments]);

    // No path to show
    if (pathSegments.length === 0) {
        return null;
    }

    const handleSegmentClick = (segment: PathSegment) => {
        if (onNodeClick && (!segment.isCurrent || allowCurrentClick)) {
            onNodeClick(segment.id);
        }
    };

    return (
        <nav
            className={cn(
                'flex items-center gap-1 text-sm overflow-hidden',
                className
            )}
            aria-label="节点路径"
            data-testid="node-breadcrumb"
        >
            {visibleSegments.segments.map((segment, index) => {
                const isFirst = index === 0;
                const isAfterRoot = index === 1 && shouldCollapse;

                return (
                    <div key={segment.id} className="flex items-center gap-1">
                        {/* Separator before non-first items */}
                        {!isFirst && !isAfterRoot && (
                            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}

                        {/* Collapsed indicator with tooltip */}
                        {isAfterRoot && (
                            <>
                                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <div
                                    className="relative"
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                >
                                    <button
                                        className="px-1.5 py-0.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                        aria-label="展开中间路径"
                                        data-testid="breadcrumb-collapsed"
                                    >
                                        …
                                    </button>

                                    {/* Tooltip for collapsed segments (AC9) */}
                                    {showTooltip && visibleSegments.collapsedSegments.length > 0 && (
                                        <div
                                            className="absolute top-full left-0 mt-1 z-50 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md shadow-lg py-2 px-3 whitespace-nowrap"
                                            data-testid="breadcrumb-tooltip"
                                        >
                                            <div className="text-gray-400 text-xs mb-1">完整路径</div>
                                            {visibleSegments.collapsedSegments.map((seg, i) => (
                                                <div
                                                    key={seg.id}
                                                    className="py-0.5 hover:text-blue-300 cursor-pointer"
                                                    onClick={() => onNodeClick?.(seg.id)}
                                                >
                                                    {i > 0 && <span className="text-gray-500 mx-1">→</span>}
                                                    {seg.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            </>
                        )}

                        {/* Segment button */}
                        <button
                            onClick={() => handleSegmentClick(segment)}
                            disabled={segment.isCurrent && !allowCurrentClick}
                            className={cn(
                                'flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors truncate max-w-[120px]',
                                segment.isCurrent && !allowCurrentClick
                                    ? 'text-gray-900 dark:text-white font-medium cursor-default'
                                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                            )}
                            title={segment.label}
                        >
                            {segment.isRoot && (
                                <Home className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="truncate">{segment.label}</span>
                        </button>
                    </div>
                );
            })}
        </nav>
    );
}

export default NodeBreadcrumb;
