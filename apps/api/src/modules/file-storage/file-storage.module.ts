/**
 * Story 10.4: File Storage Module
 * Registers Controller, Service, Repository, and Adapter
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GraphsModule } from '../graphs/graphs.module';
import { FileModule } from '../file/file.module';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { FileStorageRepository } from './file-storage.repository';
import { LocalDiskAdapter } from './adapters/local-disk.adapter';
import { STORAGE_ADAPTER } from './adapters/storage-adapter.interface';
import { FileStorageAuthGuard } from './guards/file-storage-auth.guard';

@Module({
    imports: [
        // Ensure `file.buffer` is available (memory storage) for multipart uploads
        MulterModule.register({
            storage: memoryStorage(),
        }),
        // Legacy file service fallback for /api/files/:id compatibility
        FileModule,
        // Graph existence validation
        GraphsModule,
    ],
    controllers: [FileStorageController],
    providers: [
        FileStorageService,
        FileStorageRepository,
        FileStorageAuthGuard,
        {
            provide: STORAGE_ADAPTER,
            useClass: LocalDiskAdapter,
        },
    ],
    exports: [FileStorageService],
})
export class FileStorageModule { }
