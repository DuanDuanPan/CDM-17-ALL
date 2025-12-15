# NocoBase 架构分析 - 关键要点与 CDM 项目建议

## 执行总结

本报告深入分析了 NocoBase (v1.9.25) 的架构设计和实现模式，提取了其作为成功的开源无代码平台的核心设计理念和最佳实践。

---

## 一、NocoBase 核心架构特点

### 1. 微内核插件化架构

**核心理念**: "一切皆插件" (Everything is a Plugin)

- ✅ **微内核设计**: 核心功能最小化，只提供基础设施
- ✅ **完全插件化**: 所有业务功能都以插件形式实现 (~90个插件)
- ✅ **动态加载**: 支持运行时安装、启用、禁用插件
- ✅ **插件扩展插件**: 插件之间可以相互扩展和组合

**实现方式**:
```typescript
// 服务端插件
export class MyPlugin extends Plugin {
  async beforeLoad() { /* 注册模型、迁移 */ }
  async load() { /* 注册资源、中间件、事件 */ }
  async install() { /* 初始化数据 */ }
}

// 客户端插件
export class MyPluginClient extends Plugin {
  async load() {
    // 注册路由、组件、Schema
  }
}
```

### 2. Monorepo 项目结构

采用 **Lerna + Yarn Workspaces** 管理:

```
packages/
├── core/              # 23个核心包
│   ├── server/        # Koa 服务端框架
│   ├── client/        # React 客户端框架
│   ├── database/      # Sequelize 数据库抽象
│   ├── resourcer/     # RESTful 资源管理
│   └── ...
├── plugins/           # ~90个功能插件
│   └── @nocobase/
│       ├── plugin-acl/
│       ├── plugin-workflow/
│       └── ...
└── presets/           # 预设组合
    └── nocobase/      # 默认预设
```

**优势**:
- 清晰的代码组织和职责划分
- 统一版本管理 (所有包同步发布)
- 便于独立开发和测试
- 支持代码复用

### 3. 数据模型驱动

**关键设计**: 数据结构与 UI 彻底分离

```
Collection (数据模型)
    ↓
Repository (数据访问)
    ↓
RESTful API
    ↓
UI Schema (界面描述)
    ↓
React Components (渲染)
```

**优势**:
- 一个模型可以有多种界面展示
- 界面配置化，降低开发成本
- 支持多数据源 (主库、外部库、API)

### 4. 三层数据抽象

```
┌─────────────────┐
│   Collection    │ ← 业务模型层 (定义结构、关系)
├─────────────────┤
│   Repository    │ ← 仓储层 (CRUD、查询构建)
├─────────────────┤
│   Database      │ ← 数据库抽象层 (Sequelize 包装)
├─────────────────┤
│ PostgreSQL/MySQL│ ← 物理数据库
└─────────────────┘
```

**示例代码**:
```typescript
// 定义 Collection
db.collection({
  name: 'posts',
  fields: [
    { type: 'string', name: 'title' },
    { type: 'text', name: 'content' },
    { type: 'belongsTo', name: 'author', target: 'users' },
    { type: 'hasMany', name: 'comments', target: 'comments' },
  ]
});

// 使用 Repository
const postRepo = db.getRepository('posts');
const posts = await postRepo.find({
  filter: { status: 'published' },
  appends: ['author', 'comments'],
  sort: ['-createdAt'],
  page: 1,
  pageSize: 20
});
```

### 5. 完善的插件生命周期

```
添加插件
   ↓
beforeLoad   ← 注册模型、迁移、字段类型
   ↓
load         ← 注册资源、中间件、事件监听
   ↓
afterAdd
   ↓
install      ← 首次安装时初始化数据
   ↓
afterEnable  ← 启用后执行
   ↓
(运行中)
   ↓
afterDisable ← 禁用后清理
   ↓
remove       ← 移除时清理数据
```

### 6. Schema 驱动的 UI

使用 JSON Schema 描述界面，实现配置化 UI:

