'use client';

/**
 * Story 5.2: Template Card Mini Component
 * Story 5.3: Added delete button for user-created templates
 * Compact, draggable template card for sidebar display.
 */

import type { TemplateListItem, Template } from '@cdm/types';
import { MiniTreePreview } from './MiniTreePreview';
import { LayoutGrid, Trash2, Loader2 } from 'lucide-react';

export interface TemplateCardMiniProps {
    template: TemplateListItem;
    /** Full template data with structure (loaded on demand) */
    fullTemplate?: Template | null;
    /** Whether structure is loading */
    isLoadingStructure?: boolean;
    onDragStart: (e: React.DragEvent, template: TemplateListItem) => void;
    onClick?: (template: TemplateListItem) => void;
    /** Story 5.3: Current user ID for delete authorization */
    currentUserId?: string;
    /** Story 5.3: Delete callback */
    onDelete?: (templateId: string) => void;
    /** Story 5.3: Whether delete is in progress */
    isDeleting?: boolean;
}

export function TemplateCardMini({
    template,
    fullTemplate,
    isLoadingStructure = false,
    onDragStart,
    onClick,
    currentUserId,
    onDelete,
    isDeleting = false,
}: TemplateCardMiniProps) {
    // Story 5.3: Check if current user can delete this template
    const canDelete = currentUserId && template.creatorId === currentUserId;
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                type: 'template',
                templateId: template.id,
            })
        );
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(e, template);
    };

    // Story 5.3: Handle delete with confirmation
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering onClick
        e.preventDefault();
        if (isDeleting) return;

        // Simple confirmation dialog
        if (window.confirm(`确定要删除模板 "${template.name}" 吗？此操作不可撤销。`)) {
            onDelete?.(template.id);
        }
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onClick?.(template)}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing border border-gray-200 transition-all hover:shadow-sm"
        >
            {/* Header: Name and Delete */}
            <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-sm text-gray-800 truncate flex-1">
                    {template.name}
                </span>
                {/* Story 5.3: Delete button for user-created templates */}
                {canDelete && onDelete && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-shrink-0 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除模板"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                    </button>
                )}
            </div>

            {/* Mini tree preview or placeholder */}
            <div className="min-h-[32px]">
                {isLoadingStructure ? (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                        <span>加载中...</span>
                    </div>
                ) : fullTemplate?.structure ? (
                    <MiniTreePreview structure={fullTemplate.structure} maxDepth={1} maxChildren={2} />
                ) : (
                    <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <div className="w-1.5 h-px bg-gray-300" />
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <div className="w-1.5 h-px bg-gray-300" />
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                )}
            </div>

            {/* Footer: Usage count */}
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400">
                    使用 {template.usageCount ?? 0} 次
                </span>
            </div>
        </div>
    );
}

export default TemplateCardMini;
