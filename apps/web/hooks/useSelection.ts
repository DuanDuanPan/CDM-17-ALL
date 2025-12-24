'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Hook for managing node selection state in the graph
 * Uses X6 Selection plugin as single source of truth
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Cell, Node, Graph } from '@antv/x6';

export interface UseSelectionOptions {
    /** The X6 Graph instance */
    graph: Graph | null;
}

export interface UseSelectionReturn {
    /** Currently selected nodes */
    selectedNodes: Node[];
    /** IDs of currently selected nodes */
    selectedNodeIds: string[];
    /** Number of selected nodes */
    selectionCount: number;
    /** Whether there is at least one selected node */
    hasSelection: boolean;
    /** Select all nodes in the graph */
    selectAll: () => void;
    /** Clear all selection */
    clearSelection: () => void;
    /** Select specific nodes by ID */
    selectNodes: (nodeIds: string[]) => void;
    /** Add a node to current selection */
    addToSelection: (nodeId: string) => void;
    /** Remove a node from current selection */
    removeFromSelection: (nodeId: string) => void;
    /** Toggle selection state of a node */
    toggleSelection: (nodeId: string) => void;
}

/**
 * Hook for managing multi-node selection state
 * Syncs with X6's Selection plugin and provides a React-friendly API
 * 
 * @example
 * ```tsx
 * function MyComponent({ graph }) {
 *   const { selectedNodes, hasSelection, clearSelection } = useSelection({ graph });
 *   
 *   return (
 *     <Button onClick={clearSelection} disabled={!hasSelection}>
 *       Clear Selection ({selectedNodes.length})
 *     </Button>
 *   );
 * }
 * ```
 */
export function useSelection({ graph }: UseSelectionOptions): UseSelectionReturn {
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    // Use ref to track graph to avoid stale closure issues
    const graphRef = useRef<Graph | null>(null);

    // Update ref when graph changes
    useEffect(() => {
        graphRef.current = graph;
    }, [graph]);

    // Listen to selection:changed event from X6
    useEffect(() => {
        if (!graph) return;

        const handleSelectionChanged = ({
            added: _added,
            removed: _removed,
            selected
        }: {
            added: Cell[];
            removed: Cell[];
            selected: Cell[]
        }) => {
            // Filter to only include nodes (not edges)
            const nodeIds = selected
                .filter(cell => cell.isNode())
                .map(cell => cell.id);
            setSelectedNodeIds(nodeIds);
        };

        graph.on('selection:changed', handleSelectionChanged);

        // Initialize with current selection
        const currentSelection = graph.getSelectedCells();
        if (currentSelection.length > 0) {
            const nodeIds = currentSelection
                .filter(cell => cell.isNode())
                .map(cell => cell.id);
            setSelectedNodeIds(nodeIds);
        }

        return () => {
            graph.off('selection:changed', handleSelectionChanged);
        };
    }, [graph]);

    // Get actual Node objects from IDs
    const selectedNodes: Node[] = graph
        ? selectedNodeIds
            .map(id => graph.getCellById(id))
            .filter((cell): cell is Node => cell?.isNode() ?? false)
        : [];

    /**
     * Select all nodes in the graph
     */
    const selectAll = useCallback(() => {
        if (!graphRef.current) return;
        const allNodes = graphRef.current.getNodes();
        graphRef.current.select(allNodes);
    }, []);

    /**
     * Clear all selection
     */
    const clearSelection = useCallback(() => {
        if (!graphRef.current) return;
        graphRef.current.unselect(graphRef.current.getSelectedCells());
    }, []);

    /**
     * Select specific nodes by ID (replaces current selection)
     */
    const selectNodes = useCallback((nodeIds: string[]) => {
        if (!graphRef.current) return;

        // First clear current selection
        graphRef.current.unselect(graphRef.current.getSelectedCells());

        // Then select the specified nodes
        const nodes = nodeIds
            .map(id => graphRef.current!.getCellById(id))
            .filter((cell): cell is Node => cell?.isNode() ?? false);

        if (nodes.length > 0) {
            graphRef.current.select(nodes);
        }
    }, []);

    /**
     * Add a node to current selection (without clearing existing)
     */
    const addToSelection = useCallback((nodeId: string) => {
        if (!graphRef.current) return;

        const cell = graphRef.current.getCellById(nodeId);
        if (cell?.isNode()) {
            // Get current selection and add the new node
            const currentSelection = graphRef.current.getSelectedCells();
            graphRef.current.select([...currentSelection, cell]);
        }
    }, []);

    /**
     * Remove a node from current selection
     */
    const removeFromSelection = useCallback((nodeId: string) => {
        if (!graphRef.current) return;

        const cell = graphRef.current.getCellById(nodeId);
        if (cell) {
            graphRef.current.unselect(cell);
        }
    }, []);

    /**
     * Toggle selection state of a node (add if not selected, remove if selected)
     */
    const toggleSelection = useCallback((nodeId: string) => {
        if (!graphRef.current) return;

        const cell = graphRef.current.getCellById(nodeId);
        if (!cell?.isNode()) return;

        if (graphRef.current.isSelected(cell)) {
            graphRef.current.unselect(cell);
        } else {
            const currentSelection = graphRef.current.getSelectedCells();
            graphRef.current.select([...currentSelection, cell]);
        }
    }, []);

    return {
        selectedNodes,
        selectedNodeIds,
        selectionCount: selectedNodeIds.length,
        hasSelection: selectedNodeIds.length > 0,
        selectAll,
        clearSelection,
        selectNodes,
        addToSelection,
        removeFromSelection,
        toggleSelection,
    };
}
