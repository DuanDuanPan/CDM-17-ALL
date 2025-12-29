# Story 7.1: 后端 Repository 模式重构

## 1. Background

在当前的后端实现中，`AttachmentsController` 和 `CollabService` 违反了架构规范，直接调用了 `prisma.*` 进行数据库操作。这导致了以下问题：
1.  **违反架构设计**: 与 `architecture.md` 中定义的 Repository Layer 分层不符。
2.  **测试困难**: 无法在不连接真实数据库的情况下对 Service 进行单元测试（无法 Mock 数据层）。
3.  **耦合度高**: 业务逻辑与底层 ORM 紧密耦合，数据访问逻辑无法复用。

本 Story 旨在通过引入 Repository 层来解耦业务逻辑与数据访问，强制执行架构规范。

### 与整体重构规划的对照

本 Story 对应 `docs/analysis/refactoring-proposal-2025-12-28.md` 第一阶段 (止血与核心规范强防) 中的 **1.1 强制 Repository 模式 (Backend)**：

| 规划任务 | 优先级 | 本 Story 覆盖 |
|:---------|:------:|:-------------|
| 修复 `attachments.controller.ts` 4 处 Prisma 调用 | P0 | ✅ Task 5.2.3 |
| 为 `CollabService` 引入 `GraphRepository` (Line 107, 319) | P1 | ✅ Task 5.3.1, 5.3.4 |
| 为 `CollabService` 处理 `prisma.node.upsert` (Line 371) | P1 | ✅ Task 5.3.2, 5.3.4 |
| 添加 ESLint 规则禁止业务层导入 prisma | P2 | ✅ Task 5.1.2, 5.4.6 |

**预估工时对照**：
- 规划预估：P0 (0.5天) + P1 (1.5天) + P2 (0.5天) = **2.5 人天**
- 本 Story 预估：**2-3 人天** (含测试)

---

## 2. Requirements

### Must Have
- [ ] 创建 `AttachmentsRepository` 并重构 `AttachmentsController`。
- [ ] 创建 `GraphRepository` 并重构 `CollabService` 中的 `prisma.graph.*` 调用。
- [ ] 扩展现有 `NodeRepository` 并重构 `CollabService` 中的 `prisma.node.upsert` 调用。
- [ ] 确保重构后的功能（附件上传/下载、文档协作同步）行为与原版完全一致。
- [ ] 添加 ESLint 规则，禁止在 `*.controller.ts` 和 `*.service.ts` 中导入 `@cdm/database` 的 `prisma` 对象（仅允许 Repository 文件导入）。

### Should Have
- [ ] 为新的 Repository 类添加单元测试。
- [ ] 验证回归测试（现有 API 测试应直接通过）。

---

## 3. File Change Manifest

### 3.1 待创建文件 (CREATE)

| 文件路径 | 用途 |
|---------|------|
| `apps/api/src/modules/comments/attachments.repository.ts` | 附件数据访问层 |
| `apps/api/src/modules/graphs/graph.repository.ts` | 图数据访问层 |
| `apps/api/src/modules/graphs/graphs.module.ts` | 图模块定义（当前不存在） |

### 3.2 待修改文件 (MODIFY)

| 文件路径 | 修改内容 |
|---------|---------|
| `apps/api/src/modules/comments/attachments.controller.ts` | 注入 Repository，移除 4 处直接 prisma 调用 |
| `apps/api/src/modules/comments/comments.module.ts` | 注册 `AttachmentsRepository` Provider |
| `apps/api/src/modules/collab/collab.service.ts` | 注入 Repositories，移除 prisma.graph 和 prisma.node 调用 |
| `apps/api/src/modules/collab/collab.module.ts` | 导入 `GraphsModule`，注入 `NodeRepository` |
| `apps/api/src/modules/nodes/repositories/node.repository.ts` | 添加 `upsertBatch()` 方法 |
| `apps/api/eslint.config.mjs` | 添加限制 `@cdm/database` 导入的规则 |

---

## 4. Technical Design

> **🔧 模式参考**: 请参考现有实现 `apps/api/src/modules/nodes/repositories/node.repository.ts` 作为 Repository 设计模板。
> 关键模式：`@Injectable()` 装饰器、从 `@cdm/database` 导入 `prisma` 单例、类型化返回值。

### 4.1 AttachmentsRepository

