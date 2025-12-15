# NocoBase 架构与设计模式深度分析报告

## 一、项目概览

NocoBase 是一个极易扩展的开源无代码/低代码开发平台，采用微内核插件化架构，支持 AI 集成、数据模型驱动的开发方式。

**核心特点：**
- 数据模型驱动而非表单驱动
- 完全插件化的微内核架构
- 前后端分离设计
- 支持多数据源
- 强大的扩展能力

**GitHub**: https://github.com/nocobase/nocobase
**版本**: 1.9.25
**Star**: 12k+
**License**: AGPL-3.0 / 商业许可双授权

---

## 二、Monorepo 项目结构

### 2.1 工作空间组织

NocoBase 采用 **Lerna + Yarn Workspaces** 的 monorepo 管理方案：

```json
// lerna.json
{
  "version": "1.9.25",
  "npmClient": "yarn",
  "useWorkspaces": true,
  "npmClientArgs": ["--ignore-engines"]
}

// package.json
{
  "workspaces": [
    "packages/*/*",
    "packages/*/*/*"
  ]
}
```

### 2.2 目录结构

```
nocobase/
├── packages/
│   ├── core/              # 核心包 (23个)
│   │   ├── app/           # 应用入口
│   │   ├── server/        # 服务端核心
│   │   ├── client/        # 客户端核心
│   │   ├── database/      # 数据库抽象层
│   │   ├── resourcer/     # RESTful 资源管理
│   │   ├── acl/           # 访问控制
│   │   ├── auth/          # 认证系统
│   │   ├── cache/         # 缓存管理
│   │   ├── cli/           # 命令行工具
│   │   ├── logger/        # 日志系统
│   │   ├── data-source-manager/  # 数据源管理
│   │   ├── actions/       # 通用 Actions
│   │   ├── build/         # 构建工具
│   │   ├── evaluators/    # 表达式求值
│   │   ├── lock-manager/  # 分布式锁
│   │   ├── snowflake-id/  # ID 生成器
│   │   ├── telemetry/     # 遥测
│   │   ├── test/          # 测试工具
│   │   ├── utils/         # 工具函数
│   │   ├── sdk/           # SDK
│   │   └── devtools/      # 开发工具
│   │
│   ├── plugins/           # 插件包 (~90个)
│   │   └── @nocobase/
│   │       ├── plugin-acl/                    # 权限控制
│   │       ├── plugin-workflow/               # 工作流
│   │       ├── plugin-ui-schema-storage/      # UI Schema 存储
│   │       ├── plugin-users/                  # 用户管理
│   │       ├── plugin-auth/                   # 认证
│   │       ├── plugin-collection-manager/     # 集合管理
│   │       ├── plugin-file-manager/           # 文件管理
│   │       ├── plugin-ai/                     # AI 功能
│   │       ├── plugin-data-visualization/     # 数据可视化
│   │       ├── plugin-mobile/                 # 移动端
│   │       └── ... (85+ 插件)
│   │
│   └── presets/           # 预设包
│       └── nocobase/      # 默认预设 (包含所有内置插件)
│
├── examples/              # 示例代码
│   ├── api-client/
│   ├── app/
│   └── database/
│
├── docker/                # Docker 配置
│   ├── nocobase/
│   ├── app-mysql/
│   ├── app-postgres/
│   └── app-sqlite/
│
├── scripts/               # 构建脚本
├── locales/               # 国际化资源
├── lerna.json
├── package.json
├── tsconfig.json
└── yarn.lock
```

### 2.3 设计优势

1. **松耦合模块化**
   - 每个包独立管理依赖和版本
   - 通过 `@nocobase/*` 包名引用
   - 便于独立开发和测试

2. **统一版本管理**
   - 所有包使用相同版本号 (1.9.25)
   - Lerna 自动管理版本发布
   - 确保包之间兼容性

3. **灵活的构建策略**
   - 支持增量构建
   - 可以只构建修改的包
   - 提高开发效率

4. **清晰的职责划分**
   - core: 核心框架
   - plugins: 功能插件
   - presets: 预设组合

---

## 三、插件系统架构

### 3.1 微内核设计理念

NocoBase 的核心设计哲学是 **"一切皆插件"** (Everything is a Plugin)：

