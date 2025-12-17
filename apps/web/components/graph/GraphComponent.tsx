'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGraph, addCenterNode } from '@/hooks/useGraph';
import { useMindmapPlugin } from '@/hooks/useMindmapPlugin';
import { useLayoutPlugin } from '@/hooks/useLayoutPlugin';
import { Graph, Node } from '@antv/x6';
import { AddChildCommand, AddSiblingCommand, RemoveNodeCommand, NavigationCommand } from '@cdm/plugin-mindmap-core';
import { LayoutMode } from '@cdm/types';

// Story 1.4: Collaboration imports
import { useCollaboration, CollabUser } from '@/hooks/useCollaboration';
import { graphSyncManager } from '@/features/collab/GraphSyncManager';
import { RemoteCursorsOverlay } from '@/components/collab/RemoteCursor';
// Story 1.4 MED-12: Use Context to report remote users
import { useCollaborationUIOptional } from '@/contexts';
// Story 1.4 LOW-1: Use centralized constants
import { CURSOR_UPDATE_THROTTLE_MS } from '@/lib/constants';

export interface GraphComponentProps {
    onNodeSelect?: (nodeId: string | null) => void;
    onLayoutChange?: (mode: LayoutMode) => void;
    onGridToggle?: (enabled: boolean) => void;
    currentLayout?: LayoutMode;
    gridEnabled?: boolean;
    onGraphReady?: (graph: Graph | null) => void;
    // Story 1.4: Collaboration props
    /** Graph ID for collaboration (enables collab if provided) */
    graphId?: string;
    /** Current user info for collaboration */
    user?: CollabUser;
}

export function GraphComponent({
    onNodeSelect,
    onLayoutChange,
    onGridToggle,
    currentLayout = 'mindmap',
    onGraphReady,
    // Story 1.4: Collaboration props with defaults
    graphId = 'default-graph',
    user = { id: 'anonymous', name: '匿名用户', color: '#6366f1' },
}: GraphComponentProps) {
    // Story 1.4 MED-12: Get context to report remote users
    const collabUIContext = useCollaborationUIOptional();
    const containerRef = useRef<HTMLDivElement>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    // Story 1.4: Canvas transform state for cursor rendering
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [hasInitializedGraphState, setHasInitializedGraphState] = useState(false);

    // Story 1.4 HIGH-3: Throttle cursor updates to prevent WebSocket flooding
    const lastCursorUpdateTime = useRef<number>(0);

    // Set container after mount
    useEffect(() => {
        if (containerRef.current) {
            setContainer(containerRef.current);
        }
    }, []);

    const { graph, isReady } = useGraph({ container });

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

    // Story 1.4: Initialize collaboration
    const {
        yDoc,
        isConnected,
        remoteUsers,
        updateCursor,
        updateSelectedNode,
        isSynced,
        syncStatus,
    } = useCollaboration({
        graphId,
        user,
        wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
    });

    // Reset init flag when switching graphs
    useEffect(() => {
        setHasInitializedGraphState(false);
    }, [graphId]);

    // Story 1.4 MED-12: Report remote users to context (for TopBar)
    useEffect(() => {
        if (collabUIContext?.setRemoteUsers) {
            collabUIContext.setRemoteUsers(remoteUsers);
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
                addCenterNode(graph);
            }
        } else {
            // Non-collaboration mode: add default center node
            addCenterNode(graph);
        }

        setHasInitializedGraphState(true);
    }, [graph, isReady, graphId, yDoc, isSynced, hasInitializedGraphState]);

    // Story 1.4: Sync layout mode changes to Yjs for collaboration
    useEffect(() => {
        if (!isConnected || !yDoc) return;

        // When currentLayout changes locally, sync to Yjs so other users receive the update
        graphSyncManager.setLayoutMode(currentLayout);
    }, [currentLayout, isConnected, yDoc]);


    // Keyboard event handler - must be at container level to intercept Tab
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!graph || !isReady) return;

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

                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    e.stopPropagation();
                    removeNode(graph, node);
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
        [graph, isReady]
    );

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

            const containerEl = containerRef.current;
            containerEl?.addEventListener(
                'mindmap:node-operation',
                handleMindmapNodeOperation as EventListener
            );

            // Setup node selection events
            graph.on('node:selected', handleNodeSelected);
            graph.on('node:unselected', handleNodeUnselected);
            graph.on('blank:click', handleBlankClick);
            graph.on('node:click', handleNodeClick);

            // Cleanup function to remove event listeners
            return () => {
                containerEl?.removeEventListener(
                    'mindmap:node-operation',
                    handleMindmapNodeOperation as EventListener
                );
                if (graph && typeof graph.off === 'function') {
                    graph.off('node:selected', handleNodeSelected);
                    graph.off('node:unselected', handleNodeUnselected);
                    graph.off('blank:click', handleBlankClick);
                    graph.off('node:click', handleNodeClick);
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
        </div>
    );
}

const addChildCommand = new AddChildCommand();
const addSiblingCommand = new AddSiblingCommand();
const removeNodeCommand = new RemoveNodeCommand();
const navigationCommand = new NavigationCommand();

// Helper: Create child node
function createChildNode(graph: Graph, parentNode: Node): void {
    const newNode = addChildCommand.execute(graph, parentNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        graph.select(newNode);
    }
}

// Helper: Create sibling (or child if root)
function createSiblingOrChildNode(graph: Graph, selectedNode: Node): void {
    const newNode = addSiblingCommand.execute(graph, selectedNode);
    if (newNode) {
        ensureNodeTimestamps(newNode);
        graph.select(newNode);
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
        graph.select(prevSibling);
    }
}

// Helper: Navigate to next sibling (Arrow Down)
function navigateToNextSibling(graph: Graph, currentNode: Node): void {
    const nextSibling = navigationCommand.navigateDown(graph, currentNode);
    if (nextSibling) {
        graph.select(nextSibling);
    }
}

// Helper: Navigate to parent node (Arrow Left)
function navigateToParent(graph: Graph, currentNode: Node): void {
    const parent = navigationCommand.navigateLeft(graph, currentNode);
    if (parent) {
        graph.select(parent);
    }
}

// Helper: Navigate to first child node (Arrow Right)
function navigateToFirstChild(graph: Graph, currentNode: Node): void {
    const firstChild = navigationCommand.navigateRight(graph, currentNode);
    if (firstChild) {
        graph.select(firstChild);
    }
}