**位置**: `apps/api/src/modules/comments/attachments.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { prisma, type CommentAttachment, type Prisma } from '@cdm/database';

@Injectable()
export class AttachmentsRepository {
  async create(data: Prisma.CommentAttachmentCreateInput): Promise<CommentAttachment> {
    return prisma.commentAttachment.create({ data });
  }

  async findUnique(where: Prisma.CommentAttachmentWhereUniqueInput): Promise<CommentAttachment | null> {
    return prisma.commentAttachment.findUnique({ where });
  }

  async delete(where: Prisma.CommentAttachmentWhereUniqueInput): Promise<CommentAttachment> {
    return prisma.commentAttachment.delete({ where });
  }
}
```

**模块注册** (`comments.module.ts`):
```typescript
@Module({
  providers: [AttachmentsRepository, ...],
  controllers: [AttachmentsController],
  exports: [AttachmentsRepository], // 可选：如果其他模块需要
})
export class CommentsModule {}
```

### 4.2 GraphRepository

**位置**: `apps/api/src/modules/graphs/graph.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { prisma, type Graph, type Prisma } from '@cdm/database';

@Injectable()
export class GraphRepository {
  /**
   * 对应 collab.service.ts Line 107: prisma.graph.findUnique with includes
   */
  async findGraphWithRelations(graphId: string) {
    return prisma.graph.findUnique({
      where: { id: graphId },
      include: {
        nodes: {
          include: {
            taskProps: true,
            requirementProps: true,
            pbsProps: true,
            dataProps: true,
            appProps: true, // Story 2.9 添加的 APP 节点属性
          },
        },
        edges: true,
      },
    });
  }

  /**
   * 对应 collab.service.ts Line 319: prisma.graph.update for yjsState
   */
  async updateYjsState(graphId: string, yjsState: Buffer): Promise<Graph> {
    return prisma.graph.update({
      where: { id: graphId },
      data: { yjsState },
    });
  }
}
```