```
┌─────────────────────────────────────────────────┐
│         Application (微内核)                     │
│  ┌──────────────────────────────────────────┐  │
│  │   Plugin Manager                          │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐     │  │
│  │  │Plugin A│  │Plugin B│  │Plugin C│ ... │  │
│  │  └────────┘  └────────┘  └────────┘     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Core Services (最小化核心)               │  │
│  │  - Database                               │  │
│  │  - Resourcer (API Router)                │  │
│  │  - ACL                                    │  │
│  │  - DataSourceManager                     │  │
│  │  - CacheManager                          │  │
│  │  - Logger                                │  │
│  │  - I18n                                  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**微内核特点：**
- 核心只提供基础设施
- 所有业务功能都是插件
- 插件可以扩展插件
- 运行时动态加载/卸载

### 3.2 插件生命周期

#### 服务端插件基类

```typescript
// packages/core/server/src/plugin.ts
export abstract class Plugin<O = any> implements PluginInterface {
  options: any;
  app: Application;
  model: Model;  // 插件配置模型
  state: any = {};

  constructor(app: Application, options?: any) {
    this.app = app;
    this.setOptions(options);
  }

  // 快捷访问器
  get name(): string { return this.options.name; }
  get pm(): PluginManager { return this.app.pm; }
  get db(): Database { return this.app.db; }
  get log(): Logger { return this.app.log.child({ module: this.name }); }

  // 生命周期钩子
  async beforeLoad?(): Promise<void>;   // 加载前 (注册迁移、模型等)
  async load(): Promise<void>;          // 加载 (注册资源、中间件等)
  async install?(): Promise<void>;      // 安装 (初始化数据等)
  async afterAdd?(): Promise<void>;     // 添加后
  async afterEnable?(): Promise<void>;  // 启用后
  async afterDisable?(): Promise<void>; // 禁用后
  async remove?(): Promise<void>;       // 移除
}
```

#### 客户端插件基类

```typescript
// packages/core/client/src/application/Plugin.ts
export class Plugin<T = any> {
  constructor(
    public options: T,
    protected app: Application,
  ) {}

  // 快捷访问器
  get pluginManager() { return this.app.pluginManager; }
  get router() { return this.app.router; }
  get schemaInitializerManager() { return this.app.schemaInitializerManager; }
  get schemaSettingsManager() { return this.app.schemaSettingsManager; }
  get dataSourceManager() { return this.app.dataSourceManager; }

  // 生命周期
  async afterAdd() {}
  async beforeLoad() {}
  async load() {}

  // 国际化
  t(text: string, options?: any) {
    return this.app.i18n.t(text, { ns: this.options?.['packageName'], ...options });
  }
}
```

#### 生命周期流程图

```
插件添加
   ↓
beforeLoad  ← 注册数据库迁移、模型、字段类型等
   ↓
 load       ← 注册资源、中间件、事件监听器等
   ↓
afterAdd
   ↓
(插件已加载但未启用)
   ↓
install    ← 首次安装时执行，初始化数据
   ↓
afterEnable ← 插件启用后执行
   ↓
(插件运行中)
   ↓
afterDisable ← 插件禁用后执行
   ↓
 remove     ← 插件移除时执行，清理数据
```

### 3.3 插件管理器实现

#### 核心 PluginManager 类

```typescript
// packages/core/server/src/plugin-manager/plugin-manager.ts
export class PluginManager {
  app: Application;
  collection: Collection;  // applicationPlugins 表

  // 插件实例管理
  pluginInstances = new Map<typeof Plugin, Plugin>();
  pluginAliases = new Map<string, Plugin>();

  constructor(options: PluginManagerOptions) {
    this.app = options.app;

    // 注册插件配置 Collection
    this.collection = this.app.db.collection({
      name: 'applicationPlugins',
      fields: [
        { name: 'name', type: 'string', unique: true },
        { name: 'packageName', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'enabled', type: 'boolean', defaultValue: false },
        { name: 'installed', type: 'boolean', defaultValue: false },
        { name: 'builtIn', type: 'boolean' },
        { name: 'options', type: 'json' },
      ]
    });

    // 注册 RESTful 资源
    this.app.resourcer.define({
      name: 'pm',  // Plugin Manager
      actions: {
        add: 'pm.add',
        enable: 'pm.enable',
        disable: 'pm.disable',
        remove: 'pm.remove',
        list: 'pm.list',
      }
    });
  }

