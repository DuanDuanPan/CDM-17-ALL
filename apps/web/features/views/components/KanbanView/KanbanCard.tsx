/**
 * Story 2.3: KanbanCard Component
 * Draggable task card for the Kanban board
 *
 * Design: Glassmorphism style with rich details
 * - White/Translucent background with shadow
 * - Left colored border for priority
 * - Task metadata: Date range, Workdays, Assignee, Sub-task count
 */

'use client';

import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckSquare, Clock, User } from 'lucide-react';
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
 * Get priority styling (Left border color)
 */
function getPriorityColor(priority?: 'low' | 'medium' | 'high' | null): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-emerald-500';
    default:
      return 'bg-gray-300';
  }
}

/**
 * Format date range for display
 */
function formatDateRange(startDate?: string | null, dueDate?: string | null): string | null {
  if (!startDate && !dueDate) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '';
    }
  };

  const start = startDate ? formatDate(startDate) : '';
  const end = dueDate ? formatDate(dueDate) : '';

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 起`;
  if (end) return `截止 ${end}`;
  return null;
}

// ==========================================
// Component
// ==========================================

/**
 * KanbanCard - Draggable task card component with Glassmorphism design
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

  const priorityColor = getPriorityColor(card.priority);
  const dateRange = formatDateRange(card.startDate, card.dueDate);
  const showSubTasks = (card.subTaskCount || 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(card)}
      className={`
        group relative
        flex flex-row overflow-hidden
        bg-white rounded-xl shadow-sm border border-gray-100
        hover:shadow-md hover:border-gray-200
        cursor-grab active:cursor-grabbing
        transition-all duration-200
        mb-3
        ${isDragActive || isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-2' : ''}
      `}
      data-testid={`kanban-card-${card.id}`}
    >
      {/* Priority Indicator Stripe */}
      <div className={`w-1.5 shrink-0 ${priorityColor}`} />

      {/* Content Area */}
      <div className="flex-1 p-3 min-w-0">
        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-800 mb-2 line-clamp-2 leading-relaxed">
          {card.label}
        </h4>

        {/* Metadata Grid */}
        <div className="space-y-2">

          {/* Row 1: Date Range & Workdays */}
          {(dateRange || card.workdays) && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {dateRange && (
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{dateRange}</span>
                </div>
              )}

              {card.workdays ? (
                <div className="text-gray-400 font-medium">
                  : {card.workdays} 工时
                </div>
              ) : null}
            </div>
          )}

          {/* Row 2: Assignee & Sub-tasks */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
            {/* Assignee */}
            <div className="flex items-center gap-2">
              {card.assigneeId ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  <User className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {/* Placeholder for assignee name resolution */}
                    {/* In a real app, looking up user name from store */}
                    人员 {card.assigneeId.slice(0, 2)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-400">
                  <User className="w-3 h-3" />
                  <span className="text-xs">未分配</span>
                </div>
              )}
            </div>

            {/* Sub-tasks Count (Only show if > 0) */}
            {showSubTasks && (
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>{card.subTaskCount} 子任务</span>
              </div>
            )}

            {/* If no subtasks, maybe show a generic icon or nothing */}
            {/* Showing nothing keeps UI clean as per design concept */}
          </div>
        </div>
      </div>
    </div>
  );
}

export const KanbanCard = memo(KanbanCardBase);
KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;
