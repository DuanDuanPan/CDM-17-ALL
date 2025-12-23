# Story 2.9: APP 节点类型与工业软件集成 - 技术规范

Status: ready-for-dev
Created: 2025-12-23

---

## 1. 概述 (Overview)

### 1.1 目标

实现 APP 节点类型，允许用户在脑图中创建代表工业软件或 Web 应用的节点，支持配置应用信息、管理输入/输出文件，并模拟应用启动与执行流程。

### 1.2 核心价值

- 用户能在思维导图中**直接启动**相关工具（本地应用或 Web API）
- 实现**工作流一体化**：输入数据 → APP 执行 → 输出结果
- 提供**卫星应用库** Mock 数据，支持快速选择预配置的行业应用

### 1.3 范围边界

**In Scope:**
- APP 节点类型定义与可视化
- 三种应用来源配置（本地/远程/库选择）
- 输入/输出参数配置
- 文件上传/下载/预览
- 模拟执行状态（Idle → Running → Success）
- 数据持久化

**Out of Scope:**
- 真实的本地应用启动（需要 OS 级协议处理器）
- 实际的 Web API 调用（使用 Mock 响应）
- 长时间运行作业的后端排队系统

---

## 2. 类型定义 (Type Definitions)

### 2.1 NodeType 枚举扩展

```typescript
// packages/types/src/node-types.ts

export enum NodeType {
  ORDINARY = 'ORDINARY',
  TASK = 'TASK',
  REQUIREMENT = 'REQUIREMENT',
  PBS = 'PBS',
  DATA = 'DATA',
  APP = 'APP',  // 🆕 新增
}
```

### 2.2 APP 节点属性接口

```typescript
// packages/types/src/node-types.ts

/**
 * Story 2.9: APP 节点的应用来源类型
 */
export type AppSourceType = 'local' | 'remote' | 'library';

/**
 * Story 2.9: APP 执行状态
 */
export type AppExecutionStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Story 2.9: APP 输入参数配置
 */
export interface AppInput {
  id: string;                    // nanoid 生成
  key: string;                   // 参数名称 (e.g., "Orbit Altitude")
  value?: string;                // 参数值
  type: 'text' | 'number' | 'file';  // 参数类型
  required?: boolean;            // 是否必填
  fileId?: string;               // 如果 type='file'，关联上传文件的 ID
  fileName?: string;             // 上传文件名
}

/**
 * Story 2.9: APP 输出结果配置
 */
export interface AppOutput {
  id: string;                    // nanoid 生成
  key: string;                   // 输出名称 (e.g., "Trajectory File")
  type: 'text' | 'file';         // 输出类型
  value?: string;                // 文本值或文件 URL
  fileName?: string;             // 输出文件名
  mimeType?: string;             // 文件 MIME 类型 (用于预览)
  generatedAt?: string;          // 生成时间 (ISO 8601)
}

/**
 * Story 2.9: APP 节点属性
 */
export interface AppProps extends BaseNodeProps {
  // 来源配置
  appSourceType?: AppSourceType;      // 应用来源类型
  appPath?: string | null;            // 本地应用路径 (local)
  appUrl?: string | null;             // 远程应用 URL (remote)
  libraryAppId?: string | null;       // 应用库 ID (library)
  libraryAppName?: string | null;     // 应用库名称 (显示用)

  // I/O 配置
  inputs?: AppInput[];                // 输入参数列表
  outputs?: AppOutput[];              // 输出结果列表

  // 执行状态 (transient, 通常不持久化)
  executionStatus?: AppExecutionStatus;
  lastExecutedAt?: string | null;     // 上次执行时间
  errorMessage?: string | null;       // 错误信息
}
```

### 2.3 应用库条目接口

```typescript
// packages/types/src/app-library.ts (🆕 新文件)

/**
 * Story 2.9: 卫星应用库条目
 */
export interface AppLibraryEntry {
  id: string;                          // 唯一标识
  name: string;                        // 应用名称
  description?: string;                // 应用描述
  category: string;                    // 分类 (e.g., "轨道设计", "热分析")
  icon?: string;                       // 图标标识
  version?: string;                    // 版本号
  
  // 默认 I/O 模板
  defaultInputs: Omit<AppInput, 'id' | 'value' | 'fileId' | 'fileName'>[];
  defaultOutputs: Omit<AppOutput, 'id' | 'value' | 'fileName' | 'generatedAt'>[];
  
  // 执行配置
  executionType: 'local' | 'webapi';   // 执行方式
  protocolScheme?: string;             // 本地协议 (e.g., "matlab://")
  apiEndpoint?: string;                // Web API 端点
}
```

### 2.4 Zod Schema 验证

```typescript
// packages/types/src/node-types.ts (追加)

export const AppInputSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string().optional(),
  type: z.enum(['text', 'number', 'file']),
  required: z.boolean().optional(),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
});

export const AppOutputSchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.enum(['text', 'file']),
  value: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  generatedAt: z.string().optional(),
});

export const AppPropsSchema = z.object({
  appSourceType: z.enum(['local', 'remote', 'library']).optional(),
  appPath: z.string().nullable().optional(),
  appUrl: z.string().nullable().optional(),
  libraryAppId: z.string().nullable().optional(),
  libraryAppName: z.string().nullable().optional(),
  inputs: z.array(AppInputSchema).optional(),
  outputs: z.array(AppOutputSchema).optional(),
  executionStatus: z.enum(['idle', 'running', 'success', 'error']).optional(),
  lastExecutedAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
}).strict();

// 更新 UpdateNodePropsSchema 的 discriminatedUnion
export const UpdateNodePropsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(NodeType.TASK), props: TaskPropsSchema }),
  z.object({ type: z.literal(NodeType.REQUIREMENT), props: RequirementPropsSchema }),
  z.object({ type: z.literal(NodeType.PBS), props: PBSPropsSchema }),
  z.object({ type: z.literal(NodeType.DATA), props: DataPropsSchema }),
  z.object({ type: z.literal(NodeType.APP), props: AppPropsSchema }),  // 🆕
  z.object({ type: z.literal(NodeType.ORDINARY), props: z.record(z.never()).optional() }),
]);
```