  // 添加插件
  async add(name: string, options?: any): Promise<void> {
    // 1. 解析插件名称
    const { packageName } = await this.parseName(name);

    // 2. 检查兼容性
    const packageJson = await this.getPackageJson(packageName);
    await checkAndGetCompatible(packageName, packageJson);

    // 3. 加载插件类
    const Plugin = await importModule(packageName);

    // 4. 创建实例
    const instance = new Plugin(this.app, options);

    // 5. 注册实例
    this.pluginInstances.set(Plugin, instance);
    this.pluginAliases.set(name, instance);
    this.pluginAliases.set(packageName, instance);

    // 6. 执行生命周期
    await instance.beforeLoad?.();
    await instance.load?.();
    await instance.afterAdd?.();

    // 7. 持久化到数据库
    await this.repository.create({
      values: {
        name,
        packageName,
        version: packageJson.version,
        enabled: options?.enabled || false,
        builtIn: options?.builtIn || false,
        options,
      }
    });
  }

  // 启用插件
  async enable(name: string): Promise<void> {
    const plugin = this.get(name);

    if (!plugin.installed) {
      await plugin.install?.();
      await this.repository.update({
        filterByTk: name,
        values: { installed: true }
      });
    }

    await plugin.afterEnable?.();

    await this.repository.update({
      filterByTk: name,
      values: { enabled: true }
    });

    // 触发事件
    await this.app.emitAsync('plugin:afterEnable', plugin);
  }

  // 禁用插件
  async disable(name: string): Promise<void> {
    const plugin = this.get(name);

    await plugin.afterDisable?.();

    await this.repository.update({
      filterByTk: name,
      values: { enabled: false }
    });

    await this.app.emitAsync('plugin:afterDisable', plugin);
  }

  // 移除插件
  async remove(name: string): Promise<void> {
    const plugin = this.get(name);

    // 先禁用
    if (plugin.enabled) {
      await this.disable(name);
    }

    // 执行清理
    await plugin.remove?.();

    // 从内存中移除
    this.pluginInstances.delete(plugin.constructor as typeof Plugin);
    this.pluginAliases.delete(name);

    // 从数据库中删除
    await this.repository.destroy({ filterByTk: name });

    await this.app.emitAsync('plugin:afterRemove', plugin);
  }

  // 获取插件实例
  get<T extends Plugin>(name: string | typeof Plugin): T {
    if (typeof name === 'string') {
      return this.pluginAliases.get(name) as T;
    }
    return this.pluginInstances.get(name) as T;
  }

  // 解析插件名称 (支持短名称和完整包名)
  static async parseName(nameOrPkg: string): Promise<{ name: string; packageName: string }> {
    // 如果是完整包名
    if (nameOrPkg.startsWith('@')) {
      return {
        name: nameOrPkg.split('/').pop()!.replace(/^plugin-/, ''),
        packageName: nameOrPkg
      };
    }

    // 尝试查找本地包
    const prefixes = ['@nocobase/plugin-', '@nocobase/preset-'];
    for (const prefix of prefixes) {
      const packageName = `${prefix}${nameOrPkg}`;
      if (await this.packageExists(packageName)) {
        return { name: nameOrPkg, packageName };
      }
    }

    throw new Error(`Plugin ${nameOrPkg} not found`);
  }
}
```

#### 客户端插件管理器

```typescript
// packages/core/client/src/application/PluginManager.ts
export class PluginManager {
  protected pluginInstances: Map<typeof Plugin, Plugin> = new Map();
  protected pluginsAliases: Record<string, Plugin> = {};

  constructor(
    protected _plugins: PluginType[],
    protected loadRemotePlugins: boolean,
    protected app: Application,
  ) {
    this.initPlugins = this.init(_plugins);
  }

  async init(_plugins: PluginType[]) {
    // 1. 加载静态插件 (编译时已知)
    await this.initStaticPlugins(_plugins);

    // 2. 加载远程插件 (从服务端获取)
    if (this.loadRemotePlugins) {
      await this.initRemotePlugins();
    }
  }

  private async initStaticPlugins(_plugins: PluginType[] = []) {
    for await (const plugin of _plugins) {
      const pluginClass = Array.isArray(plugin) ? plugin[0] : plugin;
      const opts = Array.isArray(plugin) ? plugin[1] : undefined;
      await this.add(pluginClass, opts);
    }
  }

  private async initRemotePlugins() {
    // 从服务端获取已启用插件列表
    const res = await this.app.apiClient.request({ url: 'pm:listEnabled' });
    const pluginList: PluginData[] = res?.data?.data || [];

    // 动态加载插件 (通过 RequireJS 或动态 import)
    const plugins = await getPlugins({
      requirejs: this.app.requirejs,
      pluginData: pluginList,
      devDynamicImport: this.app.devDynamicImport,
    });

    for await (const [name, pluginClass] of plugins) {
      const info = pluginList.find((item) => item.name === name);
      await this.add(pluginClass, info);
    }
  }

