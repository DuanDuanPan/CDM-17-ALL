/**
 * Story 9.2: Task Nodes Hook
 * Extracts TASK nodes from GraphContext and groups by status
 * Uses graph.getNodes() to access nodes from X6 graph instance
 */

'use client';

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType, type TaskProps, type TaskStatus } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';

/**
 * Task node representation for the task view
 */
export interface TaskNode {
  id: string;
  label: string;
  status: TaskStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  deliverables?: TaskProps['deliverables'];
}

/**
 * Tasks grouped by status
 */
export type TasksByStatus = Record<TaskStatus, TaskNode[]>;

/**
 * Hook to extract TASK nodes from the graph and group by status
 * Uses 100ms debounce to avoid high-frequency refreshes from graph events
 */
export function useTaskNodes() {
  const graphContext = useGraphContextOptional();
  const graph = graphContext?.graph;

  // Track version to force re-render when graph changes
  const [version, setVersion] = useState(0);

  // Debounced update function
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshNodes = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      setVersion((v) => v + 1);
    }, 100);
  }, []);

  // Subscribe to graph node changes
  useEffect(() => {
    if (!graph) return;

    const events = ['node:added', 'node:removed', 'node:change:data'];
    events.forEach(event => graph.on(event, refreshNodes));

    return () => {
      events.forEach(event => graph.off(event, refreshNodes));
    };
  }, [graph, refreshNodes]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Build task groups from graph nodes
  const tasksByStatus = useMemo<TasksByStatus>(() => {
    const groups: TasksByStatus = {
      'todo': [],
      'in-progress': [],
      'done': [],
    };

    if (!graph) return groups;

    // Get all nodes from X6 graph
    const allNodes = graph.getNodes();

    for (const node of allNodes) {
      const data = node.getData() as MindNodeData | undefined;
      if (!data) continue;

      // Check if this is a TASK node
      if (data.nodeType === NodeType.TASK) {
        const props = data.props as TaskProps | undefined;
        const status: TaskStatus = props?.status || 'todo';

        const taskNode: TaskNode = {
          id: node.id,
          label: data.label || '未命名任务',
          status,
          assigneeId: props?.assigneeId,
          dueDate: props?.dueDate,
          priority: props?.priority,
          deliverables: props?.deliverables,
        };

        groups[status].push(taskNode);
      }
    }

    // Sort each group by label
    Object.values(groups).forEach(tasks => {
      tasks.sort((a, b) => a.label.localeCompare(b.label));
    });

    return groups;
  }, [graph, version]);

  // Get total task count
  const totalCount = useMemo(() => {
    return Object.values(tasksByStatus).reduce((sum, tasks) => sum + tasks.length, 0);
  }, [tasksByStatus]);

  return { tasksByStatus, totalCount };
}
