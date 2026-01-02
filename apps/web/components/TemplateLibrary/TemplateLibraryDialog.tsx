'use client';

/**
 * Story 5.1: Template Library Selection Dialog
 * Allows users to browse, preview and select from template library
 *
 * Features:
 * - Search and filter templates
 * - Category-based filtering
 * - Template preview with structure
 * - Create graph from template (instantiation)
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, LayoutTemplate, X, Eye, Loader2, Check, ChevronRight } from 'lucide-react';
import type { TemplateListItem, TemplateCategory, CreateFromTemplateResponse } from '@cdm/types';
import { useTemplates } from '@/hooks/useTemplates';

export interface TemplateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (result: CreateFromTemplateResponse) => void;
    userId: string;
}

export function TemplateLibraryDialog({ open, onOpenChange, onSelect, userId }: TemplateLibraryDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [customGraphName, setCustomGraphName] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const {
        templates,
        categories,
        selectedTemplate,
        isLoading,
        isLoadingTemplate,
        isInstantiating,
        error,
        loadTemplates,
        loadCategories,
        loadTemplate,
        instantiate,
        clearSelectedTemplate,
        clearError,
    } = useTemplates();

    // Load data when dialog opens
    useEffect(() => {
        if (open) {
            loadTemplates();
            loadCategories();
            setSearchQuery('');
            setSelectedCategoryId(null);
            setSelectedTemplateId(null);
            setCustomGraphName('');
            setShowPreview(false);
            clearSelectedTemplate();
            clearError();
        }
    }, [open, loadTemplates, loadCategories, clearSelectedTemplate, clearError]);

    // Search with debounce
    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(() => {
            loadTemplates({
                search: searchQuery || undefined,
                categoryId: selectedCategoryId || undefined,
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategoryId, open, loadTemplates]);

    // Handle category change
    const handleCategoryChange = useCallback((categoryId: string | null) => {
        setSelectedCategoryId(categoryId);
        setSelectedTemplateId(null);
        clearSelectedTemplate();
    }, [clearSelectedTemplate]);

    // Handle template selection
    const handleTemplateClick = useCallback(async (template: TemplateListItem) => {
        setSelectedTemplateId(template.id);
        setCustomGraphName(template.name);
        await loadTemplate(template.id);
    }, [loadTemplate]);

    // Handle preview toggle
    const handlePreviewToggle = useCallback(() => {
        setShowPreview((prev) => !prev);
    }, []);

    // Handle create graph from template
    const handleCreate = useCallback(async () => {
        if (!selectedTemplateId) return;

        try {
            const result = await instantiate(
                selectedTemplateId,
                userId,
                customGraphName ? { name: customGraphName } : undefined
            );
            onSelect(result);
            onOpenChange(false);
        } catch (err) {
            // Error is already handled by the hook
            console.error('[TemplateLibraryDialog] Create failed:', err);
        }
    }, [selectedTemplateId, userId, customGraphName, instantiate, onSelect, onOpenChange]);

    if (!open) return null;

    const selectedTemplateItem = templates.find((t) => t.id === selectedTemplateId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">模板库</h2>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索模板名称或描述..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button
                                onClick={() => handleCategoryChange(null)}
                                className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                                    selectedCategoryId === null
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                全部
                            </button>
                            {categories.map((category: TemplateCategory) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryChange(category.id)}
                                    className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                                        selectedCategoryId === category.id
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {category.icon && <span>{category.icon}</span>}
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Template List (Left) */}
                    <div className={`overflow-y-auto p-4 ${showPreview && selectedTemplate ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
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
                            <div className={`grid gap-3 ${showPreview && selectedTemplate ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateClick(template)}
                                        className={`p-4 text-left rounded-lg border-2 transition-all ${
                                            selectedTemplateId === template.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Thumbnail or Icon */}
                                            <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${
                                                selectedTemplateId === template.id ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                                {template.thumbnail ? (
                                                    <img
                                                        src={template.thumbnail}
                                                        alt={template.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <LayoutTemplate className={`w-8 h-8 ${
                                                        selectedTemplateId === template.id ? 'text-blue-600' : 'text-gray-400'
                                                    }`} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="text-sm font-medium text-gray-900 truncate">
                                                        {template.name}
                                                    </h3>
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
                                                    <span className="text-[10px] text-gray-400">
                                                        使用 {template.usageCount} 次
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview Panel (Right) */}
                    {showPreview && selectedTemplate && (
                        <div className="w-1/2 p-4 overflow-y-auto bg-gray-50">
                            {isLoadingTemplate ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                    <span className="ml-2 text-sm text-gray-500">加载预览...</span>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        模板结构预览
                                    </h3>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                        <TemplateNodePreview node={selectedTemplate.structure.rootNode} depth={0} />
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-xs font-medium text-gray-600 mb-2">模板信息</h4>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <p>创建者: {selectedTemplate.creatorId ?? '系统预置'}</p>
                                            <p>
                                                更新时间:{' '}
                                                {selectedTemplate.updatedAt
                                                    ? new Date(selectedTemplate.updatedAt).toLocaleString('zh-CN')
                                                    : '-'}
                                            </p>
                                            <p>使用次数: {selectedTemplate.usageCount}</p>
                                            <p>版本: {selectedTemplate.version}</p>
                                            <p>默认分类级别: {selectedTemplate.defaultClassification}</p>
                                            {selectedTemplate.requiredFields && selectedTemplate.requiredFields.length > 0 && (
                                                <p>必填字段: {selectedTemplate.requiredFields.join(', ')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-5 py-2 bg-red-50 border-t border-red-100">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">
                            {templates.length} 个模板
                        </div>
                        {selectedTemplateItem && (
                            <button
                                onClick={handlePreviewToggle}
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                                    showPreview
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
                        {/* Custom Graph Name Input */}
                        {selectedTemplateItem && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500">名称:</label>
                                <input
                                    type="text"
                                    value={customGraphName}
                                    onChange={(e) => setCustomGraphName(e.target.value)}
                                    placeholder="图谱名称"
                                    className="w-40 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!selectedTemplateId || isInstantiating}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                selectedTemplateId && !isInstantiating
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isInstantiating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    创建中...
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
            </div>
        </div>
    );
}

/**
 * Template Node Preview Component
 * Renders template structure as a tree
 */
interface TemplateNodePreviewProps {
    node: {
        label: string;
        type?: string;
        children?: TemplateNodePreviewProps['node'][];
    };
    depth: number;
}

function TemplateNodePreview({ node, depth }: TemplateNodePreviewProps) {
    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-gray-200 pl-3' : ''}`}>
            <div className="flex items-center gap-2 py-1">
                <span className={`w-2 h-2 rounded-full ${getNodeTypeColor(node.type)}`} />
                <span className="text-sm text-gray-700">{node.label}</span>
                {node.type && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
                        {getNodeTypeLabel(node.type)}
                    </span>
                )}
            </div>
            {node.children && node.children.length > 0 && (
                <div className="mt-1">
                    {node.children.map((child, index) => (
                        <TemplateNodePreview key={index} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

function getNodeTypeColor(type?: string): string {
    switch (type) {
        case 'TASK':
            return 'bg-green-500';
        case 'REQUIREMENT':
            return 'bg-purple-500';
        case 'PBS':
            return 'bg-blue-500';
        case 'DATA':
            return 'bg-yellow-500';
        case 'APP':
            return 'bg-cyan-500';
        default:
            return 'bg-gray-400';
    }
}

function getNodeTypeLabel(type?: string): string {
    switch (type) {
        case 'TASK':
            return '任务';
        case 'REQUIREMENT':
            return '需求';
        case 'PBS':
            return '产品';
        case 'DATA':
            return '数据';
        case 'APP':
            return '应用';
        default:
            return '普通';
    }
}

export default TemplateLibraryDialog;
