# Story 2.9: APP 节点类型与工业软件集成 (APP Node Type)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **用户** (User),
I want **创建 APP 节点并调用工业软件或 Web 应用** (create APP nodes and invoke industrial software or web apps),
so that **我能在脑图中直接启动相关工具，实现工作流的一体化** (I can directly launch related tools from the mind map/graph, achieving an integrated workflow).

## Acceptance Criteria

### 1. App Node Visualization (APP 节点可视化)
- **AC1.1 (Appearance):** Given a node is converted to type "APP", Then it should display a distinct "Application" icon (e.g., Grid/Box icon) and a specific border color (e.g., Cyan/Blue) to distinguish it from Task/Knowledge nodes.
- **AC1.2 (Launch Button):** The node must have a visible "Launch/Run" (启动) button or action icon directly on the node body or persistent hover toolbar.

### 2. App Configuration (属性配置)
- **AC2.1 (Source Selection):** Users can choose the App Source:
  - **Local App:** Manual path entry (e.g., `C:\Program Files\Matlab\bin\matlab.exe`).
  - **Remote/Web App:** URL entry (e.g., `https://api.satellite-tools.com/orbit-calc`).
  - **App Library:** Select from a Mock "Satellite App Library".
- **AC2.2 (Satellite App Library - Mock):** Clicking "Select from Library" opens a dialog showing satellite domain apps (e.g., "Orbit Designer Pro", "Thermal Analysis Tool", "Signal Process v2").
- **AC2.3 (Input/Output Config):**
  - **Defaults:** Selecting a library app automatically populates default Input parameters (e.g., "Orbit Altitude", "Inclination") and Output expectations (e.g., "Trajectory File").
  - **Manual Override:** Users can manually add/edit/remove Input/Output fields (Key-Value pairs or File types).

### 3. File Operations (文件操作)
- **AC3.1 (Input Files):** Users can Upload local files as "Input" for the App node.
- **AC3.2 (Output Files):** After execution (simulated), the node can display "Output Files" which support:
  - **Download:** Save to local disk.
  - **Preview:** Basic preview for text/image/pdf (using existing preview components).

### 4. Execution & Launch (执行与启动)
- **AC4.1 (Execution Logic):**
  - **Local:** Triggers protocol handler (mock).
  - **Remote:** Calls mock API.
- **AC4.2 (Feedback):** Show "Running" state. On completion, update "Output" section with mock result files.

### 5. Data Persistence
- **AC5.1:** Persist `appSourceType`, `appPath/Url`, `libraryAppId`, `inputs` (list), `outputs` (list) in node properties.

## Tasks / Subtasks

- [x] Task 1: Type Definitions & Schema 📦
  - [x] 1.1: Define `AppNodeProps`, `AppInput`, `AppOutput` interfaces.
  - [x] 1.2: Add `APP` to `NodeType` enum.
  - [x] 1.3: Update validation schemas (Zod).

- [x] Task 2: Mock Registry & Service 🛠️
  - [x] 2.1: `AppLibraryService` with Satellite Mock Data (defaults for I/O).
  - [x] 2.2: `AppExecutorService` + `/api/nodes/:id:execute` 执行模拟输出

- [x] Task 3: UI Components 🎨
  - [x] 3.1: `AppNode` renderer (X6 View) - Cyan 边框 + Grid3X3 图标 + Play 启动按钮 ✅
  - [x] 3.2: `AppConfigForm`:
    - [x] Source Selector tabs (Local / Remote / Library) - 抽取为 `AppSourceSelector.tsx`
    - [x] Library Search Dialog (Satellite theme).
    - [x] I/O Configuration List (Dynamic add/remove).
  - [x] 3.3: `FileIOComponent`: Upload/Download/Preview buttons integration.
    - ✅ 文件上传/下载/预览功能已实现 (AppIOConfig.tsx + AppFileManager.tsx)

- [x] Task 4: Integration & State 🧩
  - [x] 4.1: Integrate execution state (Idle -> Running -> Success).
  - [x] 4.2: Handle "Auto-fill defaults" logic when Library App is selected.
  - [x] 4.3: Local/Remote/Library 执行分流逻辑 ✅

- [x] Task 5: Testing 🧪
  - [x] 5.1: Unit test for default I/O population logic. (`app-utils.test.ts`)
  - [x] 5.2: E2E test: Select Satellite App -> Check Defaults -> Run -> Preview Output.

## Dev Notes

- **Security Note:** Real "Local Launch" requires a custom protocol handler registered on the OS. For this Mock/Prototype story, use `window.alert` or `console.log` to demonstrate the *intent* if a real protocol isn't registered, OR use a dummy protocol like `mailto:` for demo.
- **Visuals:** Use Shadcn/Magic UI "Cyber/Industrial" aesthetic for App nodes (Cyan/Slate colors).
- **State:** Execution state is transient (React local state) unless it's a long-running job. For MVP, keep it local.

### Project Structure Notes

- `apps/web/components/App/` for specific components.
- `apps/api/src/modules/app-library/app-executor.service.ts` for mock execution logic.

### References

- [Source: docs/epics.md#Story 2.9]
- [Protocol Handlers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler)

## Dev Agent Record

### Agent Model Used
Antigravity (Claude Sonnet 4)

### Debug Log References

### Completion Notes List

#### Code Review (2025-12-23) - 修复后状态

**AC 验证状态汇总**:
| AC | 描述 | 状态 |
|-----|------|------|
| AC1.1 | APP 节点视觉区分 (Cyan 边框, Grid 图标) | ✅ 实现 |
| AC1.2 | Launch/Run 按钮在节点上 | ✅ 实现 |
| AC2.1 | Source Selection (Local/Remote/Library) | ✅ 实现 |
| AC2.2 | Satellite App Library Mock | ✅ 实现 |
| AC2.3 | Auto-fill I/O Defaults | ✅ 实现 |
| AC3.1 | Input File Upload | ✅ 实现 |
| AC3.2 | Output File Download/Preview | ✅ 实现 |
| AC4.1 | Execution Logic (Local/Remote 分流) | ✅ 实现 |
| AC4.2 | Running State Feedback | ✅ 实现 |
| AC5.1 | Data Persistence | ✅ 实现 |

**遗留注意**:
- 已执行 `prisma migrate reset --force` 并完成迁移与种子数据（本地开发库）。

### File List
- `apps/api/src/modules/nodes/nodes.controller.ts`
- `apps/api/src/modules/nodes/nodes.request.dto.ts`
- `apps/api/src/modules/nodes/nodes.service.ts`
- `apps/api/src/modules/nodes/nodes.module.ts`
- `apps/api/src/modules/nodes/nodes.service.spec.ts`
- `apps/api/src/modules/app-library/app-executor.service.ts`
- `apps/web/components/App/AppForm.tsx`
- `apps/web/components/App/AppIOConfig.tsx`
- `apps/web/components/App/app-utils.ts`
- `apps/web/components/App/__tests__/app-utils.test.ts`
- `apps/web/components/nodes/MindNode.tsx`
- `apps/web/e2e/app-node.spec.ts`
- `packages/database/prisma/migrations/20251223150000_add_app_node/migration.sql`
- `docs/sprint-artifacts/2-9-app-node-type.md`
