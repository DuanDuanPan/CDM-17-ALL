# cdm-17-cc - 项目概览

**日期：** 2026-01-14

**类型：** 软件系统（monorepo）

## 执行摘要
该项目旨在以“脑图”为单一真相源（SoT），把需求/任务/知识/审批/执行在同一可视化空间内流动，并通过实时协作与通知机制支持多人并发协同。

## 项目分类
- **仓库形态：** monorepo
- **主要 Part：** web（Next.js） + api（NestJS）
- **主要语言：** TypeScript
- **协作/实时：** Yjs + Hocuspocus + Socket.IO
- **数据持久化：** PostgreSQL + Prisma

## 技术栈摘要

### @cdm/web（web）
- **核心框架：** Next.js 16.0.7 / React ^19.1.0
- **关键依赖：** next, react, react-dom, zustand, @tanstack/react-query, tailwindcss, socket.io-client, yjs, @hocuspocus/provider, @antv/x6, three, vitest, @playwright/test

### @cdm/api（api）
- **核心框架：** NestJS ^11.1.9
- **关键依赖：** @nestjs/core, @nestjs/common, @nestjs/platform-express, @nestjs/websockets, socket.io, @hocuspocus/server, @cdm/database, rxjs, class-validator, class-transformer, jest, ts-jest

## 关键特性（来自项目 Brief/PRD）
- 脑图与视图：自由/树/逻辑布局；快捷键与 / 命令；批量粘贴成树；节点下钻子图并回链。
- 信息模型：节点类型（需求/任务/模板/知识/控制/工具）；多版本+时间线；MBSE 关系（父子/依赖/数据流）。
- 执行驱动：任务映射；FS/SS/FF/SF 依赖；审批后自动推演下一任务；定期任务。
- 协同与权限：多人光标；锁定/解锁；冲突提示（人为合并）；密级/字段/附件级权限；动态水印（在线预览）；审计留存≥1年。
- 通知与节流：站内信；同节点同事件 5 分钟去重；5 分钟汇总；高优事件实时。
- 版本与可见性：未保存仅本人可见；自动保存；版本切换通知。

## 架构亮点
- monorepo：apps/web + apps/api + packages/*（共享 types/ui/database/plugins）
- 协作通道：Hocuspocus（Yjs）负责实时同步，后端持久化到 Postgres 并发出事件驱动通知
- 通知通道：Socket.IO `/notifications` 按用户房间推送

## 开发概览
### 先决条件
- Node.js（建议使用 Volta 固定版本）
- pnpm
- Docker（本地 Postgres）

### 快速开始
```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm dev
```

## 仓库结构
- `apps/web/`：Next.js 前端
- `apps/api/`：NestJS 后端
- `packages/database/`：Prisma + DB 封装
- `packages/types/`：共享类型
- `packages/ui/`：共享 UI
- `packages/plugins/`：插件
- `docs/`：文档与产物

## 文档地图
- [index.md](./index.md) - 总索引
- [source-tree-analysis.md](./source-tree-analysis.md) - 目录结构
- [architecture-web.md](./architecture-web.md) / [architecture-api.md](./architecture-api.md) - 架构
- [integration-architecture.md](./integration-architecture.md) - 集成
- [api-contracts-api.md](./api-contracts-api.md) - 后端 API 合约
- [data-models-api.md](./data-models-api.md) - 数据模型

---

_Generated using BMAD Method `document-project` workflow_
