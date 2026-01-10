/**
 * Story 9.2: PBS Nodes Hook
 * Extracts PBS nodes from GraphContext and builds a tree structure
 * Uses graph.getNodes() to access nodes from X6 graph instance
 */

'use client';

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';

/**
 * Tree node structure for PBS view
 */
export interface PbsTreeNode {
  id: string;
  label: string;
  parentId?: string | null;
  children: PbsTreeNode[];
  nodeType?: NodeType;
}

/**
 * Hook to extract PBS nodes from the graph and build a tree structure
 * Uses 100ms debounce to avoid high-frequency refreshes from graph events
 */
export function usePbsNodes() {
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

  // Build PBS tree from graph nodes
  const pbsNodes = useMemo(() => {
    if (!graph) return [];

    // Get all nodes from X6 graph
    const allNodes = graph.getNodes();

    // Filter PBS nodes (nodeType === 'PBS')
    const pbsNodeList: PbsTreeNode[] = [];
    const nodeMap = new Map<string, PbsTreeNode>();

    for (const node of allNodes) {
      const data = node.getData() as MindNodeData | undefined;
      if (!data) continue;

      // Check if this is a PBS node
      if (data.nodeType === NodeType.PBS) {
        const treeNode: PbsTreeNode = {
          id: node.id,
          label: data.label || '未命名 PBS',
          parentId: data.parentId,
          children: [],
          nodeType: data.nodeType,
        };
        pbsNodeList.push(treeNode);
        nodeMap.set(node.id, treeNode);
      }
    }

    // Build tree structure
    const roots: PbsTreeNode[] = [];

    for (const node of pbsNodeList) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        // Parent is also a PBS node - add as child
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        // No PBS parent - this is a root
        roots.push(node);
      }
    }

    // Sort children by label
    const sortChildren = (nodes: PbsTreeNode[]) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label));
      nodes.forEach(n => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }, [graph, version]);

  /**
   * Get all descendant node IDs for a given PBS node
   * Used for "include sub-nodes" feature
   */
  const getDescendantIds = useCallback((nodeId: string): string[] => {
    const ids: string[] = [];

    const collectIds = (nodes: PbsTreeNode[]) => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          // Found the node, collect all descendants
          const collect = (n: PbsTreeNode) => {
            ids.push(n.id);
            n.children.forEach(collect);
          };
          collect(node);
          return true;
        }
        if (collectIds(node.children)) return true;
      }
      return false;
    };

    collectIds(pbsNodes);
    return ids;
  }, [pbsNodes]);

  return { pbsNodes, getDescendantIds };
}
