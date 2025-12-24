/**
 * Story 4.1: FIX-11 - File Upload Module
 * Module for file storage and retrieval
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
    imports: [
        MulterModule.register({
            storage: memoryStorage(), // Store in memory, then save via FileService
        }),
    ],
    controllers: [FileController],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule {}