### 2.5 NODE_PROP_KEYS_BY_TYPE 更新

```typescript
export const NODE_PROP_KEYS_BY_TYPE: Record<NodeType, readonly string[]> = {
  [NodeType.ORDINARY]: [],
  [NodeType.TASK]: [/* existing */],
  [NodeType.REQUIREMENT]: ['reqType', 'acceptanceCriteria', 'priority'],
  [NodeType.PBS]: ['code', 'version', 'ownerId', 'indicators', 'productRef'],
  [NodeType.DATA]: ['dataType', 'version', 'secretLevel', 'storagePath'],
  [NodeType.APP]: [  // 🆕
    'appSourceType',
    'appPath',
    'appUrl',
    'libraryAppId',
    'libraryAppName',
    'inputs',
    'outputs',
    'executionStatus',
    'lastExecutedAt',
    'errorMessage',
  ],
};
```

---

## 3. 项目目录结构

```
apps/web/components/
├── App/                          # 🆕 APP 节点相关组件
│   ├── index.ts                  # 导出入口
│   ├── AppForm.tsx               # APP 属性配置表单 (PropertyPanel)
│   ├── AppLibraryDialog.tsx      # 应用库选择弹窗
│   ├── AppSourceSelector.tsx     # 来源选择器 (Tabs)
│   ├── AppIOConfig.tsx           # I/O 配置列表
│   ├── AppFileManager.tsx        # 文件上传/下载/预览
│   └── AppExecutionState.tsx     # 执行状态指示器
├── nodes/
│   └── MindNode.tsx              # 修改：添加 APP 类型渲染
└── PropertyPanel/
    ├── PropertyPanelRegistry.tsx # 修改：注册 AppForm
    └── index.tsx                 # 修改：添加 APP 选项

apps/api/src/modules/
├── app-library/                  # 🆕 应用库模块
│   ├── app-library.module.ts
│   ├── app-library.controller.ts
│   ├── app-library.service.ts
│   └── mock-data.ts              # 卫星应用 Mock 数据
└── nodes/
    └── services/
        └── app.service.ts        # 🆕 APP 节点服务 (执行模拟)
```

---

## 4. 组件设计 (Component Design)

### 4.1 MindNode 渲染扩展

**文件**: `apps/web/components/nodes/MindNode.tsx`

```typescript
// 在 getTypeConfig 函数中添加 APP 类型配置
case NodeType.APP:
  return {
    borderColor: 'border-cyan-400',
    bgColor: 'bg-white/90',
    shadowColor: 'shadow-cyan-500/20',
    accentColor: 'text-cyan-600',
    icon: <Grid3X3 className="w-5 h-5 text-cyan-500" />, // 使用 Grid/Box 图标
    pill: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'App' }
  };
```

**节点视觉特征:**
- 边框颜色: `border-cyan-400` (Cyan/青色)
- 图标: Grid3X3 或 Boxes (表示应用程序)
- 状态徽章:
  - `idle`: 默认灰色
  - `running`: 黄色 + 旋转动画
  - `success`: 绿色 + 勾选
  - `error`: 红色 + 警告

**启动按钮集成:**
- 在节点卡片内显示 "启动" 按钮 (Play 图标)
- 点击触发执行流程

### 4.2 AppForm 组件

**文件**: `apps/web/components/App/AppForm.tsx`

```typescript
export interface AppFormProps {
  nodeId: string;
  initialData?: AppProps;
  onUpdate: (props: AppProps) => void;
  currentUserId?: string;
}

export function AppForm({ nodeId, initialData, onUpdate }: AppFormProps) {
  // 状态管理
  const [sourceType, setSourceType] = useState<AppSourceType>(
    initialData?.appSourceType || 'library'
  );
  const [inputs, setInputs] = useState<AppInput[]>(initialData?.inputs || []);
  const [outputs, setOutputs] = useState<AppOutput[]>(initialData?.outputs || []);
  const [executionStatus, setExecutionStatus] = useState<AppExecutionStatus>('idle');
  
  // 应用库弹窗状态
  const [libraryOpen, setLibraryOpen] = useState(false);
  
  return (
    <div className="space-y-4">
      {/* 来源选择器 */}
      <AppSourceSelector 
        value={sourceType}
        onChange={setSourceType}
        ... 
      />
      
      {/* 条件渲染 - 根据来源类型 */}
      {sourceType === 'local' && <LocalAppConfig ... />}
      {sourceType === 'remote' && <RemoteAppConfig ... />}
      {sourceType === 'library' && <LibraryAppConfig onOpenLibrary={() => setLibraryOpen(true)} ... />}
      
      {/* I/O 配置 */}
      <AppIOConfig 
        inputs={inputs}
        outputs={outputs}
        onInputsChange={setInputs}
        onOutputsChange={setOutputs}
      />
      
      {/* 执行按钮 */}
      <AppExecutionSection 
        status={executionStatus}
        onExecute={handleExecute}
        outputs={outputs}
      />
      
      {/* 应用库弹窗 */}
      <AppLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibraryAppSelect}
      />
    </div>
  );
}
```

### 4.3 AppSourceSelector 组件

**文件**: `apps/web/components/App/AppSourceSelector.tsx`

使用 Shadcn Tabs 组件实现三选一切换：

