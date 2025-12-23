/**
 * Story 4.1: Approval Driven Workflow
 * Types and schemas for approval pipeline system
 */

import { z } from 'zod';

// ============================================================
// Approval Status Types
// ============================================================

/**
 * Approval status for a node
 * - NONE: No approval configured
 * - PENDING: Awaiting approval
 * - APPROVED: Approved by all required approvers
 * - REJECTED: Rejected by an approver
 */
export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Step status within an approval pipeline
 * - waiting: Step not yet active
 * - pending: Step is active, awaiting approval
 * - approved: Step completed with approval
 * - rejected: Step completed with rejection
 */
export type ApprovalStepStatus = 'waiting' | 'pending' | 'approved' | 'rejected';

// ============================================================
// Approval Step
// ============================================================

/**
 * A single step in the approval pipeline
 */
export interface ApprovalStep {
    index: number;
    name: string;           // e.g., "Tech Review", "Final Approval"
    assigneeId: string;     // User ID of approver
    status: ApprovalStepStatus;
    completedAt?: string;   // ISO 8601
    reason?: string;        // If rejected
}

// ============================================================
// Approval History
// ============================================================

/**
 * Actions that can be recorded in approval history
 */
export type ApprovalHistoryAction = 'submitted' | 'approved' | 'rejected';

/**
 * History entry for audit trail
 */
export interface ApprovalHistoryEntry {
    timestamp: string;        // ISO 8601
    action: ApprovalHistoryAction;
    actorId: string;
    stepIndex: number;
    reason?: string;          // Only for rejection
}

// ============================================================
// Approval Pipeline
// ============================================================

/**
 * The complete approval pipeline stored in Node.approval (JSONB)
 */
export interface ApprovalPipeline {
    status: ApprovalStatus;
    currentStepIndex: number;
    steps: ApprovalStep[];
    history: ApprovalHistoryEntry[];
}

// ============================================================
// Deliverable
// ============================================================

/**
 * A deliverable attachment for approval (stored in NodeTask.deliverables)
 */
export interface Deliverable {
    id: string;             // nanoid
    fileId: string;         // Reference to file storage
    fileName: string;
    uploadedAt: string;     // ISO 8601
}

// ============================================================
// Zod Schemas for Validation
// ============================================================

export const ApprovalStepSchema = z.object({
    index: z.number().int().min(0),
    name: z.string().min(1),
    assigneeId: z.string().min(1),
    status: z.enum(['waiting', 'pending', 'approved', 'rejected']),
    completedAt: z.string().datetime().optional(),
    reason: z.string().optional(),
});

export const ApprovalHistoryEntrySchema = z.object({
    timestamp: z.string().datetime(),
    action: z.enum(['submitted', 'approved', 'rejected']),
    actorId: z.string().min(1),
    stepIndex: z.number().int().min(0),
    reason: z.string().optional(),
});

export const ApprovalPipelineSchema = z.object({
    status: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']),
    currentStepIndex: z.number().int().min(0),
    steps: z.array(ApprovalStepSchema),
    history: z.array(ApprovalHistoryEntrySchema),
});

export const DeliverableSchema = z.object({
    id: z.string().min(1),
    fileId: z.string().min(1),
    fileName: z.string().min(1),
    uploadedAt: z.string().datetime(),
});

export const DeliverablesArraySchema = z.array(DeliverableSchema);

// ============================================================
// Event Payloads (for @nestjs/event-emitter)
// ============================================================

/**
 * Event payload when approval is requested
 */
export interface ApprovalRequestedEvent {
    nodeId: string;
    requesterId: string;
    approverId: string;
    stepIndex: number;
}

/**
 * Event payload when approval is resolved (approved or rejected)
 */
export interface ApprovalResolvedEvent {
    nodeId: string;
    status: 'APPROVED' | 'REJECTED';
    approverId: string;
    stepIndex: number;
    reason?: string;
}

// ============================================================
// DTOs for API
// ============================================================

export interface SubmitForApprovalDto {
    nodeId: string;
}

export interface ApproveNodeDto {
    nodeId: string;
}

export interface RejectNodeDto {
    nodeId: string;
    reason: string;  // Required
}

export interface ConfigureApprovalDto {
    nodeId: string;
    steps: Array<{
        name: string;
        assigneeId: string;
    }>;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApprovalActionResponse {
    success: boolean;
    approval: ApprovalPipeline;
    message?: string;
}
