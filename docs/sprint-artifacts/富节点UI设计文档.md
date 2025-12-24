# 富节点 UI 设计与实施文档

> **版本**: 1.0  
> **日期**: 2024-12-24  
> **状态**: 设计中

## 一、目标描述

实现图谱的"像素级"富节点 UI，替换当前简单的节点渲染。新设计采用统一的 4 层架构（状态头、标题行、指标行、页脚），并针对 PBS、任务、需求、数据和应用节点提供独特的视觉变体。

![Rich Node Design Reference](./images/rich-node-design-ref.png)

> [!IMPORTANT]
> **重构策略**：重构 `MindNode.tsx` 作为逻辑控制器，包裹新的 `RichNodeLayout` 视觉组件。确保 X6 事件和数据绑定保持完整。

---

## 二、设计系统 (Design Tokens)

### 2.1 颜色系统

#### 节点类型主题色
| 节点类型 | Header 颜色 | 代码 | 阴影色 |
|:---|:---|:---|:---|
| **PBS** | 深蓝 (Deep Blue) | `#1E3A8A` | `rgba(30,58,138,0.15)` |
| **Task (Normal)** | 灰蓝 (Slate) | `#64748B` | `rgba(100,116,139,0.15)` |
| **Task (Approved)** | 翠绿 (Emerald) | `#10B981` | `rgba(16,185,129,0.15)` |
| **Task (Pending)** | 橙黄条纹 | `#F59E0B` | `rgba(245,158,11,0.2)` |
| **Task (Rejected)** | 玫红 (Rose) | `#F43F5E` | `rgba(244,63,94,0.2)` |
| **Requirement** | 紫罗兰 (Violet) | `#7C3AED` | `rgba(124,58,237,0.15)` |
| **App** | 深色霓虹 (Neon Dark) | `#111827` | `rgba(17,24,39,0.2)` |
| **Data** | 青绿 (Teal) | `#0D9488` | `rgba(13,148,136,0.15)` |

#### 状态徽章色
| 状态 | 背景 | 文字 |
|:---|:---|:---|
| Pending | `bg-orange-100` | `text-orange-700` |
| Approved / Verified | `bg-emerald-100` | `text-emerald-700` |
| Rejected | `bg-rose-100` | `text-rose-700` |
| Success | `bg-green-100` | `text-green-700` |
| Error | `bg-red-100` | `text-red-700` |

### 2.2 排版系统

| 元素 | 字体大小 | 字重 | 行高 |
|:---|:---|:---|:---|
| 标题 (Title) | `14px` | `700 (Bold)` | `1.2` |
| 指标 (Metrics) | `11px` | `500 (Medium)` | `1.4` |
| 页脚 (Footer) | `10px` | `400 (Regular)` | `1.3` |
| 徽章 (Badge) | `9px` | `600 (Semibold)` | `1` |

### 2.3 间距与尺寸

| 元素 | 值 |
|:---|:---|
| 节点宽度 | `240px` (固定) |
| Header 高度 | `6px` |
| Title Row 高度 | `32px` |
| Metrics Row 高度 | `auto` (内容决定) |
| Footer 高度 | `32px` |
| 内边距 | `12px` |
| 圆角 | `8px` |
| 图标尺寸 | `20px × 20px` |

### 2.4 阴影系统

```css
/* 默认阴影 */
.node-shadow-default {
  box-shadow: 
    0 1px 3px rgba(0,0,0,0.08),
    0 4px 12px rgba(0,0,0,0.05);
}

/* 选中状态阴影 */
.node-shadow-selected {
  box-shadow: 
    0 0 0 2px #3B82F6,
    0 4px 16px rgba(59,130,246,0.25);
}

/* 类型主题阴影 (以 PBS 为例) */
.node-shadow-pbs {
  box-shadow: 
    0 1px 3px rgba(30,58,138,0.1),
    0 4px 12px rgba(30,58,138,0.08);
}
```

---

## 三、技术约束与最佳实践

### 3.1 性能优化策略

