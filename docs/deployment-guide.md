# 部署指南（Deployment Guide）

**日期：** 2026-01-14

## 本仓库已固化的部署/运行配置
- `docker-compose.yml`：仅包含 PostgreSQL（本地开发/测试使用）。

## 服务与端口
- Web：3000（Next.js）
- API：3001（NestJS，前缀 /api）
- Postgres：5432（docker compose）
- Collab WS：1234（COLLAB_WS_PORT）

## 环境变量
- `DATABASE_URL（Prisma/Postgres 连接串）`
- `PORT（API 端口，默认 3001）`
- `CORS_ORIGIN（允许跨域 origin 列表）`
- `COLLAB_WS_PORT（协作 WS，默认 1234）`
- `NEXT_PUBLIC_API_BASE_URL / NEXT_PUBLIC_API_URL（前端访问后端 API）`
- `NEXT_PUBLIC_COLLAB_WS_URL（前端协作 WS 地址）`

## CI/CD
未在仓库中发现 GitHub Actions / GitLab CI / Jenkinsfile 等配置。如需上线，请补充：
- 构建：`pnpm build`（turbo）
- 产物：web `.next/`，api `dist/`
- 迁移：`pnpm --filter @cdm/database db:migrate`（生产需要谨慎策略）

---

_Generated using BMAD Method `document-project` workflow_
