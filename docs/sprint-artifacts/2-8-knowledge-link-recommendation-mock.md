# Story 2.8: 知识关联与推荐 (Knowledge Link & Recommendation - Mock)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **用户** (User),
I want **在任务节点上关联知识资源，并获得节点的知识推荐** (associate knowledge resources with task nodes and get knowledge recommendations),
so that **我能快速找到执行任务所需的参考资料** (I can quickly find the reference materials needed to execute the task).

## Acceptance Criteria

### 1. Knowledge Recommendation (Mock) (知识推荐 - 模拟)
- **AC1.1 (Global Visibility):** Given any node is selected, When viewing the Property Panel, Then a "Knowledge Recommendation" (知识推荐) section should be displayed at the bottom.
- **AC1.2 (Mock Data):** The section should display a list of mock recommended resources (e.g., "Design Guidelines 2024", "API Documentation", "Best Practices").
- **AC1.3 (Interactive Mock):** Clicking a recommendation should show a "Mock: Open Resource" toast or log.

### 2. Associate Knowledge (Task Node) (关联知识 - 任务节点)
- **AC2.1 (Action Entry):** Given a **Task** type node is selected, When viewing the `TaskForm`, Then an "Associate Knowledge" (关联知识) button/section should be available.
- **AC2.2 (Search Dialog):** Clicking the button opens a `KnowledgeSearchDialog` (reuse/adapt `ProductSearchDialog` pattern) showing mock knowledge entries.
- **AC2.3 (Selection):** Selecting an entry adds it to the Task's `knowledgeRefs` list.
- **AC2.4 (List Display):** Associated knowledge items should be listed in the Task properties panel with a "Remove" option.
- **AC2.5 (Persistence):** Knowledge references must be saved to the node's `props` and synced via Yjs.

### 3. Data & Mock API
- **AC3.1 (Types):** New interfaces `KnowledgeReference` and updated `TaskProps` in shared types.
- **AC3.2 (API):** New Mock API `GET /api/knowledge-library` returning mock data.
- **AC3.3 (Persistence):** Backend DTO must allow `knowledgeRefs` field for Task nodes.

### 4. Constraints
- **Constraint 1:** This is a **MOCK** implementation for UI/UX validation. No real AI or Knowledge Base integration yet (Scheduled for Epic 5).
- **Constraint 2:** Reuse `cmdk` pattern from Story 2.7.

## UI Design (High Fidelity Specification)

> **Design System:** Shadcn UI + Magic UI (Glassmorphism) + Tailwind CSS

### 1. Visual Layout Structure

