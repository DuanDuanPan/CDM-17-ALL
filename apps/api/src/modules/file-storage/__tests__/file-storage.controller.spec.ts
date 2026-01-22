/**
 * Story 10.6: Thumbnail/Preview Enhancement
 * Unit tests for FileStorageController thumbnail endpoint (service mocked)
 */

import { FileStorageController } from '../file-storage.controller';
import type { Response } from 'express';
import type { FileStorageService } from '../file-storage.service';

describe('FileStorageController', () => {
    const service = {
        getThumbnail: jest.fn(),
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

    describe('thumbnail', () => {
        it('returns 404 JSON when thumbnail is not available', async () => {
            service.getThumbnail.mockResolvedValueOnce(null);
            const res = createRes();

            await controller.thumbnail('file-1', res);

            expect(service.getThumbnail).toHaveBeenCalledWith('file-1');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Thumbnail not available for this file type' });
        });

        it('sets headers and returns buffer when thumbnail exists', async () => {
            const buffer = Buffer.from('thumb');
            service.getThumbnail.mockResolvedValueOnce({ buffer, mimeType: 'image/webp', hasThumbnail: true });
            const res = createRes();

            await controller.thumbnail('file-1', res);

            expect(res.set).toHaveBeenCalledWith({
                'Content-Type': 'image/webp',
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
            });
            expect(res.send).toHaveBeenCalledWith(buffer);
        });
    });
});
