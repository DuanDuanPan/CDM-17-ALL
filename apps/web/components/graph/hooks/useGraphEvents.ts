'use client';

import { useEffect } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { isDependencyEdge, validateDependencyEdge } from '@/lib/edgeValidation';
import { HIERARCHICAL_EDGE_ATTRS, HIERARCHICAL_EDGE_SELECTED_ATTRS } from '@/lib/edgeStyles';

export interface UseGraphEventsOptions {
    graph: Graph | null;
    isReady: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onNodeSelect?: (nodeId: string | null) => void;
    /** Callback when edge is selected */
    setSelectedEdge: (edge: Edge | null) => void;
    /** Whether dependency mode is active */
    isDependencyMode: boolean;
    /** Connection start node for dependency mode */
    connectionStartNode: Node | null;
    /** Context menu state setter for dependency edge */
    setContextMenu: (state: {
        visible: boolean;
        x: number;
        y: number;
        edge: Edge | null;
    }) => void;
    /** Node context menu state setter */
    setNodeContextMenu: (state: {
        visible: boolean;
        x: number;
        y: number;
        graphX: number;
        graphY: number;
        nodeId: string | null;
    }) => void;
    // Story 8.3: Double-click to center node
    /** Callback when node is double-clicked (AC4: center without zoom change) */
    onNodeDoubleClick?: (nodeId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseGraphEventsReturn {
    // Events are auto-registered, no return needed
}

/**
 * Hook to manage graph event handlers.
 *
 * Handles:
 * - Node selection/unselection
 * - Edge selection/unselection with highlight
 * - Blank click handling
 * - Context menu events
 * - Hover feedback for dependency creation
 */
export function useGraphEvents({
    graph,
    isReady,
    containerRef,
    onNodeSelect,
    setSelectedEdge,
    isDependencyMode,
    connectionStartNode,
    setContextMenu,
    setNodeContextMenu,
    onNodeDoubleClick,
}: UseGraphEventsOptions): UseGraphEventsReturn {
    useEffect(() => {
        if (!graph || !isReady) return;

        // Node selection events
        const handleNodeSelected = ({ node }: { node: Node }) => {
            const nodeData = node.getData() || {};
            node.setData({ ...nodeData, isSelected: true });
            onNodeSelect?.(node.id);

            if (!nodeData.isEditing) {
                containerRef.current?.focus();
            }
        };

        const handleNodeUnselected = ({ node }: { node: Node }) => {
            const nodeData = node.getData() || {};
            node.setData({ ...nodeData, isSelected: false });
        };

        const handleBlankClick = ({ e }: { e: MouseEvent }) => {
            if (e?.button !== 0) return;
            onNodeSelect?.(null);
            containerRef.current?.focus();
        };

        const handleNodeClick = ({ node, e }: { node: Node; e: MouseEvent }) => {
            const target = e?.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    (target as HTMLElement).isContentEditable)
            ) {
                return;
            }

            const nodeData = node.getData() || {};
            if (nodeData.isEditing) return;

            containerRef.current?.focus();
        };

        // Story 8.3 AC4: Double-click to center node (without changing zoom)
        // Skip if node is in editing state to avoid conflict with text editing
        const handleNodeDoubleClick = ({ node }: { node: Node }) => {
            const nodeData = node.getData() || {};
            if (nodeData.isEditing) return;

            if (onNodeDoubleClick) {
                onNodeDoubleClick(node.id);
            }
        };

        // Hover feedback for dependency creation
        const handleNodeMouseEnter = ({ node }: { node: Node }) => {
            if (!connectionStartNode || !isDependencyMode) return;
            if (connectionStartNode.id === node.id) return;

            const validation = validateDependencyEdge(graph, connectionStartNode.id, node.id);
            if (!validation.isValid && containerRef.current) {
                containerRef.current.style.cursor = 'not-allowed';
            }
        };

        const handleNodeMouseLeave = () => {
            if (containerRef.current) {
                containerRef.current.style.cursor = '';
            }
        };

        const handleBatchStop = (event: Event) => {
            const detail = (event as CustomEvent<{ nodeId?: string }>).detail;
            const nodeId = detail?.nodeId;
            if (!nodeId) return;

            const cell = graph.getCellById(nodeId);
            if (!cell || !cell.isNode()) return;

            const targetNode = cell as Node;
            const nodeData = targetNode.getData() || {};
            const batchId = nodeData._batchId;

            if (batchId) {
                graph.stopBatch(batchId);
                targetNode.setData({ ...nodeData, _batchId: undefined });
            }
        };

        // Edge selection events
        const handleEdgeSelected = ({ edge }: { edge: Edge }) => {
            setSelectedEdge(edge);
            onNodeSelect?.(null);

            if (!isDependencyEdge(edge)) {
                edge.setAttrs(HIERARCHICAL_EDGE_SELECTED_ATTRS);
            } else {
                edge.attr('line/stroke', '#feb663');
                edge.attr('line/strokeWidth', 3);
                edge.attr('line/filter', null);
            }
        };

        const handleEdgeUnselected = ({ edge }: { edge: Edge }) => {
            setSelectedEdge(null);

            const isDependency = isDependencyEdge(edge);
            if (isDependency) {
                edge.attr('line/stroke', '#9ca3af');
                edge.attr('line/strokeWidth', 1.5);
                edge.attr('line/filter', null);
            } else {
                edge.setAttrs(HIERARCHICAL_EDGE_ATTRS);
            }
        };

        // Edge context menu for dependency type change
        const handleEdgeContextMenu = ({ e, edge }: { e: MouseEvent; edge: Edge }) => {
            if (isDependencyEdge(edge)) {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    edge: edge,
                });
            }
        };