```text
+------------------------------------------------------+
|  Property Panel (Right Sidebar) w-80                 |
+------------------------------------------------------+
| [Header] Title, Close (X)                            |
|------------------------------------------------------|
| [Common] ID, Creator, Time                           |
|------------------------------------------------------|
| [Type]   Dropdown: [Task v]                          |
| [Tags]   [#Tag1] [#Tag2] (+ Add)                     |
|------------------------------------------------------|
| [Task Properties]                                    |
|  Status: [Todo v]  Priority: [High v]                |
|  Assignee: (@User) Due: (yyyy-mm-dd)                 |
|------------------------------------------------------|
| [Assignment Section] ...                             |
|------------------------------------------------------|
| [Knowledge Resources] (New)                          |
|  Header: 📚 关联知识            [+ 关联 (Ghost)]     |
|  +------------------------------------------------+  |
|  | [Icon] Design Guidelines 2024              [x] |  |
|  |        PDF · 2.4 MB                            |  |
|  +------------------------------------------------+  |
|  +------------------------------------------------+  |
|  | [Icon] API Documentation v3                [x] |  |
|  |        External Link                           |  |
|  +------------------------------------------------+  |
|------------------------------------------------------|
|                                                      |
|           (Spacer / Scroll Content)                  |
|                                                      |
|==============Sticky Bottom / or Flow=================|
| [Knowledge Recommendation] (New)                     |
|  Background: bg-gradient-to-br from-indigo-50        |
|  Header: 🧠 知识推荐 (Beta)                          |
|  +------------------------------------------------+  |
|  | [Sparkles] React Best Practices                |  |
|  |            Based on 'Architecture' tag         |  |
|  +------------------------------------------------+  |
|  +------------------------------------------------+  |
|  | [Book]     System Patterns                     |  |
|  |            Frequently used in Epic-2           |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

### 2. Component Specifications

#### 2.1 Knowledge Resource Card (KnowledgeRefItem)
- **Container:** `flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group`
- **Icon:**
  - Wrapper: `w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600`
  - Icons: `FileText`, `Link`, `Video` (Lucide React)
- **Content:**
  - Title: `text-sm font-medium text-gray-800 line-clamp-1`
  - Meta: `text-xs text-gray-400 mt-0.5`
- **Action (Remove):**
  - Button: `opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all`

#### 2.2 Recommendation Panel (KnowledgeRecommendation)
- **Container:** `mt-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-4 backdrop-blur-sm`
- **Header:** `flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-indigo-500`
  - Icon: `Sparkles` (w-3 h-3)
- **List Item:**
  - Container: `flex items-center gap-3 p-2.5 rounded-lg bg-white/60 hover:bg-white border border-transparent hover:border-indigo-100 cursor-pointer transition-all`
  - Text: `text-sm text-gray-700 font-medium`
  - Subtext: `text-[10px] text-indigo-400`

#### 2.3 Search Dialog (KnowledgeSearchDialog)
- **Overlay:** `fixed inset-0 bg-black/20 backdrop-blur-sm z-50`
- **Panel:** `bg-white rounded-xl shadow-2xl border border-gray-200 w-[500px] max-w-[90vw] overflow-hidden`
- **Input:** `h-12 border-b px-4 text-base outline-none` (cmdk style)
- **Item:** `px-4 py-3 text-sm cursor-default select-none aria-selected:bg-blue-50 aria-selected:text-blue-700`

### 3. Color Palette (Tailwind)

| Element | Color Class | Hex | Usage |
|---------|-------------|-----|-------|
| Primary Text | `text-gray-800` | `#1f2937` | Main titles |
| Secondary Text | `text-gray-500` | `#6b7280` | Meta info |
| Link/Accent | `text-blue-600` | `#2563eb` | Icons, Links |
| Border | `border-gray-200` | `#e5e7eb` | Dividers, Cards |
| AI Accent | `text-indigo-500` | `#6366f1` | Recommendation headers |
| AI Background | `bg-indigo-50` | `#eef2ff` | Recommendation card bg |
| Danger | `text-red-500` | `#ef4444` | Remove actions |

### 4. Iconography (Lucide-React)

- **Resources:** `FileText` (Doc), `Link` (URL), `Video` (Media)
- **Actions:** `Plus` (Add), `X` (Remove), `ExternalLink` (Open)
- **AI/Magic:** `Sparkles` (Recommendation), `Brain` (Header)


## Detailed Design (详细设计)

### 1. Data Structure Design (数据结构设计)

#### 1.1 KnowledgeReference Interface
```typescript
// packages/types/src/node-types.ts

export interface KnowledgeReference {
  id: string;          // UUID
  title: string;       // "Design Guidelines 2024"
  type: 'document' | 'link' | 'video';
  url?: string;        // External link or file path
  summary?: string;    // Brief description
}

// Extend TaskProps
export interface TaskProps {
  // ... existing fields
  knowledgeRefs?: KnowledgeReference[];
}
```

### 2. Program Logic Design (程序逻辑设计)

#### 2.1 Backend: Knowledge Library Controller (Mock)
- **Controller:** `KnowledgeLibraryController` in `apps/api/src/modules/knowledge-library/`.
- **Endpoint:** `GET /api/knowledge-library?q=...`
- **Logic:**
    - Define a static list of ~10 mock items.
    - Filter by query string `q`.
    - Return `KnowledgeReference[]`.

