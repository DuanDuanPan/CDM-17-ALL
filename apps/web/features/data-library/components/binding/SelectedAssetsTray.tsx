'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@cdm/ui';
import { useDataLibraryBinding } from '../../contexts';
import { AssetTrayItem } from './AssetTrayItem';

export interface SelectedAssetsTrayProps {
  onCloseDrawer?: () => void;
}

export function SelectedAssetsTray({ onCloseDrawer }: SelectedAssetsTrayProps) {
  const {
    isBindingMode,
    targetNodeId,
    selectedAssetIds,
    selectedAssetsById,
    removeAsset,
    clearSelection,
    confirmBinding,
    exitBindingMode,
  } = useDataLibraryBinding();

  const [expanded, setExpanded] = useState(false);

  const selectedAssets = useMemo(() => Array.from(selectedAssetsById.values()), [selectedAssetsById]);
  const count = selectedAssetIds.size;
  const canConfirm = isBindingMode && !!targetNodeId && count > 0;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    try {
      await confirmBinding();
      clearSelection();
      exitBindingMode();
      onCloseDrawer?.();
    } catch {
      // Error toast is handled by the binding hook; keep selection for retry
    }
  }, [canConfirm, clearSelection, confirmBinding, exitBindingMode, onCloseDrawer]);

  if (!isBindingMode) return null;

  return (
    <div
      data-testid="selected-assets-tray"
      className="fixed bottom-6 right-6 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300"
    >
      <div className="h-10 px-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          data-testid="tray-toggle"
          className="flex items-center gap-2 min-w-0"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? '收起已选资产' : '展开已选资产'}
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            已选资产 ({count})
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <button
          type="button"
          data-testid="tray-clear-all"
          className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors"
          onClick={clearSelection}
          disabled={count === 0}
          aria-disabled={count === 0}
        >
          清空
        </button>
      </div>

      <div
        className={`transition-all duration-200 overflow-hidden ${
          expanded ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {selectedAssets.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">还没有选择任何资产</div>
          ) : (
            selectedAssets.map((asset) => (
              <AssetTrayItem key={asset.id} asset={asset} onRemove={removeAsset} />
            ))
          )}
        </div>
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          data-testid="tray-confirm"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`w-full h-10 font-medium rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
            canConfirm
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              : 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400 shadow-none'
          }`}
        >
          确认绑定 ({count})
        </Button>
      </div>
    </div>
  );
}

export default SelectedAssetsTray;
