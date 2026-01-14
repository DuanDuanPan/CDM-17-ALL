# @cdm/api - API 合约（HTTP + WebSocket）

**生成时间：** 2026-01-14

## 基础信息
- 默认地址：`http://localhost:3001/api`（`PORT=3001`，全局前缀 `api`）
- CORS：由 `CORS_ORIGIN`（逗号分隔）控制

## 鉴权/用户标识
- 当前实现主要依赖 `x-user-id` header 作为用户标识（部分模块支持 `Authorization` 但未接入真实验证）。
- `.env.example` 中预留了 Clerk 相关配置，但后端 token 校验仍是 TODO。

## HTTP 端点（共 51 个）
说明：以下路径均已包含全局前缀 `/api`。

### Controller: `(root)`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api` | `app.controller#getHello` |  | `apps/api/src/app.controller.ts` |
| GET | `/api/data-assets` | `data-asset.controller#list` | query:graphId,search,format,folderId,tags,createdAfter,createdBefore,linkStatus,page,pageSize,sortBy,sortOrder | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets` | `data-asset.controller#create` | body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| GET | `/api/data-assets/folders` | `data-asset.controller#getFolders` | query:graphId,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/folders` | `data-asset.controller#createFolder` | query:filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| DELETE | `/api/data-assets/folders\:destroy` | `data-asset.controller#destroyFolder` | query:filterByTk,nodeId | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| PUT | `/api/data-assets/folders\:update` | `data-asset.controller#updateFolder` | query:filterByTk,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| GET | `/api/data-assets/links` | `data-asset.controller#getLinks` | query:nodeId,nodeId | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/links` | `data-asset.controller#createLink` | query:nodeId；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/links\:batch` | `data-asset.controller#createLinksBatch` | query:nodeId,assetId；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/links\:byNodes` | `data-asset.controller#getLinksByNodes` | body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| DELETE | `/api/data-assets/links\:destroy` | `data-asset.controller#destroyLink` | query:nodeId,assetId；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/links\:destroyByNodes` | `data-asset.controller#destroyLinksByNodes` | body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| GET | `/api/data-assets/links\:detail` | `data-asset.controller#getLinksDetail` | query:nodeId；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets/links\:detailByNodes` | `data-asset.controller#getLinksDetailByNodes` | body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| GET | `/api/data-assets/trash` | `data-asset.controller#getTrash` | query:graphId,filterByTk,graphId | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| DELETE | `/api/data-assets/trash\:empty` | `data-asset.controller#emptyTrash` | query:graphId,graphId | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| DELETE | `/api/data-assets\:destroy` | `data-asset.controller#destroy` | query:filterByTk,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| GET | `/api/data-assets\:get` | `data-asset.controller#get` | query:filterByTk,filterByTk,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| DELETE | `/api/data-assets\:hard-delete` | `data-asset.controller#hardDelete` | query:filterByTk,graphId | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| PATCH | `/api/data-assets\:restore` | `data-asset.controller#restore` | query:filterByTk,graphId,filterByTk | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| PATCH | `/api/data-assets\:soft-delete` | `data-asset.controller#softDelete` | query:filterByTk,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| PATCH | `/api/data-assets\:soft-delete-batch` | `data-asset.controller#softDeleteBatch` | query:filterByTk,graphId；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| PUT | `/api/data-assets\:update` | `data-asset.controller#update` | query:filterByTk,filterByTk,filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |
| POST | `/api/data-assets\:upload` | `data-asset.controller#FileInterceptor` | query:filterByTk；body | `apps/api/src/modules/data-management/data-asset.controller.ts` |

### Controller: `app-library`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/app-library` | `app-library.controller#search` | param:id；query:q | `apps/api/src/modules/app-library/app-library.controller.ts` |
| GET | `/api/app-library/:id` | `app-library.controller#getById` | param:id | `apps/api/src/modules/app-library/app-library.controller.ts` |
| GET | `/api/app-library/categories` | `app-library.controller#getCategories` | param:id | `apps/api/src/modules/app-library/app-library.controller.ts` |

### Controller: `files`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| DELETE | `/api/files/:fileId` | `file.controller#deleteFile` | param:fileId | `apps/api/src/modules/file/file.controller.ts` |
| GET | `/api/files/:fileId` | `file.controller#downloadFile` | param:fileId,fileId | `apps/api/src/modules/file/file.controller.ts` |
| GET | `/api/files/:fileId/metadata` | `file.controller#getFileMetadata` | param:fileId,fileId | `apps/api/src/modules/file/file.controller.ts` |
| POST | `/api/files/upload` | `file.controller#uploadFile` |  | `apps/api/src/modules/file/file.controller.ts` |

