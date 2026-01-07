'use client';

import { useEffect, useCallback } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { AddChildCommand, AddSiblingCommand, NavigationCommand } from '@cdm/plugin-mindmap-core';

// Commands are singletons per module
const addChildCommand = new AddChildCommand();
const addSiblingCommand = new AddSiblingCommand();
const navigationCommand = new NavigationCommand();

export interface UseGraphHotkeysOptions {
    graph: Graph | null;
    isReady: boolean;
    /** Currently selected edge for deletion */
    selectedEdge: Edge | null;
    setSelectedEdge: (edge: Edge | null) => void;
    /** Connection start node for dependency mode */
    connectionStartNode: Node | null;
    setConnectionStartNode: (node: Node | null) => void;
    /** Whether dependency mode is active */
    isDependencyMode: boolean;
    /** Callback to exit dependency mode */
    onExitDependencyMode?: () => void;
    /** Remove dependency edge helper */
    removeEdge: (graph: Graph, edge: Edge) => void;
    // Story 8.1: Collapse/expand handlers
    /** Collapse a node */
    onCollapseNode?: (nodeId: string) => void;
    /** Expand a node */
    onExpandNode?: (nodeId: string) => void;
    /** Recursively collapse all descendants */
    onCollapseDescendants?: (nodeId: string) => void;
    // Story 8.2: Minimap toggle
    /** Toggle minimap visibility */
    onToggleMinimap?: () => void;
    // Story 8.3: Zoom shortcuts
    /** Fit all nodes to screen (Cmd/Ctrl + 0) */
    onZoomToFit?: () => void;
    /** Reset zoom to 100% (Cmd/Ctrl + 1) */
    onZoomTo100?: () => void;
}

export interface UseGraphHotkeysReturn {
    /** Keyboard event handler for the container */
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Hook to handle keyboard shortcuts in the graph component.
 *
 * Handles:
 * - Undo/Redo (Ctrl+Z, Ctrl+Y)
 * - Node creation (Tab, Enter)
 * - Node navigation (Arrow keys)
 * - Edit mode (Space)
 * - Edge deletion (Delete/Backspace)
 * - Escape to exit modes
 * - Story 8.1: Collapse/expand (Cmd+[, Cmd+], Cmd+Alt+[)
 * - Story 8.2: Minimap toggle (M)
 * - Story 8.3: Zoom shortcuts (Cmd+0, Cmd+1, Alt+0, Alt+1)
 */
export function useGraphHotkeys({
    graph,
    isReady,
    selectedEdge,
    setSelectedEdge,
    connectionStartNode,
    setConnectionStartNode,
    isDependencyMode,
    onExitDependencyMode,
    removeEdge,
    // Story 8.1: Collapse/expand
    onCollapseNode,
    onExpandNode,
    onCollapseDescendants,
    // Story 8.2: Minimap toggle
    onToggleMinimap,
    // Story 8.3: Zoom shortcuts
    onZoomToFit,
    onZoomTo100,
}: UseGraphHotkeysOptions): UseGraphHotkeysReturn {
    // Global Space-to-edit: allow editing even when graph container isn't focused
    useEffect(() => {
        if (!graph || !isReady) return;

        const handleGlobalSpace = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            if (!(e.key === ' ' || e.code === 'Space')) return;

            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }

            const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
            if (selectedNodes.length !== 1) return;

            const node = selectedNodes[0] as Node;
            const nodeData = node.getData() || {};
            if (nodeData.isEditing) return;

            e.preventDefault();
            e.stopPropagation();
            node.setData({ ...nodeData, isEditing: true });
        };

        window.addEventListener('keydown', handleGlobalSpace);
        return () => {
            window.removeEventListener('keydown', handleGlobalSpace);
        };
    }, [graph, isReady]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!graph || !isReady) return;

