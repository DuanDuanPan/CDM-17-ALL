/**
 * Story 4.1: Approval Driven Workflow
 * Approval Listener - Event handlers for approval events
 * Handles dependency unlocking when approval is resolved
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApprovalRepository } from './approval.repository';
import { NotificationService } from '../notification/notification.service';
import { APPROVAL_EVENTS } from './approval.service';
import type { ApprovalRequestedEvent, ApprovalResolvedEvent } from '@cdm/types';
import { prisma } from '@cdm/database';

@Injectable()
export class ApprovalListener {
    private readonly logger = new Logger(ApprovalListener.name);

    constructor(
        private readonly approvalRepo: ApprovalRepository,
        private readonly notificationService: NotificationService
    ) { }

    /**
     * Handle approval.requested event
     * Sends notification to the approver
     */
    @OnEvent(APPROVAL_EVENTS.REQUESTED)
    async handleApprovalRequested(event: ApprovalRequestedEvent): Promise<void> {
        this.logger.log(
            `Approval requested: node=${event.nodeId}, step=${event.stepIndex}, approver=${event.approverId}`
        );

        try {
            // Get node label for notification
            const node = await prisma.node.findUnique({
                where: { id: event.nodeId },
                select: { label: true },
            });

            if (!node) {
                this.logger.warn(`Node ${event.nodeId} not found for notification`);
                return;
            }

            // Get requester name
            const requester = await prisma.user.findUnique({
                where: { id: event.requesterId },
                select: { name: true },
            });

            await this.notificationService.createAndNotify({
                recipientId: event.approverId,
                type: 'APPROVAL_REQUESTED',
                title: `需要您审批: ${node.label}`,
                content: {
                    nodeId: event.nodeId,
                    nodeName: node.label,
                    action: 'approval_requested',
                    senderName: requester?.name || 'Unknown User',
                    stepIndex: event.stepIndex,
                },
                refNodeId: event.nodeId,
            });
        } catch (error) {
            this.logger.error(`Failed to send approval requested notification: ${error}`);
        }
    }

    /**
     * Handle approval.resolved event
     * 1. Send notification to original submitter
     * 2. If APPROVED, check and unlock dependent tasks
     */
    @OnEvent(APPROVAL_EVENTS.RESOLVED)
    async handleApprovalResolved(event: ApprovalResolvedEvent): Promise<void> {
        this.logger.log(
            `Approval resolved: node=${event.nodeId}, status=${event.status}, by=${event.approverId}`
        );

        try {
            // Get node info
            const node = await prisma.node.findUnique({
                where: { id: event.nodeId },
                select: { label: true },
            });

            if (!node) {
                this.logger.warn(`Node ${event.nodeId} not found`);
                return;
            }

            // Get approver name
            const approver = await prisma.user.findUnique({
                where: { id: event.approverId },
                select: { name: true },
            });

            // TODO: Get original submitter from history and send notification
            // For now, we focus on dependency unlocking

            // If approved, unlock dependent tasks
            if (event.status === 'APPROVED') {
                await this.unlockDependentTasks(event.nodeId);
            }
        } catch (error) {
            this.logger.error(`Failed to handle approval resolved: ${error}`);
        }
    }

    /**
     * Unlock dependent tasks when a node is approved
     * Check if all predecessor dependencies are satisfied
     */
    private async unlockDependentTasks(approvedNodeId: string): Promise<void> {
        this.logger.log(`Checking dependent tasks for node ${approvedNodeId}`);

        // Find all successor tasks (dependency edges where this node is the source)
        const successors = await this.approvalRepo.findDependencySuccessors(approvedNodeId);

        for (const successor of successors) {
            try {
                // Check if the successor is a TASK node
                const successorNode = await prisma.node.findUnique({
                    where: { id: successor.targetId },
                    select: { type: true, id: true, label: true },
                });

                if (!successorNode || successorNode.type !== 'TASK') {
                    continue;
                }

                // Check if all dependencies are met
                const allDependenciesMet = await this.approvalRepo.areAllPredecessorsApproved(
                    successor.targetId
                );

                if (allDependenciesMet) {
                    // Unlock the task by setting status to 'todo'
                    await this.approvalRepo.updateTaskStatus(successor.targetId, 'todo');
                    this.logger.log(
                        `Unlocked task ${successorNode.label} (${successor.targetId}) - all dependencies approved`
                    );

                    // TODO: Optionally write to Yjs for real-time sync
                    // This would require injecting the Hocuspocus server
                }
            } catch (error) {
                this.logger.error(
                    `Failed to unlock successor task ${successor.targetId}: ${error}`
                );
            }
        }
    }
}