  async add<T = any>(plugin: typeof Plugin, opts: PluginOptions<T> = {}) {
    const instance = new plugin(opts, this.app);

    this.pluginInstances.set(plugin, instance);

    if (opts.name) {
      this.pluginsAliases[opts.name] = instance;
    }
    if (opts.packageName) {
      this.pluginsAliases[opts.packageName] = instance;
    }

    await instance.afterAdd();
  }

  get<T extends typeof Plugin>(PluginClass: T): InstanceType<T>;
  get<T extends {}>(name: string): T;
  get(nameOrPluginClass: any) {
    if (typeof nameOrPluginClass === 'string') {
      return this.pluginsAliases[nameOrPluginClass];
    }
    return this.pluginInstances.get(nameOrPluginClass.default || nameOrPluginClass);
  }
}
```

### 3.4 插件示例：ACL 权限控制

#### 插件配置

```json
// packages/plugins/@nocobase/plugin-acl/package.json
{
  "name": "@nocobase/plugin-acl",
  "displayName": "Access control",
  "displayName.zh-CN": "权限控制",
  "description": "Based on roles, resources, and actions...",
  "version": "1.9.25",
  "main": "./dist/server/index.js",
  "keywords": ["Users & permissions"]
}
```

#### 服务端实现

```typescript
// packages/plugins/@nocobase/plugin-acl/src/server/server.ts
export class PluginACLServer extends Plugin {
  // 快捷访问 ACL 实例
  get acl() {
    return this.app.acl;
  }

  async beforeLoad() {
    // 1. 注册数据库迁移
    this.db.addMigrations({
      namespace: this.name,
      directory: resolve(__dirname, './migrations'),
      context: { plugin: this },
    });

    // 2. 注册模型
    this.app.db.registerModels({
      RoleResourceActionModel,
      RoleResourceModel,
      RoleModel,
    });

    // 3. 注册 ACL 片段 (权限模板)
    this.app.acl.registerSnippet({
      name: `pm.${this.name}.roles`,
      actions: [
        'roles:*',
        'roles.snippets:*',
        'availableActions:list',
        'roles.collections:list',
        'roles.resources:*',
        // ... 更多权限
      ],
    });
  }

  async load() {
    // 1. 注册 RESTful 资源
    this.app.resourcer.define(availableActionResource);
    this.app.resourcer.define(roleCollectionsResource);

    // 2. 注册 Action Handlers
    this.app.resourcer.registerActionHandler('roles:check', checkAction);
    this.app.resourcer.registerActionHandler('users:setDefaultRole', setDefaultRole);

    // 3. 注册中间件
    this.app.resourcer.use(setCurrentRole);
    this.app.resourcer.use(checkAssociationOperate);

    // 4. 监听数据库事件
    this.db.on('users.afterCreateWithAssociations', async (model, options) => {
      const { transaction } = options;

      // 为新用户分配默认角色
      const defaultRole = await this.app.db.getRepository('roles').findOne({
        filter: { default: true },
        transaction,
      });

      if (defaultRole && (await model.countRoles({ transaction })) === 0) {
        await model.addRoles(defaultRole, { transaction });
      }
    });

    // 5. 监听应用事件
    this.app.on('acl:writeRoleToACL', async (roleModel: RoleModel) => {
      await this.writeRoleToACL(roleModel, { withOutResources: true });
    });

    // 6. ACL 前置处理
    this.app.acl.beforeGrantAction((ctx) => {
      const actionName = this.app.acl.resolveActionAlias(ctx.actionName);
      const collection = this.app.db.getCollection(ctx.resourceName);

      if (!collection) return;

      // 将关系字段转换为 appends 参数
      const fieldsParams = ctx.params.fields;
      if (fieldsParams && (actionName === 'view' || actionName === 'export')) {
        const associationsFields = fieldsParams.filter((fieldName) => {
          const field = collection.getField(fieldName);
          return field instanceof RelationField;
        });

        ctx.params = {
          ...ctx.params,
          fields: lodash.difference(fieldsParams, associationsFields),
          appends: associationsFields,
        };
      }
    });
  }

  // 将角色配置写入 ACL 内存
  async writeRoleToACL(role: RoleModel, options: any = {}) {
    const transaction = options?.transaction;

    // 写入角色
    role.writeToAcl({ acl: this.acl, withOutStrategy: true });

    if (options.withOutResources) return;

    // 写入资源权限
    let resources = role.get('resources') as RoleResourceModel[];
    if (!resources) {
      resources = await role.getResources({ transaction });
    }

    for (const resource of resources) {
      await this.writeResourceToACL(resource, transaction);
    }
  }
}

