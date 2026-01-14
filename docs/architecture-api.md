# 架构文档 - @cdm/api（api）

**日期：** 2026-01-14

**Part 类型：** `backend`

## 1. 执行摘要
该 part 是基于 NestJS 的后端服务，提供 `/api/*` HTTP 接口、通知 Socket.IO 网关与协作 Hocuspocus（Yjs）服务，并使用 PostgreSQL + Prisma 进行持久化。

## 2. 技术栈
| 类别 | 技术/库 | 版本 | 说明 |
|---|---|---:|---|
| 运行时 | Node.js | 22.21.1 | Volta 固定版本 |
| 包管理 | pnpm | 10.x | monorepo workspace |
| 构建编排 | Turborepo | 2.x | build/dev/lint/test pipeline |
| 语言 | TypeScript | 5.7.x | 全栈 TypeScript |
| 框架 | @nestjs/core | ^11.1.9 | |
| 库 | @nestjs/common | ^11.1.9 | |
| 库 | @nestjs/platform-express | ^11.1.9 | |
| 库 | @nestjs/websockets | ^11.1.9 | |
| 库 | socket.io | ^4.8.1 | |
| 库 | @hocuspocus/server | ^3.4.3 | |
| 库 | @cdm/database | workspace:* | |
| 库 | rxjs | ^7.8.1 | |
| 库 | class-validator | ^0.14.1 | |
| 库 | class-transformer | ^0.5.1 | |
| 库 | jest | ^29.7.0 | |
| 库 | ts-jest | ^29.2.6 | |

## 3. 架构模式
NestJS 模块化架构（Module/Controller/Service）；HTTP + WebSocket（socket.io）；事件驱动用 @nestjs/event-emitter；协作用 Yjs/Hocuspocus。

## 4. 数据架构
- 主存储：PostgreSQL（`DATABASE_URL`）
- ORM：Prisma（schema：`packages/database/prisma/schema.prisma`）
- 协作状态：`Graph.yjsState` 存储 Yjs 二进制；必要时从 Nodes/Edges 关系表重建初始状态
- 详见：[data-models-api.md](./data-models-api.md)

## 5. API 设计与集成
- API 合约：[api-contracts-api.md](./api-contracts-api.md)
- HTTP：Nest 全局前缀 `/api`（`apps/api/src/main.ts`）
- WebSocket：Socket.IO `/notifications` + Hocuspocus（Yjs）

## 6. 组件/模块概览
- NestJS 模块组织：`apps/api/src/modules/*`（按业务域拆分 Module/Controller/Service/Repository）。
- 事件驱动：`@nestjs/event-emitter` 用于协作变更事件与订阅通知。
- 插件机制：`@cdm/plugins`/`plugin-*`（Kernel/Plugin Manager）。

## 7. 源码结构
- 详见：[source-tree-analysis.md](./source-tree-analysis.md)

## 8. 开发流程
### 关键命令
- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`（全量）
- 单独启动 api：`pnpm --filter @cdm/api dev`
- 单测：`pnpm --filter @cdm/api test`
- 数据库：`docker compose up -d postgres`；Prisma：`pnpm --filter @cdm/database db:migrate` 等

## 9. 部署/运行架构
- 当前仓库提供的基础设施主要是本地 Postgres（`docker-compose.yml`）。
- 生产部署/CI 尚未在仓库中固化（未发现 GitHub Actions 等）。

## 10. 测试策略
- 后端测试：Jest（`apps/api/src/**/*.spec.ts`）

---

_Generated using BMAD Method `document-project` workflow_
