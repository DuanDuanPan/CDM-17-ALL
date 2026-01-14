# 集成架构（Integration Architecture）

**日期：** 2026-01-14

## 总览
该项目采用前后端分离的 monorepo：`apps/web`（Next.js）与 `apps/api`（NestJS）。两者通过 REST、Socket.IO 与 Hocuspocus（Yjs）协作通道集成，并共享 `packages/*` 中的类型、UI 与数据库访问层。

## 集成点一览

### web → api（REST (fetch)）
- **base_url_env：** NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_API_URL
- **default_base：** http://localhost:3001
- **path_prefix：** /api
- **auth：** x-user-id header（开发态用户标识；部分后端支持 Authorization）
- **common_paths_samples：** /api/:path, /api/__tests__/api-services.test.ts, /api/__tests__/nodes.test.ts, /api/app-library, /api/app-library.ts, /api/app-library/categories, /api/approval, /api/approval.ts, /api/approval/, /api/approval/node-1, /api/approval/node-1/…, /api/archive, /api/archive.ts, /api/citations/19930020471/…, /api/citations/20180006860/…, /api/citations/20210000685/…, /api/comments, /api/comments.ts, /api/comments/, /api/comments/attachments/…, /api/comments/node-1/…, /api/comments/unread, /api/data-assets, /api/data-assets.ts, /api/data-assets/folders, /api/data-assets/folders:destroy, /api/data-assets/folders:update, /api/data-assets/links, /api/data-assets/links:batch, /api/data-assets/links:byNodes

### web → api（Socket.IO (notifications)）
- **namespace：** /notifications
- **client_event：** join(userId) => room user:{userId}
- **server_push：** notification:*（如 notification:new）
- **files：** apps/api/src/modules/notification/notification.gateway.ts, apps/web/hooks/useNotifications.ts

### web → api（Hocuspocus (Yjs 协作)）
- **ws_port_env：** COLLAB_WS_PORT (default 1234)
- **web_env：** NEXT_PUBLIC_COLLAB_WS_URL (default ws://localhost:1234)
- **document_name：** graph:<graphId>
- **persistence：** Graph.yjsState（二进制）+ Nodes/Edges 关系数据兜底初始化
- **files：** apps/api/src/modules/collab/collab.service.ts, apps/web/app/graph/[graphId]/page.tsx

### api → database（Prisma/PostgreSQL）
- **db_env：** DATABASE_URL
- **schema：** packages/database/prisma/schema.prisma
- **migrations：** packages/database/prisma/migrations
- **package：** @cdm/database

### web/api → shared packages（Monorepo workspaces）
- **packages：** @cdm/types, @cdm/ui, @cdm/database, @cdm/plugins, plugin-*

## 关键数据流（建议先读这部分）
### 1) 图谱编辑与协作（Yjs）
- Web 打开图谱页面后通过 `NEXT_PUBLIC_COLLAB_WS_URL` 连接 Hocuspocus。
- 文档命名约定：`graph:<graphId>`。
- 后端 `CollabService` 在 `onLoadDocument` 时优先从 `Graph.yjsState` 读取二进制状态；缺失时从 `Nodes/Edges` 关系表重建初始状态。
- 文档变化会触发持久化（`onStoreDocument`）并通过 `EventEmitter2` 发出 `collab.node.changed` 事件。

### 2) Watch/订阅通知（事件驱动 + 节流）
- `SubscriptionListener` 监听 `collab.node.changed`，查询订阅关系并对收件人按窗口节流聚合。
- `NotificationGateway` 通过 Socket.IO namespace `/notifications` 向用户房间 `user:{userId}` 推送事件。

### 3) 常规 REST 调用
- Web 侧通过 `fetch` 调用后端 `/api/*`，通常携带 `x-user-id` header。
- 部分场景（附件上传/下载）使用 Next.js Route Handler 作为代理层：`apps/web/app/api/comments/attachments/*`。

## 鉴权/身份
- 当前主线：`x-user-id`（开发态 mock）。
- `.env.example` 预留了 Clerk key；后端/协作通道的 token 校验仍为 TODO（见 `CollabService.onConnect` 注释）。

## 依赖与共享
- **@cdm/types**：领域类型（Node/Edge/Approval/Comment/Subscription/Notification 等），前后端共享。
- **@cdm/database**：Prisma client + Repository/Database 封装。
- **@cdm/ui**：Toast/Confirm 等 UI 基础设施。
- **@cdm/plugins / plugin-***：插件机制（web 与 api 均有引用）。

---

_Generated using BMAD Method `document-project` workflow_
