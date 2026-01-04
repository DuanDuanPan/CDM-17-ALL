'use client';

import { Eye, EyeOff, Globe, LayoutTemplate, Lock } from 'lucide-react';
import type { TemplateCategory, TemplateStructure } from '@cdm/types';
import { TemplateNodePreview } from './TemplateNodePreview';

export interface SaveTemplateDialogContentProps {
  nodeCount: number;
  edgeCount: number;
  addedDescendants?: number; // Number of auto-included descendant nodes
  name: string;
  nameError: string | null;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  categories: TemplateCategory[];
  categoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  isPublic: boolean;
  onVisibilityChange: (isPublic: boolean) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  structure: TemplateStructure;
}

export function SaveTemplateDialogContent({
  nodeCount,
  edgeCount,
  addedDescendants,
  name,
  nameError,
  onNameChange,
  onNameBlur,
  description,
  onDescriptionChange,
  categories,
  categoryId,
  onCategoryChange,
  isPublic,
  onVisibilityChange,
  showPreview,
  onTogglePreview,
  structure,
}: SaveTemplateDialogContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Selection Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <LayoutTemplate className="w-4 h-4" />
          <span>
            共 <strong>{nodeCount}</strong> 个节点
            {addedDescendants !== undefined && addedDescendants > 0 && (
              <span className="text-blue-600">（已自动包含 {addedDescendants} 个子节点）</span>
            )}
            {edgeCount > 0 && (
              <>
                ，包含 <strong>{edgeCount}</strong> 条依赖关系
              </>
            )}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模板名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            placeholder="输入模板名称..."
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${nameError
                ? 'border-red-300 focus:ring-red-200'
                : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            autoFocus
          />
          {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="简要描述此模板的用途..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">
            {description.length}/500
          </p>
        </div>

        {/* Category Selection */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange(null)}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${categoryId === null
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                未分类
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${categoryId === category.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {category.icon && <span>{category.icon}</span>}
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visibility Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">可见性</label>
          <div className="flex gap-3">
            <button
              onClick={() => onVisibilityChange(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${isPublic
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              <Globe className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">公开</div>
                <div className="text-[10px] opacity-70">所有人可见</div>
              </div>
            </button>
            <button
              onClick={() => onVisibilityChange(false)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${!isPublic
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              <Lock className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">私有</div>
                <div className="text-[10px] opacity-70">仅自己可见</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Toggle */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? '隐藏结构预览' : '显示结构预览'}
        </button>

        {showPreview && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
            <TemplateNodePreview node={structure.rootNode} depth={0} />
          </div>
        )}
      </div>
    </div>
  );
}

