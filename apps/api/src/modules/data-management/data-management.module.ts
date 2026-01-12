/**
 * Story 9.1: Data Library (数据资源库)
 * Story 9.5: Data Upload & Node Linking
 * Data Management Module - Encapsulates data library functionality
 *
 * GR-2 Compliance: Services and repositories extracted to separate files
 */

import { Module } from '@nestjs/common';
import { DataAssetController } from './data-asset.controller';
import { DataAssetService } from './data-asset.service';
import { DataFolderService } from './data-folder.service';
import { NodeDataLinkService } from './node-data-link.service';
import {
  DataAssetRepository,
  DataFolderRepository,
  NodeDataLinkRepository,
} from './data-asset.repository';
import { DataLibrarySeedService } from './mock-data';
import { DataManagementAuthGuard } from './guards/data-management-auth.guard';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [DataAssetController],
  providers: [
    // Services
    DataAssetService,
    DataFolderService,
    NodeDataLinkService,
    // Repositories
    DataAssetRepository,
    DataFolderRepository,
    NodeDataLinkRepository,
    // Utils
    DataLibrarySeedService,
    DataManagementAuthGuard,
  ],
  exports: [DataAssetService, DataFolderService, NodeDataLinkService],
})
export class DataManagementModule { }