**新建模块** (`graphs.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { GraphRepository } from './graph.repository';

@Module({
  providers: [GraphRepository],
  exports: [GraphRepository],
})
export class GraphsModule {}
```

### 4.3 NodeRepository 扩展 (批量 Upsert)

**位置**: `apps/api/src/modules/nodes/repositories/node.repository.ts` (扩展现有文件)

```typescript
// 添加到现有 NodeRepository 类中

export interface NodeUpsertData {
  id: string;
  label: string;
  graphId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  creatorName: string;
  description: string | null;
  tags: string[];
  isArchived: boolean;
}

/**
 * Story 7.1: 批量 Upsert 节点
 * 对应 collab.service.ts Line 370-402: 从 Yjs 同步节点到数据库
 * 使用事务保证原子性
 */
async upsertBatch(nodes: NodeUpsertData[]): Promise<void> {
  if (nodes.length === 0) return;
  
  await prisma.$transaction(
    nodes.map(node =>
      prisma.node.upsert({
        where: { id: node.id },
        create: {
          id: node.id,
          label: node.label,
          graphId: node.graphId,
          type: node.type as NodeType,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          parentId: node.parentId,
          creatorName: node.creatorName,
          description: node.description,
          tags: node.tags,
          isArchived: node.isArchived,
        },
        update: {
          label: node.label,
          type: node.type as NodeType,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          parentId: node.parentId,
          creatorName: node.creatorName,
          description: node.description,
          tags: node.tags,
          isArchived: node.isArchived,
        },
      })
    )
  );
}
```

> **⚡ 性能说明**: 使用 `prisma.$transaction()` 将多个 upsert 操作合并为单个事务，保证原子性并提高性能。

### 4.4 ESLint Configuration

**位置**: `apps/api/eslint.config.mjs`

```javascript
// 添加到现有配置中
{
  rules: {
    'no-restricted-imports': [
      'warn', // 初始设为 warning，重构完成后改为 error
      {
        patterns: [
          {
            group: ['@cdm/database'],
            importNames: ['prisma'],
            message: '禁止在 Service/Controller 中直接使用 prisma。请使用 Repository 层。',
          }
        ],
      },
    ],
  },
  // 仅应用于 service 和 controller 文件
  files: ['**/*.service.ts', '**/*.controller.ts'],
  // 排除 repository 文件
  ignores: ['**/*.repository.ts'],
}
```

---

## 5. Implementation Tasks

### 5.1 Setup & Config
- [x] **Task 5.1.1**: 创建 `apps/api/src/modules/graphs/graphs.module.ts` 模块文件 *(已存在，更新导出)*
- [x] **Task 5.1.2**: 更新 ESLint 配置，添加禁止直接导入 `prisma` 的规则（设为 warning）

### 5.2 Attachments Module Refactor
- [x] **Task 5.2.1**: 创建 `AttachmentsRepository` 类
- [x] **Task 5.2.2**: 在 `CommentsModule` 中注册 `AttachmentsRepository` 为 Provider
- [x] **Task 5.2.3**: 重构 `AttachmentsController`：
  - 构造函数注入 `AttachmentsRepository`
  - 替换 Line 117 (`prisma.commentAttachment.create`)
  - 替换 Line 151 (`prisma.commentAttachment.findUnique`)
  - 替换 Line 195 (`prisma.commentAttachment.findUnique`)
  - 替换 Line 215 (`prisma.commentAttachment.delete`)

### 5.3 Graph & Node Repository Refactor
- [x] **Task 5.3.1**: 创建 `GraphRepository` 类
- [x] **Task 5.3.2**: 扩展 `NodeRepository`，添加 `upsertBatch()` 方法
- [x] **Task 5.3.3**: 在 `CollabModule` 中：
  - 导入 `GraphsModule`
  - 导入 `NodesModule`（如果尚未导入）
- [x] **Task 5.3.3.1**: 验证 `NodesModule` 已导出 `NodeRepository`：
  ```typescript
  // nodes.module.ts 应包含：
  @Module({
    providers: [NodeRepository, ...],
    exports: [NodeRepository], // 确保导出
  })
  ```
- [x] **Task 5.3.4**: 重构 `CollabService`：
  - 构造函数注入 `GraphRepository` 和 `NodeRepository`
  - 替换 Line 107 (`prisma.graph.findUnique`) → `graphRepository.findGraphWithRelations()`
  - 替换 Line 319 (`prisma.graph.update`) → `graphRepository.updateYjsState()`
  - 替换 Line 370-402 (多个 `prisma.node.upsert`) → `nodeRepository.upsertBatch()`

### 5.4 Verification & Testing
- [x] **Task 5.4.1**: 运行 `pnpm lint` 确保无新增违规引用 *(通过，7 warnings 来自范围外文件)*
- [x] **Task 5.4.2**: 编写 `AttachmentsRepository` 单元测试 *(2025-12-29 完成，9 tests)*
- [x] **Task 5.4.3**: 编写 `GraphRepository` 单元测试（Mock prisma）*(2025-12-29 完成，8 tests)*
- [x] **Task 5.4.3.1**: 编写 `NodeRepository.upsertBatch` 单元测试 *(2025-12-29 完成，16 tests)*
- [x] **Task 5.4.4**: 手动测试附件上传、下载、删除功能 *(2025-12-29 用户验证通过)*
- [x] **Task 5.4.5**: 手动测试多人协作时的文档加载和保存功能 *(2025-12-29 用户验证通过)*
- [ ] **Task 5.4.6**: 将 ESLint 规则从 `warn` 改为 `error` *(延后 - 等待 Story 7.2 完成其他服务重构)*

> **Note**: Task 5.4.6 保持 `warn` 级别，因为范围外的 Services 仍有违规。将在后续 Story 中处理。

---

## 6. QA Plan

### 6.1 Manual Testing Matrix

| Feature | Action | Expected Result | 验收标准映射 |
|:--------|:-------|:----------------|:------------|
| **Attachments** | 上传文件 | 文件成功保存，返回正确的 URL 和 ID | Task 5.2.3 |
| **Attachments** | 下载/预览文件 | 文件内容正确加载，Content-Type 正确 | Task 5.2.3 |
| **Attachments** | 删除文件 | 数据库记录被删除，磁盘文件被删除 | Task 5.2.3 |
| **Collaboration** | 打开脑图 | Yjs 状态正确从 DB 加载（或从 Node 表初始化） | Task 5.3.4 |
| **Collaboration** | 编辑并保存 | 变更被持久化到 Graph 表的 `yjsState` | Task 5.3.4 |
| **Collaboration** | 节点批量同步 | Node 表正确更新，事务无部分失败 | Task 5.3.2 |

### 6.2 Automated Testing

| 测试类型 | 覆盖范围 | 要求 |
|:--------|:--------|:----|
| **单元测试** | `AttachmentsRepository` | Mock prisma，验证 CRUD 方法调用 |
| **单元测试** | `GraphRepository` | Mock prisma，验证 findGraphWithRelations 和 updateYjsState |
| **单元测试** | `NodeRepository.upsertBatch` | Mock prisma.$transaction，验证批量操作 |
| **回归测试** | 现有 API 测试 | 无需修改，应直接通过 |

### 6.3 测试 Mock 策略

```typescript
// 示例：AttachmentsRepository 单元测试
import { Test } from '@nestjs/testing';
import { AttachmentsRepository } from './attachments.repository';

// Mock prisma module
jest.mock('@cdm/database', () => ({
  prisma: {
    commentAttachment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('AttachmentsRepository', () => {
  let repository: AttachmentsRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AttachmentsRepository],
    }).compile();
    repository = module.get(AttachmentsRepository);
  });

  it('should create attachment', async () => {
    // ... test implementation
  });
});
```

---

## 7. Risk & Rollback Strategy

### 7.1 潜在风险

| 风险 | 影响 | 可能性 | 缓解措施 |
|:-----|:-----|:-------|:---------|
| **CollabService 重构导致实时同步中断** | 🔴 高 | 🟡 中 | 分步重构：先完成 Attachments，验证通过后再处理 Collab |
| **事务批量操作性能问题** | 🟡 中 | 🟢 低 | 监控大图（>100 节点）的同步时间 |
| **ESLint 规则误伤合法导入** | 🟢 低 | 🟢 低 | 初始设为 warning，确认无误后改为 error |

### 7.2 回滚策略

1. **版本控制回滚**:
   - 所有改动在单独分支 `feature/story-7.1-repository-refactor`
   - 如发现严重问题，可直接 revert 整个 PR

2. **分步验证**:
   - Step 1: 完成 AttachmentsRepository 并验证
   - Step 2: 完成 GraphRepository 并验证
   - Step 3: 完成 NodeRepository.upsertBatch 并验证
   - 每步验证通过后再进入下一步

3. **无数据库迁移**:
   - 本 Story 不涉及 Schema 变更
   - 无需回滚数据库 migrations

---

## 8. Definition of Done

- [x] `AttachmentsController` 中无 `prisma.*` 直接调用
- [x] `CollabService` 中无 `prisma.graph.*` 和 `prisma.node.*` 直接调用
- [x] 新增 `AttachmentsRepository`、`GraphRepository` 类
- [x] `NodeRepository` 包含 `upsertBatch()` 方法
- [x] `GraphsModule` 已创建并导出 `GraphRepository`
- [ ] ESLint 规则已添加且设为 `error` 级别 *(延后 - 当前为 warn，待 Story 7.2)*
- [x] 所有手动测试用例通过 *(2025-12-29 用户验证)*
- [x] 单元测试覆盖率 >= 80% (新增 Repository) *(33 tests added, 142 total)*
- [x] 无回归（现有功能行为一致）*(109 tests pass)*

---

## 9. Dev Notes (实现时更新)

_此区域在开发过程中记录重要发现、问题和解决方案_

### 9.1 学习与发现
- [x] **ESLint Flat Config**: ESLint 9 使用新的 flat config 格式，`no-restricted-imports` 规则语法与 legacy 配置不同
- [x] **Prisma Buffer 类型**: `Graph.yjsState` 字段使用 `Bytes` 类型，Prisma 返回 `Buffer`，但 TypeScript 严格模式下 `Buffer` 不直接兼容 `Uint8Array`
- [x] **模块循环依赖**: NestJS 模块导入需要注意循环依赖，使用 `forwardRef()` 可解决但应尽量避免

### 9.2 遇到的问题与解决方案
- [x] **TypeScript Buffer 类型错误**
  - 问题: `Type 'Buffer<ArrayBufferLike>' is not assignable to type 'Uint8Array<ArrayBuffer>'`
  - 解决: 使用 `as any` 类型断言绕过 Prisma 内部类型检查
  - 位置: `graph.repository.ts:60`
- [x] **CollabService 测试失败**
  - 问题: 测试中缺少 `GraphRepository` 和 `NodeRepository` mock provider
  - 解决: 在 `collab.service.spec.ts` 中添加 mock 对象
- [x] **CommentItem 下载认证**
  - 问题: 手动测试时发现附件下载缺少认证头
  - 解决: 在 `CommentItem.tsx` 下载处理器中添加 `x-user-id` header

### 9.3 后续技术债务
- [ ] 考虑创建 `BaseRepository<T>` 抽象类减少重复代码
- [ ] 评估是否需要将 prisma 单例改为 `PrismaService` 注入模式
- [ ] **Task 5.4.6**: ESLint 规则升级为 `error` (待 Story 7.2)

### 9.4 实现统计
- **完成日期**: 2025-12-29
- **新增文件**: 7 (3 repositories + 3 test files + 1 story file)
- **修改文件**: 13
- **代码变更**: +1700 行 (含测试)
- **测试状态**: 142 tests passing (+33 new repository tests)