#### 2.2 Frontend: KnowledgeSearchDialog
- **State:** `query` (string), `results` (array).
- **Effect:** Accesses `GET /api/knowledge-library` on query change (debounced 300ms).
- **Cmdk:** Use `Command`, `CommandInput`, `CommandList`, `CommandItem`.

#### 2.3 Frontend: TaskForm Integration
- **State:** Read `knowledgeRefs` from `initialData`.
- **Action:**
    - `handleAdd(ref)`: append to array, call `onUpdate`.
    - `handleRemove(id)`: filter from array, call `onUpdate`.

#### 2.4 Frontend: KnowledgeRecommendation Component
- **Props:** `nodeId`, `nodeTitle`.
- **Logic:**
    - Use `nodeId` to generate a pseudo-random seed or just return random items from a client-side mock list.
    - **No API call** needed for this specific "mock recommendation" part unless we want to simulate server latency. Client-side static list is fine for AC1.2.

### 3. Test Design (测试设计)

#### 3.1 Unit Tests (`apps/web/__tests__/components/PropertyPanel/TaskForm.test.tsx`)
- **Test 1:** Render "Associate Knowledge" section.
- **Test 2:** Click Add -> Dialog opens.
- **Test 3:** Render `knowledgeRefs` list correctly (title, icon).
- **Test 4:** Click Remove -> `onUpdate` called with item removed.

#### 3.2 Integration Tests
- **Setup:** Task node.
- **Action:** Add knowledge ref.
- **Assert:** Check Yjs state has `knowledgeRefs` array.

#### 3.3 E2E Tests (`apps/web/e2e/knowledge-mock.spec.ts`)
1. Create/Select Task node.
2. Verify "Knowledge Recommendation" panel visible at bottom.
3. Scroll to "Associate Knowledge", click Add.
4. Search for "Design", select first result.
5. Verify item appears in Task properties.
6. Reload page.
7. Verify item still persists.

## Impact Analysis (影响分析)

### 1. Schema Compatibility
- **Additive Change:** Adding `knowledgeRefs` to `TaskProps` JSON. Old nodes simply lack this field (undefined), which is handled safely by `?.` operators.
- **No Migration Needed:** JSON column in Postgres.

### 2. Backend
- **New Module:** `KnowledgeLibraryModule`. Isolated, low risk.
- **DTO Update:** Must update allowed keys for Task. If missed, updates will be silently ignored or rejected by API.

### 3. UI/UX
- **Space:** Property Panel is getting crowded. The "Recommendation" section at the bottom should be collapsible or sticky? -> **Decision:** Just a static card at bottom of scroll view for now.
- **Consistency:** Reusing Product Search pattern ensures consistent UX.

## Tasks / Subtasks

### Task 1: Type Definitions 📦
- [x] **1.1** Extend `packages/types/src/node-types.ts`:
  - Create interface `KnowledgeReference`.
  - Update `TaskProps` to include `knowledgeRefs?: KnowledgeReference[]`.
- [x] **1.2** Update `packages/types/src/index.ts` exports.

### Task 2: Backend Updates 🛠️
- [x] **2.1** Update `apps/api/src/modules/nodes/nodes.request.dto.ts`:
  - Add `knowledgeRefs` to `allowedKeys[NodeType.TASK]`.
- [x] **2.2** Create Mock Knowledge Service:
  - Create `apps/api/src/modules/knowledge-library/knowledge-library.controller.ts`.
  - Endpoint `GET /api/knowledge-library` returning mock data.
  - Register in `AppModule`.

### Task 3: UI Components 🎨
- [x] **3.1** Create `apps/web/components/Knowledge/KnowledgeSearchDialog.tsx`:
  - Adapt from `ProductSearchDialog.tsx`.
- [x] **3.2** Create `apps/web/components/Knowledge/KnowledgeRecommendation.tsx`:
  - Simple component displaying a static/random list.
  - Style: Card/List look, consistent with "Magic UI".