export default PluginACLServer;
```

#### 客户端实现

```typescript
// packages/plugins/@nocobase/plugin-acl/src/client/index.tsx
export class PluginACLClient extends Plugin {
  async load() {
    // 1. 注册路由
    this.app.router.add('admin.settings.roles', {
      path: '/admin/settings/roles',
      Component: RoleManagerPage,
    });

    // 2. 注册菜单
    this.app.pluginSettingsManager.add('acl', {
      title: '{{t("ACL")}}',
      icon: 'SafetyCertificateOutlined',
      Component: RoleSettings,
    });

    // 3. 注册 Schema 组件
    this.app.addComponents({
      RoleTable,
      RoleForm,
      PermissionMatrix,
    });

    // 4. 注册 ACL 检查 hooks
    this.app.addProvider(ACLProvider);
  }
}

export default PluginACLClient;
```

---

## 四、前后端分离架构

### 4.1 整体架构图

```
┌──────────────────────────────────────────────────────────┐
│                      Client Layer                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  React Application (@nocobase/client)                │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Plugin System                                 │  │ │
│  │  │  - Static Plugins (编译时)                     │  │ │
│  │  │  - Remote Plugins (运行时动态加载)             │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Core Managers                                 │  │ │
│  │  │  - Router Manager                              │  │ │
│  │  │  - DataSource Manager                          │  │ │
│  │  │  - Schema Initializer Manager                  │  │ │
│  │  │  - Schema Settings Manager                     │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Communication Layer                           │  │ │
│  │  │  - API Client (Axios)                          │  │ │
│  │  │  - WebSocket Client                            │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                      ↕ HTTP/WebSocket
┌──────────────────────────────────────────────────────────┐
│                     Server Layer                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Koa Application (@nocobase/server)                  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Middleware Stack                              │  │ │
│  │  │  ┌─────────────────────────────────────────┐  │  │ │
│  │  │  │ cors → bodyParser → i18n → ACL → ...   │  │  │ │
│  │  │  └─────────────────────────────────────────┘  │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Resourcer (RESTful Router)                   │  │ │
│  │  │  - Resource Definition                         │  │ │
│  │  │  - Action Handlers                             │  │ │
│  │  │  - Middleware Pipeline                         │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Plugin System                                 │  │ │
│  │  │  - Plugin Manager                              │  │ │
│  │  │  - Plugin Lifecycle                            │  │ │
│  │  │  - Plugin Repository                           │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Core Services                                 │  │ │
│  │  │  - Database Manager                            │  │ │
│  │  │  - DataSource Manager                          │  │ │
│  │  │  - ACL                                         │  │ │
│  │  │  - Auth Manager                                │  │ │
│  │  │  - Cache Manager                               │  │ │
│  │  │  - Logger                                      │  │ │
│  │  │  - I18n                                        │  │ │
│  │  │  - Telemetry                                   │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          ↕
┌──────────────────────────────────────────────────────────┐
│                   Database Layer                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Database Abstraction (@nocobase/database)          │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │  Collection → Repository → Sequelize         │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Physical Database                                   │ │
│  │  - PostgreSQL / MySQL / MariaDB / SQLite            │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 服务端架构详解

#### Application 核心类

