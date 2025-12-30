'use client';

/**
 * Clipboard serialization utilities.
 * Story 7.4: Extracted from useClipboard for single responsibility.
 */

import type { Node, Graph } from '@antv/x6';
import { toast } from 'sonner';
import {
    ClipboardData,
    ClipboardNodeData,
    ClipboardEdgeData,
    ClipboardLayout,
    CLIPBOARD_VERSION,
    CLIPBOARD_SOURCE,
    MAX_CLIPBOARD_NODES,
    NodeType,
    sanitizeNodeProps,
} from '@cdm/types';
import type { EdgeKind, DependencyType } from '@cdm/types';

export interface SerializeSelectionOptions {
    graph: Graph;
    selectedNodes: Node[];
    graphId: string;
}

/**
 * Serialize selected nodes to clipboard format.
 * AC2.2: Only copies selected nodes and edges between them.
 */
export function serializeSelection({
    graph,
    selectedNodes,
    graphId,
}: SerializeSelectionOptions): ClipboardData | null {
    if (selectedNodes.length === 0) return null;

    // Check selection size limit (performance)
    if (selectedNodes.length > MAX_CLIPBOARD_NODES) {
        toast.warning(`选择过多节点 (${selectedNodes.length}/${MAX_CLIPBOARD_NODES})，请减少选择数量`);
        return null;
    }

    // Expanded selection: includes explicitly selected nodes + all their descendants
    const allNodesMap = new Map<string, Node>();
    selectedNodes.forEach((node) => allNodesMap.set(node.id, node));

    // Build a parent-child map from hierarchical edges
    const allCells = graph.getCells();
    const graphEdgesForHierarchy = graph.getEdges();

    // Map: parentId -> Set of childIds (from hierarchical edges)
    const hierarchicalChildren = new Map<string, Set<string>>();
    graphEdgesForHierarchy.forEach((edge) => {
        const edgeData = edge.getData() || {};
        const metadata = edgeData.metadata || {};
        if (metadata.kind === 'dependency') return;

        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (sourceId && targetId) {
            if (!hierarchicalChildren.has(sourceId)) {
                hierarchicalChildren.set(sourceId, new Set());
            }
            hierarchicalChildren.get(sourceId)!.add(targetId);
        }
    });

    // Recursively find descendants
    let changed = true;
    while (changed) {
        changed = false;
        allCells.forEach((cell) => {
            if (cell.isNode() && !allNodesMap.has(cell.id)) {
                const data = cell.getData() || {};
                const parentId = data.parentId;

                // Method 1: Check via data.parentId
                if (parentId && allNodesMap.has(parentId)) {
                    allNodesMap.set(cell.id, cell as Node);
                    changed = true;
                    return;
                }

                // Method 2: Check via hierarchical edges
                for (const [potentialParentId] of allNodesMap) {
                    const children = hierarchicalChildren.get(potentialParentId);
                    if (children && children.has(cell.id)) {
                        allNodesMap.set(cell.id, cell as Node);
                        changed = true;
                        return;
                    }
                }
            }
        });
    }

    const nodesToCopy = Array.from(allNodesMap.values());
    const selectedIds = new Set(nodesToCopy.map((n) => n.id));

    // Calculate bounding box
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    nodesToCopy.forEach((node) => {
        const { x, y } = node.getPosition();
        const { width, height } = node.getSize();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });

    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const layout: ClipboardLayout = {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY,
        center,
    };

    // Serialize nodes (relative to center)
    const nodes: ClipboardNodeData[] = nodesToCopy.map((node) => {
        const { x, y } = node.getPosition();
        const { width, height } = node.getSize();
        const data = node.getData() || {};
        const nodeType = (data.nodeType || data.type || NodeType.ORDINARY) as NodeType;
        const rawProps = (data.props || data.metadata || {}) as Record<string, unknown>;
        const sanitizedProps = sanitizeNodeProps(nodeType, rawProps);

        return {
            originalId: node.id,
            label: data.label || (node.getAttrByPath('text/text') as string) || '',
            type: nodeType,
            x: x - center.x,
            y: y - center.y,
            width,
            height,
            parentOriginalId: data.parentId,
            description: data.description,
            metadata: sanitizedProps,
            tags: data.tags || [],
        };
    });

    // Serialize edges between selected nodes only (AC2.2)
    const allEdges = graph.getEdges();
    const edges: ClipboardEdgeData[] = allEdges
        .filter((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            return sourceId && targetId && selectedIds.has(sourceId) && selectedIds.has(targetId);
        })
        .map((edge) => {
            const data = edge.getData() || {};
            const metadata = data.metadata || {};
            return {
                sourceOriginalId: edge.getSourceCellId()!,
                targetOriginalId: edge.getTargetCellId()!,
                kind: (metadata.kind || 'hierarchical') as EdgeKind,
                dependencyType: metadata.dependencyType as DependencyType | undefined,
                label: edge.getLabels()?.[0]?.attrs?.label?.text as string | undefined,
            };
        });

    return {
        version: CLIPBOARD_VERSION,
        source: CLIPBOARD_SOURCE,
        timestamp: Date.now(),
        sourceGraphId: graphId,
        nodes,
        edges,
        layout,
    };
}
