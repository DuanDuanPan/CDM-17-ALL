/**
 * Story 2.3: KanbanColumn Component
 * Sortable column for the Kanban board with droppable area
 *
 * Design: Subtle transparent columns with rounded corners
 * - Column header with count badge
 * - Scrollable card container
 * - Drop indicator when dragging over
 */

'use client';

import React, { memo } from 'react';
import {
  useDroppable,
} from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumnData, KanbanCardData } from './useKanbanData';

// ==========================================
// Type Definitions
// ==========================================

export interface KanbanColumnProps {
  /** Column data */
  column: KanbanColumnData;
  /** Currently dragged card ID (for visual feedback) */
  activeId?: string | null;
  /** Click handler for card */
  onCardClick?: (card: KanbanCardData) => void;
  /** Whether columns should stretch to fill available width */
  isFullWidth?: boolean;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get column header color based on column ID
 */
function getColumnColor(columnId: string): { bg: string; border: string; text: string } {
  switch (columnId) {
    case 'todo':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
      };
    case 'in-progress':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
      };
    case 'done':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
      };
    default:
      // Custom stages use a subtle purple
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
      };
  }
}

// ==========================================
// Component
// ==========================================

/**
 * KanbanColumn - Droppable column with sortable cards
 *
 * Features:
 * - Header with title and card count
 * - Droppable area for card reordering
 * - Visual feedback when dragging over
 * - Vertical list sorting strategy
 */
function KanbanColumnBase({ column, activeId, onCardClick, isFullWidth }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const colors = getColumnColor(column.id);

  // Determine header style based on column ID or title
  // Determine header classes
  const getHeaderClasses = () => {
    const id = column.id.toLowerCase();
    const title = column.title.toLowerCase();

    if (id === '__unassigned__' || title === '未归类' || title.includes('uncategorized')) {
      return 'bg-gray-100 text-gray-700 border-gray-200';
    }
    if (id === 'todo' || title === '待办' || title.includes('to do')) {
      return 'bg-blue-600 text-white border-blue-700 shadow-md';
    }
    if (id === 'in-progress' || title === '进行中' || title.includes('doing')) {
      return 'bg-sky-500 text-white border-sky-600 shadow-md';
    }
    if (id === 'done' || title === '已完成' || title.includes('done')) {
      return 'bg-emerald-500 text-white border-emerald-600 shadow-md';
    }
    // Default: Return basic shape classes, color handled by style
    return 'text-white border-gray-400 shadow-sm';
  };

  const headerClass = getHeaderClasses();

  // Custom background color style to avoid Tailwind purge issues
  const isCustomStage = !['__unassigned__', 'todo', 'in-progress', 'done'].includes(column.id.toLowerCase())
    && !column.title.includes('未归类')
    && !column.title.includes('待办')
    && !column.title.includes('进行中')
    && !column.title.includes('已完成');

  const customHeaderStyle = isCustomStage ? { backgroundColor: '#475569' } : {}; // Slate-600 hex

  return (
    <div
      className={`
        flex flex-col
        ${isFullWidth ? 'flex-1 min-w-[280px]' : 'w-80 min-w-80 max-w-80'}
        bg-white/50 backdrop-blur-sm rounded-xl
        border border-gray-200/50
        shadow-sm
        ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        transition-all duration-200
        h-full
      `}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column Header */}
      <div
        className={`
          flex items-center justify-between
          px-4 py-3
          rounded-t-xl
          ${headerClass}
          border-b
        `}
        style={customHeaderStyle}
      >
        <h3 className="font-semibold text-sm tracking-wide">{column.title}</h3>
        <span
          className={`
            inline-flex items-center justify-center
            px-2.5 py-0.5 rounded-full
            text-xs font-bold
            bg-white/20 text-current
          `}
        >
          {column.cards.length}
        </span>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto
          p-3
          min-h-[200px]
          custom-scrollbar
          ${isOver ? 'bg-blue-50/30' : ''}
          transition-colors duration-200
        `}
        data-testid={`kanban-dropzone-${column.id}`}
      >
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              isDragging={activeId === card.id}
              onClick={onCardClick}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm gap-2">
            <span>暂无任务</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Story 2.3: Memoize KanbanColumn to prevent unnecessary re-renders
export const KanbanColumn = memo(KanbanColumnBase);
KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
