---
stepsCompleted:
  - 1
  - 2
  - 3
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/ux-design-specification.md
---

# CDM-17-cc - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CDM-17-cc, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

From PRD (Section 4):

**Must Have (MVP):**
1.  **FR1 (R1) 脑图核心交互**: 支持多布局（自由/树/逻辑）、XMind 级快捷键、/命令、批量粘贴成树、节点下钻回链。
2.  **FR2 (R2) 版本与时间线**: 节点模型支持多版本历史浏览/回退，未保存版本隔离（仅本人可见）。
3.  **FR3 (R3) 任务与依赖**: 节点转任务，支持 FS/SS/FF/SF 依赖关系，依赖阻塞生效。
4.  **FR4 (R4) 执行编排**: 审批驱动流程，交付物/任务审批通过后自动推演下一任务状态并通知。
5.  **FR5 (R5) 权限与安全**: 细粒度权限（密级/字段/附件级），动态水印（在线预览），临时权限提升审批，审计记录。
6.  **FR6 (R6) 实时协同**: 多人协同光标，节点锁定/解锁，冲突提示与人工合并。
7.  **FR7 (R7) 通知系统**: 站内信节流（5分钟去重/汇总），高优事件实时通道。
8.  **FR8 (R8) 性能监测**: 1k 节点场景下 P95<100ms，协同延迟<200ms，前端/后端性能监测。

**Should Have (Phase 2/Enhanced):**
9.  **FR9 (R9) 模板库**: 结构/字段/样式模板，子树片段复用，导入导出(XMind/MD/CSV)。
10. **FR10 (R10) 跨图关系**: 跨图引用可视指示，血缘关系。
11. **FR11 (R11) 上下游协同**: 任务下发/接收/驳回流程。
12. **FR12 (R12) 社交互动**: 评论、线程回复、@提及（含节流）。
13. **FR13 (R13) 绩效基础**: 节点/任务分值统计、排名、报表。
14. **FR14 (R14) 多视图联动**: 脑图/甘特/时间轴/看板视图数据同源同步。
15. **FR15 (R15) AI 辅助**: AI 生成/扩展骨架，支持撤销/版本。
16. **FR16 (R16) 订阅机制**: 分支/节点订阅与通知节流。
17. **FR17 (R17) 数据组织**: 标签、搜索、归档、数据质量校验。
18. **FR18 (R18) 自由布局增强**: 对齐/吸附/网格控件，自由/树模式切换保持。
19. **FR19 (R19) 片段库增强**: 模板预置密级/必填字段，子树存为片段。
20. **FR20 (R20) 协同增强**: 选中状态可见，评论未读面板。
21. **FR21 (R21) 导出增强**: 多格式导出，强制水印/遮罩，范围选择。
22. **FR22 (R22) 审计视图**: 前端可见的访问/操作记录列表。
23. **FR23 (R23) 快速上手**: 快捷键提示，粘贴预览，AI 骨架插入。
24. **FR24 (R24) 分享闭环**: 生成带密级校验的分享链接，一键失效。

### NonFunctional Requirements

**Performance:**
1.  **NFR1 (Rendering)**: 1k+ 节点渲染稳定 60fps，缩放/平移无卡顿。
2.  **NFR2 (Latency)**: 初始加载 < 2s; 交互响应 P95 < 100ms; 协同同步延迟 < 200ms。
3.  **NFR3 (Concurrency)**: 支持 50 人并发协同无降级。
4.  **NFR4 (Throughput)**: 批量操作容忍度 P95 < 400ms。

**Security & Compliance:**
5.  **NFR5 (Access Control)**: 严格的 RBAC 模型，节点级安全，只有密级 >= 资源密级才可见。
6.  **NFR6 (Audit)**: 所有变更（写/读/导出/分享）必须审计，审计日志保留 >= 1年，append-only 存储。
7.  **NFR7 (Privacy)**: 导出/分享默认强制开启水印和敏感字段遮罩。

**Reliability:**
8.  **NFR8 (Data Integrity)**: 单一真相源 (SoT)，协同过程中零数据丢失 (Zero Data Loss)。
9.  **NFR9 (Resilience)**: 关键操作自动快照。

### Additional Requirements

