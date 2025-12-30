'use client';

import { useEffect } from 'react';
import type { Graph, Node } from '@antv/x6';

export interface UseGraphSelectionOptions {
    graph: Graph | null;
    isReady: boolean;
    isConnected: boolean;
    /** Update selected node in awareness for collaboration */
    updateSelectedNode: (nodeId: string | null) => void;
}

/**
 * Hook to sync graph selection state with collaboration awareness.
 * Story 1.4: Update selected node in awareness.
 */
export function useGraphSelection({
    graph,
    isReady,
    isConnected,
    updateSelectedNode,
}: UseGraphSelectionOptions): void {
    useEffect(() => {
        if (!graph || !isReady || !isConnected) return;

        const handleSelect = ({ node }: { node: Node }) => {
            updateSelectedNode(node.id);
        };

        const handleUnselect = () => {
            updateSelectedNode(null);
        };

        graph.on('node:selected', handleSelect);
        graph.on('node:unselected', handleUnselect);

        return () => {
            graph.off('node:selected', handleSelect);
            graph.off('node:unselected', handleUnselect);
        };
    }, [graph, isReady, isConnected, updateSelectedNode]);
}
