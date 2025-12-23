/**
 * Story 4.1: Approval Driven Workflow
 * Approval Service - Business logic for approval workflow
 */

import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalRepository } from './approval.repository';
import type {
    ApprovalPipeline,
    ApprovalStep,
    ApprovalHistoryEntry,
    ApprovalRequestedEvent,
    ApprovalResolvedEvent,
    ConfigureApprovalDto,
    Deliverable,
} from '@cdm/types';

// Event names
export const APPROVAL_EVENTS = {
    REQUESTED: 'approval.requested',
    RESOLVED: 'approval.resolved',
} as const;

@Injectable()
export class ApprovalService {
    private readonly logger = new Logger(ApprovalService.name);

    constructor(
        private readonly approvalRepo: ApprovalRepository,
        private readonly eventEmitter: EventEmitter2
    ) { }

    /**
     * Configure approval workflow for a node
     * Creates the initial approval pipeline with specified steps
     */
    async configureApproval(dto: ConfigureApprovalDto): Promise<ApprovalPipeline> {
        const node = await this.approvalRepo.findNodeWithApproval(dto.nodeId);
        if (!node) {
            throw new NotFoundException(`Node ${dto.nodeId} not found`);
        }

        if (node.type !== 'TASK') {
            throw new BadRequestException('Approval can only be configured for TASK nodes');
        }

        const steps: ApprovalStep[] = dto.steps.map((step, index) => ({
            index,
            name: step.name,
            assigneeId: step.assigneeId,
            status: 'waiting',
        }));

        const pipeline: ApprovalPipeline = {
            status: 'NONE',
            currentStepIndex: 0,
            steps,
            history: [],
        };

        await this.approvalRepo.updateApproval(dto.nodeId, pipeline);
        this.logger.log(`Configured approval for node ${dto.nodeId} with ${steps.length} steps`);

        return pipeline;
    }

    /**
     * Submit node for approval
     * Validates deliverables exist, updates status to PENDING, emits event
     */
    async submit(nodeId: string, userId: string): Promise<ApprovalPipeline> {
        const node = await this.approvalRepo.findNodeWithApproval(nodeId);
        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        // Validate node is a TASK
        if (node.type !== 'TASK') {
            throw new BadRequestException('Only TASK nodes can be submitted for approval');
        }

        // Validate approval is configured
        const approval = node.approval;
        if (!approval || approval.steps.length === 0) {
            throw new BadRequestException('Approval workflow is not configured for this node');
        }

        // Validate deliverables exist
        const deliverables = node.taskProps?.deliverables;
        if (!deliverables || deliverables.length === 0) {
            throw new BadRequestException('Cannot submit for approval without deliverables');
        }

        // Validate current status allows submission
        if (approval.status === 'PENDING') {
            throw new BadRequestException('Node is already pending approval');
        }
        if (approval.status === 'APPROVED') {
            throw new BadRequestException('Node is already approved');
        }

        // Update approval status
        const currentStep = approval.steps[approval.currentStepIndex];
        currentStep.status = 'pending';

        const historyEntry: ApprovalHistoryEntry = {
            timestamp: new Date().toISOString(),
            action: 'submitted',
            actorId: userId,
            stepIndex: approval.currentStepIndex,
        };

        const updatedPipeline: ApprovalPipeline = {
            ...approval,
            status: 'PENDING',
            history: [...approval.history, historyEntry],
        };

        await this.approvalRepo.updateApproval(nodeId, updatedPipeline);

        // Emit event for notification
        const event: ApprovalRequestedEvent = {
            nodeId,
            requesterId: userId,
            approverId: currentStep.assigneeId,
            stepIndex: approval.currentStepIndex,
        };
        this.eventEmitter.emit(APPROVAL_EVENTS.REQUESTED, event);

        this.logger.log(`Node ${nodeId} submitted for approval by ${userId}`);
        return updatedPipeline;
    }