> [!WARNING]
> **关键性能指标**: 节点渲染时间必须 < 16ms (60fps)，100 个节点的总渲染时间 < 300ms

**1. 高度计算缓存**
```typescript
const heightCache = new Map<string, number>();

function getNodeHeight(label: string, description: string, nodeType: NodeType): number {
  const cacheKey = `${nodeType}-${label.length}-${description.length}`;
  if (heightCache.has(cacheKey)) {
    return heightCache.get(cacheKey)!;
  }
  // ... 计算逻辑
  heightCache.set(cacheKey, height);
  return height;
}
```

**2. 组件记忆化**
```typescript
export const TitleRow = React.memo(({ icon, title, isEditing }: TitleRowProps) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title && 
         prevProps.isEditing === nextProps.isEditing;
});
```

**3. SVG 兼容性处理**
- 阴影优先使用 SVG `<filter>`，降级到 CSS `box-shadow`
- 避免在 `foreignObject` 内使用复杂的 CSS transforms

### 3.2 状态管理最佳实践

**单一数据源原则**: `node.data` 是唯一真相源，React 组件只读取不存储状态

```typescript
// ❌ 错误: 双重状态
const [isEditing, setIsEditing] = useState(false);
node.setData({ isEditing: true });

// ✅ 正确: 单一来源
const data = node.getData();
const isEditing = data.isEditing ?? false;
```

**数据变更防抖**
```typescript
const debouncedUpdate = useMemo(
  () => debounce((nodeId: string, payload: any) => {
    updateNode(nodeId, payload);
  }, 300),
  []
);
```

**Context 避免 Props Drilling**
```typescript
interface RichNodeContextValue {
  nodeType: NodeType;
  isEditing: boolean;
  isSelected: boolean;
  nodeData: MindNodeData;
}

const RichNodeContext = createContext<RichNodeContextValue>(null!);
```

### 3.3 渲染策略模式