```json
{
  "type": "void",
  "x-component": "Page",
  "properties": {
    "table": {
      "type": "array",
      "x-component": "Table",
      "x-data-source": "users",
      "properties": {
        "name": {
          "type": "string",
          "x-component": "Table.Column",
          "title": "Name"
        }
      }
    }
  }
}
```

**优势**:
- 界面可配置化
- 存储在数据库中
- 支持拖拽编辑
- 降低前端开发成本

---

## 二、技术栈清单

### 服务端技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| **Web 框架** | Koa 2 | 轻量级、中间件设计 |
| **ORM** | Sequelize 6 | 多数据库支持 |
| **数据库** | PostgreSQL / MySQL / MariaDB | 主数据库 |
| **缓存** | Redis / ioredis | 缓存和会话 |
| **认证** | JWT / Passport | 多种认证方式 |
| **WebSocket** | ws | 实时通信 |
| **日志** | Winston | 结构化日志 |
| **国际化** | i18next | 多语言支持 |
| **任务队列** | Cron | 定时任务 |
| **测试** | Jest | 单元测试和集成测试 |

### 客户端技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| **框架** | React 18 | UI 框架 |
| **UI 库** | Ant Design 5 | 企业级 UI 组件 |
| **表单** | Formily | 复杂表单解决方案 |
| **路由** | React Router 6 | 单页应用路由 |
| **HTTP** | Axios | API 请求 |
| **状态** | React Context / Hooks | 状态管理 |
| **国际化** | react-i18next | 多语言 |
| **拖拽** | @dnd-kit | 拖拽排序 |
| **图表** | G2Plot | 数据可视化 |
| **Markdown** | react-quill | 富文本编辑 |
| **测试** | Testing Library | 组件测试 |

### 开发工具

| 工具 | 说明 |
|------|------|
| TypeScript 5.1 | 类型安全 |
| Lerna | Monorepo 管理 |
| Yarn Workspaces | 依赖管理 |
| ESLint + Prettier | 代码规范 |
| Docker + Docker Compose | 容器化 |
| Vitest | 快速测试 |

---

## 三、对 CDM 脑图项目的具体建议

### 3.1 推荐的项目结构

```
cdm-mindmap/
├── packages/
│   ├── core/
│   │   ├── app/              # 应用核心
│   │   ├── server/           # 服务端框架
│   │   ├── client/           # 客户端框架
│   │   ├── database/         # 数据库抽象
│   │   ├── mindmap-engine/   # 脑图渲染引擎
│   │   └── ai-service/       # AI 服务抽象
│   │
│   ├── plugins/
│   │   ├── plugin-mindmap-basic/     # 基础脑图
│   │   ├── plugin-mindmap-ai/        # AI 辅助
│   │   ├── plugin-collaboration/     # 实时协作
│   │   ├── plugin-version-control/   # 版本控制
│   │   ├── plugin-export/            # 多格式导出
│   │   └── plugin-templates/         # 模板管理
│   │
│   └── presets/
│       └── cdm-default/       # 默认预设
│
├── examples/                  # 示例代码
├── docker/                    # Docker 配置
├── lerna.json
├── package.json
└── tsconfig.json
```

### 3.2 核心数据模型设计

#### Mindmap Collection

```typescript
db.collection({
  name: 'mindmaps',
  fields: [
    { type: 'string', name: 'title', required: true },
    { type: 'json', name: 'data' },          // 脑图数据
    { type: 'string', name: 'theme' },       // 主题
    { type: 'json', name: 'settings' },      // 设置
    { type: 'belongsTo', name: 'creator', target: 'users' },
    { type: 'belongsToMany', name: 'collaborators', target: 'users', through: 'mindmap_collaborators' },
    { type: 'hasMany', name: 'versions', target: 'mindmap_versions' },
    { type: 'hasMany', name: 'nodes', target: 'mindmap_nodes' },
  ]
});
```

#### Node Collection

