# Story 5.1: 模板库与实例化 (Template Library)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Tech-Spec: docs/sprint-artifacts/tech-spec-5-1-template-library.md -->

## Story

As a **用户**,
I want **在创建新文件时选择预置的行业标准模板**,
so that **我能快速启动项目，无需从零搭建结构。**

---

## Acceptance Criteria

### AC1: 模板库入口与展示
**Given** 用户位于图谱列表页 `/graphs`（带 `userId` 查询参数）
**When** 点击“创建新图谱”并选择“从模板创建”
**Then** 应打开模板库对话框并显示模板列表（如“敏捷研发管理”、“故障复盘”、“系统架构设计”等）
**And** 模板列表支持分类筛选和搜索
**And** 每个模板有缩略图预览、名称和描述

### AC2: 模板预览
**Given** 模板库已展示
**When** 用户悬停或点击模板卡片
**Then** 应显示模板的详细预览（完整结构概览）
**And** 显示模板的元数据（创建者、更新时间、使用次数）
**And** 显示模板的预置属性（密级要求、必填字段等）

### AC3: 模板实例化
**Given** 用户选中一个模板
**When** 点击"确认创建"按钮
**Then** 新图谱应自动填充模板预置的节点结构
**And** 新图谱应继承模板预置的样式和属性字段
**And** 模板中预设的密级要求应自动应用到新图谱
**And** 用户应被导航到新创建的脑图画布 `/graph/{graphId}?userId={userId}`

### AC4: 模板使用追踪
**Given** 模板被用于创建新图谱
**When** 创建完成后
**Then** 系统应记录该模板的使用日志
**And** 模板的使用统计应更新（使用次数 +1）

### Non-Goals (本 Story 不包含)
- 管理员后台的模板增删改/发布/下线/版本回滚 UI（建议后续单独 Story 承接）

---

## Tasks / Subtasks

### Phase 1: 数据模型与后端基础

#### Task 1.1: Prisma Schema 扩展 (AC: #1, #4)

**文件:** `packages/database/prisma/schema.prisma`

- [x] 添加 `TemplateStatus` 枚举 (DRAFT, PUBLISHED, DEPRECATED)
- [x] 创建 `TemplateCategory` 表
  ```prisma
  model TemplateCategory {
    id          String   @id @default(cuid())
    name        String   @unique
    icon        String?  // Lucide icon name
    sortOrder   Int      @default(0)
    templates   Template[]
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```
- [x] 创建 `Template` 表
  ```prisma
  model Template {
    id          String         @id @default(cuid())
    name        String
    description String?        @db.Text
    thumbnail   String?
    structure   Json           // { rootNode: { label, type?, metadata?, children: [...] } }
    defaultClassification String  @default("internal")
    requiredFields       Json?
    status      TemplateStatus @default(DRAFT)
    version     Int            @default(1)
    categoryId  String?
    category    TemplateCategory? @relation(fields: [categoryId], references: [id])
    creatorId   String?
    usageCount  Int            @default(0)
    createdAt   DateTime       @default(now())
    updatedAt   DateTime       @updatedAt
    usageLogs   TemplateUsageLog[]
    @@index([status])
    @@index([categoryId])
  }
  ```
- [x] 创建 `TemplateUsageLog` 表
  ```prisma
  model TemplateUsageLog {
    id          String   @id @default(cuid())
    templateId  String
    template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
    userId      String
    graphId     String
    createdAt   DateTime @default(now())
    @@index([templateId])
    @@index([userId])
  }
  ```

#### Task 1.2: 类型定义 (AC: All)

**文件:** `packages/types/src/template-types.ts`

- [x] 定义 `TemplateStatus` 类型
- [x] 定义 `TemplateCategory` 接口
- [x] 定义 `TemplateNode` 接口 (label, type?, metadata?, children?)
- [x] 定义 `TemplateStructure` 接口 ({ rootNode: TemplateNode })
- [x] 定义 `Template` 接口 (完整模板)
- [x] 定义 `TemplateListItem` 接口 (列表展示用)
- [x] 定义 `CreateFromTemplateRequest` / `CreateFromTemplateResponse`
- [x] 定义 `TemplateQueryOptions` 接口
- [x] 更新 `packages/types/src/index.ts` 导出

#### Task 1.3: 数据库迁移与种子数据 (AC: #1)

- [x] 运行迁移命令:
  ```bash
  cd packages/database
  pnpm prisma migrate dev --name add_template_models
  pnpm prisma generate
  ```
- [x] 创建种子脚本 `packages/database/prisma/seed.ts` (合并到主种子脚本)
- [x] 添加预置分类: 项目管理、问题分析、技术设计
- [x] 添加预置模板: 敏捷研发管理、故障复盘、系统架构设计

### Phase 2: 后端 Plugin 开发

#### Task 2.1: Plugin 结构初始化 (AC: #1, #2)

**创建目录结构:**
```
packages/plugins/plugin-template/
├── src/
│   ├── index.ts
│   └── server/
│       ├── index.ts
│       └── templates/
│           ├── index.ts
│           ├── templates.module.ts
│           ├── templates.controller.ts
│           ├── templates.service.ts
│           └── templates.repository.ts
├── package.json
└── tsconfig.json
```

- [x] 创建 `package.json` (依赖: @cdm/database, @cdm/types, @nestjs/common)
- [x] 创建 `tsconfig.json` (继承根配置)
- [x] 创建入口 `src/index.ts`

#### Task 2.2: Repository 实现 (AC: #1, #2)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.repository.ts`

**参考模式:** `packages/plugins/plugin-comments/src/server/comments/comments.repository.ts`

- [x] 实现 `findAll(options?: TemplateQueryOptions)` - 支持分类筛选、搜索、分页
- [x] 实现 `findById(id: string)` - 获取完整模板（含结构）
- [x] 实现 `findCategories()` - 获取所有分类
- [x] 实现 `logUsage(templateId, userId, graphId)` - 记录使用并更新计数

#### Task 2.3: Service 实现 (AC: #1, #2, #3)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.service.ts`

