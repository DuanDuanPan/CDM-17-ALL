/**
 * Story 2.3: useGanttData Hook
 * Transforms Yjs graph data into dhtmlx-gantt format
 *
 * Philosophy: This is a PROJECTION of Yjs data.
 * - Read from Yjs SharedMap
 * - Transform into Gantt tasks and links
 * - Write back to Yjs on drag/resize
 *
 * Key Algorithm: findGanttParent
 * - Traverses up the mindmap tree
 * - Skips non-TASK nodes (PBS, Detail, etc.)
 * - Returns first TASK ancestor or Root
 */

'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { NodeType, type TaskProps } from '@cdm/types';
import type { YjsNodeData, YjsEdgeData } from '@/features/collab/GraphSyncManager';
import { useGanttState } from '../../stores/useViewStore';

// ==========================================
// Type Definitions
// ==========================================

/**
 * dhtmlx-gantt task format
 */
export interface GanttTask {
  id: string;
  text: string;
  start_date: Date;
  end_date: Date;
  duration: number;
  progress: number;
  parent: string;
  open: boolean;
  /** Task type for dhtmlx-gantt */
  type?: 'task' | 'project' | 'milestone';
  /** Custom properties */
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  status?: string;
  /** Visual hints */
  isDueDateOnly?: boolean; // Shows dashed border
  isUnscheduled?: boolean; // No dates at all
}

/**
 * dhtmlx-gantt link format (for dependencies)
 */
export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: '0' | '1' | '2' | '3'; // finish-to-start, start-to-start, etc.
}

/**
 * Unscheduled task (no dates)
 */
export interface UnscheduledTask {
  id: string;
  text: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  status?: string;
}

/**
 * Return type of useGanttData hook
 */
export interface UseGanttDataReturn {
  /** Tasks for dhtmlx-gantt */
  tasks: GanttTask[];
  /** Links for dhtmlx-gantt (dependencies) */
  links: GanttLink[];
  /** Tasks without dates (sidebar) */
  unscheduledTasks: UnscheduledTask[];
  /** Total task count */
  totalTasks: number;
  /** Update task dates in Yjs */
  updateTaskDates: (
    taskId: string,
    startDate: Date,
    endDate: Date
  ) => void;
  /** Update task progress in Yjs */
  updateTaskProgress: (taskId: string, progress: number) => void;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Find the Gantt parent of a node (first TASK ancestor or Root)
 *
 * The visual graph structure doesn't match Gantt hierarchy.
 * We need to traverse up and skip non-TASK nodes.
 *
 * Example: Root -> Task A -> PBS Node -> Detail Node -> Task B
 * - In Mindmap: Task B is child of Detail Node
 * - In Gantt: Task B is child of Task A (skip PBS and Detail)
 */
function findGanttParent(
  nodeId: string,
  nodesMap: Map<string, YjsNodeData>,
  edgesMap: Map<string, YjsEdgeData>
): string | null {
  const node = nodesMap.get(nodeId);
  if (!node) return null;

  // Find parent edge (where target is this node)
  let parentId: string | null = null;
  for (const [, edge] of edgesMap) {
    const edgeKind = edge.metadata?.kind || (edge.type === 'reference' ? 'dependency' : 'hierarchical');
    if (edgeKind !== 'hierarchical') {
      continue;
    }
    if (edge.target === nodeId) {
      parentId = edge.source;
      break;
    }
  }

  if (!parentId) return null;

  // Traverse up the tree
  let current = nodesMap.get(parentId);
  while (current) {
    // Check if this is a ROOT or TASK node
    if (current.mindmapType === 'root') {
      return current.id;
    }
    if (current.nodeType === NodeType.TASK) {
      return current.id;
    }

    // Find next parent
    let nextParentId: string | null = null;
    for (const [, edge] of edgesMap) {
      const edgeKind = edge.metadata?.kind || (edge.type === 'reference' ? 'dependency' : 'hierarchical');
      if (edgeKind !== 'hierarchical') {
        continue;
      }
      if (edge.target === current.id) {
        nextParentId = edge.source;
        break;
      }
    }

    if (!nextParentId) break;
    current = nodesMap.get(nextParentId);
  }

  return null;
}

/**
 * Parse ISO date string to Date object
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculate duration in days between two dates
 */
function calculateDuration(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // Minimum 1 day
}

/**
 * Format Date to ISO string (date part only)
 */
function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0] + 'T00:00:00Z';
}

