# CDM-17 代码重构建议书 (2025-12-28)

## 1. 概述 (Executive Summary)

经过对项目代码库（commit `0e3bff0`）的深度架构审查，我们发现当前实现与设计文档（`architecture.md`, `project-context.md`）存在显著偏差。主要问题集中在**核心架构模式退化**、**工程规范严重违例**以及**UI组件系统缺失**。这些问题已导致代码库维护成本急剧上升、测试脆弱性增加以及潜在的数据一致性风险。

本建议书旨在提出一套分阶段的重构计划，以重新对齐架构设计，偿还技术债务，并确保系统的可扩展性与稳定性。

---

## 2. 关键问题诊断 (Critical Issues Diagnosis)

### 2.1 架构模式偏差 (Architecture Divergence)

*   **问题 A: "Microkernel" 架构迁移未完成**
    *   **现状**: 设计要求核心业务以插件形式（`packages/plugins`）存在。目前已建立 `plugin-layout` 和 `plugin-mindmap-core` 两个插件，但大部分业务模块（`nodes`, `approval`, `comments`, `subscriptions`, `graphs`, `edges`）仍驻留在 `apps/api/src/modules` 中，迁移工作未完成。
    *   **影响**: 违反 `architecture.md:144` "一切皆插件" 设计，导致内核臃肿，未来扩展新业务（如新的节点类型或工作流）必须修改内核代码，增加了耦合度。

*   **问题 B: 数据流违反 "Yjs-First" 单向流**
    *   **现状**: `MindNode.tsx:393` 等前端组件在编辑时执行"双写"（同时更新 Yjs 本地状态和调用 REST API `updateNode`）。
    *   **代码证据**:
        ```typescript
        // MindNode.tsx:22
        import { updateNode, updateNodeProps } from '@/lib/api/nodes';
        // MindNode.tsx:393
        updateNode(node.id, payload).catch((err) => { ... });
        ```
    *   **原因**: 为解决 Story 2.4 中业务即时性（DB 查询需要最新数据）与 Yjs 异步落库之间的竞态条件。
    *   **风险**: 违反 `architecture.md:546-549` 规定，引入了脑裂风险，增加了前端逻辑复杂性。

### 2.2 工程规范违例 (Engineering Mandates Violations)

*   **问题 C: 上帝类与巨型文件 (God Classes)**
    *   **现状**: 多个核心文件远超 `project-context.md:93` 规定的 300 行限制，职责不清。
        | 文件 | 实际行数 | 超标倍数 |
        |------|----------|----------|
        | `GraphComponent.tsx` | 1360 行 | 4.5x |
        | `MindNode.tsx` | 956 行 | 3.2x |
        | `useClipboard.ts` | 962 行 | 3.2x |
    *   **影响**: 可读性差，Git 冲突高发，难以进行单元测试。

*   **问题 D: Repository 模式未完全执行**
    *   **现状**: 尽管已定义多个 Repository（如 `node.repository.ts`, `comments.repository.ts`, `subscriptions.repository.ts`），但关键模块未使用，仍直接调用 Prisma。
    *   **严重违规点**:
        | 文件 | 违规类型 | 代码位置 |
        |------|----------|----------|
        | `collab.service.ts` | Service 直调 Prisma | Line 107, 319, 371 |
        | `attachments.controller.ts` | **Controller 直查 DB** (最严重) | Line 117, 151, 195, 215 |
    *   **影响**: 违反 `project-context.md:106-107`，无法 Mock 数据层，导致单元测试必须依赖真实 DB（变慢且脆弱），业务逻辑与数据访问强耦合。

*   **问题 E: 破坏 Hook-First 封装**
    *   **现状**: 前端组件散布着大量直白的 `fetch()` 调用，违反 `project-context.md:85` 要求。
        | 组件 | fetch 调用次数 |
        |------|----------------|
        | `ApprovalStatusPanel.tsx` | 8 次 |
        | `TaskDispatchSection.tsx` | 3 次 |
        | `ArchiveDrawer.tsx` | 3 次 |
        | `CommentInput.tsx` | 1 次 |
        | `CommentPanel.tsx` | 1 次 |
        | 其他 | 7 次 |
    *   **影响**: UI 与数据获取耦合，逻辑无法复用，组件难以测试。

### 2.3 UI 系统缺失 (Missing Design System)

*   **问题 F: 基础原子组件缺失**
    *   **现状**: `packages/ui` 目前仅包含 `confirm-dialog` 和 `toast` 组件，缺少 `architecture.md:655` 要求的基础原子组件（`Button`, `Badge`, `Card`, `Input`）。业务组件大量手写原生 HTML 和 Tailwind 类。
    *   **影响**: UI 风格不统一，视觉还原度低，违反 DRY 原则。

---

## 3. 重构行动计划 (Action Plan)

建议采用 **"Stop the Bleeding & Iterate"**（止血并迭代）的策略，分为三个阶段执行。

