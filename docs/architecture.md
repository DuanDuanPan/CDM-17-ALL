---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/prd.md
  - docs/project-brief.md
  - docs/research-milanote.md
  - docs/ux-design-specification.md
workflowType: 'architecture'
lastStep: 0
project_name: 'CDM-17-Gemini'
user_name: 'Enjoyjavapan'
date: '2025-12-15'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
*   **Mind Map as OS:** The core interface is a graph editor where nodes act as diverse business objects (Tasks, Requirements, Approvals).
*   **Real-time Collaboration:** Users must see each other's cursors and updates instantly (<50ms latency ideal).
*   **Execution & Workflow:** Nodes have lifecycle states; changes trigger workflows (e.g., Approval unlocks downstream nodes).

**Non-Functional Requirements:**
*   **High Performance:** Rendering 1k+ nodes at 60fps; effortless zooming/panning.
*   **Security & Compliance:** Granular RBAC (Node-level security); Full audit trails for aerospace/defense scenarios.
*   **Reliability:** "Source of Truth" integrity - zero data loss allowed during sync.

**Scale & Complexity:**
*   Primary domain: **Enterprise Collaborative SaaS (B2B)**
*   Complexity level: **High** (Intersection of Graphics, Real-time Sync, and Workflow Engine).
*   Estimated architectural components: ~15-20 (Graph Engine, Sync Service, Auth, Workflow Engine, Notification, etc.)

### Technical Constraints & Dependencies
*   **Frontend Stack:** React + AntV X6 + TailwindCSS (Mandated by UX Spec).
*   **UX Standard:** Must match "Magic UI" aesthetic while maintaining "Canvas" performance.
*   **Single Source of Truth:** All views (Gantt, List) must be projections of the graph data model.

### Cross-Cutting Concerns Identified
*   **Real-time Synchronization (CRDTs/OT):** Handling concurrent edits on the same node graph.
*   **State Management:** Complex undo/redo stacks across collaborative sessions.
*   **Auditability:** Every mutation must be loggable and reversible.

## Starter Template Evaluation

### Primary Technology Domain
**Full-stack Monorepo Application** (frontend + backend + shared types).

### Starter Options Considered
*   **Separate Repos:** (Next.js repo + NestJS repo). Pro: Simple decoupling. Con: Type duplication (DTOs), sync overhead.
*   **Turborepo Monorepo:** (Next.js + NestJS in one repo). Pro: Shared `types` package, unified CI, one PR for full-stack features.
*   **Nx Monorepo:** Powerful but higher learning curve.

### Selected Starter: Turborepo (Custom Assembly)

**Rationale for Selection:**
Selected **NestJS** as backend (for type sharing) and **Next.js** as frontend (for Shadcn/Magic UI).
A **Turborepo** structure allows us to define shared DTOs (e.g., `NodeDTO`, `GraphSyncEvent`) in a local package, ensuring the Backend and Frontend are always in contract sync - critical for a graphic-heavy app.

**Initialization Command:**