        // Blank area context menu for paste
        const handleBlankContextMenu = ({ e }: { e: MouseEvent }) => {
            e.preventDefault();
            e.stopPropagation();
            const graphPoint = graph.clientToLocal(e.clientX, e.clientY);
            setNodeContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                graphX: graphPoint.x,
                graphY: graphPoint.y,
                nodeId: null,
            });
        };

        // Node context menu for clipboard operations
        const handleNodeContextMenu = ({ e, node }: { e: MouseEvent; node: Node }) => {
            e.preventDefault();
            e.stopPropagation();
            if (!graph.isSelected(node)) {
                graph.unselect(graph.getSelectedCells());
                graph.select(node);
            }
            const graphPoint = graph.clientToLocal(e.clientX, e.clientY);
            setNodeContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                graphX: graphPoint.x,
                graphY: graphPoint.y,
                nodeId: node.id,
            });
        };

        const containerEl = containerRef.current;
        containerEl?.addEventListener('mindmap:batch-stop', handleBatchStop as EventListener);

        graph.on('node:selected', handleNodeSelected);
        graph.on('node:unselected', handleNodeUnselected);
        graph.on('blank:click', handleBlankClick);
        graph.on('node:click', handleNodeClick);
        graph.on('node:dblclick', handleNodeDoubleClick);
        graph.on('node:mouseenter', handleNodeMouseEnter);
        graph.on('node:mouseleave', handleNodeMouseLeave);
        graph.on('edge:selected', handleEdgeSelected);
        graph.on('edge:unselected', handleEdgeUnselected);
        graph.on('edge:contextmenu', handleEdgeContextMenu);
        graph.on('blank:contextmenu', handleBlankContextMenu);
        graph.on('node:contextmenu', handleNodeContextMenu);

        return () => {
            containerEl?.removeEventListener('mindmap:batch-stop', handleBatchStop as EventListener);
            if (graph && typeof graph.off === 'function') {
                graph.off('node:selected', handleNodeSelected);
                graph.off('node:unselected', handleNodeUnselected);
                graph.off('blank:click', handleBlankClick);
                graph.off('node:click', handleNodeClick);
                graph.off('node:dblclick', handleNodeDoubleClick);
                graph.off('node:mouseenter', handleNodeMouseEnter);
                graph.off('node:mouseleave', handleNodeMouseLeave);
                graph.off('edge:selected', handleEdgeSelected);
                graph.off('edge:unselected', handleEdgeUnselected);
                graph.off('edge:contextmenu', handleEdgeContextMenu);
                graph.off('blank:contextmenu', handleBlankContextMenu);
                graph.off('node:contextmenu', handleNodeContextMenu);
            }
        };
    }, [graph, isReady, onNodeSelect, connectionStartNode, isDependencyMode, setSelectedEdge, setContextMenu, setNodeContextMenu, containerRef, onNodeDoubleClick]);

    return {};
}