**From Architecture:**
1.  **Sys-Arch-1 (Project Structure)**: Must use **Turborepo** Monorepo.
    - `apps/api`: NestJS (Kernel, socket.io, Prism).
    - `apps/web`: Next.js (Client, Magic UI).
    - `packages/types`: Shared Isomorphic DTOs.
    - `packages/plugins`: All business logic in separate plugins.
2.  **Sys-Arch-2 (Plugin Protocol)**: Architecture must follow "Microkernel + Plugin" pattern. Core (User, Auth, WS) is minimal; Features (Task Node, Approval) are Plugins.
3.  **Sys-Arch-3 (Real-time)**: Use **Yjs** + **Hocuspocus** for state sync; Persistence in Postgres (bytea).
4.  **Sys-Arch-4 (Auth)**: Integration with **Clerk** (Next.js Edge + NestJS Guard).
5.  **Sys-Arch-5 (Database)**: PostgreSQL + Prisma ORM.

**From UX Design:**
1.  **UX-1 (Framework)**: UI Components must use **TailwindCSS** + **Shadcn UI** + **Magic UI**.
2.  **UX-2 (Engine)**: Graph visualization must use **AntV X6** customized for React.
3.  **UX-3 (Interaction)**: Implement **XMind-compatible** keyboard shortcuts (Enter, Tab, Space).
4.  **UX-4 (Aesthetic)**: "Glassmorphism" / High quality visual aesthetic (Magic UI), Smooth "Spring" animations.

### FR Coverage Map

FR1: Epic 1 - 脑图核心交互与基础渲染
FR2: Epic 3 - 版本管理与历史回溯
FR3: Epic 2 - 任务管理与依赖网络
FR4: Epic 4 - 执行编排与自动化推演
FR5: Epic 3 - 企业级权限与动态水印
FR6: Epic 1 - 实时协同引擎
FR7: Epic 4 - 智能通知系统
FR8: Epic 1 - 性能监测与优化
FR9: Epic 5 - 模板库与知识管理
FR10: Epic 5 - 跨图引用与血缘
FR11: Epic 2 - 任务下发与上下游协同
FR12: Epic 4 - 社交互动与评论
FR13: Epic 6 - 绩效统计与报表
FR14: Epic 2 - 多视图联动（甘特/时间轴）
FR15: Epic 5 - AI 智能辅助
FR16: Epic 4 - 订阅与关注机制
FR17: Epic 2 - 数据组织与检索
FR18: Epic 1 - 自由布局增强控件
FR19: Epic 5 - 片段库增强
FR20: Epic 1 - 协同状态可视增强
FR21: Epic 3 - 安全导出系统
FR22: Epic 3 - 审计追踪视图
FR23: Epic 1 - 快速上手与指引
FR24: Epic 3 - 安全分享闭环
FR28: Epic 2 - 多选与剪贴板操作

## Epic List

### Epic 1: 协同脑图核心 (Collaborative Graph Core)
构建高性能、即时响应的“单一真相源”脑图画布，实现团队成员在同一空间内的实时思维同步。
**FRs covered:** FR1, FR6, FR8, FR18, FR20, FR23
**Core Value:** 团队可以“在一起”即时思考和创作，无需等待文件传输。

### Epic 2: 任务与视图管理 (Task & View Management)
将静态思维转化为动态执行计划，提供多维度的项目视图以满足不同角色（PM/开发）的管理需求。
**FRs covered:** FR3, FR11, FR14, FR17, FR28
**Core Value:** 项目经理和执行者可以在同一数据源上无缝切换视角，管理复杂的依赖和进度。

### Epic 4: 流程编排与沟通 (Workflow Automation & Communication)
自动化流转项目状态，并通过智能降噪的沟通机制保持团队专注与同步。
**FRs covered:** FR4, FR7, FR12, FR16
**Core Value:** 用户从繁琐的“催办”和“状态填写”中解放出来，系统自动推演进度并精准通知。

### Epic 5: 知识复用与智能辅助 (Knowledge Intelligence)
利用模板、组件化复用和 AI 能力，将隐性知识显性化，加速新项目的启动与标准化。
**FRs covered:** FR9, FR10, FR15, FR19
**Core Value:** 组织可以沉淀最佳实践，从“从零开始”变为“巨人的肩膀”。

### Epic 6: 绩效分析 (Performance Analytics)
提供基于执行数据的量化反馈，帮助团队持续优化效能。
**FRs covered:** FR13
**Core Value:** 管理者获得客观的绩效数据，团队获得清晰的目标反馈。