```bash
# Initialize using standard Turborepo starter
npx create-turbo@latest cdm-17-gemini

# Structure adjustment (Manual Step):
# 1. Rename apps/docs -> apps/api (NestJS)
# 2. Re-scaffold apps/web (Next.js + Shadcn)
# 3. Create packages/shared-types
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
*   **TypeScript Monorepo:** End-to-end type safety.
*   **Package Manager:** pnpm (Speed & disk space efficiency).

**Styling Solution:**
*   **Frontend:** TailwindCSS + Shadcn UI + Magic UI (as per UX Spec).

**Backend Stack (New Decision):**
*   **Framework:** **NestJS** (Modular, Enterprise-grade Node.js).
*   **Real-time:** **Socket.io** (Native NestJS Gateway support) for graph sync.
*   **Database:** PostgreSQL + Prisma (Type-safe ORM).

**Code Organization:**
*   `apps/web`: Next.js Client (UI, Canvas, Recoil/Zustand State).
*   `apps/api`: NestJS Server (Business Logic, RBAC, WebSocket Gateway).
*   `packages/types`: Shared pure TS interfaces (DTOs, Enums).
*   `packages/config`: Shared ESLint/TSConfig.

## Core Architectural Decisions

### Decision Priority Analysis
**Critical Decisions (Block Implementation):**
*   **Real-time Engine:** Yjs + Hocuspocus (NestJS Integration).
*   **Database Strategy:** Dual-store (Postgres for Business Data + Binary Blob for Yjs State).
*   **Plugin Architecture (Inspired by NocoBase):** "Everything is a Node Plugin".

**Important Decisions:**
*   **Authentication:** Clerk (Next.js integrated, JWT validated on NestJS).
*   **Deployment:** Dockerized containers (Railway/VPS) to support persistent WebSockets.

### Data Architecture
*   **Primary DB:** **PostgreSQL 16+** (Relational Data).
*   **ORM:** **Prisma** (Single source of truth for schema).
*   **Real-time State:** **Yjs Binary Blobs** stored in Postgres (`bytea` column) + Hocuspocus in-memory cache.
*   **Data-Driven Schema:** Nodes store flexible JSON payloads allowed by their Plugin definition (Separation of UI and Data, NocoBase style).

### Authentication & Security
*   **Auth Provider:** **Clerk** (Production-ready Auth/User Management).
*   **Pattern:** Frontend gets Token from Clerk -> Passes as Bearer to NestJS -> NestJS verifies JWT via Clerk SDK -> Extracts User Context.
*   **RBAC:** Granular logic in NestJS Guards, checking `Node` ownership/permissions before allowing Yjs updates.

### API & Communication Patterns
*   **Hybrid API:**
    *   **HTTP/REST:** For resource creation, listing, complex queries (Prisma).
    *   **WebSocket (Socket.io):** Strictly for Graph Sync (Yjs updates) and Presence (Cursors).

### Backend Architecture (NestJS)
*   **Modular Monolith:**
    *   `AppModule`: Root.
    *   `CollabModule`: Hocuspocus Gateway.
    *   `BusinessModule`: Standard CRUD services.
    *   **Microkernel Pattern:** The core system allows `NodePlugins` to register capabilities dynamically.

### Infrastructure & Deployment
*   **Containerization:** **Docker** (Multi-stage build for Monorepo).
*   **Orchestration:** Docker Compose (Local Dev), Railway/K8s (Production).
*   **Stateful Services:** WebSockets require sticky sessions or single-instance deployment initially.

## NocoBase-Inspired Architecture Patterns

> 基于 NocoBase (v1.9.25) 架构分析，以下模式已纳入 CDM 项目架构规范。

### 1. 微内核插件化架构

**核心理念**: "一切皆插件" (Everything is a Plugin)

所有业务功能必须以插件形式实现，`apps/api` 仅作为 Kernel 提供基础设施。

**完整插件生命周期**:

```typescript
// packages/plugins/plugin-xxx/src/server.ts
export class MyPlugin extends Plugin {
  // 1. 注册阶段
  async beforeLoad() {
    // 注册数据模型 (Collection)
    // 注册数据库迁移
    // 注册字段类型
  }

  // 2. 加载阶段
  async load() {
    // 注册 RESTful 资源
    // 注册中间件
    // 注册事件监听器
    // 注册定时任务
  }

  // 3. 安装阶段 (首次启用时执行一次)
  async install() {
    // 初始化默认数据
    // 创建系统配置
  }

  // 4. 启用后
  async afterEnable() {
    // 启用后的初始化逻辑
  }

  // 5. 禁用后
  async afterDisable() {
    // 清理运行时资源
  }

  // 6. 移除时
  async remove() {
    // 清理数据库数据
    // 撤销迁移
  }
}
```

**客户端插件结构**:

```typescript
// packages/plugins/plugin-xxx/src/client.ts
export class MyPluginClient extends Plugin {
  async load() {
    // 注册路由
    this.app.router.add('my-route', { path: '/my-path', component: MyComponent });

    // 注册 Schema 组件
    this.app.schemaRegistry.add('MyComponent', MyComponent);

    // 注册节点类型
    this.app.nodeRegistry.add('my-node', { renderer: MyNodeRenderer });
  }
}
```

### 2. 三层数据抽象

```
┌─────────────────────────────────────────────────────────┐
│                    Collection Layer                      │
│  (业务模型定义: 字段、关系、验证规则、权限)               │
├─────────────────────────────────────────────────────────┤
│                    Repository Layer                      │
│  (数据访问: CRUD、查询构建、关联加载、分页)              │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                        │
│  (Prisma 包装: 连接池、事务、迁移)                       │
└─────────────────────────────────────────────────────────┘
```

**Collection 定义示例**:

```typescript
// packages/database/src/collections/mindmap.ts
export const mindmapCollection = defineCollection({
  name: 'mindmaps',
  fields: [
    { type: 'string', name: 'title', required: true },
    { type: 'json', name: 'data' },
    { type: 'string', name: 'theme', default: 'default' },
    { type: 'json', name: 'settings' },
    { type: 'belongsTo', name: 'creator', target: 'users' },
    { type: 'belongsToMany', name: 'collaborators', target: 'users', through: 'mindmap_collaborators' },
    { type: 'hasMany', name: 'nodes', target: 'mindmap_nodes' },
    { type: 'hasMany', name: 'versions', target: 'mindmap_versions' },
  ],
  indexes: [
    { fields: ['creatorId', 'createdAt'] },
  ],
});
```

**Repository 使用模式**:

```typescript
// 获取 Repository
const mindmapRepo = db.getRepository('mindmaps');

