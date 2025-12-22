import { Graph, Node } from '@antv/x6';
import dagre from 'dagre';
import { BaseLayout, LayoutResult } from './BaseLayout';

/**
 * NetworkLayout - DAG (Directed Acyclic Graph) layout using Dagre
 * 
 * Best for dependency networks and process flows.
 * Story 2.2: Provides a clear view of task dependencies without crossing lines.
 */
export class NetworkLayout extends BaseLayout {
    constructor(graph: Graph) {
        super(graph);
    }

    /**
     * Required by BaseLayout, but we override apply() so this is unused.
     */
    calculate(): LayoutResult {
        return { nodes: [] };
    }

    /**
     * Apply Dagre layout to the graph
     * Story 2.7: Filters out archived nodes from layout calculation
     */
    override async apply(animate: boolean = true): Promise<void> {
        const model = this.graph.model;

        // Story 2.7: Filter out archived nodes from layout calculation
        const allNodes = model.getNodes();
        const nodes = allNodes.filter((node) => {
            const data = node.getData();
            return !data?.isArchived;
        });

        const allEdges = model.getEdges();
        // Story 2.7: Also filter out edges connected to archived nodes
        const archivedNodeIds = new Set(
            allNodes
                .filter((node) => node.getData()?.isArchived)
                .map((node) => node.id)
        );
        const edges = allEdges.filter((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            return sourceId && targetId &&
                !archivedNodeIds.has(sourceId) &&
                !archivedNodeIds.has(targetId);
        });

        if (nodes.length === 0) return;

        // Create a new directed graph
        const g = new dagre.graphlib.Graph();

        // Set an object for the graph label
        g.setGraph({
            rankdir: 'LR', // Left to Right
            align: 'UL',   // Upper Left alignment
            nodesep: 20,   // Tighten horizontal separation (was 50)
            ranksep: 40,   // Tighten vertical separation (was 80)
            marginx: 20,
            marginy: 20,
        });

        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(() => ({}));

        // Add visible nodes to dagre graph
        nodes.forEach((node) => {
            const size = node.getSize();
            g.setNode(node.id, { width: size.width, height: size.height });
        });

        // Add edges between visible nodes to dagre graph
        edges.forEach((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            if (sourceId && targetId) {
                g.setEdge(sourceId, targetId);
            }
        });

        // Apply layout
        dagre.layout(g);

        // We manually handle the update since we bypassed BaseLayout.apply
        if (animate) {
            this.graph.model.startBatch('layout');
        }

        // Apply new positions from dagre
        g.nodes().forEach((nodeId) => {
            const node = this.graph.getCellById(nodeId) as Node;
            if (node && node.isNode()) {
                const { x, y } = g.node(nodeId);

                // Dagre calculates center position, X6 sets top-left ?
                // Actually X6 nodes typically set position by their origin. 
                // If we set position directly, it's usually top-left unless anchor is centered.
                // Dagre returns center coordinates.
                // Let's adjust to top-left if needed.
                // Wait, standard X6 node origin is usually top-left.
                // Dagre docs: "The x and y properties of each node are the coordinates of the center of the node."
                const size = node.getSize();
                const topLeftX = x - size.width / 2;
                const topLeftY = y - size.height / 2;

                if (animate) {
                    node.prop('position', { x: topLeftX, y: topLeftY }, {
                        transition: { duration: 500 }
                    });
                } else {
                    node.position(topLeftX, topLeftY);
                }
            }
        });

        if (animate) {
            this.graph.model.stopBatch('layout');
        }
    }
}
