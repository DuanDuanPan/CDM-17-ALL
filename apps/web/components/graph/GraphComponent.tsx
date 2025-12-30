'use client';

import { useEffect, useRef, useState } from 'react';
import { useGraph } from '@/hooks/useGraph';
import { useMindmapPlugin } from '@/hooks/useMindmapPlugin';
import { useLayoutPlugin } from '@/hooks/useLayoutPlugin';
import { Graph, Node, Edge } from '@antv/x6';
import { LayoutMode } from '@cdm/types';

// Story 1.4: Collaboration imports
import type { CollabUser, UseCollaborationReturn } from '@/hooks/useCollaboration';
import { RemoteCursorsOverlay } from '@/components/collab/RemoteCursor';
import { useCollaborationUIOptional } from '@/contexts';
import { DEFAULT_CREATOR_NAME } from '@/lib/constants';

// Story 2.6: Multi-Select & Clipboard
import { useSelection } from '@/hooks/useSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { useClipboardShortcuts } from '@/hooks/useClipboardShortcuts';
import { useEditingState } from '@/hooks/useEditingState';
import { ClipboardToolbar } from '@/components/toolbar/ClipboardToolbar';

// Story 4.4: Watch & Subscription
import { useSubscription, useSubscriptionList } from '@/hooks/useSubscription';
import { setSubscriptions } from '@/lib/subscriptionStore';
import { useToast } from '@cdm/ui';

// Story 7.4: Extracted hooks and UI components
import { useGraphTransform, useGraphHotkeys, useGraphEvents, useGraphSelection, useGraphDependencyMode, useGraphContextMenu, useGraphCursor, useGraphInitialization } from './hooks';
import type { EdgeContextMenuState, NodeContextMenuState } from './hooks';
import { EdgeContextMenu, NodeContextMenu, ConnectionStatus, DependencyModeIndicator } from './parts';

export interface GraphComponentProps {
    onNodeSelect?: (nodeId: string | null) => void;
    onLayoutChange?: (mode: LayoutMode) => void;
    onGridToggle?: (enabled: boolean) => void;
    currentLayout?: LayoutMode;
    gridEnabled?: boolean;
    onGraphReady?: (graph: Graph | null) => void;
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
    graphId?: string;
    user?: CollabUser;
    isDependencyMode?: boolean;
    onExitDependencyMode?: () => void;
}

