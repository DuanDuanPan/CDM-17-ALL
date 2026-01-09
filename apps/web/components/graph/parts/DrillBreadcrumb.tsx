'use client';

/**
 * Story 8.9: 子图下钻导航 (Subgraph Drill-Down Navigation)
 * DrillBreadcrumb - 面包屑导航组件
 *
 * 技术决策:
 * - GR-3: 面包屑显示下钻路径，点击可跳转
 * - AC3: 点击面包屑返回对应层级
 * - AC5: 面包屑正确显示完整路径
 *
 * UI 规范:
 * - Glassmorphic 风格：bg-black/40 backdrop-blur-md border-white/10
 * - 位置：画布左上方 top-4 left-4，fixed 定位
 * - 动画：路径变化时 Slide + Fade
 */

import { useMemo } from 'react';
import type { Graph, Node } from '@antv/x6';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@cdm/ui';

export interface DrillBreadcrumbProps {
    /** Current drill path (array of node IDs) */
    drillPath: readonly string[];
    /** Whether currently in drill mode */
    isDrillMode: boolean;
    /** X6 Graph instance to get node labels */
    graph: Graph | null;
    /** Navigate to specific path (breadcrumb click) */
    onNavigate: (path: readonly string[]) => void;
    /** Navigate to root (Home click) */
    onNavigateToRoot: () => void;
}

interface BreadcrumbItem {
    id: string;
    label: string;
    path: readonly string[]; // Path up to and including this item
}

/**
 * Breadcrumb navigation for subgraph drill-down.
 * Displays current drill path with clickable items for navigation.
 */
export function DrillBreadcrumb({
    drillPath,
    isDrillMode,
    graph,
    onNavigate,
    onNavigateToRoot,
}: DrillBreadcrumbProps) {
    // Build breadcrumb items with labels from graph
    const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
        if (!graph || drillPath.length === 0) return [];

        return drillPath.map((nodeId, index) => {
            const cell = graph.getCellById(nodeId);
            let label = nodeId; // fallback to ID

            if (cell && cell.isNode()) {
                const nodeData = (cell as Node).getData() || {};
                label = nodeData.label || nodeData.title || nodeId;
            }

            return {
                id: nodeId,
                label,
                path: drillPath.slice(0, index + 1),
            };
        });
    }, [graph, drillPath]);

    // Don't render if not in drill mode
    if (!isDrillMode) return null;

    return (
        <nav
            data-testid="drill-breadcrumb"
            className={cn(
                'absolute z-50 top-4 left-4',
                'flex items-center gap-1.5 px-4 py-2',
                'bg-black/40 backdrop-blur-md',
                'border border-white/10 rounded-lg',
                'shadow-2xl shadow-black/20',
                'animate-in fade-in slide-in-from-top-2 duration-300'
            )}
            aria-label="下钻导航路径"
        >
            {/* Home (Root) button */}
            <button
                onClick={onNavigateToRoot}
                className={cn(
                    'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
                    'p-1.5 rounded-md transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-white/20'
                )}
                title="返回主视图"
                aria-label="返回主视图"
            >
                <Home className="w-4 h-4" />
            </button>

            {/* Path items */}
            {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;

                return (
                    <div key={item.id} className="flex items-center gap-1.5">
                        {/* Separator */}
                        <ChevronRight className="w-4 h-4 text-white/30" />

                        {/* Breadcrumb item */}
                        {isLast ? (
                            // Current (active) item - not clickable
                            <span
                                className={cn(
                                    'text-sm text-white font-medium',
                                    'px-2 py-1 cursor-default',
                                    'max-w-[150px] truncate'
                                )}
                                title={item.label}
                            >
                                {item.label}
                            </span>
                        ) : (
                            // Clickable item
                            <button
                                onClick={() => onNavigate(item.path)}
                                className={cn(
                                    'text-sm text-zinc-500 hover:text-zinc-300',
                                    'hover:bg-white/5 px-2 py-1 rounded-md',
                                    'transition-all duration-200',
                                    'focus:outline-none focus:ring-2 focus:ring-white/20',
                                    'max-w-[120px] truncate'
                                )}
                                title={`返回 ${item.label}`}
                            >
                                {item.label}
                            </button>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