### Task 4: Property Panel Integration 🧩
- [x] **4.1** Update `apps/web/components/PropertyPanel/TaskForm.tsx`:
  - Add "Knowledge Resources" section.
  - Add "Associate Knowledge" button.
  - Render list of associated `knowledgeRefs` with delete button.
  - Integrate `KnowledgeSearchDialog`.
- [x] **4.2** Update `apps/web/components/PropertyPanel/index.tsx`:
  - Add `<KnowledgeRecommendation />` at the bottom of the panel (after `FormComponent`).

### Task 5: Testing 🧪
- [x] **5.1** Unit Test: `TaskForm` validation.
- [x] **5.2** E2E Test: `apps/web/e2e/knowledge-mock.spec.ts`.

### Review Follow-ups (AI)
- [x] [AI-Review][MEDIUM] ~~修复 E2E 中"永真断言"~~ ✅ 已修复 (移除 `|| true`，改用明确断言)
- [x] [AI-Review][MEDIUM] ~~E2E 硬编码 localhost~~ ✅ 已修复 (使用 `getApiBaseUrl()` + `API_BASE_URL` env)
- [x] [AI-Review][MEDIUM] ~~前端 API fallback 绝对地址~~ ✅ 已修复 (改为 `/api` 相对路径)
- [x] [AI-Review][LOW] ~~TaskForm 超过 300 行~~ ✅ 已重构 (575行 → 208行，提取 TaskDispatchSection/KnowledgeResourcesSection/RejectReasonDialog)

### Senior Developer Review (AI)

**Reviewer:** Antigravity (Claude Sonnet 4)  
**Date:** 2025-12-23  
**Outcome:** ✅ Approved with Minor Issues

#### Review Summary

| Category | Status |
|----------|--------|
| AC1.1 Knowledge Recommendation 可见 | ✅ 实现 |
| AC1.2 Mock 数据展示 | ✅ 实现 |
| AC1.3 点击显示 Toast | ✅ 实现 (使用 @cdm/ui useToast) |
| AC2.1 Task Form 关联入口 | ✅ 实现 |
| AC2.2 Search Dialog | ✅ 实现 |
| AC2.3 选择添加到列表 | ✅ 实现 |
| AC2.4 列表展示和删除 | ✅ 实现 |
| AC2.5 Yjs 同步 | ✅ 实现 |
| AC3.1 Types 定义 | ✅ 实现 |
| AC3.2 Mock API | ✅ 实现 |
| AC3.3 Backend DTO/Persistence | ✅ 实现 |

#### Verified Implementation

1. **knowledgeRefs 持久化** - ✅ 已正确实现
   - `TaskService.upsertProps()` line 40 包含 `knowledgeRefs: getJsonValue(props.knowledgeRefs)`
   - `NodeTaskRepository.upsert()` 支持 `knowledgeRefs` 参数
   - Schema `NodeTask.knowledgeRefs Json?` 字段已存在

2. **Toast 系统** - ✅ 使用项目统一体系
   - `KnowledgeRecommendation.tsx` line 12: `import { useToast } from '@cdm/ui'`

3. **Git 提交状态** - ✅ 已确认
   - Commit `90bfe21 feat: implement knowledge link recommendation and search (Story 2.8)` 已在 main 分支
   - File List 对应已提交内容，非未提交改动

#### Issues Found (0 remaining, 4 fixed) ✅

| Severity | Issue | Status |
|----------|-------|--------|
| ~~MEDIUM~~ | ~~E2E 测试包含永真断言~~ | ✅ Fixed |
| ~~MEDIUM~~ | ~~E2E 硬编码 localhost:3001~~ | ✅ Fixed |
| ~~MEDIUM~~ | ~~前端 API fallback 使用绝对地址~~ | ✅ Fixed |
| ~~LOW~~ | ~~TaskForm.tsx 575行~~ | ✅ Fixed (重构至 208行) |