export function GraphComponent({
    onNodeSelect,
    onLayoutChange,
    onGridToggle,
    currentLayout = 'mindmap',
    onGraphReady,
    collaboration,
    graphId = 'default-graph',
    user = { id: 'anonymous', name: '匿名用户', color: '#6366f1' },
    isDependencyMode = false,
    onExitDependencyMode,
}: GraphComponentProps) {
	const collabUIContext = useCollaborationUIOptional();
	const { addToast } = useToast();
	const containerRef = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
	const [connectionStartNode, setConnectionStartNode] = useState<Node | null>(null);
	const [contextMenu, setContextMenu] = useState<EdgeContextMenuState>({
		visible: false, x: 0, y: 0, edge: null
	});
    const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState>({
        visible: false, x: 0, y: 0, graphX: 0, graphY: 0, nodeId: null
    });

    // Story 4.4: Watch & Subscription
    const { isSubscribed, isLoading: isSubscriptionLoading, subscribe, unsubscribe } = useSubscription({
        nodeId: nodeContextMenu.nodeId,
        userId: user.id,
    });

    useEffect(() => {
        if (containerRef.current) setContainer(containerRef.current);
    }, []);

    const { graph, isReady } = useGraph({ container });
    const creatorName = user?.name || DEFAULT_CREATOR_NAME;

    useEffect(() => {
        if (!onGraphReady) return;
        onGraphReady(graph);
        return () => { onGraphReady(null); };
    }, [graph, onGraphReady]);

    useMindmapPlugin(graph, isReady);
    const { gridEnabled } = useLayoutPlugin(graph, isReady, currentLayout ?? 'mindmap');

    useEffect(() => { onGridToggle?.(gridEnabled); }, [gridEnabled, onGridToggle]);

    // Story 2.6: Multi-Select & Clipboard
    const { selectedNodes, selectedNodeIds, hasSelection, selectNodes, clearSelection } = useSelection({ graph });
    const { isEditing } = useEditingState({ graph });

    // Collaboration fallback
    const fallbackCollab = {
        yDoc: null, isConnected: false, isSynced: false, syncStatus: 'idle' as const,
        remoteUsers: [], updateCursor: () => {}, updateSelectedNode: () => {},
    };
    const { yDoc, isConnected, remoteUsers, updateCursor, updateSelectedNode, isSynced, syncStatus } =
        collaboration ?? fallbackCollab;

    // Story 2.6: Clipboard
    const { copy, cut, paste, deleteNodes, hardDeleteNodes } = useClipboard({
        graph, graphId, yDoc, undoManager: null, selectedNodes, selectNodes, clearSelection,
    });
	useClipboardShortcuts({
		copy, cut, paste, deleteNodes, hardDeleteNodes, hasSelection, isEditing, enabled: isReady,
	});

    // Story 4.4: Hydrate subscriptions
    const { subscriptions } = useSubscriptionList(user.id);
    useEffect(() => { setSubscriptions(subscriptions.map((s) => s.nodeId)); }, [subscriptions]);

    // Story 1.4 MED-12: Report remote users to context
    const prevRemoteUsersRef = useRef<typeof remoteUsers>([]);
	useEffect(() => {
		if (!collabUIContext?.setRemoteUsers) return;
        const hasChanged = remoteUsers.length !== prevRemoteUsersRef.current.length ||
            remoteUsers.some((u, i) =>
                u.id !== prevRemoteUsersRef.current[i]?.id ||
                u.name !== prevRemoteUsersRef.current[i]?.name ||
                u.color !== prevRemoteUsersRef.current[i]?.color
            );
        if (hasChanged) {
            prevRemoteUsersRef.current = remoteUsers;
            collabUIContext.setRemoteUsers([...remoteUsers]);
        }
	}, [remoteUsers, collabUIContext]);

    // Story 7.4: Extracted hooks
    const { canvasOffset, scale } = useGraphTransform({ graph, isReady });
    const { handleMouseMove } = useGraphCursor({ graph, isConnected, updateCursor });
    useGraphSelection({ graph, isReady, isConnected, updateSelectedNode });
	useGraphDependencyMode({ graph, isReady, isDependencyMode, connectionStartNode, setConnectionStartNode });
	const { handleDependencyTypeChange, handleCloseContextMenu, removeEdge } = useGraphContextMenu({
		graph, contextMenu, setContextMenu,
	});
	const { handleKeyDown } = useGraphHotkeys({
		graph, isReady, selectedEdge, setSelectedEdge,
		connectionStartNode, setConnectionStartNode, isDependencyMode, onExitDependencyMode, removeEdge,
	});
	useGraphEvents({
		graph, isReady, containerRef, onNodeSelect, setSelectedEdge,
		isDependencyMode, connectionStartNode, setContextMenu, setNodeContextMenu,
	});
	useGraphInitialization({
		graph,
		isReady,
		graphId,
		creatorName,
		yDoc,
		isConnected,
		isSynced,
		currentLayout,
		onLayoutChange,
	});

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

            {/* Remote Cursors Overlay */}
            {isConnected && (
                <RemoteCursorsOverlay users={remoteUsers} canvasOffset={canvasOffset} scale={scale} />
            )}

            {/* Connection Status */}
            <ConnectionStatus syncStatus={syncStatus} />

            {/* Clipboard Toolbar */}
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

            {/* Dependency Mode Indicator */}
            <DependencyModeIndicator
                isDependencyMode={isDependencyMode}
                connectionStartNode={connectionStartNode}
                onCancelConnection={() => {
                    if (connectionStartNode) {
                        connectionStartNode.setData({ ...connectionStartNode.getData(), isConnectionSource: false });
                        setConnectionStartNode(null);
                    }
                }}
                onExitDependencyMode={onExitDependencyMode}
            />

            {/* Edge Context Menu */}
            <EdgeContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                edge={contextMenu.edge}
                graph={graph}
                onDependencyTypeChange={handleDependencyTypeChange}
                onRemoveEdge={() => {
                    if (contextMenu.edge && graph) {
                        removeEdge(graph, contextMenu.edge);
                        setSelectedEdge(null);
                    }
                    handleCloseContextMenu();
                }}
                onClose={handleCloseContextMenu}
            />

            {/* Node Context Menu */}
            <NodeContextMenu
                visible={nodeContextMenu.visible}
                x={nodeContextMenu.x}
                y={nodeContextMenu.y}
                graphX={nodeContextMenu.graphX}
                graphY={nodeContextMenu.graphY}
                nodeId={nodeContextMenu.nodeId}
                graph={graph}
                hasSelection={hasSelection}
                isSubscribed={isSubscribed}
                isSubscriptionLoading={isSubscriptionLoading}
                onCopy={copy}
                onCut={cut}
                onPaste={paste}
                onSelectAll={() => graph?.select(graph.getNodes())}
                onSubscriptionToggle={async () => {
                    if (isSubscribed) {
                        const success = await unsubscribe();
                        if (success) addToast({ type: 'success', title: '成功', description: '已取消关注' });
                    } else {
                        const success = await subscribe();
                        if (success) addToast({ type: 'success', title: '成功', description: '已添加关注' });
                    }
                }}
                onClose={() => setNodeContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0, nodeId: null })}
            />
        </div>
    );
}
