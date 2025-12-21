/**
 * Story 2.4: Graph Context
 * Provides graph instance and navigation methods to child components
 */

'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { Graph } from '@antv/x6';

export interface GraphContextValue {
    /** X6 Graph instance */
    graph: Graph | null;
    /** Current graph ID */
    graphId: string | null;
    /** Navigate to a specific node by ID */
    navigateToNode: (nodeId: string) => void;
    /** Select a specific node by ID */
    selectNode: (nodeId: string | null) => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

export interface GraphProviderProps {
    children: ReactNode;
    graph: Graph | null;
    graphId: string;
    onNodeSelect?: (nodeId: string | null) => void;
}

export function GraphProvider({ children, graph, graphId, onNodeSelect }: GraphProviderProps) {
    /**
     * Navigate to a node: center the graph viewport on the node and select it
     */
    const navigateToNode = useCallback((nodeId: string) => {
        if (!graph || !nodeId) return;

        const node = graph.getCellById(nodeId);
        if (!node || !node.isNode()) {
            console.warn('[GraphContext] Node not found:', nodeId);
            return;
        }

        // Select the node
        graph.cleanSelection();
        graph.select(node);

        // Set node data to selected state
        const data = node.getData() || {};
        node.setData({ ...data, isSelected: true });

        // Center viewport on the node
        const bbox = node.getBBox();
        if (bbox) {
            graph.centerPoint(bbox.center.x, bbox.center.y);
        }

        // Trigger the onNodeSelect callback
        onNodeSelect?.(nodeId);
    }, [graph, onNodeSelect]);

    const selectNode = useCallback((nodeId: string | null) => {
        if (!graph) return;

        if (!nodeId) {
            graph.cleanSelection();
            onNodeSelect?.(null);
            return;
        }

        const node = graph.getCellById(nodeId);
        if (node && node.isNode()) {
            graph.cleanSelection();
            graph.select(node);
            onNodeSelect?.(nodeId);
        }
    }, [graph, onNodeSelect]);

    return (
        <GraphContext.Provider value={{ graph, graphId, navigateToNode, selectNode }}>
            {children}
        </GraphContext.Provider>
    );
}

/**
 * Hook to access graph context (throws if not in provider)
 */
export function useGraphContext(): GraphContextValue {
    const context = useContext(GraphContext);
    if (!context) {
        throw new Error('useGraphContext must be used within a GraphProvider');
    }
    return context;
}

/**
 * Hook to access graph context (returns null if not in provider)
 */
export function useGraphContextOptional(): GraphContextValue | null {
    return useContext(GraphContext);
}
