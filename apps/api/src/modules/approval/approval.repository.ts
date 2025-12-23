/**
 * Story 4.1: Approval Driven Workflow
 * Approval Repository - Data access layer for approval operations
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Node, type NodeTask } from '@cdm/database';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';

export interface NodeWithApproval extends Omit<Node, 'approval'> {
    approval: ApprovalPipeline | null;
    taskProps: { deliverables: Deliverable[] | null } | null;
}

@Injectable()
export class ApprovalRepository {
    /**
     * Find node by ID with approval and task props
     */
    async findNodeWithApproval(nodeId: string): Promise<NodeWithApproval | null> {
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            include: {
                taskProps: {
                    select: { deliverables: true },
                },
            },
        });

        if (!node) return null;

        return {
            ...node,
            approval: node.approval as ApprovalPipeline | null,
            taskProps: node.taskProps ? {
                deliverables: node.taskProps.deliverables as Deliverable[] | null,
            } : null,
        };
    }

    /**
     * Update node approval pipeline
     */
    async updateApproval(nodeId: string, approval: ApprovalPipeline): Promise<Node> {
        return prisma.node.update({
            where: { id: nodeId },
            data: { approval: approval as unknown as object },
        });
    }

    /**
     * Get task props by node ID
     */
    async getTaskProps(nodeId: string): Promise<NodeTask | null> {
        return prisma.nodeTask.findUnique({
            where: { nodeId },
        });
    }

    /**
     * Update task deliverables
     */
    async updateDeliverables(nodeId: string, deliverables: Deliverable[]): Promise<NodeTask> {
        return prisma.nodeTask.update({
            where: { nodeId },
            data: { deliverables: deliverables as unknown as object },
        });
    }

    /**
     * Update task status (for dependency unlocking)
     */
    async updateTaskStatus(nodeId: string, status: string): Promise<NodeTask> {
        return prisma.nodeTask.update({
            where: { nodeId },
            data: { status },
        });
    }

    /**
     * Find all dependency edges where source is the given node
     * Returns target node IDs of successor tasks
     */
    async findDependencySuccessors(nodeId: string): Promise<Array<{ targetId: string; graphId: string }>> {
        const edges = await prisma.edge.findMany({
            where: {
                sourceId: nodeId,
            },
            select: {
                targetId: true,
                graphId: true,
                metadata: true,
            },
        });

        // Filter for dependency edges only
        return edges
            .filter((edge) => {
                const metadata = edge.metadata as { kind?: string } | null;
                return metadata?.kind === 'dependency';
            })
            .map((edge) => ({
                targetId: edge.targetId,
                graphId: edge.graphId,
            }));
    }

    /**
     * Find all dependency edges where target is the given node
     * Returns source node IDs (predecessors)
     */
    async findDependencyPredecessors(nodeId: string): Promise<string[]> {
        const edges = await prisma.edge.findMany({
            where: {
                targetId: nodeId,
            },
            select: {
                sourceId: true,
                metadata: true,
            },
        });

        // Filter for dependency edges only
        return edges
            .filter((edge) => {
                const metadata = edge.metadata as { kind?: string } | null;
                return metadata?.kind === 'dependency';
            })
            .map((edge) => edge.sourceId);
    }

    /**
     * Check if all predecessor nodes are approved
     */
    async areAllPredecessorsApproved(nodeId: string): Promise<boolean> {
        const predecessorIds = await this.findDependencyPredecessors(nodeId);

        if (predecessorIds.length === 0) {
            return true; // No dependencies means approved by default
        }

        const predecessorNodes = await prisma.node.findMany({
            where: {
                id: { in: predecessorIds },
            },
            select: {
                id: true,
                approval: true,
            },
        });

        return predecessorNodes.every((node) => {
            const approval = node.approval as ApprovalPipeline | null;
            return approval?.status === 'APPROVED';
        });
    }
}
