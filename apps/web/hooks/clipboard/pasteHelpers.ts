'use client';

/**
 * Helper functions for paste operations.
 * Story 7.4: Extracted from clipboardPaste for single responsibility.
 */

import type { Node, Graph } from '@antv/x6';
import { nanoid } from 'nanoid';
import type * as Y from 'yjs';

/**
 * Get fallback parent ID for orphan nodes.
 */
export function getFallbackParentId(graph: Graph, selectedNodes: Node[]): string | undefined {
    if (selectedNodes.length === 1) {
        return selectedNodes[0].id;
    }

    const nodes = graph.getNodes();
    const rootNode = nodes.find((node) => {
        const nodeData = node.getData() || {};
        return nodeData.type === 'root' || nodeData.mindmapType === 'root';
    });
    if (rootNode) return rootNode.id;

    const topLevelNode = nodes.find((node) => {
        const nodeData = node.getData() || {};
        return !nodeData.parentId;
    });
    return topLevelNode?.id;
}

/**
 * Build edges between newly created nodes during paste.
 * Story 8.10: Only dependency edges are stored in Yjs (hierarchical edges are derived locally from parentId).
 */
export function createClipboardEdges(
    yEdges: Y.Map<unknown>,
    edges: Array<{
        sourceOriginalId: string;
        targetOriginalId: string;
        kind: string;
        dependencyType?: string;
    }>,
    idMap: Map<string, string>,
    graphId: string,
    newEdgeIds: string[]
): void {
    edges.forEach(edgeData => {
        if (edgeData.kind !== 'dependency') return;
        const newSourceId = idMap.get(edgeData.sourceOriginalId);
        const newTargetId = idMap.get(edgeData.targetOriginalId);

        if (newSourceId && newTargetId) {
            const edgeId = nanoid();
            newEdgeIds.push(edgeId);

            yEdges.set(edgeId, {
                id: edgeId,
                source: newSourceId,
                target: newTargetId,
                type: 'reference',
                metadata: {
                    kind: 'dependency',
                    dependencyType: edgeData.dependencyType,
                },
                graphId: graphId,
            });
        }
    });
}