    /**
     * Approve current step
     * Advances to next step or marks as APPROVED if all steps complete
     */
    async approve(nodeId: string, approverId: string): Promise<ApprovalPipeline> {
        const node = await this.approvalRepo.findNodeWithApproval(nodeId);
        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        const approval = node.approval;
        if (!approval) {
            throw new BadRequestException('No approval workflow configured');
        }

        if (approval.status !== 'PENDING') {
            throw new BadRequestException('Node is not pending approval');
        }

        // Validate approver authority
        const currentStep = approval.steps[approval.currentStepIndex];
        if (currentStep.assigneeId !== approverId) {
            throw new ForbiddenException('You are not authorized to approve this step');
        }

        // Mark current step as approved
        currentStep.status = 'approved';
        currentStep.completedAt = new Date().toISOString();

        const historyEntry: ApprovalHistoryEntry = {
            timestamp: new Date().toISOString(),
            action: 'approved',
            actorId: approverId,
            stepIndex: approval.currentStepIndex,
        };

        let updatedPipeline: ApprovalPipeline;

        // Check if more steps remain
        const nextStepIndex = approval.currentStepIndex + 1;
        if (nextStepIndex < approval.steps.length) {
            // Advance to next step
            approval.steps[nextStepIndex].status = 'pending';
            updatedPipeline = {
                ...approval,
                currentStepIndex: nextStepIndex,
                history: [...approval.history, historyEntry],
            };

            // Emit request event for next approver
            const nextStep = approval.steps[nextStepIndex];
            const requestEvent: ApprovalRequestedEvent = {
                nodeId,
                requesterId: approverId,
                approverId: nextStep.assigneeId,
                stepIndex: nextStepIndex,
            };
            this.eventEmitter.emit(APPROVAL_EVENTS.REQUESTED, requestEvent);
        } else {
            // All steps complete - mark as APPROVED
            updatedPipeline = {
                ...approval,
                status: 'APPROVED',
                history: [...approval.history, historyEntry],
            };

            // Emit resolved event for dependency unlocking
            const resolvedEvent: ApprovalResolvedEvent = {
                nodeId,
                status: 'APPROVED',
                approverId,
                stepIndex: approval.currentStepIndex,
            };
            this.eventEmitter.emit(APPROVAL_EVENTS.RESOLVED, resolvedEvent);
        }

        await this.approvalRepo.updateApproval(nodeId, updatedPipeline);
        this.logger.log(`Node ${nodeId} step ${approval.currentStepIndex} approved by ${approverId}`);

        return updatedPipeline;
    }

    /**
     * Reject current step
     * Requires rejection reason, marks as REJECTED
     */
    async reject(nodeId: string, approverId: string, reason: string): Promise<ApprovalPipeline> {
        if (!reason || reason.trim().length === 0) {
            throw new BadRequestException('Rejection reason is required');
        }

        const node = await this.approvalRepo.findNodeWithApproval(nodeId);
        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        const approval = node.approval;
        if (!approval) {
            throw new BadRequestException('No approval workflow configured');
        }

        if (approval.status !== 'PENDING') {
            throw new BadRequestException('Node is not pending approval');
        }

        // Validate approver authority
        const currentStep = approval.steps[approval.currentStepIndex];
        if (currentStep.assigneeId !== approverId) {
            throw new ForbiddenException('You are not authorized to reject this step');
        }

        // Mark current step as rejected
        currentStep.status = 'rejected';
        currentStep.completedAt = new Date().toISOString();
        currentStep.reason = reason.trim();

        const historyEntry: ApprovalHistoryEntry = {
            timestamp: new Date().toISOString(),
            action: 'rejected',
            actorId: approverId,
            stepIndex: approval.currentStepIndex,
            reason: reason.trim(),
        };

        const updatedPipeline: ApprovalPipeline = {
            ...approval,
            status: 'REJECTED',
            history: [...approval.history, historyEntry],
        };

        await this.approvalRepo.updateApproval(nodeId, updatedPipeline);

        // Emit resolved event
        const resolvedEvent: ApprovalResolvedEvent = {
            nodeId,
            status: 'REJECTED',
            approverId,
            stepIndex: approval.currentStepIndex,
            reason: reason.trim(),
        };
        this.eventEmitter.emit(APPROVAL_EVENTS.RESOLVED, resolvedEvent);

        this.logger.log(`Node ${nodeId} rejected by ${approverId}: ${reason}`);
        return updatedPipeline;
    }

    /**
     * Get current approval status for a node
     */
    async getApprovalStatus(nodeId: string): Promise<ApprovalPipeline | null> {
        const node = await this.approvalRepo.findNodeWithApproval(nodeId);
        return node?.approval ?? null;
    }

    /**
     * Add deliverable to a task node
     */
    async addDeliverable(nodeId: string, deliverable: Deliverable): Promise<Deliverable[]> {
        const taskProps = await this.approvalRepo.getTaskProps(nodeId);
        if (!taskProps) {
            throw new NotFoundException(`Task props not found for node ${nodeId}`);
        }

        const existingDeliverables = (taskProps.deliverables as Deliverable[] | null) || [];
        const updatedDeliverables = [...existingDeliverables, deliverable];

        await this.approvalRepo.updateDeliverables(nodeId, updatedDeliverables);
        return updatedDeliverables;
    }

    /**
     * Remove deliverable from a task node
     */
    async removeDeliverable(nodeId: string, deliverableId: string): Promise<Deliverable[]> {
        const taskProps = await this.approvalRepo.getTaskProps(nodeId);
        if (!taskProps) {
            throw new NotFoundException(`Task props not found for node ${nodeId}`);
        }

        const existingDeliverables = (taskProps.deliverables as Deliverable[] | null) || [];
        const updatedDeliverables = existingDeliverables.filter((d) => d.id !== deliverableId);

        await this.approvalRepo.updateDeliverables(nodeId, updatedDeliverables);
        return updatedDeliverables;
    }
}
