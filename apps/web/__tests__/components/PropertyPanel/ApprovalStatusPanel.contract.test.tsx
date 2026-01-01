/**
 * Story 7.9: ApprovalStatusPanel Contract Tests
 * 契约保护测试 - 确保重构不破坏现有行为
 *
 * 这些测试在重构前建立，重构后必须继续通过
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalStatusPanel } from '@/components/PropertyPanel/ApprovalStatusPanel';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';

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

// Mock WorkflowConfigDialog
vi.mock('@/components/PropertyPanel/WorkflowConfigDialog', () => ({
    WorkflowConfigDialog: ({ onClose, onConfigured }: {
        nodeId: string;
        onClose: () => void;
        onConfigured: () => void;
    }) => (
        <div data-testid="workflow-config-dialog">
            <button data-testid="close-config-dialog" onClick={onClose}>Close</button>
            <button data-testid="confirm-config" onClick={() => {
                onConfigured();
                onClose();
            }}>Confirm</button>
        </div>
    ),
}));

describe('ApprovalStatusPanel Contract Tests', () => {
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
        mockUseApproval.approval = null;
        mockUseApproval.deliverables = [];
        mockUseApproval.isLoading = false;
        mockUseApproval.isUploading = false;
    });

    // ============================================================
    // C1: 未配置审批流程展示 (AC#5)
    // ============================================================
    describe('unconfigured workflow (AC#5)', () => {
        it('should show "配置流程" button when approval is null', () => {
            mockUseApproval.approval = null;

            render(<ApprovalStatusPanel {...defaultProps} approval={null} />);

            expect(screen.getByText('配置流程')).toBeTruthy();
        });

        it('should show "配置审批流程" button when steps array is empty', () => {
            const emptyApproval: ApprovalPipeline = {
                status: 'NONE',
                currentStepIndex: 0,
                steps: [],
                history: [],
            };
            mockUseApproval.approval = emptyApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={emptyApproval} />);

            expect(screen.getByText('配置审批流程')).toBeTruthy();
        });

        it('should show empty state message when unconfigured', () => {
            mockUseApproval.approval = null;

            render(<ApprovalStatusPanel {...defaultProps} approval={null} />);

            expect(screen.getByText('此任务未配置审批流程')).toBeTruthy();
        });

        it('should open WorkflowConfigDialog on configure button click', () => {
            mockUseApproval.approval = null;

            render(<ApprovalStatusPanel {...defaultProps} approval={null} />);

            // Click the "配置流程" button in header
            const configButton = screen.getByText('配置流程');
            fireEvent.click(configButton);

            expect(screen.getByTestId('workflow-config-dialog')).toBeTruthy();
        });

        it('should open WorkflowConfigDialog on main configure button click', () => {
            mockUseApproval.approval = null;

            render(<ApprovalStatusPanel {...defaultProps} approval={null} />);

            // Click the main "配置审批流程" button
            const configButton = screen.getByText('配置审批流程');
            fireEvent.click(configButton);

            expect(screen.getByTestId('workflow-config-dialog')).toBeTruthy();
        });
    });

    // ============================================================
    // C2: 状态徽章映射 (AC#5)
    // ============================================================
    describe('status badge mapping (AC#5)', () => {
        it('should show "待审批" badge for PENDING status', () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            expect(screen.getByText('待审批')).toBeTruthy();
        });

        it('should show "已通过" badge for APPROVED status', () => {
            const approvedApproval: ApprovalPipeline = {
                status: 'APPROVED',
                currentStepIndex: 1,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'approved' }],
                history: [],
            };
            mockUseApproval.approval = approvedApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approvedApproval} />);

            expect(screen.getByText('已通过')).toBeTruthy();
        });

        it('should show "已驳回" badge for REJECTED status', () => {
            const rejectedApproval: ApprovalPipeline = {
                status: 'REJECTED',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'rejected', reason: 'Not good' }],
                history: [],
            };
            mockUseApproval.approval = rejectedApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={rejectedApproval} />);

            expect(screen.getByText('已驳回')).toBeTruthy();
        });

        it('should show "待提交" badge when has steps but status is NONE', () => {
            const draftApproval: ApprovalPipeline = {
                status: 'NONE',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = draftApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={draftApproval} />);

            expect(screen.getByText('待提交')).toBeTruthy();
        });
    });

    // ============================================================
    // C3: 按钮条件逻辑 (AC#5)
    // ============================================================
    describe('button conditions (AC#5)', () => {
        it('should show "提交审批" button when isAssignee && status not PENDING/APPROVED && has deliverables', () => {
            const draftApproval: ApprovalPipeline = {
                status: 'NONE',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'approver-1', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = draftApproval;
            mockUseApproval.deliverables = [{ id: 'd1', fileId: 'f1', fileName: 'test.pdf', uploadedAt: '2024-01-01' }];

            render(<ApprovalStatusPanel {...defaultProps} approval={draftApproval} isAssignee={true} />);

            expect(screen.getByText('提交审批')).toBeTruthy();
        });

        it('should NOT show "提交审批" button when no deliverables', () => {
            const draftApproval: ApprovalPipeline = {
                status: 'NONE',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'approver-1', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = draftApproval;
            mockUseApproval.deliverables = [];

            render(<ApprovalStatusPanel {...defaultProps} approval={draftApproval} isAssignee={true} />);

            expect(screen.queryByText('提交审批')).toBeFalsy();
        });

        it('should show "通过" button when current user is approver and status is PENDING', () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'test-user-id', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            expect(screen.getByText('通过')).toBeTruthy();
        });

        it('should show "驳回" button when current user is approver and status is PENDING', () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'test-user-id', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            expect(screen.getByText('驳回')).toBeTruthy();
        });

        it('should NOT show approver buttons when user is not the current step approver', () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'other-user', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            expect(screen.queryByText('通过')).toBeFalsy();
            expect(screen.queryByText('驳回')).toBeFalsy();
        });

        it('should disable buttons when isLoading', async () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'test-user-id', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;
            mockUseApproval.isLoading = true;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            const approveBtn = screen.getByText('通过').closest('button');
            expect(approveBtn?.disabled).toBe(true);
        });
    });

    // ============================================================
    // C4: 驳回表单 (AC#5)
    // ============================================================
    describe('reject form (AC#5)', () => {
        const pendingApprovalAsApprover: ApprovalPipeline = {
            status: 'PENDING',
            currentStepIndex: 0,
            steps: [{ index: 0, name: 'Step 1', assigneeId: 'test-user-id', status: 'pending' }],
            history: [],
        };

        it('should show reject form when clicking "驳回" button', () => {
            mockUseApproval.approval = pendingApprovalAsApprover;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApprovalAsApprover} />);

            const rejectBtn = screen.getByText('驳回');
            fireEvent.click(rejectBtn);

            expect(screen.getByText('驳回原因')).toBeTruthy();
            expect(screen.getByPlaceholderText('请输入驳回原因...')).toBeTruthy();
        });

        it('should disable confirm button when reason is empty', () => {
            mockUseApproval.approval = pendingApprovalAsApprover;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApprovalAsApprover} />);

            const rejectBtn = screen.getByText('驳回');
            fireEvent.click(rejectBtn);

            const confirmBtn = screen.getByText('确认驳回').closest('button');
            expect(confirmBtn?.disabled).toBe(true);
        });

        it('should enable confirm button when reason is provided', () => {
            mockUseApproval.approval = pendingApprovalAsApprover;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApprovalAsApprover} />);

            const rejectBtn = screen.getByText('驳回');
            fireEvent.click(rejectBtn);

            const textarea = screen.getByPlaceholderText('请输入驳回原因...');
            fireEvent.change(textarea, { target: { value: '需要修改设计' } });

            const confirmBtn = screen.getByText('确认驳回').closest('button');
            expect(confirmBtn?.disabled).toBe(false);
        });

        it('should call reject with reason on confirm', async () => {
            mockUseApproval.approval = pendingApprovalAsApprover;
            mockUseApproval.reject.mockResolvedValue(undefined);

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApprovalAsApprover} />);

            // Open reject form
            const rejectBtn = screen.getByText('驳回');
            fireEvent.click(rejectBtn);

            // Enter reason
            const textarea = screen.getByPlaceholderText('请输入驳回原因...');
            fireEvent.change(textarea, { target: { value: '需要修改设计' } });

            // Confirm
            const confirmBtn = screen.getByText('确认驳回');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(mockUseApproval.reject).toHaveBeenCalledWith('需要修改设计');
            });
        });

        it('should hide reject form on cancel', () => {
            mockUseApproval.approval = pendingApprovalAsApprover;

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApprovalAsApprover} />);

            // Open reject form
            const rejectBtn = screen.getByText('驳回');
            fireEvent.click(rejectBtn);

            expect(screen.getByText('驳回原因')).toBeTruthy();

            // Click cancel
            const cancelBtn = screen.getByText('取消');
            fireEvent.click(cancelBtn);

            expect(screen.queryByText('驳回原因')).toBeFalsy();
        });
    });

    // ============================================================
    // C5: 状态消息展示 (AC#5)
    // ============================================================
    describe('status messages (AC#5)', () => {
        it('should show "审批已通过" message when status is APPROVED', () => {
            const approvedApproval: ApprovalPipeline = {
                status: 'APPROVED',
                currentStepIndex: 1,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'approved' }],
                history: [],
            };
            mockUseApproval.approval = approvedApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={approvedApproval} />);

            expect(screen.getByText('审批已通过')).toBeTruthy();
        });

        it('should show "审批已驳回" message when status is REJECTED', () => {
            const rejectedApproval: ApprovalPipeline = {
                status: 'REJECTED',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'rejected' }],
                history: [],
            };
            mockUseApproval.approval = rejectedApproval;

            render(<ApprovalStatusPanel {...defaultProps} approval={rejectedApproval} />);

            expect(screen.getByText('审批已驳回')).toBeTruthy();
        });
    });

    // ============================================================
    // C6: Hook 方法调用 (AC#6 - Hook-First)
    // ============================================================
    describe('hook method calls (AC#6)', () => {
        it('should call submit when clicking "提交审批"', async () => {
            const draftApproval: ApprovalPipeline = {
                status: 'NONE',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'approver-1', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = draftApproval;
            mockUseApproval.deliverables = [{ id: 'd1', fileId: 'f1', fileName: 'test.pdf', uploadedAt: '2024-01-01' }];
            mockUseApproval.submit.mockResolvedValue(undefined);

            render(<ApprovalStatusPanel {...defaultProps} approval={draftApproval} isAssignee={true} />);

            const submitBtn = screen.getByText('提交审批');
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(mockUseApproval.submit).toHaveBeenCalled();
            });
        });

        it('should call approve when clicking "通过"', async () => {
            const pendingApproval: ApprovalPipeline = {
                status: 'PENDING',
                currentStepIndex: 0,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'test-user-id', status: 'pending' }],
                history: [],
            };
            mockUseApproval.approval = pendingApproval;
            mockUseApproval.approve.mockResolvedValue(undefined);

            render(<ApprovalStatusPanel {...defaultProps} approval={pendingApproval} />);

            const approveBtn = screen.getByText('通过');
            fireEvent.click(approveBtn);

            await waitFor(() => {
                expect(mockUseApproval.approve).toHaveBeenCalled();
            });
        });
    });
});
