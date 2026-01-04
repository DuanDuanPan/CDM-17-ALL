'use client';
/**
 * Story 5.1: Template Library Selection Dialog
 * Story 5.2: Enhanced with "My Templates" tab and drag-drop support
 *
 * Features:
 * - Search and filter templates
 * - Category-based filtering
 * - "My Templates" tab (Story 5.2)
 * - Template preview with structure
 * - Create graph from template (instantiation)
 * - Drag templates to insert into graph (Story 5.2)
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, LayoutTemplate, X, User, Globe } from 'lucide-react';
import type { TemplateListItem, TemplateCategory, CreateFromTemplateResponse, Template } from '@cdm/types';
import { useTemplates } from '@/hooks/useTemplates';
import { TemplateLibraryFooter } from './TemplateLibraryFooter';
import { TemplateLibraryPreviewPanel } from './TemplateLibraryPreviewPanel';
import { TemplateLibraryTemplateGrid } from './TemplateLibraryTemplateGrid';
export interface TemplateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (result: CreateFromTemplateResponse) => void;
    userId: string;
    /** Story 5.2: Enable drag-drop mode for inserting templates into existing graph */
    enableDragDrop?: boolean;
    /** Story 5.2: Callback when a drag starts (typically to close the dialog) */
    onTemplateDragStart?: () => void;
    /** Story 5.2 Fix: Mode for template usage - 'create' creates new graph, 'insert' inserts into current graph */
    mode?: 'create' | 'insert';
    /** Story 5.2 Fix: Callback when inserting template (mode='insert'). Receives full template with structure. */
    onInsertTemplate?: (template: Template) => void;
}

export function TemplateLibraryDialog({
    open,
    onOpenChange,
    onSelect,
    userId,
    enableDragDrop = false,
    onTemplateDragStart,
    mode = 'create',
    onInsertTemplate,
}: TemplateLibraryDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    // Story 5.2: Tab state for "All" vs "My Templates"
    const [showMyTemplates, setShowMyTemplates] = useState(false);
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
            loadTemplates({ userId }); // Story 5.2: Include userId for visibility filtering
            loadCategories();
            setSearchQuery('');
            setSelectedCategoryId(null);
            setSelectedTemplateId(null);
            setCustomGraphName('');
            setShowPreview(false);
            setShowMyTemplates(false); // Story 5.2: Reset tab
            clearSelectedTemplate();
            clearError();
        }
    }, [open, userId, loadTemplates, loadCategories, clearSelectedTemplate, clearError]);

    // Search with debounce - Story 5.2: Added mine filter support
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            loadTemplates({
                search: searchQuery || undefined,
                categoryId: selectedCategoryId || undefined,
                userId, // Story 5.2: Always include userId for visibility
                mine: showMyTemplates || undefined, // Story 5.2: Filter to my templates
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategoryId, showMyTemplates, userId, open, loadTemplates]);

    // Handle category change
    const handleCategoryChange = useCallback((categoryId: string | null) => {
        setSelectedCategoryId(categoryId);
        setSelectedTemplateId(null);
        clearSelectedTemplate();
    }, [clearSelectedTemplate]);

    // Story 5.2: Handle tab change for My Templates
    const handleTabChange = useCallback((myTemplates: boolean) => {
        setShowMyTemplates(myTemplates);
        setSelectedCategoryId(null);
        setSelectedTemplateId(null);
        clearSelectedTemplate();
    }, [clearSelectedTemplate]);

    // Story 5.2: Handle drag start for template insertion
    // Note: dragstart must be synchronous; fetch template details on drop.
    const handleDragStart = useCallback(
        (e: React.DragEvent, template: TemplateListItem) => {
            if (!enableDragDrop) return;
            e.dataTransfer.setData(
                'application/json',
                JSON.stringify({
                    type: 'template',
                    templateId: template.id,
                })
            );
            e.dataTransfer.effectAllowed = 'copy';
            onTemplateDragStart?.();
        },
        [enableDragDrop, onTemplateDragStart]
    );

    // Handle template selection
    const handleTemplateClick = useCallback(async (template: TemplateListItem) => {
        setSelectedTemplateId(template.id);
        setCustomGraphName(template.name);
        await loadTemplate(template.id, userId);
    }, [loadTemplate, userId]);

    // Handle preview toggle
    const handlePreviewToggle = useCallback(() => {
        setShowPreview((prev) => !prev);
    }, []);

    // Handle create graph from template OR insert into existing graph
    const handleCreate = useCallback(async () => {
        if (!selectedTemplateId) return;

        try {
            // Story 5.2 Fix: In insert mode, call onInsertTemplate with full template
            if (mode === 'insert' && onInsertTemplate && selectedTemplate) {
                onInsertTemplate(selectedTemplate);
                onOpenChange(false);
                return;
            }

            // Default: Create new graph from template
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
    }, [selectedTemplateId, userId, customGraphName, instantiate, onSelect, onOpenChange, mode, onInsertTemplate, selectedTemplate]);

    if (!open) return null;

    const selectedTemplateItem = templates.find((t) => t.id === selectedTemplateId);
    const isSplitView = showPreview && !!selectedTemplate;

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

                {/* Story 5.2: Tabs for All vs My Templates */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => handleTabChange(false)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${!showMyTemplates
                            ? 'text-blue-600 border-blue-500'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        全部模板
                    </button>
                    <button
                        onClick={() => handleTabChange(true)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${showMyTemplates
                            ? 'text-blue-600 border-blue-500'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        我的模板
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

                    {/* Category Filter - Only show for "All Templates" tab */}
                    {!showMyTemplates && categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button
                                onClick={() => handleCategoryChange(null)}
                                className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${selectedCategoryId === null
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
                                    className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${selectedCategoryId === category.id
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
                    <TemplateLibraryTemplateGrid
                        templates={templates}
                        isLoading={isLoading}
                        isSplitView={isSplitView}
                        selectedTemplateId={selectedTemplateId}
                        enableDragDrop={enableDragDrop}
                        onTemplateClick={handleTemplateClick}
                        onDragStart={handleDragStart}
                    />

                    <TemplateLibraryPreviewPanel
                        show={showPreview}
                        template={selectedTemplate}
                        isLoading={isLoadingTemplate}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-5 py-2 bg-red-50 border-t border-red-100">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <TemplateLibraryFooter
                    templateCount={templates.length}
                    selectedTemplateId={selectedTemplateId}
                    selectedTemplateItem={selectedTemplateItem}
                    showPreview={showPreview}
                    onTogglePreview={handlePreviewToggle}
                    customGraphName={customGraphName}
                    onCustomGraphNameChange={setCustomGraphName}
                    isInstantiating={isInstantiating}
                    onCancel={() => onOpenChange(false)}
                    onCreate={handleCreate}
                    mode={mode}
                />
            </div>
        </div>
    );
}

export default TemplateLibraryDialog;
