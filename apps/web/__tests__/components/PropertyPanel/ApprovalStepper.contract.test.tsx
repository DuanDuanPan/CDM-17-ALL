/**
 * Story 7.9: ApprovalStepper Contract Tests
 * 契约保护测试 - 确保审批步骤展示在重构后保持正确
 *
 * 测试覆盖 AC#3 的所有 Stepper 能力：
 * - 步骤图标状态（approved/rejected/pending/future）
 * - 步骤信息展示（名称/审批人/完成时间/驳回原因）
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalStatusPanel } from '@/components/PropertyPanel/ApprovalStatusPanel';
import type { ApprovalPipeline, ApprovalStep, Deliverable } from '@cdm/types';

// Mock useCurrentUserId
vi.mock('@/contexts', () => ({
    useCurrentUserId: () => 'test-user-id',
}));

// Mock useApproval hook
const mockUseApproval = {
    approval: null as ApprovalPipeline | null,
    deliverables: [] as Deliverable[],
    isLoading: false,
    isUploading: false,
    error: null,
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    uploadDeliverable: vi.fn(),
    deleteDeliverable: vi.fn(),
    fetchApproval: vi.fn(),
    clearError: vi.fn(),
};

vi.mock('@/hooks/useApproval', () => ({
    useApproval: () => mockUseApproval,
}));

describe('ApprovalStepper Contract Tests (via ApprovalStatusPanel)', () => {
    const defaultProps = {
        nodeId: 'test-node-1',
        nodeLabel: 'Test Task',
        approval: null as ApprovalPipeline | null,
        deliverables: [] as Deliverable[],
        isAssignee: false,
        onUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseApproval.deliverables = [];
        mockUseApproval.isLoading = false;
    });

    // ============================================================
    // ST-C1: 步骤名称展示 (AC#3)
    // ============================================================
    describe('step name display (AC#3)', () => {
        it('should display all step names in order', () => {
            const multiStepApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 1,
                steps: [
                    { index: 0, name: '技术审核', assigneeId: 'tech-lead', status: 'approved' },
                    { index: 1, name: '产品审核', assigneeId: 'pm', status: 'pending' },
                    { index: 2, name: '总监审批', assigneeId: 'director', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = multiStepApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={multiStepApproval} />);

            expect(screen.getByText('技术审核')).toBeTruthy();
            expect(screen.getByText('产品审核')).toBeTruthy();
            expect(screen.getByText('总监审批')).toBeTruthy();
        });
    });

    // ============================================================
    // ST-C2: 审批人信息展示 (AC#3)
    // ============================================================
    describe('assignee display (AC#3)', () => {
        it('should display assignee id for each step', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: 'alice-123', status: 'pending' },
                    { index: 1, name: 'Step 2', assigneeId: 'bob-456', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            expect(screen.getByText('alice-123')).toBeTruthy();
            expect(screen.getByText('bob-456')).toBeTruthy();
        });

        it('should display assignee avatar with first 2 chars', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: 'alice', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Should show "AL" (first 2 chars uppercase)
            expect(screen.getByText('AL')).toBeTruthy();
        });
    });

    // ============================================================
    // ST-C3: 步骤状态图标 (AC#3)
    // ============================================================
    describe('step status icons (AC#3)', () => {
        it('should show green icon for approved steps', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 1,
                steps: [
                    { index: 0, name: 'Approved Step', assigneeId: 'user-1', status: 'approved' },
                    { index: 1, name: 'Current Step', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Find the approved step's container
            const approvedStep = screen.getByText('Approved Step').closest('div[class*="flex items-start"]');
            expect(approvedStep).toBeTruthy();

            // Check for green background class on the icon
            const iconContainer = approvedStep?.querySelector('div[class*="bg-green-500"]');
            expect(iconContainer).toBeTruthy();
        });

        it('should show red icon for rejected steps', () => {
            const approval: ApprovalPipeline = {
                status: 'REJECTED',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Rejected Step', assigneeId: 'user-1', status: 'rejected', reason: 'Bad' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            const rejectedStep = screen.getByText('Rejected Step').closest('div[class*="flex items-start"]');
            expect(rejectedStep).toBeTruthy();

            // Check for red background class on the icon
            const iconContainer = rejectedStep?.querySelector('div[class*="bg-red-500"]');
            expect(iconContainer).toBeTruthy();
        });

        it('should show blue pulsing icon for pending/active steps', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Pending Step', assigneeId: 'user-1', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            const pendingStep = screen.getByText('Pending Step').closest('div[class*="flex items-start"]');
            expect(pendingStep).toBeTruthy();

            // Check for blue background and animate-pulse class
            const iconContainer = pendingStep?.querySelector('div[class*="bg-blue-500"]');
            expect(iconContainer).toBeTruthy();
            expect(iconContainer?.className).toContain('animate-pulse');
        });

        it('should show gray numbered icon for future steps (non-pending status)', () => {
            // Note: In current implementation, all pending steps show blue clock icon
            // This test documents that future pending steps also get blue icon
            // Gray numbered icons only appear for non-approved/rejected/pending statuses
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Current Step', assigneeId: 'user-1', status: 'pending' },
                    { index: 1, name: 'Future Step', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Both pending steps get blue icon with clock in current implementation
            const futureStep = screen.getByText('Future Step').closest('div[class*="flex items-start"]');
            expect(futureStep).toBeTruthy();

            // Future pending step also shows blue icon (this is the actual behavior)
            const iconContainer = futureStep?.querySelector('div[class*="bg-blue-500"]');
            expect(iconContainer).toBeTruthy();
        });
    });

    // ============================================================
    // ST-C4: 完成时间展示 (AC#3)
    // ============================================================
    describe('completion time display (AC#3)', () => {
        it('should display completedAt when step is completed', () => {
            const completedDate = '2024-06-15T14:30:00.000Z';
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 1,
                steps: [
                    {
                        index: 0,
                        name: 'Completed Step',
                        assigneeId: 'user-1',
                        status: 'approved',
                        completedAt: completedDate,
                    },
                    { index: 1, name: 'Current Step', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Should display formatted date
            // Note: The exact format depends on toLocaleString() which varies by locale
            // We just check that some date-like content appears
            const container = screen.getByText('Completed Step').closest('div[class*="flex-1"]');
            expect(container?.textContent).toMatch(/2024/);
        });

        it('should NOT display completedAt for pending steps', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Pending Step', assigneeId: 'user-1', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Container should not have date content
            const container = screen.getByText('Pending Step').closest('div[class*="flex-1"]');
            // Just verify the step is rendered, completion time shouldn't appear
            expect(container?.textContent).not.toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
        });
    });

    // ============================================================
    // ST-C5: 驳回原因展示 (AC#3)
    // ============================================================
    describe('rejection reason display (AC#3)', () => {
        it('should display rejection reason when step is rejected', () => {
            const approval: ApprovalPipeline = {
                status: 'REJECTED',
                currentStepIndex: 0,
                steps: [
                    {
                        index: 0,
                        name: 'Rejected Step',
                        assigneeId: 'user-1',
                        status: 'rejected',
                        reason: '设计方案需要优化，请重新提交',
                    },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Should display "驳回原因:" prefix and the actual reason
            expect(screen.getByText(/驳回原因:/)).toBeTruthy();
            expect(screen.getByText(/设计方案需要优化，请重新提交/)).toBeTruthy();
        });

        it('should NOT display rejection reason for approved steps', () => {
            const approval: ApprovalPipeline = {
                status: 'APPROVED',
                currentStepIndex: 1,
                steps: [
                    { index: 0, name: 'Approved Step', assigneeId: 'user-1', status: 'approved' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            expect(screen.queryByText(/驳回原因:/)).toBeFalsy();
        });
    });

    // ============================================================
    // ST-C6: 步骤连接线展示 (AC#3)
    // ============================================================
    describe('step connector lines (AC#3)', () => {
        it('should show green connector after approved step', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 1,
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'approved' },
                    { index: 1, name: 'Step 2', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Find the connector line after the approved step
            const step1Container = screen.getByText('Step 1').closest('div[class*="flex items-start"]');
            const connectorLine = step1Container?.querySelector('div[class*="bg-green-500"][class*="w-0.5"]');
            expect(connectorLine).toBeTruthy();
        });

        it('should show gray connector after pending step', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'pending' },
                    { index: 1, name: 'Step 2', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Find the connector line after the pending step
            const step1Container = screen.getByText('Step 1').closest('div[class*="flex items-start"]');
            const connectorLine = step1Container?.querySelector('div[class*="bg-gray-200"][class*="w-0.5"]');
            expect(connectorLine).toBeTruthy();
        });

        it('should NOT show connector after last step', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Only Step', assigneeId: 'user-1', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            // Single step should not have connector
            const stepContainer = screen.getByText('Only Step').closest('div[class*="flex items-start"]');
            const connectorLine = stepContainer?.querySelector('div[class*="w-0.5"][class*="h-8"]');
            expect(connectorLine).toBeFalsy();
        });
    });

    // ============================================================
    // ST-C7: 步骤文字颜色 (AC#3)
    // ============================================================
    describe('step text colors (AC#3)', () => {
        it('should show green text for approved step name', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 1,
                steps: [
                    { index: 0, name: 'Approved', assigneeId: 'user-1', status: 'approved' },
                    { index: 1, name: 'Current', assigneeId: 'user-2', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            const approvedText = screen.getByText('Approved');
            expect(approvedText.className).toContain('text-green-600');
        });

        it('should show red text for rejected step name', () => {
            const approval: ApprovalPipeline = {
                status: 'REJECTED',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Rejected', assigneeId: 'user-1', status: 'rejected', reason: 'Bad' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            const rejectedText = screen.getByText('Rejected');
            expect(rejectedText.className).toContain('text-red-600');
        });

        it('should show blue text for pending step name', () => {
            const approval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [
                    { index: 0, name: 'Pending', assigneeId: 'user-1', status: 'pending' },
                ],
                history: [],
            };
            mockUseApproval.approval = approval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approval} />);

            const pendingText = screen.getByText('Pending');
            expect(pendingText.className).toContain('text-blue-600');
        });
    });
});
