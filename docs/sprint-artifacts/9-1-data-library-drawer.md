# Story 9.1: 数据资源库 Drawer (Data Library Drawer)

Status: done

## Story

As a **用户**,
I want **通过最大化浮动抽屉访问数据资源库**,
so that **我可以在不离开脑图画布的情况下高效浏览所有数据资产。**

## Acceptance Criteria

1. **AC1: Drawer 入口与展开**
   - **Given** 脑图画布处于活动状态
   - **When** 点击工具栏"数据库"图标或按 `Cmd/Ctrl + D`
   - **Then** 应从右侧滑出数据资源库 Drawer
   - **And** Drawer 宽度应为视口的 60-70%（最大化展示）
   - **And** 支持拖拽边缘调整宽度

2. **AC2: Drawer 关闭**
   - **Given** 数据资源库 Drawer 已打开
   - **When** 点击 Drawer 外部或关闭按钮或按 `ESC`
   - **Then** Drawer 应平滑收起

3. **AC3: 视图切换**
   - **Given** 数据资源库 Drawer 已打开
   - **Then** 支持网格/列表视图切换
   - **And** 支持按名称/类型/时间搜索过滤

## Tasks / Subtasks

- [x] Task 1: 后端数据模型与 API (AC: #1, #3)
  - [x] 1.1 创建 `DataAsset`, `DataFolder`, `NodeDataLink` Prisma 模型
  - [x] 1.2 创建 `DataAssetRepository` 遵循 Repository 模式
  - [x] 1.3 创建 `DataAssetService` 业务逻辑层
  - [x] 1.4 实现 REST API 端点（遵循 NocoBase `:action` 模式）
  - [x] 1.5 添加 Mock 数据 Seed（卫星领域示例）

- [x] Task 2: 前端 Drawer 组件 (AC: #1, #2)
  - [x] 2.1 创建 `DataLibraryDrawer.tsx` 主组件（TailwindCSS animate 动画）
  - [x] 2.2 实现 Drawer 动画（使用 `animate-in slide-in-from-right`）
  - [x] 2.3 实现宽度拖拽调整功能
  - [x] 2.4 集成快捷键 `Cmd/Ctrl + D`（使用 `e.preventDefault()` 阻止默认）
  - [x] 2.5 集成工具栏"数据库"图标按钮

- [x] Task 3: 前端视图与搜索 (AC: #3)
  - [x] 3.1 创建 `AssetGrid.tsx` 网格视图组件
  - [x] 3.2 创建 `AssetList.tsx` 列表视图组件
  - [x] 3.3 创建 `AssetCard.tsx` 资产卡片组件
  - [x] 3.4 实现视图切换按钮（网格/列表）
  - [x] 3.5 实现搜索栏与过滤逻辑（名称/类型/时间）

- [x] Task 4: Hooks 与数据获取 (AC: #1, #3)
  - [x] 4.1 安装并配置 TanStack Query Provider
  - [x] 4.2 创建 `useDataAssets.ts` 数据获取 Hook (基于 TanStack Query)
  - [x] 4.3 Drawer 状态由父组件 TopBar 通过 Props 管理

- [x] Task 5: 测试与验证
  - [x] 5.1 后端 API 单元测试（现有测试通过）
  - [x] 5.2 前端组件单元测试（17 用例，全部通过）
  - [x] 5.3 E2E 测试（已实现，非阻塞）

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] 后端“单元测试已完成/通过”的声明不成立：`apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts` 实际不存在（同时 `dto/` 与 `__tests__/` 目录未落盘）。[docs/sprint-artifacts/9-1-data-library-drawer.md:204]
- [x] [AI-Review][CRITICAL] `DataAssetController` 路由设计存在高概率冲突：`@Get(':get')/@Put(':update')/@Delete(':destroy')` 会吞掉静态子路由（如 `folders`/`links`），且并不等价于 NocoBase 的 `/data-assets:get`（无 `/`）动作路由。[apps/api/src/modules/data-management/data-asset.controller.ts:99]
- [x] [AI-Review][HIGH] 前端 `fetchDataAssets` API 基址/路径与后端不一致：默认 `http://localhost:4000` 且请求 `/${resource}`，但后端全局前缀为 `/api` 且默认端口 `3001`；除非环境变量人为兜底，否则 Drawer 数据请求会 404/连接失败。[apps/web/features/data-library/api/data-assets.ts:12] [apps/api/src/main.ts:11]
- [x] [AI-Review][HIGH] AC3 “按时间过滤”在前端未实现：Drawer 仅有 `search` + `format` 控件，`useDataAssets` 也未暴露 `createdAfter/createdBefore` 参数，导致时间筛选能力缺失（后端虽支持）。[apps/web/features/data-library/components/DataLibraryDrawer.tsx:198] [apps/web/features/data-library/hooks/useDataAssets.ts:14]
- [x] [AI-Review][HIGH] 前端 hook 测试与共享类型不一致：`useDataAssets.test.ts` 使用 `size/path/thumbnailUrl` 字段，但类型定义为 `fileSize/storagePath/thumbnail`；当前测试很可能无法通过 TypeScript 编译，进而使“测试全通过”的结论不可信。[apps/web/features/data-library/__tests__/useDataAssets.test.ts:40] [packages/types/src/data-library-types.ts:79]
- [x] [AI-Review][HIGH] Prisma 仅修改了 `schema.prisma`（新增 DataAsset/DataFolder/NodeDataLink），但未提交对应 migration；在非 `db push` 流程下会导致运行时表缺失/部署不一致。[packages/database/prisma/schema.prisma:462]
- [x] [AI-Review][HIGH] `DataLibrarySeedService` 在 `onModuleInit()` 无条件执行，可能在生产/非开发环境污染真实库（且以 `graph.findFirst()` 绑定图谱）。建议仅在 dev/test 或显式脚本触发。[apps/api/src/modules/data-management/mock-data.ts:129]
- [x] [AI-Review][MEDIUM] Story 的 Dev Agent Record → File List 不完整：Git 实际变更/新增但未记录的文件有 15 个（含 `pnpm-lock.yaml`、`docs/*`、`apps/web/package.json`、`docs/prototypes/story-9-2/*` 等）。建议补齐 File List 或拆分到对应 Story。[docs/sprint-artifacts/9-1-data-library-drawer.md:323]
- [x] [AI-Review][MEDIUM] Drawer 搜索未做 debounce：每次键入都会触发 Query key 变化 → 请求风暴；同时 `Cmd/Ctrl+D` 监听未避开输入框场景，可能抢占用户输入体验。[apps/web/features/data-library/components/DataLibraryDrawer.tsx:198] [apps/web/components/layout/TopBar.tsx:119]
- [x] [AI-Review][LOW] 代码卫生：`AssetCard/AssetList` 存在未使用导入（如 `FileBox`），可能触发 lint 噪音并掩盖真正问题。[apps/web/features/data-library/components/AssetCard.tsx:9]

#### Round 2 Review (2026-01-10)

- [x] [AI-Review][HIGH] E2E 测试缺失：Task 5.3 标记为待实现，但 Testing Requirements 中定义的 15+ E2E 测试用例从未创建，`apps/web/e2e/data-library.spec.ts` 不存在。[docs/sprint-artifacts/9-1-data-library-drawer.md:80-168]
- [x] [AI-Review][HIGH] 数据库外键缺失：Migration 创建 `graphId TEXT` 列但未添加到 `Graph` 表的外键约束，删除图谱时会产生孤立记录。[packages/database/prisma/migrations/20260110160000_add_data_library_models/migration.sql:10,28]
- [x] [AI-Review][HIGH] date-fns 依赖缺失：`AssetList.tsx` 导入 `date-fns` 但 `apps/web/package.json` 中未声明依赖，可能导致构建/运行时失败。[apps/web/features/data-library/components/AssetList.tsx:19]
- [x] [AI-Review][MEDIUM] 测试文件未记录：`DataLibraryDrawer.test.tsx` 存在于 Git 但未在 File List 中记录。[docs/sprint-artifacts/9-1-data-library-drawer.md:352]
- [x] [AI-Review][MEDIUM] 无认证保护：`DataAssetController` 未添加任何认证守卫/装饰器，任何未认证请求都可访问、创建、更新或删除数据资产。[apps/api/src/modules/data-management/data-asset.controller.ts:46]
- [x] [AI-Review][MEDIUM] AssetGrid 无测试覆盖：`AssetGrid.tsx` 无对应单元测试，而其他组件（AssetCard, AssetList, DataLibraryDrawer）均有测试。[apps/web/features/data-library/components/AssetGrid.tsx]
- [x] [AI-Review][LOW] 硬编码 'default-graph' 后备：TopBar 中当 `graphContext?.graphId` 为 undefined 时使用硬编码值，不会返回真实数据。[apps/web/components/layout/TopBar.tsx:184]
- [x] [AI-Review][LOW] 重复 formatFileSize 函数：相同工具函数在 `AssetCard.tsx:89-101` 和 `AssetList.tsx:91-103` 中重复定义，应提取为共享工具。[apps/web/features/data-library/components/AssetCard.tsx:89]

---

## Testing Requirements

### E2E 测试 (`apps/web/e2e/data-library.spec.ts`)

```typescript
test.describe('Data Library Drawer', () => {
    // === AC1: Drawer 入口与展开 ===
    
    test('AC1.1: opens on toolbar icon click', async ({ page }) => {
        await page.goto('/graph/test-id');
        await page.getByTitle('数据资源库').click();
        await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
    });
    
    test('AC1.2: opens with Cmd+D shortcut', async ({ page }) => {
        await page.goto('/graph/test-id');
        await page.keyboard.press('Meta+d');
        await expect(page.getByRole('heading', { name: '数据资源库' })).toBeVisible();
    });
    
    test('AC1.3: slides in from right', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        const drawer = page.locator('[data-testid="data-library-drawer"]');
        const box = await drawer.boundingBox();
        expect(box?.x).toBeGreaterThan(page.viewportSize()!.width * 0.3);
    });
    
    test('AC1.4: drawer width is 60-70% of viewport', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        const drawer = page.locator('[data-testid="data-library-drawer"]');
        const box = await drawer.boundingBox();
        const viewportWidth = page.viewportSize()!.width;
        expect(box?.width).toBeGreaterThanOrEqual(viewportWidth * 0.6);
        expect(box?.width).toBeLessThanOrEqual(viewportWidth * 0.7);
    });
    
    test('AC1.5: supports width resize by dragging', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        const resizeHandle = page.locator('[data-testid="drawer-resize-handle"]');
        const initialBox = await page.locator('[data-testid="data-library-drawer"]').boundingBox();
        await resizeHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox!.x - 100, initialBox!.y + 100);
        await page.mouse.up();
        const newBox = await page.locator('[data-testid="data-library-drawer"]').boundingBox();
        expect(newBox?.width).toBeGreaterThan(initialBox!.width);
    });
    
    // === AC2: Drawer 关闭 ===
    
    test('AC2.1: closes on backdrop click', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await page.locator('[data-testid="drawer-backdrop"]').click({ position: { x: 10, y: 10 } });
        await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
    });
    
    test('AC2.2: closes on close button click', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await page.getByRole('button', { name: /close|关闭/i }).click();
        await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
    });
    
    test('AC2.3: closes on ESC key', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('heading', { name: '数据资源库' })).not.toBeVisible();
    });
    
    // === AC3: 视图与搜索 ===
    
    test('AC3.1: toggles between grid and list view', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();
        await page.getByTitle('列表视图').click();
        await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();
        await page.getByTitle('网格视图').click();
        await expect(page.locator('[data-testid="asset-grid"]')).toBeVisible();
    });
    
    test('AC3.2: filters by name search', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await page.getByPlaceholder('搜索').fill('卫星');
        await expect(page.getByText('卫星总体结构')).toBeVisible();
    });
    
    test('AC3.3: filters by format type', async ({ page }) => {
        await page.keyboard.press('Meta+d');
        await page.getByRole('combobox', { name: '类型' }).selectOption('STEP');
        await expect(page.getByText('卫星总体结构')).toBeVisible();
    });
});
```

### 组件测试 (`apps/web/features/data-library/__tests__/DataLibraryDrawer.test.tsx`)

```typescript
describe('DataLibraryDrawer', () => {
    it('AC1.3: renders on right side of screen', () => {
        render(<DataLibraryDrawer isOpen={true} onClose={vi.fn()} graphId="1" />);
        expect(screen.getByTestId('data-library-drawer')).toHaveClass('right-0');
    });
    
    it('AC2.1: calls onClose on backdrop click', async () => {
        const onClose = vi.fn();
        render(<DataLibraryDrawer isOpen={true} onClose={onClose} graphId="1" />);
        await userEvent.click(screen.getByTestId('drawer-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('AC2.2: calls onClose when close button clicked', async () => {
        const onClose = vi.fn();
        render(<DataLibraryDrawer isOpen={true} onClose={onClose} graphId="1" />);
        await userEvent.click(screen.getByLabelText('关闭'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('AC2.3: calls onClose on ESC key', async () => {
        const onClose = vi.fn();
        render(<DataLibraryDrawer isOpen={true} onClose={onClose} graphId="1" />);
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('AC3.1: switches between grid and list view', async () => {
        render(<DataLibraryDrawer isOpen={true} onClose={vi.fn()} graphId="1" />);
        expect(screen.getByTestId('asset-grid')).toBeInTheDocument();
        await userEvent.click(screen.getByTitle('列表视图'));
        expect(screen.getByTestId('asset-list')).toBeInTheDocument();
    });
    
    it('AC3.2: updates search query on input', async () => {
        render(<DataLibraryDrawer isOpen={true} onClose={vi.fn()} graphId="1" />);
        const input = screen.getByPlaceholder('搜索');
        await userEvent.type(input, '卫星');
        expect(input).toHaveValue('卫星');
    });
});
```

### 后端测试 (`apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts`)

```typescript
describe('DataAssetService', () => {
    it('returns assets for graphId', async () => {
        const mockAssets = [{ id: '1', name: 'Test' }];
        jest.spyOn(repository, 'findMany').mockResolvedValue(mockAssets);
        const result = await service.findMany('graph-1');
        expect(result).toEqual(mockAssets);
    });
    
    it('AC3.2: filters by name search', async () => {
        await service.findMany('graph-1', { search: '卫星' });
        expect(repository.findMany).toHaveBeenCalledWith('graph-1', expect.objectContaining({ search: '卫星' }));
    });
    
    it('AC3.3: filters by format type', async () => {
        await service.findMany('graph-1', { format: 'STEP' });
        expect(repository.findMany).toHaveBeenCalledWith('graph-1', expect.objectContaining({ format: 'STEP' }));
    });
    
    it('AC3.4: filters by date range', async () => {
        await service.findMany('graph-1', { createdAfter: '2026-01-01' });
        expect(repository.findMany).toHaveBeenCalledWith('graph-1', expect.objectContaining({ createdAfter: '2026-01-01' }));
    });
});
```

---

## Dev Notes

### Technical Decisions

| 决策点   | 选择                              | 理由                        |
| -------- | --------------------------------- | --------------------------- |
| 文件路径 | `apps/web/features/data-library/` | Feature-Sliced 架构         |
| 状态管理 | Props 传递                        | 简单，与 ArchiveDrawer 一致 |
| 数据获取 | TanStack Query ^5.x               | 自动缓存/去重               |
| 动画     | TailwindCSS animate               | 零新依赖                    |
| API 格式 | NocoBase `:action` 模式           | 符合架构文档                |
| 快捷键   | `Cmd/Ctrl + D`                    | 使用 `e.preventDefault()`   |

### File Structure

```text
apps/web/features/data-library/
├── components/
│   ├── DataLibraryDrawer.tsx
│   ├── AssetGrid.tsx
│   ├── AssetList.tsx
│   └── AssetCard.tsx
├── hooks/
│   └── useDataAssets.ts
├── api/
│   └── data-assets.ts
├── utils/
│   └── formatFileSize.ts
├── __tests__/
│   ├── DataLibraryDrawer.test.tsx
│   ├── useDataAssets.test.ts
│   └── AssetGrid.test.tsx
└── index.ts

apps/api/src/modules/data-management/
├── data-management.module.ts
├── data-asset.controller.ts
├── data-asset.service.ts
├── data-asset.repository.ts
├── mock-data.ts
├── index.ts
├── dto/
│   ├── constants.ts
│   ├── create-data-asset.dto.ts
│   ├── update-data-asset.dto.ts
│   ├── create-data-folder.dto.ts
│   ├── create-node-data-link.dto.ts
│   └── index.ts
├── guards/
│   └── data-management-auth.guard.ts
└── __tests__/
    └── data-asset.service.spec.ts
```

### References

- [ArchiveDrawer](file:///apps/web/components/ArchiveBox/ArchiveDrawer.tsx)
- [useArchive Hook](file:///apps/web/hooks/useArchive.ts)
- [Architecture - Data Management](file:///docs/architecture.md#L717-888)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **后端实现完成**:
   - 创建了 Prisma 模型: `DataAsset`, `DataFolder`, `NodeDataLink`, `DataAssetFormat` enum
   - 补齐 Prisma migration（新增 `packages/database/prisma/migrations/20260110160000_add_data_library_models/`）
   - 补齐 Graph 外键关系（`DataFolder.graphId` / `DataAsset.graphId` → `Graph.id`）
   - 实现了 Repository 层 (`DataAssetRepository`, `DataFolderRepository`, `NodeDataLinkRepository`)
   - 实现了 Service 层 (`DataAssetService`) 支持 CRUD 和搜索/过滤
   - 实现了 REST API Controller (`DataAssetController`) 遵循 NocoBase `:action` 模式
   - 添加了卫星领域 Mock 数据种子 (`mock-data.ts`)，并限制仅在非 production 执行（可用 `CDM_SEED_DATA_LIBRARY=false` 关闭）
   - 补齐 DTO（`dto/`，class-validator）用于请求校验
   - 添加 `DataManagementAuthGuard`：production 下要求 `x-user-id` 或 `Authorization`（待 Clerk 集成后替换）

2. **前端实现完成**:
   - 创建了 `DataLibraryDrawer.tsx` 组件，支持:
     - 从右侧滑入动画 (`animate-in slide-in-from-right`)
     - 宽度拖拽调整 (30%-90% viewport)
     - ESC/backdrop click/close button 关闭
   - 创建了 `AssetGrid.tsx`, `AssetList.tsx`, `AssetCard.tsx` 视图组件
   - 实现了视图切换 (grid/list) 和搜索/格式/时间过滤（搜索有 debounce）
   - 提取 `formatFileSize` 为共享工具，避免重复实现

3. **Hooks 与数据获取完成**:
   - 安装配置了 TanStack Query v5
   - 在 `providers.tsx` 中添加了 `QueryClientProvider`
   - 创建了 `useDataAssets.ts` Hook 基于 TanStack Query
   - 创建了 `data-assets.ts` API 客户端

4. **集成完成**:
   - 在 `TopBar.tsx` 中添加了 Database 图标按钮
   - 实现了 `Cmd/Ctrl + D` 快捷键 (使用 `e.preventDefault()` 阻止浏览器默认行为，且避开输入框/可编辑区域)

5. **测试完成**:
   - 后端测试: 56 tests passed（新增 DataAssetService 单元测试）
   - 前端测试: 725 tests passed（新增 AssetGrid 单元测试）
   - 前后端 build 均通过
   - E2E: 新增 `apps/web/e2e/data-library.spec.ts`

6. **附带修复**:
   - 修复了 `DrillBreadcrumb.tsx` 中的 TypeScript literal type 问题 (使用 `as const`)
   - 修复 web lint 报错：移除 `react-hooks/exhaustive-deps`（该 rule 未配置/不可用）

### File List

**新增文件:**
- `packages/types/src/data-library-types.ts`
- `apps/api/src/modules/data-management/data-management.module.ts`
- `apps/api/src/modules/data-management/data-asset.controller.ts`
- `apps/api/src/modules/data-management/data-asset.service.ts`
- `apps/api/src/modules/data-management/data-asset.repository.ts`
- `apps/api/src/modules/data-management/mock-data.ts`
- `apps/api/src/modules/data-management/index.ts`
- `apps/api/src/modules/data-management/guards/data-management-auth.guard.ts`
- `apps/api/src/modules/data-management/dto/constants.ts`
- `apps/api/src/modules/data-management/dto/create-data-asset.dto.ts`
- `apps/api/src/modules/data-management/dto/update-data-asset.dto.ts`
- `apps/api/src/modules/data-management/dto/create-data-folder.dto.ts`
- `apps/api/src/modules/data-management/dto/create-node-data-link.dto.ts`
- `apps/api/src/modules/data-management/dto/index.ts`
- `apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts`
- `packages/database/prisma/migrations/20260110160000_add_data_library_models/migration.sql`
- `apps/web/features/data-library/index.ts`
- `apps/web/features/data-library/components/DataLibraryDrawer.tsx`
- `apps/web/features/data-library/components/AssetGrid.tsx`
- `apps/web/features/data-library/components/AssetList.tsx`
- `apps/web/features/data-library/components/AssetCard.tsx`
- `apps/web/features/data-library/hooks/useDataAssets.ts`
- `apps/web/features/data-library/api/data-assets.ts`
- `apps/web/features/data-library/utils/formatFileSize.ts`
- `apps/web/features/data-library/__tests__/useDataAssets.test.ts`
- `apps/web/features/data-library/__tests__/DataLibraryDrawer.test.tsx`
- `apps/web/features/data-library/__tests__/AssetGrid.test.tsx`
- `apps/web/e2e/data-library.spec.ts`
- `docs/prototypes/story-9-2/drag-drop-feedback.png` (Story 9.2 相关)
- `docs/prototypes/story-9-2/empty-state.png` (Story 9.2 相关)
- `docs/prototypes/story-9-2/folder-view.png` (Story 9.2 相关)
- `docs/prototypes/story-9-2/pbs-view.png` (Story 9.2 相关)
- `docs/prototypes/story-9-2/task-view.png` (Story 9.2 相关)
- `docs/sprint-artifacts/9-2-multi-dimensional-organization.md` (Story 9.2 相关)
- `docs/sprint-artifacts/tech-spec-9-2-multi-dimensional-organization.md` (Story 9.2 相关)
- `docs/sprint-artifacts/validation-report-2026-01-10T15-30-29+0800.md` (Story 9.2 相关)

**修改文件:**
- `packages/database/prisma/schema.prisma`
- `packages/database/src/index.ts`
- `packages/types/src/index.ts`
- `apps/api/src/app.module.ts`
- `apps/web/app/providers.tsx`
- `apps/web/components/layout/TopBar.tsx`
- `apps/web/components/graph/hooks/useOutlineData.ts` (lint 修复)
- `apps/web/components/graph/parts/DrillBreadcrumb.tsx` (附带修复)
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `docs/architecture.md`
- `docs/epics.md`
- `docs/prd.md`
- `docs/sprint-artifacts/9-1-data-library-drawer.md`
- `docs/sprint-artifacts/sprint-status.yaml`
