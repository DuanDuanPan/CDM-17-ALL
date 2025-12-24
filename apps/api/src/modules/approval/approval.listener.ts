/**
 * Story 4.1: Approval Driven Workflow
 * Approval Listener - Event handlers for approval events
 * Handles dependency unlocking when approval is resolved
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApprovalRepository } from './approval.repository';
import { NotificationService } from '../notification/notification.service';
import { CollabService } from '../collab/collab.service';
import { APPROVAL_EVENTS } from './approval.service';
import type { ApprovalRequestedEvent, ApprovalResolvedEvent, ApprovalPipeline } from '@cdm/types';
import type { Doc as YDoc } from 'yjs';

@Injectable()
export class ApprovalListener {
    private readonly logger = new Logger(ApprovalListener.name);

    constructor(
        private readonly approvalRepo: ApprovalRepository,
        private readonly notificationService: NotificationService,
        private readonly collabService: CollabService
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
            // Story 4.1 FIX-10: Use Repository pattern for data access
            const nodeInfo = await this.approvalRepo.getNodeForNotification(event.nodeId);

            if (!nodeInfo) {
                this.logger.warn(`Node ${event.nodeId} not found for notification`);
                return;
            }

            // Get requester name using Repository
            const requesterName = await this.approvalRepo.getUserName(event.requesterId);

            await this.notificationService.createAndNotify({
                recipientId: event.approverId,
                type: 'APPROVAL_REQUESTED',
                title: `需要您审批: ${nodeInfo.label}`,
                content: {
                    nodeId: event.nodeId,
                    nodeName: nodeInfo.label,
                    action: 'approval_requested',
                    senderName: requesterName || 'Unknown User',
                    stepIndex: event.stepIndex,
                },
                refNodeId: event.nodeId,
            });

            // Story 4.1: Sync approval status (PENDING / step transitions) to Yjs for real-time node header updates
            if (nodeInfo.approval) {
                await this.syncApprovalToYjs(event.nodeId, nodeInfo.graphId, nodeInfo.approval);
            }
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
            // Story 4.1 FIX-10: Use Repository pattern for data access
            const nodeInfo = await this.approvalRepo.getNodeForNotification(event.nodeId);

            if (!nodeInfo) {
                this.logger.warn(`Node ${event.nodeId} not found`);
                return;
            }

            // Get approver name using Repository
            const approverName = await this.approvalRepo.getUserName(event.approverId);

            const approvalData = nodeInfo.approval as {
                history?: Array<{ action: string; actorId: string }>;
            } | null;

            // Find the most recent 'submitted' action to get the original submitter
            const submitter = approvalData?.history?.find(h => h.action === 'submitted');
            const submitterId = submitter?.actorId || nodeInfo.assigneeId;

            if (submitterId && submitterId !== event.approverId) {
                if (event.status === 'REJECTED') {
                    // Send rejection notification to submitter with reason
                    await this.notificationService.createAndNotify({
                        recipientId: submitterId,
                        type: 'APPROVAL_REJECTED',
                        title: `审批已驳回: ${nodeInfo.label}`,
                        content: {
                            nodeId: event.nodeId,
                            nodeName: nodeInfo.label,
                            action: 'approval_rejected',
                            senderName: approverName || 'Unknown Approver',
                            reason: event.reason || '未提供驳回原因',
                        },
                        refNodeId: event.nodeId,
                    });
                    this.logger.log(`Sent rejection notification to ${submitterId}`);
                } else if (event.status === 'APPROVED') {
                    // Send approval notification to submitter
                    await this.notificationService.createAndNotify({
                        recipientId: submitterId,
                        type: 'APPROVAL_APPROVED',
                        title: `审批已通过: ${nodeInfo.label}`,
                        content: {
                            nodeId: event.nodeId,
                            nodeName: nodeInfo.label,
                            action: 'approval_approved',
                            senderName: approverName || 'Unknown Approver',
                        },
                        refNodeId: event.nodeId,
                    });
                    this.logger.log(`Sent approval notification to ${submitterId}`);
                }
            }

            // Story 4.1 FIX-3: Sync approval status to Yjs for real-time client updates
            if (nodeInfo.approval) {
                await this.syncApprovalToYjs(event.nodeId, nodeInfo.graphId, nodeInfo.approval as unknown as ApprovalPipeline);
            }

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
                // Story 4.1 FIX-10: Use Repository pattern for data access
                const successorType = await this.approvalRepo.getNodeType(successor.targetId);
                const successorLabel = await this.approvalRepo.getNodeLabel(successor.targetId);

                if (!successorType || successorType !== 'TASK') {
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
                        `Unlocked task ${successorLabel} (${successor.targetId}) - all dependencies approved`
                    );

                    // Story 4.1 FIX-3: Sync task status to Yjs for real-time updates
                    await this.syncTaskStatusToYjs(successor.targetId, successor.graphId, 'todo');
                }
            } catch (error) {
                this.logger.error(
                    `Failed to unlock successor task ${successor.targetId}: ${error}`
                );
            }
        }
    }

    /**
     * Story 4.1 FIX-3: Sync approval status to Yjs for real-time client updates
     * Updates the node's approval field in the active Yjs document
     */
    private async syncApprovalToYjs(nodeId: string, graphId: string, approval: ApprovalPipeline): Promise<void> {
        try {
            const server = this.collabService.getServer();
            if (!server) {
                this.logger.warn('Hocuspocus server not available for Yjs sync');
                return;
            }

            const documentName = `graph:${graphId}`;
            const documents = (server as unknown as { documents?: Map<string, YDoc> }).documents;

            if (!documents || !documents.has(documentName)) {
                this.logger.debug(`Document ${documentName} not currently open, skipping Yjs sync`);
                return;
            }

            const doc = documents.get(documentName);
            if (!doc) return;

            const yNodes = doc.getMap<Record<string, unknown>>('nodes');
            const existingNode = yNodes.get(nodeId);

            if (existingNode) {
                // Update the node with new approval status
                const updatedNode = {
                    ...existingNode,
                    approval: approval,
                    updatedAt: new Date().toISOString(),
                };
                yNodes.set(nodeId, updatedNode);
                this.logger.log(`Synced approval status to Yjs for node ${nodeId}`);
            } else {
                this.logger.debug(`Node ${nodeId} not found in Yjs document, skipping sync`);
            }
        } catch (error) {
            this.logger.error(`Failed to sync approval to Yjs: ${error}`);
        }
    }

    /**
     * Story 4.1 FIX-3: Sync task status change to Yjs for real-time updates
     * Used when dependency unlocking changes a task's status
     */
    private async syncTaskStatusToYjs(nodeId: string, graphId: string, status: string): Promise<void> {
        try {
            const server = this.collabService.getServer();
            if (!server) {
                this.logger.warn('Hocuspocus server not available for Yjs sync');
                return;
            }

            const documentName = `graph:${graphId}`;
            const documents = (server as unknown as { documents?: Map<string, YDoc> }).documents;

            if (!documents || !documents.has(documentName)) {
                this.logger.debug(`Document ${documentName} not currently open, skipping Yjs sync`);
                return;
            }

            const doc = documents.get(documentName);
            if (!doc) return;

            const yNodes = doc.getMap<Record<string, unknown>>('nodes');
            const existingNode = yNodes.get(nodeId);

            if (existingNode) {
                // Update the node's task props with new status
                const currentProps = existingNode.props || {};
                const updatedNode = {
                    ...existingNode,
                    props: {
                        ...currentProps,
                        status: status,
                    },
                    updatedAt: new Date().toISOString(),
                };
                yNodes.set(nodeId, updatedNode);
                this.logger.log(`Synced task status to Yjs for node ${nodeId}: ${status}`);
            } else {
                this.logger.debug(`Node ${nodeId} not found in Yjs document, skipping sync`);
            }
        } catch (error) {
            this.logger.error(`Failed to sync task status to Yjs: ${error}`);
        }
    }
}
