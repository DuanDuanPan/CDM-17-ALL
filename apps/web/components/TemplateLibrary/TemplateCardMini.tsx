'use client';

/**
 * Story 5.2: Template Card Mini Component
 * Compact, draggable template card for sidebar display.
 */

import type { TemplateListItem, Template } from '@cdm/types';
import { MiniTreePreview } from './MiniTreePreview';
import { LayoutGrid } from 'lucide-react';

export interface TemplateCardMiniProps {
    template: TemplateListItem;
    /** Full template data with structure (loaded on demand) */
    fullTemplate?: Template | null;
    /** Whether structure is loading */
    isLoadingStructure?: boolean;
    onDragStart: (e: React.DragEvent, template: TemplateListItem) => void;
    onClick?: (template: TemplateListItem) => void;
}

export function TemplateCardMini({
    template,
    fullTemplate,
    isLoadingStructure = false,
    onDragStart,
    onClick,
}: TemplateCardMiniProps) {
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

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onClick?.(template)}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing border border-gray-200 transition-all hover:shadow-sm"
        >
            {/* Header: Name */}
            <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-sm text-gray-800 truncate">
                    {template.name}
                </span>
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
