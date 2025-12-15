---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - docs/prd.md
  - docs/project-brief.md
  - docs/research-milanote.md
workflowType: 'ux-design'
lastStep: 0
project_name: 'CDM-17-Gemini'
user_name: 'Enjoyjavapan'
date: '2025-12-15'
---

# UX Design Specification CDM-17-Gemini

**Author:** Enjoyjavapan
**Date:** 2025-12-15

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision
构建以**脑图为单一真相源 (SoT)** 的协同研发平台。打破“项目-任务-汇报”的割裂模式，实现需求、任务、知识、审批、执行在同一可视化空间的实时流动。

### Target Users
*   **项目经理/SE:** 梳理需求依赖，下发任务，追踪进度 (甘特/时间线)。
*   **研发/架构/测试:** 在脑图中协同建模，下钻子图，提交交付物。
*   **安全/合规负责人:** 配置密级，审计违规，管理权限。

### Key Design Challenges
*   **复杂性与易用性的平衡:** 既要支持 MBSE/强逻辑/审批流，又要保持类似 Milanote 的自由灵活与低门槛。
*   **高密度信息展示:** 在脑图节点上呈现多种状态 (密级/进度/审批/依赖) 而不显得杂乱。
*   **高性能交互:** 1k+ 节点、50 人并发下的流畅体验 (AntV X6 的性能调优是关键)。

### Design Opportunities
*   **现代化视觉体验:** 利用 TailwindCSS 和 Magic UI 打造超越传统工具的流畅、高质感界面。
*   **高性能图引擎:** 发挥 Ant Design X6 的定制化能力，实现丝滑的脑图交互和自定义节点渲染。
*   **无缝协同:** 通过实时协作和动态水印，增强团队信任与安全感。

## Core User Experience

### Defining Experience
CDM-17-Gemini 提供**双模驱动**的协同体验：结合 **XMind 级的键盘流** (Enter/Tab 极速构建) 与 **Milanote 级的自由布局**。它是团队的单一真相源 (SoT)，让“画图”直接转化为可追踪的“做事”，实现需求、审批与执行的一体化流动。

### Platform Strategy
*   **Desktop First:** 优先优化桌面端 Web 体验，充分利用键盘快捷键和鼠标精度，服务于高强度专业工作。
*   **Browser as OS:** 利用现代浏览器能力 (WASM/Canvas) 提供原生级性能。

### Effortless Interactions
*   **Keyboard Velocity (指尖极速):** 复刻 XMind 快捷键体系 + `/` 命令，全键盘覆盖，实现肌肉记忆级操作。
*   **Smart Layout (智能版式):** 自动对齐、美观默认值、连接线避让，让结构自然生长。
*   **Collaborative Flow (无缝协同):** 实时同步、动态水印、多人光标，提供流畅的“在一起”的感觉。
*   **Focus Mode (ZEN):** 一键沉浸，隐藏无关 UI，专注当前分支思考。

### Critical Success Moments
*   **The "Flow" Moment:** 这是一种“心流”体验 —— 用户仅凭键盘敲击，在 1 分钟内流畅构建出完整的思维骨架。
*   **The "Magic" Moment:** 粘贴一段杂乱文本，瞬间转化为结构清晰、带任务属性的脑图树。
*   **The "Power" Moment:** 审批通过，下游任务自动解锁并精准推送到执行人指尖。

### Experience Principles
*   **Keyboard First (键盘优先):** 效率至上，手指不离键盘。
*   **Aesthetic Intelligence (美学智能):** 默认即美，系统接管繁琐的排版工作。
*   **Visual Truth (可视即真实):** 复杂的业务状态 (密级/审批) 必须直观可视，所见即所得。
*   **Performance is Feature (性能即功能):** 1k+ 节点 60fps 的流畅度是信任的基石。

## Desired Emotional Response

### Primary Emotional Goals
*   **In Control (掌控感):** 面对复杂的航天/大型项目，用户不应感到焦虑，而是通过清晰的结构和可视化的状态，感到一切尽在掌握。
*   **Empowered (赋能感):** 当复杂的执行逻辑被自动推演时，用户会感觉系统是强大的“副驾驶”，赋予了自己处理复杂事务的能力。
*   **Delight (愉悦感):** 尽管是专业工具，但每一次键盘操作的清脆响应、每一次丝滑的动画，都应带来微小的愉悦，抵消工作的枯燥。