// ==========================================
// Hook Implementation
// ==========================================

/**
 * useGanttData - Transform Yjs graph data into Gantt format
 *
 * @param yDoc - Yjs document instance
 * @returns Tasks, links, and update functions
 *
 * @example
 * ```tsx
 * const { yDoc } = useCollaboration({ graphId, user });
 * const { tasks, links, updateTaskDates } = useGanttData(yDoc);
 *
 * <GanttChart
 *   tasks={tasks}
 *   links={links}
 *   onTaskDrag={(id, start, end) => updateTaskDates(id, start, end)}
 * />
 * ```
 */
export function useGanttData(yDoc: Y.Doc | null): UseGanttDataReturn {
  const ganttState = useGanttState();
  const [dataVersion, setDataVersion] = useState(0);

  // Observe Yjs changes to trigger re-computation
  useEffect(() => {
    if (!yDoc) return;

    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    const yEdges = yDoc.getMap<{ source: string; target: string }>('edges');
    const handleChange = () => {
      setDataVersion((prev) => prev + 1);
    };

    yNodes.observe(handleChange);
    yEdges.observe(handleChange);
    return () => {
      yNodes.unobserve(handleChange);
      yEdges.unobserve(handleChange);
    };
  }, [yDoc]);

  // Build nodes and edges maps for efficient lookup
  const { nodesMap, edgesMap } = useMemo(() => {
    const nMap = new Map<string, YjsNodeData>();
    const eMap = new Map<string, YjsEdgeData>();

    if (!yDoc) return { nodesMap: nMap, edgesMap: eMap };

    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    const yEdges = yDoc.getMap<YjsEdgeData>('edges');

    yNodes.forEach((node, id) => {
      nMap.set(id, node);
    });

    yEdges.forEach((edge, id) => {
      eMap.set(id, edge);
    });

    return { nodesMap: nMap, edgesMap: eMap };
  }, [yDoc, dataVersion]);

  // Transform to Gantt format
  const { tasks, unscheduledTasks, links, taskCount } = useMemo(() => {
    const ganttTasks: GanttTask[] = [];
    const unscheduled: UnscheduledTask[] = [];
    const ganttLinks: GanttLink[] = [];
    let totalTaskCount = 0;

    // Identify root node (mindmap root) for Gantt hierarchy
    let rootNodeId: string | null = null;
    let rootNodeLabel = '根节点';
    let includeRootTask = false;
    nodesMap.forEach((node, nodeId) => {
      if (rootNodeId) return;
      if (node.mindmapType === 'root' || node.type === 'root') {
        rootNodeId = nodeId;
        rootNodeLabel = node.label || rootNodeLabel;
        includeRootTask = node.nodeType !== NodeType.TASK;
      }
    });

    // Process TASK nodes
    nodesMap.forEach((node, nodeId) => {
      if (node.nodeType !== NodeType.TASK) return;
      totalTaskCount += 1;

      const props = (node.props || {}) as TaskProps;
      const startDate = parseDate(props.startDate as string | undefined);
      const dueDate = parseDate(props.dueDate as string | undefined);
      const progress = typeof props.progress === 'number' ? props.progress / 100 : 0;

      // Find Gantt parent (may skip non-TASK nodes)
      const ganttParentId = findGanttParent(nodeId, nodesMap, edgesMap);

      // Case 1: No dates at all -> unscheduled
      if (!startDate && !dueDate) {
        if (ganttState.showUnscheduled) {
          unscheduled.push({
            id: nodeId,
            text: node.label || 'Untitled Task',
            priority: props.priority as 'low' | 'medium' | 'high' | undefined,
            assigneeId: props.assigneeId as string | undefined,
            status: props.status as string | undefined,
          });
        }
        return;
      }

      // Case 2: Only dueDate -> 1-day duration ending on dueDate
      let start: Date;
      let end: Date;
      let isDueDateOnly = false;

      if (startDate && dueDate) {
        start = startDate;
        end = dueDate;
      } else if (dueDate) {
        // Fallback: 1-day duration ending on dueDate
        end = dueDate;
        start = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
        isDueDateOnly = true;
      } else if (startDate) {
        // Only startDate: default 1 day duration
        start = startDate;
        end = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      } else {
        return; // Should not reach here
      }

      // Map parent ID regarding Root node
      let finalParentId = ganttParentId ?? (rootNodeId || '0');

      const isExpanded =
        ganttState.expandedRows.has('__all__') ||
        ganttState.expandedRows.has(nodeId) ||
        ganttState.expandedRows.size === 0;

      ganttTasks.push({
        id: nodeId,
        text: node.label || 'Untitled Task',
        start_date: start,
        end_date: end,
        duration: calculateDuration(start, end),
        progress,
        parent: finalParentId,
        open: isExpanded,
        priority: props.priority as 'low' | 'medium' | 'high' | undefined,
        assigneeId: props.assigneeId as string | undefined,
        status: props.status as string | undefined,
        isDueDateOnly,
      });
    });

    // Insert root node as a project summary row when available
    if (includeRootTask && rootNodeId && ganttTasks.length > 0) {
      const rootStart = ganttTasks.reduce(
        (min, task) => (task.start_date < min ? task.start_date : min),
        ganttTasks[0].start_date
      );
      const rootEnd = ganttTasks.reduce(
        (max, task) => (task.end_date > max ? task.end_date : max),
        ganttTasks[0].end_date
      );

      ganttTasks.unshift({
        id: rootNodeId,
        text: rootNodeLabel,
        start_date: rootStart,
        end_date: rootEnd,
        duration: calculateDuration(rootStart, rootEnd),
        progress: 0,
        parent: '0',
        open: true,
        type: 'project',
      });
    }

    // Process dependency edges (from Story 2.2)
    if (ganttState.showDependencies) {
      edgesMap.forEach((edge, edgeId) => {
        // Story 2.2/2.3: Only include edges with kind === 'dependency'
        // Skip hierarchical edges (parent-child relationships)
        const edgeKind = edge.metadata?.kind || 'hierarchical';
        if (edgeKind !== 'dependency') {
          return; // Skip non-dependency edges
        }

        const sourceNode = nodesMap.get(edge.source);
        const targetNode = nodesMap.get(edge.target);

        // Only include edges between TASK nodes
        if (
          sourceNode?.nodeType === NodeType.TASK &&
          targetNode?.nodeType === NodeType.TASK
        ) {
          // Check if both tasks are in the gantt tasks list
          const sourceInTasks = ganttTasks.some((t) => t.id === edge.source);
          const targetInTasks = ganttTasks.some((t) => t.id === edge.target);

          if (sourceInTasks && targetInTasks) {
            // Map dependency type to Gantt link type
            // FS=0, SS=1, FF=2, SF=3
            let linkType: '0' | '1' | '2' | '3' = '0';
            if (edge.metadata?.dependencyType === 'SS') linkType = '1';
            else if (edge.metadata?.dependencyType === 'FF') linkType = '2';
            else if (edge.metadata?.dependencyType === 'SF') linkType = '3';

            ganttLinks.push({
              id: edgeId,
              source: edge.source,
              target: edge.target,
              type: linkType,
            });
          }
        }
      });
    }

    return {
      tasks: ganttTasks,
      unscheduledTasks: unscheduled,
      links: ganttLinks,
      taskCount: totalTaskCount,
    };
  }, [nodesMap, edgesMap, ganttState.showUnscheduled, ganttState.showDependencies, ganttState.expandedRows]);

  // Update task dates in Yjs
  const updateTaskDates = useCallback(
    (taskId: string, startDate: Date, endDate: Date) => {
      if (!yDoc) return;

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get(taskId);
      if (!node) return;
      if (node.nodeType !== NodeType.TASK) return;

      yDoc.transact(() => {
        yNodes.set(taskId, {
          ...node,
          props: {
            ...node.props,
            startDate: formatDateToISO(startDate),
            dueDate: formatDateToISO(endDate),
          },
          updatedAt: new Date().toISOString(),
        });
      });
    },
    [yDoc]
  );

  // Update task progress in Yjs
  const updateTaskProgress = useCallback(
    (taskId: string, progress: number) => {
      if (!yDoc) return;

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get(taskId);
      if (!node) return;
      if (node.nodeType !== NodeType.TASK) return;

      // Clamp progress to 0-100
      const clampedProgress = Math.max(0, Math.min(100, Math.round(progress * 100)));

      yDoc.transact(() => {
        yNodes.set(taskId, {
          ...node,
          props: {
            ...node.props,
            progress: clampedProgress,
          },
          updatedAt: new Date().toISOString(),
        });
      });
    },
    [yDoc]
  );

  const totalTasks = taskCount;

  return {
    tasks,
    links,
    unscheduledTasks,
    totalTasks,
    updateTaskDates,
    updateTaskProgress,
  };
}

export default useGanttData;
