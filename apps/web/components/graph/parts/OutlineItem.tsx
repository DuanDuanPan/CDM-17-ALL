'use client';

import React, { memo } from 'react';
import { ChevronRight, ChevronDown, Circle, CheckSquare, Box, FileText, Database } from 'lucide-react';
import { NodeType } from '@cdm/types';
import { cn } from '@cdm/ui';
import type { OutlineNode } from '../hooks/useOutlineData';

/** Drop position relative to target node */
type DropPosition = 'above' | 'below' | 'inside' | null;

interface OutlineItemProps {
    node: OutlineNode;
    isSelected: boolean;
    isExpanded: boolean;
    onClick: (nodeId: string) => void;
    onToggle: (nodeId: string) => void;
    onDragStart: (e: React.DragEvent, nodeId: string) => void;
    onDragOver: (e: React.DragEvent, nodeId: string) => void;
    onDrop: (e: React.DragEvent, nodeId: string) => void;
    dragOverId: string | null;
    dropPosition?: DropPosition;
}

const typeIcons: Record<NodeType, React.ElementType> = {
    [NodeType.ORDINARY]: Circle,
    [NodeType.TASK]: CheckSquare,
    [NodeType.REQUIREMENT]: FileText,
    [NodeType.PBS]: Box,
    [NodeType.DATA]: Database,
    [NodeType.APP]: Circle,
};

export const OutlineItem = memo(function OutlineItem({
    node,
    isSelected,
    isExpanded,
    onClick,
    onToggle,
    onDragStart,
    onDragOver,
    onDrop,
    dragOverId,
    dropPosition,
}: OutlineItemProps) {
    const TypeIcon = (node.nodeType && typeIcons[node.nodeType]) || Circle;
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
    const isDragOver = dragOverId === node.id;

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(node.id);
    };

    return (
        <div
            data-testid={`outline-item-${node.id}`}
            className={cn(
                'flex items-center gap-1 h-8 px-2 cursor-pointer rounded transition-colors duration-150 relative',
                'hover:bg-gray-50',
                isSelected && 'bg-blue-50',
                // Visual feedback for drop position
                isDragOver && dropPosition === 'inside' && 'bg-blue-100 ring-2 ring-blue-400',
                isDragOver && dropPosition === 'above' && 'border-t-2 border-blue-500',
                isDragOver && dropPosition === 'below' && 'border-b-2 border-blue-500'
            )}
            style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
            draggable
            onClick={() => onClick(node.id)}
            onDragStart={(e) => onDragStart(e, node.id)}
            onDragOver={(e) => onDragOver(e, node.id)}
            onDrop={(e) => onDrop(e, node.id)}
        >
            {/* Collapse toggle */}
            {node.hasChildren ? (
                <button
                    type="button"
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    onClick={handleChevronClick}
                    aria-label={isExpanded ? '折叠' : '展开'}
                >
                    <ChevronIcon className="w-3.5 h-3.5" />
                </button>
            ) : (
                <span className="w-4" />
            )}

            {/* Type icon */}
            <TypeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

            {/* Label */}
            <span className="text-sm text-gray-700 truncate flex-1">
                {node.label}
            </span>
        </div>
    );
});
