'use client';

import type { Node } from '@antv/x6';

export interface DependencyModeIndicatorProps {
    isDependencyMode: boolean;
    connectionStartNode: Node | null;
    onCancelConnection: () => void;
    onExitDependencyMode?: () => void;
}

/**
 * Dependency mode indicator overlay.
 * Story 7.4: Extracted from GraphComponent for single responsibility.
 */
export function DependencyModeIndicator({
    isDependencyMode,
    connectionStartNode,
    onCancelConnection,
    onExitDependencyMode,
}: DependencyModeIndicatorProps) {
    if (!isDependencyMode) return null;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            {connectionStartNode ? (
                <span>
                    已选择起点节点，点击另一个任务节点创建依赖连线
                    <button
                        onClick={onCancelConnection}
                        className="ml-2 underline hover:text-orange-900"
                    >
                        取消
                    </button>
                </span>
            ) : (
                <span>依赖连线模式 - 点击第一个任务节点开始</span>
            )}
            <button
                onClick={onExitDependencyMode}
                className="ml-2 text-orange-500 hover:text-orange-700"
                title="按 ESC 退出"
            >
                ✕
            </button>
        </div>
    );
}
