'use client';

/**
 * 图谱详情页面
 * 显示具体图谱的编辑器界面
 * 
 * URL格式: /graph/[graphId]?userId=test1
 */

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import type { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import type { CreateFromTemplateResponse } from '@cdm/types';
import { CollaborationUIProvider, GraphProvider } from '@/contexts';
import { collabLogger as logger } from '@/lib/logger';
import { useViewStore } from '@/features/views';
import { ViewContainer } from '@/features/views';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useCommentCount } from '@/hooks/useCommentCount';
import { useTemplateInsert } from '@/hooks/useTemplateInsert';
import { CommentPanel } from '@/components/Comments';
import { TemplateLibraryDialog } from '@/components/TemplateLibrary';
import { CommentCountContext } from '@/contexts/CommentCountContext';
import {
    STORAGE_KEY_LAYOUT_MODE,
    STORAGE_KEY_GRID_ENABLED,
    LAYOUT_TRANSITION_MS,
} from '@/lib/constants';

// 用户颜色映射
const USER_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
];

function getColorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function GraphPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const graphId = params.graphId as string;
    const userId = searchParams.get('userId') || 'test1';

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [graph, setGraph] = useState<Graph | null>(null);
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('mindmap');
    const [gridEnabled, setGridEnabled] = useState(false);
    const [isDependencyMode, setIsDependencyMode] = useState(false);
    // Story 5.2: Template library dialog (drag-drop insert)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    // Story 4.3: Comment panel state
    const [commentNodeId, setCommentNodeId] = useState<string | null>(null);
    const [commentNodeLabel, setCommentNodeLabel] = useState<string>('');

    // 使用URL参数的userId构建用户对象
    const CURRENT_USER = {
        id: userId,
        name: `User ${userId}`,
        color: getColorForUser(userId),
    };

    // View mode state from store
    const viewMode = useViewStore((state) => state.viewMode);
    const setViewMode = useViewStore((state) => state.setViewMode);

    // 使用动态graphId的协作会话
    const collab = useCollaboration({
        graphId,
        user: CURRENT_USER,
        wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
    });

    // HIGH-5 Fix: Use comment count hook to track unread comments
    const { unreadCounts, getUnreadCount, refresh: refreshCommentCounts } = useCommentCount({
        mindmapId: graphId,
        userId,
        pollInterval: 30000, // Refresh every 30 seconds
    });

    // Restore state from localStorage on client mount
    useEffect(() => {
        const savedMode = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
        if (savedMode && ['mindmap', 'logic', 'free'].includes(savedMode)) {
            setLayoutMode(savedMode as LayoutMode);
        }

        const savedGrid = localStorage.getItem(STORAGE_KEY_GRID_ENABLED);
        if (savedGrid !== null) {
            setGridEnabled(savedGrid === 'true');
        }
    }, []);

    const handleNodeSelect = useCallback((nodeId: string | null) => {
        setSelectedNodeId(nodeId);
    }, []);

    const handleClosePanel = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // Story 5.2 Fix: Use template insert hook for inserting templates into current graph
    const { insertTemplate } = useTemplateInsert({
        graph,
        graphId,
        yDoc: collab.yDoc,
    });

    // Story 5.2 Fix: Handle inserting template into current graph (instead of creating new graph)
    const handleInsertTemplate = useCallback(
        (template: import('@cdm/types').Template) => {
            if (!graph || !template.structure) return;

            // Get canvas center as insert position, or use selected node's position
            const selectedCells = graph.getSelectedCells();
            let insertPosition = { x: 100, y: 100 };

            if (selectedCells.length > 0) {
                const firstNode = selectedCells[0];
                const bbox = firstNode.getBBox();
                // Position slightly to the right and below the selected node
                insertPosition = { x: bbox.x + bbox.width + 100, y: bbox.y + 50 };
            } else {
                // Use canvas center
                const contentRect = graph.getContentBBox();
                insertPosition = {
                    x: contentRect.x + contentRect.width + 200,
                    y: contentRect.y
                };
            }

            insertTemplate(template.structure, insertPosition);
            setTemplateDialogOpen(false);
        },
        [graph, insertTemplate]
    );

    const handleTemplateSelect = useCallback(
        (result: CreateFromTemplateResponse) => {
            setTemplateDialogOpen(false);
            router.push(`/graph/${result.graphId}?userId=${userId}`);
        },
        [router, userId]
    );

    const handleLayoutChange = useCallback((mode: LayoutMode) => {
        setIsLayoutLoading(true);
        setLayoutMode(mode);
        localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);

        setTimeout(() => {
            setIsLayoutLoading(false);
        }, LAYOUT_TRANSITION_MS);
    }, []);

    const handleGridToggle = useCallback((enabled: boolean) => {
        setGridEnabled(enabled);
        localStorage.setItem(STORAGE_KEY_GRID_ENABLED, String(enabled));
    }, []);

    const handleDependencyModeToggle = useCallback(() => {
        setIsDependencyMode((prev) => !prev);
    }, []);

    const handleUserHover = useCallback((hoveredUserId: string | null) => {
        logger.debug('User hover', { userId: hoveredUserId });
    }, []);

    const handleUserClick = useCallback((clickedUserId: string) => {
        logger.debug('Find user', { userId: clickedUserId });
    }, []);

    // Story 4.3: Handle opening comments for a node
    const handleOpenComments = useCallback((nodeId: string, nodeLabel: string) => {
        setCommentNodeId(nodeId);
        setCommentNodeLabel(nodeLabel);
    }, []);

    const handleCloseComments = useCallback(() => {
        setCommentNodeId(null);
        setCommentNodeLabel('');
    }, []);

    // Story 4.3: Listen for custom event to open comments
    useEffect(() => {
        const handleCommentEvent = (event: Event) => {
            const customEvent = event as CustomEvent<{ nodeId: string; nodeLabel: string }>;
            handleOpenComments(customEvent.detail.nodeId, customEvent.detail.nodeLabel);
        };
        window.addEventListener('mindmap:open-comments', handleCommentEvent);
        return () => {
            window.removeEventListener('mindmap:open-comments', handleCommentEvent);
        };
    }, [handleOpenComments]);

    // Story 4.3+: Sync comment panel with selected node when panel is open
    useEffect(() => {
        // If comment panel is open and user selects a different node, update the panel
        if (commentNodeId && selectedNodeId && commentNodeId !== selectedNodeId && graph) {
            // Use X6 Graph API to get node data
            const cell = graph.getCellById(selectedNodeId);
            if (cell && cell.isNode()) {
                const nodeLabel = cell.getData()?.label || cell.getAttrs()?.text?.text || '未命名节点';
                setCommentNodeId(selectedNodeId);
                setCommentNodeLabel(String(nodeLabel));
            }
        }
    }, [selectedNodeId, commentNodeId, graph]);


    return (
        <CollaborationUIProvider
            onUserHoverExternal={handleUserHover}
            onUserClickExternal={handleUserClick}
        >
            {/* HIGH-5 Fix: Provide comment counts to all child components */}
            <CommentCountContext.Provider value={{ unreadCounts, getUnreadCount, refresh: refreshCommentCounts }}>
                <GraphProvider graph={graph} graphId={graphId} yDoc={collab.yDoc} onNodeSelect={handleNodeSelect}>
                    <div className="flex flex-col h-screen">
                        <TopBar
                            userId={userId} // Story 2.4: Pass current user for notifications
                            projectName="CDM图谱"
                            currentLayout={layoutMode}
                            onLayoutChange={handleLayoutChange}
                            onGridToggle={handleGridToggle}
                            gridEnabled={gridEnabled}
                            isLoading={isLayoutLoading}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />

                        <div className="flex flex-1 overflow-hidden">
                            <LeftSidebar
                                isDependencyMode={isDependencyMode}
                                onDependencyModeToggle={handleDependencyModeToggle}
                                onTemplatesOpen={() => setTemplateDialogOpen(true)}
                                userId={userId}
                            />

                            <main className="flex-1 relative overflow-hidden">
                                <ViewContainer
                                    graphId={graphId}
                                    user={CURRENT_USER}
                                    collaboration={collab}
                                    onNodeSelect={handleNodeSelect}
                                    onLayoutChange={handleLayoutChange}
                                    onGridToggle={handleGridToggle}
                                    currentLayout={layoutMode}
                                    gridEnabled={gridEnabled}
                                    onGraphReady={setGraph}
                                    isDependencyMode={isDependencyMode}
                                    onExitDependencyMode={() => setIsDependencyMode(false)}
                                />
                            </main>

                            <RightSidebar
                                selectedNodeId={selectedNodeId}
                                graph={graph}
                                graphId={graphId}
                                yDoc={collab.yDoc}
                                creatorName={CURRENT_USER.name}
                                onClose={handleClosePanel}
                            />
                        </div>

                        {/* Story 4.3: Comment Panel */}
                        {commentNodeId && (
                            <CommentPanel
                                nodeId={commentNodeId}
                                nodeLabel={commentNodeLabel}
                                mindmapId={graphId}
                                userId={userId}
                                onClose={handleCloseComments}
                                onMarkAsRead={refreshCommentCounts}
                            />
                        )}

                        {/* Story 5.2 Fix: Template library with insert mode for current graph */}
                        <TemplateLibraryDialog
                            open={templateDialogOpen}
                            onOpenChange={setTemplateDialogOpen}
                            onSelect={handleTemplateSelect}
                            userId={userId}
                            enableDragDrop
                            onTemplateDragStart={() => setTemplateDialogOpen(false)}
                            mode="insert"
                            onInsertTemplate={handleInsertTemplate}
                        />
                    </div>
                </GraphProvider>
            </CommentCountContext.Provider>
        </CollaborationUIProvider>
    );
}

export default function GraphPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">加载图谱...</p>
                </div>
            </div>
        }>
            <GraphPageContent />
        </Suspense>
    );
}
