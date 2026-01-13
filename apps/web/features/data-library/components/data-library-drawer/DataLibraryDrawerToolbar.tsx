'use client';

/**
 * Story 9.1: Data Library Drawer Toolbar
 * Story 9.5: Added UploadButton integration
 * Story 9.7: Replaced with ContextAwareUploadButton
 */

import {
  X,
  Search,
  LayoutGrid,
  List,
  Filter,
  Calendar,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from 'lucide-react';
import { DATA_ASSET_FORMAT_OPTIONS } from './formatOptions';
import { ContextAwareUploadButton } from '../ContextAwareUploadButton';
import type { ContextAwareUploadConfig } from '../../hooks/useContextAwareUpload';
import { Button } from '@cdm/ui';
import type { DataAssetFormat } from '@cdm/types';
import type { ViewMode } from './types';

export interface DataLibraryDrawerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;

  formatFilter: DataAssetFormat | '';
  onFormatFilterChange: (next: DataAssetFormat | '') => void;

  createdAfter: string;
  onCreatedAfterChange: (next: string) => void;
  createdBefore: string;
  onCreatedBeforeChange: (next: string) => void;

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
  searchQuery,
  onSearchQueryChange,
  formatFilter,
  onFormatFilterChange,
  createdAfter,
  onCreatedAfterChange,
  createdBefore,
  onCreatedBeforeChange,
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
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-4">
        {/* Story 9.7: Context-Aware Upload Button */}
        <ContextAwareUploadButton
          graphId={graphId}
          uploadConfig={uploadConfig}
          onUploadComplete={onUploadSuccess}
        />

        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBatchDelete}
            className="whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            删除 ({selectedCount})
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTrash}
          className="whitespace-nowrap"
          title="回收站"
        >
          <Trash2 className="w-4 h-4" />
          回收站
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="搜索"
            className="w-full pl-10 pr-4 py-2.5 text-sm
                       border border-gray-200 dark:border-gray-700
                       rounded-lg bg-white dark:bg-gray-800
                       text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       transition-shadow shadow-sm"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={formatFilter}
            onChange={(e) => onFormatFilterChange(e.target.value as DataAssetFormat | '')}
            aria-label="类型"
            className="pl-9 pr-8 py-2.5 text-sm
                       border border-gray-200 dark:border-gray-700
                       rounded-lg bg-white dark:bg-gray-800
                       text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       appearance-none cursor-pointer"
          >
            {DATA_ASSET_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={createdAfter}
              onChange={(e) => onCreatedAfterChange(e.target.value)}
              aria-label="开始日期"
              className="pl-9 pr-3 py-2.5 text-sm
                         border border-gray-200 dark:border-gray-700
                         rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-gray-400">-</span>
          <div className="relative">
            <input
              type="date"
              value={createdBefore}
              onChange={(e) => onCreatedBeforeChange(e.target.value)}
              aria-label="结束日期"
              className="px-3 py-2.5 text-sm
                         border border-gray-200 dark:border-gray-700
                         rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {(createdAfter || createdBefore) && (
            <button
              type="button"
              onClick={() => {
                onCreatedAfterChange('');
                onCreatedBeforeChange('');
              }}
              aria-label="清除时间筛选"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            title="网格视图"
            className={`p-2.5 transition-colors ${viewMode === 'grid'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
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
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleOrgPanel}
          title={showOrgPanel ? '隐藏组织面板' : '显示组织面板'}
          className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700
                     transition-colors"
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