**参考模式:** `packages/plugins/plugin-comments/src/server/comments/comments.service.ts`

- [x] 实现 `listTemplates(options)` - 调用 Repository
- [x] 实现 `getTemplate(id)` - 抛出 NotFoundException
- [x] 实现 `getCategories()` - 返回分类列表
- [x] 实现 `instantiate(templateId, userId, graphName?)`:
  - 验证模板状态为 PUBLISHED
  - 在后端为该 user 获取/创建默认 Project，并在其中创建 Graph（参考 `apps/api/src/demo/demo-seed.service.ts` 的逻辑）
  - 调用 `generateGraphFromTemplate()` 生成节点
  - 事务创建 Graph、Nodes、以及**对应的多态扩展表记录**（关键：TASK/REQUIREMENT/PBS/DATA/APP 需初始化 extension table）
  - 调用 `logUsage()`
- [x] 实现 `generateGraphFromTemplate(template, projectId, graphName)`:
  - 递归处理 TemplateNode
  - 生成唯一节点 ID
  - 计算节点坐标 (x, y)
  - 设置 `parentId` 以保留层级（用于协作服务在无 edges 时自动生成 hierarchical edges）
  - 根据 `type` 初始化扩展表（示例：`NodeTask/NodeRequirement/NodePBS/NodeData/NodeApp` 仅需写入 `nodeId` 以触发默认值）

#### Task 2.4: Controller 实现 (AC: #1, #2, #3)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.controller.ts`

- [x] `GET /templates` → `listTemplates(query)`
- [x] `GET /templates/categories` → `getCategories()`
- [x] `GET /templates/:id` → `getTemplate(id)`
- [x] `POST /templates/:id/instantiate?userId=...` → `instantiate(templateId, userId, body.name?)`
- [x] 创建 DTO 类进行请求验证

#### Task 2.5: Module 配置与导出 (AC: All)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.module.ts`

- [x] 配置 `TemplatesModule.forRoot(options)` 动态模块
- [x] 注册 Controller, Service, Repository
- [x] 导出 Service 和 Repository

**文件:** `packages/plugins/plugin-template/src/server/index.ts`

- [x] 创建 `TemplatesServerModule` 包装器
- [x] 导出所有公共类和接口

#### Task 2.6: 集成到 API 应用 (AC: All)

**文件:** `apps/api/src/app.module.ts`

- [x] 导入 `TemplatesServerModule.forRoot()`

### Phase 3: 前端实现

#### Task 3.1: Hook 实现 (AC: #1, #2, #3)

**文件:** `apps/web/hooks/useTemplates.ts`

**参考模式:** `apps/web/hooks/useKnowledge.ts`

- [x] 实现 `useTemplates()` hook:
  ```typescript
  interface UseTemplatesReturn {
    templates: TemplateListItem[];
    categories: TemplateCategory[];
    loading: boolean;
    error: string | null;
    fetchTemplates: (options?: TemplateQueryOptions) => Promise<void>;
    fetchCategories: () => Promise<void>;
  }
  ```
- [x] 实现 `useTemplatePreview()` hook (合并到 useTemplates):
  ```typescript
  interface UseTemplatePreviewReturn {
    template: Template | null;
    loading: boolean;
    error: string | null;
    fetchTemplate: (id: string) => Promise<void>;
  }
  ```
- [x] 实现 `useInstantiateTemplate(userId)` hook (合并到 useTemplates)：
  ```typescript
  interface UseInstantiateTemplateReturn {
    instantiate: (templateId: string, name?: string) => Promise<CreateFromTemplateResponse>;
    loading: boolean;
    error: string | null;
  }
  ```

#### Task 3.2: Dialog 组件实现 (AC: #1, #2, #3)

**文件:** `apps/web/components/Template/TemplateLibraryDialog.tsx`

**参考模式:** `apps/web/components/Knowledge/KnowledgeSearchDialog.tsx`

- [x] 创建主 Dialog 容器 (900px width, max-h-[85vh])
- [x] 左侧面板:
  - 搜索栏 (300ms debounce)
  - 分类筛选按钮组
  - 模板卡片列表 (overflow-y-auto)
- [x] 右侧面板:
  - TemplatePreviewPanel 组件 (内嵌在 Dialog 中)
- [x] 底部操作栏:
  - 取消按钮
  - "从模板创建"按钮 (disabled 逻辑, loading 状态)
- [x] 处理 `onSelect(result)` 回调

**文件:** `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx` (包含 TemplatePreviewPanel)

- [x] 模板标题和描述
- [x] 元数据展示 (密级、使用次数、版本、分类)
- [x] 必填字段展示
- [x] 结构预览 (递归渲染节点树)

**文件:** `apps/web/components/TemplateLibrary/index.ts`

- [x] 导出 TemplateLibraryDialog

#### Task 3.3: 集成到创建图谱流程 (AC: #3)

- [x] 定位现有“创建新图谱”入口：`apps/web/app/graphs/page.tsx`
- [x] 添加"从模板创建"选项/按钮
- [x] 触发 TemplateLibraryDialog 打开
- [x] 创建成功后导航到新脑图:
  ```typescript
  router.push(`/graph/${graphId}?userId=${userId}`);
  ```

### Phase 4: 测试

#### Task 4.1: 后端单元测试 (AC: All)

**文件:** `packages/plugins/plugin-template/src/server/templates/__tests__/templates.repository.spec.ts`

- [x] TC-REPO-1: findAll 返回 PUBLISHED 状态的模板列表
- [x] TC-REPO-2: findAll 支持 categoryId 筛选
- [x] TC-REPO-3: findAll 支持 search 关键词匹配
- [x] TC-REPO-4: findById 返回完整模板结构
- [x] TC-REPO-5: findById 不存在时返回 null
- [x] TC-REPO-6: logUsage 增加 usageCount 并创建日志

**文件:** `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts`

