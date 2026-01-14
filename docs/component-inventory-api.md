# @cdm/api - 组件清单（模块/控制器/服务）

**日期：** 2026-01-14

## 模块（apps/api/src/modules）
- `app-library`
- `collab`
- `data-management`
- `file`
- `graphs`
- `knowledge-library`
- `notification`
- `plugin-kernel`
- `product-library`
- `subscriptions`
- `users`

## 角色拆分（约定）
- Module：聚合依赖与 provider
- Controller：定义 HTTP 路由（全局前缀 `/api`）
- Service：业务逻辑
- Repository：数据访问（部分模块采用 Repository pattern）

## 关键实时能力
- `notification`：Socket.IO `/notifications`
- `collab`：Hocuspocus（Yjs）

---

_Generated using BMAD Method `document-project` workflow_