### 第一阶段：止血与核心规范强防 (Immediate Fixes - Stop the Bleeding)

**目标**: 停止产生新的违规代码，修复最高风险的架构问题。  
**预估工时**: 3-5 人天

#### 1.1 强制 Repository 模式 (Backend)

*   **行动**: 禁止新的 `prisma.*` 直接调用。
*   **任务**:
    1.  **[P0]** 修复 `attachments.controller.ts`：将 4 处 Prisma 调用移至新建的 `AttachmentsRepository`。
    2.  **[P1]** 为 `CollabService` 引入 `GraphRepository`，封装 Line 107, 319, 371 的 Prisma 调用。
    3.  **[P2]** 添加 ESLint 规则禁止在 `*.service.ts` 和 `*.controller.ts` 中 import `@prisma/client`。

#### 1.2 强制 Hook-First 模式 (Frontend)

*   **行动**: 冻结 `MindNode.tsx` 和 `GraphComponent.tsx` 的功能新增。
*   **任务**:
    1.  **[P0]** 将 `ApprovalStatusPanel.tsx` 中的 8 次 API 逻辑提取为 `useApproval` hook。
    2.  **[P1]** 将 `TaskDispatchSection.tsx` 中的 3 次 API 逻辑提取为 `useTaskDispatch` hook。
    3.  **[P2]** 添加 ESLint 规则禁止在 `apps/web/components` 目录下直接 import `fetch`。

#### 1.3 UI 库基建启动

*   **任务**: 在 `packages/ui` 中建立基础原子组件：
    *   `Button` (变体: primary, secondary, ghost, danger)
    *   `Input` (变体: text, textarea, number)
    *   `Card`
    *   `Badge` (变体: success, warning, error, info)
*   **规则**: 停止在业务代码中手写这些组件的样式。

---

### 第二阶段：解耦与拆分 (Decoupling & Splitting)

**目标**: 解决巨型文件问题，降低维护复杂度。  
**预估工时**: 8-12 人天

#### 2.1 拆解 `GraphComponent.tsx` (1360 行 → 目标 < 300 行/文件)

*   **策略**: 按功能切片。
    | 新文件 | 职责 | 预估行数 |
    |--------|------|----------|
    | `GraphEvents.tsx` | 事件监听 (click, drag, etc.) | ~200 |
    | `GraphHotkeys.tsx` | 快捷键处理 | ~150 |
    | `GraphLayout.tsx` | 布局算法调用 | ~100 |
    | `SelectionManager.tsx` | 选中逻辑 | ~150 |
    | `GraphComponent.tsx` | 容器组件 (组装上述模块) | ~200 |

#### 2.2 重构 `MindNode.tsx` (956 行 → 目标 < 300 行/文件)

*   **策略**: 策略模式 (Strategy Pattern)。
*   **设计**:
    ```typescript
    // interfaces/NodeRenderer.ts
    interface NodeRenderer {
      render(node: NodeData, props: NodeRendererProps): ReactNode;
      getContextMenuItems?(node: NodeData): MenuItem[];
    }
    ```
*   **创建独立渲染组件**:
    | 组件 | 渲染节点类型 | 预估行数 |
    |------|--------------|----------|
    | `TaskNodeRenderer.tsx` | Task 节点 | ~200 |
    | `PbsNodeRenderer.tsx` | PBS 节点 | ~150 |
    | `RequirementNodeRenderer.tsx` | Requirement 节点 | ~150 |
    | `AppNodeRenderer.tsx` | App 节点 (含执行逻辑) | ~250 |
    | `MindNode.tsx` | 容器/分发器 | ~150 |

#### 2.3 拆解 `useClipboard.ts` (962 行 → 目标 < 300 行/文件)

*   **策略**: 职责分离。
    | 新 Hook | 职责 | 预估行数 |
    |---------|------|----------|
    | `useClipboardCore.ts` | 纯复制/粘贴操作 | ~150 |
    | `usePasteHandlers.ts` | 业务数据转换/处理 | ~300 |
    | `useClipboardShortcuts.ts` | 快捷键绑定 | ~100 |

---

### 第三阶段：架构回归 (Architecture Realignment)

**目标**: 回归设计文档的架构愿景。  
**预估工时**: 15-20 人天

#### 3.1 迁移至插件架构 (Plugins Migration)

*   **任务**: 将 `apps/api/src/modules` 业务模块逐步迁移至 `packages/plugins`。
*   **推荐迁移顺序** (按依赖关系):
    | 顺序 | 源模块 | 目标插件 | 依赖项 |
    |------|--------|----------|--------|
    | 1 | `modules/nodes` | `plugin-nodes` | 无 (基础数据模型) |
    | 2 | `modules/edges` | `plugin-edges` | plugin-nodes |
    | 3 | `modules/graphs` | `plugin-graphs` | plugin-nodes, plugin-edges |
    | 4 | `modules/approval` | `plugin-workflow-approval` | plugin-nodes |
    | 5 | `modules/comments` | `plugin-comments` | plugin-nodes |
    | 6 | `modules/subscriptions` | `plugin-subscriptions` | plugin-nodes |