// 标准查询
const mindmaps = await mindmapRepo.find({
  filter: {
    status: 'published',
    creatorId: { $eq: userId },
  },
  fields: ['id', 'title', 'updatedAt'],
  appends: ['creator', 'nodes'],
  sort: ['-updatedAt'],
  page: 1,
  pageSize: 20,
});

// 关联操作
await mindmapRepo.create({
  values: { title: 'New Mindmap', creatorId: userId },
});
```

### 3. RESTful API 设计规范

**路由格式**: `/api/<resource>:<action>?<params>`

```bash
# ═══════════════════════════════════════════════════════════
# 基础 CRUD 操作
# ═══════════════════════════════════════════════════════════
GET    /api/mindmaps                         # 列表 (list)
POST   /api/mindmaps                         # 创建 (create)
GET    /api/mindmaps:get?filterByTk=1        # 获取单个 (get)
PUT    /api/mindmaps:update?filterByTk=1     # 更新 (update)
DELETE /api/mindmaps:destroy?filterByTk=1    # 删除 (destroy)

# ═══════════════════════════════════════════════════════════
# 自定义操作 (Action)
# ═══════════════════════════════════════════════════════════
POST   /api/mindmaps:duplicate?filterByTk=1  # 复制
POST   /api/mindmaps:export?filterByTk=1     # 导出
POST   /api/mindmaps:aiExpand?filterByTk=1   # AI 扩展
POST   /api/mindmaps:aiGenerate              # AI 生成 (无需 filterByTk)

# ═══════════════════════════════════════════════════════════
# 嵌套资源
# ═══════════════════════════════════════════════════════════
GET    /api/mindmaps/1/nodes                 # 获取子资源
POST   /api/mindmaps/1/nodes                 # 创建子资源
POST   /api/mindmaps/1/nodes:batch           # 批量操作
DELETE /api/mindmaps/1/nodes/n1              # 删除子资源

# ═══════════════════════════════════════════════════════════
# 版本控制
# ═══════════════════════════════════════════════════════════
GET    /api/mindmaps/1/versions              # 版本列表
POST   /api/mindmaps/1/versions:restore      # 恢复版本
GET    /api/mindmaps/1/versions:diff         # 版本对比
```

**统一查询参数**:

```typescript
interface QueryParams {
  // 过滤条件
  filter?: {
    [field: string]: any | {
      $eq?: any;        // 等于
      $ne?: any;        // 不等于
      $gt?: any;        // 大于
      $gte?: any;       // 大于等于
      $lt?: any;        // 小于
      $lte?: any;       // 小于等于
      $in?: any[];      // 在列表中
      $notIn?: any[];   // 不在列表中
      $like?: string;   // 模糊匹配
      $and?: any[];     // 且
      $or?: any[];      // 或
    };
  };

  // 返回字段
  fields?: string[];

  // 关联数据
  appends?: string[];

  // 排序 (负号表示降序)
  sort?: string[];

  // 分页
  page?: number;
  pageSize?: number;
}
```

### 4. 事件驱动架构

**数据事件**:

```typescript
// 监听数据变化
db.on('mindmaps.beforeCreate', async (model, options) => {
  // 创建前验证、设置默认值
  model.set('createdAt', new Date());
});

