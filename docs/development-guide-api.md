# @cdm/api - 开发指南

**日期：** 2026-01-14

## 先决条件
- Node.js（建议使用 Volta 固定版本：22.21.1）
- pnpm（workspace 包管理）
- Docker（用于本地 PostgreSQL）

## 安装与启动
```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
# 启动后端（默认 3001）
pnpm --filter @cdm/api dev
```

## 常用命令
- Dev：`pnpm --filter @cdm/api dev`
- Build：`pnpm --filter @cdm/api build`
- Lint：`pnpm --filter @cdm/api lint`
- Test：`pnpm --filter @cdm/api test`

## 环境变量（常用）
- `PORT`：HTTP 端口（默认 3001）
- `CORS_ORIGIN`：允许跨域 origin 列表
- `DATABASE_URL`：Postgres 连接串
- `COLLAB_WS_PORT`：协作 WS 端口（默认 1234）

## 运行形态
- HTTP：`/api/*`
- WS：`/notifications`（Socket.IO）；Collab：Hocuspocus WS（默认 1234）

---

_Generated using BMAD Method `document-project` workflow_
