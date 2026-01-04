'use client';

import { ChevronRight, Download, Eye, Loader2 } from 'lucide-react';
import type { TemplateListItem } from '@cdm/types';

export interface TemplateLibraryFooterProps {
  templateCount: number;
  selectedTemplateId: string | null;
  selectedTemplateItem?: TemplateListItem;
  showPreview: boolean;
  onTogglePreview: () => void;
  customGraphName: string;
  onCustomGraphNameChange: (value: string) => void;
  isInstantiating: boolean;
  onCancel: () => void;
  onCreate: () => void;
  /** Story 5.2 Fix: Mode determines button text and behavior */
  mode?: 'create' | 'insert';
}

export function TemplateLibraryFooter({
  templateCount,
  selectedTemplateId,
  selectedTemplateItem,
  showPreview,
  onTogglePreview,
  customGraphName,
  onCustomGraphNameChange,
  isInstantiating,
  onCancel,
  onCreate,
  mode = 'create',
}: TemplateLibraryFooterProps) {
  const canCreate = !!selectedTemplateId && !isInstantiating;
  const isInsertMode = mode === 'insert';

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="text-xs text-gray-500">{templateCount} 个模板</div>
        {selectedTemplateItem && (
          <button
            onClick={onTogglePreview}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${showPreview
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
          >
            <Eye className="w-3 h-3" />
            {showPreview ? '隐藏预览' : '预览结构'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Only show name input in create mode (not insert mode) */}
        {selectedTemplateItem && !isInsertMode && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">名称:</label>
            <input
              type="text"
              value={customGraphName}
              onChange={(e) => onCustomGraphNameChange(e.target.value)}
              placeholder="图谱名称"
              className="w-40 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={onCreate}
          disabled={!canCreate}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${canCreate
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          {isInstantiating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isInsertMode ? '导入中...' : '创建中...'}
            </>
          ) : isInsertMode ? (
            <>
              <Download className="w-4 h-4" />
              导入
            </>
          ) : (
            <>
              从模板创建
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}


