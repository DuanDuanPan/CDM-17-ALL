'use client';

import { useState, useCallback } from 'react';
import { TopBar, LeftSidebar, RightSidebar } from '@/components/layout';
import { GraphComponent } from '@/components/graph';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <TopBar projectName="未命名项目" />

      {/* Main content area with three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Component Library */}
        <LeftSidebar />

        {/* Center Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <GraphComponent onNodeSelect={handleNodeSelect} />
        </main>

        {/* Right Sidebar - Property Panel */}
        <RightSidebar
          selectedNodeId={selectedNodeId}
          onClose={handleClosePanel}
        />
      </div>
    </div>
  );
}
