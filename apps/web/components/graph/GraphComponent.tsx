'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGraph, addCenterNode } from '@/hooks/useGraph';
import { useMindmapPlugin } from '@/hooks/useMindmapPlugin';
import { useLayoutPlugin } from '@/hooks/useLayoutPlugin';
import { Graph, Node, Edge } from '@antv/x6';
import { AddChildCommand, AddSiblingCommand, RemoveNodeCommand, NavigationCommand } from '@cdm/plugin-mindmap-core';
import { LayoutMode } from '@cdm/types';

// Story 1.4: Collaboration imports
import type { CollabUser, UseCollaborationReturn } from '@/hooks/useCollaboration';
import { graphSyncManager } from '@/features/collab/GraphSyncManager';
import { RemoteCursorsOverlay } from '@/components/collab/RemoteCursor';
// Story 1.4 MED-12: Use Context to report remote users
import { useCollaborationUIOptional } from '@/contexts';
// Story 1.4 LOW-1: Use centralized constants
import { CURSOR_UPDATE_THROTTLE_MS, DEFAULT_CREATOR_NAME } from '@/lib/constants';
// Story 2.2: Edge validation utilities
import { isDependencyEdge, validateDependencyEdge, isTaskNode, getEdgeMetadata } from '@/lib/edgeValidation';
import { NodeType, DependencyType } from '@cdm/types';
import { useToast } from '@cdm/ui';
// Story 2.6: Multi-Select & Clipboard
import { useSelection } from '@/hooks/useSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { useClipboardShortcuts } from '@/hooks/useClipboardShortcuts';
import { useEditingState } from '@/hooks/useEditingState';
import { ClipboardToolbar } from '@/components/toolbar/ClipboardToolbar';

// Story 2.2: Dependency type options for context menu
const DEPENDENCY_TYPES: { value: DependencyType; label: string; description: string }[] = [
    { value: 'FS', label: 'FS', description: '完成-开始 (Finish-to-Start)' },
    { value: 'SS', label: 'SS', description: '开始-开始 (Start-to-Start)' },
    { value: 'FF', label: 'FF', description: '完成-完成 (Finish-to-Finish)' },
    { value: 'SF', label: 'SF', description: '开始-完成 (Start-to-Finish)' },
];

export interface GraphComponentProps {
    onNodeSelect?: (nodeId: string | null) => void;
    onLayoutChange?: (mode: LayoutMode) => void;
    onGridToggle?: (enabled: boolean) => void;
    currentLayout?: LayoutMode;
    gridEnabled?: boolean;
    onGraphReady?: (graph: Graph | null) => void;
    /** Collaboration session (shared across views) */
    collaboration?: Pick<
        UseCollaborationReturn,
        | 'yDoc'
        | 'isConnected'
        | 'isSynced'
        | 'syncStatus'
        | 'remoteUsers'
        | 'updateCursor'
        | 'updateSelectedNode'
    >;
    // Story 1.4: Collaboration props
    /** Graph ID for collaboration (enables collab if provided) */
    graphId?: string;
    /** Current user info for collaboration */
    user?: CollabUser;
    // Story 2.2: Dependency mode props
    /** Whether dependency mode is active for edge creation */
    isDependencyMode?: boolean;
    /** Callback when dependency mode should be exited (e.g., ESC key) */
    onExitDependencyMode?: () => void;
}

