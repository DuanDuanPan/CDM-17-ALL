---
project_name: 'CDM-17-Gemini'
user_name: 'Enjoyjavapan'
date: '2026-01-23'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### 核心技术 (Core)
- **Monorepo**: Turborepo 2.6.0 + pnpm 10.25.0
- **TypeScript**: 5.7.0 (全栈类型共享)
- **Node.js**: >= 22.21.1 (Volta 管理)

### 前端 (Frontend: apps/web)
- **Next.js**: 16.0.7 (App Router)
- **React**: 19.1.0
- **TailwindCSS**: 3.4.17 + Shadcn UI + Magic UI
- **图形引擎**: AntV X6 3.1.2 + @antv/x6-react-shape 3.0.1
- **实时同步**: Yjs 13.6.27 + @hocuspocus/provider 3.4.3
- **状态管理**: Zustand 5.0.9 (轻量级)
- **拖拽**: @dnd-kit/core 6.3.1

### 后端 (Backend: apps/api)
- **NestJS**: 11.1.9 (Modular Monolith 架构)
- **WebSocket**: Socket.io 4.8.1 (Presence) + Hocuspocus Server 3.4.3 (Yjs 同步)
- **数据校验**: Zod 3.24.1 + class-validator 0.14.1

### 数据库 (Database: packages/database)
- **PostgreSQL**: 16+
- **ORM**: Prisma

### 测试 (Testing)
- **前端单元测试**: Vitest 3.2.0 + @testing-library/react 16.3.0
- **后端单元测试**: Jest 29.7.0
- **E2E测试**: Playwright 1.49.0

---

## Critical Implementation Rules

### 语言特定规则 (TypeScript)

#### 类型共享 (Zero-Duplication Rule)
- **禁止**: 在 `apps/web` 或 `apps/api` 中手动定义 `interface User { ... }` 等类型
- **必须**: 从 `@cdm/types` 导入所有共享类型: `import { User } from '@cdm/types'`
- **原因**: 后端 Schema 变更会立即触发前端构建错误，防止运行时崩溃

#### 导入模式 (Import Patterns)
- **禁止**: 使用相对路径跨包导入 (`../../packages/ui`)
- **必须**: 使用 Workspace 别名 (`@cdm/ui`, `@cdm/types`, `@cdm/database`)

#### TypeScript 配置
- **Strict Mode**: 全项目启用 strict 模式
- **Path Aliases**: 使用 `tsconfig.json` 配置的路径别名

#### 错误处理模式
- **后端**: 使用 NestJS Global Exception Filters，统一响应格式 `{ code, message, traceId }`
- **前端**: 使用 try-catch 包装异步操作，配合 Sonner toast 展示错误

#### 异步模式
- **优先使用**: `async/await` 语法
- **避免**: 裸露的 `.then()/.catch()` 链式调用 (除非有特殊需求)

### 框架特定规则 (Framework Rules)

#### React/Next.js 规则

##### Yjs-First 单向数据流 (最关键!)
- **禁止**: UI 组件直接修改本地状态 (`setState(newValue)` 后 `api.save(newValue)`)
- **必须**: 用户操作 → 调用 Yjs `Map.set()` → Hocuspocus 同步 → 后端 Hooks → 所有客户端更新 → React 重渲染
- **原因**: 防止协作编辑中的"脑裂" (split-brain) 问题

##### 组件设计 (Container vs Presentational)
- **Page/Container 组件**: 负责数据编排、布局、Context 注入
- **Presentational 组件**: 纯展示组件，无副作用，通过 Props 接收数据

##### Hook-First 逻辑封装
- **必须**: 将逻辑 (数据获取、权限、分析) 下沉到自定义 hooks
- **示例**: `useGraphData()`, `useDependencies()`, `useMetrics()`

##### 懒加载
- **必须**: 跨视图导航使用 `React.lazy` 或 Next.js Dynamic Imports
- **原因**: 防止初始包体积膨胀

##### 文件大小限制
- **规则**: 超过 300 行的文件必须考虑拆分或附带重构计划

#### NestJS 后端规则

