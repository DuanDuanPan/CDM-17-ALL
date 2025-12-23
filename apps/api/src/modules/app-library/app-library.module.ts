/**
 * Story 2.9: APP Library Module
 * Provides satellite application library services
 */

import { Module } from '@nestjs/common';
import { AppLibraryController } from './app-library.controller';
import { AppLibraryService } from './app-library.service';
import { AppExecutorService } from './app-executor.service';

@Module({
  controllers: [AppLibraryController],
  providers: [AppLibraryService, AppExecutorService],
  exports: [AppLibraryService, AppExecutorService],
})
export class AppLibraryModule { }
