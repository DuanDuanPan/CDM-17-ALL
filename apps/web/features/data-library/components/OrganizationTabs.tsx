/**
 * Story 9.2: Organization Tabs Component
 * Story 9.8: Merged PBS and Task tabs into single Node tab
 * Provides tabs to switch between Node (PBS+Task) and Folder organization views
 * AC#5: Remembers last selected tab via localStorage
 */

'use client';

import { useState } from 'react';
import { GitBranch, Folder } from 'lucide-react';
import { cn, Button } from '@cdm/ui';

/**
 * Story 9.8: Organization view type - merged PBS+Task into 'node'
 */
export type OrganizationView = 'node' | 'folder';

interface OrganizationTabsProps {
  /** Current active view */
  activeView: OrganizationView;
  /** Callback when view changes */
  onViewChange: (view: OrganizationView) => void;
}

/**
 * Story 9.8: Tab configuration - 2 tabs instead of 3
 */
const TABS: Array<{
  id: OrganizationView;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
    {
      id: 'node',
      label: '节点（PBS+任务）',
      icon: GitBranch,
      description: '按图谱结构组织',
    },
    {
      id: 'folder',
      label: '文件夹',
      icon: Folder,
      description: '自定义文件夹',
    },
  ];

const STORAGE_KEY_PREFIX = 'cdm-data-library-org-view';

/**
 * Organization Tabs - switches between Node (PBS+Task) and Folder views
 */
export function OrganizationTabs({
  activeView,
  onViewChange,
}: OrganizationTabsProps) {
  return (
    <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
      <div
        data-testid="organization-tabs"
        className="grid grid-cols-2 gap-1 p-1 bg-gray-100/60 dark:bg-gray-800/60 rounded-lg"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <Button
              key={tab.id}
              variant="ghost"
              data-testid={`org-tab-${tab.id}`}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all duration-200 h-auto',
                isActive
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm hover:bg-white dark:hover:bg-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
              onClick={() => onViewChange(tab.id)}
              title={tab.description}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to persist organization view selection
 * Story 9.8: Added migration from 'pbs'/'task' to 'node'
 * AC#5: State persistence using localStorage
 */
export function useOrganizationView(graphId: string): [OrganizationView, (view: OrganizationView) => void] {
  const storageKey = `${STORAGE_KEY_PREFIX}-${graphId}`;

  const [view, setViewState] = useState<OrganizationView>(() => {
    if (typeof window === 'undefined') return 'node';

    try {
      const stored = localStorage.getItem(storageKey);

      // Story 9.8: Migration - convert old 'pbs' or 'task' to 'node'
      if (stored === 'pbs' || stored === 'task') {
        localStorage.setItem(storageKey, 'node');
        return 'node';
      }

      if (stored && ['node', 'folder'].includes(stored)) {
        return stored as OrganizationView;
      }
    } catch {
      // localStorage not available
    }
    return 'node';
  });

  const setView = (newView: OrganizationView) => {
    setViewState(newView);
    try {
      localStorage.setItem(storageKey, newView);
    } catch {
      // localStorage not available
    }
  };

  return [view, setView];
}

export default OrganizationTabs;