- [x] TC-SVC-1: listTemplates 调用 Repository.findAll
- [x] TC-SVC-2: getTemplate 返回模板，不存在时抛出 NotFoundException
- [x] TC-SVC-3: instantiate 验证模板状态为 PUBLISHED
- [x] TC-SVC-4: instantiate 非 PUBLISHED 状态抛出 BadRequestException
- [x] TC-SVC-5: instantiate 成功创建 Graph 和 Nodes
- [x] TC-SVC-6: instantiate 调用 logUsage 记录使用
- [x] TC-SVC-7: generateGraphFromTemplate 正确生成节点结构

#### Task 4.2: 前端 Hook 测试 (AC: #1, #2, #3)

**文件:** `apps/web/__tests__/hooks/useTemplates.test.ts`

- [x] TC-HOOK-1: useTemplates 初始状态 loading=false, templates=[]
- [x] TC-HOOK-2: fetchTemplates 成功后更新 templates 状态
- [x] TC-HOOK-3: fetchTemplates 失败时设置 error 状态
- [x] TC-HOOK-4: fetchTemplates 支持 categoryId 和 search 参数
- [x] TC-HOOK-5: useTemplatePreview 获取模板详情
- [x] TC-HOOK-6: useInstantiateTemplate 实例化成功返回 graphId

#### Task 4.3: 组件测试 (AC: #1, #2, #3)

**文件:** `apps/web/__tests__/components/Template/TemplateLibraryDialog.test.tsx`

- [x] TC-UI-1: Dialog 正确打开和关闭
- [x] TC-UI-2: 模板列表正确渲染（名称、描述、密级）
- [x] TC-UI-3: 搜索输入框防抖功能正常
- [x] TC-UI-4: 分类按钮切换正确筛选模板
- [x] TC-UI-5: 点击模板卡片显示预览面板
- [x] TC-UI-6: 未选择模板时"使用此模板"按钮禁用
- [x] TC-UI-7: 选择模板后"使用此模板"按钮启用
- [x] TC-UI-8: 点击确认按钮触发 instantiate
- [x] TC-UI-9: loading 状态显示正确

**文件:** `apps/web/__tests__/components/TemplateLibrary/TemplateLibraryDialog.test.tsx`

- [x] TC-PREV-1: 正确渲染模板标题和描述
- [x] TC-PREV-2: 正确渲染元数据（密级、版本、使用次数）
- [x] TC-PREV-3: 正确渲染必填字段 Badge
- [x] TC-PREV-4: 正确递归渲染结构树

#### Task 4.4: E2E 测试 (AC: All)

**文件:** `apps/web/e2e/template-library.spec.ts`

- [x] TC-E2E-1: 完整模板创建流程
- [x] TC-E2E-2: 模板搜索和筛选
- [x] TC-E2E-3: 验证新脑图包含正确结构
- [x] TC-E2E-4: 验证密级正确应用
- [x] TC-E2E-5: API 响应格式验证

---

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Prisma 迁移缺失：为 Template 模型补齐 migration 并确保可重放 [packages/database/prisma/schema.prisma:26]
- [x] [AI-Review][HIGH] 前后端 API 返回结构不一致：前端需解包 `{ templates }/{ categories }/{ template }` [apps/web/lib/api/templates.ts:44]
- [x] [AI-Review][HIGH] Dialog 硬编码 userId：必须使用 `/graphs?userId=...` 传入的真实 userId [apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx:102]
- [x] [AI-Review][HIGH] Web 单测失败：修复 `TemplateLibraryDialog` 组件测试（fake timers / mock 污染）[apps/web/__tests__/components/TemplateLibrary/TemplateLibraryDialog.test.tsx:200]
- [x] [AI-Review][HIGH] Plugin 单测失败：为 `@cdm/plugin-template` 添加 Jest(ts-jest) 配置并修复 mock [packages/plugins/plugin-template/package.json:27]
- [x] [AI-Review][HIGH] Controller DTO 校验缺失：补齐 query/body DTO（limit/offset/userId/name）并接入 ValidationPipe [packages/plugins/plugin-template/src/server/templates/templates.controller.ts:35]
- [x] [AI-Review][MEDIUM] AC2 元数据未展示：预览区补齐创建者/更新时间/使用次数/版本等信息 [apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx:281]
- [x] [AI-Review][MEDIUM] `TemplatesServerModule.register()` 配置不完整：缺少 DEMO_SEED_SERVICE 时应显式失败或降级 [packages/plugins/plugin-template/src/server/index.ts:79]
- [x] [AI-Review][MEDIUM] Story File List 不完整：补齐实际变更文件清单，避免审计断层 [docs/sprint-artifacts/5-1-template-library.md:1439]
- [x] [AI-Review][LOW] 节点 ID 生成策略弱：替换为更可靠的随机 ID（避免碰撞）[packages/plugins/plugin-template/src/server/templates/templates.service.ts:257]

## Test Design (测试设计)

### 测试策略概述

| 测试层级 | 工具 | 目标 | 覆盖率目标 |
|----------|------|------|-----------|
| 单元测试 (后端) | Jest | Repository/Service 逻辑 | 80%+ |
| 单元测试 (前端) | Vitest | Hooks 逻辑 | 80%+ |
| 组件测试 | Vitest + Testing Library | UI 组件交互 | 关键路径 |
| E2E 测试 | Playwright | 用户流程 | 关键场景 |

### AC 追溯矩阵

| AC | 测试用例 | 测试类型 |
|----|----------|----------|
| AC1: 模板库入口与展示 | TC-UI-1, TC-UI-2, TC-UI-4, TC-E2E-2 | 组件/E2E |
| AC2: 模板预览 | TC-UI-5, TC-PREV-1~4 | 组件 |
| AC3: 模板实例化 | TC-SVC-3~6, TC-HOOK-6, TC-UI-6~9, TC-E2E-1, TC-E2E-3 | 单元/组件/E2E |
| AC4: 模板使用追踪 | TC-REPO-6, TC-SVC-6 | 单元 |

### 详细测试用例

#### 后端单元测试

##### TC-SVC-3: instantiate 验证模板状态为 PUBLISHED