```typescript
<Tabs value={sourceType} onValueChange={onChange}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="local" className="...">
      <Laptop className="w-4 h-4 mr-2" />
      本地应用
    </TabsTrigger>
    <TabsTrigger value="remote" className="...">
      <Globe className="w-4 h-4 mr-2" />
      远程API
    </TabsTrigger>
    <TabsTrigger value="library" className="...">
      <Library className="w-4 h-4 mr-2" />
      应用库
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="local">
    <Input 
      placeholder="C:\Program Files\Matlab\bin\matlab.exe"
      value={appPath}
      onChange={...}
    />
  </TabsContent>
  <TabsContent value="remote">
    <Input 
      placeholder="https://api.satellite-tools.com/orbit-calc"
      value={appUrl}
      onChange={...}
    />
  </TabsContent>
  <TabsContent value="library">
    <Button onClick={onOpenLibrary}>
      <Search className="w-4 h-4 mr-2" />
      从应用库选择
    </Button>
  </TabsContent>
</Tabs>
```

### 4.4 AppLibraryDialog 组件

**文件**: `apps/web/components/App/AppLibraryDialog.tsx`

复用 `KnowledgeSearchDialog` 的模式，使用 `cmdk` + Portal：

```typescript
export function AppLibraryDialog({
  open,
  onOpenChange,
  onSelect,
}: AppLibraryDialogProps) {
  // 与 KnowledgeSearchDialog 相同的模式
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppLibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 从 /api/app-library 获取数据
  const fetchApps = async (search: string) => {
    const resp = await fetch(`/api/app-library?q=${encodeURIComponent(search)}`);
    return resp.json();
  };
  
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <Command shouldFilter={false} className="...">
        <Command.Input placeholder="搜索卫星应用..." />
        <Command.List>
          {results.map((app) => (
            <Command.Item 
              key={app.id}
              onSelect={() => onSelect(app)}
              className="flex items-center gap-3 ..."
            >
              <AppIcon category={app.category} />
              <div>
                <div className="font-medium">{app.name}</div>
                <div className="text-xs text-gray-500">{app.category} · {app.version}</div>
              </div>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>,
    document.body
  );
}
```

### 4.5 AppIOConfig 组件

**文件**: `apps/web/components/App/AppIOConfig.tsx`

动态输入/输出参数配置列表：

```typescript
export function AppIOConfig({
  inputs,
  outputs,
  onInputsChange,
  onOutputsChange,
  readOnly = false,
}: AppIOConfigProps) {
  const handleAddInput = () => {
    const newInput: AppInput = {
      id: nanoid(),
      key: '',
      type: 'text',
      required: false,
    };
    onInputsChange([...inputs, newInput]);
  };
  
  return (
    <div className="space-y-4">
      {/* 输入参数区域 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-gray-700">输入参数</Label>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={handleAddInput}>
              <Plus className="w-3 h-3 mr-1" /> 添加
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {inputs.map((input, idx) => (
            <IOParameterRow 
              key={input.id}
              param={input}
              type="input"
              onChange={(updated) => handleUpdateInput(idx, updated)}
              onRemove={() => handleRemoveInput(idx)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
      
      {/* 输出参数区域 (类似结构) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-gray-700">输出预期</Label>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={handleAddOutput}>
              <Plus className="w-3 h-3 mr-1" /> 添加
            </Button>
          )}
        </div>
        
        {outputs.map((output, idx) => (
          <IOParameterRow 
            key={output.id}
            param={output}
            type="output"
            onChange={(updated) => handleUpdateOutput(idx, updated)}
            onRemove={() => handleRemoveOutput(idx)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

// 单行参数配置
function IOParameterRow({ param, type, onChange, onRemove, readOnly }: IOParameterRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
      {/* 参数名 */}
      <Input 
        value={param.key}
        onChange={(e) => onChange({ ...param, key: e.target.value })}
        placeholder="参数名称"
        className="flex-1 h-8 text-xs"
        disabled={readOnly}
      />
      
      {/* 类型选择 */}
      <Select value={param.type} onValueChange={(v) => onChange({ ...param, type: v })}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">文本</SelectItem>
          <SelectItem value="number">数字</SelectItem>
          {type === 'input' && <SelectItem value="file">文件</SelectItem>}
        </SelectContent>
      </Select>
      
      {/* 值输入 / 文件上传 */}
      {param.type === 'file' ? (
        <FileUploadButton param={param} onChange={onChange} />
      ) : (
        <Input 
          value={param.value || ''}
          onChange={(e) => onChange({ ...param, value: e.target.value })}
          placeholder="值"
          className="flex-1 h-8 text-xs"
          disabled={readOnly}
        />
      )}
      
      {/* 删除按钮 */}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
```

### 4.6 AppFileManager 组件

**文件**: `apps/web/components/App/AppFileManager.tsx`

文件上传/下载/预览集成：

