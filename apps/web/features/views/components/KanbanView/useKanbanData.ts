/**
 * Story 2.3: useKanbanData Hook
 * Transforms Yjs graph data into Kanban columns based on groupBy setting
 *
 * Core Philosophy: This is a PROJECTION of the same Yjs data.
 * - Single Source of Truth: Yjs SharedDoc
 * - No local state duplication
 * - Updates flow: Yjs → React re-render → Kanban view update
 */

'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { NodeType, TaskProps, TaskStatus } from '@cdm/types';
import { useKanbanState } from '../../stores/useViewStore';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

// ==========================================
// Type Definitions
// ==========================================

/**
 * Kanban card data - represents a single task in the Kanban board
 */
export interface KanbanCardData {
  /** Unique node ID */
  id: string;
  /** Node label (title) */
  label: string;
  /** Task status (todo, in-progress, done) */
  status: TaskStatus;
  /** Custom stage for dynamic grouping */
  customStage?: string | null;
  /** Assignee ID */
  assigneeId?: string | null;
  /** Due date (ISO string) */
  dueDate?: string | null;
  /** Start date (ISO string) */
  startDate?: string | null;
  /** Task priority */
  priority?: 'low' | 'medium' | 'high' | null;
  /** Progress percentage (0-100) */
  progress?: number | null;
  /** Parent node ID (for hierarchy) */
  parentId?: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
  /** Creator name */
  creator?: string;
}

/**
 * Kanban column data - represents a column (group) in the Kanban board
 */
export interface KanbanColumnData {
  /** Unique column ID */
  id: string;
  /** Column title */
  title: string;
  /** Cards in this column */
  cards: KanbanCardData[];
  /** Whether this is the default column for unassigned items */
  isDefault?: boolean;
}

/**
 * Return type for useKanbanData hook
 */
export interface UseKanbanDataReturn {
  /** Kanban columns with cards */
  columns: KanbanColumnData[];
  /** Total number of task cards */
  totalTasks: number;
  /** Move a card to a different column (updates Yjs) */
  moveCard: (cardId: string, targetColumnId: string) => void;
  /** Update a card's properties (updates Yjs) */
  updateCard: (cardId: string, updates: Partial<TaskProps>) => void;
}

// ==========================================
// Status Column Definitions
// ==========================================

const STATUS_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: '待办' },
  { id: 'in-progress', title: '进行中' },
  { id: 'done', title: '已完成' },
];

// ==========================================
// Helper Functions
// ==========================================

/**
 * Extract task data from YjsNodeData
 */
function extractTaskData(node: YjsNodeData): KanbanCardData | null {
  // Only include TASK nodes
  if (node.nodeType !== NodeType.TASK) {
    return null;
  }

  const props = node.props as TaskProps | undefined;

  return {
    id: node.id,
    label: node.label,
    status: props?.status || 'todo',
    customStage: props?.customStage,
    assigneeId: props?.assigneeId,
    dueDate: props?.dueDate,
    startDate: props?.startDate,
    priority: props?.priority,
    progress: props?.progress,
    parentId: node.parentId,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    creator: node.creator,
  };
}

/**
 * Group cards by status (default Kanban grouping)
 */
function groupByStatus(cards: KanbanCardData[]): KanbanColumnData[] {
  const grouped = new Map<TaskStatus, KanbanCardData[]>();

  // Initialize all status columns
  STATUS_COLUMNS.forEach((col) => {
    grouped.set(col.id, []);
  });

  // Group cards by status
  cards.forEach((card) => {
    const status = card.status || 'todo';
    const column = grouped.get(status);
    if (column) {
      column.push(card);
    } else {
      // Fallback to 'todo' if status is invalid
      grouped.get('todo')?.push(card);
    }
  });

  // Convert to column array
  return STATUS_COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    cards: grouped.get(col.id) || [],
    isDefault: col.id === 'todo',
  }));
}

/**
 * Group cards by custom stage (dynamic Kanban grouping)
 */