### Epic 3: 企业级治理与安全 (Enterprise Governance & Security)
为航天/军工级场景提供严密的数据保护、权限控制和全生命周期的审计追踪。
**FRs covered:** FR5, FR2, FR21, FR22, FR24
**Core Value:** 安全官和管理员可以放心地让敏感数据上云，确保合规与可追溯性。

---

## Epic 1: 协同脑图核心 (Collaborative Graph Core)

**目标**: 构建高性能、即时响应的“单一真相源”脑图画布，实现团队成员在同一空间内的实时思维同步。

### Story 1.1: 环境初始化与基础画布 (Environment Init & Basic Canvas)

As a **开发者**,
I want **初始化项目结构并渲染基础 X6 画布**,
So that **我们拥有构建可视化脑图应用的技术基础。**

**Acceptance Criteria:**

**Given** 一个新的开发环境
**When** 运行初始化脚本时
**Then** 应创建包含 `apps/web` (Next.js) 和 `apps/api` (NestJS) 的 Turborepo 结构
**And** `ui` 和 `types` 等共享包已配置完毕
**And** 访问 Web URL 应显示居中的空白 AntV X6 画布和默认的“根节点”
**And** 画布应支持基础平移（拖拽背景）和缩放（滚轮）交互

### Story 1.2: 节点操作与快捷键 (Node Operations & Shortcuts)

As a **用户**,
I want **使用兼容 XMind 的快捷键创建、编辑和删除节点**,
So that **我能以打字的速度捕捉思维，无需频繁使用鼠标。**

**Acceptance Criteria:**

**Given** 在画布上选中了一个节点
**When** 按下 `Enter` / `Tab` 键时
**Then** 应分别创建 `兄弟节点` / `子节点` 并自动聚焦以供编辑
**When** 按下 `Delete` 或 `Backspace` 键时
**Then** 选中的节点（及其子节点）应被移除
**When** 双击节点或按下 `Space` 键时
**Then** 应进入“编辑模式”修改文本内容
**And** 更改应立即持久化到本地状态

### Story 1.3: 高级布局控制 (Advanced Layout Control)

As a **用户**,
I want **在自由、树状和逻辑布局之间切换**,
So that **我可以按照最适合当前任务的结构组织信息。**

**Acceptance Criteria:**

**Given** 一个包含多个节点的脑图
**When** 选择“逻辑图”（向右）模式时
**Then** 节点应自动对齐为水平层级结构
**When** 选择“思维导图”（树状）模式时
**Then** 节点应遵循放射状或树状结构排列
**When** 选择“自由模式”时
**Then** 我可以将节点手动拖拽到任何位置，不受自动布局干扰
**And** 在自由模式下可以切换“网格吸附”以对齐节点

### Story 1.4: 实时协同引擎 (Real-time Collaboration Engine)

As a **用户**,
I want **即时看到队友的光标和更新**,
So that **我们可以高效地共同头脑风暴，避免版本冲突。**

**Acceptance Criteria:**

**Given** 两名用户（用户A和用户B）在同一个项目 URL 中
**When** 用户 A 添加或移动节点时
**Then** 用户 B 应在 100 毫秒内看到变化（通过 Yjs + WebSocket）
**When** 用户 A 移动鼠标时
**Then** 用户 B 应看到代表用户 A 位置的带标签光标
**And** 基础并发编辑冲突应自动解决（最后写入胜出）


## Epic 2: 任务与视图管理 (Task & View Management)

**目标**: 将静态思维转化为动态执行计划，提供多维度的项目视图以满足不同角色（PM/开发）的管理需求。

### Story 2.1: 任务转换与属性管理 (Task Conversion & Properties)

As a **用户**,
I want **将脑图节点转换为任务并管理其属性**,
So that **明确责任人和截止日期，跟踪执行进度。**

**Acceptance Criteria:**

**Given** 画布上选中了一个普通节点
**When** 点击“转为任务”或使用快捷键时
**Then** 节点样式应变更，出现状态指示器（如复选框）
**When** 编辑任务属性（开始时间、截止时间、优先级、执行人）时
**Then** 数据应保存并清晰显示在节点详情面板中
**When** 点击任务的“完成”复选框时
**Then** 任务状态应变为 Done，且节点视觉样式更新（如变灰或删除线）

