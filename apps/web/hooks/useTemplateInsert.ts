'use client';

/**
 * Story 5.2: Template Insert Hook
 * Handles inserting template structures into the graph via drag-drop or click.
 *
 * Features:
 * - Flattens template node tree to individual nodes
 * - Creates edges for dependencies and parent-child relationships
 * - Uses Yjs-first pattern for collaborative sync
 * - Supports position-based insertion
 */

import { useCallback } from 'react';
import type { Graph, Node } from '@antv/x6';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import { DependencyTypeSchema, MAX_CLIPBOARD_NODES, getDefaultDependencyType } from '@cdm/types';
import type { DependencyType, TemplateNode, TemplateStructure, TemplateEdge, NodeType } from '@cdm/types';
import { getFallbackParentId } from './clipboard/pasteHelpers';

export interface UseTemplateInsertOptions {
  graph: Graph | null;
  graphId: string;
  yDoc: Y.Doc | null;
  selectedNodes?: Node[];
}

export interface UseTemplateInsertReturn {
  insertTemplate: (
    structure: TemplateStructure,
    position: { x: number; y: number }
  ) => string[]; // Returns array of new node IDs
  isReady: boolean;
}

interface FlattenedNode {
  tempId: string;
  label: string;
  type?: NodeType;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  parentTempId?: string;
  offsetX: number;
  offsetY: number;
  // Story 8.6: Include siblingIndex for order persistence
  siblingIndex: number;
}

/**
 * Flatten template node tree to array of nodes with relative positions.
 */
function flattenTemplateNodes(
  node: TemplateNode,
  parentTempId?: string,
  depth: number = 0,
  siblingIndex: number = 0
): FlattenedNode[] {
  const result: FlattenedNode[] = [];

  // Calculate offset based on depth and sibling index
  // Horizontal layout for mindmap-style
  const offsetX = depth * 200;
  const offsetY = siblingIndex * 80;

  result.push({
    tempId: node._tempId || nanoid(),
    label: node.label,
    type: node.type,
    description: node.description,
    tags: node.tags,
    metadata: node.metadata,
    parentTempId,
    offsetX,
    offsetY,
    // Story 8.6: Track sibling index for order persistence
    siblingIndex,
  });

  if (node.children) {
    node.children.forEach((child, index) => {
      const childNodes = flattenTemplateNodes(
        child,
        node._tempId || result[0].tempId,
        depth + 1,
        index
      );
      result.push(...childNodes);
    });
  }

  return result;
}

/**
 * Create hierarchical edges for parent-child relationships.
 */
function createHierarchicalEdges(
  yEdges: Y.Map<unknown>,
  flatNodes: FlattenedNode[],
  tempIdToNewId: Map<string, string>,
  graphId: string
): void {
  flatNodes.forEach((node) => {
    if (!node.parentTempId) return;

    const childId = tempIdToNewId.get(node.tempId);
    const parentId = tempIdToNewId.get(node.parentTempId);

    if (childId && parentId) {
      const edgeId = nanoid();
      yEdges.set(edgeId, {
        id: edgeId,
        source: parentId,
        target: childId,
        type: 'hierarchical',
        metadata: { kind: 'hierarchical' },
        graphId,
      });
    }
  });
}

/**
 * Create dependency edges from template edges.
 */
function createDependencyEdges(
  yEdges: Y.Map<unknown>,
  templateEdges: TemplateEdge[] | undefined,
  tempIdToNewId: Map<string, string>,
  graphId: string
): void {
  if (!templateEdges) return;

  templateEdges.forEach((edge) => {
    const sourceId = tempIdToNewId.get(edge.sourceRef);
    const targetId = tempIdToNewId.get(edge.targetRef);

    if (sourceId && targetId) {
      const parsed = DependencyTypeSchema.safeParse(edge.dependencyType);
      const normalizedDependencyType: DependencyType = parsed.success
        ? parsed.data
        : getDefaultDependencyType();
      const edgeId = nanoid();
      yEdges.set(edgeId, {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: 'reference',
        metadata: {
          kind: 'dependency',
          dependencyType: normalizedDependencyType,
        },
        graphId,
      });
    }
  });
}

/**
 * Hook for inserting templates into the graph.
 */
