/**
 * Story 9.1: Data Library (数据资源库)
 * Mock Data Seed - Satellite domain examples (卫星领域示例)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { prisma } from '@cdm/database';

/**
 * Mock data assets for satellite domain
 */
const SATELLITE_MOCK_ASSETS = [
  {
    name: '卫星总体结构',
    description: '卫星主体结构 3D CAD 模型，包含所有主要部件的装配关系',
    format: 'STEP',
    fileSize: 52428800, // 50MB
    version: 'v2.1.0',
    tags: ['卫星', '结构', '总体设计'],
    thumbnail: '/thumbnails/satellite-structure.png',
    secretLevel: 'internal',
  },
  {
    name: '太阳能电池板模型',
    description: '卫星太阳能电池板展开结构，含铰链和驱动机构',
    format: 'STEP',
    fileSize: 15728640, // 15MB
    version: 'v1.3.0',
    tags: ['卫星', '电源', '太阳能'],
    thumbnail: '/thumbnails/solar-panel.png',
    secretLevel: 'internal',
  },
  {
    name: '天线系统模型',
    description: '高增益定向天线三维模型及馈源组件',
    format: 'IGES',
    fileSize: 8388608, // 8MB
    version: 'v1.0.0',
    tags: ['卫星', '通信', '天线'],
    thumbnail: '/thumbnails/antenna.png',
    secretLevel: 'confidential',
  },
  {
    name: '姿态控制系统原理图',
    description: '卫星姿态控制系统功能框图及信号流向',
    format: 'PDF',
    fileSize: 2097152, // 2MB
    version: 'v3.0.0',
    tags: ['卫星', '控制', '姿态'],
    thumbnail: '/thumbnails/attitude-control.png',
    secretLevel: 'internal',
  },
  {
    name: '热控系统仿真数据',
    description: '卫星在轨热分析结果及温度场分布数据',
    format: 'CSV',
    fileSize: 524288, // 512KB
    version: 'v1.5.0',
    tags: ['卫星', '热控', '仿真'],
    thumbnail: null,
    secretLevel: 'internal',
  },
  {
    name: '载荷舱结构',
    description: '卫星载荷舱主体结构及安装接口定义',
    format: 'STL',
    fileSize: 10485760, // 10MB
    version: 'v1.0.0',
    tags: ['卫星', '载荷', '结构'],
    thumbnail: '/thumbnails/payload-bay.png',
    secretLevel: 'internal',
  },
  {
    name: '推进系统管路图',
    description: '卫星推进系统管路连接及阀门配置图',
    format: 'PDF',
    fileSize: 1048576, // 1MB
    version: 'v2.0.0',
    tags: ['卫星', '推进', '管路'],
    thumbnail: '/thumbnails/propulsion.png',
    secretLevel: 'confidential',
  },
  {
    name: '星载计算机接口规范',
    description: '星载计算机与各分系统的接口定义文档',
    format: 'DOCX',
    fileSize: 3145728, // 3MB
    version: 'v4.2.0',
    tags: ['卫星', '计算机', '接口'],
    thumbnail: null,
    secretLevel: 'internal',
  },
  {
    name: '轨道参数数据集',
    description: '卫星轨道六要素历史数据及预报数据',
    format: 'JSON',
    fileSize: 262144, // 256KB
    version: 'v1.0.0',
    tags: ['卫星', '轨道', '数据'],
    thumbnail: null,
    secretLevel: 'public',
  },
  {
    name: '卫星外观渲染图',
    description: '卫星整体外观高分辨率渲染效果图',
    format: 'IMAGE',
    fileSize: 5242880, // 5MB
    version: 'v1.0.0',
    tags: ['卫星', '渲染', '外观'],
    thumbnail: '/thumbnails/satellite-render.png',
    secretLevel: 'public',
  },
];

/**
 * Mock folders for organizing assets
 */
const SATELLITE_MOCK_FOLDERS = [
  { name: '结构设计', description: '卫星结构相关文档和模型' },
  { name: '电气系统', description: '电源及电气系统资料' },
  { name: '控制系统', description: '姿态和轨道控制相关资料' },
  { name: '仿真数据', description: '各类仿真分析结果' },
];

@Injectable()
export class DataLibrarySeedService implements OnModuleInit {
  private readonly logger = new Logger(DataLibrarySeedService.name);

  async onModuleInit() {
    const env = process.env.NODE_ENV || 'development';
    const seedEnabled = process.env.CDM_SEED_DATA_LIBRARY !== 'false';

    if (!seedEnabled) {
      this.logger.log('CDM_SEED_DATA_LIBRARY=false, skipping data library seed');
      return;
    }

    if (env === 'production') {
      this.logger.log('NODE_ENV=production, skipping data library seed');
      return;
    }

    await this.seedMockData();
  }

  /**
   * Seed mock data for testing
   * Only runs if no data assets exist
   */
  async seedMockData() {
    // Check if we already have data
    const existingCount = await prisma.dataAsset.count();
    if (existingCount > 0) {
      this.logger.log(`Data library already has ${existingCount} assets, skipping seed`);
      return;
    }

    // Get a graph to associate with
    const graph = await prisma.graph.findFirst();
    if (!graph) {
      this.logger.warn('No graph found, skipping data library seed');
      return;
    }

    this.logger.log(`Seeding data library with satellite domain examples for graph ${graph.id}`);

    // Create folders first
    const folderMap = new Map<string, string>();
    for (const folder of SATELLITE_MOCK_FOLDERS) {
      const created = await prisma.dataFolder.create({
        data: {
          name: folder.name,
          description: folder.description,
          graph: { connect: { id: graph.id } },
        },
      });
      folderMap.set(folder.name, created.id);
    }

    // Create assets
    for (const asset of SATELLITE_MOCK_ASSETS) {
      // Assign folder based on tags
      let folderId: string | null = null;
      if (asset.tags.includes('结构')) {
        folderId = folderMap.get('结构设计') || null;
      } else if (asset.tags.includes('电源') || asset.tags.includes('通信')) {
        folderId = folderMap.get('电气系统') || null;
      } else if (asset.tags.includes('控制') || asset.tags.includes('姿态')) {
        folderId = folderMap.get('控制系统') || null;
      } else if (asset.tags.includes('仿真')) {
        folderId = folderMap.get('仿真数据') || null;
      }

      await prisma.dataAsset.create({
        data: {
          name: asset.name,
          description: asset.description,
          format: asset.format as 'STEP' | 'IGES' | 'STL' | 'OBJ' | 'FBX' | 'GLTF' | 'PDF' | 'DOCX' | 'XLSX' | 'JSON' | 'XML' | 'CSV' | 'IMAGE' | 'VIDEO' | 'OTHER',
          fileSize: asset.fileSize,
          version: asset.version,
          tags: asset.tags,
          thumbnail: asset.thumbnail,
          secretLevel: asset.secretLevel,
          graph: { connect: { id: graph.id } },
          folder: folderId ? { connect: { id: folderId } } : undefined,
        },
      });
    }

    this.logger.log(`Seeded ${SATELLITE_MOCK_ASSETS.length} data assets and ${SATELLITE_MOCK_FOLDERS.length} folders`);
  }
}