db.on('mindmaps.afterCreate', async (model, options) => {
  // 创建后触发: 通知、索引更新、审计日志
  await auditService.log('mindmap.created', model.id);
  await notificationService.notify(model.creatorId, 'mindmap.created');
});

db.on('mindmap_nodes.afterUpdate', async (model, options) => {
  // 节点更新后: 版本快照、协作同步
  await versionService.createSnapshot(model.mindmapId);
});

db.on('mindmaps.afterDestroy', async (model, options) => {
  // 删除后清理: 关联数据、缓存
  await cacheService.invalidate(`mindmap:${model.id}`);
});
```

**应用事件**:

```typescript
// 应用生命周期事件
app.on('beforeStart', async () => {
  // 启动前初始化
});

app.on('afterStart', async () => {
  // 启动后执行
});

// 请求事件
app.on('beforeRequest', async (ctx) => {
  // 请求前处理
});

app.on('afterResponse', async (ctx) => {
  // 响应后处理 (日志、metrics)
});
```

### 5. 实时协作 (CRDT/Yjs)

**技术选型**: Yjs + Hocuspocus

```typescript
// packages/plugins/plugin-collaboration/src/server.ts
import * as Y from 'yjs';
import { Hocuspocus } from '@hocuspocus/server';

export class CollaborationPlugin extends Plugin {
  private docs: Map<string, Y.Doc> = new Map();

  async load() {
    // 注册 WebSocket 处理
    const hocuspocus = new Hocuspocus({
      onConnect: async ({ documentName, context }) => {
        // 验证用户权限
        const [_, mindmapId] = documentName.split(':');
        const canAccess = await this.checkAccess(context.userId, mindmapId);
        if (!canAccess) throw new Error('Unauthorized');
      },

      onLoadDocument: async ({ documentName }) => {
        // 从数据库加载
        const [_, mindmapId] = documentName.split(':');
        const mindmap = await this.db.getRepository('mindmaps').findOne({
          filterByTk: mindmapId,
        });

        const ydoc = new Y.Doc();
        if (mindmap?.yjsState) {
          Y.applyUpdate(ydoc, mindmap.yjsState);
        }
        return ydoc;
      },

      onStoreDocument: async ({ documentName, document }) => {
        // 持久化到数据库 (防抖)
        const [_, mindmapId] = documentName.split(':');
        const state = Y.encodeStateAsUpdate(document);

        await this.db.getRepository('mindmaps').update({
          filterByTk: mindmapId,
          values: { yjsState: state },
        });
      },
    });

    this.app.use('/collab', hocuspocus.handleConnection);
  }
}
```

**客户端集成**:

```typescript
// apps/web/hooks/useCollaboration.ts
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