```typescript
export function AppFileManager({
  outputs,
  onDownload,
  onPreview,
}: AppFileManagerProps) {
  const hasOutputFiles = outputs.some(
    (o) => o.type === 'file' && o.value
  );
  
  if (!hasOutputFiles) {
    return (
      <div className="text-xs text-gray-400 text-center py-4">
        执行后将在此显示输出文件
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-gray-700">输出文件</Label>
      {outputs.filter(o => o.type === 'file' && o.value).map((output) => (
        <div 
          key={output.id}
          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
        >
          <div className="flex items-center gap-2">
            <FileIcon mimeType={output.mimeType} />
            <span className="text-xs text-gray-800">{output.fileName}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* 预览按钮 (支持 text/image/pdf) */}
            {isPreviewable(output.mimeType) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onPreview(output)}
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}
            
            {/* 下载按钮 */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDownload(output)}
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4.7 AppExecutionState 组件

**文件**: `apps/web/components/App/AppExecutionState.tsx`

执行状态指示与触发：

```typescript
export function AppExecutionSection({
  status,
  onExecute,
  sourceType,
  isConfigured,
  lastExecutedAt,
  errorMessage,
}: AppExecutionSectionProps) {
  const isRunning = status === 'running';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  
  return (
    <div className="space-y-2">
      {/* 执行按钮 */}
      <Button
        onClick={onExecute}
        disabled={!isConfigured || isRunning}
        className={cn(
          "w-full",
          isSuccess && "bg-emerald-500 hover:bg-emerald-600",
          isError && "bg-red-500 hover:bg-red-600"
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            执行中...
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            执行成功 · 重新执行
          </>
        ) : isError ? (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            执行失败 · 重试
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            启动应用
          </>
        )}
      </Button>
      
      {/* 状态信息 */}
      {lastExecutedAt && (
        <p className="text-[10px] text-gray-400 text-center">
          上次执行: {format(new Date(lastExecutedAt), 'yyyy-MM-dd HH:mm:ss')}
        </p>
      )}
      
      {/* 错误信息 */}
      {isError && errorMessage && (
        <div className="p-2 bg-red-50 rounded-md text-xs text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
```

---

## 5. 后端服务设计 (Backend Services)

### 5.1 应用库模块

**文件**: `apps/api/src/modules/app-library/app-library.module.ts`

```typescript
@Module({
  controllers: [AppLibraryController],
  providers: [AppLibraryService],
  exports: [AppLibraryService],
})
export class AppLibraryModule {}
```

**文件**: `apps/api/src/modules/app-library/app-library.controller.ts`

```typescript
@Controller('app-library')
export class AppLibraryController {
  constructor(private readonly appLibraryService: AppLibraryService) {}
  
  @Get()
  async list(@Query('q') query?: string) {
    return this.appLibraryService.search(query);
  }
  
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.appLibraryService.findById(id);
  }
}
```

**文件**: `apps/api/src/modules/app-library/app-library.service.ts`

```typescript
@Injectable()
export class AppLibraryService {
  private readonly apps: AppLibraryEntry[] = SATELLITE_APPS;
  
  search(query?: string): AppLibraryEntry[] {
    if (!query?.trim()) {
      return this.apps;
    }
    const lower = query.toLowerCase();
    return this.apps.filter(
      (app) =>
        app.name.toLowerCase().includes(lower) ||
        app.category.toLowerCase().includes(lower) ||
        app.description?.toLowerCase().includes(lower)
    );
  }
  
  findById(id: string): AppLibraryEntry | undefined {
    return this.apps.find((app) => app.id === id);
  }
}
```

### 5.2 卫星应用 Mock 数据

**文件**: `apps/api/src/modules/app-library/mock-data.ts`

```typescript
import type { AppLibraryEntry } from '@cdm/types';

export const SATELLITE_APPS: AppLibraryEntry[] = [
  {
    id: 'sat-orbit-designer',
    name: 'Orbit Designer Pro',
    description: '专业轨道设计与分析工具，支持多种轨道类型计算',
    category: '轨道设计',
    icon: 'orbit',
    version: '2.1.0',
    executionType: 'webapi',
    apiEndpoint: '/api/mock/orbit-calc',
    defaultInputs: [
      { key: 'Orbit Altitude', type: 'number', required: true },
      { key: 'Inclination', type: 'number', required: true },
      { key: 'Eccentricity', type: 'number', required: false },
    ],
    defaultOutputs: [
      { key: 'Trajectory File', type: 'file', mimeType: 'application/json' },
      { key: 'Orbit Period', type: 'text' },
    ],
  },
  {
    id: 'sat-thermal-analysis',
    name: 'Thermal Analysis Tool',
    description: '卫星热环境模拟与分析',
    category: '热分析',
    icon: 'thermometer',
    version: '1.5.3',
    executionType: 'local',
    protocolScheme: 'thermal-sim://',
    defaultInputs: [
      { key: 'Satellite Model', type: 'file', required: true },
      { key: 'Orbit Data', type: 'file', required: true },
      { key: 'Analysis Duration', type: 'number', required: false },
    ],
    defaultOutputs: [
      { key: 'Temperature Map', type: 'file', mimeType: 'image/png' },
      { key: 'Thermal Report', type: 'file', mimeType: 'application/pdf' },
    ],
  },
  {
    id: 'sat-signal-process',
    name: 'Signal Process v2',
    description: '卫星通信信号处理与分析',
    category: '信号处理',
    icon: 'radio',
    version: '2.0.1',
    executionType: 'webapi',
    apiEndpoint: '/api/mock/signal-process',
    defaultInputs: [
      { key: 'Signal Data', type: 'file', required: true },
      { key: 'Frequency Band', type: 'text', required: true },
      { key: 'Modulation', type: 'text', required: false },
    ],
    defaultOutputs: [
      { key: 'Processed Signal', type: 'file', mimeType: 'application/octet-stream' },
      { key: 'Analysis Summary', type: 'text' },
    ],
  },
  {
    id: 'sat-power-budget',
    name: 'Power Budget Calculator',
    description: '能源预算计算与优化',
    category: '能源管理',
    icon: 'battery',
    version: '1.2.0',
    executionType: 'webapi',
    apiEndpoint: '/api/mock/power-calc',
    defaultInputs: [
      { key: 'Solar Panel Area', type: 'number', required: true },
      { key: 'Load Profile', type: 'file', required: true },
      { key: 'Orbit Parameters', type: 'text', required: true },
    ],
    defaultOutputs: [
      { key: 'Power Report', type: 'file', mimeType: 'application/pdf' },
      { key: 'Energy Balance', type: 'text' },
    ],
  },
  {
    id: 'sat-link-budget',
    name: 'Link Budget Analyzer',
    description: '通信链路预算分析',
    category: '通信链路',
    icon: 'antenna',
    version: '3.0.0',
    executionType: 'webapi',
    apiEndpoint: '/api/mock/link-budget',
    defaultInputs: [
      { key: 'Transmit Power', type: 'number', required: true },
      { key: 'Antenna Gain', type: 'number', required: true },
      { key: 'Distance', type: 'number', required: true },
      { key: 'Frequency', type: 'number', required: true },
    ],
    defaultOutputs: [
      { key: 'Link Margin', type: 'text' },
      { key: 'Detailed Report', type: 'file', mimeType: 'application/pdf' },
    ],
  },
];
```

### 5.3 APP 执行服务

**文件**: `apps/api/src/modules/nodes/services/app.service.ts`

```typescript
@Injectable()
export class AppExecutorService {
  constructor(
    private readonly appLibraryService: AppLibraryService,
  ) {}
  
  /**
   * 模拟执行 APP 节点
   * @returns 模拟生成的输出结果
   */
  async execute(
    nodeId: string,
    appProps: AppProps,
  ): Promise<{ outputs: AppOutput[]; error?: string }> {
    // 模拟执行延迟 (1-3 秒)
    await new Promise((resolve) => 
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );
    
    // 生成 Mock 输出
    const outputs: AppOutput[] = (appProps.outputs || []).map((output) => ({
      ...output,
      value: this.generateMockOutputValue(output),
      generatedAt: new Date().toISOString(),
    }));
    
    return { outputs };
  }
  
  private generateMockOutputValue(output: AppOutput): string {
    if (output.type === 'text') {
      return `Mock result for: ${output.key}`;
    }
    // 对于文件类型，返回 mock 文件 URL
    const filename = output.fileName || `${output.key.replace(/\s+/g, '_')}.dat`;
    return `/api/mock/files/${filename}`;
  }
}
```

---

## 6. PropertyPanel 集成

### 6.1 PropertyPanelRegistry 更新

**文件**: `apps/web/components/PropertyPanel/PropertyPanelRegistry.tsx`

```typescript
import { AppForm, type AppFormProps } from '@/components/App';

export type PropertyFormProps =
  | OrdinaryFormProps
  | TaskFormProps
  | RequirementFormProps
  | PBSFormProps
  | DataFormProps
  | AppFormProps;  // 🆕

export const PropertyFormRegistry: Record<NodeType, ComponentType<any>> = {
  [NodeType.ORDINARY]: OrdinaryForm,
  [NodeType.TASK]: TaskForm,
  [NodeType.REQUIREMENT]: RequirementForm,
  [NodeType.PBS]: PBSForm,
  [NodeType.DATA]: DataForm,
  [NodeType.APP]: AppForm,  // 🆕
};
```

### 6.2 PropertyPanel 节点类型选择器更新

**文件**: `apps/web/components/PropertyPanel/index.tsx`

```typescript
<select ...>
  <option value={NodeType.ORDINARY}>普通 (Ordinary)</option>
  <option value={NodeType.TASK}>任务 (Task)</option>
  <option value={NodeType.REQUIREMENT}>需求 (Requirement)</option>
  <option value={NodeType.PBS}>研发对象 (PBS)</option>
  <option value={NodeType.DATA}>数据 (Data)</option>
  <option value={NodeType.APP}>应用 (App)</option>  {/* 🆕 */}
</select>
```

---

## 7. 执行流程

### 7.1 应用执行时序图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   AppForm    │     │  AppExecutor │     │    API       │     │   MindNode   │
│  (Frontend)  │     │  (Service)   │     │  (Backend)   │     │  (Renderer)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │                    │
       │  1. 点击"启动"     │                     │                    │
       │────────────────────>                     │                    │
       │                    │                     │                    │
       │  2. 设置状态='running'                   │                    │
       │────────────────────────────────────────────────────────────────>
       │                    │                     │                    │ (更新视觉)
       │                    │                     │                    │
       │  3. POST /api/nodes/:id/execute         │                    │
       │────────────────────────────────────────>│                    │
       │                    │                     │                    │
       │                    │   4. 模拟执行       │                    │
       │                    │   (1-3秒延迟)       │                    │
       │                    │<────────────────────│                    │
       │                    │                     │                    │
       │  5. 返回 Mock 输出                       │                    │
       │<────────────────────────────────────────│                    │
       │                    │                     │                    │
       │  6. 更新 outputs + 状态='success'        │                    │
       │────────────────────────────────────────────────────────────────>
       │                    │                     │                    │ (更新视觉)
       │                    │                     │                    │
```

### 7.2 本地应用启动逻辑

```typescript
// apps/web/components/App/AppForm.tsx

const handleExecuteLocal = async () => {
  if (!appPath) return;
  
  setExecutionStatus('running');
  
  try {
    // 尝试使用自定义协议 (如果已注册)
    // 实际实现需要 OS 级协议处理器
    const protocolUrl = `cdm-app://launch?path=${encodeURIComponent(appPath)}`;
    
    // 显示意图而非真正启动 (Mock 行为)
    console.log('[APP] Would launch:', protocolUrl);
    window.alert(`本地应用启动请求 (Protocol Handler Required):\n\n${appPath}`);
    
    // 模拟成功
    await new Promise(resolve => setTimeout(resolve, 1500));
    setExecutionStatus('success');
    setLastExecutedAt(new Date().toISOString());
  } catch (err) {
    setExecutionStatus('error');
    setErrorMessage('无法启动本地应用');
  }
};
```

### 7.3 远程 API 调用逻辑

```typescript
const handleExecuteRemote = async () => {
  if (!appUrl) return;
  
  setExecutionStatus('running');
  
  try {
    // 调用 Mock API
    const response = await fetch('/api/nodes/' + nodeId + '/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appUrl,
        inputs: inputs,
      }),
    });
    
    if (!response.ok) throw new Error('执行失败');
    
    const result = await response.json();
    
    // 更新输出
    setOutputs(result.outputs);
    setExecutionStatus('success');
    setLastExecutedAt(new Date().toISOString());
    
    // 同步到节点属性
    onUpdate({
      ...currentProps,
      outputs: result.outputs,
      executionStatus: 'success',
      lastExecutedAt: new Date().toISOString(),
    });
  } catch (err) {
    setExecutionStatus('error');
    setErrorMessage(err.message);
  }
};
```

---

## 8. 多端同步与数据一致性 (Multi-Client Sync & Consistency) 🔄

> ⚠️ **关键设计约束**: 本项目采用 **Yjs + Hocuspocus** 实现实时协作，所有节点属性的更新必须遵循 **Yjs-First 单向数据流**原则。

### 8.1 架构原则

#### Yjs-First 单向数据流 (最关键!)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Yjs-First 数据流                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户操作 → Yjs Map.set() → Hocuspocus 同步 → 后端 Hooks →                │
│   所有客户端更新 → React 重渲染                                              │
│                                                                             │
│   ❌ 禁止: setState(newValue) 后接 api.save(newValue)                       │
│   ✅ 必须: 仅通过 Yjs 修改状态，让同步机制处理持久化                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 为什么这很重要?

- **防止脑裂 (Split-Brain)**: 如果直接修改本地状态再调用 API，可能导致用户看到不一致的状态
- **单一真相源 (SoT)**: Yjs 文档是唯一的数据源，所有客户端通过 CRDT 合并冲突
- **自动冲突解决**: Yjs 内置的 CRDT 算法确保最终一致性

### 8.2 YjsNodeData 扩展

APP 节点的所有属性都存储在 `YjsNodeData.props` 中，通过 `GraphSyncManager` 同步：

```typescript
// features/collab/GraphSyncManager.ts - YjsNodeData 扩展