### Emotional Journey Mapping
*   **First Impression:** "Wow, it's beautiful." —— 打破对传统工业软件丑陋/老旧的刻板印象。
*   **Building:** "It keeps up with my speed." —— 键盘流操作带来的同步感与心流。
*   **Collaborating:** "We are in sync." —— 看到队友光标和动态水印带来的安全感。
*   **Troubleshooting:** "It's safe." —— 版本回滚和审计记录带来的托底感。

### Micro-Emotions
*   **Avoid:** 焦虑 (Uncertainty), 挫败 (Frustration), 困惑 (Confusion)。
*   **Create:** 确定性 (Certainty), 成就感 (Accomplishment), 信任 (Trust)。

### Design Implications
*   **Solid Feedback:** 关键操作需要有明确的视觉/触觉/听觉反馈，营造类似操作高端仪器的精密感。
*   **Lucid & Clear:** 界面采用毛玻璃/半透明暗示信息的流动性，但内容层必须保持高对比度以确保专业可读性。
*   **Trust Signals:** 任何自动化操作（如审批推演）都必须提供明确的“原因”和“结果”预览，消除黑盒恐惧。

### Emotional Design Principles
*   **Professional yet Human:** 专业不代表冷漠。通过微交互（Micro-interactions）注入人性化的温度。
*   **Calm Technology:** 只有在需要时才打扰用户。通知和提醒必须经过节流和优先级排序，维护用户的专注力。

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis
*   **XMind (交互核心):**
    *   **优点:** 极致的键盘流 (Keyboard Flow)，结构自动平衡。
    *   **借鉴:** 复刻全套快捷键体系；引入“自动布局引擎”，让用户只关注内容，不操心排版。
*   **Milanote (布局核心):**
    *   **优点:** 自由画布，多媒体混排，视觉化整理。
    *   **借鉴:** 引入“自由模式”，允许在脑图旁随意贴图、便签，用于灵感收集阶段。
*   **Linear / Arc (视觉与质感):**
    *   **优点:** 高性能、微交互、克制而高级的视觉语言。
    *   **借鉴:** 使用 Magic UI 风格的动态效果；保持界面“通透感”；高性能渲染 (60fps)。

### Transferable UX Patterns
*   **Command Palette (命令面板):** 类似 Notion/VS Code 的 `/` 唤起菜单，集成所有功能，减少鼠标点击。
*   **Infinite Canvas (无限画布):** 支持无限拖拽、缩放，但提供 "Back to Center" 一键复位。
*   **Contextual Toolbars (上下文浮动条):** 选中节点时才出现工具条，平时隐藏，保持界面极简 (Zan mode)。

### Anti-Patterns to Avoid
*   **过度拟物化:** 避免像旧版思维导图软件那样使用复杂的渐变、阴影和拟物图标。
*   **深层菜单:** 拒绝右键菜单嵌套超过 2 层。高频操作必须在一级或快捷键触达。
*   **保存焦虑:** 杜绝“手动保存”按钮，必须全自动增量同步。

### Design Inspiration Strategy
*   **Adopt:** XMind 的键盘快捷键映射 (为了肌肉记忆)；Magic UI 的交互动效。
*   **Adapt:** Milanote 的自由布局，需限制在“非结构化区”或“自由模式”，避免破坏核心逻辑图的严谨性。
*   **Avoid:** 任何阻断心流的模态弹窗 (Modal Windows)，尽可能使用 Popover 或 Sidebar。

## Design System Foundation

### Design System Choice
*   **Utility Framework:** TailwindCSS
*   **Visual Components:** Magic UI + Shadcn UI
*   **Graph Engine:** Ant Design X6

### Rationale for Selection
1.  **TailwindCSS:** 我们的界面需要大量的自定义布局和微调，Tailwind 是构建独一无二设计的最佳选择，且无运行时性能损耗。
2.  **Magic UI & Shadcn UI:** Shadcn 提供了坚实的无障碍交互基础 (Radix)，Magic UI 注入了关键的 "Wow" 因素 (如 Animated Borders)，符合情感目标。
3.  **Ant Design X6:** 唯一能满足“企业级性能 (1k+ 节点)”与“深度定制 (React渲染)”双重需求的引擎。

### Implementation Approach
*   **Headless First:** 交互逻辑依赖 Headless UI (Radix)，视觉表现完全由 Tailwind 控制。
*   **Graph-UI Hybrid:** X6 画布层负责图操作，React UI 层负责悬浮面板与工具栏，两者通过事件总线实时通信。

### Customization Strategy
*   **Theme:** 定义 "CDM Professional" 主题，强调高对比度文字与毛玻璃背景的结合。
*   **Motion System:** 建立统一的弹簧动效 (Spring Animation) Token，拒绝线性动画，确保“跟手感”。
