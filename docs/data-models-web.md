# @cdm/web - 数据模型（Prisma/PostgreSQL）

**生成时间：** 2026-01-14

## 数据源
- Prisma datasource：`postgresql`
- 连接串环境变量：`DATABASE_URL`（见 `.env.example`）
- 本地数据库：`docker-compose.yml` 提供 `postgres:15-alpine`（默认库 `cdm17`）。

## Prisma Schema
- Schema 文件：`packages/database/prisma/schema.prisma`
- 模型数量：21；枚举：NodeType, TemplateStatus, DataAssetFormat

### 主要实体与关系（摘要）
| Model | 主键 | 关系字段（指向其他 Model） |
|---|---|---|
| `Comment` | `id` | node→Node；mindmap→Graph；author→User；replyTo→Comment；replies→Comment[]；attachments→CommentAttachment[] |
| `CommentAttachment` | `id` | comment→Comment |
| `CommentRead` | `id` | user→User |
| `DataAsset` | `id` | graph→Graph；folder→DataFolder；nodeLinks→NodeDataLink[] |
| `DataFolder` | `id` | graph→Graph；parent→DataFolder；children→DataFolder[]；assets→DataAsset[] |
| `Edge` | `id` | graph→Graph；source→Node；target→Node |
| `Graph` | `id` | project→Project；nodes→Node[]；edges→Edge[]；dataFolders→DataFolder[]；dataAssets→DataAsset[]；comments→Comment[] |
| `Node` | `id` | graph→Graph；parent→Node；children→Node[]；sourceEdges→Edge[]；targetEdges→Edge[]；taskProps→NodeTask；requirementProps→NodeRequirement；pbsProps→NodePBS；dataProps→NodeData；appProps→NodeApp；comments→Comment[]；subscriptions→Subscription[]；dataLinks→NodeDataLink[] |
| `NodeApp` | `nodeId` | node→Node |
| `NodeData` | `nodeId` | node→Node |
| `NodeDataLink` | `id` | node→Node；asset→DataAsset |
| `NodePBS` | `nodeId` | node→Node |
| `NodeRequirement` | `nodeId` | node→Node |
| `NodeTask` | `nodeId` | node→Node |
| `Notification` | `id` | recipient→User |
| `Project` | `id` | owner→User；graphs→Graph[] |
| `Subscription` | `id` | user→User；node→Node |
| `Template` | `id` | category→TemplateCategory；usageLogs→TemplateUsageLog[] |
| `TemplateCategory` | `id` | templates→Template[] |
| `TemplateUsageLog` | `id` | template→Template |
| `User` | `id` | projects→Project[]；notifications→Notification[]；comments→Comment[]；commentReads→CommentRead[]；subscriptions→Subscription[] |

## 迁移（Migrations）
- 目录：`packages/database/prisma/migrations/`（15 个迁移）
- 工作流：`pnpm --filter @cdm/database db:migrate` / `db:push` / `db:seed` / `db:studio`

## 代码侧访问
- Prisma client：`packages/database/src/client.ts`（dev 环境复用 global prisma）
- database wrapper：`packages/database/src/Database.ts`（NocoBase 风格的 Repository/事件封装）
- API 服务依赖：`@cdm/database`（workspace 包）