export function useTemplateInsert({
  graph,
  graphId,
  yDoc,
  selectedNodes = [],
}: UseTemplateInsertOptions): UseTemplateInsertReturn {
  const isReady = !!graph && !!yDoc;

  const insertTemplate = useCallback(
    (structure: TemplateStructure, position: { x: number; y: number }): string[] => {
      if (!graph || !yDoc) {
        toast.error('图谱未就绪');
        return [];
      }

      try {
        // Flatten template tree
        const flatNodes = flattenTemplateNodes(structure.rootNode);

        if (flatNodes.length === 0) {
          toast.warning('模板没有节点');
          return [];
        }

        if (flatNodes.length > MAX_CLIPBOARD_NODES) {
          toast.warning(`模板节点过多 (${flatNodes.length}/${MAX_CLIPBOARD_NODES})，请拆分后再插入`);
          return [];
        }

        // Create ID mapping: tempId -> newId
        const tempIdToNewId = new Map<string, string>();
        flatNodes.forEach((node) => {
          tempIdToNewId.set(node.tempId, nanoid());
        });

        // Get current selected nodes in real-time (not from stale closure)
        // This ensures we use the actual selection state at drop time
        const currentSelectedNodes = graph.getSelectedCells().filter(cell => cell.isNode()) as Node[];
        const fallbackParentId = getFallbackParentId(graph, currentSelectedNodes);

        const yNodes = yDoc.getMap('nodes');
        const yEdges = yDoc.getMap('edges');
        const newNodeIds: string[] = [];
        const now = new Date().toISOString();

        yDoc.transact(() => {
          // Create nodes
          flatNodes.forEach((node, index) => {
            const newId = tempIdToNewId.get(node.tempId)!;
            newNodeIds.push(newId);

            // Determine parent ID
            let parentId: string | undefined;
            if (node.parentTempId) {
              // Has parent within template
              parentId = tempIdToNewId.get(node.parentTempId);
            } else if (index === 0 && fallbackParentId) {
              // Root node can connect to selected/fallback parent
              parentId = fallbackParentId;
            }

            yNodes.set(newId, {
              id: newId,
              label: node.label,
              mindmapType: 'topic' as const,
              nodeType: node.type || 'ORDINARY',
              description: node.description,
              x: position.x + node.offsetX,
              y: position.y + node.offsetY,
              width: 160,
              height: 40,
              parentId,
              metadata: node.metadata,
              props: node.metadata,
              tags: node.tags || [],
              graphId,
              createdAt: now,
              updatedAt: now,
              // Story 8.6: Include order for stable sibling sorting across layout modes
              order: node.siblingIndex,
            });
          });

          // Create hierarchical edges for parent-child relationships within template
          createHierarchicalEdges(yEdges, flatNodes, tempIdToNewId, graphId);

          // Create dependency edges from template
          createDependencyEdges(yEdges, structure.edges, tempIdToNewId, graphId);

          // Create edge from fallback parent to root node if needed
          if (fallbackParentId && flatNodes.length > 0) {
            const rootNewId = tempIdToNewId.get(flatNodes[0].tempId);
            if (rootNewId) {
              const edgeId = nanoid();
              yEdges.set(edgeId, {
                id: edgeId,
                source: fallbackParentId,
                target: rootNewId,
                type: 'hierarchical',
                metadata: { kind: 'hierarchical' },
                graphId,
              });
            }
          }
        });

        // Center on first new node
        setTimeout(() => {
          if (newNodeIds.length > 0) {
            const firstNode = graph.getCellById(newNodeIds[0]);
            if (firstNode) {
              graph.centerCell(firstNode);
              graph.select(newNodeIds.map((id) => graph.getCellById(id)).filter(Boolean));
            }
          }
        }, 100);

        toast.success(`已插入 ${flatNodes.length} 个节点`);
        return newNodeIds;
      } catch (err) {
        console.error('[useTemplateInsert] Insert failed:', err);
        toast.error(err instanceof Error ? err.message : '插入模板失败');
        return [];
      }
    },
    [graph, graphId, yDoc, selectedNodes]
  );

  return {
    insertTemplate,
    isReady,
  };
}

export default useTemplateInsert;