```typescript
// packages/core/server/src/application.ts
export class Application extends Koa {
  // === 核心服务 ===
  db: Database;                          // 数据库管理器
  resourcer: Resourcer;                  // RESTful 资源管理器
  acl: ACL;                              // 访问控制列表
  pm: PluginManager;                     // 插件管理器
  dataSourceManager: DataSourceManager;  // 数据源管理器

  // === 辅助服务 ===
  i18n: i18n;                            // 国际化
  logger: Logger;                        // 日志
  cacheManager: CacheManager;            // 缓存管理
  telemetry: Telemetry;                  // 遥测
  lockManager: LockManager;              // 分布式锁
  authManager: AuthManager;              // 认证管理

  // === 工具服务 ===
  cronJobManager: CronJobManager;        // 定时任务
  eventQueue: EventQueue;                // 事件队列
  pubSubManager: PubSubManager;          // 发布订阅
  redisConnectionManager: RedisConnectionManager;  // Redis 连接

  constructor(options: ApplicationOptions) {
    super();

    // 1. 初始化数据库
    this.db = this.createDatabase(options.database);

    // 2. 初始化数据源管理器
    this.dataSourceManager = new DataSourceManager({
      app: this,
      logger: options.logger,
    });

    // 3. 初始化资源管理器
    this.resourcer = createResourcer(options.resourcer);

    // 4. 初始化 ACL
    this.acl = createACL();

    // 5. 初始化插件管理器
    this.pm = new PluginManager({
      app: this,
      plugins: options.plugins,
    });

    // 6. 初始化其他服务...
    this.i18n = createI18n(options.i18n);
    this.logger = createLogger(options.logger);
    this.cacheManager = createCacheManager(options.cache);

    // 7. 注册中间件
    this.registerMiddlewares();

    // 8. 加载插件
    this.load();
  }

  // 注册中间件栈
  registerMiddlewares() {
    // CORS
    this.use(cors());

    // Body Parser
    this.use(bodyParser());

    // I18n
    this.use(i18n.middleware());

    // 日志
    this.use(requestLogger());

    // 数据源
    this.use(this.dataSourceManager.middleware());

    // ACL
    this.use(this.acl.middleware());

    // Resourcer (RESTful 路由)
    this.use(this.resourcer.middleware());
  }

  // 加载插件
  async load() {
    // 加载预设插件
    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        await this.pm.add(plugin);
      }
    }

    // 从数据库加载已启用插件
    const enabledPlugins = await this.db.getRepository('applicationPlugins')
      .find({ filter: { enabled: true } });

    for (const plugin of enabledPlugins) {
      await this.pm.add(plugin.packageName, plugin.options);
    }
  }

  // 启动应用
  async start(options?: StartOptions) {
    // 1. 连接数据库
    await this.db.authenticate();

    // 2. 同步数据库 (开发环境)
    if (process.env.APP_ENV === 'development') {
      await this.db.sync();
    }

    // 3. 运行迁移
    await this.db.migrate();

    // 4. 触发启动前事件
    await this.emitAsync('beforeStart');

    // 5. 监听端口
    const port = options?.port || process.env.APP_PORT || 13000;
    this.listen(port);

    this.log.info(`Server started on port ${port}`);

    // 6. 触发启动后事件
    await this.emitAsync('afterStart');
  }
}
```

#### Koa 中间件栈流程

```
HTTP Request
    ↓
┌───────────────┐
│ CORS          │ ← 处理跨域
├───────────────┤
│ BodyParser    │ ← 解析请求体
├───────────────┤
│ I18n          │ ← 国际化
├───────────────┤
│ RequestLogger │ ← 请求日志
├───────────────┤
│ DataSource    │ ← 选择数据源 (x-data-source header)
├───────────────┤
│ Auth          │ ← 认证 (JWT/Session)
├───────────────┤
│ ACL           │ ← 权限检查
├───────────────┤
│ Resourcer     │ ← RESTful 路由分发
│               │   ↓
│   ┌────────────────────┐
│   │ Resource Middleware│ ← 资源级中间件
│   ├────────────────────┤
│   │ Action Handler     │ ← 处理具体操作
│   └────────────────────┘
└───────────────┘
    ↓
HTTP Response
```

#### RESTful API 设计

**URL 格式：**
```
/api/<resource>:<action>?<params>
```

**标准操作：**
```bash
# Collection 操作
GET    /api/users                      # list (列表)
POST   /api/users                      # create (创建)
GET    /api/users:get?filterByTk=1     # get (获取单个)
PUT    /api/users:update?filterByTk=1  # update (更新)
DELETE /api/users:destroy?filterByTk=1 # destroy (删除)

# 关联操作
GET    /api/users/1/posts              # 获取用户的文章
POST   /api/users/1/posts              # 为用户创建文章
GET    /api/users/1/posts:get?filterByTk=1  # 获取用户的某篇文章

# 自定义操作
POST   /api/users:register             # 自定义注册操作
POST   /api/posts:publish?filterByTk=1 # 自定义发布操作
GET    /api/users:profile              # 获取当前用户资料
```

**查询参数：**
```typescript
interface QueryParams {
  // 筛选
  filter?: {
    field: { $op: value }
  };

  // 字段选择
  fields?: string[];

  // 关联加载
  appends?: string[];

  // 排序
  sort?: string[];

  // 分页
  page?: number;
  pageSize?: number;

  // 或游标分页
  cursor?: string;
}

// 示例
GET /api/posts?filter[status]=published&fields=title,content&appends=author,tags&sort=-createdAt&page=1&pageSize=20
```

#### Resourcer 资源管理器

