/**
 * Story 9.2: Organization Tabs Component
 * Provides tabs to switch between PBS, Task, and Folder organization views
 * AC#5: Remembers last selected tab via localStorage
 */

'use client';

import { useState } from 'react';
import { Box, ListTodo, Folder } from 'lucide-react';
import { cn, Button } from '@cdm/ui';

/**
 * Organization view type
 */
export type OrganizationView = 'pbs' | 'task' | 'folder';

interface OrganizationTabsProps {
  /** Current active view */
  activeView: OrganizationView;
  /** Callback when view changes */
  onViewChange: (view: OrganizationView) => void;
}

/**
 * Tab configuration
 */
const TABS: Array<{
  id: OrganizationView;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
    {
      id: 'pbs',
      label: 'PBS',
      icon: Box,
      description: '按产品结构组织',
    },
    {
      id: 'task',
      label: '任务',
      icon: ListTodo,
      description: '按任务状态分组',
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
 * Organization Tabs - switches between PBS, Task, and Folder views
 */
export function OrganizationTabs({
  activeView,
  onViewChange,
}: OrganizationTabsProps) {
  return (
    <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
      <div
        data-testid="organization-tabs"
        className="grid grid-cols-3 gap-1 p-1 bg-gray-100/60 dark:bg-gray-800/60 rounded-lg"
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
 * AC#5: State persistence using localStorage
 */
export function useOrganizationView(graphId: string): [OrganizationView, (view: OrganizationView) => void] {
  const storageKey = `${STORAGE_KEY_PREFIX}-${graphId}`;

  const [view, setViewState] = useState<OrganizationView>(() => {
    if (typeof window === 'undefined') return 'pbs';

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['pbs', 'task', 'folder'].includes(stored)) {
        return stored as OrganizationView;
      }
    } catch {
      // localStorage not available
    }
    return 'pbs';
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