```typescript
db.collection({
  name: 'mindmap_nodes',
  fields: [
    { type: 'string', name: 'nodeId', unique: true },
    { type: 'string', name: 'type' },        // root, topic, subtopic
    { type: 'text', name: 'text' },
    { type: 'json', name: 'data' },          // 节点数据
    { type: 'json', name: 'position' },      // 位置信息
    { type: 'json', name: 'style' },         // 样式
    { type: 'belongsTo', name: 'mindmap', target: 'mindmaps' },
    { type: 'belongsTo', name: 'parent', target: 'mindmap_nodes' },
    { type: 'hasMany', name: 'children', target: 'mindmap_nodes', foreignKey: 'parentId' },
  ]
});
```

#### Version Collection

```typescript
db.collection({
  name: 'mindmap_versions',
  fields: [
    { type: 'bigInt', name: 'version', autoIncrement: true },
    { type: 'json', name: 'snapshot' },      // 完整快照
    { type: 'json', name: 'diff' },          // 增量差异
    { type: 'string', name: 'message' },     // 版本说明
    { type: 'belongsTo', name: 'mindmap', target: 'mindmaps' },
    { type: 'belongsTo', name: 'creator', target: 'users' },
  ]
});
```

### 3.3 RESTful API 设计

```bash
# === 脑图基础操作 ===
GET    /api/mindmaps                      # 列表
POST   /api/mindmaps                      # 创建
GET    /api/mindmaps:get?filterByTk=1     # 获取
PUT    /api/mindmaps:update?filterByTk=1  # 更新
DELETE /api/mindmaps:destroy?filterByTk=1 # 删除

# === 节点操作 ===
POST   /api/mindmaps/1/nodes              # 添加节点
PUT    /api/mindmaps/1/nodes/n1           # 更新节点
DELETE /api/mindmaps/1/nodes/n1           # 删除节点
POST   /api/mindmaps/1/nodes:batch        # 批量操作

# === AI 功能 ===
POST   /api/mindmaps:aiExpand?filterByTk=1     # AI 扩展
POST   /api/mindmaps:aiSuggest?filterByTk=1    # AI 建议
POST   /api/mindmaps:aiOrganize?filterByTk=1   # AI 整理
POST   /api/mindmaps:aiGenerate                # AI 生成

# === 协作功能 ===
POST   /api/mindmaps/1/collaborators      # 添加协作者
DELETE /api/mindmaps/1/collaborators/u1   # 移除协作者
GET    /api/mindmaps/1/collaborators      # 协作者列表
WebSocket /ws/mindmap/{id}                # 实时协作

# === 版本控制 ===
GET    /api/mindmaps/1/versions           # 版本列表
POST   /api/mindmaps/1/versions:restore   # 恢复版本
GET    /api/mindmaps/1/versions:diff      # 版本对比

# === 导出功能 ===
POST   /api/mindmaps:export?filterByTk=1  # 导出
  # Body: { format: 'png|svg|pdf|markdown|json', options: {...} }

# === 模板功能 ===
GET    /api/templates                     # 模板列表
POST   /api/mindmaps:createFromTemplate   # 从模板创建
POST   /api/mindmaps:saveAsTemplate?filterByTk=1  # 保存为模板
```

### 3.4 插件实现示例

#### 基础脑图插件

```typescript
// packages/plugins/plugin-mindmap-basic/src/server.ts
export class MindMapBasicPlugin extends Plugin {
  async beforeLoad() {
    // 注册 Collections
    this.db.collection({ name: 'mindmaps', fields: [...] });
    this.db.collection({ name: 'mindmap_nodes', fields: [...] });
  }

  async load() {
    // 注册 RESTful 资源
    this.app.resourcer.define({
      name: 'mindmaps',
      actions: {
        // 使用默认 CRUD
      }
    });

    // 注册自定义操作
    this.app.resourcer.registerActionHandler('mindmaps:duplicate', async (ctx, next) => {
      const { filterByTk } = ctx.action.params;
      const original = await ctx.db.getRepository('mindmaps').findOne({ filterByTk });

      const duplicated = await ctx.db.getRepository('mindmaps').create({
        values: {
          ...original.toJSON(),
          title: `${original.title} (Copy)`,
          creator: ctx.state.currentUser.id
        }
      });

      ctx.body = duplicated;
      await next();
    });

    // 监听节点创建事件
    this.db.on('mindmap_nodes.afterCreate', async (model, options) => {
      // 可以在这里添加额外逻辑
    });
  }
}
```

