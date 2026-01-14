'use client';

import { X } from 'lucide-react';
import { Button, Badge } from '@cdm/ui';
import type { SelectedAssetSummary } from '../../contexts';

export interface AssetTrayItemProps {
  asset: SelectedAssetSummary;
  onRemove: (assetId: string) => void;
}

export function AssetTrayItem({ asset, onRemove }: AssetTrayItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-slate-100/70 dark:hover:bg-slate-800/60">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-slate-800 dark:text-slate-100" title={asset.name}>
          {asset.name}
        </div>
        <div className="mt-0.5">
          <Badge variant="outline" className="px-1 py-0 text-[10px] uppercase">
            {asset.format}
          </Badge>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="移除"
        title="移除"
        onClick={() => onRemove(asset.id)}
        className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default AssetTrayItem;

