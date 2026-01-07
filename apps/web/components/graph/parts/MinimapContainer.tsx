'use client';

/**
 * Story 8.2: Minimap Container Component
 * AC: #1 (基础渲染), #4 (简化缩略图), #5 (选中高亮), #6 (搜索高亮)
 *
 * Provides a glassmorphism-styled container for the minimap in the bottom-right corner.
 * Integrates with useMinimap hook for functionality.
 * Visibility is controlled by parent via isVisible/onToggle props (persisted via useMinimapStorage).
 */

import { useRef, useEffect } from 'react';
import type { Graph } from '@antv/x6';
import { X, Map } from 'lucide-react';
import { useMinimap } from '../hooks/useMinimap';
import { MinimapToggleButton } from './MinimapToggleButton';

export interface MinimapContainerProps {
    graph: Graph | null;
    isReady: boolean;
    selectedNodeId?: string | null;
    searchMatchIds?: string[];
    /** Controlled visibility state (from useMinimapStorage in parent) */
    isVisible: boolean;
    /** Toggle callback (from useMinimapStorage in parent) */
    onToggle: () => void;
}

/**
 * Minimap container with glassmorphism styling.
 * Fixed position in bottom-right corner, toggleable visibility.
 */
export function MinimapContainer({
    graph,
    isReady,
    selectedNodeId,
    searchMatchIds = [],
    isVisible,
    onToggle,
}: MinimapContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const { isDisabledForPerformance, highlightNodes, clearHighlights } = useMinimap({
        graph,
        isReady,
        containerRef,
        enabled: isVisible,
        width: 200,
        height: 150,
    });

    // Sync selected node highlighting (AC: #5)
    useEffect(() => {
        if (!graph || !isReady) return;

        if (selectedNodeId) {
            highlightNodes([selectedNodeId], 'selected');
        } else {
            clearHighlights('selected');
        }
    }, [graph, isReady, selectedNodeId, highlightNodes, clearHighlights]);

    // Sync search match highlighting (AC: #6)
    useEffect(() => {
        if (!graph || !isReady) return;

        if (searchMatchIds.length > 0) {
            highlightNodes(searchMatchIds, 'search');
        } else {
            clearHighlights('search');
        }
    }, [graph, isReady, searchMatchIds, highlightNodes, clearHighlights]);

    // Don't render if not visible
    if (!isVisible) {
        return (
            <MinimapToggleButton onClick={onToggle} />
        );
    }

    return (
        <div
            role="region"
            aria-label="小地图导航"
            data-testid="minimap-container"
            className="absolute bottom-4 right-4 z-50
                bg-background/80 backdrop-blur-sm
                border border-border/50 rounded-lg
                shadow-lg overflow-hidden
                transition-all duration-200"
        >
            {/* Header with close button */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Map className="w-3.5 h-3.5" />
                    <span>小地图</span>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    data-testid="minimap-toggle"
                    className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                    aria-label="隐藏小地图"
                >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
            </div>

            {isDisabledForPerformance ? (
                <div className="p-3 text-xs text-muted-foreground">
                    节点过多，小地图已自动禁用以提升性能。
                </div>
            ) : (
                <div
                    ref={containerRef}
                    data-testid="minimap-canvas"
                    className="minimap-content"
                    style={{
                        width: 200,
                        height: 150,
                    }}
                />
            )}
        </div>
    );
}

export default MinimapContainer;
