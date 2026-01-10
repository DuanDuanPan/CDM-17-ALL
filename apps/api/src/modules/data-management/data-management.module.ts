/**
 * Story 9.1: Data Library (数据资源库)
 * Data Management Module - Encapsulates data library functionality
 */

import { Module } from '@nestjs/common';
import { DataAssetController } from './data-asset.controller';
import { DataAssetService } from './data-asset.service';
import {
  DataAssetRepository,
  DataFolderRepository,
  NodeDataLinkRepository,
} from './data-asset.repository';
import { DataLibrarySeedService } from './mock-data';
import { DataManagementAuthGuard } from './guards/data-management-auth.guard';

@Module({
  controllers: [DataAssetController],
  providers: [
    DataAssetService,
    DataAssetRepository,
    DataFolderRepository,
    NodeDataLinkRepository,
    DataLibrarySeedService,
    DataManagementAuthGuard,
  ],
  exports: [DataAssetService],
})
export class DataManagementModule {}