##### Module-Per-Feature
- **必须**: 逻辑封装在 `feature.module.ts` 中
- **示例**: `apps/api/src/modules/workspace/{workspace.controller.ts, workspace.service.ts, workspace.repository.ts}`

##### Controller 极简原则
- **Controller**: 仅做 DTO 验证和调用 Service，**禁止**包含业务逻辑
- **Service**: 只处理业务逻辑，返回 POJOs/Entities，不返回 HTTP Response

##### Repository Pattern
- **禁止**: 在 Service 中直接调用 `prisma.user.findMany`
- **必须**: 注入 `UserRepository` 来封装 Prisma 调用

##### Prisma 最佳实践
- **防止 N+1**: 使用 `include` 或 Fluent API 加载关联
- **软删除**: 使用 Middleware 或 Global Extension 处理 `deletedAt`

##### 重任务处理
- **必须**: 重任务 (导入/导出, AI 生成) 必须卸载到 BullMQ 队列

### 测试规则 (Testing Rules)

#### 测试文件组织
- **Co-location**: 测试文件 (`*.spec.ts`) 和 Stories (`*.stories.tsx`) 放在组件同目录
- **前端测试目录**: `apps/web/__tests__/` (单元测试) + `apps/web/e2e/` (E2E测试)

#### 前端测试 (Vitest)
- **快照测试**: 对逻辑复杂的 hooks/components 使用 Vitest Snapshots
- **UI Kit 回归**: 使用 `/?poc=uikit` 路由 + `apps/web/tests/ui-kit.spec.ts` 快速视觉回归

#### 后端测试 (Jest)
- **单元测试**: Service 测试必须 Mock Repository (绝不触达数据库)
- **E2E 测试**: `test/app.e2e-spec.ts` 连接真实 Dockerized 数据库 (每套测试启停)
- **工厂模式**: 使用 Factory 生成复杂测试数据 fixtures

#### Mock 使用规范
- **前端**: 使用 `vitest` 的 `vi.mock()` 和 `vi.fn()`
- **后端**: 使用 `@nestjs/testing` 的 `Test.createTestingModule` + mock providers

#### 测试边界
- **单元测试**: 测试单个函数/组件的隔离行为
- **集成测试**: 测试模块间的协作
- **E2E 测试**: 测试完整用户流程 (Playwright)

### 代码质量和样式规则 (Code Quality & Style)

#### 项目结构 (Feature-Sliced Design)
- **Feature-First**: 按功能分组，而非按类型
- **示例**: `apps/web/src/features/workspace/{components,hooks,services,views,model}`
- **共享核心**: 
  - 原子/复合 UI 组件 → `packages/ui`
  - 纯函数/格式化器 → `packages/utils`

#### UI 和样式 (TailwindCSS)
- **集中化 UI**: Button, Badge, Card, Input 必须来自 `packages/ui`
- **Utility-First**: 使用 utility classes 组合，**禁止**创建本地 CSS 类如 `.btn`, `.my-card`
- **配置单一来源**: `root/tailwind.config.cjs`
  - `content`: 覆盖 `apps/web` 和 `packages/ui`
  - `theme`: 集中化 Tokens (Colors, Radius, Spacing, Shadows)

