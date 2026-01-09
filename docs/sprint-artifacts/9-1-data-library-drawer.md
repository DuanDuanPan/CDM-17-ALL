# Story 9.1: 数据资源库 Drawer (Data Library Drawer)

Status: ready-for-dev

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

- [ ] Task 1: 后端数据模型与 API (AC: #1, #3)
  - [ ] 1.1 创建 `DataAsset`, `DataFolder`, `NodeDataLink` Prisma 模型
  - [ ] 1.2 创建 `DataAssetRepository` 遵循 Repository 模式
  - [ ] 1.3 创建 `DataAssetService` 业务逻辑层
  - [ ] 1.4 实现 REST API 端点（遵循 NocoBase `:action` 模式）
  - [ ] 1.5 添加 Mock 数据 Seed（卫星领域示例）

- [ ] Task 2: 前端 Drawer 组件 (AC: #1, #2)
  - [ ] 2.1 创建 `DataLibraryDrawer.tsx` 主组件（TailwindCSS animate 动画）
  - [ ] 2.2 实现 Drawer 动画（使用 `animate-in slide-in-from-right`）
  - [ ] 2.3 实现宽度拖拽调整功能
  - [ ] 2.4 集成快捷键 `Cmd/Ctrl + D`（使用 `e.preventDefault()` 阻止默认）
  - [ ] 2.5 集成工具栏"数据库"图标按钮

- [ ] Task 3: 前端视图与搜索 (AC: #3)
  - [ ] 3.1 创建 `AssetGrid.tsx` 网格视图组件
  - [ ] 3.2 创建 `AssetList.tsx` 列表视图组件
  - [ ] 3.3 创建 `AssetCard.tsx` 资产卡片组件
  - [ ] 3.4 实现视图切换按钮（网格/列表）
  - [ ] 3.5 实现搜索栏与过滤逻辑（名称/类型/时间）

- [ ] Task 4: Hooks 与数据获取 (AC: #1, #3)
  - [ ] 4.1 安装并配置 TanStack Query Provider
  - [ ] 4.2 创建 `useDataAssets.ts` 数据获取 Hook (基于 TanStack Query)
  - [ ] 4.3 Drawer 状态由父组件 TopBar 通过 Props 管理

- [ ] Task 5: 测试与验证
  - [ ] 5.1 后端 API 单元测试（4 用例）
  - [ ] 5.2 前端组件单元测试（6 用例）
  - [ ] 5.3 E2E 测试（11 用例）

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

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 文件路径 | `apps/web/features/data-library/` | Feature-Sliced 架构 |
| 状态管理 | Props 传递 | 简单，与 ArchiveDrawer 一致 |
| 数据获取 | TanStack Query ^5.x | 自动缓存/去重 |
| 动画 | TailwindCSS animate | 零新依赖 |
| API 格式 | NocoBase `:action` 模式 | 符合架构文档 |
| 快捷键 | `Cmd/Ctrl + D` | 使用 `e.preventDefault()` |

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
├── __tests__/
│   └── DataLibraryDrawer.test.tsx
└── index.ts

apps/api/src/modules/data-management/
├── data-management.module.ts
├── data-asset.controller.ts
├── data-asset.service.ts
├── data-asset.repository.ts
├── dto/
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

{{agent_model_name_version}}

### Completion Notes List

### File List
