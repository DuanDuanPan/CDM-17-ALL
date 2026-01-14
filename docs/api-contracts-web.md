# @cdm/web - API 相关（Next.js Route Handlers + API Client）

**生成时间：** 2026-01-14

## Next.js Route Handlers（BFF/代理）
共 3 个：
| 方法 | 路径 | 说明 | 源文件 |
|---|---|---|---|
| DELETE | `/api/comments/attachments/:id` | 代理到后端同名接口（用于附件上传/下载/删除） | `apps/web/app/api/comments/attachments/[id]/route.ts` |
| GET | `/api/comments/attachments/:id` | 代理到后端同名接口（用于附件上传/下载/删除） | `apps/web/app/api/comments/attachments/[id]/route.ts` |
| POST | `/api/comments/attachments/upload` | 代理到后端同名接口（用于附件上传/下载/删除） | `apps/web/app/api/comments/attachments/upload/route.ts` |

## 前端访问后端 API 的方式
- 主要通过 `fetch` 访问后端 `http://localhost:3001/api/...`（默认），并在请求中携带 `x-user-id`。
- API base：`NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_API_URL`（见 `apps/web/next.config.ts`、`apps/web/lib/api/*`）。

### API Client 模块（apps/web/lib/api）
- `apps/web/lib/api/app-library.ts`
- `apps/web/lib/api/approval.ts`
- `apps/web/lib/api/archive.ts`
- `apps/web/lib/api/comments.ts`
- `apps/web/lib/api/index.ts`
- `apps/web/lib/api/knowledge.ts`
- `apps/web/lib/api/nodes.ts`
- `apps/web/lib/api/templates.ts`
- `apps/web/lib/api/users.ts`

## WebSocket/实时
- Notifications：Socket.IO namespace `/notifications`（见后端 `NotificationGateway`）。
- Collab：Yjs/Hocuspocus，前端默认 `NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:1234`。
