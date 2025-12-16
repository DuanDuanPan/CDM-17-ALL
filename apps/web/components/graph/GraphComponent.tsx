'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGraph, addCenterNode } from '@/hooks/useGraph';
import { useMindmapPlugin } from '@/hooks/useMindmapPlugin';
import { useLayoutPlugin } from '@/hooks/useLayoutPlugin';
import { Graph, Node } from '@antv/x6';
import { AddChildCommand, AddSiblingCommand, RemoveNodeCommand } from '@cdm/plugin-mindmap-core';
import { LayoutMode } from '@cdm/types';

// Story 1.4: Collaboration imports
import { useCollaboration, CollabUser, AwarenessUser } from '@/hooks/useCollaboration';
import { graphSyncManager } from '@/features/collab/GraphSyncManager';
import { RemoteCursorsOverlay } from '@/components/collab/RemoteCursor';

export interface GraphComponentProps {
    onNodeSelect?: (nodeId: string | null) => void;
    onLayoutChange?: (mode: LayoutMode) => void;
    onGridToggle?: (enabled: boolean) => void;
    currentLayout?: LayoutMode;
    gridEnabled?: boolean;
    // Story 1.4: Collaboration props
    /** Graph ID for collaboration (enables collab if provided) */
    graphId?: string;
    /** Current user info for collaboration */
    user?: CollabUser;
    /** Callback when remote users change (for TopBar display) */
    onRemoteUsersChange?: (users: AwarenessUser[]) => void;
}

export function GraphComponent({
    onNodeSelect,
    onLayoutChange,
    onGridToggle,
    currentLayout = 'mindmap',
    // Story 1.4: Collaboration props with defaults
    graphId = 'default-graph',
    user = { id: 'anonymous', name: '匿名用户', color: '#6366f1' },
    onRemoteUsersChange,
}: GraphComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    // Story 1.4: Canvas transform state for cursor rendering
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [hasInitializedGraphState, setHasInitializedGraphState] = useState(false);

    // Set container after mount
    useEffect(() => {
        if (containerRef.current) {
            setContainer(containerRef.current);
        }
    }, []);

    const { graph, isReady } = useGraph({ container });

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
    } = useCollaboration({
        graphId,
        user,
        wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
    });

    // Reset init flag when switching graphs
    useEffect(() => {
        setHasInitializedGraphState(false);
    }, [graphId]);

    // Story 1.4: Report remote users to parent (for TopBar)
    useEffect(() => {
        if (onRemoteUsersChange) {
            onRemoteUsersChange(remoteUsers);
        }
    }, [remoteUsers, onRemoteUsersChange]);

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

    // Story 1.4: Track mouse movement for cursor awareness
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!graph || !isConnected) return;

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
    useEffect(() => {
        if (!graph || !isReady) return;

        // Reset initialization state when graph changes
        if (!hasInitializedGraphState && graph.getNodes().length > 0) {
            setHasInitializedGraphState(true);
            return;
        }

        // Collaboration path: wait until document is fully synced to avoid coordinate mismatch
        if (graphId && yDoc) {
            if (!isSynced || hasInitializedGraphState) return;

            const yNodes = yDoc.getMap('nodes');
            if (yNodes.size === 0) {
                addCenterNode(graph);
            } else {
                graphSyncManager.loadInitialState();
            }
            setHasInitializedGraphState(true);
            return;
        }

        // Fallback: non-collaboration mode
        if (!hasInitializedGraphState && graph.getNodes().length === 0) {
            addCenterNode(graph);
            setHasInitializedGraphState(true);
        }
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

            {/* Story 1.4: Connection Status Indicator */}
            <div
                className={`absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                    }`}
                data-testid="collab-status"
            >
                <span
                    className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}
                />
                {isConnected ? '协作已连接' : '离线模式'}
            </div>
        </div>
    );
}

const addChildCommand = new AddChildCommand();
const addSiblingCommand = new AddSiblingCommand();
const removeNodeCommand = new RemoveNodeCommand();

// Helper: Create child node
function createChildNode(graph: Graph, parentNode: Node): void {
    const newNode = addChildCommand.execute(graph, parentNode);
    if (newNode) {
        graph.select(newNode);
    }
}

// Helper: Create sibling (or child if root)
function createSiblingOrChildNode(graph: Graph, selectedNode: Node): void {
    const newNode = addSiblingCommand.execute(graph, selectedNode);
    if (newNode) {
        graph.select(newNode);
    }
}

// Helper: Remove node and its descendants
function removeNode(graph: Graph, node: Node): void {
    removeNodeCommand.execute(graph, node);
}
