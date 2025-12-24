'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Hook for tracking node editing state (when user is editing node labels)
 * Used to disable clipboard shortcuts during text editing
 */

import { useState, useEffect, useRef } from 'react';
import type { Graph } from '@antv/x6';

export interface UseEditingStateOptions {
    /** The X6 Graph instance */
    graph: Graph | null;
}

export interface UseEditingStateReturn {
    /** Whether any node is currently in edit mode */
    isEditing: boolean;
    /** ID of the node being edited (if any) */
    editingNodeId: string | null;
}

/**
 * Hook for tracking whether any node is currently in edit mode
 * 
 * This is important for clipboard shortcuts - when a user is editing
 * a node label, Cmd+C/V should work on the text selection, not on nodes.
 * 
 * Listens to X6 events:
 * - 'node:editing' - Fired when user enters edit mode
 * - 'node:edited' - Fired when user exits edit mode
 * 
 * Also monitors node data changes for isEditing flag
 * 
 * @example
 * ```tsx
 * const { isEditing, editingNodeId } = useEditingState({ graph });
 * 
 * useClipboardShortcuts({
 *   copy,
 *   cut,
 *   paste,
 *   hasSelection,
 *   isEditing, // Disable clipboard shortcuts during editing
 * });
 * ```
 */
export function useEditingState({ graph }: UseEditingStateOptions): UseEditingStateReturn {
    const [isEditing, setIsEditing] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const graphRef = useRef<Graph | null>(null);

    // Keep ref updated
    useEffect(() => {
        graphRef.current = graph;
    }, [graph]);

    useEffect(() => {
        if (!graph) return;

        // Handler for node entering edit mode
        const handleNodeEditing = ({ node }: { node: { id: string } }) => {
            setIsEditing(true);
            setEditingNodeId(node.id);
        };

        // Handler for node exiting edit mode
        const handleNodeEdited = () => {
            setIsEditing(false);
            setEditingNodeId(null);
        };

        // Handler for data changes (isEditing flag in node data)
        const handleNodeChange = ({ node, current }: {
            node: { id: string };
            current: { data?: { isEditing?: boolean } }
        }) => {
            const isNodeEditing = current?.data?.isEditing ?? false;
            if (isNodeEditing) {
                setIsEditing(true);
                setEditingNodeId(node.id);
            } else if (editingNodeId === node.id) {
                // Only clear if this was the node we were tracking
                setIsEditing(false);
                setEditingNodeId(null);
            }
        };

        // Listen to X6 editing events
        graph.on('node:editing', handleNodeEditing);
        graph.on('node:edited', handleNodeEdited);
        // Also listen for data changes (MindNode sets isEditing in data)
        graph.on('node:change:data', handleNodeChange);

        // Also check for any node data with isEditing: true on mount
        const nodes = graph.getNodes();
        for (const node of nodes) {
            const data = node.getData() || {};
            if (data.isEditing) {
                setIsEditing(true);
                setEditingNodeId(node.id);
                break;
            }
        }

        return () => {
            graph.off('node:editing', handleNodeEditing);
            graph.off('node:edited', handleNodeEdited);
            graph.off('node:change:data', handleNodeChange);
        };
    }, [graph, editingNodeId]);

    return {
        isEditing,
        editingNodeId,
    };
}