export interface YjsNodeData {
  id: string;
  x: number;
  y: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  parentId?: string | null;
  collapsed?: boolean;
  order?: number;
  metadata?: Record<string, unknown>;
  
  // Story 2.1: 类型特定属性
  nodeType?: NodeType;  // 包含新的 'APP' 类型
  props?: TaskProps | RequirementProps | PBSProps | DataProps | AppProps;  // 🆕 添加 AppProps
  
  // Story 2.5: 标签和归档
  tags?: string[];
  isArchived?: boolean;
  archivedAt?: string | null;
}
```

### 8.3 APP 属性同步实现

#### 8.3.1 AppForm 中的属性更新模式

**文件**: `apps/web/components/App/AppForm.tsx`

```typescript
import * as Y from 'yjs';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

export function AppForm({ 
  nodeId, 
  initialData, 
  onUpdate,  // ⚠️ 这个回调会同步到 Yjs
  yDoc,      // 🆕 需要传入 Yjs 文档引用
}: AppFormProps) {
  
  /**
   * 🔑 关键: 属性更新必须通过 onUpdate 回调
   * 该回调由 RightSidebar 提供，会同步更新到 Yjs
   */
  const handlePropsChange = useCallback((newProps: Partial<AppProps>) => {
    // ✅ 正确做法: 调用 onUpdate，让父组件处理 Yjs 同步
    onUpdate({
      ...initialData,
      ...newProps,
    });
  }, [initialData, onUpdate]);
  
  /**
   * ❌ 错误做法 - 禁止直接修改本地状态再调用 API
   * 这会导致多端不一致!
   */
  // const handlePropsChangeWrong = async (newProps) => {
  //   setLocalState(newProps);        // ❌ 本地状态先变
  //   await api.updateNode(nodeId, newProps);  // ❌ 再调 API
  // };
  
  // 来源类型变更
  const handleSourceTypeChange = (sourceType: AppSourceType) => {
    handlePropsChange({ appSourceType: sourceType });
  };
  
  // I/O 配置变更
  const handleInputsChange = (inputs: AppInput[]) => {
    handlePropsChange({ inputs });
  };
  
  const handleOutputsChange = (outputs: AppOutput[]) => {
    handlePropsChange({ outputs });
  };
  
  return (/* ... */);
}
```

#### 8.3.2 RightSidebar 中的 Yjs 同步逻辑

**文件**: `apps/web/components/layout/RightSidebar.tsx`

```typescript
import * as Y from 'yjs';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

