# 软件需求规格说明书 (Software Requirements Specification)
**项目名称:** 工业 APP 低代码设计与运行平台
**版本:** 1.0 Draft

## 1. 引言

### 1.1 目的
构建一个基于 Web 的低代码工业平台，支持技术专家通过“组件-插件-APP”的多级结构，封装工业知识（Excel, CAD, CAE, 代码），并编排成可视化的工业 APP。平台旨在促进工业知识的 SECI（社会化、外化、组合、内化）循环。

### 1.2 范围
系统包含 Web 前端设计器、Web 运行端、以及部署在用户终端的“本地执行代理 (Local Execution Agent)”。系统核心基于 Rete.js 实现节点式编排。

### 1.3 核心术语
*   **组件 (Component):** 工业能力的原始封装（类）。如：一个 Python 脚本、一个 Excel 模板、NX 软件的调用接口。
*   **插件 (Plugin):** 组件的实例化配置（对象）。包含特定的 I/O 映射、UI 控件配置、前处理/后处理逻辑。
*   **APP:** 由多个插件通过数据流连接组成的有向无环图 (DAG)，解决特定的工程问题。

---

## 2. 总体描述

### 2.1 用户角色
*   **技术专家 (Technical Expert):**
    *   **职责:** 封装组件，配置插件 UI，设计 APP 流程 (Rete 图)。
    *   **技能:** 懂 Python/Excel 宏，熟悉 CAD/CAE 接口。
*   **专业人员 (User):**
    *   **职责:** 使用 APP 进行日常作业（0/1维计算、快速建模、仿真报告）。
    *   **技能:** 领域业务知识，无需编程。

### 2.2 系统架构 (Web + Local Agent)
采用 **浏览器端编排 (Client-Side Orchestration)** 模式：
1.  **Web 端:** 负责 UI 展示、逻辑编排、指令下发。
2.  **本地代理 (Local Agent):** 驻留用户 PC，负责调用本地安装的重型软件 (NX, Creo, Ansys) 或运行脚本，不仅解决版权/许可问题，也利用本地算力。
3.  **云端:** 负责存储 APP 定义、组件库、用户权限与统计数据。

### 2.3 数据流模式
*   **默认 (Default):** 传递 **本地文件绝对路径** (String)。插件间的数据交换视为在同一台机器上的文件读写。
*   **远程 (Remote):** 当需将结果归档至服务器时，触发文件上传。

---

## 3. 功能需求 (Functional Requirements)

### 3.1 核心画布 (Canvas) - 基于 Rete.js
*   **FR-CAN-01 节点管理:** 支持组件/插件拖入画布生成节点。节点需显示状态（就绪/运行/错误/完成）及微型进度条。
*   **FR-CAN-02 连线逻辑:** 支持数据流连接。连接线代表参数传递方向及执行依赖关系。
*   **FR-CAN-03 全局 I/O:** 支持配置 APP 的全局输入（Start 节点）和全局输出（Report 节点）。
*   **FR-CAN-04 嵌套:** 支持将一个现有的 APP 封装为一个“超级插件”节点（Sub-graph）。

### 3.2 组件与插件体系
*   **FR-CPT-01 多类型支持:**
    *   **EXE/DLL:** 封装可执行程序。
    *   **Excel:** 封装计算表格（输入/输出单元格映射）。
    *   **CAD/CAE:** 封装 NX/Creo/ProE/Ansys 等（通过脚本/日志文件驱动）。
    *   **Code:** 封装 Python/Java/JS 脚本。
*   **FR-PLG-01 UI 低代码配置:** 插件配置支持为输入参数绑定 UI 控件（文本框、滑块、下拉框、文件选择器）。
*   **FR-PLG-02 逻辑控制:** 支持配置“前处理脚本”（运行前修改输入）和“后处理脚本”（运行后提取结果）。
*   **FR-PLG-03 实时预览:** 支持“监听”UI 控件变化（如拖动滑块），自动触发轻量级计算更新。

### 3.3 运行与调试
*   **FR-RUN-01 编排执行:** 浏览器 Rete 引擎按依赖顺序通过 WebSocket 指挥 Local Agent 执行节点。
*   **FR-RUN-02 日志监控:** 实时回传 Local Agent 的标准输出 (stdout/stderr) 至 Web 端控制台。
*   **FR-RUN-03 调试模式:** 支持断点暂停、单步执行、查看中间节点数据。

### 3.4 工业可视化
*   **FR-VIS-01 办公文档:** 支持 Office 在线预览 (PDF 转换或 OnlyOffice 集成)。
*   **FR-VIS-02 3D 模型:** Web 端集成 `Three.js`，Local Agent 负责将 CAD 原生格式转换为 GLTF/OBJ 上传展示。
*   **FR-VIS-03 仿真云图:** Web 端集成 `vtk.js`，展示有限元分析结果。

### 3.5 知识管理 (SECI)
*   **FR-KM-01 统计面板:** 记录 APP/插件的调用次数、成功率、平均耗时。
*   **FR-KM-02 知识转化:** 提供“另存为组件”功能，支持将个人改动的插件固化为公共组件。

---

## 4. 非功能需求 (Non-Functional Requirements)

*   **NFR-PERF-01 实时性:** “拖动滑块”预览场景下，轻量级计算（如 Excel 公式）端到端延迟 < 200ms。
*   **NFR-SEC-01 代理安全:** Local Agent 必须具备白名单机制，仅允许读写特定工作目录，防止恶意删改系统文件。
*   **NFR-COMP-01 兼容性:** Local Agent 需适配 Windows 10/11 (工业界主流)。

---

## 5. 接口与数据定义 (Interface & Data)

### 5.1 组件数据结构 (JSON Schema)
```json
{
  "id": "comp_uuid",
  "type": "excel | python | nx_open",
  "inputs": [{"name": "var1", "type": "number", "unit": "mm"}],
  "outputs": [{"name": "res1", "type": "file_path"}],
  "driver_manifest": { 
     "path": "scripts/calc.py",
     "env": "python3.9"
  }
}
```

### 5.2 插件配置结构
```json
{
  "component_id": "comp_uuid",
  "ui_schema": {
    "var1": { "widget": "slider", "min": 0, "max": 100 }
  },
  "logic_script": "result = input * 2" 
}
```

---

## 6. 附录
*   **待定事项:** 具体的 Local Agent 通信协议 (WebSocket JSON RPC) 定义。
