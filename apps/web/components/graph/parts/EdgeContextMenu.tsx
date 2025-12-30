'use client';

import type { Edge, Graph } from '@antv/x6';
import { DependencyType } from '@cdm/types';
import { DEPENDENCY_TYPES, getEdgeMetadata } from '../hooks';

export interface EdgeContextMenuProps {
    visible: boolean;
    x: number;
    y: number;
    edge: Edge | null;
    graph: Graph | null;
    onDependencyTypeChange: (newType: DependencyType) => void;
    onRemoveEdge: () => void;
    onClose: () => void;
}

/**
 * Edge context menu for dependency type modification.
 * Story 7.4: Extracted from GraphComponent for single responsibility.
 */
export function EdgeContextMenu({
    visible,
    x,
    y,
    edge,
    onDependencyTypeChange,
    onRemoveEdge,
    onClose,
}: EdgeContextMenuProps) {
    if (!visible || !edge) return null;

    const currentMetadata = getEdgeMetadata(edge);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
                style={{ left: x, top: y }}
            >
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                    修改依赖类型
                </div>
                {DEPENDENCY_TYPES.map((type) => {
                    const isSelected = currentMetadata.dependencyType === type.value;
                    return (
                        <button
                            key={type.value}
                            onClick={() => onDependencyTypeChange(type.value)}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                                isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm">{type.label}</span>
                                <span className="text-xs text-gray-500">{type.description}</span>
                            </span>
                            {isSelected && <span className="text-blue-500">✓</span>}
                        </button>
                    );
                })}
                <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                        onClick={onRemoveEdge}
                        className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm"
                    >
                        删除依赖连线
                    </button>
                </div>
            </div>
        </>
    );
}
