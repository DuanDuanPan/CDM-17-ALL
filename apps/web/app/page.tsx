'use client';

import { useState, useCallback, useEffect } from 'react';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import { GraphComponent } from '@/components/graph';
import { LayoutMode } from '@cdm/types';
// Story 1.4 MED-12: Use Context for collaboration UI state
import { CollaborationUIProvider } from '@/contexts';
import { collabLogger as logger } from '@/lib/logger';
// Story 1.4 LOW-1: Use centralized constants
import {
  STORAGE_KEY_LAYOUT_MODE,
  STORAGE_KEY_GRID_ENABLED,
  LAYOUT_TRANSITION_MS,
} from '@/lib/constants';

// Story 1.4: Demo user for collaboration (in production, use Clerk auth)
const DEMO_USER = {
  id: 'user-demo-' + Math.random().toString(36).substr(2, 9),
  name: '演示用户',
  color: '#3b82f6',
};

// Story 1.4: Demo graph ID (in production, use URL params or route)
const DEMO_GRAPH_ID = 'demo-graph-1';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);

  // Initialize layout state (will be updated from localStorage on client mount)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('mindmap');
  const [gridEnabled, setGridEnabled] = useState(false);

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
      <div className="flex flex-col h-screen">
        {/* Top Bar - Story 1.4 MED-12: Now uses Context for remoteUsers */}
        <TopBar
          projectName="未命名项目"
          currentLayout={layoutMode}
          onLayoutChange={handleLayoutChange}
          onGridToggle={handleGridToggle}
          gridEnabled={gridEnabled}
          isLoading={isLayoutLoading}
        />

        {/* Main content area with three columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Component Library */}
          <LeftSidebar />

          {/* Center Canvas - Story 1.4 MED-12: Uses Context to report remote users */}
          <main className="flex-1 relative overflow-hidden">
            <GraphComponent
              onNodeSelect={handleNodeSelect}
              onLayoutChange={handleLayoutChange}
              onGridToggle={handleGridToggle}
              currentLayout={layoutMode}
              gridEnabled={gridEnabled}
              graphId={DEMO_GRAPH_ID}
              user={DEMO_USER}
            />
          </main>

          {/* Right Sidebar - Property Panel */}
          <RightSidebar selectedNodeId={selectedNodeId} onClose={handleClosePanel} />
        </div>
      </div>
    </CollaborationUIProvider>
  );
}

