'use client';

import { Graph } from '@antv/x6';
import { isDependencyEdge } from '@/lib/edgeValidation';
import { VERTICAL_SHARED_TRUNK_ROUTER } from '@/lib/edgeRoutingConstants';

const FALLBACK_NODE_WIDTH = 120;
const FALLBACK_NODE_HEIGHT = 40;

type BBox = { x: number; y: number; width: number; height: number };

function isValidBox(box: BBox | null): box is BBox {
    if (!box) return false;
    return Number.isFinite(box.x) &&
        Number.isFinite(box.y) &&
        Number.isFinite(box.width) &&
        Number.isFinite(box.height) &&
        box.width > 0 &&
        box.height > 0;
}

function getSafeBBox(node: any): BBox | null {
    try {
        const box = node.getBBox?.();
        if (isValidBox(box)) return box;
    } catch {
        // ignore
    }

    const pos = node.getPosition?.();
    const size = node.getSize?.();
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;

    const width = Number.isFinite(size?.width) && size.width > 0 ? size.width : FALLBACK_NODE_WIDTH;
    const height = Number.isFinite(size?.height) && size.height > 0 ? size.height : FALLBACK_NODE_HEIGHT;

    return { x: pos.x, y: pos.y, width, height };
}

let routerRegistered = false;

/**
 * Register custom routers for graph edges.
 * Safe to call multiple times.
 */
export function registerEdgeRouters(): void {
    if (routerRegistered) return;

    Graph.registerRouter(VERTICAL_SHARED_TRUNK_ROUTER, (vertices, _options, edgeView) => {
        const edge = (edgeView as any)?.cell ?? (edgeView as any)?.edge ?? edgeView;
        const graph = (edgeView as any)?.graph ?? (edgeView as any)?.view?.graph ?? (edge as any)?.graph;

        if (!edge || !graph || typeof graph.getCellById !== 'function') {
            return vertices;
        }

        if (isDependencyEdge(edge)) {
            return vertices;
        }

        const sourceId = edge.getSourceCellId?.();
        const targetId = edge.getTargetCellId?.();
        if (!sourceId || !targetId) return vertices;

        const sourceCell = graph.getCellById(sourceId);
        const targetCell = graph.getCellById(targetId);
        if (!sourceCell?.isNode?.() || !targetCell?.isNode?.()) return vertices;

        const sourceBBox = getSafeBBox(sourceCell);
        const targetBBox = getSafeBBox(targetCell);
        if (!sourceBBox || !targetBBox) return vertices;
        const sourceCenterX = sourceBBox.x + sourceBBox.width / 2;
        const sourceBottomY = sourceBBox.y + sourceBBox.height;
        const targetCenterX = targetBBox.x + targetBBox.width / 2;
        const targetTopY = targetBBox.y;

        // Find the top-most visible child to compute a shared trunk for siblings.
        const outgoing = graph.getOutgoingEdges(sourceCell) ?? [];
        let minChildTopY = targetTopY;
        outgoing.forEach((outEdge: any) => {
            if (isDependencyEdge(outEdge)) return;
            const childId = outEdge.getTargetCellId?.();
            if (!childId) return;
            const childCell = graph.getCellById(childId);
            if (!childCell?.isNode?.()) return;
            if (typeof childCell.isVisible === 'function' && !childCell.isVisible()) return;
            const childBBox = getSafeBBox(childCell);
            if (!childBBox) return;
            minChildTopY = Math.min(minChildTopY, childBBox.y);
        });

        const trunkY = (sourceBottomY + minChildTopY) / 2;
        if (!Number.isFinite(trunkY)) return vertices;

        const deltaX = Math.abs(sourceCenterX - targetCenterX);
        if (deltaX < 2) {
            // When child aligns with parent center, avoid returning a degenerate
            // elbow route (duplicate X values). Returning an empty vertices array
            // produces a straight connection and keeps the edge visible.
            return [];
        }

        return [
            { x: sourceCenterX, y: trunkY },
            { x: targetCenterX, y: trunkY },
        ];
    });

    routerRegistered = true;
}