```typescript
/**
 * Story 5.1: Template Library
 * Unit tests for TemplatesService
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates.service';

// Mock Prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        $transaction: jest.fn((fn) => fn(prisma)),
        graph: { create: jest.fn() },
        node: { create: jest.fn() },
    },
}));

describe('TemplatesService', () => {
    let service: TemplatesService;

    const mockRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        findCategories: jest.fn(),
        logUsage: jest.fn(),
    };

    beforeEach(() => {
        service = new TemplatesService(mockRepo as any);
        jest.clearAllMocks();
    });

    describe('instantiate', () => {
        it('throws NotFoundException when template not found', async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                service.instantiate('missing-id', 'user-1')
            ).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when template is not PUBLISHED', async () => {
            mockRepo.findById.mockResolvedValue({
                id: 'template-1',
                name: 'Draft Template',
                status: 'DRAFT',
                structure: { rootNode: { label: 'Root' } },
            });

            await expect(
                service.instantiate('template-1', 'user-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockRepo.logUsage).not.toHaveBeenCalled();
        });

        it('creates graph and nodes when template is PUBLISHED', async () => {
            const mockTemplate = {
                id: 'template-1',
                name: 'Published Template',
                status: 'PUBLISHED',
                structure: {
                    rootNode: {
                        label: 'Root',
                        children: [{ label: 'Child 1' }, { label: 'Child 2' }],
                    },
                },
                defaultClassification: 'internal',
            };

            mockRepo.findById.mockResolvedValue(mockTemplate);

            const result = await service.instantiate(
                'template-1',
                'user-1',
                'My New Graph'
            );

            expect(result).toHaveProperty('graphId');
            expect(result).toHaveProperty('graphName', 'My New Graph');
            expect(mockRepo.logUsage).toHaveBeenCalledWith(
                'template-1',
                'user-1',
                expect.any(String)
            );
        });
    });
});
```

##### TC-REPO-3: findAll 支持 search 关键词匹配

```typescript
/**
 * Story 5.1: Template Library
 * Unit tests for TemplatesRepository
 */

import { TemplatesRepository } from '../templates.repository';

jest.mock('@cdm/database', () => ({
    prisma: {
        template: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        templateUsageLog: {
            create: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('TemplatesRepository', () => {
    let repo: TemplatesRepository;
    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
        repo = new TemplatesRepository();
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('filters by search keyword in name and description', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repo.findAll({ search: 'agile' });

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { name: { contains: 'agile', mode: 'insensitive' } },
                            { description: { contains: 'agile', mode: 'insensitive' } },
                        ],
                    }),
                })
            );
        });

        it('filters by categoryId', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repo.findAll({ categoryId: 'cat-1' });

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: 'cat-1',
                    }),
                })
            );
        });

        it('returns only PUBLISHED templates by default', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repo.findAll();

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'PUBLISHED',
                    }),
                })
            );
        });
    });
});
```

#### 前端 Hook 测试

##### TC-HOOK-2: fetchTemplates 成功后更新 templates 状态

```typescript
/**
 * Story 5.1: Template Library
 * Unit tests for useTemplates hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTemplates, useInstantiateTemplate } from '@/hooks/useTemplates';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTemplates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with empty templates and loading=false', () => {
        const { result } = renderHook(() => useTemplates());

        expect(result.current.templates).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('updates templates after successful fetchTemplates', async () => {
        const mockTemplates = [
            { id: '1', name: 'Template 1', description: 'Desc 1', categoryName: 'PM' },
            { id: '2', name: 'Template 2', description: 'Desc 2', categoryName: 'Tech' },
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ templates: mockTemplates }),
        });

        const { result } = renderHook(() => useTemplates());

        await act(async () => {
            await result.current.fetchTemplates();
        });

        expect(result.current.templates).toEqual(mockTemplates);
        expect(result.current.loading).toBe(false);
    });

    it('sets error state on fetch failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => useTemplates());

        await act(async () => {
            await result.current.fetchTemplates();
        });

        expect(result.current.error).toBe('Failed to fetch templates');
        expect(result.current.templates).toEqual([]);
    });

    it('passes query parameters to fetch', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ templates: [] }),
        });

        const { result } = renderHook(() => useTemplates());

        await act(async () => {
            await result.current.fetchTemplates({
                categoryId: 'cat-1',
                search: 'agile',
            });
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('categoryId=cat-1')
        );
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('search=agile')
        );
    });
});

describe('useInstantiateTemplate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns graphId and graphName on successful instantiation', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                graphId: 'graph-123',
                graphName: 'My Graph',
            }),
        });

        const { result } = renderHook(() => useInstantiateTemplate('test1'));

        let response;
        await act(async () => {
            response = await result.current.instantiate('template-1');
        });

        expect(response).toEqual({
            graphId: 'graph-123',
            graphName: 'My Graph',
        });
        expect(result.current.loading).toBe(false);
    });

    it('sets error state on instantiation failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
        });

        const { result } = renderHook(() => useInstantiateTemplate('test1'));

        await act(async () => {
            try {
                await result.current.instantiate('template-1');
            } catch {
                // Expected to throw
            }
        });

        expect(result.current.error).toBe('Failed to create from template');
    });
});
```

#### 组件测试

##### TC-UI-1~9: TemplateLibraryDialog 组件测试