#### AI 插件

```typescript
// packages/plugins/plugin-mindmap-ai/src/server.ts
export class MindMapAIPlugin extends Plugin {
  aiService: AIService;

  async beforeLoad() {
    // 初始化 AI 服务
    this.aiService = new OpenAIService({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4'
    });
  }

  async load() {
    // 注册 AI 操作
    this.app.resourcer.define({
      name: 'mindmaps.ai',
      actions: {
        // AI 扩展节点
        expand: async (ctx, next) => {
          const { filterByTk, nodeId } = ctx.action.params;
          const mindmap = await ctx.db.getRepository('mindmaps').findOne({ filterByTk });
          const node = mindmap.nodes.find(n => n.nodeId === nodeId);

          // 调用 AI 服务
          const suggestions = await this.aiService.expandNode(node, {
            mindmap,
            context: this.buildContext(mindmap, node)
          });

          ctx.body = suggestions;
          await next();
        },

        // AI 生成脑图
        generate: async (ctx, next) => {
          const { topic, options } = ctx.action.params.values;

          const mindmap = await this.aiService.generateMindmap(topic, options);

          // 保存到数据库
          const saved = await ctx.db.getRepository('mindmaps').create({
            values: {
              title: topic,
              data: mindmap,
              creator: ctx.state.currentUser.id
            }
          });

          ctx.body = saved;
          await next();
        },

        // AI 整理
        organize: async (ctx, next) => {
          const { filterByTk } = ctx.action.params;
          const mindmap = await ctx.db.getRepository('mindmaps').findOne({ filterByTk });

          const organized = await this.aiService.organize(mindmap);

          await ctx.db.getRepository('mindmaps').update({
            filterByTk,
            values: { data: organized }
          });

          ctx.body = organized;
          await next();
        }
      }
    });
  }
}

// AI 服务接口
interface AIService {
  expandNode(node: Node, context: Context): Promise<Node[]>;
  generateMindmap(topic: string, options?: any): Promise<Mindmap>;
  organize(mindmap: Mindmap): Promise<Mindmap>;
  suggest(mindmap: Mindmap): Promise<Suggestion[]>;
}
```

#### 实时协作插件

```typescript
// packages/plugins/plugin-collaboration/src/server.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export class CollaborationPlugin extends Plugin {
  docs: Map<string, Y.Doc> = new Map();

  async load() {
    // WebSocket 处理
    this.app.ws.on('join-mindmap', async (socket, { mindmapId }) => {
      socket.join(`mindmap:${mindmapId}`);

      // 初始化 Yjs 文档
      let ydoc = this.docs.get(mindmapId);
      if (!ydoc) {
        ydoc = new Y.Doc();
        this.docs.set(mindmapId, ydoc);

        // 从数据库加载
        const mindmap = await this.app.db.getRepository('mindmaps')
          .findOne({ filterByTk: mindmapId });
        if (mindmap) {
          const ymap = ydoc.getMap('mindmap');
          ymap.set('data', mindmap.data);
        }
      }

      // 同步状态
      socket.emit('mindmap-state', Y.encodeStateAsUpdate(ydoc));

      // 广播用户加入
      socket.to(`mindmap:${mindmapId}`).emit('user-joined', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    this.app.ws.on('mindmap-update', async (socket, { mindmapId, update }) => {
      const ydoc = this.docs.get(mindmapId);
      if (!ydoc) return;

      // 应用更新
      Y.applyUpdate(ydoc, Buffer.from(update));

      // 广播给其他用户
      socket.to(`mindmap:${mindmapId}`).emit('mindmap-update', update);

      // 异步持久化 (防抖)
      this.debounceSave(mindmapId, ydoc);
    });

    this.app.ws.on('leave-mindmap', (socket, { mindmapId }) => {
      socket.leave(`mindmap:${mindmapId}`);
      socket.to(`mindmap:${mindmapId}`).emit('user-left', {
        userId: socket.userId
      });
    });
  }

  // 防抖保存
  private debounceSave = lodash.debounce(async (mindmapId: string, ydoc: Y.Doc) => {
    const ymap = ydoc.getMap('mindmap');
    const data = ymap.get('data');

    await this.app.db.getRepository('mindmaps').update({
      filterByTk: mindmapId,
      values: { data }
    });
  }, 5000);
}
```

