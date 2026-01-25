# 实施计划 (Implementation Plan) - 工业 APP 平台 (Architecture v2)

# 目标描述
构建一个基于 **Rete.js** 的低代码工业 APP 设计与运行平台。核心架构采用 **Web 前端 + 本地执行代理 (Local Agent)** 的混合模式，解决 Web 端无法直接调用本地重型工业软件 (CAD/CAE) 的痛点。

## 关键架构决策 (Updated post-UX)
1.  **架构模式:** Web 应用 (UI/逻辑) + Local Agent (执行)。
2.  **编排引擎:** 客户端编排 (Browser Side Orchestration)。
3.  **UI 框架:** React + Ant Design v5 (Customize Dark Theme).
4.  **通信协议:** WebSocket (主要) + HTTP (回退)。必选**心跳检测**以显示 "Agent Latency"。
5.  **安全模型:** Agent 首次访问本地文件需**显式授权**对话框 (UX Security Spec)。

---

## 拟议变更 (Proposed Changes)

### 1. 系统架构概览 (System Architecture)

#### 1.1 Web 前端 (Frontend)
*   **技术栈:** React + Rete.js v2 + Ant Design v5.
*   **核心模块:**
    *   **Canvas Engine:** 封装 Rete.js，支持 "Wireless Mode" (隐形连线) 和 "Group" (分组)。
    *   **Navigation:** 实现 "Hybrid Breadcrumbs" (面包屑即状态)。
    *   **Onboarding:** 集成 "Demo Mode" 沙箱环境 (Mock Agent)。
    *   **Dashboard:** 实现 "ROI 仪表盘" (ECharts)，统计组件使用与工时节省。

#### 1.2 本地连接器 (Local Agent)
*   **技术栈:** Python (FastAPI/Websocket) + PyTray.
*   **安全增强:**
    *   实现 Allow List 白名单机制。
    *   实现 "Request Access" 弹窗 (Tkinter/PyQt)。
*   **功能模块:**
    *   **Execution Runtime:** 接收 JSON 图并执行。
    *   **Surrogate Runner:** 支持快速 JS 近似计算 vs 本地精确计算的切换。

#### 1.3 云端后端 (Backend)
*   **职责:** 存储 APP 元数据、用户鉴权、SECI 统计聚合。

---

### 2. 数据契约与 Schema 设计 (Data Contracts)

#### 2.1 组件定义 (Component Schema)
*   新增 `ui_schema` 字段支持 "Progressive Disclosure" (Level 1/2 参数)。
*   新增 `execution_mode` 字段区分 "Interactive" vs "Batch".

```json
{
  "id": "comp_excel_spring_calc_v1",
  "name": "Excel Spring Calculator",
  "execution_tier": "hybrid", // supports_browser_mock: true
  "inputs": [
    { "key": "d", "type": "number", "ui_level": "basic" },
    { "key": "advanced_param_x", "type": "number", "ui_level": "expert" }
  ]
}
```

---

### 3. 执行流程 (Execution Flow Update)

1.  **Initiation:** 用户拖入节点。
2.  **Connection:** 连线时播放 Audio Click。
3.  **Preview (Debounced):** 拖动参数时，前端 JS 引擎尝试运行 `mock_function` 进行毫秒级预览。
4.  **Execution (Committed):** 松开鼠标 500ms 后，发送 WebSocket 指令给 Local Agent。
5.  **Feedback:** 连线显示 "Pulse" 动画。Agent 托盘图标旋转。

---

## 验证计划 (Verification Plan)

### 自动化测试
*   **Schema 校验:** 验证新引入的 `ui_level` 和 `authorization` 字段。
*   **Mock Agent:** 编写前端测试，模拟 Agent 离线/在线/拒绝权限的各种场景。

### 手动验证 (PoC Scope)
*   **UX 验证:** "The First Twitch" —— 确保从拖动滑块到 Agent 响应的端到端延迟 < 200ms (在本地网络环境下)。
*   **安全验证:** 尝试读取非白名单目录文件，确保 Agent 弹出拒绝/询问窗口。
