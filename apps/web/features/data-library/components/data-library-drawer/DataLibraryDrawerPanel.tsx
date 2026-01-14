'use client';

/**
 * Story 9.1: Data Library Drawer Panel
 * Story 9.5: Added graphId prop for upload functionality
 * Story 9.9: Added AssetFilterBar integration
 */

import { Database, X } from 'lucide-react';
import { DataLibraryDrawerContent, type DataLibraryDrawerContentProps } from './DataLibraryDrawerContent';
import { DataLibraryDrawerFooter } from './DataLibraryDrawerFooter';
import { DataLibraryDrawerToolbar, type DataLibraryDrawerToolbarProps } from './DataLibraryDrawerToolbar';
import { AssetFilterBar } from '../asset-filter';
import { BindingTargetBanner, SelectedAssetsTray } from '../binding';
import { useDataLibraryBindingOptional } from '../../contexts';
import type { SearchScope } from '../asset-filter/types';
import type { DataAssetFormat } from '@cdm/types';

export interface DataLibraryDrawerPanelProps
  extends DataLibraryDrawerToolbarProps,
  DataLibraryDrawerContentProps {
  drawerWidth: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
  onClose: () => void;

  baseAssetCount: number;
  isMovingAsset: boolean;

  // Story 9.9: Asset filter bar props
  onAssetSearchQueryChange: (query: string) => void;
  onSearchScopeChange: (scope: SearchScope) => void;
  onFormatFilterChange: (format: DataAssetFormat | '') => void;
  onDateRangeChange: (after: string, before: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  isFolderView: boolean;
  disableCurrentNodeScope?: boolean;
}

export function DataLibraryDrawerPanel({
  drawerWidth,
  isResizing,
  onResizeStart,
  onClose,
  baseAssetCount,
  isMovingAsset,
  visibleAssets,
  // Story 9.9: Filter bar props
  assetSearchQuery,
  onAssetSearchQueryChange,
  searchScope,
  onSearchScopeChange,
  formatFilter,
  onFormatFilterChange,
  createdAfter,
  createdBefore,
  onDateRangeChange,
  activeFilterCount,
  onClearFilters,
  isFolderView,
  disableCurrentNodeScope = false,
  // Toolbar props
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
  ...contentProps
}: DataLibraryDrawerPanelProps) {
  const bindingContext = useDataLibraryBindingOptional();

  return (
    <div
      data-testid="data-library-drawer"
      style={{ width: `${drawerWidth}vw` }}
      className={`fixed right-0 top-0 h-full
                 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl
                 shadow-2xl z-50 flex flex-col border-l border-gray-200/50 dark:border-gray-700/50
                 animate-in slide-in-from-right duration-300
                 ${isResizing ? 'select-none' : ''}`}
    >
      <div
        data-testid="drawer-resize-handle"
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/50 transition-colors group"
        onMouseDown={onResizeStart}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 -ml-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1 h-8 bg-blue-500 rounded-full" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">数据资源库</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Story 9.9: Simplified Toolbar (AC1) */}
      <DataLibraryDrawerToolbar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showOrgPanel={showOrgPanel}
        onToggleOrgPanel={onToggleOrgPanel}
        graphId={graphId}
        uploadConfig={uploadConfig}
        onUploadSuccess={onUploadSuccess}
        selectedCount={bindingContext?.isBindingMode ? 0 : selectedCount}
        onBatchDelete={onBatchDelete}
        onOpenTrash={onOpenTrash}
      />

      {bindingContext?.isBindingMode ? (
        <>
          <BindingTargetBanner />
          <SelectedAssetsTray onCloseDrawer={onClose} />
        </>
      ) : null}

      {/* Story 9.9: Asset Filter Bar (AC2) */}
      <AssetFilterBar
        searchQuery={assetSearchQuery}
        onSearchQueryChange={onAssetSearchQueryChange}
        searchScope={searchScope}
        onSearchScopeChange={onSearchScopeChange}
        formatFilter={formatFilter}
        onFormatFilterChange={onFormatFilterChange}
        createdAfter={createdAfter}
        createdBefore={createdBefore}
        onDateRangeChange={onDateRangeChange}
        activeFilterCount={activeFilterCount}
        onClearFilters={onClearFilters}
        disableCurrentNodeScope={disableCurrentNodeScope}
        isFolderView={isFolderView}
      />

      {/* Content */}
      <DataLibraryDrawerContent
        {...contentProps}
        showOrgPanel={showOrgPanel}
        graphId={graphId}
        visibleAssets={visibleAssets}
        assetSearchQuery={assetSearchQuery}
        searchScope={searchScope}
        formatFilter={formatFilter}
        createdAfter={createdAfter}
        createdBefore={createdBefore}
        viewMode={viewMode}
      />

      {/* Footer */}
      <DataLibraryDrawerFooter
        visibleAssetCount={visibleAssets.length}
        baseAssetCount={baseAssetCount}
        isMovingAsset={isMovingAsset}
      />
    </div>
  );
}
