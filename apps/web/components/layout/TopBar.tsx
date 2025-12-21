'use client';

import { Menu, Share2, Settings } from 'lucide-react';
import { LayoutSwitcher } from '../toolbar/LayoutSwitcher';
import { ViewSwitcher } from '@/features/views';
import { ActiveUsersAvatarStack } from '../collab/ActiveUsersAvatarStack';
import { NotificationBell } from '../notifications';
import { LayoutMode } from '@cdm/types';
// Story 1.4 MED-12: Use Context instead of props drilling
import { useCollaborationUIOptional, useGraphContextOptional } from '@/contexts';
// Story 1.4 LOW-1: Use centralized constants
import { MAX_VISIBLE_AVATARS } from '@/lib/constants';
// Story 2.4: Notification system
import { useNotifications } from '@/hooks/useNotifications';

export interface TopBarProps {
  projectName?: string;
  currentLayout?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  onGridToggle?: (enabled: boolean) => void;
  gridEnabled?: boolean;
  isLoading?: boolean;
  /** View mode state (graph/kanban/gantt) */
  viewMode?: import('@/features/views').ViewMode;
  /** Optional view mode handler */
  onViewModeChange?: (mode: import('@/features/views').ViewMode) => void;
}

/**
 * TopBar - Application header with layout controls and user presence
 *
 * Story 1.4 MED-12: Remote users are now consumed from CollaborationUIContext
 * instead of being passed via props.
 */
export function TopBar({
  projectName = '未命名项目',
  currentLayout = 'mindmap',
  onLayoutChange,
  onGridToggle,
  gridEnabled = false,
  isLoading = false,
  viewMode,
  onViewModeChange,
}: TopBarProps) {
  // Story 1.4 MED-12: Get collaboration state from context (optional for standalone usage)
  const collabContext = useCollaborationUIOptional();
  const remoteUsers = collabContext?.remoteUsers ?? [];
  const onUserHover = collabContext?.onUserHover;
  const onUserClick = collabContext?.onUserClick;

  // Story 2.4: Get graph context for node navigation
  const graphContext = useGraphContextOptional();
  const navigateToNode = graphContext?.navigateToNode;

  // Story 2.4: Notification system
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh,
    isLoading: notificationsLoading,
  } = useNotifications({
    userId: 'test1', // 默认查看 test1 的通知
    // Disable WebSocket in development to prevent console spam when backend isn't running
    // The hook will automatically fall back to polling
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WS === 'true',
    enablePolling: true,
  });

  return (
    <header className="h-12 border-b border-gray-200/50 bg-white/70 backdrop-blur-md flex items-center justify-between px-4 relative z-10">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-sm font-medium text-gray-800">{projectName}</h1>
      </div>

      {/* Center section - Layout + View Switchers */}
      <div className="flex items-center gap-3">
        {/* Only show LayoutSwitcher when in graph view - Kanban/Gantt toolbars moved to content areas */}
        {viewMode === 'graph' && (
          <LayoutSwitcher
            currentMode={currentLayout}
            onModeChange={onLayoutChange}
            onGridToggle={onGridToggle}
            gridEnabled={gridEnabled}
            isLoading={isLoading}
          />
        )}
        <ViewSwitcher
          currentMode={viewMode}
          onModeChange={onViewModeChange}
          isLoading={isLoading}
        />
      </div>

      {/* Right section - Active Users + Actions */}
      <div className="flex items-center gap-4">
        {/* Active Users Avatar Stack (Story 1.4) - Now from Context */}
        {remoteUsers.length > 0 && (
          <ActiveUsersAvatarStack
            users={remoteUsers}
            maxVisible={MAX_VISIBLE_AVATARS}
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
          {/* Story 2.4: Notification Bell */}
          <NotificationBell
            unreadCount={unreadCount}
            notifications={notifications}
            isConnected={isConnected}
            isLoading={notificationsLoading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onRefresh={refresh}
            onNavigate={navigateToNode}
          />
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