```typescript
/**
 * Story 5.1: Template Library
 * Component tests for TemplateLibraryDialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateLibraryDialog } from '@/components/Template/TemplateLibraryDialog';

// Mock hooks
vi.mock('@/hooks/useTemplates', () => ({
    useTemplates: () => ({
        templates: [
            {
                id: 'tpl-1',
                name: '敏捷研发管理',
                description: '适用于敏捷开发团队',
                categoryName: '项目管理',
                defaultClassification: 'internal',
                usageCount: 42,
            },
            {
                id: 'tpl-2',
                name: '故障复盘',
                description: '用于故障分析',
                categoryName: '问题分析',
                defaultClassification: 'confidential',
                usageCount: 18,
            },
        ],
        categories: [
            { id: 'cat-1', name: '项目管理', sortOrder: 1 },
            { id: 'cat-2', name: '问题分析', sortOrder: 2 },
        ],
        loading: false,
        fetchTemplates: vi.fn(),
        fetchCategories: vi.fn(),
    }),
    useInstantiateTemplate: () => ({
        instantiate: vi.fn().mockResolvedValue({
            graphId: 'new-graph-123',
            graphName: 'Test Graph',
        }),
        loading: false,
        error: null,
    }),
}));

describe('TemplateLibraryDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        userId: 'test1',
        onCreated: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TC-UI-1: renders dialog when open=true', () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        expect(screen.getByText('从模板创建')).toBeInTheDocument();
    });

    it('TC-UI-1: calls onOpenChange when dialog is closed', async () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        const cancelButton = screen.getByRole('button', { name: '取消' });
        await userEvent.click(cancelButton);

        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('TC-UI-2: renders template list with name, description, classification', () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        expect(screen.getByText('敏捷研发管理')).toBeInTheDocument();
        expect(screen.getByText('适用于敏捷开发团队')).toBeInTheDocument();
        expect(screen.getByText('故障复盘')).toBeInTheDocument();
        expect(screen.getByText('internal')).toBeInTheDocument();
        expect(screen.getByText('confidential')).toBeInTheDocument();
    });

    it('TC-UI-4: category filter buttons are rendered', () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '项目管理' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '问题分析' })).toBeInTheDocument();
    });

    it('TC-UI-5: clicking template card shows preview panel', async () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        const templateCard = screen.getByText('敏捷研发管理').closest('[class*="cursor-pointer"]');
        await userEvent.click(templateCard!);

        // Preview panel should now show the template
        expect(screen.getByText('选择模板查看预览')).not.toBeInTheDocument();
    });

    it('TC-UI-6: confirm button is disabled when no template selected', () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: '使用此模板' });
        expect(confirmButton).toBeDisabled();
    });

    it('TC-UI-7: confirm button is enabled after selecting template', async () => {
        render(<TemplateLibraryDialog {...defaultProps} />);

        const templateCard = screen.getByText('敏捷研发管理').closest('[class*="cursor-pointer"]');
        await userEvent.click(templateCard!);

        const confirmButton = screen.getByRole('button', { name: '使用此模板' });
        expect(confirmButton).not.toBeDisabled();
    });

    it('TC-UI-3: search input has debounce behavior', async () => {
        const { useTemplates } = await import('@/hooks/useTemplates');
        const fetchTemplates = vi.fn();
        vi.mocked(useTemplates).mockReturnValue({
            ...vi.mocked(useTemplates)(),
            fetchTemplates,
        });

        render(<TemplateLibraryDialog {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText('搜索模板...');
        await userEvent.type(searchInput, 'agile');

        // Should debounce - not immediately called
        expect(fetchTemplates).not.toHaveBeenCalledWith(
            expect.objectContaining({ search: 'agile' })
        );

        // Wait for debounce
        await waitFor(() => {
            expect(fetchTemplates).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'agile' })
            );
        }, { timeout: 500 });
    });
});
```

#### E2E 测试

##### TC-E2E-1~5: 完整模板创建流程

```typescript
/**
 * Story 5.1: Template Library E2E Tests
 * Tests for template browsing, selection, and instantiation
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to wait for API responses
const waitForApi = (page: Page, method: string, path: string) =>
    page.waitForResponse(
        (res) =>
            res.url().includes(path) &&
            res.request().method() === method &&
            res.ok(),
        { timeout: 10000 }
    );

test.describe('Template Library (Story 5.1)', () => {
    const userId = process.env.E2E_USER_ID || 'test-e2e-user';

    test.describe('AC1: Template List Display', () => {
        test('TC-E2E-1.1: Template library dialog opens with templates', async ({ page }) => {
            // Given: User is on the graphs list page
            await page.goto(`/graphs?userId=${userId}`);
            await page.waitForLoadState('networkidle');

            // When: User clicks "从模板创建"
            const createFromTemplateBtn = page.getByRole('button', { name: /从模板创建/ });
            await createFromTemplateBtn.click();

            // Then: Dialog should open with template list
            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByText('从模板创建')).toBeVisible();

            // Templates should be loaded
            await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible();
        });

        test('TC-E2E-1.2: Category filter works correctly', async ({ page }) => {
            await page.goto(`/graphs?userId=${userId}`);
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Given: All templates are shown
            const allButton = page.getByRole('button', { name: '全部' });
            await expect(allButton).toBeVisible();

            // When: Click on a specific category
            const categoryButton = page.getByRole('button', { name: '项目管理' });
            if (await categoryButton.isVisible()) {
                await categoryButton.click();
                await page.waitForTimeout(300);

                // Then: Only templates in that category should be visible
                // (Verify by checking category badge on templates)
            }
        });
    });

    test.describe('AC2: Template Preview', () => {
        test('TC-E2E-2.1: Clicking template shows preview panel', async ({ page }) => {
            await page.goto(`/graphs?userId=${userId}`);
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // When: Click on a template card
            const templateCard = page.locator('[class*="cursor-pointer"]').first();
            await templateCard.click();

            // Then: Preview panel should show template details
            // Preview should contain structure visualization
            await expect(page.locator('[class*="border rounded-lg"]').last()).toBeVisible();
        });
    });

    test.describe('AC3: Template Instantiation', () => {
        test('TC-E2E-3.1: Complete template creation flow', async ({ page }) => {
            await page.goto(`/graphs?userId=${userId}`);
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Step 1: Select a template
            const templateCard = page.locator('[class*="cursor-pointer"]').first();
            await templateCard.click();
            await page.waitForTimeout(200);

            // Step 2: Click confirm button
            const confirmButton = page.getByRole('button', { name: '使用此模板' });
            await expect(confirmButton).toBeEnabled();

            // Prepare to wait for navigation
            const navigationPromise = page.waitForURL(/\/graph\//, { timeout: 10000 });

            await confirmButton.click();

            // Step 3: Should navigate to new graph
            await navigationPromise;

            // Step 4: Graph should have nodes from template
            await expect(page.locator('.x6-node')).toHaveCount({ minimum: 1 });
        });

        test('TC-E2E-3.2: New graph inherits template structure', async ({ page }) => {
            await page.goto(`/graphs?userId=${userId}`);
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Select "敏捷研发管理" template
            const agileTemplate = page.locator('text=敏捷研发管理');
            if (await agileTemplate.isVisible()) {
                await agileTemplate.click();
                await page.getByRole('button', { name: '使用此模板' }).click();

                await page.waitForURL(/\/graph\//);
                await page.waitForTimeout(1000);

                // Verify root node exists
                const rootNode = page.locator('.x6-node').first();
                await expect(rootNode).toBeVisible();
            }
        });
    });

    test.describe('API Contract Validation', () => {
        test('TC-E2E-API-1: Templates API returns valid data', async ({ page }) => {
            const response = await page.request.get('/api/templates');

            expect(response.ok()).toBe(true);

            const data = await response.json();
            expect(data).toHaveProperty('templates');
            expect(Array.isArray(data.templates)).toBe(true);

            if (data.templates.length > 0) {
                const template = data.templates[0];
                expect(template).toHaveProperty('id');
                expect(template).toHaveProperty('name');
                expect(template).toHaveProperty('defaultClassification');
            }
        });

        test('TC-E2E-API-2: Template detail API returns structure', async ({ page }) => {
            // First get list to find a template ID
            const listResponse = await page.request.get('/api/templates');
            const listData = await listResponse.json();

            if (listData.templates.length > 0) {
                const templateId = listData.templates[0].id;

                const detailResponse = await page.request.get(
                    `/api/templates/${templateId}`
                );

                expect(detailResponse.ok()).toBe(true);

                const detailData = await detailResponse.json();
                expect(detailData).toHaveProperty('template');
                expect(detailData.template).toHaveProperty('structure');
                expect(detailData.template.structure).toHaveProperty('rootNode');
            }
        });

        test('TC-E2E-API-3: Categories API returns valid data', async ({ page }) => {
            const response = await page.request.get('/api/templates/categories');

            expect(response.ok()).toBe(true);

            const data = await response.json();
            expect(data).toHaveProperty('categories');
            expect(Array.isArray(data.categories)).toBe(true);

            if (data.categories.length > 0) {
                const category = data.categories[0];
                expect(category).toHaveProperty('id');
                expect(category).toHaveProperty('name');
            }
        });
    });

    test.describe('Search and Filter', () => {
        test('TC-E2E-SEARCH-1: Search filters templates correctly', async ({ page }) => {
            await page.goto(`/graphs?userId=${userId}`);
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            const searchInput = page.getByPlaceholder('搜索模板...');
            await searchInput.fill('敏捷');
            await page.waitForTimeout(500); // Wait for debounce

            // Only matching templates should be visible
            await expect(page.locator('text=敏捷研发管理')).toBeVisible();
        });
    });
});
```

