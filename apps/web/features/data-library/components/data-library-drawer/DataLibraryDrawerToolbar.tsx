'use client';

/**
 * Story 9.9: Data Library Drawer Toolbar (Redesigned)
 * AC1: Toolbar精简（操作类聚焦）
 * 
 * Contains only action controls:
 * - Upload button (context-aware)
 * - Batch delete button (conditional)
 * - Trash button
 * - View mode toggle (grid/list)
 * - Organization panel toggle
 * 
 * Height ≤ 56px, controls ≤ 6
 */

import {
  LayoutGrid,
  List,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from 'lucide-react';
import { ContextAwareUploadButton } from '../ContextAwareUploadButton';
import type { ContextAwareUploadConfig } from '../../hooks/useContextAwareUpload';
import { Button } from '@cdm/ui';
import type { ViewMode } from './types';

export interface DataLibraryDrawerToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (next: ViewMode) => void;

  showOrgPanel: boolean;
  onToggleOrgPanel: () => void;

  // Story 9.7: Context-aware upload props
  graphId: string;
  uploadConfig: ContextAwareUploadConfig;
  onUploadSuccess?: () => void;

  // Story 9.8: Batch delete + trash
  selectedCount: number;
  onBatchDelete: () => void;
  onOpenTrash: () => void;
}

export function DataLibraryDrawerToolbar({
  viewMode,
  onViewModeChange,
  showOrgPanel,
  onToggleOrgPanel,
  graphId,
  uploadConfig,
  onUploadSuccess,
  selectedCount,
  onBatchDelete,
  onOpenTrash,
}: DataLibraryDrawerToolbarProps) {
  return (
    <div
      className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 h-14"
      data-testid="toolbar"
    >
      <div className="flex items-center gap-3">
        {/* Story 9.7: Context-Aware Upload Button */}
        <ContextAwareUploadButton
          graphId={graphId}
          uploadConfig={uploadConfig}
          onUploadComplete={onUploadSuccess}
        />

        {/* AC1: Batch delete button (conditional display) */}
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBatchDelete}
            className="whitespace-nowrap"
            data-testid="batch-delete-button"
          >
            <Trash2 className="w-4 h-4" />
            删除 ({selectedCount})
          </Button>
        )}

        {/* AC1: Trash button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTrash}
          className="whitespace-nowrap"
          title="回收站"
          data-testid="trash-button"
        >
          <Trash2 className="w-4 h-4" />
          回收站
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* AC1: View mode toggle */}
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            title="网格视图"
            className={`p-2.5 transition-colors ${viewMode === 'grid'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            data-testid="view-mode-grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="列表视图"
            className={`p-2.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${viewMode === 'list'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            data-testid="view-mode-list"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* AC1: Organization panel toggle */}
        <button
          type="button"
          onClick={onToggleOrgPanel}
          title={showOrgPanel ? '隐藏组织面板' : '显示组织面板'}
          className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700
                     transition-colors"
          data-testid="toggle-org-panel"
        >
          {showOrgPanel ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
