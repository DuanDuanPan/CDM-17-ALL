/**
 * Story 7.5: Approval API Service
 * Centralized API calls for approval-related operations
 *
 * Refactoring:
 * - Extracted from WorkflowConfigDialog.tsx direct fetch call (1 instance)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Workflow step configuration
 */
export interface WorkflowStep {
    name: string;
    assigneeId: string;
}

/**
 * Configure approval workflow for a node
 * Used by: WorkflowConfigDialog
 */
export async function configureApprovalWorkflow(
    nodeId: string,
    steps: WorkflowStep[]
): Promise<void> {
    const response = await fetch(`${API_BASE}/api/approval/${nodeId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '配置失败');
    }
}
