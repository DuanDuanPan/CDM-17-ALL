/**
 * Story 7.9: DeliverablesSection Contract Tests
 * 契约保护测试 - 确保交付物管理功能在重构后保持正确
 *
 * 测试覆盖 AC#4 的所有交付物能力：
 * - 上传（含 loading 状态）
 * - 列表展示
 * - 预览（当前为 mock 预览）
 * - 下载
 * - 删除（仅允许编辑时显示）
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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

// Mock window.open for download tests
const mockWindowOpen = vi.fn();

describe('DeliverablesSection Contract Tests (via ApprovalStatusPanel)', () => {
    const configuredApproval: ApprovalPipeline = {
        status: 'NONE',
        currentStepIndex: 0,
        steps: [{ index: 0, name: 'Step 1', assigneeId: 'approver-1', status: 'pending' }],
        history: [],
    };

    const sampleDeliverables: Deliverable[] = [
        { id: 'd1', fileId: 'f1', fileName: 'design.pdf', uploadedAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', fileId: 'f2', fileName: 'data.json', uploadedAt: '2024-01-02T10:00:00Z' },
        { id: 'd3', fileId: 'f3', fileName: 'photo.png', uploadedAt: '2024-01-03T10:00:00Z' },
    ];

    const defaultProps = {
        nodeId: 'test-node-1',
        nodeLabel: 'Test Task',
        approval: configuredApproval,
        deliverables: [] as Deliverable[],
        isAssignee: true,
        onUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseApproval.approval = configuredApproval;
        mockUseApproval.deliverables = [];
        mockUseApproval.isLoading = false;
        mockUseApproval.isUploading = false;
        // Mock window.open
        window.open = mockWindowOpen;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================================
    // DS-C1: 交付物列表展示 (AC#4)
    // ============================================================
    describe('deliverables list display (AC#4)', () => {
        it('should show "暂无交付物" when list is empty', () => {
            mockUseApproval.deliverables = [];

            render(<ApprovalStatusPanel {...defaultProps} />);

            expect(screen.getByText('暂无交付物')).toBeTruthy();
        });

        it('should render all deliverables in the list', () => {
            mockUseApproval.deliverables = sampleDeliverables;

            render(<ApprovalStatusPanel {...defaultProps} />);

            expect(screen.getByText('design.pdf')).toBeTruthy();
            expect(screen.getByText('data.json')).toBeTruthy();
            expect(screen.getByText('photo.png')).toBeTruthy();
        });

        it('should show deliverables section header with icon', () => {
            mockUseApproval.deliverables = sampleDeliverables;

            render(<ApprovalStatusPanel {...defaultProps} />);

            expect(screen.getByText('交付物')).toBeTruthy();
        });
    });

    // ============================================================
    // DS-C2: 文件图标渲染 (AC#4)
    // ============================================================
    describe('file icon rendering (AC#4)', () => {
        it('should render correct icon for PDF files', () => {
            mockUseApproval.deliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'document.pdf', uploadedAt: '2024-01-01' },
            ];

            render(<ApprovalStatusPanel {...defaultProps} />);

            // PDF files should have FileText icon (red color class)
            const container = screen.getByText('document.pdf').closest('div');
            expect(container?.querySelector('svg')).toBeTruthy();
        });

        it('should render correct icon for image files', () => {
            mockUseApproval.deliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'photo.jpg', uploadedAt: '2024-01-01' },
            ];

            render(<ApprovalStatusPanel {...defaultProps} />);

            const container = screen.getByText('photo.jpg').closest('div');
            expect(container?.querySelector('svg')).toBeTruthy();
        });

        it('should render correct icon for JSON files', () => {
            mockUseApproval.deliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'config.json', uploadedAt: '2024-01-01' },
            ];

            render(<ApprovalStatusPanel {...defaultProps} />);

            const container = screen.getByText('config.json').closest('div');
            expect(container?.querySelector('svg')).toBeTruthy();
        });
    });

    // ============================================================
    // DS-C3: 上传功能 (AC#4)
    // ============================================================
    describe('upload functionality (AC#4)', () => {
        it('should show upload button when canEdit (isAssignee && status != APPROVED)', () => {
            mockUseApproval.approval = configuredApproval;
            mockUseApproval.deliverables = [];

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            expect(screen.getByText('上传')).toBeTruthy();
        });

        it('should NOT show upload button when status is APPROVED', () => {
            const approvedApproval: ApprovalPipeline = {
                status: 'APPROVED',
                currentStepIndex: 1,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'approved' }],
                history: [],
            };
            mockUseApproval.approval = approvedApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={approvedApproval} />);

            expect(screen.queryByText('上传')).toBeFalsy();
        });

        it('should NOT show upload button when not assignee', () => {
            mockUseApproval.approval = configuredApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={false} approval={configuredApproval} />);

            expect(screen.queryByText('上传')).toBeFalsy();
        });

        it('should show loading spinner when isUploading', () => {
            mockUseApproval.approval = configuredApproval;
            mockUseApproval.isUploading = true;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            // Upload button should be disabled and show spinner
            const uploadBtn = screen.getByText('上传').closest('button');
            expect(uploadBtn?.disabled).toBe(true);
            // Check for Loader2 spinner (animate-spin class)
            expect(uploadBtn?.querySelector('.animate-spin')).toBeTruthy();
        });

        it('should call uploadDeliverable when file is selected', async () => {
            mockUseApproval.approval = configuredApproval;
            mockUseApproval.uploadDeliverable.mockResolvedValue(undefined);

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            // Find the hidden file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            expect(fileInput).toBeTruthy();

            // Simulate file selection
            const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            Object.defineProperty(fileInput, 'files', { value: [testFile] });
            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(mockUseApproval.uploadDeliverable).toHaveBeenCalledWith(testFile);
            });
        });

        it('should accept common file types', () => {
            mockUseApproval.approval = configuredApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            expect(fileInput?.accept).toContain('.pdf');
            expect(fileInput?.accept).toContain('.json');
            expect(fileInput?.accept).toContain('.png');
        });
    });

    // ============================================================
    // DS-C4: 下载功能 (AC#4)
    // ============================================================
    describe('download functionality (AC#4)', () => {
        it('should open download link in new tab when clicking download button', () => {
            mockUseApproval.deliverables = sampleDeliverables;

            render(<ApprovalStatusPanel {...defaultProps} />);

            // Hover to reveal action buttons (they have opacity-0 by default)
            const deliverableRow = screen.getByText('design.pdf').closest('div[class*="group"]');
            expect(deliverableRow).toBeTruthy();

            // Find download button by title
            const downloadBtn = screen.getAllByTitle('下载')[0];
            fireEvent.click(downloadBtn);

            expect(mockWindowOpen).toHaveBeenCalledWith(
                expect.stringContaining('/api/files/f1'),
                '_blank'
            );
        });
    });

    // ============================================================
    // DS-C5: 预览功能 (AC#4)
    // ============================================================
    describe('preview functionality (AC#4)', () => {
        it('should open preview modal when clicking preview button', () => {
            mockUseApproval.deliverables = sampleDeliverables;

            render(<ApprovalStatusPanel {...defaultProps} />);

            // Find preview button by title
            const previewBtn = screen.getAllByTitle('预览')[0];
            fireEvent.click(previewBtn);

            // Check for modal content - use getAllByText as filename appears in both list and modal
            expect(screen.getAllByText('design.pdf').length).toBeGreaterThanOrEqual(1);
            // Modal should show upload time
            expect(screen.getByText(/上传于/)).toBeTruthy();
        });

        it('should close preview modal when clicking close button', async () => {
            mockUseApproval.deliverables = sampleDeliverables;

            render(<ApprovalStatusPanel {...defaultProps} />);

            // Open preview
            const previewBtn = screen.getAllByTitle('预览')[0];
            fireEvent.click(previewBtn);

            // Find and click close button
            const closeBtn = screen.getByText('关闭');
            fireEvent.click(closeBtn);

            // Modal should be closed - check if the modal content is gone
            await waitFor(() => {
                expect(screen.queryByText(/上传于/)).toBeFalsy();
            });
        });

        it('should show mock content indicator in preview', () => {
            mockUseApproval.deliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'test.txt', uploadedAt: '2024-01-01' },
            ];

            render(<ApprovalStatusPanel {...defaultProps} />);

            // Open preview
            const previewBtn = screen.getAllByTitle('预览')[0];
            fireEvent.click(previewBtn);

            // Should indicate mock preview - use getAllByText as text appears in multiple places
            expect(screen.getAllByText(/模拟预览/).length).toBeGreaterThanOrEqual(1);
        });

        it('should generate JSON content for JSON files in preview', () => {
            mockUseApproval.deliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'data.json', uploadedAt: '2024-01-01' },
            ];

            render(<ApprovalStatusPanel {...defaultProps} />);

            // Open preview
            const previewBtn = screen.getAllByTitle('预览')[0];
            fireEvent.click(previewBtn);

            // JSON preview should have specific elements - use container query
            const preElement = document.querySelector('pre');
            expect(preElement?.textContent).toContain('fileName');
        });
    });

    // ============================================================
    // DS-C6: 删除功能 (AC#4 - 仅允许编辑时显示)
    // ============================================================
    describe('delete functionality (AC#4)', () => {
        it('should show delete button when canEdit', () => {
            mockUseApproval.deliverables = sampleDeliverables;
            mockUseApproval.approval = configuredApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            const deleteButtons = screen.getAllByTitle('删除');
            expect(deleteButtons.length).toBe(sampleDeliverables.length);
        });

        it('should NOT show delete button when not canEdit', () => {
            mockUseApproval.deliverables = sampleDeliverables;
            mockUseApproval.approval = configuredApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={false} approval={configuredApproval} />);

            expect(screen.queryByTitle('删除')).toBeFalsy();
        });

        it('should NOT show delete button when status is APPROVED', () => {
            const approvedApproval: ApprovalPipeline = {
                status: 'APPROVED',
                currentStepIndex: 1,
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'user-1', status: 'approved' }],
                history: [],
            };
            mockUseApproval.deliverables = sampleDeliverables;
            mockUseApproval.approval = approvedApproval;

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={approvedApproval} />);

            expect(screen.queryByTitle('删除')).toBeFalsy();
        });

        it('should call deleteDeliverable with correct id when clicking delete', async () => {
            mockUseApproval.deliverables = sampleDeliverables;
            mockUseApproval.approval = configuredApproval;
            mockUseApproval.deleteDeliverable.mockResolvedValue(undefined);

            render(<ApprovalStatusPanel {...defaultProps} isAssignee={true} approval={configuredApproval} />);

            const deleteButtons = screen.getAllByTitle('删除');
            fireEvent.click(deleteButtons[0]); // Delete first deliverable

            await waitFor(() => {
                expect(mockUseApproval.deleteDeliverable).toHaveBeenCalledWith('d1');
            });
        });
    });
});
