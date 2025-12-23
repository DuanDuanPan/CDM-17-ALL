/**
 * Story 2.9: APP 节点类型与工业软件集成
 * Application Library Entry Types
 */

import type { AppInput, AppOutput } from './node-types';

/**
 * Story 2.9: 卫星应用库条目
 */
export interface AppLibraryEntry {
  id: string;                          // 唯一标识
  name: string;                        // 应用名称
  description?: string;                // 应用描述
  category: string;                    // 分类 (e.g., "轨道设计", "热分析")
  icon?: string;                       // 图标标识
  version?: string;                    // 版本号

  // 默认 I/O 模板 (不含运行时生成的字段)
  defaultInputs: Omit<AppInput, 'id' | 'value' | 'fileId' | 'fileName'>[];
  defaultOutputs: Omit<AppOutput, 'id' | 'value' | 'fileName' | 'generatedAt'>[];

  // 执行配置
  executionType: 'local' | 'webapi';   // 执行方式
  protocolScheme?: string;             // 本地协议 (e.g., "matlab://")
  apiEndpoint?: string;                // Web API 端点
}

/**
 * Story 2.9: 应用库搜索结果
 */
export interface AppLibrarySearchResult {
  apps: AppLibraryEntry[];
  total: number;
  query?: string;
}