            // Undo: Ctrl+Z (or Cmd+Z on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (graph.canUndo()) {
                    graph.undo();
                }
                return;
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
                e.preventDefault();
                e.stopPropagation();
                if (graph.canRedo()) {
                    graph.redo();
                }
                return;
            }

            // Story 8.3: Zoom shortcuts (must check before single-node selection)
            // Input protection: don't trigger in input/textarea/select/contentEditable
            const target = e.target as HTMLElement | null;
            const isInputFocused = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            );

            // Cmd/Ctrl + 0 OR Alt + 0 OR Numpad0 variants : Fit to screen (AC2)
            // Use e.code for reliable detection across keyboard layouts
            if (!isInputFocused && (
                ((e.metaKey || e.ctrlKey) && !e.altKey && (e.code === 'Digit0' || e.code === 'Numpad0')) ||
                (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === 'Digit0' || e.code === 'Numpad0'))
            )) {
                e.preventDefault();
                e.stopPropagation();
                onZoomToFit?.();
                return;
            }

            // Cmd/Ctrl + 1 OR Alt + 1 OR Numpad1 variants : Reset to 100% (AC3)
            if (!isInputFocused && (
                ((e.metaKey || e.ctrlKey) && !e.altKey && (e.code === 'Digit1' || e.code === 'Numpad1')) ||
                (e.altKey && !e.metaKey && !e.ctrlKey && (e.code === 'Digit1' || e.code === 'Numpad1'))
            )) {
                e.preventDefault();
                e.stopPropagation();
                onZoomTo100?.();
                return;
            }

            // Story 8.1: Collapse shortcuts (must check before single-node selection)
            // Cmd/Ctrl + Alt + [ : Recursive collapse all descendants
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === '[') {
                e.preventDefault();
                e.stopPropagation();
                const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
                if (selectedNodes.length === 1 && onCollapseDescendants) {
                    onCollapseDescendants(selectedNodes[0].id);
                }
                return;
            }

            // Cmd/Ctrl + [ : Collapse current node
            if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key === '[') {
                e.preventDefault();
                e.stopPropagation();
                const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
                if (selectedNodes.length === 1 && onCollapseNode) {
                    onCollapseNode(selectedNodes[0].id);
                }
                return;
            }

            // Cmd/Ctrl + ] : Expand current node
            if ((e.metaKey || e.ctrlKey) && e.key === ']') {
                e.preventDefault();
                e.stopPropagation();
                const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
                if (selectedNodes.length === 1 && onExpandNode) {
                    onExpandNode(selectedNodes[0].id);
                }
                return;
            }

            // ESC to exit dependency mode or cancel connection
            if (e.key === 'Escape') {
                if (connectionStartNode) {
                    connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
                    setConnectionStartNode(null);
                    e.preventDefault();
                    return;
                }
                if (isDependencyMode && onExitDependencyMode) {
                    onExitDependencyMode();
                    e.preventDefault();
                    return;
                }
            }

            // Story 8.2: M key to toggle minimap (AC: #1)
            if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && onToggleMinimap) {
                const target = e.target as HTMLElement | null;
                // Don't trigger when typing in inputs or contentEditable
                if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
                    return;
                }
                e.preventDefault();
                onToggleMinimap();
                return;
            }

            // Handle edge deletion with Delete/Backspace
            if (selectedEdge && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                e.stopPropagation();
                removeEdge(graph, selectedEdge);
                setSelectedEdge(null);
                return;
            }

            // Get selected nodes
            const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
            if (selectedNodes.length !== 1) return;

            const node = selectedNodes[0] as Node;
            const nodeData = node.getData() || {};

            // If node is in edit mode, don't handle shortcuts (except Escape)
            if (nodeData.isEditing) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    node.setData({ ...nodeData, isEditing: false });
                }
                return;
            }

            // Handle keyboard shortcuts
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    e.stopPropagation();
                    createChildNode(graph, node);
                    break;

                case 'Enter':
                    e.preventDefault();
                    e.stopPropagation();
                    createSiblingOrChildNode(graph, node);
                    break;

                case ' ': // Space
                    e.preventDefault();
                    e.stopPropagation();
                    node.setData({ ...nodeData, isEditing: true });
                    break;

                // Arrow key navigation
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToPrevSibling(graph, node);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToNextSibling(graph, node);
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToParent(graph, node);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToFirstChild(graph, node);
                    break;
            }
        },
        [graph, isReady, selectedEdge, connectionStartNode, isDependencyMode, onExitDependencyMode, removeEdge, setSelectedEdge, setConnectionStartNode, onCollapseNode, onExpandNode, onCollapseDescendants, onToggleMinimap, onZoomToFit, onZoomTo100]
    );

    return { handleKeyDown };
}

// Helper functions (local to module)

function createChildNode(graph: Graph, parentNode: Node): void {
    const batchId = `create-node-${Date.now()}`;
    graph.startBatch(batchId);

    const newNode = addChildCommand.execute(graph, parentNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        newNode.setData({ ...newNode.getData(), _batchId: batchId });
        graph.unselect(graph.getSelectedCells());
        graph.select(newNode);
    } else {
        graph.stopBatch(batchId);
    }
}

function createSiblingOrChildNode(graph: Graph, selectedNode: Node): void {
    const batchId = `create-node-${Date.now()}`;
    graph.startBatch(batchId);

    const newNode = addSiblingCommand.execute(graph, selectedNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        newNode.setData({ ...newNode.getData(), _batchId: batchId });
        graph.unselect(graph.getSelectedCells());
        graph.select(newNode);
    } else {
        graph.stopBatch(batchId);
    }
}

function ensureNodeTimestamps(node: Node): void {
    const data = node.getData() || {};
    if (data.createdAt && data.updatedAt) return;

    const now = new Date().toISOString();
    const createdAt = data.createdAt ?? now;
    const updatedAt = data.updatedAt ?? createdAt;
    node.setData({ ...data, createdAt, updatedAt });
}

function navigateToPrevSibling(graph: Graph, currentNode: Node): void {
    const prevSibling = navigationCommand.navigateUp(graph, currentNode);
    if (prevSibling) {
        graph.unselect(graph.getSelectedCells());
        graph.select(prevSibling);
    }
}

function navigateToNextSibling(graph: Graph, currentNode: Node): void {
    const nextSibling = navigationCommand.navigateDown(graph, currentNode);
    if (nextSibling) {
        graph.unselect(graph.getSelectedCells());
        graph.select(nextSibling);
    }
}

function navigateToParent(graph: Graph, currentNode: Node): void {
    const parent = navigationCommand.navigateLeft(graph, currentNode);
    if (parent) {
        graph.unselect(graph.getSelectedCells());
        graph.select(parent);
    }
}

function navigateToFirstChild(graph: Graph, currentNode: Node): void {
    const firstChild = navigationCommand.navigateRight(graph, currentNode);
    if (firstChild) {
        graph.unselect(graph.getSelectedCells());
        graph.select(firstChild);
    }
}