#### Recommendations (已完成 4/4) ✅

1. ~~**E2E 断言修复**~~ ✅ 已修复 - 移除 `|| true`，改用明确断言
2. ~~**E2E 端口问题**~~ ✅ 已修复 - 使用 `getApiBaseUrl()` + `API_BASE_URL` env
3. ~~**API 相对路径**~~ ✅ 已修复 - 将 fallback 改为 `/api`
4. ~~**组件拆分**~~ ✅ 已完成 - 提取 `TaskDispatchSection`、`KnowledgeResourcesSection`、`RejectReasonDialog`

## Dev Notes

- **Pattern Reuse:** Strictly follow the patterns established in Story 2.7 (PBS Node).
- **Yjs-First:** Ensure all updates to `knowledgeRefs` go through `onUpdate` -> `useGraphData`.
- **Mock Scope:** Do NOT implement real AI calls.

### Project Structure Notes

- `apps/web/components/Knowledge/` for new components.
- `apps/api/src/modules/knowledge-library/` for mock backend.

### References

- [Source: apps/web/components/PropertyPanel/PBSForm.tsx]
- [Source: apps/web/components/ProductLibrary/ProductSearchDialog.tsx]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude Sonnet 4)

### Debug Log References
- No blocking issues encountered during development.

### Implementation Plan
1. Created `KnowledgeReference` interface and `KnowledgeReferenceSchema` Zod validator
2. Extended `TaskProps` with `knowledgeRefs?: KnowledgeReference[]`
3. Updated `NODE_PROP_KEYS_BY_TYPE` and `TaskPropsSchema` for validation
4. Created `KnowledgeLibraryController` with mock data (10 items) and search support
5. Created `KnowledgeSearchDialog` using cmdk pattern with React Portal
6. Created `KnowledgeRecommendation` component with pseudo-random selection based on nodeId
7. Integrated knowledge section into `TaskForm` with add/remove functionality
8. Added `KnowledgeRecommendation` to PropertyPanel for all node types

### Completion Notes List
- Story prepared for development.
- Mock implementation strategy selected to unblock UI/UX without waiting for Epic 5 AI.
- All 7 unit tests pass for TaskForm knowledge association feature.
- API tested with curl - returns 10 mock knowledge items with search support.
- TypeScript compilation successful for both packages/types, apps/api, and apps/web.
- Component follows Shadcn UI + Magic UI design patterns as specified.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Refactored TaskForm: 575→208 lines, extracted 3 components | Antigravity |
| 2025-12-23 | Fixed 3 MEDIUM issues: E2E assertions, API hardcoding, relative path | Antigravity |
| 2025-12-23 | Code review complete - Approved with minor issues | Antigravity |
| 2025-12-22 | Story implementation complete - Knowledge association and recommendation mock | AI Agent |
| 2025-12-23 | Marked as done after validation | Antigravity |

### File List
- `packages/types/src/node-types.ts` (Modified: added KnowledgeReference, KnowledgeReferenceSchema, updated TaskProps)
- `apps/api/src/app.module.ts` (Modified: registered KnowledgeLibraryModule)
- `apps/api/src/modules/knowledge-library/knowledge-library.controller.ts` (New)
- `apps/api/src/modules/knowledge-library/knowledge-library.module.ts` (New)
- `apps/api/src/modules/knowledge-library/index.ts` (New)
- `apps/web/components/Knowledge/KnowledgeSearchDialog.tsx` (New)
- `apps/web/components/Knowledge/KnowledgeRecommendation.tsx` (New)
- `apps/web/components/Knowledge/index.ts` (New)
- `apps/web/components/PropertyPanel/TaskForm.tsx` (Modified: added knowledge resources section)
- `apps/web/components/PropertyPanel/index.tsx` (Modified: added KnowledgeRecommendation)
- `apps/web/__tests__/components/PropertyPanel/TaskForm.knowledge.test.tsx` (New)
- `apps/web/e2e/knowledge-mock.spec.ts` (New)
