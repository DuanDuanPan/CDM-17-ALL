'use client';

import { useCallback } from 'react';
import type { Graph, Edge } from '@antv/x6';
import { DependencyType } from '@cdm/types';
import { isDependencyEdge } from '@/lib/edgeValidation';

export interface EdgeContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    edge: Edge | null;
}

export interface NodeContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    graphX: number;
    graphY: number;
    nodeId: string | null;
}

export interface UseGraphContextMenuOptions {
    graph: Graph | null;
    contextMenu: EdgeContextMenuState;
    setContextMenu: (state: EdgeContextMenuState) => void;
}

export interface UseGraphContextMenuReturn {
    /** Handle changing dependency type on edge context menu */
    handleDependencyTypeChange: (newType: DependencyType) => void;
    /** Close the context menu */
    handleCloseContextMenu: () => void;
    /** Remove a dependency edge */
    removeEdge: (graph: Graph, edge: Edge) => void;
}

/** Dependency type options for context menu */
export const DEPENDENCY_TYPES: { value: DependencyType; label: string; description: string }[] = [
    { value: 'FS', label: 'FS', description: '完成-开始 (Finish-to-Start)' },
    { value: 'SS', label: 'SS', description: '开始-开始 (Start-to-Start)' },
    { value: 'FF', label: 'FF', description: '完成-完成 (Finish-to-Finish)' },
    { value: 'SF', label: 'SF', description: '开始-完成 (Start-to-Finish)' },
];

/**
 * Hook to handle context menu operations for edges.
 * Story 2.2: Dependency type change and edge deletion.
 */
export function useGraphContextMenu({
    graph,
    contextMenu,
    setContextMenu,
}: UseGraphContextMenuOptions): UseGraphContextMenuReturn {
    const handleDependencyTypeChange = useCallback(
        (newType: DependencyType) => {
            if (!contextMenu.edge || !graph) return;

            const edge = contextMenu.edge;
            const currentData = edge.getData() || {};
            const currentMetadata = currentData.metadata || { kind: 'dependency' };

            const newMetadata = {
                ...currentMetadata,
                dependencyType: newType,
            };
            edge.setData({
                ...currentData,
                metadata: newMetadata,
            });

            edge.setProp({
                router: {
                    name: 'manhattan',
                    args: {
                        padding: 20,
                        startDirections: ['right', 'left', 'top', 'bottom'],
                        endDirections: ['right', 'left', 'top', 'bottom'],
                    },
                },
                connector: {
                    name: 'rounded',
                    args: {
                        radius: 10,
                    },
                },
                attrs: {
                    line: {
                        stroke: '#cbd5e1',
                        strokeWidth: 2,
                        targetMarker: {
                            name: 'block',
                            width: 12,
                            height: 8,
                            fill: '#cbd5e1',
                            stroke: '#cbd5e1',
                        },
                    },
                },
            });

            edge.setLabels([
                {
                    attrs: {
                        label: {
                            text: newType,
                            fill: '#6b7280',
                            fontSize: 10,
                            fontWeight: 'bold',
                        },
                        body: {
                            fill: '#f3f4f6',
                            stroke: '#9ca3af',
                            strokeWidth: 1,
                            rx: 4,
                            ry: 4,
                        },
                    },
                    position: 0.5,
                },
            ]);

            setContextMenu({ visible: false, x: 0, y: 0, edge: null });
        },
        [contextMenu.edge, graph, setContextMenu]
    );

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, edge: null });
    }, [setContextMenu]);

    const removeEdge = useCallback((graph: Graph, edge: Edge): void => {
        if (!isDependencyEdge(edge)) {
            console.warn('Cannot delete hierarchical edge - use node deletion instead');
            return;
        }
        graph.removeEdge(edge);
    }, []);

    return {
        handleDependencyTypeChange,
        handleCloseContextMenu,
        removeEdge,
    };
}
