'use client';

import { Menu, Share2, Settings } from 'lucide-react';
import { LayoutSwitcher } from '../toolbar/LayoutSwitcher';
import { LayoutMode } from '@cdm/types';

export interface TopBarProps {
  projectName?: string;
  currentLayout?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  onGridToggle?: (enabled: boolean) => void;
  gridEnabled?: boolean;
  isLoading?: boolean;
}

export function TopBar({
  projectName = '未命名项目',
  currentLayout = 'mindmap',
  onLayoutChange,
  onGridToggle,
  gridEnabled = false,
  isLoading = false,
}: TopBarProps) {
  return (
    <header className="h-12 border-b border-gray-200/50 bg-white/70 backdrop-blur-md flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-sm font-medium text-gray-800">{projectName}</h1>
      </div>

      {/* Center section - Layout Switcher */}
      <div className="flex items-center">
        <LayoutSwitcher
          currentMode={currentLayout}
          onModeChange={onLayoutChange}
          onGridToggle={onGridToggle}
          gridEnabled={gridEnabled}
          isLoading={isLoading}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Share2 className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