```typescript
// apps/web/components/nodes/rich/renderers.ts
interface NodeRenderer {
  getHeaderColor(status?: string): string;
  renderMetrics(data: MindNodeData): ReactNode;
  getIcon(): ReactNode;
}

class PBSRenderer implements NodeRenderer {
  getHeaderColor() { return '#1E3A8A'; }
  renderMetrics(data: MindNodeData) {
    const props = data.props as PBSProps;
    return (
      <div className="flex items-center gap-2 text-xs">
        <span>✓ {props.taskCount} Tasks</span>
        <span>⚠ {props.riskCount} Risks</span>
      </div>
    );
  }
  getIcon() { return <Box className="w-5 h-5" />; }
}

export const NODE_RENDERERS: Record<NodeType, NodeRenderer> = {
  [NodeType.PBS]: new PBSRenderer(),
  [NodeType.TASK]: new TaskRenderer(),
  // ...
};
## 三、组件架构

### 3.1 组件结构图

```
RichNodeLayout (容器)
├── StatusHeader (6px 彩色条)
├── TitleRow (图标 + 标题 + 菜单)
├── MetricsRow (可选, 指标/进度条)
├── Footer (头像 + 徽章 + 状态)
└── HangingPill (可选, 驳回原因)
```

### 4.2 组件详细规格

#### RichNodeLayout.tsx

```typescript
interface RichNodeLayoutProps {
  // 节点类型
  nodeType: NodeType;
  // 状态 (影响 Header 样式)
  status?: 'pending' | 'approved' | 'rejected' | 'default';
  // 是否选中
  isSelected?: boolean;
  // 子元素插槽
  children: React.ReactNode;
  // 悬挂胶囊 (驳回原因)
  hangingPill?: React.ReactNode;
}
```

**样式规格**:
- 白色背景 `bg-white`
- 圆角 `rounded-lg` (8px)
- 类型主题阴影
- 选中时蓝色外发光

#### StatusHeader.tsx

```typescript
interface StatusHeaderProps {
  color: string;        // 主题色 (hex)
  pattern?: 'solid' | 'striped'; // 条纹模式
}
```

**样式规格**:
- 高度 `h-1.5` (6px)
- 宽度 `w-full`
- 圆角 (仅顶部) `rounded-t-lg`
- 条纹使用 CSS `background: repeating-linear-gradient(...)`

```css
.header-striped {
  background: repeating-linear-gradient(
    45deg,
    #F59E0B,
    #F59E0B 6px,
    #FBBF24 6px,
    #FBBF24 12px
  );
}
```

#### TitleRow.tsx

```typescript
interface TitleRowProps {
  icon: React.ReactNode;
  title: string;
  isEditing?: boolean;
  onTitleChange?: (value: string) => void;
  onMenuClick?: () => void;
}
```

**样式规格**:
- 高度 `h-8` (32px)
- Flex 布局 `flex items-center gap-2`
- 标题截断 `truncate`
- 菜单按钮 hover 时显示

#### MetricsRow.tsx

```typescript
interface MetricsRowProps {
  children: React.ReactNode; // 灵活内容
}
```

**内容变体**:
- **PBS**: 大数字面板 (`5 Tasks` | `2 Risks` | `进度条`)
- **Task**: 日期范围 + 进度条 (`06/21 - 07/15` | `45%`)
- **Requirement**: 标签组 (`Functional` | `Must Have`)
- **App**: 运行信息 (`Last Run: 2m ago` | `I/O: 2/1`)

#### Footer.tsx

```typescript
interface FooterProps {
  leftContent?: React.ReactNode;  // 头像/所有者
  rightContent?: React.ReactNode; // 状态徽章
}
```

**样式规格**:
- 高度 `h-8` (32px)
- 顶部边框 `border-t border-gray-100`
- Flex 布局 `flex items-center justify-between`

#### HangingPill.tsx

```typescript
interface HangingPillProps {
  reason: string;
  variant: 'rejected' | 'warning';
}
```

**样式规格**:
- 绝对定位 `absolute -bottom-6 left-4`
- 红色背景 `bg-rose-500 text-white`
- 圆角 `rounded-md`
- 阴影 `shadow-md`

---

## 五、节点类型详细规格

### 5.1 PBS 节点 (Product)

| 层 | 内容 |
|:---|:---|
| Header | 深蓝 `#1E3A8A` |
| Title | 📦 图标 + 产品名称 |
| Metrics | `✓ 5 Tasks` · `⚠ 2 Risks` · 进度条 `60%` |
| Footer | 👤 Manager头像 + `Version v1.0` |

### 5.2 Task 节点

| 状态 | Header | Footer |
|:---|:---|:---|
| Normal | 灰蓝 `#64748B` | Assignee头像 + 状态 |
| Pending | 橙黄条纹 | `Pending` 徽章 |
| Approved | 翠绿 `#10B981` | `Approved` 徽章 |
| Rejected | 玫红 + 悬挂胶囊 | `Rejected` 徽章 |

**Metrics**: 日期范围 `06/21 - 07/15` + 进度条 `45%`

### 5.3 Requirement 节点

| 层 | 内容 |
|:---|:---|
| Header | 紫罗兰 `#7C3AED` |
| Title | 📋 图标 + 需求名称 |
| Metrics | `Functional` 标签 + `Must Have` 标签 |
| Footer | 来源 + `✓ Verified` 徽章 |

### 5.4 App 节点

| 层 | 内容 |
|:---|:---|
| Header | 深色 `#111827` + 青色边框 |
| Title | ▶️ 图标 + 应用名称 |
| Metrics | `Last Run: 2m ago` · `I/O: 2/1` |
| Footer | `● Success` 状态指示 + 执行按钮 |

---

## 六、现有功能保留清单

### 6.1 通用操作
- [x] 选中 (光环/阴影)
- [x] 拖拽移动
- [x] 双击/空格编辑
- [x] Enter 提交, Esc 取消
- [x] 方向键导航
- [x] Tab 创建子节点
- [x] Enter 创建兄弟节点
- [x] Delete 删除节点
- [x] 标签点击搜索

