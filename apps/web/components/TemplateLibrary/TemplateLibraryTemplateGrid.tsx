'use client';

import { Check, GripVertical, LayoutTemplate, Loader2 } from 'lucide-react';
import type { TemplateListItem } from '@cdm/types';

export interface TemplateLibraryTemplateGridProps {
  templates: TemplateListItem[];
  isLoading: boolean;
  isSplitView: boolean;
  selectedTemplateId: string | null;
  enableDragDrop: boolean;
  onTemplateClick: (template: TemplateListItem) => void;
  onDragStart: (e: React.DragEvent, template: TemplateListItem) => void;
}

export function TemplateLibraryTemplateGrid({
  templates,
  isLoading,
  isSplitView,
  selectedTemplateId,
  enableDragDrop,
  onTemplateClick,
  onDragStart,
}: TemplateLibraryTemplateGridProps) {
  return (
    <div
      className={`overflow-y-auto p-4 ${isSplitView ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">加载中...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <LayoutTemplate className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm">未找到匹配的模板</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${isSplitView ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateClick(template)}
              draggable={enableDragDrop}
              onDragStart={(e) => onDragStart(e, template)}
              className={`p-4 text-left rounded-lg border-2 transition-all cursor-pointer ${
                selectedTemplateId === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              } ${enableDragDrop ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="flex items-start gap-3">
                {enableDragDrop && (
                  <div className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    selectedTemplateId === template.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <LayoutTemplate
                      className={`w-8 h-8 ${
                        selectedTemplateId === template.id ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{template.name}</h3>
                    {selectedTemplateId === template.id && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {template.categoryName && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded flex items-center gap-1">
                        {template.categoryIcon && <span>{template.categoryIcon}</span>}
                        {template.categoryName}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">使用 {template.usageCount} 次</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

