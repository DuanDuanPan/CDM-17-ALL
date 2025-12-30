'use client';

import { useEffect, useCallback } from 'react';
import type { Graph, Node } from '@antv/x6';
import { isTaskNode, validateDependencyEdge } from '@/lib/edgeValidation';
import { DependencyType } from '@cdm/types';
import { useToast } from '@cdm/ui';

export interface UseGraphDependencyModeOptions {
    graph: Graph | null;
    isReady: boolean;
    isDependencyMode: boolean;
    connectionStartNode: Node | null;
    setConnectionStartNode: (node: Node | null) => void;
}

export interface UseGraphDependencyModeReturn {
    /** Create a dependency edge between two nodes */
    createDependencyEdge: (sourceNode: Node, targetNode: Node) => void;
}

/**
 * Hook to handle dependency mode for creating edges between task nodes.
 * Story 2.2: Dependency edge creation.
 */
export function useGraphDependencyMode({
    graph,
    isReady,
    isDependencyMode,
    connectionStartNode,
    setConnectionStartNode,
}: UseGraphDependencyModeOptions): UseGraphDependencyModeReturn {
    const { addToast } = useToast();

    // Clear connection start node when exiting dependency mode
    useEffect(() => {
        if (!isDependencyMode) {
            setConnectionStartNode(null);
        }
    }, [isDependencyMode, setConnectionStartNode]);

    // Handle node clicks for dependency edge creation
    useEffect(() => {
        if (!graph || !isReady || !isDependencyMode) return;

        const handleNodeClickForDependency = ({ node, e }: { node: Node; e: MouseEvent }) => {
            if (e?.button !== 0) return;

            if (!isTaskNode(node)) {
                console.warn('依赖连线只能连接任务节点');
                return;
            }

            if (!connectionStartNode) {
                setConnectionStartNode(node);
                node.setData({ ...node.getData(), isConnectionSource: true });
            } else {
                if (connectionStartNode.id !== node.id) {
                    const validation = validateDependencyEdge(graph, connectionStartNode.id, node.id);
                    if (validation.isValid) {
                        createDependencyEdgeImpl(graph, connectionStartNode, node);
                    } else {
                        console.warn('无法创建依赖边:', validation.errorMessage);
                        addToast({
                            type: 'error',
                            title: '检测到循环依赖',
                            description: validation.errorMessage || '未知错误',
                        });
                    }
                }
                connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
                setConnectionStartNode(null);
            }
        };

        graph.on('node:click', handleNodeClickForDependency);

        return () => {
            graph.off('node:click', handleNodeClickForDependency);
            if (connectionStartNode) {
                connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
            }
        };
    }, [graph, isReady, isDependencyMode, connectionStartNode, setConnectionStartNode, addToast]);

    const createDependencyEdge = useCallback(
        (sourceNode: Node, targetNode: Node) => {
            if (!graph) return;
            createDependencyEdgeImpl(graph, sourceNode, targetNode);
        },
        [graph]
    );

    return { createDependencyEdge };
}

/**
 * Create a dependency edge between two task nodes.
 */
function createDependencyEdgeImpl(graph: Graph, sourceNode: Node, targetNode: Node): void {
    const dependencyType: DependencyType = 'FS';

    graph.addEdge({
        source: sourceNode.id,
        target: targetNode.id,
        data: {
            metadata: {
                kind: 'dependency',
                dependencyType: dependencyType,
            },
        },
        router: {
            name: 'manhattan',
            args: {
                padding: 20,
            }
        },
        connector: {
            name: 'rounded',
            args: { radius: 10 }
        },
        attrs: {
            line: {
                stroke: '#9ca3af',
                strokeWidth: 1.5,
                strokeDasharray: '5 5',
                targetMarker: {
                    name: 'block',
                    width: 8,
                    height: 8,
                    offset: -1,
                },
            },
        },
        labels: [
            {
                markup: [
                    {
                        tagName: 'rect',
                        selector: 'body',
                    },
                    {
                        tagName: 'text',
                        selector: 'label',
                    },
                ],
                attrs: {
                    label: {
                        text: dependencyType,
                        fill: '#10b981',
                        fontSize: 10,
                        fontWeight: '800',
                    },
                    body: {
                        fill: '#ffffff',
                        stroke: '#d1fae5',
                        strokeWidth: 1.5,
                        rx: 10,
                        ry: 10,
                        refWidth: '100%',
                        refHeight: '100%',
                        refWidth2: 12,
                        refHeight2: 4,
                        refX: -6,
                        refY: -2,
                        filter: {
                            name: 'dropShadow',
                            args: { dx: 0, dy: 1, blur: 2, color: '#0000001a' }
                        }
                    },
                },
                position: 0.5,
            },
        ],
    });
}