export function useCollaboration(mindmapId: string) {
  const [users, setUsers] = useState<User[]>([]);
  const ydocRef = useRef<Y.Doc>();
  const providerRef = useRef<HocuspocusProvider>();

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: `${WS_URL}/collab`,
      name: `mindmap:${mindmapId}`,
      document: ydoc,
      token: getAuthToken(),
    });

    // 监听用户状态
    provider.on('awarenessChange', ({ states }) => {
      setUsers(Array.from(states.values()));
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [mindmapId]);

  return { ydoc: ydocRef.current, provider: providerRef.current, users };
}
```

### 6. Schema 驱动 UI (未来扩展)

```typescript
// UI Schema 定义 (用于配置化界面)
const pageSchema = {
  type: 'void',
  'x-component': 'Page',
  properties: {
    toolbar: {
      type: 'void',
      'x-component': 'ActionBar',
      properties: {
        create: {
          'x-component': 'Action',
          'x-action': 'create',
          title: '新建脑图',
        },
      },
    },
    table: {
      type: 'array',
      'x-component': 'Table',
      'x-data-source': 'mindmaps',
      properties: {
        title: { 'x-component': 'Table.Column', title: '标题' },
        updatedAt: { 'x-component': 'Table.Column', title: '更新时间' },
      },
    },
  },
};
```

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined
**Critical Conflict Points Identified:** 3 major areas where loose coupling could lead to fragmentation (Plugin structure, Data contracts, State flow).

### Structure Patterns (Plugin Protocol)
To ensure the "Microkernel" architecture remains manageable, all feature extensions must follow the **Plugin Protocol**:

**Directory Structure:**
All business capabilities reside in `packages/plugins`, NOT in the core app.
```text
plugins/todo-plugin/
├── client/          # Next.js Components (React)
│   ├── TodoNode.tsx # Node View (Registry: 'ui:todo-card')
│   └── TodoForm.tsx # Property Form (Registry: 'ui:todo-form')
├── server/          # NestJS Modules
│   ├── todo.service.ts
│   └── todo.schema.prisma
└── manifest.json    # Metadata (capabilities, commands)
```

### communication Patterns (Isomorphic DTOs)
**Zero-Duplication Rule:**
*   **Definition:** Shared types must be defined in `packages/types` (referencing Prisma generated types or Zod schemas).
*   **Enforcement:** Frontend code `apps/web` MUST NOT define `interface User { ... }` manually. It must `import { User } from '@cdm/types'`.
*   **Benefit:** Backend schema changes immediately trigger Frontend build errors, preventing runtime crashes.

### Process Patterns (State Logic flow)
**The "Yjs-First" Unidirectional Flow:**
*   **Rule:** UI Components (React/X6) **NEVER** modify local state directly.
*   **Flow:** User Action -> Call Yjs `Map.set()` -> Hocuspocus Sync -> Backend Hooks -> All Clients Update -> React Re-render.
*   **Anti-Pattern:** `setState(newValue)` followed by `api.save(newValue)`. This causes "split-brain" in collaborative editing.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
cdm-17-gemini/
├── apps/
│   ├── api/                    # [NestJS] The Kernel Server
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── collab/         # Hocuspocus (Yjs) Gateway
│   │   │   ├── plugin/         # Plugin Loader System
│   │   │   └── guard/          # RBAC Guards
│   │   └── package.json
│   └── web/                    # [Next.js] The Host Application
│       ├── app/                # App Router
│       ├── components/
│       │   └── editor/         # X6 Engine Host
│       └── package.json
├── packages/
│   ├── types/                  # [Shared] Isomorphic Contracts
│   │   ├── index.ts            # Logically shared types
│   │   └── generated/          # Zod schemas from Prisma
│   ├── ui/                     # [Shared] Shadcn + Magic UI Components
│   ├── database/               # [Shared] Prisma Schema & Migrations
│   │   └── schema.prisma
│   └── config/                 # [Shared] ESLint, TSConfig
└── plugins/                    # [Plugins] ALL Business Logic
    ├── base-task/
    │   ├── client/             # UI Components (Registry targets)
    │   ├── server/             # Backend Services
    │   └── manifest.json
    └── workflow-approval/
```

### Architectural Boundaries

**API Boundaries:**
*   **External:** REST API (`/api/v1/*`) exposed by `apps/api`.
*   **Internal:** Plugin-to-Kernel communication via Dependency Injection (NestJS Modules).
*   **Real-time:** WebSocket (`/collab/ws`) strictly for Yjs binary sync.

**Component Boundaries:**
*   **Host (web):** Provides the "Shell", Auth, and Canvas container.
*   **Plugin (ui):** Provides the specific node renderers (React Components) injected into the Canvas.

### Requirements to Structure Mapping

**Cross-Cutting Concerns:**
*   **Authentication:** `apps/web/middleware.ts` (Clerk Edge) -> `apps/api/src/guard/auth.guard.ts` (JWT Verify).
*   **Database:** `packages/database/schema.prisma` (Single Source of Truth).

## Architecture Validation Results

### Coherence Validation ✅
*   **Decision Compatibility:** Monorepo structure perfectly supports the "Isomorphic DTO" and "Plugin Protocol" patterns.
*   **Coverage:** Real-time (Yjs), Security (RBAC/Clerk), and Scalability (Docker) are all addressed.
*   **Readiness:** Directory structure is defined to the file level, enabling precise AI implementation.

### Architecture Completeness Checklist
*   [x] Project context and scale assessed.
*   [x] Critical technology stack (NestJS/Next.js/Yjs) locked.
*   [x] "Microkernel + Plugin" pattern defined.
*   [x] Project structure mapped to requirements.

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION

**First Implementation Priority:**
Initialize the Turborepo and scaffold the `NestJS (Kernel)` + `Next.js (Host)` structure.
```bash
npx create-turbo@latest cdm-17-gemini
```

### Best Practices & Quality Standards

### Best Practices & Quality Standards (Engineering Mandates)