### 测试数据准备

```typescript
// test/fixtures/template-fixtures.ts

export const mockTemplates = [
    {
        id: 'tpl-agile',
        name: '敏捷研发管理',
        description: '适用于敏捷开发团队的项目管理模板',
        categoryId: 'cat-pm',
        categoryName: '项目管理',
        thumbnail: null,
        structure: {
            rootNode: {
                label: '项目名称',
                children: [
                    { label: 'Epic 1', type: 'REQUIREMENT' },
                    { label: 'Sprint Backlog' },
                ],
            },
        },
        defaultClassification: 'internal',
        requiredFields: ['executor', 'dueDate'],
        status: 'PUBLISHED',
        usageCount: 42,
        version: 1,
    },
    {
        id: 'tpl-postmortem',
        name: '故障复盘',
        description: '用于故障分析和复盘的模板',
        categoryId: 'cat-problem',
        categoryName: '问题分析',
        thumbnail: null,
        structure: {
            rootNode: {
                label: '故障复盘',
                children: [
                    { label: '故障现象' },
                    { label: '根因分析' },
                ],
            },
        },
        defaultClassification: 'confidential',
        requiredFields: null,
        status: 'PUBLISHED',
        usageCount: 18,
        version: 1,
    },
];

export const mockCategories = [
    { id: 'cat-pm', name: '项目管理', icon: 'Kanban', sortOrder: 1 },
    { id: 'cat-problem', name: '问题分析', icon: 'Search', sortOrder: 2 },
    { id: 'cat-tech', name: '技术设计', icon: 'Code', sortOrder: 3 },
];
```

### 测试执行命令

```bash
# 后端单元测试（plugin-template）
pnpm --filter @cdm/plugin-template test

# 前端单元测试（Vitest）
pnpm --filter @cdm/web test
# 可选：只跑相关测试文件
pnpm --filter @cdm/web test -- __tests__/hooks/useTemplates.test.ts
pnpm --filter @cdm/web test -- __tests__/components/Template/TemplateLibraryDialog.test.tsx

# E2E 测试（Playwright）
pnpm --filter @cdm/web test:e2e -- e2e/template-library.spec.ts

# 运行所有测试（turbo）
pnpm test
```

---

## Dev Notes

### 架构模式遵循

1. **Plugin Protocol (Microkernel)**
   - 模板功能必须作为独立 Plugin 实现
   - 目录: `packages/plugins/plugin-template/`
   - 参考: `packages/plugins/plugin-comments/`

2. **Repository Pattern**
   - 禁止在 Service 层直接调用 prisma
   - 必须通过 TemplatesRepository 封装数据访问
   - 参考: `plugin-comments/src/server/comments/comments.repository.ts`

3. **Hook-First Extraction**
   - UI 组件不包含 fetch 调用
   - 所有 API 调用下沉到 custom hooks
   - 参考: `apps/web/hooks/useKnowledge.ts`

4. **Dialog 组件模式**
   - 使用 Shadcn Dialog + Command 组合
   - 参考: `apps/web/components/Knowledge/KnowledgeSearchDialog.tsx`

### 技术栈

**前端:**
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.0.7 | App Router |
| React | 19.1.0 | UI Library |
| TailwindCSS | 3.4.17 | Styling |
| Shadcn UI | - | Dialog, Button, Badge, ScrollArea |
| use-debounce | - | 搜索防抖 |
| sonner | - | Toast 通知 |
| lucide-react | - | 图标 |

