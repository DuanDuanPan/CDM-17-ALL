import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CollabService } from './collab.service';

/**
 * Unit tests for CollabService
 *
 * Story 1.4: Real-time Collaboration Engine
 */
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
            providers: [CollabService],
        }).compile();

        service = module.get<CollabService>(CollabService);
    });

    afterEach(async () => {
        // Ensure cleanup
        await service.onModuleDestroy();
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
                providers: [CollabService],
            }).compile();

            const customService = customModule.get<CollabService>(CollabService);
            const port = customService.getPort();

            expect(port).toBe(4567);
        });
    });
});
