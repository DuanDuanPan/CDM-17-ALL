'use client';

/**
 * 图谱详情页面
 * 显示具体图谱的编辑器界面
 * 
 * URL格式: /graph/[graphId]?userId=test1
 */

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import type { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
import { CollaborationUIProvider, GraphProvider } from '@/contexts';
import { collabLogger as logger } from '@/lib/logger';
import { useViewStore } from '@/features/views';
import { ViewContainer } from '@/features/views';
import { useCollaboration } from '@/hooks/useCollaboration';
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

    const graphId = params.graphId as string;
    const userId = searchParams.get('userId') || 'test1';

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [graph, setGraph] = useState<Graph | null>(null);
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('mindmap');
    const [gridEnabled, setGridEnabled] = useState(false);
    const [isDependencyMode, setIsDependencyMode] = useState(false);

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

    return (
        <CollaborationUIProvider
            onUserHoverExternal={handleUserHover}
            onUserClickExternal={handleUserClick}
        >
            <GraphProvider graph={graph} graphId={graphId} onNodeSelect={handleNodeSelect}>
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
                            currentUserId={userId} // Pass current user ID
                            onClose={handleClosePanel}
                        />
                    </div>
                </div>
            </GraphProvider>
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