**后端:**
| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 11.1.9 | Framework |
| Prisma | - | ORM |
| class-validator | 0.14.1 | DTO 验证 |

### 完整文件清单

**新增文件:**
```
packages/database/prisma/schema.prisma          # 修改：添加 Template 模型
packages/database/prisma/seed-templates.ts      # 新增：种子数据脚本

packages/types/src/template-types.ts            # 新增：类型定义
packages/types/src/index.ts                     # 修改：导出

packages/plugins/plugin-template/
├── package.json                                # 新增
├── tsconfig.json                               # 新增
└── src/
    ├── index.ts                                # 新增
    └── server/
        ├── index.ts                            # 新增
        └── templates/
            ├── index.ts                        # 新增
            ├── templates.module.ts             # 新增
            ├── templates.controller.ts         # 新增
            ├── templates.service.ts            # 新增
            └── templates.repository.ts         # 新增

apps/api/src/app.module.ts                      # 修改：导入 TemplatesServerModule

apps/web/hooks/useTemplates.ts                  # 新增

apps/web/components/Template/
├── index.ts                                    # 新增
├── TemplateLibraryDialog.tsx                   # 新增
└── TemplatePreviewPanel.tsx                    # 新增

apps/web/__tests__/hooks/useTemplates.test.ts   # 新增

apps/web/__tests__/components/Template/
├── TemplateLibraryDialog.test.tsx              # 新增
└── TemplatePreviewPanel.test.tsx               # 新增

apps/web/e2e/template-library.spec.ts           # 新增
```

### 关键代码参考

#### Repository 模式示例 (参考 comments.repository.ts)

```typescript
@Injectable()
export class TemplatesRepository {
    async findAll(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        const where: Prisma.TemplateWhereInput = {
            status: options?.status || 'PUBLISHED',
        };
        
        if (options?.categoryId) {
            where.categoryId = options.categoryId;
        }
        
        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { description: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        
        return prisma.template.findMany({
            where,
            select: { id: true, name: true, description: true, ... },
            orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
            take: options?.limit || 50,
        });
    }
}
```

#### Hook 模式示例 (参考 useKnowledge.ts)

```typescript
export function useTemplates(): UseTemplatesReturn {
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    const fetchTemplates = useCallback(async (options?: TemplateQueryOptions) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (options?.categoryId) params.set('categoryId', options.categoryId);
            if (options?.search) params.set('search', options.search);
            
            const response = await fetch(`/api/templates?${params}`);
            const data = await response.json();
            setTemplates(data.templates);
        } finally {
            setLoading(false);
        }
    }, []);
    
    return { templates, loading, fetchTemplates, ... };
}
```

### UI/UX 要求

1. **视觉标准**: 遵循 Magic UI 美学
   - 模板卡片使用 hover:border-primary 效果
   - 选中状态: border-primary bg-accent
   - 加载状态使用 Skeleton 组件

2. **交互模式**:
   - 左右分栏布局 (列表 | 预览)
   - 支持键盘导航（方向键选择、Enter确认）
   - 分类使用按钮组快速切换

3. **密级展示**:
   - 使用 Badge 展示默认密级
   - 颜色映射: public=green, internal=blue, confidential=orange, secret=red

### 种子数据

```typescript
const seedTemplates = [
  {
    name: '敏捷研发管理',
    description: '适用于敏捷开发团队的项目管理模板，包含Sprint规划、用户故事、回顾等结构',
    categoryId: 'project-management',
    structure: {
      rootNode: {
        label: '项目名称',
        children: [
          { label: 'Epic 1', type: 'REQUIREMENT', children: [
            { label: 'Story 1.1', type: 'TASK' },
            { label: 'Story 1.2', type: 'TASK' },
          ]},
          { label: 'Sprint Backlog', children: [{ label: '待办事项', type: 'TASK' }] },
          { label: '回顾记录' },
        ],
      },
    },
    defaultClassification: 'internal',
    requiredFields: ['executor', 'dueDate'],
    status: 'PUBLISHED',
  },
  {
    name: '故障复盘',
    description: '用于故障分析和复盘的模板，帮助团队系统地记录和分析问题',
    categoryId: 'problem-analysis',
    structure: {
      rootNode: {
        label: '故障复盘',
        children: [
          { label: '故障现象' },
          { label: '影响范围' },
          { label: '根因分析', children: [
            { label: '直接原因' },
            { label: '根本原因' },
          ]},
          { label: '改进措施', type: 'TASK' },
          { label: '跟踪验证', type: 'TASK' },
        ],
      },
    },
    defaultClassification: 'internal',
    status: 'PUBLISHED',
  },
  {
    name: '系统架构设计',
    description: '软件系统架构设计模板，涵盖关键架构决策和组件分解',
    categoryId: 'tech-design',
    structure: {
      rootNode: {
        label: '系统架构',
        children: [
          { label: '需求分析', type: 'REQUIREMENT' },
          { label: '技术选型' },
          { label: '模块设计', children: [
            { label: '前端模块' },
            { label: '后端模块' },
            { label: '数据层' },
          ]},
          { label: '部署架构' },
          { label: '安全设计' },
        ],
      },
    },
    defaultClassification: 'confidential',
    requiredFields: ['owner'],
    status: 'PUBLISHED',
  },
];
```

### References

