'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Hook for copy/cut/paste operations on selected nodes.
 * Uses Yjs for undo support and system clipboard for cross-graph paste.
 *
 * Story 7.4: Refactored - handlers extracted to clipboard/ directory.
 */

import { useCallback, useRef } from 'react';
import type { Node, Graph } from '@antv/x6';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';
import { useConfirmDialog } from '@cdm/ui';
import { parseClipboardData, type ClipboardData } from '@cdm/types';

// Story 7.4: Import extracted handlers
import {
    serializeSelection as serializeSelectionFn,
    pasteFromClipboard,
    cutToClipboard,
    softDeleteNodes,
    hardDeleteNodes,
} from './clipboard';

export interface UseClipboardOptions {
    /** The X6 Graph instance */
    graph: Graph | null;
    /** Current graph ID (for cross-graph paste detection) */
    graphId: string;
    /** Yjs document for collaborative operations */
    yDoc: Y.Doc | null;
    /** Yjs UndoManager for undo support (AC4.2) */
    undoManager?: UndoManager | null;
    /** Currently selected nodes */
    selectedNodes: Node[];
    /** Function to select nodes after paste */
    selectNodes: (nodeIds: string[]) => void;
    /** Function to clear selection */
    clearSelection: () => void;
}

export interface UseClipboardReturn {
    /** Copy selected nodes to system clipboard (AC2.1-AC2.3) */
    copy: () => Promise<void>;
    /** Cut selected nodes (Copy + Delete with undo support) (AC4.1-AC4.2) */
    cut: () => Promise<void>;
    /** Paste from clipboard (AC3.1-AC3.5) */
    paste: (position?: { x: number; y: number }) => Promise<void>;
    /** Check if clipboard has valid paste data */
    canPaste: () => Promise<boolean>;
    /** Soft delete (archive) selected nodes and all their descendants (Story 2.6) */
    deleteNodes: () => void;
    /** Permanently delete selected nodes and all their descendants (Story 2.7) */
    hardDeleteNodes: () => void;
}

/**
 * Hook for clipboard operations (copy/cut/paste) on graph nodes.
 *
 * Features:
 * - Copies selected nodes and internal edges to system clipboard (AC2.2)
 * - Pastes with new IDs to avoid conflicts (AC3.2)
 * - Preserves relative positions and hierarchy (AC3.3)
 * - Cut operation is undoable via Yjs (AC4.2)
 * - Cross-graph paste support (AC3.5)
 *
 * @example
 * ```tsx
 * const { selectedNodes, selectNodes, clearSelection } = useSelection({ graph });
 * const { copy, cut, paste } = useClipboard({
 *   graph,
 *   graphId: 'my-graph',
 *   yDoc,
 *   selectedNodes,
 *   selectNodes,
 *   clearSelection,
 * });
 *
 * // Copy selected nodes
 * await copy();
 *
 * // Paste at cursor position
 * await paste({ x: 100, y: 100 });
 * ```
 */
export function useClipboard({
    graph,
    graphId,
    yDoc,
    undoManager,
    selectedNodes,
    selectNodes,
    clearSelection,
}: UseClipboardOptions): UseClipboardReturn {
    // Ref for graph to avoid stale closures
    const graphRef = useRef<Graph | null>(null);
    graphRef.current = graph;

    const { showConfirm } = useConfirmDialog();

    /**
     * Serialize selected nodes using extracted function.
     */
    const serializeSelection = useCallback((): ClipboardData | null => {
        if (!graphRef.current || selectedNodes.length === 0) return null;
        return serializeSelectionFn({
            graph: graphRef.current,
            selectedNodes,
            graphId,
        });
    }, [selectedNodes, graphId]);

    /**
     * Copy selected nodes to system clipboard.
     * AC2.1: Cmd+C copies node data structure
     * AC2.3: Content is JSON with format version
     */
    const copy = useCallback(async () => {
        const data = serializeSelection();
        if (!data) {
            toast.warning('没有选中任何节点');
            return;
        }

        try {
            const payload: ClipboardData = { ...data, operation: 'copy' };
            const jsonStr = JSON.stringify(payload);
            await navigator.clipboard.writeText(jsonStr);
            toast.success(`已复制 ${payload.nodes.length} 个节点`);
        } catch (err) {
            console.error('[Clipboard] Copy failed:', err);
            toast.error('复制失败，请检查剪贴板权限');
        }
    }, [serializeSelection]);

    /**
     * Cut = Copy + Soft Delete (Archive)
     */
    const cut = useCallback(async () => {
        if (!graphRef.current || !yDoc) return;
        await cutToClipboard({
            graph: graphRef.current,
            yDoc,
            undoManager,
            selectedNodes,
            clearSelection,
            serializeSelection,
        });
    }, [yDoc, undoManager, selectedNodes, clearSelection, serializeSelection]);

    /**
     * Paste from clipboard.
     */
    const paste = useCallback(
        async (position?: { x: number; y: number }) => {
            if (!graphRef.current || !yDoc) return;
            await pasteFromClipboard({
                graph: graphRef.current,
                graphId,
                yDoc,
                undoManager,
                selectedNodes,
                selectNodes,
                position,
            });
        },
        [yDoc, undoManager, graphId, selectNodes, selectedNodes]
    );

    /**
     * Check if clipboard has valid paste data.
     */
    const canPaste = useCallback(async (): Promise<boolean> => {
        try {
            const text = await navigator.clipboard.readText();
            const data = parseClipboardData(text);
            return data !== null;
        } catch {
            return false;
        }
    }, []);

    /**
     * Soft delete selected nodes and all their descendants.
     */
    const deleteNodes = useCallback(() => {
        if (!graphRef.current || !yDoc || selectedNodes.length === 0) return;
        softDeleteNodes({
            graph: graphRef.current,
            yDoc,
            undoManager,
            selectedNodes,
            clearSelection,
        });
    }, [yDoc, undoManager, selectedNodes, clearSelection]);

    /**
     * Permanently delete selected nodes and all their descendants.
     */
    const hardDeleteNodesFn = useCallback(() => {
        if (!graphRef.current || !yDoc || selectedNodes.length === 0) return;
        hardDeleteNodes({
            graph: graphRef.current,
            yDoc,
            selectedNodes,
            clearSelection,
            showConfirm,
        });
    }, [yDoc, selectedNodes, clearSelection, showConfirm]);

    return {
        copy,
        cut,
        paste,
        canPaste,
        deleteNodes,
        hardDeleteNodes: hardDeleteNodesFn,
    };
}