### Story 2.2: 任务依赖关系网络 (Task Dependency Network)

As a **项目经理**,
I want **定义任务之间的依赖关系（如 FS, SS）**,
So that **系统能清晰表达执行顺序，防止逻辑错误。**

**Acceptance Criteria:**

**Given** 两个任务节点（任务A，任务B）
**When** 从任务A 拖拽依赖连线到 任务B 时
**Then** 应建立依赖关系（默认类型为 FS：A完成才能开始B）
**When** 尝试创建循环依赖（如 A->B->A）时
**Then** 系统应拦截操作并提示“检测到循环依赖”错误
**And** 依赖连线应在画布上以不同于层级关系的视觉样式（如虚线或特定颜色）显示

### Story 2.3: 多视图联动 (Multi-View Synchronization)

As a **用户**,
I want **在甘特图和看板视图中查看和编辑同一份任务数据**,
So that **我能从时间维度（甘特）和状态维度（看板）灵活管理项目。**

**Acceptance Criteria:**

**Given** 一个包含多个任务数据的脑图
**When** 切换到“甘特视图”时
**Then** 任务应按时间轴在甘特图中渲染，且依赖关系可见
**When** 在甘特图中拖拽任务条调整时间时
**Then** 脑图节点中的时间属性应实时更新
**When** 切换到“看板视图”时
**Then** 任务应按状态（待办/进行中/已完成）分组排列
**And** 任何视图中的修改都应实时同步到单一数据源，确保视图一致性

### Story 2.4: 任务下发与反馈 (Task Dispatch & Feedback)

As a **项目经理**,
I want **向下游执行者下发任务，并接收他们的接收确认或驳回反馈**,
So that **我可以确保任务责任落实到位，且沟通透明无歧义。**

**Acceptance Criteria:**

**Given** 我通过节点创建了一个新任务并指定了执行人
**When** 点击“下发任务”按钮
**Then** 执行人应收到“新任务待确认”的通知
**When** 执行人点击“接收”
**Then** 任务状态变更为 "Pending" 或 "Todo"，且我会收到确认通知
**When** 执行人点击“驳回”
**Then** 必须填写驳回理由，任务退回给我，状态变更为 "Draft" 或 "Rejected"
**And** 所有的状态变更和理由都应记录在任务日志中供审计

### Story 2.5: 数据组织与全图检索 (Data Organization & Search)

As a **用户**,
I want **通过标签对节点进行分类，并能在全图范围内快速检索**,
So that **我能有效管理海量信息，快速定位所需内容。**

**Acceptance Criteria:**

**Given** 一个包含大量节点（标题、描述、任务信息）的脑图
**When** 我按下全局搜索快捷键（如 Cmd+K）
**Then** 应弹出搜索面板，支持输入关键词搜索节点标题和内容
**When** 我输入关键词并确认
**Then** 画布应高亮显示匹配的节点，并自动定位到第一个匹配项
**When** 我选中一个节点并添加“标签”（如 #HighPriority）
**Then** 标签应可视地显示在节点上
**When** 我点击某个标签或在搜索框输入 `#Tag`
**Then** 系统应过滤并只高亮显示带有该标签的节点
**And** 我可以将不再需要的节点“归档”，归档后的节点在默认视图中隐藏但在“归档箱”中可见且可恢复

### Story 2.6: 多选与剪贴板 (Multi-Select & Clipboard)

As a **用户**,
I want **选择多个节点并进行复制、剪切、粘贴**,
So that **我可以高效地重组脑图结构，或在不同画布间迁移数据。**

**Acceptance Criteria:**

**Given** 画布上有多个节点
**When** 按住 Shift 点击或拖拽框选时
**Then** 所有涉及的节点应进入选中状态（视觉反馈）
**When** 按下 `Cmd+C` (Copy)
**Then** 选中节点的结构数据（含子节点关系）应被序列化到系统剪贴板
**When** 按下 `Cmd+V` (Paste)
**Then** 剪贴板中的节点结构应被粘贴到当前鼠标位置或选中节点下
**And** 粘贴的节点 ID 应重新生成以避免重复，但相对结构保持不变
**And** 支持跨浏览器标签页或窗口的复制粘贴

### Story 2.7: PBS 节点增强 (PBS Node Enhancement)