```typescript
// packages/core/resourcer/src/resourcer.ts
export class Resourcer {
  resources: Map<string, Resource>;
  middlewares: Middleware[];

  // 定义资源
  define(options: ResourceOptions): Resource {
    const resource = new Resource(options, this);
    this.resources.set(options.name, resource);
    return resource;
  }

  // 注册 Action Handler
  registerActionHandler(name: string, handler: HandlerType) {
    const [resourceName, actionName] = name.split(':');
    const resource = this.resources.get(resourceName);
    resource.addAction(actionName, handler);
  }

  // 中间件
  middleware(): Middleware {
    return async (ctx, next) => {
      // 1. 解析 URL
      const params = parseRequest(ctx);

      // 2. 查找资源
      const resource = this.resources.get(params.resourceName);
      if (!resource) {
        ctx.throw(404, 'Resource not found');
      }

      // 3. 查找 Action
      const action = resource.actions.get(params.actionName);
      if (!action) {
        ctx.throw(404, 'Action not found');
      }

      // 4. 设置上下文
      ctx.action = action;
      ctx.action.params = params;

      // 5. 执行资源中间件 + Action Handler
      const composed = compose([
        ...this.middlewares,
        ...resource.middlewares,
        action.handler,
      ]);

      await composed(ctx, next);
    };
  }
}

// Resource 类
export class Resource {
  options: ResourceOptions;
  actions: Map<ActionName, Action>;
  middlewares: Middleware[];

  constructor(options: ResourceOptions, resourcer: Resourcer) {
    this.options = options;
    this.middlewares = Middleware.toInstanceArray(options.middleware);

    // 注册标准 CRUD 操作
    const defaultActions = {
      list: async (ctx, next) => {
        const repository = ctx.db.getRepository(this.options.name);
        ctx.body = await repository.find(ctx.action.params);
        await next();
      },
      get: async (ctx, next) => {
        const repository = ctx.db.getRepository(this.options.name);
        ctx.body = await repository.findOne(ctx.action.params);
        await next();
      },
      create: async (ctx, next) => {
        const repository = ctx.db.getRepository(this.options.name);
        ctx.body = await repository.create(ctx.action.params);
        await next();
      },
      update: async (ctx, next) => {
        const repository = ctx.db.getRepository(this.options.name);
        ctx.body = await repository.update(ctx.action.params);
        await next();
      },
      destroy: async (ctx, next) => {
        const repository = ctx.db.getRepository(this.options.name);
        await repository.destroy(ctx.action.params);
        ctx.status = 204;
        await next();
      },
    };

    // 合并用户定义的 actions
    this.actions = Action.toInstanceMap(
      { ...defaultActions, ...options.actions },
      this
    );
  }
}
```

### 4.3 客户端架构详解

#### Application 核心类

```typescript
// packages/core/client/src/application/Application.tsx
export class Application {
  // === 核心管理器 ===
  router: RouterManager;                      // 路由管理
  pluginManager: PluginManager;               // 插件管理
  dataSourceManager: DataSourceManager;       // 数据源管理
  schemaInitializerManager: SchemaInitializerManager;  // Schema 初始化器
  schemaSettingsManager: SchemaSettingsManager;        // Schema 设置

  // === 通信层 ===
  apiClient: APIClient;                       // API 客户端
  ws: WebSocketClient;                        // WebSocket 客户端

  // === 辅助服务 ===
  i18n: i18next;                              // 国际化
  components: Record<string, ComponentType>;  // 组件注册表
  scopes: Record<string, any>;                // 全局作用域

  // === 状态 ===
  loading = true;
  maintained = false;
  maintaining = false;
  error = null;

  constructor(protected options: ApplicationOptions) {
    // 1. 初始化 API 客户端
    this.apiClient = options.apiClient instanceof APIClient
      ? options.apiClient
      : new APIClient(options.apiClient);

    // 2. 初始化 WebSocket
    if (options.ws !== false) {
      this.ws = new WebSocketClient(
        typeof options.ws === 'object' ? options.ws : {}
      );
    }

    // 3. 初始化国际化
    this.i18n = options.i18n || i18n;

    // 4. 初始化路由
    this.router = new RouterManager(options.router, this);

    // 5. 初始化数据源管理器
    this.dataSourceManager = new DataSourceManager(
      options.dataSourceManager,
      this
    );

    // 6. 初始化 Schema 管理器
    this.schemaInitializerManager = new SchemaInitializerManager(
      options.schemaInitializers,
      this
    );
    this.schemaSettingsManager = new SchemaSettingsManager(
      options.schemaSettings,
      this
    );

    // 7. 初始化插件管理器
    this.pluginManager = new PluginManager(
      options.plugins || [],
      options.loadRemotePlugins !== false,
      this
    );

    // 8. 注册默认组件
    this.components = {
      ...defaultAppComponents,
      ...options.components,
    };

    // 9. 注册全局作用域
    this.scopes = options.scopes || {};
  }

  // 加载应用
  async load() {
    try {
      this.loading = true;

      // 1. 加载插件
      await this.pluginManager.initPlugins;

      // 2. 加载所有插件
      for (const plugin of this.pluginManager.pluginInstances.values()) {
        await plugin.beforeLoad?.();
      }
      for (const plugin of this.pluginManager.pluginInstances.values()) {
        await plugin.load?.();
      }

      // 3. 加载完成
      this.loading = false;

    } catch (error) {
      this.error = error;
      this.hasLoadError = true;
      throw error;
    }
  }

  // 挂载应用
  mount(container: string | Element) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    const root = createRoot(el);
    root.render(<AppComponent app={this} />);

    return this;
  }

  // 添加提供者
  addProvider(provider: ComponentType, options?: any) {
    this.providers.push([provider, options]);
  }

  // 添加组件
  addComponents(components: Record<string, ComponentType>) {
    Object.assign(this.components, components);
  }

  // 添加作用域
  addScopes(scopes: Record<string, any>) {
    Object.assign(this.scopes, scopes);
  }
}
```

