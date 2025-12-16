'use client';

import { useState, useCallback, useEffect } from 'react';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import { GraphComponent } from '@/components/graph';
import { LayoutMode } from '@cdm/types';

const STORAGE_KEY_LAYOUT_MODE = 'cdm:layoutMode';
const STORAGE_KEY_GRID_ENABLED = 'cdm:gridEnabled';

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
    }, 600); // Slightly longer than animation duration (500ms) for better UX
  }, []);

  const handleGridToggle = useCallback((enabled: boolean) => {
    setGridEnabled(enabled);
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY_GRID_ENABLED, String(enabled));
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
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

        {/* Center Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <GraphComponent
            onNodeSelect={handleNodeSelect}
            onLayoutChange={handleLayoutChange}
            onGridToggle={handleGridToggle}
            currentLayout={layoutMode}
            gridEnabled={gridEnabled}
          />
        </main>

        {/* Right Sidebar - Property Panel */}
        <RightSidebar selectedNodeId={selectedNodeId} onClose={handleClosePanel} />
      </div>
    </div>
  );
}