#### 命名规范
- **文件命名**: PascalCase (组件), kebab-case (工具函数)
- **组件命名**: PascalCase (e.g., `TaskForm.tsx`, `KnowledgeSearchDialog.tsx`)
- **Hook 命名**: 以 `use` 开头 (e.g., `useGraphData`, `useCollaboration`)
- **常量命名**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_ZOOM_LEVEL`)

#### 入口文件规则
- **禁止**: `apps/web/src/app.tsx` 包含业务逻辑
- **必须**: 仅作为 Router/Bootstrapper (选择 POC/Workspace)

#### Lockfile 管理
- **必须**: `pnpm-lock.yaml` 必须提交到版本控制
- **Pipeline**: `turbo.json` 定义 `build` 依赖于 `lint/test`

### 开发工作流规则 (Workflow Rules)

#### 开发命令
- **启动开发**: `pnpm run dev` (根目录, Turborepo 并行启动 api + web)
- **单独启动后端**: `cd apps/api && pnpm run dev`
- **单独启动前端**: `cd apps/web && pnpm run dev`
- **构建**: `pnpm run build`
- **测试**: `pnpm run test`

#### 数据库操作
- **生成 Prisma Client**: `cd packages/database && pnpm prisma generate`
- **运行迁移**: `cd packages/database && pnpm prisma migrate dev`
- **查看数据库**: `cd packages/database && pnpm prisma studio`

#### 环境变量
- **位置**: 根目录 `.env` 文件
- **模板**: `.env.example` 包含所有必需变量
- **规则**: 绝不提交 `.env` 到版本控制

#### Docker 开发
- **启动数据库**: `docker-compose up -d` (PostgreSQL)
- **文件**: `docker-compose.yml` 在根目录

#### Git 工作流
- **主分支**: `main` (生产就绪代码)
- **开发分支**: `dev` (开发中功能)
- **功能分支**: `feature/<story-id>-<description>`
- **修复分支**: `fix/<issue-id>-<description>`

---

### 文件存储规则 (File Storage Rules)

#### 统一文件存储服务
- **禁止**: 使用旧的 `FileService`（已删除，Epic 10.9）
- **必须**: 使用 `FileStorageService` 进行所有文件操作
- **API 入口**: `/api/files/*`
- **插件使用**: 通过 `FILE_STORAGE_SERVICE` token 注入

#### 上传规则
- 所有上传必须提供 `graphId`
- 文件按 `graphId` 分层存储
- 缩略图自动生成（图片类型）
- 最大文件大小限制: 10MB

#### 存储架构
```
apps/api/src/modules/file-storage/
├── adapters/                    # 存储适配器
│   ├── local-disk.adapter.ts    # 本地磁盘存储
│   └── storage-adapter.interface.ts
├── file-storage.service.ts      # 核心服务
├── file-storage.repository.ts   # 数据访问层
└── thumbnail.service.ts         # 缩略图生成
```

---

### 关键规则 - 必须避免的反模式 (Critical Don't-Miss Rules)

#### 🚨 反模式警告 (Anti-Patterns)

##### 协作编辑反模式
- **禁止**: `setState(newValue)` 后接 `api.save(newValue)`
- **后果**: 造成协作编辑中的"脑裂"，用户看到不一致状态
- **正确做法**: 仅通过 Yjs 修改状态，让同步机制处理持久化

##### 类型重复反模式
- **禁止**: 在业务代码中定义 `interface NodeData { ... }`
- **后果**: 前后端类型不同步，运行时崩溃
- **正确做法**: 从 `@cdm/types` 导入

##### 直接 Prisma 调用反模式
- **禁止**: Service 中直接 `prisma.mindmap.findMany()`
- **后果**: 业务逻辑与数据访问耦合，难以测试
- **正确做法**: 注入 Repository，通过 Repository 访问

#### ⚠️ 边缘情况处理

##### Yjs 文档同步
- **注意**: 首次加载时 Yjs 状态可能为空
- **处理**: 从数据库加载初始数据并应用到 Yjs 文档

##### X6 图形渲染
- **注意**: 节点和边的渲染需要同步完成
- **处理**: 确保 `addNode` 和 `addEdge` 在同一批次执行

#### 🔒 安全规则

##### 敏感数据
- **禁止**: 在前端代码中硬编码 API 密钥或密码
- **禁止**: 在日志中输出用户敏感信息
- **必须**: 通过环境变量管理所有密钥

##### 权限检查
- **必须**: 所有 API 端点必须在 Guards 中验证用户权限
- **必须**: Yjs 文档连接时验证用户对 mindmap 的访问权

#### ⚡ 性能规则

##### 避免 N+1 查询
- **禁止**: 在循环中调用数据库查询
- **必须**: 使用 Prisma `include` 或批量查询

##### 避免大型初始包
- **禁止**: 在首页导入所有功能组件
- **必须**: 使用 dynamic imports 按需加载

---

_文档生成时间: 2025-12-22_
_工作流: generate-project-context_