### 3.5 客户端实现示例

```typescript
// packages/core/client/src/Application.tsx
export class MindMapApplication {
  router: RouterManager;
  pluginManager: PluginManager;
  apiClient: APIClient;
  mindmapEngine: MindMapEngine;
  aiService: AIService;

  constructor(options: ApplicationOptions) {
    // 初始化核心服务
    this.apiClient = new APIClient(options.apiClient);
    this.pluginManager = new PluginManager(options.plugins, this);
    this.router = new RouterManager(options.router, this);
    this.mindmapEngine = new MindMapEngine(options.mindmapEngine);
    this.aiService = new AIService(this.apiClient);
  }

  async load() {
    // 加载插件
    await this.pluginManager.load();

    // 注册路由
    this.router.add('mindmap', {
      path: '/mindmap/:id',
      component: MindMapEditor
    });

    this.router.add('mindmaps', {
      path: '/mindmaps',
      component: MindMapList
    });
  }

  mount(container: string) {
    const root = createRoot(document.querySelector(container));
    root.render(<AppComponent app={this} />);
  }
}

// 脑图编辑器组件
function MindMapEditor() {
  const { id } = useParams();
  const app = useApp();
  const [mindmap, setMindmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const engineRef = useRef<MindMapEngineInstance>();

  // 加载脑图
  useEffect(() => {
    async function load() {
      const response = await app.apiClient.request({
        resource: 'mindmaps',
        action: 'get',
        params: { filterByTk: id, appends: ['nodes'] }
      });
      setMindmap(response.data.data);
      setLoading(false);
    }
    load();
  }, [id]);

  // 初始化引擎
  useEffect(() => {
    if (mindmap && !engineRef.current) {
      engineRef.current = app.mindmapEngine.create({
        container: '#mindmap-container',
        data: mindmap.data,
        theme: mindmap.theme,
        onChange: handleChange
      });
    }
  }, [mindmap]);

  // 实时协作
  useCollaboration(id, engineRef.current);

  // AI 扩展
  async function handleAIExpand(nodeId: string) {
    const suggestions = await app.aiService.expandNode(id, nodeId);
    engineRef.current.addNodes(suggestions, nodeId);
  }

  if (loading) return <Spin />;

  return (
    <div className="mindmap-editor">
      <MindMapToolbar
        onAIExpand={handleAIExpand}
        onExport={handleExport}
        onShare={handleShare}
      />
      <div id="mindmap-container" />
      <MindMapProperties />
    </div>
  );
}

// 协作 Hook
function useCollaboration(mindmapId: string, engine: MindMapEngineInstance) {
  const app = useApp();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!engine) return;

    // 使用 Yjs
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      app.ws.url,
      `mindmap:${mindmapId}`,
      ydoc
    );

    const ymap = ydoc.getMap('mindmap');

    // 监听远程变化
    ymap.observe((event) => {
      const data = ymap.get('data');
      engine.load(data);
    });

    // 监听本地变化
    engine.on('change', (data) => {
      ymap.set('data', data);
    });

    // 监听用户
    provider.on('users', (users) => {
      setUsers(users);
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [mindmapId, engine]);

  return users;
}
```

