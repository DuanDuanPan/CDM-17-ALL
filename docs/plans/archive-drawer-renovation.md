# 归档箱 UI 改造方案 (Archive Drawer Renovation Plan)

## 1. 现状回顾 (Current Status)

### 当前实现 (Based on Screenshot & Code)
- **UI 结构**: 侧边抽屉 (Right Drawer), 宽度 360px.
- **视觉风格**: 纯白背景 (`bg-white`), 默认阴影 (`shadow-xl`), 基础分割线.
- **交互**: 简单的搜索框, 列表项展示 Label/Graph/Tags, 独立的"恢复"按钮.
- **信息展示**: 图标, 类型色彩, 来源图谱, 标签.

### 设计目标 (Design Goal - Inferred from System Spec)
- **视觉风格**: 采用系统最新的 **Glassmorphism (毛玻璃)** 风格, 提升高级感.
- **信息密度**: 补充 "归档时间" 等关键上下文信息.
- **交互体验**: 优化 Hover 态反馈, 增加列表项动画, 优化空状态展示.

## 2. 差距分析 (Gap Analysis)

| 维度 | 当前实现 (Current) | 目标设计 (Target) | 改造点 (Action Item) |
|---|---|---|---|
| **背景材质** | 纯色遮罩 + 纯白背景 | 毛玻璃背景 + 柔和边框 | `bg-white/90 backdrop-blur-md` |
| **列表交互** | 固定展示恢复按钮 | Hover 时突显操作 | 恢复按钮改为 `group-hover` 增强或右侧常驻但样式优化 |
| **元数据** | 仅显示来源和标签 | **新增显示归档时间** | 使用 `date-fns` 显示相对时间 (e.g. "2 days ago") |
| **动画效果** | 仅 CSS Transform | 列表项进入/退出动画 | 优化 CSS Transition 或引入轻量动画库 |
| **空状态** | 简单 Icon + 文字 | 视觉化插画/引导 | 优化空状态 UI 设计 |

## 3. 详细改造方案 (Detailed Plan)

### 3.1 视觉样式升级 (Visual Upgrade)
将 `ArchiveDrawer` 升级为符合系统 "Refined UI" 的组件.

```tsx
// 修改前
className="fixed right-0 top-0 h-full w-[360px] bg-white dark:bg-gray-900 shadow-xl ..."

// 修改后
className="fixed right-0 top-0 h-full w-[400px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50 ..."
```

### 3.2 增加归档时间展示 (Archived Time)
用户需要知道节点是什么时候归档的.

- **Data**: 确保 API 返回 `archivedAt`.
- **UI**: 在列表项右下角或来源旁显示 `formatDistanceToNow(new Date(node.archivedAt))` .

### 3.3 列表项卡片化 (List Item Refinement)
增加列表项的层次感, 避免简单的分割线布局.

```tsx
<div className="group relative p-3 mb-2 rounded-xl border border-transparent hover:border-gray-200 hover:bg-white/50 transition-all">
   {/* Content */}
   <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
       {/* Restore Button */}
   </div>
</div>
```

### 3.4 搜索框优化
集成到 Header 区域或使用更精致的 Input 组件 (带 `ring-0`, `bg-gray-100/50`).

## 4. 行动计划 (Action Items)

1.  **Mockup Verification**: (需用户确认) 确认 `archive_drawer_mockup.png` 中的具体细节是否包含上述假设.
2.  **Code Implementation**: 修改 `apps/web/components/ArchiveBox/ArchiveDrawer.tsx`.
    -   应用 Backdrop Blur 样式.
    -   修改 List Item 布局.
    -   集成 `date-fns` 显示时间.
3.  **Review**: 对比前后效果.