As a **研发工程师**,
I want **为 PBS 节点设置指标并从产品库中搜索复用**,
So that **我能定义产品的技术参数，并复用已有的标准化产品结构。**

**Acceptance Criteria:**

**Given** 选中一个 PBS 类型节点
**When** 在详情面板中添加指标（如重量、成本、可靠性）
**Then** 可自定义指标名称、单位，并设置目标值与实际值
**And** 系统应提供常用工程指标预设（如质量、体积、功率等）
**When** 点击"搜索产品"按钮
**Then** 弹窗展示全局共享产品库的搜索界面
**When** 选中一个已有产品条目
**Then** 当前节点创建对该产品的引用（链接），后续源产品更新时同步显示

### Story 2.8: 知识关联与推荐 (Knowledge Link & Recommendation - Mock)

As a **用户**,
I want **在任务节点上关联知识资源，并获得节点的知识推荐**,
So that **我能快速找到执行任务所需的参考资料。**

**Acceptance Criteria:**

**Given** 选中任意节点
**When** 在右侧详情面板查看时
**Then** 显示"知识推荐"区域（本阶段使用 Mock 数据）
**Given** 选中一个 Task 类型节点
**When** 在详情面板中点击"关联知识"
**Then** 可选择已关联的知识条目（本阶段使用 Mock 数据）
**Note** 实际知识库集成和 AI 推荐功能将在 Epic 5 中实现。

### Story 2.9: APP 节点类型与工业软件集成 (APP Node Type)

As a **用户**,
I want **创建 APP 节点并调用工业软件或 Web 应用**,
So that **我能在脑图中直接启动相关工具，实现工作流的一体化。**

**Acceptance Criteria:**

**Given** 画布上选中一个普通节点
**When** 将节点类型转换为 "APP"
**Then** 节点显示 APP 专属图标和样式
**When** 在详情面板中配置 APP 信息
**Then** 可选择系统管理员预配置的应用列表（本地桌面应用或 Web API）
**When** 点击节点上的"启动"按钮
**Then** 系统启动对应应用（本地：打开可执行文件；Web：调用 API）
**And** 通过数据线传递上游节点数据作为启动参数
**And** 下游节点可接收 APP 返回的输出数据



## Epic 4: 流程编排与沟通 (Workflow Automation & Communication)

**目标**: 自动化流转项目状态，并通过智能降噪的沟通机制保持团队专注与同步。

### Story 4.1: 审批流驱动 (Approval Driven Workflow)

As a **用户**,
I want **提交任务产物进行审批，审批通过后自动触发后续流程**,
So that **自动化推进项目，减少人工协调成本。**

**Acceptance Criteria:**

**Given** 一个配置了“审批”流程的任务节点
**When** 执行人上传交付物并点击“提交审批”时
**Then** 指定的审批人应立即收到审批请求通知
**When** 审批人点击“通过”时
**Then** 当前任务状态变为 Done，且其所有“后置依赖任务”的状态应自动更新为 "Pending/Todo"（解锁）
**When** 审批人点击“驳回”时
**Then** 任务退回 "In Progress" 状态，并强制要求填写驳回理由

### Story 4.2: 智能通知中心 (Smart Notification Center)

As a **用户**,
I want **接收重要消息的通知，但系统能自动过滤噪音**,
So that **我能关注重要事项，避免信息过载。**

**Acceptance Criteria:**

**Given** 系统中短时间内发生了大量变更操作（如批量修改）
**When** 系统生成通知时
**Then** 针对同一对象的同类事件应在 5 分钟窗口内进行去重和汇总（例如显示为“张三修改了 5 个节点”）
**When** 收到 `@提及` 或 `审批请求` 等高优先级事件时
**Then** 应绕过节流机制，通过实时通道立即送达
**And** 通知中心应清晰区分“未读”和“已读”状态，支持一键标为已读

### Story 4.3: 上下文评论与@提及 (Contextual Comments & Mentions)

As a **用户**,
I want **在具体节点上发表评论并 @提及 队友**,
So that **我们可以围绕具体工作内容进行上下文相关的沟通。**

**Acceptance Criteria:**

**Given** 画布上的任意节点
**When** 点击“评论”图标时
**Then** 应在侧边栏或浮层中显示该节点的评论线程
**When** 在输入框中输入 `@` 字符时
**Then** 应弹出项目成员列表供选择
**When** 发送评论后
**Then** 评论内容应实时同步给所有查看者，且被提及的成员收到通知
**And** 含有未读评论的节点应在画布上有视觉提示（如红点）

