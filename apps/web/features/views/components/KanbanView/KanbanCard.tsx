/**
 * Story 2.3: KanbanCard Component
 * Draggable task card for the Kanban board
 *
 * Design: Magic UI glassmorphism style (from Story 2.2)
 * - White background with thin border and subtle shadow
 * - Rounded corners
 * - Task metadata display (priority, due date, assignee)
 */

'use client';

import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, Flag } from 'lucide-react';
import type { KanbanCardData } from './useKanbanData';

// ==========================================
// Type Definitions
// ==========================================

export interface KanbanCardProps {
  /** Card data */
  card: KanbanCardData;
  /** Whether the card is being dragged */
  isDragging?: boolean;
  /** Click handler for opening card details */
  onClick?: (card: KanbanCardData) => void;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get priority color and label
 */
function getPriorityDisplay(priority?: 'low' | 'medium' | 'high' | null): {
  color: string;
  bgColor: string;
  label: string;
} {
  switch (priority) {
    case 'high':
      return { color: 'text-red-600', bgColor: 'bg-red-50', label: '高' };
    case 'medium':
      return { color: 'text-amber-600', bgColor: 'bg-amber-50', label: '中' };
    case 'low':
      return { color: 'text-green-600', bgColor: 'bg-green-50', label: '低' };
    default:
      return { color: 'text-gray-400', bgColor: 'bg-gray-50', label: '无' };
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * Check if date is overdue
 */
function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    return date < now;
  } catch {
    return false;
  }
}

// ==========================================
// Component
// ==========================================

/**
 * KanbanCard - Draggable task card component
 *
 * Features:
 * - Drag and drop support via dnd-kit
 * - Priority indicator
 * - Due date display with overdue warning
 * - Progress bar (optional)
 * - Assignee avatar placeholder
 */
function KanbanCardBase({ card, isDragging, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDragActive,
  } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragActive || isDragging ? 0.5 : 1,
  };

  const priority = getPriorityDisplay(card.priority);
  const dueDate = formatDate(card.dueDate);
  const overdue = card.status !== 'done' && isOverdue(card.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(card)}
      className={`
        group relative
        bg-white rounded-lg border border-gray-200
        p-3 mb-2
        shadow-sm hover:shadow-md
        cursor-grab active:cursor-grabbing
        transition-shadow duration-200
        ${isDragActive || isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}
      `}
      data-testid={`kanban-card-${card.id}`}
    >
      {/* Card Title */}
      <h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
        {card.label}
      </h4>

      {/* Progress Bar (if progress is set) */}
      {card.progress !== undefined && card.progress !== null && (
        <div className="mb-2">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${card.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 mt-0.5">{card.progress}%</span>
        </div>
      )}

      {/* Metadata Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority Badge */}
        {card.priority && (
          <span
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs
              ${priority.bgColor} ${priority.color}
            `}
          >
            <Flag className="w-3 h-3" />
            {priority.label}
          </span>
        )}

        {/* Due Date */}
        {dueDate && (
          <span
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs
              ${overdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}
            `}
          >
            <Calendar className="w-3 h-3" />
            {dueDate}
          </span>
        )}

        {/* Assignee */}
        {card.assigneeId && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
            <User className="w-3 h-3" />
            {/* TODO: Resolve assignee name from user store */}
            {card.assigneeId.slice(0, 4)}...
          </span>
        )}
      </div>

      {/* Custom Stage Badge (when grouped by status, show stage if set) */}
      {card.customStage && (
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">
            {card.customStage}
          </span>
        </div>
      )}
    </div>
  );
}

// Story 2.3: Memoize KanbanCard to prevent unnecessary re-renders
export const KanbanCard = memo(KanbanCardBase);
KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;

