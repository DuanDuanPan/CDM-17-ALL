'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Menu, Search, Share2, Settings, Database } from 'lucide-react';
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
import { GlobalSearchDialog } from '@/components/CommandPalette/GlobalSearchDialog';
import { ArchiveDrawer } from '@/components/ArchiveBox/ArchiveDrawer';
// Story 9.1: Data Library Drawer
import { DataLibraryDrawer } from '@/features/data-library';

export interface TopBarProps {
  userId?: string; // Story 2.4: Current user ID for notifications
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
  userId = 'test1', // Default to test1 if not provided
  projectName = '未命名项目',
  currentLayout = 'mindmap',
  onLayoutChange,
  onGridToggle,
  gridEnabled = false,
  isLoading = false,
  viewMode,
  onViewModeChange,
}: TopBarProps) {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  // Story 9.1: Data Library Drawer state
  const [isDataLibraryOpen, setIsDataLibraryOpen] = useState(false);

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
    hasNewHighPriority,
    clearHighPriorityFlag,
  } = useNotifications({
    userId, // Use dynamic userId passed from props
    // Disable WebSocket in development to prevent console spam when backend isn't running
    // The hook will automatically fall back to polling
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WS === 'true',
    enablePolling: true,
  });

  // Story 4.5: Allow toast action to navigate to node (if graph context is available)
  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const custom = event as CustomEvent<{ nodeId?: string }>;
      if (custom.detail?.nodeId) {
        navigateToNode?.(custom.detail.nodeId);
      }
    };

    window.addEventListener('notification:navigate', handleNavigate);
    return () => {
      window.removeEventListener('notification:navigate', handleNavigate);
    };
  }, [navigateToNode]);

  const handleSearchSelect = useCallback(
    (nodeId: string) => {
      navigateToNode?.(nodeId);
    },
    [navigateToNode]
  );

  // Story 2.7: Simplified - ArchiveDrawer now handles Yjs sync and X6 visibility
  // This callback only needs to navigate to the restored node
  const handleArchiveRestore = useCallback(
    (nodeId: string) => {
      navigateToNode?.(nodeId);
    },
    [navigateToNode]
  );

  // Story 9.1: Keyboard shortcut Cmd/Ctrl + D to open Data Library
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isE2E =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('e2e') === '1';

      const target = e.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (isEditableTarget) return;

      // E2E helper shortcut: Alt + D (avoids browser-reserved Cmd/Ctrl+D behavior)
      if (isE2E && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDataLibraryOpen(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault(); // Prevent browser bookmark
        setIsDataLibraryOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <GlobalSearchDialog
          onSelect={handleSearchSelect}
          graphId={graphContext?.graphId || undefined}
        />
        <ArchiveDrawer
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          graphId={graphContext?.graphId || undefined}
          onRestore={handleArchiveRestore}
        />
        {/* Story 9.1: Data Library Drawer */}
        <DataLibraryDrawer
          isOpen={isDataLibraryOpen}
          onClose={() => setIsDataLibraryOpen(false)}
          graphId={graphContext?.graphId || ''}
        />

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
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('mindmap:open-search'))}
            aria-label="搜索 (Cmd/Ctrl+K)"
          >
            <Search className="w-4 h-4 text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsArchiveOpen(true)}
            aria-label="归档箱"
          >
            <Archive className="w-4 h-4 text-gray-600" />
          </button>
          {/* Story 9.1: Data Library Button */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsDataLibraryOpen(true)}
            aria-label="数据资源库 (Cmd/Ctrl+D)"
            title="数据资源库"
          >
            <Database className="w-4 h-4 text-gray-600" />
          </button>
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
            hasNewHighPriority={hasNewHighPriority}
            onClearHighPriority={clearHighPriorityFlag}
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