### Story 4.4: 关注订阅机制 (Watch & Subscription)

As a **关注者**,
I want **订阅特定的脑图分支或节点**,
So that **我能及时获知该重要模块的任何变动，即使我不是直接责任人。**

**Acceptance Criteria:**

**Given** 一个其他团队负责的重要分支节点
**When** 我右键点击该节点并选择“关注”或“订阅”
**Then** 我应被添加到该节点的“关注者列表”中
**When** 该节点或其子节点发生变更（内容修改、状态更新）时
**Then** 系统应向我发送站内信通知
**And** 通知应遵循 5 分钟去重/汇总策略（避免密集操作导致刷屏）
**When** 我在通知中点击“取消关注”
**Then** 我将不再收到该节点的后续更新通知


## Epic 5: 知识复用与智能辅助 (Knowledge Intelligence)

**目标**: 利用模板、组件化复用和 AI 能力，将隐性知识显性化，加速新项目的启动与标准化。

### Story 5.1: 模板库与实例化 (Template Library)

As a **用户**,
I want **在创建新文件时选择预置的行业标准模板**,
So that **我能快速启动项目，无需从零搭建结构。**

**Acceptance Criteria:**

**Given** 用户点击“新建文件”
**When** 选择“从模板创建”
**Then** 显示模板库列表（如“敏捷研发管理”、“故障复盘”等）
**When** 选中一个模板并确认
**Then** 新文件应自动填充模板预置的节点结构、样式和属性字段
**And** 模板中预设的密级要求应自动应用到新文件

### Story 5.2: 子树片段保存与复用 (Subtree Fragments)

As a **用户**,
I want **将常用的节点结构保存为“片段”并在其他地方复用**,
So that **沉淀最佳实践，提高绘图效率。**

**Acceptance Criteria:**

**Given** 画布上选中的一组节点（子树）
**When** 右键选择“保存为片段”
**Then** 该结构被保存到个人或团队的片段库中
**When** 在另一个图（或当前图其他位置）打开片段库
**Then** 可以预览并拖拽该片段到画布中
**And** 插入的片段应保留原有的结构、数据和样式

### Story 5.3: 跨图引用与连接 (Cross-Graph Linking)

As a **用户**,
I want **在当前图中引用另一个图的节点**,
So that **我可以构建跨项目的网状知识体系。**

**Acceptance Criteria:**

**Given** 两个不同的脑图文件（图A 和 图B）
**When** 在图A 中复制一个节点的链接，并粘贴到 图B
**Then** 图B 中应生成一个特殊的“引用节点”
**When** 点击该引用节点
**Then** 系统应打开 图A 并自动定位到源节点
**And** 引用节点应显示源节点的实时摘要信息（如标题、状态）

### Story 5.4: AI 智能生成与扩展 (AI Generation)

As a **用户**,
I want **利用 AI 自动生成脑图骨架或扩展子节点**,
So that **突破思维卡点，获得灵感和辅助。**

**Acceptance Criteria:**

**Given** 选中一个节点（作为主题）
**When** 使用“AI 扩展”功能（或输入 /AI 指令）
**Then** AI 应根据节点内容生成推荐的子节点列表
**When** 用户确认采纳
**Then** 生成的节点应自动添加到画布中
**And** 生成过程应支持“撤销”操作以回滚不满意的结果

## Epic 6: 绩效分析 (Performance Analytics)

**目标**: 提供基于执行数据的量化反馈，帮助团队持续优化效能。

### Story 6.1: 任务绩效数据统计 (Task Performance Statistics)

As a **管理者**,
I want **查看个人或团队的任务完成率、逾期率和平均处理时长**,
So that **我可以客观评估团队效能并识别瓶颈。**

**Acceptance Criteria:**

**Given** 系统中累积了历史任务数据
**When** 访问绩效仪表盘
**Then** 应显示关键指标：任务总数、完成率%、逾期率%、平均（开始-完成）周转时间
**And** 支持按 时间范围（周/月/季）和 人员/小组 进行筛选

### Story 6.2: 绩效报表导出 (Performance Report Export)

As a **管理者**,
I want **将绩效统计数据导出为 Excel 或 CSV 格式**,
So that **我可以进行二次数据分析或制作汇报材料。**

