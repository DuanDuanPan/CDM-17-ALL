'use client';

import { useState, useCallback, useEffect } from 'react';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import type { Graph } from '@antv/x6';
import { LayoutMode } from '@cdm/types';
// Story 1.4 MED-12: Use Context for collaboration UI state
// Story 2.4: GraphProvider for notification navigation
import { CollaborationUIProvider, GraphProvider } from '@/contexts';
import { collabLogger as logger } from '@/lib/logger';
import { useViewStore } from '@/features/views';
import { ViewContainer } from '@/features/views';
import { useCollaboration } from '@/hooks/useCollaboration';
// Story 1.4 LOW-1: Use centralized constants
import {
  STORAGE_KEY_LAYOUT_MODE,
  STORAGE_KEY_GRID_ENABLED,
  LAYOUT_TRANSITION_MS,
} from '@/lib/constants';

// Story 1.4: Demo user for collaboration (in production, use Clerk auth)
// Story 2.4: Use 'test1' to match seed data for notifications
const DEMO_USER = {
  id: 'test1',
  name: 'Test User 1',
  color: '#3b82f6',
};

// Story 1.4: Demo graph ID (in production, use URL params or route)
const DEMO_GRAPH_ID = 'demo-graph-1';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);

  // Initialize layout state (will be updated from localStorage on client mount)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('mindmap');
  const [gridEnabled, setGridEnabled] = useState(false);

  // Story 2.2: Dependency mode state for edge creation
  const [isDependencyMode, setIsDependencyMode] = useState(false);

  // Story 2.3: View mode state from store
  const viewMode = useViewStore((state) => state.viewMode);
  const setViewMode = useViewStore((state) => state.setViewMode);

  // Story 2.3: Shared collaboration session for all projections
  const collab = useCollaboration({
    graphId: DEMO_GRAPH_ID,
    user: DEMO_USER,
    wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
  });

  // Restore state from localStorage on client mount (after hydration)
  useEffect(() => {
    // Restore layout mode
    const savedMode = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
    if (savedMode && ['mindmap', 'logic', 'free'].includes(savedMode)) {
      setLayoutMode(savedMode as LayoutMode);
    }

    // Restore grid enabled state
    const savedGrid = localStorage.getItem(STORAGE_KEY_GRID_ENABLED);
    if (savedGrid !== null) {
      setGridEnabled(savedGrid === 'true');
    }
  }, []); // Empty deps = run once on mount

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    setIsLayoutLoading(true);
    setLayoutMode(mode);
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);

    // Clear loading state after transition duration (matches animation)
    setTimeout(() => {
      setIsLayoutLoading(false);
    }, LAYOUT_TRANSITION_MS);
  }, []);

  const handleGridToggle = useCallback((enabled: boolean) => {
    setGridEnabled(enabled);
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY_GRID_ENABLED, String(enabled));
  }, []);

  // Story 2.2: Toggle dependency mode for edge creation
  const handleDependencyModeToggle = useCallback(() => {
    setIsDependencyMode((prev) => !prev);
  }, []);

  // Story 1.4 MED-12: Handle user hover on avatar (could highlight their cursor)
  const handleUserHover = useCallback((userId: string | null) => {
    logger.debug('User hover', { userId });
  }, []);

  // Story 1.4 MED-12: Handle user click on avatar (could pan to their position)
  const handleUserClick = useCallback((userId: string) => {
    logger.debug('Find user', { userId });
  }, []);

  return (
    <CollaborationUIProvider
      onUserHoverExternal={handleUserHover}
      onUserClickExternal={handleUserClick}
    >
      {/* Story 2.4: GraphProvider enables notification click navigation */}
      <GraphProvider graph={graph} onNodeSelect={handleNodeSelect}>
        <div className="flex flex-col h-screen">
          {/* Top Bar - Story 1.4 MED-12: Now uses Context for remoteUsers */}
          <TopBar
            projectName="未命名项目"
            currentLayout={layoutMode}
            onLayoutChange={handleLayoutChange}
            onGridToggle={handleGridToggle}
            gridEnabled={gridEnabled}
            isLoading={isLayoutLoading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Main content area with three columns */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Component Library + Story 2.2: Dependency Mode */}
            <LeftSidebar
              isDependencyMode={isDependencyMode}
              onDependencyModeToggle={handleDependencyModeToggle}
            />

            {/* Center Canvas - Story 1.4 MED-12: Uses Context to report remote users */}
            {/* Story 2.2: Pass dependency mode for edge creation */}
            <main className="flex-1 relative overflow-hidden">
              <ViewContainer
                graphId={DEMO_GRAPH_ID}
                user={DEMO_USER}
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

            {/* Right Sidebar - Property Panel */}
            <RightSidebar
              selectedNodeId={selectedNodeId}
              graph={graph}
              graphId={DEMO_GRAPH_ID}
              yDoc={collab.yDoc}
              creatorName={DEMO_USER.name}
              onClose={handleClosePanel}
            />
          </div>
        </div>
      </GraphProvider>
    </CollaborationUIProvider>
  );
}
