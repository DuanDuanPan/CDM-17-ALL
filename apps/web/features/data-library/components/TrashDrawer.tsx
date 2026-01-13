'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { useTrashAssets } from '../hooks/useTrashAssets';
import { useAssetDelete } from '../hooks/useAssetDelete';
import { TrashAssetRow } from './TrashAssetRow';

interface TrashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
}

export function TrashDrawer({ isOpen, onClose, graphId }: TrashDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { assets, isLoading, error, refetch } = useTrashAssets(graphId, isOpen);
  const assetDelete = useAssetDelete(graphId);

  // Refresh on open (in case assets were deleted/restored elsewhere)
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  const count = useMemo(() => assets.length, [assets.length]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        style={{ zIndex: 60 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[420px]',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'shadow-2xl flex flex-col border-l border-gray-200/50 dark:border-gray-700/50',
          'animate-in slide-in-from-right duration-300'
        )}
        style={{ zIndex: 70 }}
        data-testid="trash-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">回收站</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭回收站"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">共 {count} 个资产</div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => assetDelete.confirmEmptyTrash(count)}
            disabled={count === 0 || assetDelete.isDeleting}
          >
            <Trash2 className="w-4 h-4" />
            清空回收站
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <p className="text-sm font-medium">加载失败: {error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Trash2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset) => (
                <TrashAssetRow
                  key={asset.id}
                  asset={asset}
                  onRestore={async () => {
                    const res = await assetDelete.restore(asset.id);
                    if (res?.success) {
                      // React Query invalidation happens in hook; refresh list for snappy UX
                      refetch();
                    }
                  }}
                  onHardDelete={() =>
                    assetDelete.confirmHardDelete(asset, asset.linkedNodeCount, { onSuccess: refetch })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

export default TrashDrawer;

