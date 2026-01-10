'use client';

/**
 * Story 9.1: Data Library Drawer Component
 * AC#1: Drawer opens from right, 60-70% viewport width, supports drag resize
 * AC#2: Closes on backdrop click, close button, or ESC
 * AC#3: Supports grid/list view toggle and search/filter
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  LayoutGrid,
  List,
  Filter,
  Calendar,
  Database,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { AssetGrid } from './AssetGrid';
import { AssetList } from './AssetList';
import { useDataAssets } from '../hooks/useDataAssets';
import type { DataAssetFormat } from '@cdm/types';

interface DataLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
}

type ViewMode = 'grid' | 'list';

/**
 * Data Library Drawer Component
 * AC#1: Maximized drawer (60-70% width) with drag-to-resize
 * AC#2: Multiple close mechanisms
 * AC#3: View toggle and search/filter
 */
export function DataLibraryDrawer({
  isOpen,
  onClose,
  graphId,
}: DataLibraryDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<DataAssetFormat | ''>('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(65); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Debounce search to avoid request storms when typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Data fetching hook
  const {
    assets,
    isLoading,
    error,
    refetch,
  } = useDataAssets({
    graphId,
    search: debouncedSearchQuery,
    format: formatFilter || undefined,
    createdAfter: createdAfter || undefined,
    createdBefore: createdBefore || undefined,
    enabled: isOpen,
  });

  // Mount effect for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Refetch on open
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // AC#2: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // AC#1: Drag resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const viewportWidth = window.innerWidth;
      const newWidth = ((viewportWidth - e.clientX) / viewportWidth) * 100;

      // Clamp between 30% and 90%
      setDrawerWidth(Math.min(90, Math.max(30, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Format options for filter dropdown
  const formatOptions: { value: DataAssetFormat | ''; label: string }[] = [
    { value: '', label: '全部类型' },
    { value: 'STEP', label: 'STEP' },
    { value: 'IGES', label: 'IGES' },
    { value: 'STL', label: 'STL' },
    { value: 'PDF', label: 'PDF' },
    { value: 'DOCX', label: 'DOCX' },
    { value: 'XLSX', label: 'XLSX' },
    { value: 'JSON', label: 'JSON' },
    { value: 'CSV', label: 'CSV' },
    { value: 'IMAGE', label: '图片' },
    { value: 'VIDEO', label: '视频' },
    { value: 'OTHER', label: '其他' },
  ];

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* AC#2: Backdrop - click to close */}
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        data-testid="data-library-drawer"
        style={{ width: `${drawerWidth}vw` }}
        className={`fixed right-0 top-0 h-full
                   bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl
                   shadow-2xl z-50 flex flex-col border-l border-gray-200/50 dark:border-gray-700/50
                   animate-in slide-in-from-right duration-300
                   ${isResizing ? 'select-none' : ''}`}
      >
        {/* AC#1: Resize Handle */}
        <div
          data-testid="drawer-resize-handle"
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/50 transition-colors group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 -ml-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-8 bg-blue-500 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              数据资源库
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar: Search, Filter, View Toggle */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索"
                className="w-full pl-10 pr-4 py-2.5 text-sm
                         border border-gray-200 dark:border-gray-700
                         rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-shadow shadow-sm"
              />
            </div>

            {/* Format Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as DataAssetFormat | '')}
                aria-label="类型"
                className="pl-9 pr-8 py-2.5 text-sm
                         border border-gray-200 dark:border-gray-700
                         rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         appearance-none cursor-pointer"
              >
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={createdAfter}
                  onChange={(e) => setCreatedAfter(e.target.value)}
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
                  onChange={(e) => setCreatedBefore(e.target.value)}
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
                    setCreatedAfter('');
                    setCreatedBefore('');
                  }}
                  aria-label="清除时间筛选"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                title="网格视图"
                className={`p-2.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="列表视图"
                className={`p-2.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <p className="text-sm font-medium">加载失败: {error}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                重试
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">
                {searchQuery || formatFilter || createdAfter || createdBefore
                  ? '无匹配资产'
                  : '暂无数据资产'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <AssetGrid assets={assets} />
          ) : (
            <AssetList assets={assets} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              共 {assets.length} 个数据资产
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default DataLibraryDrawer;