### Controller: `graphs`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/graphs` | `graphs.controller#findAll` | param:id,id；query:userId,userId；body | `apps/api/src/modules/graphs/graphs.controller.ts` |
| POST | `/api/graphs` | `graphs.controller#create` | param:id；query:userId,userId；body | `apps/api/src/modules/graphs/graphs.controller.ts` |
| DELETE | `/api/graphs/:id` | `graphs.controller#remove` | param:id；query:userId | `apps/api/src/modules/graphs/graphs.controller.ts` |
| GET | `/api/graphs/:id` | `graphs.controller#findOne` | param:id,id,id；query:userId,userId；body | `apps/api/src/modules/graphs/graphs.controller.ts` |
| PATCH | `/api/graphs/:id` | `graphs.controller#update` | param:id,id；query:userId,userId；body | `apps/api/src/modules/graphs/graphs.controller.ts` |

### Controller: `knowledge-library`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/knowledge-library` | `knowledge-library.controller#searchKnowledge` | query:q | `apps/api/src/modules/knowledge-library/knowledge-library.controller.ts` |

### Controller: `notifications`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/notifications` | `notification.controller#list` | query:userId,isRead,page,limit,unreadOnly,priority | `apps/api/src/modules/notification/notification.controller.ts` |
| PATCH | `/api/notifications/:id\:markRead` | `notification.controller#markRead` | param:id；query:userId | `apps/api/src/modules/notification/notification.controller.ts` |
| GET | `/api/notifications/count` | `notification.controller#count` | param:id；query:userId | `apps/api/src/modules/notification/notification.controller.ts` |
| PATCH | `/api/notifications/markAllRead` | `notification.controller#markAllRead` | query:userId | `apps/api/src/modules/notification/notification.controller.ts` |
| GET | `/api/notifications/unread-count` | `notification.controller#unreadCount` | query:userId,userId | `apps/api/src/modules/notification/notification.controller.ts` |

### Controller: `product-library`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/product-library` | `product-library.controller#searchProducts` | query:q | `apps/api/src/modules/product-library/product-library.controller.ts` |

### Controller: `subscriptions`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| DELETE | `/api/subscriptions` | `subscriptions.controller#unsubscribe` | query:nodeId,nodeId；header:x-user-id,x-user-id | `apps/api/src/modules/subscriptions/subscriptions.controller.ts` |
| GET | `/api/subscriptions` | `subscriptions.controller#listSubscriptions` | header:x-user-id | `apps/api/src/modules/subscriptions/subscriptions.controller.ts` |
| POST | `/api/subscriptions` | `subscriptions.controller#subscribe` | header:x-user-id；body | `apps/api/src/modules/subscriptions/subscriptions.controller.ts` |
| GET | `/api/subscriptions/check` | `subscriptions.controller#checkSubscription` | query:nodeId；header:x-user-id,x-user-id | `apps/api/src/modules/subscriptions/subscriptions.controller.ts` |

### Controller: `users`
| 方法 | 路径 | Handler | 参数提示 | 源文件 |
|---|---|---|---|---|
| GET | `/api/users` | `users.controller#list` | param:id | `apps/api/src/modules/users/users.controller.ts` |
| GET | `/api/users/:id` | `users.controller#findById` | param:id | `apps/api/src/modules/users/users.controller.ts` |
| GET | `/api/users/search` | `users.controller#search` | param:id | `apps/api/src/modules/users/users.controller.ts` |

## WebSocket / 实时能力
### Socket.IO 网关
- Namespace: `/notifications`；事件：join（文件：`apps/api/src/modules/notification/notification.gateway.ts`）
  - 约定：客户端先发送 `join`（payload=userId）加入房间 `user:{userId}`，服务端对该房间推送如 `notification:new` 事件。

### Hocuspocus（Yjs 协作）
- 服务端：`CollabService` 启动 Hocuspocus WebSocket，默认端口 `COLLAB_WS_PORT=1234`。
- 文档命名：`graph:<graphId>`。
- 连接鉴权：当前仅记录 `token` query 参数，真实 Clerk 校验仍为 TODO。
