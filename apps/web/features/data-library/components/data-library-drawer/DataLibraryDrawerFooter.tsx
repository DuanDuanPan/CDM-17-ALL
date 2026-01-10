'use client';

import { Loader2 } from 'lucide-react';

export interface DataLibraryDrawerFooterProps {
  visibleAssetCount: number;
  baseAssetCount: number;
  isMovingAsset: boolean;
}

export function DataLibraryDrawerFooter({
  visibleAssetCount,
  baseAssetCount,
  isMovingAsset,
}: DataLibraryDrawerFooterProps) {
  return (
    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          共 {visibleAssetCount} 个数据资产
          {visibleAssetCount !== baseAssetCount && (
            <span className="text-gray-400"> (筛选自 {baseAssetCount} 个)</span>
          )}
        </span>
        {isMovingAsset && (
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            移动中...
          </span>
        )}
      </div>
    </div>
  );
}

