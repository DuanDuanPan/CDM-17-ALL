import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollabService } from './collab.service';
import { GraphRepository } from '../graphs/graph.repository';
import { NodeRepository } from '../nodes/repositories/node.repository';

/**
 * Unit tests for CollabService
 *
 * Story 1.4: Real-time Collaboration Engine
 * Story 7.1: Updated to mock GraphRepository and NodeRepository
 */

jest.mock('@hocuspocus/server', () => ({
    Server: jest.fn().mockImplementation(() => ({
        listen: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
    })),
}));

// Story 7.1: Mock repositories for CollabService tests
const mockGraphRepository = {
    findGraphWithRelations: jest.fn(),
    updateYjsState: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
};

const mockNodeRepository = {
    upsertBatch: jest.fn(),
    findById: jest.fn(),
};

describe('CollabService', () => {
    let service: CollabService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    // Use mock values for testing
                    load: [
                        () => ({
                            COLLAB_WS_PORT: 1234,
                        }),
                    ],
                }),
            ],
            providers: [
                CollabService,
                {
                    provide: EventEmitter2,
                    useValue: { emit: jest.fn(), on: jest.fn() },
                },
                // Story 7.1: Provide mock repositories
                {
                    provide: GraphRepository,
                    useValue: mockGraphRepository,
                },
                {
                    provide: NodeRepository,
                    useValue: mockNodeRepository,
                },
            ],
        }).compile();

        service = module.get<CollabService>(CollabService);
    });

    afterEach(async () => {
        // Ensure cleanup
        await service?.onModuleDestroy();
    });

    describe('initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should return default port when not configured', () => {
            const port = service.getPort();
            expect(port).toBe(1234);
        });
    });

    describe('server lifecycle', () => {
        it('should initialize server on module init', async () => {
            // Note: onModuleInit is called automatically by NestJS
            // For unit testing, we call it manually
            await service.onModuleInit();

            const server = service.getServer();
            expect(server).toBeDefined();
        });

        it('should cleanup server on module destroy', async () => {
            await service.onModuleInit();
            expect(service.getServer()).toBeDefined();

            await service.onModuleDestroy();
            expect(service.getServer()).toBeNull();
        });
    });

    describe('configuration', () => {
        it('should use custom port from configuration', async () => {
            // Create a new module with custom port
            const customModule: TestingModule = await Test.createTestingModule({
                imports: [
                    ConfigModule.forRoot({
                        isGlobal: true,
                        load: [
                            () => ({
                                COLLAB_WS_PORT: 4567,
                            }),
                        ],
                    }),
                ],
                providers: [
                    CollabService,
                    {
                        provide: EventEmitter2,
                        useValue: { emit: jest.fn(), on: jest.fn() },
                    },
                    // Story 7.1: Provide mock repositories
                    {
                        provide: GraphRepository,
                        useValue: mockGraphRepository,
                    },
                    {
                        provide: NodeRepository,
                        useValue: mockNodeRepository,
                    },
                ],
            }).compile();

            const customService = customModule.get<CollabService>(CollabService);
            const port = customService.getPort();

            expect(port).toBe(4567);
        });
    });
});
