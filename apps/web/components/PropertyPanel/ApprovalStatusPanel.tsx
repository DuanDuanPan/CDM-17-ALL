'use client';

/**
 * Story 4.1: Approval Driven Workflow
 * Story 7.2: Refactored to use useApproval hook (Hook-First Pattern)
 * Story 7.9: Component decomposition - extracted to sub-components
 *
 * ApprovalStatusPanel - Container component for approval workflow management
 * Orchestrates sub-components and handles data/permission flow.
 *
 * Sub-components:
 * - ApprovalHistory: Step visualization (Stepper)
 * - DeliverablesSection: File upload/preview/download/delete
 * - ApprovalActions: Submit/Approve/Reject buttons
 * - ApprovalStatus: Header, badges, and unconfigured state
 */

import { useState } from 'react';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';
import { WorkflowConfigDialog } from './WorkflowConfigDialog';
import { ApprovalHistory } from './ApprovalHistory';
import { DeliverablesSection } from './DeliverablesSection';
import { ApprovalActions } from './ApprovalActions';
import { ApprovalStatusHeader, UnconfiguredApproval, ApprovalStatusMessage } from './ApprovalStatus';

import { useCurrentUserId } from '@/contexts';
import { useApproval } from '@/hooks/useApproval';

// Props
interface ApprovalStatusPanelProps {
    nodeId: string;
    nodeLabel: string;
    approval: ApprovalPipeline | null;
    deliverables: Deliverable[];
    isAssignee: boolean;
    /** Callback when deliverables change - receives updated deliverables for Yjs sync */
    onUpdate?: (payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => void;
}

/**
 * ApprovalStatusPanel - Main container component
 *
 * Responsibilities:
 * - Orchestrate useApproval hook data
 * - Compute permissions (canSubmit, canApprove, canReject)
 * - Coordinate sub-component callbacks
 * - Manage WorkflowConfigDialog state
 *
 * Story 7.2: Uses useApproval hook instead of direct fetch calls
 * Story 7.9: Delegates UI rendering to extracted sub-components
 */
export function ApprovalStatusPanel({
    nodeId,
    nodeLabel: _nodeLabel,
    approval: initialApproval,
    deliverables: initialDeliverables,
    isAssignee,
    onUpdate,
}: ApprovalStatusPanelProps) {
    const currentUserId = useCurrentUserId();
    const [showConfigDialog, setShowConfigDialog] = useState(false);

    // Story 7.2: Use useApproval hook instead of direct fetch calls
    const {
        approval,
        deliverables,
        isLoading,
        isUploading,
        submit,
        approve,
        reject,
        uploadDeliverable,
        deleteDeliverable,
        fetchApproval,
    } = useApproval(nodeId, {
        initialApproval,
        initialDeliverables,
        onUpdate,
    });

    // Handler to refresh data after configuration
    const handleRefreshAfterConfig = async () => {
        const snapshot = await fetchApproval();
        onUpdate?.({
            approval: snapshot?.approval ?? approval ?? null,
            deliverables: snapshot?.deliverables ?? deliverables,
        });
    };

    // Determine user role and permissions
    const currentStep = approval?.steps?.[approval.currentStepIndex];
    const isApprover = currentStep?.assigneeId === currentUserId;
    const canSubmit = isAssignee && approval?.status !== 'PENDING' && approval?.status !== 'APPROVED' && deliverables.length > 0;
    const canApprove = isApprover && approval?.status === 'PENDING';
    const canReject = isApprover && approval?.status === 'PENDING';

    // Action handlers using hook methods
    const handleSubmit = async () => {
        try {
            await submit();
        } catch {
            // Error already handled in hook
        }
    };

    const handleApprove = async () => {
        try {
            await approve();
        } catch {
            // Error already handled in hook
        }
    };

    const handleReject = async (reason: string) => {
        try {
            await reject(reason);
        } catch {
            // Error already handled in hook
        }
    };

    const hasSteps = (approval?.steps?.length ?? 0) > 0;

    // Not configured state - delegate to UnconfiguredApproval
    if (!approval || approval.steps.length === 0) {
        return (
            <>
                <UnconfiguredApproval onConfigure={() => setShowConfigDialog(true)} />

                {showConfigDialog && (
                    <WorkflowConfigDialog
                        nodeId={nodeId}
                        onClose={() => setShowConfigDialog(false)}
                        onConfigured={handleRefreshAfterConfig}
                    />
                )}
            </>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <ApprovalStatusHeader status={approval.status} hasSteps={hasSteps} />

            <div className="p-4 space-y-4">
                {/* Stepper - Story 7.9: Extracted to ApprovalHistory */}
                <ApprovalHistory
                    steps={approval.steps}
                    currentStepIndex={approval.currentStepIndex}
                />

                <hr className="border-gray-100" />

                {/* Deliverables - Story 7.9: Extracted to DeliverablesSection */}
                <DeliverablesSection
                    deliverables={deliverables}
                    canEdit={isAssignee && approval.status !== 'APPROVED'}
                    onUpload={uploadDeliverable}
                    onDelete={deleteDeliverable}
                    isUploading={isUploading}
                />

                <hr className="border-gray-100" />

                {/* Actions - Story 7.9: Extracted to ApprovalActions */}
                <ApprovalActions
                    canSubmit={canSubmit}
                    canApprove={canApprove}
                    canReject={canReject}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />

                {/* Status message */}
                <ApprovalStatusMessage status={approval.status} />
            </div>
        </div>
    );
}

export default ApprovalStatusPanel;