*   **结果**: `apps/api` 仅保留 Kernel 和 Plugin Loader。

#### 3.2 统一数据流 (Data Flow Fix)

*   **任务**: 移除前端 `updateNode` 双写。
*   **方案对比**:

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A (推荐)** | 优化 Hocuspocus `onStoreDocument`，增加 `immediateSync` 标志位供前端调用强制落库 | 保持 Yjs-First 架构纯净 | 需要修改同步协议 |
| B | 在业务 API (如 Dispatch) 中先从 Yjs 读取最新状态合并到 DB | 改动较小 | 业务层逻辑复杂化 |

---

## 4. 实施准则 (Implementation Guidelines)

1.  **"Boy Scout Rule" (童子军法则)**: 每次修改文件时，必须让它比你发现时更整洁。
2.  **零容忍**: CI 流程中加入检测，行数超过 500 行的新提交应触发警告或阻断。
3.  **API 门禁**: 禁止在 `apps/web/components` 目录下直接 import `fetch` (强制使用 hooks)。
4.  **测试先行**: 重构前必须为目标文件编写覆盖率 > 80% 的测试用例。

---

## 5. 风险评估 (Risk Assessment)

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|----------|
| **回归风险**: 拆分 `GraphComponent` 可能导致事件处理链断裂 | 高 | 中 | 拆分前编写覆盖率 > 80% 的集成测试 |
| **数据迁移风险**: 移除双写机制可能导致数据短暂不一致 | 高 | 低 | 使用功能开关 (Feature Flag)，灰度发布 |
| **插件迁移风险**: API Module 依赖关系复杂 | 中 | 中 | 按依赖顺序迁移；使用 NestJS `forwardRef` 处理循环依赖 |
| **UI 组件迁移风险**: 更换基础组件可能影响现有页面视觉 | 低 | 低 | 使用 Storybook 进行视觉回归测试 |

---

## 6. 验收标准 (Definition of Done)

### 第一阶段验收
- [ ] 所有新代码遵循 Repository 模式 (无新增 `prisma.*` 直接调用)
- [ ] 所有新组件遵循 Hook-First 模式 (无新增直接 `fetch()`)
- [ ] `packages/ui` 包含 4 个基础原子组件 (Button, Input, Card, Badge)
- [ ] ESLint 规则已添加并在 CI 中执行

### 第二阶段验收
- [ ] `GraphComponent.tsx` 拆分完成，主文件 < 300 行
- [ ] `MindNode.tsx` 重构为策略模式，主文件 < 300 行
- [ ] `useClipboard.ts` 拆分完成，每个文件 < 300 行
- [ ] 所有拆分模块有单元测试覆盖

### 第三阶段验收
- [ ] 至少 3 个业务模块完成插件化迁移
- [ ] 前端 `MindNode.tsx` 中无 `updateNode` 直接调用
- [ ] 整体单元测试覆盖率 > 70%
- [ ] 没有文件超过 500 行

---

## 7. 预期收益 (Expected Outcomes)

| 指标 | 当前状态 | 目标状态 | 改进幅度 |
|------|----------|----------|----------|
| **测试覆盖率 (Backend)** | ~40% | > 70% | +30% |
| **平均文件行数 (核心模块)** | ~800 行 | < 300 行 | -62% |
| **UI 组件复用率** | ~20% | > 60% | +40% |
| **Git 冲突频率 (核心文件)** | 高 | 低 | 显著降低 |
| **新功能开发周期** | 基准 | 缩短 30% | +30% 效率 |

---

## 8. 附录

### A. 相关设计文档引用

| 规范 | 文档位置 | 关键章节 |
|------|----------|----------|
| 插件架构 | `architecture.md` | §NocoBase-Inspired, Line 136-206 |
| Repository 模式 | `architecture.md` | §Backend Engineering, Line 676-678 |
| Yjs-First 数据流 | `architecture.md` | §Process Patterns, Line 546-549 |
| Hook-First 封装 | `project-context.md` | §Framework Rules, Line 84-86 |
| 文件大小限制 | `project-context.md` | Line 93 |
| UI 组件规范 | `architecture.md` | Line 655-656 |

### B. 代码审查清单 (Code Review Checklist)

新 PR 必须检查以下项目：

- [ ] 是否在 Service/Controller 中直接调用 `prisma.*`?
- [ ] 是否在 Component 中直接使用 `fetch()`?
- [ ] 新文件是否超过 300 行?
- [ ] UI 元素是否使用 `packages/ui` 中的组件?
- [ ] 是否遵循 Yjs-First 数据流?

---

_文档版本: v1.1 (已审修订)_  
_初版日期: 2025-12-28_  
_修订日期: 2025-12-28_  
_作者: CDM-17 架构组_