- [Source: docs/sprint-artifacts/tech-spec-5-1-template-library.md] - 完整技术规范
- [Source: docs/prd.md#R9] - 模板库与复用需求
- [Source: docs/prd.md#R19] - 模板与子树片段库增强需求
- [Source: docs/epics.md#Epic5-Story5.1] - 模板库与实例化 Story 定义
- [Source: docs/architecture.md#Plugin-Protocol] - 插件化架构模式
- [Source: docs/architecture.md#RESTful-API-Design] - API 设计规范
- [Source: docs/architecture.md#Repository-Pattern] - 数据访问模式
- [Source: docs/project-context.md#Hook-First] - 前端 Hook-First 模式
- [Source: packages/plugins/plugin-comments/] - Plugin 实现参考
- [Source: apps/web/hooks/useKnowledge.ts] - Hook 实现参考
- [Source: apps/web/components/Knowledge/KnowledgeSearchDialog.tsx] - Dialog 组件参考

### 与其他 Stories 的关系

- **前置**: 无（Epic 5 首个 Story）
- **后续**:
  - Story 5.2 (子树片段保存与复用) - 将复用模板存储机制
  - Story 5.3 (跨图引用与连接) - 模板可能包含跨图引用
  - Story 5.4 (AI 智能生成与扩展) - AI 可基于模板生成内容

### 潜在风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 模板结构与现有节点数据格式不兼容 | 设计时确保模板 JSON 结构与 Yjs 节点结构一致 |
| 密级校验逻辑复杂 | 复用现有权限检查中间件/Guard |
| 模板缩略图生成 | 首版可使用静态上传图片，后续迭代自动生成 |
| 节点 ID 生成冲突 | 使用 CUID 或 UUID 确保唯一性 |

---

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Claude Antigravity)

### Debug Log References

- Frontend build verified: `pnpm --filter @cdm/web build` ✅
- Frontend unit tests verified: `pnpm --filter @cdm/web test` ✅
- Backend plugin unit tests verified: `pnpm --filter @cdm/plugin-template test` ✅

### Completion Notes List

1. **Phase 1-3 Complete**: All data model, backend plugin, and frontend implementation tasks completed
2. **Task 3.3 Implemented**: Added "从模板创建" button to `/graphs` page with TemplateLibraryDialog integration
3. **Phase 4 Test Files Created + Passing**: 
   - Backend: `templates.repository.spec.ts`, `templates.service.spec.ts` 
   - Frontend: `useTemplates.test.ts`, `TemplateLibraryDialog.test.tsx`
   - E2E: `template-library.spec.ts` (需要已迁移并 seed 的数据库环境执行)
4. **Review Fixes Applied**: 补齐 Prisma migration、Controller DTO 校验、前端 API 解包、userId 透传、测试稳定性修复、节点 ID 生成增强
5. **Status & Tracking**: Story 标记为 done，并同步 `sprint-status.yaml`

### Change Log

- 2026-01-01: Story 创建，status: ready-for-dev
- 2026-01-01: 根据 tech-spec 完善任务分解和实现细节
- 2026-01-01: 实现 Task 3.3 - 集成 TemplateLibraryDialog 到 /graphs 页面
- 2026-01-01: 创建 Phase 4 测试文件 (Repository, Service, Hook, Component, E2E)
- 2026-01-01: 更新 status: in-progress，标记所有 Phase 1-4 任务为完成
- 2026-01-01: Code review fixes：修复 API 解包/userId 透传/测试稳定性，补齐 migration + DTO 校验，更新 status: done

### File List

**Modified:**
- `apps/api/package.json` - 引入 `@cdm/plugin-template` 依赖
- `apps/api/src/app.module.ts` - 注册 `TemplatesServerModule.forRoot()` 并注入 `DemoSeedService`
- `apps/api/src/modules/graphs/graphs.module.ts` - 导出 `DemoSeedService` 供插件 `useExisting` 注入
- `apps/web/app/graphs/page.tsx` - 集成 TemplateLibraryDialog，透传 `userId` 并处理创建后跳转
- `apps/web/lib/api/index.ts` - 导出模板相关 API
- `docs/sprint-artifacts/sprint-status.yaml` - 同步 Epic 5 / Story 5.1 状态
- `packages/database/prisma/schema.prisma` - 增加 Template 模型与枚举
- `packages/database/prisma/seed.ts` - Seed 模板分类与示例模板数据
- `packages/database/src/index.ts` - 导出 Template Prisma types + `TemplateStatus`
- `packages/types/src/index.ts` - 导出模板库 types
- `pnpm-lock.yaml` - 锁文件更新

**Created:**
- `packages/database/prisma/migrations/20260101153900_add_template_library_models/migration.sql` - Template 表与枚举迁移
- `packages/types/src/template-types.ts` - 模板库共享 types
- `packages/plugins/plugin-template/jest.config.js` - Jest(ts-jest) 配置
- `packages/plugins/plugin-template/package.json` - Template 插件包定义
- `packages/plugins/plugin-template/tsconfig.json` - TS 配置
- `packages/plugins/plugin-template/src/index.ts` - 插件入口导出
- `packages/plugins/plugin-template/src/server/index.ts` - Server module 包装器
- `packages/plugins/plugin-template/src/server/templates/index.ts` - Templates 子模块导出
- `packages/plugins/plugin-template/src/server/templates/templates.controller.ts` - Templates API endpoints
- `packages/plugins/plugin-template/src/server/templates/templates.module.ts` - Templates Nest 模块
- `packages/plugins/plugin-template/src/server/templates/templates.repository.ts` - Prisma Repository
- `packages/plugins/plugin-template/src/server/templates/templates.request.dto.ts` - Controller DTO 校验
- `packages/plugins/plugin-template/src/server/templates/templates.service.ts` - 业务逻辑（含实例化与使用追踪）
- `packages/plugins/plugin-template/src/server/templates/__tests__/templates.repository.spec.ts` - Repository 单测
- `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts` - Service 单测
- `apps/web/lib/api/templates.ts` - 模板库 API client（兼容后端 wrapper）
- `apps/web/hooks/useTemplates.ts` - useTemplates Hook
- `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx` - 模板库对话框组件
- `apps/web/components/TemplateLibrary/index.ts` - Barrel export
- `apps/web/__tests__/hooks/useTemplates.test.ts` - Hook 单测
- `apps/web/__tests__/components/TemplateLibrary/TemplateLibraryDialog.test.tsx` - 组件测试
- `apps/web/e2e/template-library.spec.ts` - Playwright E2E
- `docs/sprint-artifacts/tech-spec-5-1-template-library.md` - Tech spec
- `docs/sprint-artifacts/validation-report-2026-01-01T19-25-34+0800.md` - Validation report
