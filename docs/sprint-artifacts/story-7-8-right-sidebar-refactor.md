# Story 7.8: RightSidebar 组件拆分

Status: ready-for-dev

## Story

As a **前端开发者**,
I want **将 RightSidebar 组件按面板类型拆分为独立模块**,
so that **各面板可独立开发维护，降低组件复杂度。**

## Acceptance Criteria

1. **Given** `RightSidebar.tsx` 当前有 693 行
   **When** 执行拆分后
   **Then** 主文件行数应降低至 300 行以内

2. **Given** 多个面板逻辑混合在一个文件中
   **When** 重构完成后
   **Then** 每个面板类型应有独立的组件文件

3. **Given** 面板切换逻辑内嵌
   **When** 重构完成后
   **Then** 应创建 `SidebarPanelSwitcher.tsx` 或 hook 管理面板状态

4. **Given** 所有拆分完成
   **When** 验证功能时
   **Then** 侧边栏面板切换、属性编辑、评论等功能应正常工作

## Tasks / Subtasks

- [ ] Task 1: 分析 RightSidebar 结构 (AC: #1)
  - [ ] 1.1 识别各面板类型（Property, Comments, Approval 等）
  - [ ] 1.2 统计各面板代码行数
  - [ ] 1.3 确定拆分边界

- [ ] Task 2: 提取 useSidebarState Hook (AC: #3)
  - [ ] 2.1 创建 `hooks/useSidebarState.ts`
  - [ ] 2.2 迁移面板切换状态逻辑
  - [ ] 2.3 迁移面板可见性控制

- [ ] Task 3: 拆分各面板组件 (AC: #2)
  - [ ] 3.1 创建 `PropertyPanelContainer.tsx`
  - [ ] 3.2 创建 `CommentsPanelContainer.tsx`
  - [ ] 3.3 创建其他面板容器（如需要）

- [ ] Task 4: 创建面板切换器 (AC: #3)
  - [ ] 4.1 创建 `SidebarPanelSwitcher.tsx`
  - [ ] 4.2 实现 Tab 切换 UI
  - [ ] 4.3 连接各面板组件

- [ ] Task 5: 重构主组件 (AC: #1, #4)
  - [ ] 5.1 整合提取的子组件
  - [ ] 5.2 验证行数 < 300
  - [ ] 5.3 功能回归测试

## Dev Notes

### 当前文件位置
- `apps/web/components/layout/RightSidebar.tsx`

### 拆分策略
| 新文件 | 职责 | 预估行数 |
|--------|------|----------|
| `SidebarPanelSwitcher.tsx` | 面板切换 Tab | ~100 |
| `PropertyPanelContainer.tsx` | 属性面板容器 | ~150 |
| `CommentsPanelContainer.tsx` | 评论面板容器 | ~150 |
| `useSidebarState.ts` | 侧边栏状态管理 | ~100 |
| `RightSidebar.tsx` | 主容器 | ~200 |

### Project Structure Notes
- 可考虑在 `components/layout/sidebar/` 下创建子目录
- 面板容器组件负责组装具体的 Form/Panel 组件

### References
- [Source: docs/analysis/refactoring-proposal-2025-12-28.md#第二阶段]
- [Source: docs/project-context.md#Line93] - 文件大小限制 300 行

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
