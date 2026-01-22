/**
 * Story 10.4/10.6: FileStorageController Unit Tests
 * Comprehensive tests for all file storage endpoints (service mocked)
 */

import { FileStorageController } from '../file-storage.controller';
import type { Response } from 'express';
import type { FileStorageService, FileMetadataDto } from '../file-storage.service';
import type { FileRecord } from '@cdm/database';

describe('FileStorageController', () => {
    const mockFileMetadata: FileMetadataDto = {
        id: 'file-1',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        storagePath: 'graph-1/file-1.png',
        storageType: 'LOCAL',
        previewable: true,
        thumbnailUrl: '/api/files/file-1/thumbnail',
        createdAt: new Date('2026-01-22'),
    };

    const mockFileRecord = {
        id: 'file-1',
        graphId: 'graph-1',
        originalName: 'test.png',
        storedName: 'file-1.png',
        mimeType: 'image/png',
        size: 1024,
        storagePath: 'graph-1/file-1.png',
        storageType: 'LOCAL' as const,
        thumbnailPath: 'thumbnails/graph-1/file-1.webp',
        previewable: true,
        ownerType: null,
        ownerId: null,
        uploadedBy: 'user-1',
        createdAt: new Date('2026-01-22'),
        deletedAt: null,
    } as FileRecord;

    const mockBuffer = Buffer.from('file content');

    const service = {
        upload: jest.fn(),
        download: jest.fn(),
        getMetadata: jest.fn(),
        getThumbnail: jest.fn(),
        delete: jest.fn(),
    };

    let controller: FileStorageController;

    const createRes = (): jest.Mocked<Response> => {
        const res = {} as jest.Mocked<Response>;
        res.set = jest.fn().mockReturnValue(res);
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new FileStorageController(service as unknown as FileStorageService);
    });

    describe('upload', () => {
        const mockFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: 'test.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: 1024,
            buffer: Buffer.from('test'),
            stream: null as never,
            destination: '',
            filename: '',
            path: '',
        };

        it('should upload file and return metadata', async () => {
            service.upload.mockResolvedValueOnce(mockFileMetadata);

            const result = await controller.upload(
                mockFile,
                { graphId: 'graph-1' },
                'user-1'
            );

            expect(service.upload).toHaveBeenCalledWith(mockFile, 'graph-1', {
                ownerType: undefined,
                ownerId: undefined,
                uploadedBy: 'user-1',
            });
            expect(result).toEqual(mockFileMetadata);
        });

        it('should pass owner info when provided', async () => {
            service.upload.mockResolvedValueOnce(mockFileMetadata);

            await controller.upload(
                mockFile,
                { graphId: 'graph-1', ownerType: 'DATA_ASSET', ownerId: 'asset-1' },
                'user-1'
            );

            expect(service.upload).toHaveBeenCalledWith(mockFile, 'graph-1', {
                ownerType: 'DATA_ASSET',
                ownerId: 'asset-1',
                uploadedBy: 'user-1',
            });
        });
    });

    describe('downloadCompat (GET /:id)', () => {
        it('should return file with attachment disposition', async () => {
            service.download.mockResolvedValueOnce({ buffer: mockBuffer, record: mockFileRecord });
            const res = createRes();

            await controller.downloadCompat('file-1', res);

            expect(service.download).toHaveBeenCalledWith('file-1');
            expect(res.set).toHaveBeenCalledWith({
                'Content-Type': 'image/png',
                'Content-Length': mockBuffer.length.toString(),
                'Content-Disposition': `attachment; filename*=UTF-8''test.png`,
            });
            expect(res.send).toHaveBeenCalledWith(mockBuffer);
        });

        it('should encode UTF-8 filenames properly', async () => {
            const chineseRecord = { ...mockFileRecord, originalName: '测试文件.png' };
            service.download.mockResolvedValueOnce({ buffer: mockBuffer, record: chineseRecord });
            const res = createRes();

            await controller.downloadCompat('file-1', res);

            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('测试文件.png')}`,
                })
            );
        });
    });

    describe('download (GET /:id/download)', () => {
        it('should return file with attachment disposition', async () => {
            service.download.mockResolvedValueOnce({ buffer: mockBuffer, record: mockFileRecord });
            const res = createRes();

            await controller.download('file-1', res);

            expect(service.download).toHaveBeenCalledWith('file-1');
            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Content-Disposition': expect.stringContaining('attachment'),
                })
            );
            expect(res.send).toHaveBeenCalledWith(mockBuffer);
        });
    });

    describe('preview (GET /:id/preview)', () => {
        it('should return file with inline disposition', async () => {
            service.download.mockResolvedValueOnce({ buffer: mockBuffer, record: mockFileRecord });
            const res = createRes();

            await controller.preview('file-1', res);

            expect(service.download).toHaveBeenCalledWith('file-1');
            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Content-Type': 'image/png',
                    'Content-Disposition': expect.stringContaining('inline'),
                })
            );
            expect(res.send).toHaveBeenCalledWith(mockBuffer);
        });
    });

    describe('thumbnail (GET /:id/thumbnail)', () => {
        it('returns 404 JSON when thumbnail is not available', async () => {
            service.getThumbnail.mockResolvedValueOnce(null);
            const res = createRes();

            await controller.thumbnail('file-1', res);

            expect(service.getThumbnail).toHaveBeenCalledWith('file-1');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Thumbnail not available for this file type' });
        });

        it('sets headers and returns buffer when thumbnail exists', async () => {
            const thumbBuffer = Buffer.from('thumb');
            service.getThumbnail.mockResolvedValueOnce({ buffer: thumbBuffer, mimeType: 'image/webp', hasThumbnail: true });
            const res = createRes();

            await controller.thumbnail('file-1', res);

            expect(res.set).toHaveBeenCalledWith({
                'Content-Type': 'image/webp',
                'Content-Length': thumbBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
            });
            expect(res.send).toHaveBeenCalledWith(thumbBuffer);
        });

        it('returns original image when no thumbnail exists but file is image', async () => {
            service.getThumbnail.mockResolvedValueOnce({ buffer: mockBuffer, mimeType: 'image/png', hasThumbnail: false });
            const res = createRes();

            await controller.thumbnail('file-1', res);

            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'Content-Type': 'image/png',
                })
            );
            expect(res.send).toHaveBeenCalledWith(mockBuffer);
        });
    });

    describe('getMetadata (GET /:id/metadata)', () => {
        it('should return file metadata', async () => {
            service.getMetadata.mockResolvedValueOnce(mockFileMetadata);

            const result = await controller.getMetadata('file-1');

            expect(service.getMetadata).toHaveBeenCalledWith('file-1');
            expect(result).toEqual(mockFileMetadata);
        });
    });

    describe('deleteFile (DELETE /:id)', () => {
        it('should delete file and return success', async () => {
            service.delete.mockResolvedValueOnce(undefined);

            const result = await controller.deleteFile('file-1');

            expect(service.delete).toHaveBeenCalledWith('file-1');
            expect(result).toEqual({ deleted: true });
        });
    });
});
