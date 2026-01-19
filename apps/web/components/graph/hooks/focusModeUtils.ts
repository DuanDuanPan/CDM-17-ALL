'use client';

import type { Graph, Node } from '@antv/x6';
import { getDirectChildrenByParentId } from '@/lib/parentIdUtils';
import { HIERARCHICAL_EDGE_GLOW_OPACITY, HIERARCHICAL_EDGE_SELECTED_ATTRS } from '@/lib/edgeStyles';

export function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function getNodeById(graph: Graph, nodeId: string): Node | null {
    const cell = graph.getCellById(nodeId);
    if (!cell || !cell.isNode()) return null;
    return cell as Node;
}

function getParentId(graph: Graph, nodeId: string): string | null {
    const node = getNodeById(graph, nodeId);
    if (!node) return null;
    const data = node.getData() || {};
    return typeof data.parentId === 'string' && data.parentId.length > 0 ? data.parentId : null;
}

/**
 * Story 8.10: Get direct children using parentId-based lookup
 */
function getDirectChildren(graph: Graph, nodeId: string): string[] {
    const children = getDirectChildrenByParentId(graph, nodeId);
    return children.map((node) => node.id);
}

function getSiblings(graph: Graph, nodeId: string): string[] {
    const parentId = getParentId(graph, nodeId);
    if (!parentId) return [];

    const siblings = getDirectChildren(graph, parentId);
    return siblings.filter((id) => id !== nodeId);
}

/**
 * Get related node IDs using BFS traversal up to specified level.
 *
 * Level 1: parent + children + siblings
 * Level 2: Level 1 + grandparent + grandchildren + parent's siblings + children's children
 * Level 3: Level 2 + one more expansion
 */
export function getRelatedNodeIds(graph: Graph | null, nodeId: string, level: number): Set<string> {
    if (!graph) return new Set([nodeId]);

    const related = new Set<string>([nodeId]);
    const visited = new Set<string>([nodeId]);
    let currentLevel: string[] = [nodeId];

    for (let depth = 0; depth < level; depth++) {
        const nextLevel: string[] = [];

        for (const currentId of currentLevel) {
            const parentId = getParentId(graph, currentId);
            if (parentId && !visited.has(parentId)) {
                visited.add(parentId);
                related.add(parentId);
                nextLevel.push(parentId);
            }

            const children = getDirectChildren(graph, currentId);
            for (const childId of children) {
                if (!visited.has(childId)) {
                    visited.add(childId);
                    related.add(childId);
                    nextLevel.push(childId);
                }
            }

            const siblings = getSiblings(graph, currentId);
            for (const siblingId of siblings) {
                if (!visited.has(siblingId)) {
                    visited.add(siblingId);
                    related.add(siblingId);
                    nextLevel.push(siblingId);
                }
            }
        }

        currentLevel = nextLevel;
    }

    return related;
}

export function applyFocusOpacityToGraph(
    graph: Graph,
    focusedIds: Set<string>,
    options: { focusedOpacity: number; dimmedOpacity: number }
) {
    graph.batchUpdate(() => {
        const nodes = graph.getNodes();
        nodes.forEach((node) => {
            const isFocused = focusedIds.has(node.id);
            const opacity = isFocused ? options.focusedOpacity : options.dimmedOpacity;

            // React Shape uses 'fo' selector, others use 'body'
            const hasReactShape = node.getAttrByPath('fo') !== undefined;
            if (hasReactShape) {
                node.attr('fo/opacity', opacity);
            } else {
                node.attr('body/opacity', opacity);
            }
        });

        const edges = graph.getEdges();
        edges.forEach((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();

            const isFocused = sourceId && targetId && focusedIds.has(sourceId) && focusedIds.has(targetId);
            const opacity = isFocused ? options.focusedOpacity : options.dimmedOpacity;

            const hasGlow = edge.getAttrByPath('glow') !== undefined;
            if (hasGlow) {
                edge.attr('line/strokeOpacity', opacity);
                edge.attr('glow/strokeOpacity', opacity);
            } else {
                edge.attr('line/opacity', opacity);
            }
        });
    });
}

export function clearFocusOpacityOnGraph(graph: Graph, options: { focusedOpacity: number }) {
    const selectedGlowOpacity =
        HIERARCHICAL_EDGE_SELECTED_ATTRS.glow?.strokeOpacity ?? HIERARCHICAL_EDGE_GLOW_OPACITY;

    graph.batchUpdate(() => {
        const nodes = graph.getNodes();
        nodes.forEach((node) => {
            const hasReactShape = node.getAttrByPath('fo') !== undefined;
            if (hasReactShape) {
                node.attr('fo/opacity', options.focusedOpacity);
            } else {
                node.attr('body/opacity', options.focusedOpacity);
            }
        });

        const edges = graph.getEdges();
        edges.forEach((edge) => {
            const hasGlow = edge.getAttrByPath('glow') !== undefined;
            if (hasGlow) {
                edge.attr('line/strokeOpacity', options.focusedOpacity);
                edge.attr(
                    'glow/strokeOpacity',
                    graph.isSelected(edge) ? selectedGlowOpacity : HIERARCHICAL_EDGE_GLOW_OPACITY
                );
            } else {
                edge.attr('line/opacity', options.focusedOpacity);
            }
        });
    });
}