**1. Structure & Layering (Feature-Sliced):**
*   **Feature-First:** Group by function, not type.
    *   Example: `apps/web/src/features/workspace/{components,hooks,services,views,model}`.
*   **Shared Core:**
    *   Atomic/Composite UI Components -> `packages/ui`.
    *   Pure Functions/formatters -> `packages/utils`.
*   **Strict Imports:** **PROHIBITED** to use relative paths (`../../packages/ui`) across packages. MUST use Aliases (`@cdm/ui`) or Workspace Dependencies.
*   **Entry:** `apps/web/src/app.tsx` is strictly a Router/Bootstrapper (selecting POC/Workspace), containing NO business logic.

**2. Single Responsibility & Component Design:**
*   **Container vs Presentational:**
    *   **Page/Container:** Responsible for Data Orchestration, Layout, and Context injection.
    *   **Presentational:** Pure, side-effect free, receiving data via Props.
*   **Lazy Loading:** Cross-view navigation MUST use `React.lazy` or Next.js Dynamic Imports to prevent initial bundle bloat.
*   **File Size Limit:** Files >300 lines MUST be candidates for splitting or attached with a refactoring plan.

**3. State & Logic Encapsulation:**
*   **Hook-First:** Logic (Data Fetching, Permissions, Analytics) MUST sink into custom hooks.
    *   Example: `useGraphData()`, `useDependencies()`, `useMetrics()`.
*   **Context usage:** Only lift to Context when state is truly global or shared across deeply nested sub-trees.

**4. UI & Styling (Tailwind Strategy):**
*   **Centralized UI:** Button, Badge, Card, Input must come from `packages/ui`.
*   **Utility-First:** Apps should use utility classes composition. **PROHIBITED** to create local CSS classes like `.btn`, `.my-card`.
*   **Configuration:** Single source of truth in `root/tailwind.config.cjs`.
    *   `content`: Covers `apps/web` AND `packages/ui`.
    *   `theme`: Centralized Tokens (Colors, Radius, Spacing, Shadows).

**5. Testability & Quality:**
*   **Co-location:** Tests (`*.spec.ts`) and Stories (`*.stories.tsx`) sit next to the component.
*   **Smoke Testing:** Use `/?poc=uikit` route + `apps/web/tests/ui-kit.spec.ts` for rapid visual regression testing.
*   **Snapshots:** Vitest Snapshots for logic-heavy hooks/components.

**6. CI/CD & Process:**
*   **Lockfile:** `pnpm-lock.yaml` MUST be committed.
*   **Pipeline:** `turbo.json` defines that `build` depends on `lint/test`.
**7. Backend Engineering Mandates (NestJS):**

**7.1 Structure & Pattern (Modular + Clean Arch):**
*   **Module-Per-Feature:** Logic must be encapsulated in `feature.module.ts`.
    *   Example: `apps/api/src/modules/workspace/{workspace.controller.ts, workspace.service.ts, workspace.repository.ts}`.
*   **Controller Layer:** Extremely thin. ONLY Validate DTOs and call Service. NO business logic.
*   **Service Layer:** Business logic only. Returns POJOs/Entities, not HTTP Responses.
*   **Repository Pattern:** data access MUST be abstracted.
    *   **Prohibited:** Calling `prisma.user.findMany` directly in Services.
    *   **Mandatory:** Inject `UserRepository` which wraps Prisma calls.

**7.2 Data & Validation:**
*   **Prisma Best Practices:**
    *   **NO N+1:** Use `include` or `Fluent API` for relations.
    *   **Soft Delete:** Use Middleware or Global Extension for `deletedAt`.
*   **DTO Validation:**
    *   Global `ValidationPipe` with `whitelist: true` (Strip unknown fields).
    *   **Isomorphic:** DTOs must import types from `@cdm/types` (Zod generated).

**7.3 Performance & Reliability:**
*   **Queue-First:** Heavy tasks (Import/Export, AI generation) MUST be offloaded to BullMQ.
*   **Caching:** Request-scoped data caching via `Interceptors`.
*   **Exception Filters:** Global standardized Error Response (`{ code, message, traceId }`).

**7.4 Testing Strategy:**
*   **Unit:** Service tests MUST mock Repository (never hit DB).
*   **E2E:** `test/app.e2e-spec.ts` hits real Dockerized DB (spin up/down per suite).
*   **FactoryBot:** Use factories for generating complex test data fixtures.