function groupByCustomStage(
  cards: KanbanCardData[],
  stages: string[]
): KanbanColumnData[] {
  const grouped = new Map<string, KanbanCardData[]>();
  const normalizedStages = [...stages];
  const stageSet = new Set(stages);

  // Include any custom stages found in data
  cards.forEach((card) => {
    if (card.customStage && !stageSet.has(card.customStage)) {
      stageSet.add(card.customStage);
      normalizedStages.push(card.customStage);
    }
  });

  // Initialize all stage columns
  normalizedStages.forEach((stage) => {
    grouped.set(stage, []);
  });

  // Add "未分配" (unassigned) column
  const unassignedKey = '__unassigned__';
  grouped.set(unassignedKey, []);

  // Group cards by customStage
  cards.forEach((card) => {
    const stage = card.customStage;
    if (stage && stages.includes(stage)) {
      grouped.get(stage)?.push(card);
    } else {
      // No stage or stage not in list → unassigned
      grouped.get(unassignedKey)?.push(card);
    }
  });

  // Convert to column array
  const columns: KanbanColumnData[] = normalizedStages.map((stage) => ({
    id: stage,
    title: stage,
    cards: grouped.get(stage) || [],
    isDefault: false,
  }));

  // Add unassigned column if it has cards
  const unassignedCards = grouped.get(unassignedKey) || [];
  if (unassignedCards.length > 0) {
    columns.push({
      id: unassignedKey,
      title: '未分配',
      cards: unassignedCards,
      isDefault: true,
    });
  }

  return columns;
}

// ==========================================
// Main Hook
// ==========================================

/**
 * useKanbanData - Transform Yjs graph data into Kanban board structure
 *
 * @param yDoc - Yjs document instance (from useCollaboration)
 * @returns Kanban columns with cards and actions
 *
 * @example
 * ```tsx
 * const { yDoc } = useCollaboration({ graphId, user });
 * const { columns, moveCard, updateCard } = useKanbanData(yDoc);
 *
 * // Render Kanban board
 * columns.map(column => (
 *   <KanbanColumn key={column.id} {...column} />
 * ));
 * ```
 */
export function useKanbanData(yDoc: Y.Doc | null): UseKanbanDataReturn {
  const kanbanState = useKanbanState();
  const [dataVersion, setDataVersion] = useState(0);

  // Observe Yjs changes to trigger re-computation
  useEffect(() => {
    if (!yDoc) return;

    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    const handleChange = () => {
      setDataVersion((prev) => prev + 1);
    };

    yNodes.observe(handleChange);
    return () => {
      yNodes.unobserve(handleChange);
    };
  }, [yDoc]);

  // Get all task cards from Yjs nodes
  const taskCards = useMemo<KanbanCardData[]>(() => {
    if (!yDoc) return [];

    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    const cards: KanbanCardData[] = [];

    yNodes.forEach((node) => {
      const card = extractTaskData(node);
      if (card) {
        cards.push(card);
      }
    });

    // Filter out completed tasks if showCompleted is false
    if (!kanbanState.showCompleted) {
      return cards.filter((card) => card.status !== 'done');
    }

    return cards;
  }, [yDoc, kanbanState.showCompleted, dataVersion]);

  // Group cards into columns based on groupBy setting
  const columns = useMemo<KanbanColumnData[]>(() => {
    if (kanbanState.groupBy === 'customStage') {
      return groupByCustomStage(taskCards, kanbanState.customStages);
    }
    return groupByStatus(taskCards);
  }, [taskCards, kanbanState.groupBy, kanbanState.customStages]);

  // Total task count
  const totalTasks = useMemo(() => taskCards.length, [taskCards]);

  // Move card to different column (update Yjs)
  const moveCard = useCallback(
    (cardId: string, targetColumnId: string) => {
      if (!yDoc) return;

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get(cardId);

      if (!node || node.nodeType !== NodeType.TASK) return;

      const currentProps = (node.props as TaskProps) || {};

      yDoc.transact(() => {
        let updatedProps: TaskProps;

        if (kanbanState.groupBy === 'customStage') {
          // Moving to a customStage column
          updatedProps = {
            ...currentProps,
            customStage: targetColumnId === '__unassigned__' ? null : targetColumnId,
          };
        } else {
          // Moving to a status column
          updatedProps = {
            ...currentProps,
            status: targetColumnId as TaskStatus,
          };
        }

        yNodes.set(cardId, {
          ...node,
          props: updatedProps,
          updatedAt: new Date().toISOString(),
        });
      });
    },
    [yDoc, kanbanState.groupBy]
  );

  // Update card properties (update Yjs)
  const updateCard = useCallback(
    (cardId: string, updates: Partial<TaskProps>) => {
      if (!yDoc) return;

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get(cardId);

      if (!node || node.nodeType !== NodeType.TASK) return;

      const currentProps = (node.props as TaskProps) || {};

      yDoc.transact(() => {
        yNodes.set(cardId, {
          ...node,
          props: {
            ...currentProps,
            ...updates,
          },
          updatedAt: new Date().toISOString(),
        });
      });
    },
    [yDoc]
  );

  return {
    columns,
    totalTasks,
    moveCard,
    updateCard,
  };
}

export default useKanbanData;