**Acceptance Criteria:**

**Given** 当前查看到的绩效数据视图
**When** 点击“导出报表”
**Then** 系统应生成包含详细原始数据（如任务列表、执行人、起止时间、状态变更记录）的文件
**And** 导出操作应被记录在审计日志中

## Epic 3: 企业级治理与安全 (Enterprise Governance & Security)

**目标**: 满足航天/军工级合规要求，数据绝对安全。

### Story 3.1: 细粒度密级权限与水印 (Granular Access & Watermark)

As a **安全管理员**,
I want **给脑图节点和字段设置密级（公开/内部/秘密/机密），并强制显示水印**,
So that **防止敏感信息泄露给无权限人员。**

**Acceptance Criteria:**

**Given** 一个被标记为“机密”的节点
**When** 密级为“内部”的用户尝试查看该节点时
**Then** 节点内容应被完全遮罩或对该用户隐藏
**Given** 任何用户访问应用界面
**When** 页面渲染时
**Then** 画布上方应强制显示包含 `用户名 + 当前时间 + IP后四位` 的动态平铺水印
**When** 用户具有查看权限但无编辑权限时
**Then** 该用户可以看到内容但无法进行修改，且相关工具栏按钮禁用

### Story 3.2: 全生命周期审计日志 (Comprehensive Audit Log)

As a **审计员**,
I want **查看系统内所有关键操作的不可篡改记录**,
So that **在发生泄密或违规操作时可以精确追溯责任 (Who, When, What)。**

**Acceptance Criteria:**

**Given** 用户执行了 增删改/导出/分享/权限变更 操作
**When** 操作完成后
**Then** 系统应自动记录一条审计日志，包含：操作人ID、操作类型、资源ID、时间戳、客户端IP
**When** 具有审计权限的用户访问“审计视图”时
**Then** 可以按时间范围、用户、操作对象筛选并查看日志列表
**And** 审计记录本身不可被任何用户（包括管理员）修改或删除

### Story 3.3: 安全版本历史与回退 (Secure Version History)

As a **用户**,
I want **查看和回退历史版本，且未发布的草稿对他人不可见**,
So that **我可以安全地修改而不影响他人，或在错误时恢复。**

**Acceptance Criteria:**

**Given** 我正在编辑但尚未发布新版本的节点
**When** 其他用户查看同一节点时
**Then** 他们只能看到上一个“已发布”的版本，我的临时修改对他们不可见
**When** 我点击“版本历史”时
**Then** 可以看到该节点的历史版本列表，并能预览每个版本的内容
**When** 执行“回退”操作时
**Then** 当前内容被覆盖为选定的历史版本，并生成一条新的版本记录

### Story 3.4: 安全分享与导出管控 (Secure Export & Share)

As a **用户**,
I want **确保生成的分享链接和导出的文件都经过密级校验和脱敏处理**,
So that **数据在离开系统环境后依然能得到最大程度的保护。**

**Acceptance Criteria:**

**Given** 一个包含部分“机密”字段的脑图
**When** 用户尝试导出为 PDF 或 图片 时
**Then** 如果用户权限不足，机密字段应在导出文件中显示为 `***` (遮罩)
**And** 导出文件中必须嵌入强制水印
**When** 生成分享链接时
**Then** 可以设置链接的有效期（最大30天）和访问密码
**And** 通过该链接访问的用户只能看到其权限允许看到的内容，或链接本身继承创建者的权限视图（视安全策略而定）

### Story 3.5: 性能优化 (Performance Optimization)

As a **用户**,
I want **即使在有超过 1000 个节点时也能流畅交互**,
So that **工具在处理复杂、大规模项目时依然可用。**

**Acceptance Criteria:**

**Given** 预加载了 1000 个节点的脑图
**When** 执行缩放、平移或拖拽操作时
**Then** 渲染帧率应保持在 60fps 以上
**And** 视口外的节点应被虚拟化（不渲染在 DOM 中）以节省资源
**And** 1000 节点图的初始加载时间应低于 2 秒

## Epic 7: 架构重构与技术债偿还 (Architecture Refactoring & Tech Debt)

**目标**: 对齐架构设计文档，修复核心架构偏离（Repository模式缺失、双写问题、组件库缺失），降低维护成本并提升系统稳定性。