### 3.6 推荐的脑图引擎

#### 方案一：集成现有库

**推荐库**:
1. **jsMind** - 轻量级，易于集成
2. **MindElixir** - 现代化，功能丰富
3. **Markmap** - Markdown 转脑图

**优势**: 快速开发，成熟稳定

#### 方案二：自研引擎

**技术选择**:
- **Canvas / SVG**: 渲染层
- **D3.js**: 布局算法和数据绑定
- **React**: 组件化

**优势**: 完全可控，深度定制

**推荐混合方案**: 使用现有库作为基础，扩展自定义功能

---

## 四、关键最佳实践

### 4.1 代码组织

✅ **使用 Monorepo**
- 清晰的职责划分
- 便于代码复用
- 统一版本管理

✅ **模块化设计**
- 每个功能独立为插件
- 插件可以组合使用
- 降低耦合度

✅ **TypeScript**
- 类型安全
- 更好的 IDE 支持
- 减少运行时错误

### 4.2 数据库设计

✅ **三层抽象**
- Collection: 业务模型
- Repository: 数据访问
- Database: 物理存储

✅ **声明式定义**
```typescript
db.collection({
  name: 'mindmaps',
  fields: [...]
});
```

✅ **关系映射**
- belongsTo / hasMany / belongsToMany
- 自动生成关联查询

### 4.3 API 设计

✅ **RESTful 风格**
```
/api/<resource>:<action>?<params>
```

✅ **统一参数**
```typescript
{
  filter: { field: { $op: value } },
  fields: ['field1', 'field2'],
  appends: ['relation1'],
  sort: ['-createdAt'],
  page: 1,
  pageSize: 20
}
```

✅ **错误处理**
- 统一错误格式
- HTTP 状态码正确使用
- 详细错误信息

### 4.4 前端架构

✅ **组件化**
- 小而专注的组件
- Props 明确类型
- 可复用性高

✅ **Hooks 优先**
- 逻辑复用
- 代码简洁
- 易于测试

✅ **状态管理**
- 局部状态: useState
- 全局状态: Context
- 服务器状态: React Query / SWR

### 4.5 协作功能

✅ **使用 CRDT**
- Yjs: 成熟的 CRDT 库
- 自动冲突解决
- 支持离线编辑

✅ **WebSocket 通信**
- 实时同步
- 用户状态广播
- 游标共享

### 4.6 AI 集成

✅ **服务抽象**
```typescript
interface AIService {
  expandNode(node, context): Promise<Node[]>;
  generate(prompt): Promise<Mindmap>;
  organize(mindmap): Promise<Mindmap>;
}
```

✅ **支持多种后端**
- OpenAI GPT-4
- Anthropic Claude
- 本地模型

✅ **上下文管理**
- 提供充分上下文
- Token 优化
- 错误重试

### 4.7 测试策略

✅ **单元测试**
- Jest for Node.js
- Vitest for TypeScript
- 覆盖核心逻辑

✅ **集成测试**
- API 测试
- 数据库测试
- 插件测试

✅ **E2E 测试**
- Playwright / Cypress
- 关键用户流程
- 视觉回归测试

---

## 五、性能优化建议

### 5.1 服务端优化

- **数据库查询优化**
  - 使用索引
  - N+1 问题 (使用 appends)
  - 分页查询

- **缓存策略**
  - Redis 缓存热数据
  - HTTP 缓存头
  - 查询结果缓存

- **异步处理**
  - 任务队列 (Bull)
  - 后台任务
  - WebSocket 推送

### 5.2 客户端优化

- **代码分割**
  - 路由级分割
  - 组件懒加载
  - 插件动态加载

- **渲染优化**
  - React.memo
  - useMemo / useCallback
  - 虚拟滚动

- **网络优化**
  - HTTP/2
  - 请求合并
  - 预加载

### 5.3 脑图性能

- **大型脑图**
  - 虚拟渲染 (只渲染可见部分)
  - 节点折叠
  - 按需加载子节点

