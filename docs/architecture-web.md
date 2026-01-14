# 架构文档 - @cdm/web（web）

**日期：** 2026-01-14

**Part 类型：** `web`

## 1. 执行摘要
该 part 是基于 Next.js App Router 的前端应用，负责脑图/任务/数据资产等 UI 展示与交互，并通过 REST/Socket.IO/Hocuspocus 与后端集成，实现实时协作与通知。

## 2. 技术栈
| 类别 | 技术/库 | 版本 | 说明 |
|---|---|---:|---|
| 运行时 | Node.js | 22.21.1 | Volta 固定版本 |
| 包管理 | pnpm | 10.x | monorepo workspace |
| 构建编排 | Turborepo | 2.x | build/dev/lint/test pipeline |
| 语言 | TypeScript | 5.7.x | 全栈 TypeScript |
| 框架 | next | 16.0.7 | |
| 库 | react | ^19.1.0 | |
| 库 | react-dom | ^19.1.0 | |
| 库 | zustand | ^5.0.9 | |
| 库 | @tanstack/react-query | ^5.90.16 | |
| 库 | tailwindcss | ^3.4.17 | |
| 库 | socket.io-client | ^4.8.1 | |
| 库 | yjs | ^13.6.27 | |
| 库 | @hocuspocus/provider | ^3.4.3 | |
| 库 | @antv/x6 | ^3.1.2 | |
| 库 | three | 0.176.0 | |
| 库 | vitest | ^3.2.0 | |
| 库 | @playwright/test | ^1.49.0 | |

## 3. 架构模式
Next.js App Router + React 组件化；数据获取/缓存用 TanStack Query；全局状态用 Zustand；协作用 Yjs/Hocuspocus；实时通信 socket.io-client。

## 4. 数据架构
- 前端不直接访问数据库；通过调用后端 API 获取/提交数据，并使用 React Query 进行缓存与失效管理。
- 共享数据模型摘要见：[data-models-web.md](./data-models-web.md)

## 5. API 设计与集成
- API 合约：[api-contracts-web.md](./api-contracts-web.md)
- REST：默认通过 `NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_API_URL` 访问后端 `http://localhost:3001/api/*`。
- Notifications：Socket.IO namespace `/notifications`，客户端 join(userId) 后服务端推送事件。
- Collab：Hocuspocus（Yjs）WS，默认 `ws://localhost:1234`。

## 6. 组件/模块概览
### apps/web/components（按目录汇总）
| 目录 | 组件文件数（tsx） |
|---|---:|
| `App` | 7 |
| `ArchiveBox` | 1 |
| `collab` | 3 |
| `CommandPalette` | 1 |
| `Comments` | 5 |
| `graph` | 12 |
| `KeyboardShortcutsGuide` | 1 |
| `Knowledge` | 2 |
| `layout` | 3 |
| `nodes` | 13 |
| `notifications` | 2 |
| `ProductLibrary` | 4 |
| `PropertyPanel` | 21 |
| `TemplateLibrary` | 10 |
| `toolbar` | 2 |
| `UserSelector` | 1 |

### 状态管理
- React Context：`AppLibraryContext.tsx`、`CollaborationUIContext.tsx`、`CommentCountContext.tsx`、`GraphContext.tsx`、`UserContext.tsx`
- Zustand store：`apps/web/features/views/stores/useViewStore.ts`
- React Query：apps/web/app/providers.tsx（QueryClientProvider（staleTime=5min，refetchOnWindowFocus=false））

## 7. 源码结构
- 详见：[source-tree-analysis.md](./source-tree-analysis.md)

## 8. 开发流程
### 关键命令
- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`（全量）
- 单独启动 web：`pnpm --filter @cdm/web dev`
- 单测：`pnpm --filter @cdm/web test`；E2E：`pnpm --filter @cdm/web test:e2e`
- 数据库：`docker compose up -d postgres`；Prisma：`pnpm --filter @cdm/database db:migrate` 等

## 9. 部署/运行架构
- 当前仓库提供的基础设施主要是本地 Postgres（`docker-compose.yml`）。
- 生产部署/CI 尚未在仓库中固化（未发现 GitHub Actions 等）。

## 10. 测试策略
- 单元/组件测试：Vitest + Testing Library（`apps/web/__tests__`）
- 端到端测试：Playwright（`apps/web/e2e`）

---

_Generated using BMAD Method `document-project` workflow_
