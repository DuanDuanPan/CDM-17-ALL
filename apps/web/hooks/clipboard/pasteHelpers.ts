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
 * Ensure hierarchical edges exist for parent-child relations.
 */
export function ensureHierarchicalEdges(
    yEdges: Y.Map<unknown>,
    parentChildRelations: Array<{ parentId: string; childId: string }>,
    graphId: string
): void {
    const existingHierarchicalPairs = new Set<string>();
    yEdges.forEach((edgeData) => {
        const edge = edgeData as {
            source?: string;
            target?: string;
            type?: string;
            metadata?: { kind?: string };
        };
        const sourceId = edge.source;
        const targetId = edge.target;
        if (!sourceId || !targetId) return;
        const metadata = edge.metadata || {};
        const kind = metadata.kind ?? (edge.type === 'reference' ? 'dependency' : 'hierarchical');
        if (kind !== 'hierarchical') return;
        const key = sourceId < targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`;
        existingHierarchicalPairs.add(key);
    });

    parentChildRelations.forEach(({ parentId, childId }) => {
        const key = parentId < childId ? `${parentId}|${childId}` : `${childId}|${parentId}`;
        if (existingHierarchicalPairs.has(key)) return;
        const edgeId = nanoid();
        yEdges.set(edgeId, {
            id: edgeId,
            source: parentId,
            target: childId,
            type: 'hierarchical',
            metadata: { kind: 'hierarchical' },
            graphId: graphId,
        });
    });
}

/**
 * Build edges between newly created nodes during paste.
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
        const newSourceId = idMap.get(edgeData.sourceOriginalId);
        const newTargetId = idMap.get(edgeData.targetOriginalId);

        if (newSourceId && newTargetId) {
            const edgeId = nanoid();
            newEdgeIds.push(edgeId);

            yEdges.set(edgeId, {
                id: edgeId,
                source: newSourceId,
                target: newTargetId,
                type: edgeData.kind === 'dependency' ? 'reference' : 'hierarchical',
                metadata: {
                    kind: edgeData.kind,
                    dependencyType: edgeData.dependencyType,
                },
                graphId: graphId,
            });
        }
    });
}

/**
 * Create hierarchical edges for parent-child relationships from paste.
 */
export function createParentChildEdges(
    yEdges: Y.Map<unknown>,
    parentChildRelations: Array<{ parentId: string; childId: string }>,
    clipboardEdges: Array<{ sourceOriginalId: string; targetOriginalId: string; kind: string }>,
    idMap: Map<string, string>,
    graphId: string,
    newEdgeIds: string[]
): void {
    parentChildRelations.forEach(({ parentId, childId }) => {
        const hierarchicalEdgeExists = clipboardEdges.some(e => {
            if (e.kind === 'dependency') return false;
            const mappedSource = idMap.get(e.sourceOriginalId);
            const mappedTarget = idMap.get(e.targetOriginalId);
            return (mappedSource === parentId && mappedTarget === childId) ||
                (mappedSource === childId && mappedTarget === parentId);
        });

        if (!hierarchicalEdgeExists) {
            const edgeId = nanoid();
            newEdgeIds.push(edgeId);

            yEdges.set(edgeId, {
                id: edgeId,
                source: parentId,
                target: childId,
                type: 'hierarchical',
                metadata: { kind: 'hierarchical' },
                graphId: graphId,
            });
        }
    });
}
