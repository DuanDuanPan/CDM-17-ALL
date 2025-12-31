import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ApprovalService, APPROVAL_EVENTS } from '../approval.service';
import { ApprovalRepository } from '../approval.repository';

describe('Story 7.5 - EventEmitter2 contract', () => {
  it('ApprovalService emits approval.requested in plugin context', async () => {
    const mockRepository: jest.Mocked<Pick<ApprovalRepository, 'findNodeWithApproval' | 'updateApproval'>> = {
      findNodeWithApproval: jest.fn(),
      updateApproval: jest.fn(),
    };

    const nodeId = 'node-1';
    const userId = 'user-1';

    mockRepository.findNodeWithApproval.mockResolvedValue({
      id: nodeId,
      type: 'TASK',
      approval: {
        status: 'NONE',
        currentStepIndex: 0,
        steps: [{ index: 0, name: 'Step 1', assigneeId: 'approver-1', status: 'waiting' }],
        history: [],
      },
      taskProps: {
        deliverables: [{ id: 'd1', fileId: 'f1', fileName: 'file.pdf', uploadedAt: new Date().toISOString() }],
      },
    } as any);

    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ApprovalService,
        { provide: ApprovalRepository, useValue: mockRepository },
      ],
    }).compile();

    const service = moduleRef.get(ApprovalService);
    const eventEmitter = moduleRef.get(EventEmitter2);

    const emitted: unknown[] = [];
    eventEmitter.on(APPROVAL_EVENTS.REQUESTED, (payload) => emitted.push(payload));

    await service.submit(nodeId, userId);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(
      expect.objectContaining({
        nodeId,
        requesterId: userId,
        stepIndex: 0,
      }),
    );
  });
});