- **协作优化**
  - 操作防抖
  - 增量同步
  - 乐观更新

---

## 六、安全考虑

### 6.1 认证授权

- **JWT Token**
  - Access Token + Refresh Token
  - Token 过期处理
  - 安全存储

- **ACL 权限**
  - 基于角色的访问控制
  - 资源级权限
  - 操作级权限

### 6.2 数据安全

- **SQL 注入防护**
  - 参数化查询
  - ORM 使用

- **XSS 防护**
  - 输入过滤
  - 输出转义
  - CSP 策略

- **CSRF 防护**
  - CSRF Token
  - SameSite Cookie

### 6.3 API 安全

- **速率限制**
  - 按 IP / 用户限流
  - 防止滥用

- **输入验证**
  - Schema 验证
  - 参数白名单

---

## 七、开发流程建议

### 第一阶段：核心基础 (1-2个月)

1. **搭建项目架构**
   - Monorepo 初始化
   - 核心包创建
   - 构建配置

2. **实现核心框架**
   - Application 类
   - Plugin 系统
   - Database 层

3. **基础 CRUD API**
   - Mindmap 资源
   - Node 资源
   - 用户认证

4. **基础前端**
   - 应用框架
   - 路由系统
   - 基础组件

### 第二阶段：脑图功能 (1-2个月)

1. **脑图引擎**
   - 集成或开发引擎
   - 渲染实现
   - 交互功能

2. **节点操作**
   - 增删改查
   - 拖拽排序
   - 样式定制

3. **布局算法**
   - 自动布局
   - 手动调整
   - 保存位置

### 第三阶段：协作功能 (1个月)

1. **实时协作**
   - WebSocket 服务
   - Yjs 集成
   - 冲突解决

2. **权限控制**
   - 访问权限
   - 编辑权限
   - 分享链接

### 第四阶段：AI 功能 (1个月)

1. **AI 服务**
   - OpenAI 集成
   - Prompt 工程
   - 错误处理

2. **智能功能**
   - 节点扩展
   - 内容生成
   - 自动整理

### 第五阶段：高级功能 (1-2个月)

1. **版本控制**
   - 历史记录
   - 版本对比
   - 版本恢复

2. **导入导出**
   - 多格式导出
   - 模板系统
   - 批量操作

3. **优化和测试**
   - 性能优化
   - 测试覆盖
   - 文档完善

---

## 八、总结

### NocoBase 值得学习的核心点

1. ✅ **微内核插件化** - 所有功能模块化，易于扩展
2. ✅ **完善的生命周期** - 清晰的插件管理
3. ✅ **三层数据抽象** - Collection-Repository-Database
4. ✅ **Schema 驱动 UI** - 配置化界面降低开发成本
5. ✅ **事件驱动架构** - 松耦合的系统设计
6. ✅ **Monorepo 管理** - 清晰的代码组织

### CDM 项目关键建议

1. ✅ **采用插件化架构** - 便于功能扩展和维护
2. ✅ **使用 CRDT 实现协作** - Yjs 成熟稳定
3. ✅ **AI 服务抽象** - 支持多种 AI 后端
4. ✅ **RESTful API 设计** - 统一规范的接口
5. ✅ **渐进式开发** - 从核心功能逐步扩展
6. ✅ **重视测试** - 保证代码质量

### 技术选型建议

**服务端**:
- Koa 2 (轻量级)
- Sequelize (ORM)
- PostgreSQL (数据库)
- Redis (缓存)
- Yjs (CRDT)

**客户端**:
- React 18
- Ant Design 5
- Zustand (状态)
- Axios (HTTP)
- 脑图引擎 (自研或集成)

---

**文档版本**: v1.0
**创建日期**: 2025-12-15
**分析目标**: NocoBase v1.9.25
**适用项目**: CDM 脑图项目

**作者**: Claude (Sonnet 4.5)
**GitHub**: https://github.com/nocobase/nocobase