// 🔑 属性更新 - 同步到 X6 Graph (触发 Yjs 同步)
const handlePropsUpdate = useCallback((
  nodeId: string, 
  nodeType: NodeType, 
  props: any
) => {
  // 1. 优先尝试更新 X6 Graph (GraphSyncManager 会自动同步到 Yjs)
  const node = graph?.getCellById(nodeId);
  if (node && node.isNode()) {
    const prevData = node.getData() || {};
    // ⚠️ 关键: 必须保留所有现有数据
    node.setData({
      ...prevData,
      nodeType,
      props: { ...prevData.props, ...props },
      updatedAt: new Date().toISOString(),
    });
    logger.debug('Synced node props to X6 → Yjs', { nodeId, props });
  }
  
  // 2. 如果 X6 不可用，直接更新 Yjs
  if (!node && yDoc) {
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    const existingData = yNodes.get(nodeId);
    if (existingData) {
      yNodes.set(nodeId, {
        ...existingData,
        nodeType,
        props: { ...existingData.props, ...props },
        updatedAt: new Date().toISOString(),
      });
      logger.debug('Synced node props directly to Yjs', { nodeId, props });
    }
  }
  
  // 3. 异步同步到后端 (Backend 作为最终持久化，但不阻塞 UI)
  updateNodeProps(nodeId, nodeType, props).catch((err) => {
    logger.warn('Backend props update failed, but local/Yjs state updated', { 
      nodeId, nodeType, error: err 
    });
  });
}, [graph, yDoc]);
```

### 8.4 执行状态同步策略

APP 节点的执行状态 (`executionStatus`) 是一个特殊的场景：

| 状态类型 | 同步策略 | 说明 |
|---------|---------|------|
| `idle` | 持久化 + Yjs 同步 | 默认状态，多端可见 |
| `running` | **仅本地** | 执行中状态不同步，避免混淆 |
| `success` | 持久化 + Yjs 同步 | 执行完成后同步结果给所有客户端 |
| `error` | 持久化 + Yjs 同步 | 错误信息同步给所有客户端 |

#### 8.4.1 执行状态处理

```typescript
// apps/web/components/App/AppForm.tsx

