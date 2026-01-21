# CDM-17 代码重构提案 (2026-01-20)

> **版本**: v2.0  
> **日期**: 2026-01-20  
> **基于**: 架构文档审查 + 代码库深度分析 + 讨论结论

---

## 目录

1. [概述](#1-概述)
2. [上次重构成效回顾](#2-上次重构成效回顾)
3. [技术债务分析](#3-技术债务分析)
4. [插件化架构原则](#4-插件化架构原则)
5. [文件处理统一化](#5-文件处理统一化)
6. [重构行动计划](#6-重构行动计划)
7. [风险评估与缓解](#7-风险评估与缓解)
8. [验收标准](#8-验收标准)

---

## 1. 概述

### 1.1 背景

经过对当前代码库的深度分析，结合 `architecture.md` 和 `project-context.md` 中定义的架构规范，本提案旨在：

1. **识别并清理技术债务** - 明确 ESLint 警告、Repository 模式违规等问题
2. **明确插件化边界** - 定义什么应该是插件 vs 什么应该是内核
3. **统一文件处理能力** - 创建统一的上传/下载/预览服务

### 1.2 关键结论

| 领域 | 结论 |
|------|------|
| **插件化** | 非"一切皆插件"，核心基础设施（collab/graphs/users）应保留内核 |
| **待插件化模块** | subscriptions, data-management, product-library, knowledge-library, app-library |
| **保留内核模块** | collab, graphs, users, file, plugin-kernel |
| **文件处理** | 3 个独立实现 → 统一为 FileStorageModule |

---

## 2. 上次重构成效回顾

### 2.1 Epic 7 完成度

Epic 7 (架构重构与技术债偿还) 已推进 **8 个 Story**（其中 7.5 仍在进行中），显著改善代码质量：

| Story | 状态 | 成果 |
|-------|------|------|
| 7.1 Backend Repository Pattern | ✅ 完成 | 创建 `AttachmentsRepository`, `GraphRepository`, 扩展 `NodeRepository.upsertBatch()` |
| 7.2 Frontend Hook-First Pattern | ✅ 完成 | 提取 `useApproval`, `useTaskDispatch` hooks |
| 7.3 UI Atomic Components | ✅ 完成 | `packages/ui` 基础组件库 |
| 7.4 God Class Splitting Phase 2 | ✅ 完成 | 拆分大型组件 |
| 7.5 Plugin Migration Phase 3 | 🟡 进行中 | 已迁移 5 个插件 |
| 7.7 ProductSearchDialog Splitting | ✅ 完成 | 948 行 → 拆分 |
| 7.8 RightSidebar Splitting | ✅ 完成 | 693 行 → 按面板拆分 |
| 7.9 ApprovalStatusPanel Splitting | ✅ 完成 | 685 行 → 拆分 |

### 2.2 核心文件行数改善

| 文件 | 重构前 | 重构后 | 改进 | 状态 |
|------|--------|--------|------|------|
| `GraphComponent.tsx` | 1,360 行 | **590 行** | -57% | 🟡 接近目标 |
| `MindNode.tsx` | 956 行 | **376 行** | -61% | ✅ 达标 |
| `useClipboard.ts` | 962 行 | **222 行** | -77% | ✅ 达标 |

---

## 3. 技术债务分析

### 3.1 分类概览

| 类别 | 数量 | 优先级 | 状态 |
|------|------|--------|------|
| Repository 模式违规 | 3 个 Service（listener/插件允许例外） | 🔴 P0 | 待修复 |
| TypeScript any 类型 | ~74 处 | 🟡 P2 | 待修复 |
| 未使用变量 | ~17 处 | 🟢 P3 | 待修复 |
| 超大文件 (>300行) | 2-3 个 | 🟡 P2 | 监控中 |

### 3.2 Repository 模式违规详细

ESLint 检测到仍有 **3 个 Service** 直接导入 prisma，违反 Repository 模式（listener/插件暂时允许例外）：

```
apps/api/src/modules/
├── graphs/graphs.service.ts          ❌ 直接使用 prisma
├── subscriptions/
│   ├── subscriptions.service.ts      ❌ 直接使用 prisma
│   └── subscription.listener.ts      🟡 Listener，允许例外（可后续再收敛）
├── users/users.service.ts            ❌ 直接使用 prisma
└── demo/demo-seed.service.ts         🟡 Demo 代码，可接受
```

**推荐修复方案**:

| 文件 | 行动 | 工作量 |
|------|------|--------|
| `graphs.service.ts` | 使用现有 `GraphRepository` | ~0.5 天 |
| `users.service.ts` | 创建 `UsersRepository` | ~1 天 |
| `subscriptions.service.ts` | 先迁移到 `plugin-subscriptions`，迁移后再统一依赖/数据访问方式 | ~2 天 |

### 3.3 遗留问题 (从 Story 7.1 继承)

| 问题 | 描述 | 状态 |
|------|------|------|
| ESLint 规则升级 | 从 `warn` → `error` | 待实施 |
| IDOR 安全问题 | 附件下载缺少授权校验 | 延后 |
| BaseRepository 抽象 | 考虑创建通用基类 | 待评估 |

---

## 4. 插件化架构原则

### 4.1 核心判定标准

基于 NocoBase 架构和项目实践，定义 **5 个维度** 判断模块是否应该插件化：

| 维度 | 应该是插件 ✅ | 应该是内核 ❌ |
|------|--------------|--------------|
| **业务独立性** | 可独立理解的业务域 | 核心基础设施/通用服务 |
| **生命周期管理** | 需要安装/启用/禁用/卸载 | 始终运行，不可禁用 |
| **可选性** | 功能可被关闭不影响系统运行 | 系统运行的必要组件 |
| **边界清晰** | 有清晰的 API 边界 | 被多模块深度依赖 |
| **自包含** | 包含自己的数据模型、服务、UI | 仅提供接口/抽象 |

### 4.2 决策流程图

```
                           ┌─────────────────────────┐
                           │   这个模块能被禁用吗？    │
                           └───────────┬─────────────┘
                                       │
                          ┌────────────┴────────────┐
                          ↓                         ↓
                         YES                       NO
                          │                         │
                          ↓                         ↓
              ┌───────────────────┐      ┌───────────────────┐
              │ 它有独立业务价值吗？│      │   它是基础设施吗？  │
              └─────────┬─────────┘      └─────────┬─────────┘
                        │                          │
               ┌────────┴────────┐        ┌────────┴────────┐
               ↓                 ↓        ↓                 ↓
              YES               NO       YES               NO
               │                 │        │                 │
               ↓                 ↓        ↓                 ↓
        ┌───────────┐    ┌───────────┐  ┌───────────┐   ┌───────────┐
        │  插件 ✅   │    │   工具库   │  │  内核 ⚙️  │   │  需拆分   │
        └───────────┘    └───────────┘  └───────────┘   └───────────┘
```

### 4.3 模块分类结果

#### ✅ 已正确迁移为插件 (5 个)

| 插件 | 位置 | 业务域 |
|------|------|--------|
| `plugin-mindmap-core` | `packages/plugins/` | 节点/边 CRUD |
| `plugin-workflow-approval` | `packages/plugins/` | 审批工作流 |
| `plugin-comments` | `packages/plugins/` | 评论系统 |
| `plugin-template` | `packages/plugins/` | 模板库 |
| `plugin-layout` | `packages/plugins/` | 布局算法 |

#### ⚙️ 应保留为内核 (5 个)

| 模块 | 位置 | 理由 |
|------|------|------|
| `collab` | `apps/api/src/modules/` | Yjs 同步核心，不可禁用 |
| `graphs` | `apps/api/src/modules/` | 图谱基础数据模型 |
| `users` | `apps/api/src/modules/` | 认证基础设施 |
| `file` → `file-storage` | `apps/api/src/modules/` | 统一文件存储基础设施 |
| `plugin-kernel` | `apps/api/src/modules/` | 插件依赖注入基础 |

#### ⚠️ 可迁移为插件 (5 个)

| 模块 | 当前位置 | 优先级 | 理由 |
|------|----------|--------|------|
| `subscriptions` | `apps/api/src/modules/` | 🟢 P1 | 边界清晰，可选功能 |
| `data-management` | `apps/api/src/modules/` | 🟢 P1 | 独立业务域 |
| `product-library` | `apps/api/src/modules/` | 🟡 P2 | 小模块，Mock 实现 |
| `knowledge-library` | `apps/api/src/modules/` | 🟡 P2 | 小模块，Mock 实现 |
| `app-library` | `apps/api/src/modules/` | 🟡 P2 | 应用执行 |

---

## 5. 文件处理统一化

### 5.1 现状分析

当前存在 **3 个独立的文件处理实现**：

| 模块 | 用途 | 存储 | 问题 |
|------|------|------|------|
| `FileService` | 审批交付物 | 磁盘 + 内存 Map | 元数据重启丢失 |
| `DataAssetService` | 数据资源 | 复用 FileService + Prisma | 有耦合 |
| `AttachmentsController` | 评论附件 | 磁盘 + Prisma | IDOR 风险 |

**重复功能**:
- ✗ 文件上传 (3 处)
- ✗ 文件存储路径生成 (3 处)
- ✗ 文件类型验证 (不一致)
- ✗ UTF-8 文件名解码（实现不一致：FileService / Comments Attachments）
- ✗ 文件删除 (3 处)

**缺失能力**:
- ❌ 统一预览接口
- ❌ 缩略图生成
- ❌ 存储抽象层 (无法切换云存储)
- ❌ 统一权限检查

### 5.2 目标架构

```
┌────────────────────────────────────────────────────────────────────┐
│                Unified File Storage Module                          │
│              (apps/api/src/modules/file-storage)                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    FileStorageService                       │    │
│  │  • upload(file, options)    → FileRecord                    │    │
│  │  • download(fileId)         → Buffer + Metadata             │    │
│  │  • delete(fileId)           → void                          │    │
│  │  • getUrl(fileId, type)     → previewUrl | downloadUrl      │    │
│  │  • generateThumbnail()      → thumbnailUrl                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   StorageAdapter (Interface)                │    │
│  │  • write(path, buffer)     → void                           │    │
│  │  • read(path)              → Buffer                         │    │
│  │  • delete(path)            → void                           │    │
│  │  • getSignedUrl(path)      → string (云存储)                 │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  Implementations:                                           │    │
│  │  ├── LocalDiskAdapter (当前)                                │    │
│  │  ├── S3Adapter (未来)                                       │    │
│  │  └── MinIOAdapter (未来)                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ 被以下模块使用
                                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Approval Module │  │  DataAsset Module│  │  Comments Plugin │
│  (审批交付物)     │  │  (数据资源)       │  │  (评论附件)       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 5.3 统一 API 设计

```bash
# 上传
POST   /api/files/upload
       Body: multipart/form-data (file)
       Query: ?graphId=xxx&ownerType=DATA_ASSET&ownerId=xxx

# 下载
GET    /api/files/:id/download

# 预览 (内联显示)
GET    /api/files/:id/preview

# 缩略图
GET    /api/files/:id/thumbnail?w=200&h=200

# 元数据
GET    /api/files/:id/metadata

# 删除
DELETE /api/files/:id
```

### 5.4 数据模型

```prisma
model FileRecord {
  id            String        @id @default(uuid())
  graphId       String
  graph         Graph         @relation(fields: [graphId], references: [id], onDelete: Cascade)
  originalName  String        // 原始文件名 (UTF-8)
  storedName    String        // 存储文件名
  mimeType      String
  size          Int
  storagePath   String
  storageType   StorageType   @default(LOCAL)
  thumbnailPath String?
  previewable   Boolean       @default(false)
  ownerType     FileOwnerType
  ownerId       String?
  uploadedBy    String?
  createdAt     DateTime      @default(now())
  deletedAt     DateTime?

  @@index([graphId])
  @@index([ownerType, ownerId])
}

enum StorageType { LOCAL, S3, MINIO }
enum FileOwnerType { DELIVERABLE, DATA_ASSET, ATTACHMENT, TEMPLATE }
```

---

## 6. 重构行动计划

### 6.1 总体时间线

```
Week 1                    Week 2                    Week 3
├──────────────────────────┼──────────────────────────┼─────────────────────┤
│  Phase 1: Repository     │  Phase 2: File Storage   │  Phase 3: Plugin    │
│  模式修复 + ESLint       │  统一化                   │  迁移 + 清理        │
│  (4 天)                  │  (6 天)                   │  (5 天)             │
└──────────────────────────┴──────────────────────────┴─────────────────────┘
```

### 6.2 Phase 1: Repository 模式修复 (4 天)

#### 任务清单

| 任务 | 工作量 | 优先级 |
|------|--------|--------|
| 重构 `graphs.service.ts` 使用 `GraphRepository` | 0.5 天 | P0 |
| 创建 `UsersRepository` 并重构 `users.service.ts` | 1 天 | P0 |
| 清理未使用变量 (~17 处) | 0.5 天 | P3 |
| ESLint 规则从 `warn` 升级到 `error` | 0.5 天 | P1 |
| 修复测试文件中的 `any` 类型 (前 20 处) | 0.5 天 | P2 |

#### 验证标准

- [ ] `pnpm lint` 无 `no-restricted-imports`（允许例外：listener/demo/test/插件代码）
- [ ] `pnpm lint` 无新增 `no-unused-vars` 警告
- [ ] 所有 Service 测试通过

---

### 6.3 Phase 2: 文件存储统一化 (6 天)

#### 阶段 2.1: 创建统一基础设施 (2 天)

| 任务 | 文件 |
|------|------|
| 创建 `FileRecord` Prisma 模型 | `packages/database/prisma/schema.prisma` |
| 创建 `StorageAdapter` 接口 | `apps/api/src/modules/file-storage/adapters/storage-adapter.interface.ts` |
| 实现 `LocalDiskAdapter` | `apps/api/src/modules/file-storage/adapters/local-disk.adapter.ts` |
| 创建 `FileStorageRepository` | `apps/api/src/modules/file-storage/file-storage.repository.ts` |
| 创建 `FileStorageService` | `apps/api/src/modules/file-storage/file-storage.service.ts` |
| 创建 `FileStorageController` | `apps/api/src/modules/file-storage/file-storage.controller.ts` |
| 创建 `FileStorageModule` | `apps/api/src/modules/file-storage/file-storage.module.ts` |

#### 阶段 2.2: 迁移现有实现 (3 天)

| 任务 | 工作量 |
|------|--------|
| 替换 `FileService` (审批交付物) → `FileStorageService` | 1 天 |
| 替换 `DataAssetService` (数据资源) → `FileStorageService` | 1 天 |
| 替换 `AttachmentsController` (评论附件) → `FileStorageService` | 1 天 |

#### 阶段 2.3: 增强能力 (1 天)

| 任务 | 工作量 |
|------|--------|
| 添加缩略图生成 (使用 Sharp) | 0.5 天 |
| 存储路径按 graphId 分层（LocalDiskAdapter） | 0.5 天 |

#### 验证标准

- [ ] 所有文件上传/下载功能正常
- [ ] 无需迁移历史数据（上线前清空 uploads + 相关表/目录）
- [ ] 缩略图可正常生成和访问
- [ ] API 响应格式统一

---

### 6.4 Phase 3: 插件迁移 + 清理 (5 天)

#### 任务清单

| 任务 | 工作量 | 优先级 |
|------|--------|--------|
| 迁移 `subscriptions` 到 `plugin-subscriptions`（迁移后统一依赖/数据访问方式） | 2 天 | P1 |
| 迁移 `data-management` 到 `plugin-data-library` | 2 天 | P1 |
| 删除旧 `FileService` 和冗余代码 | 0.5 天 | P2 |
| 更新文档 | 0.5 天 | P3 |

#### 验证标准

- [ ] 插件可独立启用/禁用
- [ ] 所有功能测试通过
- [ ] 无死代码残留

---

## 7. 风险评估与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **文件接口替换回归** | 🟡 中 | 🔴 高 | 历史数据清空；集中补齐 upload/download/preview 冒烟测试 |
| **Repository 重构回归** | 🟢 低 | 🟡 中 | 重构前补充测试覆盖 |
| **插件迁移破坏 API** | 🟡 中 | 🔴 高 | 允许调整路由；同步更新前端调用并补齐 E2E/冒烟验证 |
| **缩略图生成性能** | 🟡 中 | 🟢 低 | 异步生成，使用队列 |
| **云存储集成延迟** | 🟢 低 | 🟢 低 | LocalDisk 优先，云存储作为后续迭代 |

---

## 8. 验收标准

### 8.1 Phase 1 验收

- [ ] 核心 Service 使用 Repository 模式（允许例外：listener/demo/test/插件代码）
- [ ] `pnpm lint` 无 `no-restricted-imports` 错误
- [ ] 无新增未使用变量警告
- [ ] 测试覆盖率不低于当前水平

### 8.2 Phase 2 验收

- [ ] 统一 `/api/files/*` API 可用
- [ ] 所有文件操作使用 `FileStorageService`
- [ ] 新上传文件可正常访问
- [ ] 缩略图自动生成
- [ ] 无冗余文件处理代码

### 8.3 Phase 3 验收

- [ ] `subscriptions` 模块成功迁移为插件
- [ ] `data-management` 模块成功迁移为插件
- [ ] 插件可独立禁用不影响系统运行
- [ ] 文档更新完成

### 8.4 预期收益

| 指标 | 当前 | 目标 | 改进 |
|------|------|------|------|
| Repository 违规数（核心 Service） | 3 | 0 | -100% |
| 文件处理实现数 | 3 | 1 | -67% |
| 已插件化业务模块 | 5 | 7 | +40% |
| ESLint 警告数 | ~102 | <50 | -50% |
| 文件元数据持久化 | 部分 | 全部 | 100% 可靠 |

---

## 附录

### A. 相关文档

| 文档 | 路径 |
|------|------|
| 架构设计 | `docs/architecture.md` |
| 项目上下文 | `docs/project-context.md` |
| 上次重构提案 | `docs/analysis/refactoring-proposal-2025-12-28.md` |
| Sprint 状态 | `docs/sprint-artifacts/sprint-status.yaml` |

### B. 代码审查清单

新 PR 必须检查：

- [ ] 是否在核心 Service/Controller 中直接调用 `prisma.*`?（允许例外：listener/demo/test/插件代码）
- [ ] 是否使用统一的 `FileStorageService`?
- [ ] 新文件是否超过 300 行?
- [ ] 是否遵循插件化边界原则?

---

_文档版本: v2.0_  
_日期: 2026-01-20_  
_作者: CDM-17 架构组_