#### API Client 实现

```typescript
// packages/core/client/src/api-client/APIClient.ts
export class APIClient extends EventEmitter {
  axios: AxiosInstance;

  constructor(options?: APIClientOptions) {
    super();

    // 创建 Axios 实例
    this.axios = axios.create({
      baseURL: options?.baseURL || '/api',
      timeout: options?.timeout || 30000,
      headers: options?.headers || {},
    });

    // 请求拦截器
    this.axios.interceptors.request.use((config) => {
      // 添加认证 token
      const token = this.auth.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // 添加数据源
      const dataSource = this.getCurrentDataSource();
      if (dataSource) {
        config.headers['X-Data-Source'] = dataSource;
      }

      // 添加语言
      config.headers['X-Locale'] = this.app.i18n.language;

      return config;
    });

    // 响应拦截器
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // 未认证，跳转登录
          this.emit('unauthenticated', error);
        }
        return Promise.reject(error);
      }
    );
  }

  // 统一请求方法
  async request<T = any>(options: ResourceActionOptions): Promise<AxiosResponse<T>> {
    const { resource, action = 'list', params = {} } = options;

    // 构建 URL
    const url = this.buildURL(resource, action);

    // 构建请求配置
    const config: AxiosRequestConfig = {
      method: this.getMethod(action),
      url,
      params: this.getParams(params),
      data: this.getData(params),
    };

    return await this.axios.request<T>(config);
  }

  // 便捷方法
  async resource(name: string) {
    return {
      list: (params?) => this.request({ resource: name, action: 'list', params }),
      get: (params?) => this.request({ resource: name, action: 'get', params }),
      create: (params?) => this.request({ resource: name, action: 'create', params }),
      update: (params?) => this.request({ resource: name, action: 'update', params }),
      destroy: (params?) => this.request({ resource: name, action: 'destroy', params }),
    };
  }
}
```

#### React 组件结构

```typescript
// packages/core/client/src/application/components/AppComponent.tsx
export const AppComponent: FC<{ app: Application }> = ({ app }) => {
  // 组合所有 Provider
  const Providers = compose(
    // 1. 应用上下文
    [ApplicationContext.Provider, { value: app }],

    // 2. 国际化
    [I18nextProvider, { i18n: app.i18n }],

    // 3. API 客户端
    [APIClientProvider, { apiClient: app.apiClient }],

    // 4. Ant Design
    [AntdAppProvider],
    [GlobalThemeProvider],
    [CSSVariableProvider],

    // 5. 数据源
    [DataSourceApplicationProvider],

    // 6. Schema 组件
    [AppSchemaComponentProvider],

    // 7. 用户提供的 Provider
    ...app.providers,
  );

  return (
    <Providers>
      <Router>
        <Routes>
          {app.router.getRoutes().map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.component />}
            />
          ))}
        </Routes>
      </Router>
    </Providers>
  );
};
```

#### Hooks 使用示例

```typescript
// 使用应用实例
const app = useApp();

// 使用 API 客户端
const api = useAPIClient();
const { data, loading, error } = useRequest({
  resource: 'users',
  action: 'list',
  params: {
    filter: { status: 'active' },
    page: 1,
    pageSize: 20,
  }
});

// 使用数据源
const dataSource = useDataSource();
const collection = useCollection();

// 使用插件
const plugin = usePlugin(PluginName);

// 使用路由
const navigate = useNavigate();
const params = useParams();
```

---

继续第二部分...
