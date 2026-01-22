/**
 * Story 10.4: FileStorageService Unit Tests
 * Story 10.6: Added thumbnail generation tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage.service';
import { FileStorageRepository } from '../file-storage.repository';
import { STORAGE_ADAPTER, StorageAdapter } from '../adapters/storage-adapter.interface';
import { GraphRepository } from '../../graphs/graph.repository';
import { ThumbnailService } from '../thumbnail.service';

describe('FileStorageService', () => {
    let service: FileStorageService;
    let mockStorageAdapter: jest.Mocked<StorageAdapter>;
    let mockRepository: jest.Mocked<FileStorageRepository>;
    let mockGraphRepository: jest.Mocked<GraphRepository>;
    let mockThumbnailService: jest.Mocked<ThumbnailService>;

    const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-file.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test content'),
        stream: null as never,
        destination: '',
        filename: '',
        path: '',
    };

    const mockFileRecord = {
        id: 'file-123',
        graphId: 'graph-456',
        originalName: 'test-file.txt',
        storedName: 'abc123.txt',
        mimeType: 'text/plain',
        size: 1024,
        storagePath: 'graph-456/abc123.txt',
        storageType: 'LOCAL' as const,
        thumbnailPath: null,
        previewable: true,
        ownerType: null,
        ownerId: null,
        uploadedBy: null,
        createdAt: new Date(),
        deletedAt: null,
    };

    beforeEach(async () => {
        mockStorageAdapter = {
            write: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue(Buffer.from('test content')),
            delete: jest.fn().mockResolvedValue(true),
            exists: jest.fn().mockResolvedValue(true),
        };

        mockGraphRepository = {
            exists: jest.fn().mockResolvedValue(true),
        } as unknown as jest.Mocked<GraphRepository>;

        mockRepository = {
            create: jest.fn().mockResolvedValue(mockFileRecord),
            findById: jest.fn().mockResolvedValue(mockFileRecord),
            findByIdActive: jest.fn().mockResolvedValue(mockFileRecord),
            findByGraphId: jest.fn().mockResolvedValue([mockFileRecord]),
            findByOwner: jest.fn().mockResolvedValue([mockFileRecord]),
            softDelete: jest.fn().mockResolvedValue(mockFileRecord),
            hardDelete: jest.fn().mockResolvedValue(true),
            update: jest.fn().mockResolvedValue(mockFileRecord),
        } as unknown as jest.Mocked<FileStorageRepository>;

        // Story 10.6: Mock ThumbnailService
        mockThumbnailService = {
            canGenerateThumbnail: jest.fn().mockReturnValue(false),
            generate: jest.fn().mockResolvedValue(Buffer.from('thumbnail data')),
        } as unknown as jest.Mocked<ThumbnailService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FileStorageService,
                {
                    provide: STORAGE_ADAPTER,
                    useValue: mockStorageAdapter,
                },
                {
                    provide: FileStorageRepository,
                    useValue: mockRepository,
                },
                {
                    provide: GraphRepository,
                    useValue: mockGraphRepository,
                },
                {
                    provide: ThumbnailService,
                    useValue: mockThumbnailService,
                },
            ],
        }).compile();

        service = module.get<FileStorageService>(FileStorageService);
    });

    describe('upload', () => {
        it('should upload file successfully with graphId', async () => {
            const result = await service.upload(mockFile, 'graph-456');

            expect(mockGraphRepository.exists).toHaveBeenCalledWith('graph-456');
            expect(mockStorageAdapter.write).toHaveBeenCalled();
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    graphId: 'graph-456',
                    originalName: 'test-file.txt',
                    mimeType: 'text/plain',
                    size: 1024,
                }),
            );
            expect(result.id).toBe('file-123');
        });

        it('should throw BadRequestException when graphId is missing', async () => {
            await expect(service.upload(mockFile, '')).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when graphId does not exist', async () => {
            mockGraphRepository.exists.mockResolvedValue(false);
            await expect(service.upload(mockFile, 'missing-graph')).rejects.toThrow(BadRequestException);
        });

        it('should set previewable=true for text/plain mime type', async () => {
            await service.upload(mockFile, 'graph-456');

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    previewable: true,
                }),
            );
        });
    });

    describe('download', () => {
        it('should return buffer and record for existing file', async () => {
            const result = await service.download('file-123');

            expect(mockRepository.findByIdActive).toHaveBeenCalledWith('file-123');
            expect(mockStorageAdapter.read).toHaveBeenCalledWith(mockFileRecord.storagePath);
            expect(result.buffer).toEqual(Buffer.from('test content'));
            expect(result.record.id).toBe('file-123');
        });

        it('should throw NotFoundException for non-existent file', async () => {
            mockRepository.findByIdActive.mockResolvedValue(null);

            await expect(service.download('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getMetadata', () => {
        it('should return metadata for existing file', async () => {
            const result = await service.getMetadata('file-123');

            expect(result.id).toBe('file-123');
            expect(result.originalName).toBe('test-file.txt');
            expect(result.mimeType).toBe('text/plain');
        });

        it('should throw NotFoundException for non-existent file', async () => {
            mockRepository.findByIdActive.mockResolvedValue(null);

            await expect(service.getMetadata('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('should delete from storage and soft delete in DB', async () => {
            await service.delete('file-123');

            expect(mockStorageAdapter.delete).toHaveBeenCalledWith(mockFileRecord.storagePath);
            expect(mockRepository.softDelete).toHaveBeenCalledWith('file-123');
        });

        it('should delete thumbnail when thumbnailPath exists', async () => {
            const recordWithThumbnail = {
                ...mockFileRecord,
                mimeType: 'image/png',
                thumbnailPath: 'thumbnails/graph-456/file-123.webp',
            };
            mockRepository.findByIdActive.mockResolvedValue(recordWithThumbnail);

            await service.delete('file-123');

            expect(mockStorageAdapter.delete).toHaveBeenCalledWith(recordWithThumbnail.storagePath);
            expect(mockStorageAdapter.delete).toHaveBeenCalledWith(recordWithThumbnail.thumbnailPath);
        });

        it('should throw NotFoundException for non-existent file', async () => {
            mockRepository.findByIdActive.mockResolvedValue(null);

            await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
        });

        it('should rollback deletedAt when storage delete fails', async () => {
            // Setup: storage adapter throws error
            mockStorageAdapter.delete.mockRejectedValue(new Error('Storage delete failed'));

            await expect(service.delete('file-123')).rejects.toThrow('Storage delete failed');

            // Should have called update to rollback deletedAt
            expect(mockRepository.softDelete).toHaveBeenCalledWith('file-123');
            expect(mockRepository.update).toHaveBeenCalledWith('file-123', { deletedAt: null });
        });
    });

    describe('upload rollback', () => {
        it('should delete file from storage when DB create fails', async () => {
            // Setup: repository throws error
            const dbError = new Error('Database constraint error');
            mockRepository.create.mockRejectedValue(dbError);

            await expect(service.upload(mockFile, 'graph-456')).rejects.toThrow(dbError);

            // Should have tried to delete the already-written file
            expect(mockStorageAdapter.write).toHaveBeenCalled();
            expect(mockStorageAdapter.delete).toHaveBeenCalled();
        });
    });

    describe('listByGraph', () => {
        it('should return files for a graph', async () => {
            const result = await service.listByGraph('graph-456');

            expect(mockRepository.findByGraphId).toHaveBeenCalledWith('graph-456');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('file-123');
        });
    });

    // Story 10.6: Thumbnail tests
    describe('upload with thumbnail', () => {
        const imageFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: 'test-image.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: 2048,
            buffer: Buffer.from('image data'),
            stream: null as never,
            destination: '',
            filename: '',
            path: '',
        };

        it('should generate thumbnail for image uploads', async () => {
            mockThumbnailService.canGenerateThumbnail.mockReturnValue(true);
            const mockImageRecord = {
                ...mockFileRecord,
                mimeType: 'image/png',
                thumbnailPath: 'thumbnails/graph-456/file-123.webp',
            };
            mockRepository.create.mockResolvedValue(mockImageRecord);

            const result = await service.upload(imageFile, 'graph-456');

            expect(mockThumbnailService.canGenerateThumbnail).toHaveBeenCalledWith('image/png');
            expect(mockThumbnailService.generate).toHaveBeenCalledWith(imageFile.buffer);
            expect(mockStorageAdapter.write).toHaveBeenCalledTimes(2); // file + thumbnail
            expect(result.thumbnailUrl).toBe('/api/files/file-123/thumbnail');
        });

        it('should not generate thumbnail for non-image files', async () => {
            mockThumbnailService.canGenerateThumbnail.mockReturnValue(false);

            await service.upload(mockFile, 'graph-456');

            expect(mockThumbnailService.canGenerateThumbnail).toHaveBeenCalledWith('text/plain');
            expect(mockThumbnailService.generate).not.toHaveBeenCalled();
            expect(mockStorageAdapter.write).toHaveBeenCalledTimes(1); // file only
        });

        it('should continue upload even if thumbnail generation fails', async () => {
            mockThumbnailService.canGenerateThumbnail.mockReturnValue(true);
            mockThumbnailService.generate.mockRejectedValue(new Error('sharp error'));

            const result = await service.upload(imageFile, 'graph-456');

            expect(result.id).toBe('file-123'); // Upload still succeeds
        });
    });

    describe('getThumbnail', () => {
        it('should return thumbnail when thumbnailPath exists', async () => {
            const recordWithThumbnail = {
                ...mockFileRecord,
                mimeType: 'image/png',
                thumbnailPath: 'thumbnails/graph-456/file-123.webp',
            };
            mockRepository.findByIdActive.mockResolvedValue(recordWithThumbnail);
            mockStorageAdapter.read.mockResolvedValue(Buffer.from('thumb data'));

            const result = await service.getThumbnail('file-123');

            expect(result).not.toBeNull();
            expect(result?.mimeType).toBe('image/webp');
            expect(result?.hasThumbnail).toBe(true);
        });

        it('should fallback to original for images without thumbnail', async () => {
            const recordWithoutThumbnail = {
                ...mockFileRecord,
                mimeType: 'image/png',
                thumbnailPath: null,
            };
            mockRepository.findByIdActive.mockResolvedValue(recordWithoutThumbnail);
            mockStorageAdapter.read.mockResolvedValue(Buffer.from('image data'));

            const result = await service.getThumbnail('file-123');

            expect(result).not.toBeNull();
            expect(result?.mimeType).toBe('image/png');
            expect(result?.hasThumbnail).toBe(false);
        });

        it('should return null for non-image files', async () => {
            mockRepository.findByIdActive.mockResolvedValue(mockFileRecord); // text/plain

            const result = await service.getThumbnail('file-123');

            expect(result).toBeNull();
        });

        it('should throw NotFoundException for non-existent file', async () => {
            mockRepository.findByIdActive.mockResolvedValue(null);

            await expect(service.getThumbnail('non-existent')).rejects.toThrow(NotFoundException);
        });
    });
});
