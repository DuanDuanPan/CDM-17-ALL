# @cdm/web - 开发指南

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
# 启动前端
pnpm --filter @cdm/web dev
```

## 常用命令
- Dev：`pnpm --filter @cdm/web dev`
- Build：`pnpm --filter @cdm/web build`
- Lint：`pnpm --filter @cdm/web lint`
- Unit：`pnpm --filter @cdm/web test`
- E2E：`pnpm --filter @cdm/web test:e2e`

## 环境变量（常用）
- `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_URL`：后端 API 地址（默认 http://localhost:3001）
- `NEXT_PUBLIC_COLLAB_WS_URL`：协作 WS（默认 ws://localhost:1234）
- `NEXT_PUBLIC_ENABLE_WS`：是否启用通知 WS（禁用则轮询）

## 测试说明
- 单元测试位于 `apps/web/__tests__`
- E2E 位于 `apps/web/e2e`，需要后端可用（或使用 mock spec）

---

_Generated using BMAD Method `document-project` workflow_