export function GraphComponent({
    onNodeSelect,
    onLayoutChange,
    onGridToggle,
    currentLayout = 'mindmap',
    onGraphReady,
    collaboration,
    // Story 1.4: Collaboration props with defaults
    graphId = 'default-graph',
    user = { id: 'anonymous', name: '匿名用户', color: '#6366f1' },
    // Story 2.2: Dependency mode props
    isDependencyMode = false,
    onExitDependencyMode,
}: GraphComponentProps) {
    // Story 1.4 MED-12: Get context to report remote users
    const collabUIContext = useCollaborationUIOptional();
    const { addToast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    // Story 1.4: Canvas transform state for cursor rendering
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [hasInitializedGraphState, setHasInitializedGraphState] = useState(false);

    // Story 2.2: Track selected edge for deletion
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

    // Story 2.2: Track connection start node for dependency edge creation
    const [connectionStartNode, setConnectionStartNode] = useState<Node | null>(null);

    // Story 2.2: Context menu state for dependency type change
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        edge: Edge | null;
    }>({ visible: false, x: 0, y: 0, edge: null });

    // Story 2.6: Node context menu state for clipboard operations
    const [nodeContextMenu, setNodeContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        graphX: number; // Graph coordinates for paste position
        graphY: number;
    }>({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });

    // Story 1.4 HIGH-3: Throttle cursor updates to prevent WebSocket flooding
    const lastCursorUpdateTime = useRef<number>(0);

    // Set container after mount
    useEffect(() => {
        if (containerRef.current) {
            setContainer(containerRef.current);
        }
    }, []);

    const { graph, isReady } = useGraph({ container });
    const creatorName = user?.name || DEFAULT_CREATOR_NAME;

    useEffect(() => {
        if (!onGraphReady) return;
        onGraphReady(graph);
        return () => {
            onGraphReady(null);
        };
    }, [graph, onGraphReady]);

    // Initialize mindmap plugin (registers React shape)
    useMindmapPlugin(graph, isReady);

    // Initialize layout plugin
    const { gridEnabled } = useLayoutPlugin(graph, isReady, currentLayout ?? 'mindmap');

    useEffect(() => {
        onGridToggle?.(gridEnabled);
    }, [gridEnabled, onGridToggle]);

    // Story 2.6: Multi-Select & Clipboard hooks
    const {
        selectedNodes,
        selectedNodeIds,
        hasSelection,
        selectNodes,
        clearSelection,
    } = useSelection({ graph });

    const { isEditing } = useEditingState({ graph });

    // Collaboration session (shared across views) or local fallback
    const fallbackCollab = {
        yDoc: null,
        isConnected: false,
        isSynced: false,
        syncStatus: 'idle',
        remoteUsers: [],
        updateCursor: (_x: number, _y: number) => { },
        updateSelectedNode: (_nodeId: string | null) => { },
    } as const;

    const {
        yDoc,
        isConnected,
        remoteUsers,
        updateCursor,
        updateSelectedNode,
        isSynced,
        syncStatus,
    } = collaboration ?? fallbackCollab;

    // Story 2.6: Clipboard operations (depends on yDoc for undo support)
    // Story 2.7: Added hardDeleteNodes for permanent deletion
    const { copy, cut, paste, deleteNodes, hardDeleteNodes } = useClipboard({
        graph,
        graphId,
        yDoc,
        undoManager: null, // TODO: Get from collaboration when available
        selectedNodes,
        selectNodes,
        clearSelection,
    });

    // Story 2.6: Register clipboard keyboard shortcuts
    // Story 2.7: Added hardDeleteNodes for Shift+Delete shortcut
    useClipboardShortcuts({
        copy,
        cut,
        paste,
        deleteNodes,
        hardDeleteNodes,
        hasSelection,
        isEditing,
        enabled: isReady,
    });

    // Reset init flag when switching graphs
    useEffect(() => {
        setHasInitializedGraphState(false);
    }, [graphId]);

    // Story 1.4 MED-12: Report remote users to context (for TopBar)
    // Use ref to track previous value and avoid infinite loop
    const prevRemoteUsersRef = useRef<typeof remoteUsers>([]);

    useEffect(() => {
        if (!collabUIContext?.setRemoteUsers) return;

        // Only update if the array actually changed (deep comparison by ID)
        const hasChanged = remoteUsers.length !== prevRemoteUsersRef.current.length ||
            remoteUsers.some((user, index) =>
                user.id !== prevRemoteUsersRef.current[index]?.id ||
                user.name !== prevRemoteUsersRef.current[index]?.name ||
                user.color !== prevRemoteUsersRef.current[index]?.color
            );

        if (hasChanged) {
            prevRemoteUsersRef.current = remoteUsers;
            collabUIContext.setRemoteUsers([...remoteUsers]);
        }
    }, [remoteUsers, collabUIContext]);

    // Story 1.4: Initialize GraphSyncManager when yDoc is available
    useEffect(() => {
        if (!isReady || !graph || !yDoc) return;

        graphSyncManager.initialize(graph, yDoc, (mode) => {
            onLayoutChange?.(mode);
        });

        return () => {
            graphSyncManager.destroy();
        };
    }, [isReady, graph, yDoc, onLayoutChange]);

    // Story 1.4: Track canvas transform for cursor rendering
    useEffect(() => {
        if (!graph || !isReady) return;

        const updateTransform = () => {
            const translate = graph.translate();
            const currentScale = graph.zoom();
            setCanvasOffset({ x: translate.tx, y: translate.ty });
            setScale(currentScale);
        };

        graph.on('translate', updateTransform);
        graph.on('scale', updateTransform);

        return () => {
            graph.off('translate', updateTransform);
            graph.off('scale', updateTransform);
        };
    }, [graph, isReady]);

    // Story 1.4: Track mouse movement for cursor awareness (with HIGH-3 throttling)
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!graph || !isConnected) return;

            // HIGH-3: Throttle cursor updates to 50ms to prevent WebSocket flooding
            const now = Date.now();
            if (now - lastCursorUpdateTime.current < CURSOR_UPDATE_THROTTLE_MS) {
                return;
            }
            lastCursorUpdateTime.current = now;

            const point = graph.clientToLocal(e.clientX, e.clientY);
            updateCursor(point.x, point.y);
        },
        [graph, isConnected, updateCursor]
    );

    // Story 1.4: Update selected node in awareness
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

    // Initialize graph content after collaboration sync (or fallback to local)
    // MED-1: Simplified with early returns for clarity
    useEffect(() => {
        // Guard: wait for graph to be ready
        if (!graph || !isReady) return;

        // Guard: skip if already initialized
        if (hasInitializedGraphState) return;

        // Guard: if graph already has nodes (e.g., restored from state), mark as initialized
        if (graph.getNodes().length > 0) {
            setHasInitializedGraphState(true);
            return;
        }

        // Collaboration mode: wait for Yjs sync before initializing
        const isCollabMode = Boolean(graphId && yDoc);
        if (isCollabMode && !isSynced) return;

        // Initialize content
        if (isCollabMode && yDoc) {
            const yNodes = yDoc.getMap('nodes');
            if (yNodes.size > 0) {
                graphSyncManager.loadInitialState();
            } else {
                addCenterNode(graph, creatorName);
            }
        } else {
            // Non-collaboration mode: add default center node
            addCenterNode(graph, creatorName);
        }

        setHasInitializedGraphState(true);
    }, [graph, isReady, graphId, yDoc, isSynced, hasInitializedGraphState]);

    // Story 1.4: Sync layout mode changes to Yjs for collaboration
    useEffect(() => {
        if (!isConnected || !yDoc) return;

        // When currentLayout changes locally, sync to Yjs so other users receive the update
        graphSyncManager.setLayoutMode(currentLayout);
    }, [currentLayout, isConnected, yDoc]);

    // Story 2.2: Clear connection start node when exiting dependency mode
    useEffect(() => {
        if (!isDependencyMode) {
            setConnectionStartNode(null);
        }
    }, [isDependencyMode]);

    // Story 2.2: Handle node clicks for dependency edge creation
    useEffect(() => {
        if (!graph || !isReady || !isDependencyMode) return;

        const handleNodeClickForDependency = ({ node }: { node: Node }) => {
            // Only allow TASK nodes for dependency edges
            if (!isTaskNode(node)) {
                console.warn('依赖连线只能连接任务节点');
                return;
            }

            if (!connectionStartNode) {
                // First click: set start node
                setConnectionStartNode(node);
                // Add visual indicator to the node
                node.setData({ ...node.getData(), isConnectionSource: true });
            } else {
                // Second click: create edge
                if (connectionStartNode.id !== node.id) {
                    // Validate the edge
                    const validation = validateDependencyEdge(graph, connectionStartNode.id, node.id);
                    if (validation.isValid) {
                        // Create the dependency edge
                        createDependencyEdge(graph, connectionStartNode, node);
                    } else {
                        console.warn('无法创建依赖边:', validation.errorMessage);
                        addToast({
                            type: 'error',
                            title: '检测到循环依赖',
                            description: validation.errorMessage || '未知错误',
                        });
                    }
                }
                // Clear the visual indicator and reset
                connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
                setConnectionStartNode(null);
            }
        };

        graph.on('node:click', handleNodeClickForDependency);

        return () => {
            graph.off('node:click', handleNodeClickForDependency);
            // Clear visual indicator on cleanup
            if (connectionStartNode) {
                connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
            }
        };
    }, [graph, isReady, isDependencyMode, connectionStartNode]);


    // Keyboard event handler - must be at container level to intercept Tab
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

            // Story 2.2: ESC to exit dependency mode or cancel connection
            if (e.key === 'Escape') {
                if (connectionStartNode) {
                    // Cancel current connection
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

            // Story 2.2: Handle edge deletion with Delete/Backspace
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

                // Story 2.7: Delete/Backspace is now handled by useClipboardShortcuts
                // to properly support both archive (Delete) and hard delete (Shift+Delete)
                // See useClipboardShortcuts for the unified delete handling

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
        [graph, isReady, selectedEdge, connectionStartNode, isDependencyMode, onExitDependencyMode]
    );

    // Story 2.2: Handler to change dependency type
    const handleDependencyTypeChange = useCallback(
        (newType: DependencyType) => {
            if (!contextMenu.edge || !graph) return;

            const edge = contextMenu.edge;
            const currentData = edge.getData() || {};
            const currentMetadata = currentData.metadata || { kind: 'dependency' };

            // Update edge data with new dependency type
            const newMetadata = {
                ...currentMetadata,
                dependencyType: newType,
            };
            edge.setData({
                ...currentData,
                metadata: newMetadata,
            });

            // Update edge connector and attrs for dependency edges
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
                        stroke: '#cbd5e1', // Slate-300, lighter than before
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

            // Update edge label to show new type
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

            // Close context menu
            setContextMenu({ visible: false, x: 0, y: 0, edge: null });
        },
        [contextMenu.edge, graph]
    );

    // Story 2.2: Close context menu when clicking outside
    const handleCloseContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, edge: null });
    }, []);

    // Setup event handlers and add center node when graph is ready
    useEffect(() => {
        if (graph && isReady) {
            // Event handlers
            const handleNodeSelected = ({ node }: { node: Node }) => {
                // Update node data to reflect selected state
                const nodeData = node.getData() || {};
                node.setData({ ...nodeData, isSelected: true });
                onNodeSelect?.(node.id);

                // Keep focus on graph container for keyboard shortcuts, unless we are entering edit mode
                if (!nodeData.isEditing) {
                    containerRef.current?.focus();
                }
            };

            const handleNodeUnselected = ({ node }: { node: Node }) => {
                // Update node data to reflect unselected state
                const nodeData = node.getData() || {};
                node.setData({ ...nodeData, isSelected: false });
            };

            const handleBlankClick = () => {
                onNodeSelect?.(null);
                // Keep focus on graph container
                containerRef.current?.focus();
            };

            // Handle node click to ensure focus stays on container
            const handleNodeClick = ({ node, e }: { node: Node; e: MouseEvent }) => {
                // Don't steal focus from the in-node input while editing.
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

            // Story 2.2: Hover feedback for dependency creation
            const handleNodeMouseEnter = ({ node }: { node: Node }) => {
                if (!connectionStartNode || !isDependencyMode) return;

                // Don't validate against self (handled elsewhere or implied)
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

            // Handle node operations dispatched from MindNode while editing (Tab/Enter).
            const handleMindmapNodeOperation = (event: Event) => {
                const detail = (event as CustomEvent<{ action?: string; nodeId?: string }>).detail;
                const action = detail?.action;
                const nodeId = detail?.nodeId;
                if (!action || !nodeId) return;

                const cell = graph.getCellById(nodeId);
                if (!cell || !cell.isNode()) return;

                const targetNode = cell as Node;
                if (action === 'addChild') {
                    createChildNode(graph, targetNode);
                } else if (action === 'addSibling') {
                    createSiblingOrChildNode(graph, targetNode);
                }
            };

            // Handle batch-stop event from MindNode when editing is complete
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
                    // Stop the batch to finalize the undo group
                    graph.stopBatch(batchId);
                    // Clear the batchId from node data
                    targetNode.setData({ ...nodeData, _batchId: undefined });
                }
            };

            const containerEl = containerRef.current;
            containerEl?.addEventListener(
                'mindmap:node-operation',
                handleMindmapNodeOperation as EventListener
            );
            containerEl?.addEventListener(
                'mindmap:batch-stop',
                handleBatchStop as EventListener
            );

            // Setup node selection events
            graph.on('node:selected', handleNodeSelected);
            graph.on('node:unselected', handleNodeUnselected);
            graph.on('blank:click', handleBlankClick);
            graph.on('node:click', handleNodeClick);
            graph.on('node:mouseenter', handleNodeMouseEnter);
            graph.on('node:mouseleave', handleNodeMouseLeave);

            // Story 2.2: Edge selection events for dependency edge management
            // Story 2.2: Edge selection events for dependency edge management
            const handleEdgeSelected = ({ edge }: { edge: Edge }) => {
                setSelectedEdge(edge);
                // Clear node selection when edge is selected
                onNodeSelect?.(null);

                // Apply highlight style
                edge.attr('line/stroke', '#feb663'); // Amber-400 highlight
                edge.attr('line/strokeWidth', 3);
                edge.attr('line/filter', {
                    name: 'dropShadow',
                    args: { dx: 0, dy: 0, blur: 4, color: '#feb663' }
                });
            };

            const handleEdgeUnselected = ({ edge }: { edge: Edge }) => {
                setSelectedEdge(null);

                // Revert style based on edge type
                const isDependency = isDependencyEdge(edge);
                if (isDependency) {
                    edge.attr('line/stroke', '#9ca3af'); // Revert to gray
                    edge.attr('line/strokeWidth', 2); // Revert width
                } else {
                    edge.attr('line/stroke', '#3b82f6'); // Revert to blue
                    edge.attr('line/strokeWidth', 2);
                }
                // Remove filter
                edge.attr('line/filter', null);
            };

            // Story 2.2: Edge context menu for dependency type change
            const handleEdgeContextMenu = ({ e, edge }: { e: MouseEvent; edge: Edge }) => {
                // Only show context menu for dependency edges
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

            graph.on('edge:selected', handleEdgeSelected);
            graph.on('edge:unselected', handleEdgeUnselected);
            graph.on('edge:contextmenu', handleEdgeContextMenu);

            // Story 2.6: Blank area context menu for paste at position
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
                });
            };

            // Story 2.6: Node context menu for clipboard operations
            const handleNodeContextMenu = ({ e, node }: { e: MouseEvent; node: Node }) => {
                e.preventDefault();
                e.stopPropagation();
                // Select the node if not already selected
                if (!graph.isSelected(node)) {
                    graph.select(node);
                }
                const graphPoint = graph.clientToLocal(e.clientX, e.clientY);
                setNodeContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    graphX: graphPoint.x,
                    graphY: graphPoint.y,
                });
            };

            graph.on('blank:contextmenu', handleBlankContextMenu);
            graph.on('node:contextmenu', handleNodeContextMenu);

            // Cleanup function to remove event listeners
            return () => {
                containerEl?.removeEventListener(
                    'mindmap:node-operation',
                    handleMindmapNodeOperation as EventListener
                );
                containerEl?.removeEventListener(
                    'mindmap:batch-stop',
                    handleBatchStop as EventListener
                );
                if (graph && typeof graph.off === 'function') {
                    graph.off('node:selected', handleNodeSelected);
                    graph.off('node:unselected', handleNodeUnselected);
                    graph.off('blank:click', handleBlankClick);
                    graph.off('node:click', handleNodeClick);
                    graph.off('node:mouseenter', handleNodeMouseEnter);
                    graph.off('node:mouseleave', handleNodeMouseLeave);
                    // Story 2.2: Cleanup edge events
                    graph.off('edge:selected', handleEdgeSelected);
                    graph.off('edge:unselected', handleEdgeUnselected);
                    graph.off('edge:contextmenu', handleEdgeContextMenu);
                    // Story 2.6: Cleanup context menu events
                    graph.off('blank:contextmenu', handleBlankContextMenu);
                    graph.off('node:contextmenu', handleNodeContextMenu);
                }
            };
        }
    }, [graph, isReady, onNodeSelect]);

    return (
        <div className="relative w-full h-full">
            {/* Graph Canvas */}
            <div
                id="graph-container"
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '100%', outline: 'none' }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onMouseMove={handleMouseMove}
            />

            {/* Story 1.4: Remote Cursors Overlay */}
            {isConnected && (
                <RemoteCursorsOverlay
                    users={remoteUsers}
                    canvasOffset={canvasOffset}
                    scale={scale}
                />
            )}

            {/* Story 1.4 + MED-6: Connection Status Indicator with sync feedback */}
            <div
                className={`absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${syncStatus === 'synced' ? 'bg-green-100 text-green-700'
                    : syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700'
                        : syncStatus === 'offline' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                data-testid="collab-status"
            >
                <span
                    className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500'
                        : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse'
                            : syncStatus === 'offline' ? 'bg-yellow-500'
                                : 'bg-gray-400'
                        }`}
                />
                {syncStatus === 'synced' && '✓ 已与远程同步'}
                {syncStatus === 'syncing' && '正在同步...'}
                {syncStatus === 'offline' && '离线模式'}
                {syncStatus === 'idle' && '未连接'}
            </div>

            {/* Story 2.6: Clipboard Toolbar */}
            <div className="absolute top-4 right-4">
                <ClipboardToolbar
                    hasSelection={hasSelection}
                    selectionCount={selectedNodeIds.length}
                    onCopy={copy}
                    onCut={cut}
                    onPaste={() => paste()}
                    disabled={!isReady}
                />
            </div>

            {/* Story 2.2: Dependency Mode Indicator */}
            {isDependencyMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {connectionStartNode ? (
                        <span>
                            已选择起点节点，点击另一个任务节点创建依赖连线
                            <button
                                onClick={() => {
                                    connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
                                    setConnectionStartNode(null);
                                }}
                                className="ml-2 underline hover:text-orange-900"
                            >
                                取消
                            </button>
                        </span>
                    ) : (
                        <span>依赖连线模式 - 点击第一个任务节点开始</span>
                    )}
                    <button
                        onClick={onExitDependencyMode}
                        className="ml-2 text-orange-500 hover:text-orange-700"
                        title="按 ESC 退出"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Story 2.2: Dependency Edge Context Menu */}
            {contextMenu.visible && contextMenu.edge && (
                <>
                    {/* Backdrop to close menu */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={handleCloseContextMenu}
                    />
                    {/* Context Menu */}
                    <div
                        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y,
                        }}
                    >
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                            修改依赖类型
                        </div>
                        {DEPENDENCY_TYPES.map((type) => {
                            const currentMetadata = getEdgeMetadata(contextMenu.edge!);
                            const isSelected = currentMetadata.dependencyType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => handleDependencyTypeChange(type.value)}
                                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-sm">{type.label}</span>
                                        <span className="text-xs text-gray-500">{type.description}</span>
                                    </span>
                                    {isSelected && (
                                        <span className="text-blue-500">✓</span>
                                    )}
                                </button>
                            );
                        })}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                            <button
                                onClick={() => {
                                    if (contextMenu.edge && graph) {
                                        removeEdge(graph, contextMenu.edge);
                                        setSelectedEdge(null);
                                    }
                                    handleCloseContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm"
                            >
                                删除依赖连线
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Story 2.6: Node/Blank Context Menu for Clipboard Operations */}
            {nodeContextMenu.visible && (
                <>
                    {/* Backdrop to close menu */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 })}
                    />
                    {/* Context Menu */}
                    <div
                        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
                        style={{
                            left: nodeContextMenu.x,
                            top: nodeContextMenu.y,
                        }}
                    >
                        {/* Copy - only when has selection */}
                        {hasSelection && (
                            <button
                                onClick={() => {
                                    copy();
                                    setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <span className="w-4">📋</span>
                                复制
                                <span className="ml-auto text-xs text-gray-400">⌘C</span>
                            </button>
                        )}

                        {/* Cut - only when has selection */}
                        {hasSelection && (
                            <button
                                onClick={() => {
                                    cut();
                                    setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <span className="w-4">✂️</span>
                                剪切
                                <span className="ml-auto text-xs text-gray-400">⌘X</span>
                            </button>
                        )}

                        {/* Separator */}
                        {hasSelection && <div className="border-t border-gray-100 my-1" />}

                        {/* Paste - always available, uses click position */}
                        <button
                            onClick={() => {
                                paste({ x: nodeContextMenu.graphX, y: nodeContextMenu.graphY });
                                setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
                            }}
                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                            <span className="w-4">📥</span>
                            粘贴到此处
                            <span className="ml-auto text-xs text-gray-400">⌘V</span>
                        </button>

                        {/* Select All */}
                        <button
                            onClick={() => {
                                if (graph) {
                                    const allNodes = graph.getNodes();
                                    graph.select(allNodes);
                                }
                                setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
                            }}
                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                            <span className="w-4">☑️</span>
                            全选
                            <span className="ml-auto text-xs text-gray-400">⌘A</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const addChildCommand = new AddChildCommand();
const addSiblingCommand = new AddSiblingCommand();
const removeNodeCommand = new RemoveNodeCommand();
const navigationCommand = new NavigationCommand();

// Helper: Create child node (with batch for undo grouping)
function createChildNode(graph: Graph, parentNode: Node): void {
    // Start batch so creation + editing becomes one undo step
    const batchId = `create-node-${Date.now()}`;
    graph.startBatch(batchId);

    const newNode = addChildCommand.execute(graph, parentNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        // Store batchId in node data so MindNode can stop it on commit
        newNode.setData({ ...newNode.getData(), _batchId: batchId });
        // Clear existing selection before selecting new node (Story 2.6: maintain single-select for node creation)
        graph.unselect(graph.getSelectedCells());
        graph.select(newNode);
    } else {
        // If node creation failed, stop batch immediately
        graph.stopBatch(batchId);
    }
}

// Helper: Create sibling (or child if root) (with batch for undo grouping)
function createSiblingOrChildNode(graph: Graph, selectedNode: Node): void {
    // Start batch so creation + editing becomes one undo step
    const batchId = `create-node-${Date.now()}`;
    graph.startBatch(batchId);

    const newNode = addSiblingCommand.execute(graph, selectedNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        // Store batchId in node data so MindNode can stop it on commit
        newNode.setData({ ...newNode.getData(), _batchId: batchId });
        // Clear existing selection before selecting new node (Story 2.6: maintain single-select for node creation)
        graph.unselect(graph.getSelectedCells());
        graph.select(newNode);
    } else {
        // If node creation failed, stop batch immediately
        graph.stopBatch(batchId);
    }
}

// Helper: Remove node and its descendants
function removeNode(graph: Graph, node: Node): void {
    removeNodeCommand.execute(graph, node);
}

function ensureNodeTimestamps(node: Node): void {
    const data = node.getData() || {};
    if (data.createdAt && data.updatedAt) return;

    const now = new Date().toISOString();
    const createdAt = data.createdAt ?? now;
    const updatedAt = data.updatedAt ?? createdAt;
    node.setData({ ...data, createdAt, updatedAt });
}

// Helper: Navigate to previous sibling (Arrow Up)
function navigateToPrevSibling(graph: Graph, currentNode: Node): void {
    const prevSibling = navigationCommand.navigateUp(graph, currentNode);
    if (prevSibling) {
        // Clear existing selection before selecting target (Story 2.6: maintain single-select for navigation)
        graph.unselect(graph.getSelectedCells());
        graph.select(prevSibling);
    }
}

// Helper: Navigate to next sibling (Arrow Down)
function navigateToNextSibling(graph: Graph, currentNode: Node): void {
    const nextSibling = navigationCommand.navigateDown(graph, currentNode);
    if (nextSibling) {
        // Clear existing selection before selecting target (Story 2.6: maintain single-select for navigation)
        graph.unselect(graph.getSelectedCells());
        graph.select(nextSibling);
    }
}

// Helper: Navigate to parent node (Arrow Left)
function navigateToParent(graph: Graph, currentNode: Node): void {
    const parent = navigationCommand.navigateLeft(graph, currentNode);
    if (parent) {
        // Clear existing selection before selecting target (Story 2.6: maintain single-select for navigation)
        graph.unselect(graph.getSelectedCells());
        graph.select(parent);
    }
}

// Helper: Navigate to first child node (Arrow Right)
function navigateToFirstChild(graph: Graph, currentNode: Node): void {
    const firstChild = navigationCommand.navigateRight(graph, currentNode);
    if (firstChild) {
        // Clear existing selection before selecting target (Story 2.6: maintain single-select for navigation)
        graph.unselect(graph.getSelectedCells());
        graph.select(firstChild);
    }
}

// Story 2.2: Helper to remove a dependency edge
function removeEdge(graph: Graph, edge: Edge): void {
    // Only allow deletion of dependency edges to protect tree structure
    if (!isDependencyEdge(edge)) {
        console.warn('Cannot delete hierarchical edge - use node deletion instead');
        return;
    }

    // Remove the edge from the graph
    graph.removeEdge(edge);
}

// Story 2.2: Helper to create a dependency edge between two task nodes
function createDependencyEdge(graph: Graph, sourceNode: Node, targetNode: Node): void {
    const dependencyType = 'FS';

    // Create edge with dependency styling
    graph.addEdge({
        source: sourceNode.id,
        target: targetNode.id,
        data: {
            metadata: {
                kind: 'dependency',
                dependencyType: dependencyType, // Default to Finish-to-Start
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
                stroke: '#9ca3af', // Neutral gray base
                strokeWidth: 1.5,
                strokeDasharray: '5 5', // Distinct dashed line for dependencies
                targetMarker: {
                    name: 'block',
                    width: 8, // Smaller, sharper arrow
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
                        fill: '#10b981', // Emerald text matching task cards
                        fontSize: 10,
                        fontWeight: '800', // Extra bold
                    },
                    body: {
                        fill: '#ffffff',
                        stroke: '#d1fae5', // Light emerald stroke
                        strokeWidth: 1.5,
                        rx: 10, // Full capsule rounded
                        ry: 10,
                        refWidth: '100%',
                        refHeight: '100%',
                        refWidth2: 12, // More padding width
                        refHeight2: 4, // More padding height
                        refX: -6,      // Center adjustment
                        refY: -2,
                        filter: {
                            name: 'dropShadow',
                            args: { dx: 0, dy: 1, blur: 2, color: '#0000001a' } // Subtle shadow
                        }
                    },
                },
                position: 0.5,
            },
        ],
    });
}