### 6.2 类型专属功能
| 类型 | 专属功能 |
|:---|:---|
| Task | 审批状态显示, 指派状态显示 |
| App | 执行按钮, 运行状态动画 |
| PBS | 产品代码显示 |
| Data | 密级锁图标 |

---

## 七、风险评估与缓解措施

| 风险项 | 严重度 | 影响 | 缓解措施 | 状态 |
|:---|:---|:---|:---|:---|
| 频繁 resize 导致卡顿 | **高** | 节点数 > 50 时明显 | 高度缓存 + React.memo | 🟡 需实现 |
| X6 数据同步冲突 | **中** | 编辑时可能丢数据 | 单一数据源 + 集成测试 | 🟡 需验证 |
| SVG 样式兼容性 | **中** | 阴影可能不生效 | SVG filter 降级方案 | 🟡 需测试 |
| 组件过度重渲染 | **中** | 影响交互流畅度 | React.memo + Context | 🟡 需实现 |

---

## 八、测试设计

### 8.1 视觉测试
| 测试项 | 验证点 |
|:---|:---|
| PBS Header | 深蓝色, 6px 高度 |
| Task Pending | 橙黄条纹效果 |
| Task Rejected | 红色 + 悬挂胶囊 |
| 选中状态 | 蓝色外发光 Ring |

### 8.2 交互测试
| 测试项 | 预期结果 |
|:---|:---|
| 双击标题 | 进入编辑模式 |
| 方向键 | 焦点切换流畅 |
| Tab 键 | 创建子节点并连线 |
| App 执行 | 按钮 Loading 状态 |

### 8.3 性能测试 (新增)
| 测试项 | 目标指标 |
|:---|:---|
| 单节点渲染 | < 16ms |
| 100 节点首次加载 | < 300ms |
| 编辑模式切换 | < 50ms |

### 8.4 自适应测试
| 测试项 | 预期结果 |
|:---|:---|
| 50字长标题 | 截断显示 (ellipsis) |
| 5个标签 | 显示2个 + "+3" |

---

## 九、分阶段实施计划

### Phase 1: MVP (优先)
**目标**: 验证架构可行性

- [ ] `RichNodeLayout` 基础容器
- [ ] `StatusHeader` 组件
- [ ] `TitleRow` 组件 (含编辑模式)
- [ ] `Footer` 组件
- [ ] **仅实现 PBS 和 Task 节点**
- [ ] 性能基准测试 (50 节点)
- [ ] X6 集成测试

**完成标准**: PBS/Task 节点视觉 100% 还原，性能达标

### Phase 2: 完整实现
**目标**: 支持所有节点类型

- [ ] `MetricsRow` 复杂布局
- [ ] `HangingPill` 悬挂胶囊
- [ ] Requirement、App、Data 节点
- [ ] 审批状态完整流程
- [ ] 100+ 节点性能测试

### Phase 3: 优化增强
- [ ] 缩放级别响应 (Minimal View)
- [ ] 虚拟化渲染 (节点数 > 100)
- [ ] 动画效果打磨

---

## 十、文件变更清单

| 操作 | 文件路径 |
|:---|:---|
| **[NEW]** | `apps/web/components/nodes/rich/RichNodeLayout.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/StatusHeader.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/TitleRow.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/MetricsRow.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/Footer.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/HangingPill.tsx` |
| **[NEW]** | `apps/web/components/nodes/rich/index.ts` |
| **[NEW]** | `apps/web/components/nodes/rich/renderers.ts` |
| **[NEW]** | `apps/web/components/nodes/rich/RichNodeContext.tsx` |
| **[MODIFY]** | `apps/web/components/nodes/MindNode.tsx` |

---

## 十一、通过评审的前置条件

- [ ] 实现性能测试用例 (100+ 节点图谱)
- [ ] 验证 SVG 内阴影效果兼容性
- [ ] 实现 `RichNodeContext` 状态管理
- [ ] 实现高度计算缓存机制
- [ ] 编写 X6 数据同步集成测试
- [ ] 完成 Phase 1 MVP 并通过性能基准
