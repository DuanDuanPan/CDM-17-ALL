'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { formatFileSize } from '../utils/formatFileSize';
import type { TrashAsset } from '../api/data-assets';

export interface TrashAssetRowProps {
  asset: TrashAsset;
  onRestore: () => void;
  onHardDelete: () => void;
}

export function TrashAssetRow({ asset, onRestore, onHardDelete }: TrashAssetRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        'bg-white dark:bg-gray-900',
        'border border-gray-100 dark:border-gray-800 rounded-lg'
      )}
      data-testid="trash-asset-row"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {asset.name}
          </span>
          <span className="shrink-0 inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded">
            {asset.format}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
          {asset.folder?.name && <span>📁 {asset.folder.name}</span>}
          <span>{formatFileSize(asset.fileSize)}</span>
          <span>关联节点：{asset.linkedNodeCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onRestore}
          title="恢复"
          data-testid="trash-restore"
        >
          <RotateCcw className="w-4 h-4" />
          恢复
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onHardDelete}
          title="永久删除"
          data-testid="trash-hard-delete"
        >
          <Trash2 className="w-4 h-4" />
          永久删除
        </Button>
      </div>
    </div>
  );
}

export default TrashAssetRow;

