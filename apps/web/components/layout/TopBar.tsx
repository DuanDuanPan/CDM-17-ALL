'use client';

import { Menu, Share2, Settings } from 'lucide-react';
import { LayoutSwitcher } from '../toolbar/LayoutSwitcher';
import { ActiveUsersAvatarStack } from '../collab/ActiveUsersAvatarStack';
import { LayoutMode } from '@cdm/types';
import type { AwarenessUser } from '../../hooks/useCollaboration';

export interface TopBarProps {
  projectName?: string;
  currentLayout?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  onGridToggle?: (enabled: boolean) => void;
  gridEnabled?: boolean;
  isLoading?: boolean;
  /** Remote collaborating users for presence display */
  remoteUsers?: AwarenessUser[];
  /** Callback when hovering over user avatar to highlight on canvas */
  onUserHover?: (userId: string | null) => void;
  /** Callback when clicking user avatar to find them on canvas */
  onUserClick?: (userId: string) => void;
}

export function TopBar({
  projectName = '未命名项目',
  currentLayout = 'mindmap',
  onLayoutChange,
  onGridToggle,
  gridEnabled = false,
  isLoading = false,
  remoteUsers = [],
  onUserHover,
  onUserClick,
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

      {/* Right section - Active Users + Actions */}
      <div className="flex items-center gap-4">
        {/* Active Users Avatar Stack (Story 1.4) */}
        {remoteUsers.length > 0 && (
          <ActiveUsersAvatarStack
            users={remoteUsers}
            maxVisible={3}
            onUserHover={onUserHover}
            onUserClick={onUserClick}
          />
        )}

        {/* Separator when users present */}
        {remoteUsers.length > 0 && (
          <div className="h-6 w-px bg-gray-200" />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}

