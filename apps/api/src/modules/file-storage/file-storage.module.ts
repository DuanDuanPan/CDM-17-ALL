/**
 * Story 10.4: File Storage Module
 * Registers Controller, Service, Repository, and Adapter
 *
 * Story 10.5: Removed FileModule import to break circular dependency.
 * Legacy FileService fallback has been removed per Epic 10 constraints.
 *
 * Story 10.6: Added ThumbnailService for image thumbnail generation.
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GraphsModule } from '../graphs/graphs.module';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { FileStorageRepository } from './file-storage.repository';
import { LocalDiskAdapter } from './adapters/local-disk.adapter';
import { STORAGE_ADAPTER } from './adapters/storage-adapter.interface';
import { FileStorageAuthGuard } from './guards/file-storage-auth.guard';
import { ThumbnailService } from './thumbnail.service';

@Module({
    imports: [
        // Ensure `file.buffer` is available (memory storage) for multipart uploads
        MulterModule.register({
            storage: memoryStorage(),
        }),
        // Graph existence validation
        GraphsModule,
    ],
    controllers: [FileStorageController],
    providers: [
        FileStorageService,
        FileStorageRepository,
        FileStorageAuthGuard,
        ThumbnailService,  // Story 10.6
        {
            provide: STORAGE_ADAPTER,
            useClass: LocalDiskAdapter,
        },
    ],
    exports: [FileStorageService],
})
export class FileStorageModule { }

