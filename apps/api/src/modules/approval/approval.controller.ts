/**
 * Story 4.1: Approval Driven Workflow
 * Approval Controller - REST endpoints for approval operations
 */

import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Headers,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import type {
    ApprovalPipeline,
    ApprovalActionResponse,
    Deliverable,
} from '@cdm/types';

// DTOs for request bodies
interface ConfigureApprovalBody {
    steps: Array<{
        name: string;
        assigneeId: string;
    }>;
}

interface RejectBody {
    reason: string;
}

interface AddDeliverableBody {
    id: string;
    fileId: string;
    fileName: string;
    uploadedAt: string;
}

@Controller('approval')
export class ApprovalController {
    constructor(private readonly approvalService: ApprovalService) { }

    /**
     * GET /approval/:nodeId
     * Get approval status for a node
     */
    @Get(':nodeId')
    async getStatus(@Param('nodeId') nodeId: string): Promise<{ approval: ApprovalPipeline | null }> {
        const approval = await this.approvalService.getApprovalStatus(nodeId);
        return { approval };
    }

    /**
     * POST /approval/:nodeId/configure
     * Configure approval workflow for a node
     */
    @Post(':nodeId/configure')
    @HttpCode(HttpStatus.OK)
    async configure(
        @Param('nodeId') nodeId: string,
        @Body() body: ConfigureApprovalBody
    ): Promise<ApprovalActionResponse> {
        if (!body.steps || body.steps.length === 0) {
            throw new BadRequestException('At least one approval step is required');
        }

        const approval = await this.approvalService.configureApproval({
            nodeId,
            steps: body.steps,
        });

        return {
            success: true,
            approval,
            message: 'Approval workflow configured',
        };
    }

    /**
     * POST /approval/:nodeId/submit
     * Submit node for approval
     */
    @Post(':nodeId/submit')
    @HttpCode(HttpStatus.OK)
    async submit(
        @Param('nodeId') nodeId: string,
        @Headers('x-user-id') userId: string
    ): Promise<ApprovalActionResponse> {
        // In production, userId would come from auth middleware
        // For now, accept from header or use mock
        const effectiveUserId = userId || 'mock-user-id';

        const approval = await this.approvalService.submit(nodeId, effectiveUserId);

        return {
            success: true,
            approval,
            message: 'Submitted for approval',
        };
    }

    /**
     * POST /approval/:nodeId/approve
     * Approve current step
     */
    @Post(':nodeId/approve')
    @HttpCode(HttpStatus.OK)
    async approve(
        @Param('nodeId') nodeId: string,
        @Headers('x-user-id') userId: string
    ): Promise<ApprovalActionResponse> {
        const effectiveUserId = userId || 'mock-user-id';

        const approval = await this.approvalService.approve(nodeId, effectiveUserId);

        return {
            success: true,
            approval,
            message: approval.status === 'APPROVED' ? 'Fully approved' : 'Step approved',
        };
    }

    /**
     * POST /approval/:nodeId/reject
     * Reject current step (requires reason)
     */
    @Post(':nodeId/reject')
    @HttpCode(HttpStatus.OK)
    async reject(
        @Param('nodeId') nodeId: string,
        @Headers('x-user-id') userId: string,
        @Body() body: RejectBody
    ): Promise<ApprovalActionResponse> {
        if (!body.reason || body.reason.trim().length === 0) {
            throw new BadRequestException('Rejection reason is required');
        }

        const effectiveUserId = userId || 'mock-user-id';

        const approval = await this.approvalService.reject(
            nodeId,
            effectiveUserId,
            body.reason
        );

        return {
            success: true,
            approval,
            message: 'Rejected',
        };
    }

    /**
     * POST /approval/:nodeId/deliverables
     * Add a deliverable to the node
     */
    @Post(':nodeId/deliverables')
    @HttpCode(HttpStatus.CREATED)
    async addDeliverable(
        @Param('nodeId') nodeId: string,
        @Body() body: AddDeliverableBody
    ): Promise<{ deliverables: Deliverable[] }> {
        const deliverable: Deliverable = {
            id: body.id,
            fileId: body.fileId,
            fileName: body.fileName,
            uploadedAt: body.uploadedAt,
        };

        const deliverables = await this.approvalService.addDeliverable(nodeId, deliverable);
        return { deliverables };
    }
}