### Story 7.1: 后端 Repository 模式重构 (Backend Repository Pattern)

As a **后端开发者**,
I want **将所有直接的 Prisma 调用封装进 Repository 层**,
So that **业务逻辑与数据访问解耦，实现可测试性和架构一致性。**

**Acceptance Criteria:**

**Given** `AttachmentsController` 和 `CollabService` 中存在直接的 `prisma.*` 调用
**When** 执行重构后
**Then** 所有数据库操作应通过 `AttachmentsRepository` 和 `GraphRepository` 进行
**And** `prisma.*` 调用在 Controller 和 Service 层应被移除
**And** 添加 ESLint 规则禁止在业务层直接导入 `@prisma/client`
**And** 现有功能（附件上传、协作同步）通过回归测试

### Story 7.2: 前端 Hook-First 模式提取 (Frontend Hook-First Extraction)

As a **前端开发者**,
I want **将散落在 UI 组件中的 `fetch` 调用提取为自定义 Hooks**,
So that **UI 组件保持纯净，API 逻辑可复用且易于测试。**

**Acceptance Criteria:**

**Given** `ApprovalStatusPanel` 和 `TaskDispatchSection` 中存在直接的 `fetch` 调用
**When** 执行重构后
**Then** 逻辑应迁移至 `useApproval` 和 `useTaskDispatch` Hooks
**And** 组件中不再包含直接的 `fetch` 或 API 状态管理逻辑
**And** 添加 ESLint 规则禁止在 `components` 目录下直接使用 `fetch`

### Story 7.3: UI 原子组件库搭建 (UI Atomic Components)

As a **UI 开发者**,
I want **在 `packages/ui` 中建立标准化的原子组件库**,
So that **消除 ad-hoc 样式代码，保证全站视觉一致性。**

**Acceptance Criteria:**

**Given** `packages/ui` 目前缺失基础组件
**When** 开发完成后
**Then** 应包含功能完整的 `Button`, `Input`, `Card`, `Badge` 组件
**And** 组件均支持设计规范定义的变体（Primary, Ghost, Danger 等）
**And** 提供 Storybook 文档或示例页面验证组件样式

### Story 7.4: 核心巨型文件拆分 (Phase 2 - God Class Splitting)

As a **开发者**,
I want **将 `GraphComponent.tsx` 和 `MindNode.tsx` 拆分为职责单一的小型模块**,
So that **代码可读性提升，Git 冲突减少，单元测试更易编写。**

**Acceptance Criteria:**

**Given** `GraphComponent.tsx` (>1300行), `MindNode.tsx` (>900行) 和 `useClipboard.ts` (>900行)
**When** 执行拆分后
**Then** 主文件行数应降低至 300 行以内
**And** 功能被拆分至 `GraphEvents`, `GraphHotkeys`, `NodeRenderer`, `usePasteHandlers` 等独立模块
**And** 所有原有交互功能（绘图、捷径、编辑）通过 E2E 回归测试

### Story 7.5: 业务模块插件化迁移 (Phase 3 - Plugin Migration)

As a **架构师**,
I want **将核心业务模块从 API 单体迁移至独立的插件包**,
So that **系统架构符合 Microkernel 设计，提升可扩展性和解耦度。**

**Acceptance Criteria:**

**Given** 当前业务逻辑紧耦合在 `apps/api/src/modules`
**When** 执行迁移后
**Then** `nodes`, `edges`, `approval`, `comments` 等模块应移动至 `packages/plugins`
**And** `apps/api` 仅保留 Kernel loader 和基础服务
**And** 模块间依赖关系清晰，无循环依赖

### Story 7.6: 数据流一致性修复 (Phase 3 - Data Flow Consistency)

As a **开发者**,
I want **移除前端组件中的双写逻辑，严格遵循 Yjs-First 单向数据流**,
So that **消除数据竞态条件和潜在的脑裂风险。**

**Acceptance Criteria:**

**Given** 前端存在同时写入 Yjs 和调用 REST API 更新节点的情况 (如 `MindNode.tsx`)
**When** 执行重构后
**Then** 前端仅应修改 Yjs 本地状态
**And** 后端应通过 Hocuspocus 钩子或同步协议自动处理数据持久化
**And** 移除所有组件层面的直接 `updateNode` API 调用
**And** 并在高并发场景下验证数据一致性

