'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@cdm/ui';
import type { DataLinkType } from '@cdm/types';
import { useDataLibraryBinding } from '../../contexts';
import { useBatchAssetBinding } from '../../hooks/useBatchAssetBinding';
import { AssetTrayItem } from './AssetTrayItem';
import { LINK_TYPE_OPTIONS } from '../../utils/linkAssetDialog';

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
  const [selectedLinkType, setSelectedLinkType] = useState<DataLinkType>('reference');

  // M2 fix: consume isBinding to prevent double-clicks
  const { isBinding } = useBatchAssetBinding();

  const selectedAssets = useMemo(() => Array.from(selectedAssetsById.values()), [selectedAssetsById]);
  const count = selectedAssetIds.size;
  const canConfirm = isBindingMode && !!targetNodeId && count > 0 && !isBinding;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    try {
      await confirmBinding({ linkType: selectedLinkType });
      clearSelection();
      exitBindingMode();
      onCloseDrawer?.();
    } catch {
      // Error toast is handled by the binding hook; keep selection for retry
    }
  }, [canConfirm, clearSelection, confirmBinding, exitBindingMode, onCloseDrawer, selectedLinkType]);

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
          aria-expanded={expanded}
          aria-controls="selected-assets-tray-panel"
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
          className={`text-xs font-medium transition-colors ${count === 0
              ? 'text-slate-400 cursor-not-allowed opacity-50'
              : 'text-red-500 hover:text-red-600 cursor-pointer'
            }`}
          onClick={clearSelection}
          disabled={count === 0}
          aria-disabled={count === 0}
        >
          清空全部
        </button>
      </div>

      <div
        id="selected-assets-tray-panel"
        aria-hidden={!expanded}
        className={`transition-all duration-200 overflow-hidden ${expanded ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="overflow-y-auto p-2 space-y-1">
          {selectedAssets.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">还没有选择任何资产</div>
          ) : (
            selectedAssets.map((asset) => (
              <AssetTrayItem key={asset.id} asset={asset} onRemove={removeAsset} />
            ))
          )}
        </div>
      </div>

      {/* Link Type Selector */}
      <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs font-medium text-slate-500 mb-2">绑定类型</div>
        <div className="flex gap-2" role="radiogroup" aria-label="绑定类型" data-testid="link-type-selector">
          {LINK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selectedLinkType === opt.value}
              data-testid={`link-type-${opt.value}`}
              onClick={() => setSelectedLinkType(opt.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${selectedLinkType === opt.value
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          data-testid="tray-confirm"
          onClick={handleConfirm}
          disabled={!canConfirm}
          aria-disabled={!canConfirm}
          className={`w-full h-10 font-medium rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${canConfirm
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