const handleExecute = async () => {
  // 1. 仅本地更新 running 状态 (不同步到 Yjs)
  setLocalExecutionStatus('running');
  
  try {
    const result = await executeApp(nodeId, appProps);
    
    // 2. 执行成功后，通过 onUpdate 同步到 Yjs
    handlePropsChange({
      executionStatus: 'success',
      outputs: result.outputs,
      lastExecutedAt: new Date().toISOString(),
      errorMessage: null,
    });
    
    // 本地状态也更新
    setLocalExecutionStatus('success');
    
  } catch (err) {
    // 3. 错误状态同步到 Yjs
    handlePropsChange({
      executionStatus: 'error',
      errorMessage: err.message,
    });
    setLocalExecutionStatus('error');
  }
};
```

### 8.5 GraphSyncManager 扩展

确保 `syncNodeToYjs` 方法正确处理 APP 节点属性：

**文件**: `apps/web/features/collab/GraphSyncManager.ts`

```typescript
// syncNodeToYjs 方法 - 确保 APP 属性正确同步

syncNodeToYjs(node: Node): void {
  if (this.isRemoteUpdate || !this.yNodes) return;
  
  const data = node.getData() as MindNodeData;
  const pos = node.getPosition();
  
  const yNodeData: YjsNodeData = {
    id: node.id,
    x: pos.x,
    y: pos.y,
    label: data?.label || '',
    description: data?.description || '',
    parentId: data?.parentId || null,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt || new Date().toISOString(),
    collapsed: data?.collapsed || false,
    order: data?.order,
    
    // Story 2.1: 类型特定属性
    nodeType: data?.nodeType || NodeType.ORDINARY,
    props: data?.props || {},  // 🆕 包含 AppProps
    
    // Story 2.5: 标签和归档
    tags: data?.tags || [],
    isArchived: data?.isArchived || false,
    archivedAt: data?.archivedAt || null,
  };
  
  this.yNodes.set(node.id, yNodeData);
  logger.trace('Synced node to Yjs', { nodeId: node.id, nodeType: yNodeData.nodeType });
}
```

### 8.6 多端协作场景测试用例

#### 场景1: 两个用户同时编辑 APP 配置

```gherkin
Given 用户A 和 用户B 同时查看同一个 APP 节点
When 用户A 修改 appSourceType 为 'remote'
And 用户B 同时修改 inputs 添加新参数
Then 两个用户都应在 <200ms 内看到合并后的状态
And 最终状态应包含 appSourceType='remote' 且 inputs 包含用户B的新参数
```

#### 场景2: 一个用户执行 APP 时另一用户查看

```gherkin
Given 用户A 正在执行 APP 节点
When 用户A 的执行状态变为 'running'
Then 用户B 不应看到 'running' 状态 (本地状态)
When 用户A 执行完成，状态变为 'success' 并有输出结果
Then 用户B 应在 <200ms 内看到 'success' 状态和输出结果
```

#### 场景3: 冲突解决

```gherkin
Given 用户A 和 用户B 同时修改同一个 input 的 value
When 两个修改几乎同时发送
Then Yjs CRDT 应自动解决冲突 (最后写入胜出)
And 两个用户最终看到一致的状态
And 不应有数据丢失
```

### 8.7 潜在问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 属性更新后其他字段丢失 | X6 `setData` 会覆盖数据 | 始终使用 `{ ...prevData, ...newData }` 模式 |
| 执行状态闪烁 | running 状态被同步 | running 状态仅保持本地，不写入 Yjs |
| 输入参数顺序不一致 | 数组操作的并发冲突 | 使用 Yjs `Y.Array` 替代普通数组 (高级优化) |
| 大文件上传同步慢 | 文件内容不适合存储在 Yjs | 文件仅存储 URL/ID 引用，实际内容在后端 |

### 8.8 E2E 协作测试

**文件**: `apps/web/e2e/app-node-collab.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('APP Node Multi-Client Sync', () => {
  
  test('APP props sync between two clients', async ({ browser }) => {
    // 创建两个浏览器上下文模拟两个用户
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 两个用户打开同一个图
    await page1.goto('/graph/test-graph');
    await page2.goto('/graph/test-graph');
    
    // 用户1 创建 APP 节点
    await page1.click('[data-testid="add-node-btn"]');
    await page1.selectOption('[data-testid="node-type-selector"]', 'APP');
    
    // 用户2 应该看到新的 APP 节点
    await expect(page2.locator('[data-node-type="APP"]')).toBeVisible({ timeout: 2000 });
    
    // 用户1 修改应用来源
    await page1.click('[data-testid="app-source-remote"]');
    await page1.fill('[data-testid="app-url-input"]', 'https://api.test.com');
    
    // 用户2 应该看到更新
    await expect(page2.locator('[data-testid="app-url-input"]'))
      .toHaveValue('https://api.test.com', { timeout: 2000 });
    
    // 清理
    await context1.close();
    await context2.close();
  });
});
```

---

## 9. 测试计划

### 9.1 单元测试

**文件**: `packages/types/src/__tests__/app-types.test.ts`

```typescript
describe('AppPropsSchema', () => {
  it('validates valid app props', () => {
    const validProps: AppProps = {
      appSourceType: 'library',
      libraryAppId: 'sat-orbit-designer',
      inputs: [
        { id: '1', key: 'Altitude', type: 'number', value: '400' },
      ],
      outputs: [],
    };
    expect(AppPropsSchema.safeParse(validProps).success).toBe(true);
  });
  
  it('rejects invalid source type', () => {
    const invalid = { appSourceType: 'invalid' };
    expect(AppPropsSchema.safeParse(invalid).success).toBe(false);
  });
});
```

**文件**: `apps/web/components/App/__tests__/AppIOConfig.test.tsx`

```typescript
describe('AppIOConfig', () => {
  it('renders inputs and outputs correctly', () => {
    render(
      <AppIOConfig 
        inputs={mockInputs}
        outputs={mockOutputs}
        onInputsChange={vi.fn()}
        onOutputsChange={vi.fn()}
      />
    );
    
    expect(screen.getByText('Orbit Altitude')).toBeInTheDocument();
    expect(screen.getByText('Trajectory File')).toBeInTheDocument();
  });
  
  it('calls onInputsChange when adding new input', async () => {
    const onInputsChange = vi.fn();
    render(<AppIOConfig inputs={[]} outputs={[]} onInputsChange={onInputsChange} onOutputsChange={vi.fn()} />);
    
    await userEvent.click(screen.getByText('添加'));
    expect(onInputsChange).toHaveBeenCalled();
  });
});
```

### 9.2 E2E 测试

**文件**: `apps/web/e2e/app-node.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Story 2.9: APP Node Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 创建一个新节点
    await page.click('[data-testid="add-node-btn"]');
  });
  
  test('AC1.1: APP node displays distinct icon and border color', async ({ page }) => {
    // 转换为 APP 类型
    await page.click('[data-testid="node-type-selector"]');
    await page.selectOption('[data-testid="node-type-selector"]', 'APP');
    
    // 验证视觉样式
    const node = page.locator('[data-node-type="APP"]');
    await expect(node).toHaveClass(/border-cyan-400/);
    await expect(node.locator('[data-testid="app-icon"]')).toBeVisible();
  });
  
  test('AC2.2: Select from Satellite App Library populates I/O defaults', async ({ page }) => {
    // 设置为 APP 类型
    await page.selectOption('[data-testid="node-type-selector"]', 'APP');
    
    // 打开应用库
    await page.click('[data-testid="open-library-btn"]');
    
    // 搜索并选择应用
    await page.fill('[data-testid="library-search"]', 'Orbit');
    await page.click('text=Orbit Designer Pro');
    
    // 验证默认值已填充
    await expect(page.locator('text=Orbit Altitude')).toBeVisible();
    await expect(page.locator('text=Trajectory File')).toBeVisible();
  });
  
  test('AC4.2: Execution shows Running state and updates Outputs', async ({ page }) => {
    // 预配置 APP 节点
    await page.selectOption('[data-testid="node-type-selector"]', 'APP');
    await page.click('[data-testid="open-library-btn"]');
    await page.click('text=Orbit Designer Pro');
    
    // 填写所需输入
    await page.fill('[data-testid="input-Orbit Altitude"]', '400');
    await page.fill('[data-testid="input-Inclination"]', '51.6');
    
    // 点击执行
    await page.click('text=启动应用');
    
    // 验证 Running 状态
    await expect(page.locator('text=执行中...')).toBeVisible();
    
    // 等待完成
    await expect(page.locator('text=执行成功')).toBeVisible({ timeout: 5000 });
    
    // 验证输出
    await expect(page.locator('[data-testid="output-file-btn"]')).toBeVisible();
  });
});
```

---

## 10. 实施顺序

### Phase 1: 类型定义与基础设施 (Task 1)

1. [ ] 扩展 `NodeType` 枚举添加 `APP`
2. [ ] 定义 `AppProps`, `AppInput`, `AppOutput` 接口
3. [ ] 添加 `AppPropsSchema` Zod 验证
4. [ ] 更新 `NODE_PROP_KEYS_BY_TYPE`
5. [ ] 创建 `packages/types/src/app-library.ts`

### Phase 2: 后端 Mock 服务 (Task 2)

1. [ ] 创建 `app-library` 模块
2. [ ] 实现 `AppLibraryService` (Mock 数据)
3. [ ] 实现 `AppLibraryController` (GET /app-library)
4. [ ] 创建 `AppExecutorService` (执行模拟)
5. [ ] 添加 `/nodes/:id/execute` API 端点

### Phase 3: 前端组件 (Task 3)

1. [ ] 创建 `apps/web/components/App/` 目录结构
2. [ ] 实现 `AppForm.tsx` 主表单
3. [ ] 实现 `AppSourceSelector.tsx` 来源选择
4. [ ] 实现 `AppLibraryDialog.tsx` 应用库弹窗
5. [ ] 实现 `AppIOConfig.tsx` I/O 配置
6. [ ] 实现 `AppFileManager.tsx` 文件操作
7. [ ] 实现 `AppExecutionState.tsx` 状态显示

### Phase 4: 集成与渲染 (Task 4)

1. [ ] 更新 `MindNode.tsx` 添加 APP 类型渲染
2. [ ] 更新 `PropertyPanelRegistry.tsx` 注册 AppForm
3. [ ] 更新 `PropertyPanel/index.tsx` 添加选项
4. [ ] 实现执行状态同步逻辑
5. [ ] 实现应用库默认值自动填充

### Phase 5: 测试与验收 (Task 5)

1. [ ] 单元测试: I/O 配置逻辑
2. [ ] E2E 测试: 完整用户流程
3. [ ] 验收测试: 所有 AC 检查

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 本地应用启动需要 OS 协议处理器 | 高 | 使用 `window.alert` Mock 意图，文档说明真实部署需求 |
| 文件上传/下载需要后端存储 | 中 | 使用 Mock URL，后期可对接 S3/OSS |
| 执行状态需要实时更新 | 中 | 使用 React 本地状态 + 刷新机制 |
| 应用库数据量增大 | 低 | 添加分页和虚拟滚动 |

---

## 12. 附录

### A. 设计灵感参考

- **Notion Database Properties**: 动态字段配置模式
- **Zapier Node Editor**: 输入/输出映射 UI
- **Figma Plugin System**: 应用库搜索体验

### B. 相关文档

- [Story 2.9 原始需求](/docs/sprint-artifacts/2-9-app-node-type.md)
- [PRD FR3 任务与依赖](/docs/prd.md#fr3)
- [架构文档 - 插件模式](/docs/architecture.md#plugin-protocol)
