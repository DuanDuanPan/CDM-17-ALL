'use client';

import { Loader2 } from 'lucide-react';
import type { Template } from '@cdm/types';
import { TemplateNodePreview } from './TemplateNodePreview';

export interface TemplateLibraryPreviewPanelProps {
  show: boolean;
  template: Template | null;
  isLoading: boolean;
}

export function TemplateLibraryPreviewPanel({
  show,
  template,
  isLoading,
}: TemplateLibraryPreviewPanelProps) {
  if (!show || !template) return null;

  return (
    <div className="w-1/2 p-4 overflow-y-auto bg-gray-50">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">加载预览...</span>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">模板结构预览</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <TemplateNodePreview node={template.structure.rootNode} depth={0} />
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-600 mb-2">模板信息</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>创建者: {template.creatorId ?? '系统预置'}</p>
              <p>
                更新时间:{' '}
                {template.updatedAt ? new Date(template.updatedAt).toLocaleString('zh-CN') : '-'}
              </p>
              <p>使用次数: {template.usageCount}</p>
              <p>版本: {template.version}</p>
              <p>默认分类级别: {template.defaultClassification}</p>
              {template.requiredFields && template.requiredFields.length > 0 && (
                <p>必填字段: {template.requiredFields.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

