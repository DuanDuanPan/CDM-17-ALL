/**
 * Story 4.1: Approval Driven Workflow
 * Unit Tests for ApprovalService
 * [AI-Review][MEDIUM-1] Created to address missing test coverage
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalService, APPROVAL_EVENTS } from '../approval.service';
import { ApprovalRepository, NodeWithApproval } from '../approval.repository';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';

describe('ApprovalService', () => {
    let service: ApprovalService;
    let mockRepository: jest.Mocked<ApprovalRepository>;
    let mockEventEmitter: jest.Mocked<EventEmitter2>;

    // Mock data
    const mockNodeId = 'node-1';
    const mockUserId = 'user-1';
    const mockApproverId = 'approver-1';

    const createMockNode = (overrides: Partial<NodeWithApproval> = {}): NodeWithApproval => {
        const { order, ...rest } = overrides;
        return {
            id: mockNodeId,
            label: 'Test Task',
            description: null,
            creatorName: 'Test User',
            type: 'TASK',
            x: 0,
            y: 0,
            width: 120,
            height: 40,
            metadata: {},
            tags: [],
            isArchived: false,
            archivedAt: null,
            graphId: 'graph-1',
            parentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            approval: null,
            taskProps: { deliverables: [] },
            ...rest,
            order: order ?? 0,
        };
    };

    const createMockApproval = (overrides: Partial<ApprovalPipeline> = {}): ApprovalPipeline => ({
        status: 'NONE',
        currentStepIndex: 0,
        steps: [
            { index: 0, name: 'Step 1', assigneeId: mockApproverId, status: 'waiting' },
        ],
        history: [],
        ...overrides,
    });

    beforeEach(() => {
        mockRepository = {
            findNodeWithApproval: jest.fn(),
            updateApproval: jest.fn(),
            getTaskProps: jest.fn(),
            updateDeliverables: jest.fn(),
            updateTaskStatus: jest.fn(),
            findDependencySuccessors: jest.fn(),
            findDependencyPredecessors: jest.fn(),
            areAllPredecessorsApproved: jest.fn(),
        } as unknown as jest.Mocked<ApprovalRepository>;

        mockEventEmitter = {
            emit: jest.fn(),
        } as unknown as jest.Mocked<EventEmitter2>;

        service = new ApprovalService(mockRepository, mockEventEmitter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('configureApproval', () => {
        it('should configure approval workflow for a TASK node', async () => {
            const node = createMockNode();
            mockRepository.findNodeWithApproval.mockResolvedValue(node);
            mockRepository.updateApproval.mockResolvedValue({} as any);

            const result = await service.configureApproval({
                nodeId: mockNodeId,
                steps: [
                    { name: 'Review', assigneeId: 'reviewer-1' },
                    { name: 'Approve', assigneeId: 'approver-1' },
                ],
            });

            expect(result.status).toBe('NONE');
            expect(result.steps).toHaveLength(2);
            expect(result.steps[0].name).toBe('Review');
            expect(result.steps[1].name).toBe('Approve');
            expect(mockRepository.updateApproval).toHaveBeenCalled();
        });

        it('should throw NotFoundException when node not found', async () => {
            mockRepository.findNodeWithApproval.mockResolvedValue(null);

            await expect(
                service.configureApproval({
                    nodeId: 'non-existent',
                    steps: [{ name: 'Step', assigneeId: 'user-1' }],
                })
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException for non-TASK nodes', async () => {
            const node = createMockNode({ type: 'ORDINARY' });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(
                service.configureApproval({
                    nodeId: mockNodeId,
                    steps: [{ name: 'Step', assigneeId: 'user-1' }],
                })
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('submit', () => {
        it('should submit node for approval when valid', async () => {
            const approval = createMockApproval();
            const node = createMockNode({
                approval,
                taskProps: { deliverables: [{ id: 'd1', fileId: 'f1', fileName: 'file.pdf', uploadedAt: new Date().toISOString() }] },
            });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);
            mockRepository.updateApproval.mockResolvedValue({} as any);

            const result = await service.submit(mockNodeId, mockUserId);

            expect(result.status).toBe('PENDING');
            expect(result.history).toHaveLength(1);
            expect(result.history[0].action).toBe('submitted');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                APPROVAL_EVENTS.REQUESTED,
                expect.objectContaining({ nodeId: mockNodeId })
            );
        });

        it('should throw BadRequestException when no deliverables', async () => {
            const approval = createMockApproval();
            const node = createMockNode({ approval, taskProps: { deliverables: [] } });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(service.submit(mockNodeId, mockUserId)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException when already pending', async () => {
            const approval = createMockApproval({ status: 'PENDING' });
            const node = createMockNode({
                approval,
                taskProps: { deliverables: [{ id: 'd1', fileId: 'f1', fileName: 'file.pdf', uploadedAt: new Date().toISOString() }] },
            });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(service.submit(mockNodeId, mockUserId)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException when already approved', async () => {
            const approval = createMockApproval({ status: 'APPROVED' });
            const node = createMockNode({
                approval,
                taskProps: { deliverables: [{ id: 'd1', fileId: 'f1', fileName: 'file.pdf', uploadedAt: new Date().toISOString() }] },
            });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(service.submit(mockNodeId, mockUserId)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('approve', () => {
        it('should approve current step and advance to next', async () => {
            const approval = createMockApproval({
                status: 'PENDING',
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: mockApproverId, status: 'pending' },
                    { index: 1, name: 'Step 2', assigneeId: 'approver-2', status: 'waiting' },
                ],
            });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);
            mockRepository.updateApproval.mockResolvedValue({} as any);

            const result = await service.approve(mockNodeId, mockApproverId);

            expect(result.currentStepIndex).toBe(1);
            expect(result.steps[0].status).toBe('approved');
            expect(result.steps[1].status).toBe('pending');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                APPROVAL_EVENTS.REQUESTED,
                expect.objectContaining({ stepIndex: 1 })
            );
        });

        it('should mark as APPROVED when last step is approved', async () => {
            const approval = createMockApproval({
                status: 'PENDING',
                steps: [
                    { index: 0, name: 'Step 1', assigneeId: mockApproverId, status: 'pending' },
                ],
            });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);
            mockRepository.updateApproval.mockResolvedValue({} as any);

            const result = await service.approve(mockNodeId, mockApproverId);

            expect(result.status).toBe('APPROVED');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                APPROVAL_EVENTS.RESOLVED,
                expect.objectContaining({ status: 'APPROVED' })
            );
        });

        it('should throw ForbiddenException when approver is not authorized', async () => {
            const approval = createMockApproval({
                status: 'PENDING',
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'other-user', status: 'pending' }],
            });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(service.approve(mockNodeId, mockApproverId)).rejects.toThrow(
                ForbiddenException
            );
        });

        it('should throw BadRequestException when not pending', async () => {
            const approval = createMockApproval({ status: 'NONE' });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(service.approve(mockNodeId, mockApproverId)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('reject', () => {
        it('should reject with reason and emit event', async () => {
            const approval = createMockApproval({
                status: 'PENDING',
                steps: [{ index: 0, name: 'Step 1', assigneeId: mockApproverId, status: 'pending' }],
            });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);
            mockRepository.updateApproval.mockResolvedValue({} as any);

            const result = await service.reject(mockNodeId, mockApproverId, 'Not complete');

            expect(result.status).toBe('REJECTED');
            expect(result.steps[0].status).toBe('rejected');
            expect(result.steps[0].reason).toBe('Not complete');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                APPROVAL_EVENTS.RESOLVED,
                expect.objectContaining({ status: 'REJECTED', reason: 'Not complete' })
            );
        });

        it('should throw BadRequestException when no reason provided', async () => {
            await expect(service.reject(mockNodeId, mockApproverId, '')).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw ForbiddenException when approver is not authorized', async () => {
            const approval = createMockApproval({
                status: 'PENDING',
                steps: [{ index: 0, name: 'Step 1', assigneeId: 'other-user', status: 'pending' }],
            });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            await expect(
                service.reject(mockNodeId, mockApproverId, 'Reason')
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('getApprovalStatus', () => {
        it('should return approval pipeline when exists', async () => {
            const approval = createMockApproval({ status: 'PENDING' });
            const node = createMockNode({ approval });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            const result = await service.getApprovalStatus(mockNodeId);

            expect(result).toEqual(approval);
        });

        it('should return null when no approval configured', async () => {
            const node = createMockNode({ approval: null });
            mockRepository.findNodeWithApproval.mockResolvedValue(node);

            const result = await service.getApprovalStatus(mockNodeId);

            expect(result).toBeNull();
        });
    });

    describe('addDeliverable', () => {
        it('should add deliverable to existing list', async () => {
            const existingDeliverable: Deliverable = {
                id: 'd1',
                fileId: 'f1',
                fileName: 'existing.pdf',
                uploadedAt: new Date().toISOString(),
            };
            const newDeliverable: Deliverable = {
                id: 'd2',
                fileId: 'f2',
                fileName: 'new.pdf',
                uploadedAt: new Date().toISOString(),
            };

            mockRepository.getTaskProps.mockResolvedValue({
                deliverables: [existingDeliverable],
            } as any);
            mockRepository.updateDeliverables.mockResolvedValue({} as any);

            const result = await service.addDeliverable(mockNodeId, newDeliverable);

            expect(result).toHaveLength(2);
            expect(mockRepository.updateDeliverables).toHaveBeenCalledWith(
                mockNodeId,
                expect.arrayContaining([existingDeliverable, newDeliverable])
            );
        });

        it('should throw NotFoundException when task props not found', async () => {
            mockRepository.getTaskProps.mockResolvedValue(null);

            await expect(
                service.addDeliverable(mockNodeId, {
                    id: 'd1',
                    fileId: 'f1',
                    fileName: 'file.pdf',
                    uploadedAt: new Date().toISOString(),
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeDeliverable', () => {
        it('should remove deliverable by id', async () => {
            const deliverables: Deliverable[] = [
                { id: 'd1', fileId: 'f1', fileName: 'file1.pdf', uploadedAt: new Date().toISOString() },
                { id: 'd2', fileId: 'f2', fileName: 'file2.pdf', uploadedAt: new Date().toISOString() },
            ];

            mockRepository.getTaskProps.mockResolvedValue({
                deliverables,
            } as any);
            mockRepository.updateDeliverables.mockResolvedValue({} as any);

            const result = await service.removeDeliverable(mockNodeId, 'd1');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('d2');
        });
    });
});
