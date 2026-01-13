# Tech-Spec: Story 9.7 上下文感知数据资产交互

**Created:** 2026-01-12
**Status:** Ready for Development
**Story:** [9-7-context-aware-data-asset-interaction.md](./9-7-context-aware-data-asset-interaction.md)

---

## Overview

### Problem Statement

当前 Data Library Drawer 存在交互逻辑不一致问题：
- PBS/任务视图点击节点后，关联资产未按类型（输入/输出/参考）分组显示
- 上传行为不感知上下文 - 各视图上传逻辑相同
- 任务视图缺少自动"输出"关联语义

### Solution

实现上下文感知的上传交互系统：
- **PBS 视图** → 上传旁提供类型下拉（默认 Reference），批量上传支持“应用到所有”与逐个选择（QuickTypePicker）
- **任务视图** → 类型下拉默认 Output（可切换为 Input/Reference）
- **文件夹视图** → 直接上传到当前文件夹（未选中文件夹则上传到根目录）
- **关联资产显示** → 右侧面板按 linkType 分组（仅单节点模式；PBS“包含子节点”可保持扁平列表）

### Scope

| In Scope | Out of Scope |
|----------|--------------|
| 上下文感知上传 Hook | 批量创建关联的后端 API（复用逐个调用） |
| UploadTypeDropdown 组件（含批量复选框） | 已关联资产的类型修改功能 |
| QuickTypePicker（逐个文件类型选择） | 拖拽上传到特定节点 |
| GroupedAssetList 分组显示 | 资产预览增强 |
| Tab 切换时类型状态重置（仅 selectedLinkType） | |

---

## Context for Development

### Codebase Patterns

根据代码调查，项目遵循以下模式：

| Pattern | Example | 应用于 Story 9.7 |
|---------|---------|-----------------|
| Hook-First | `useDataUpload.ts` (77 LOC) | `useContextAwareUpload.ts` |
| UI from @cdm/ui | `import { Select, Button } from '@cdm/ui'` | Select + Button（checkbox 用原生 input） |
| React Query invalidation | `queryClient.invalidateQueries()` | 上传后刷新对应视图 |
| Org State Hook | `useDataLibraryDrawerOrgState.ts` | 保持选择状态；在 Drawer 层重置 selectedLinkType |

### Files to Reference

| File | Purpose | Key Patterns |
|------|---------|--------------|
| [useDataUpload.ts](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/apps/web/features/data-library/hooks/useDataUpload.ts) | 现有上传 Hook | Options interface, useCallback, queryClient invalidation |
| [UploadButton.tsx](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/apps/web/features/data-library/components/UploadButton.tsx) | 现有上传按钮 | 多文件顺序上传, drag-drop, testid |
| [useDataLibraryDrawerOrgState.ts](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/apps/web/features/data-library/hooks/useDataLibraryDrawerOrgState.ts) | 组织视图状态 | selectedPbsId/TaskId/FolderId 状态管理 |
| [data-assets.ts](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/apps/web/features/data-library/api/data-assets.ts) | API 客户端 | createNodeAssetLink, fetchNodeAssetLinks |
| [DataLibraryDrawer.tsx](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/apps/web/features/data-library/components/DataLibraryDrawer.tsx) | Drawer 主组件 | 328 LOC, 集成各视图组件 |

### Technical Decisions (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-1 | Custom Hook for upload config | 简单、可测试、符合项目模式 |
| ADR-2 | 混合触发机制 | PBS 弹窗 + 任务 Dropdown + 文件夹直接 |
| ADR-3 | "应用到所有文件"复选框 | 显式确认、灵活控制 |
| ADR-4 | 单向数据流 | Hook → uploadConfig → Dialog/Dropdown → API |

---

## Implementation Plan

### Phase 1: GroupedAssetList 组件 (AC1)

#### [NEW] `GroupedAssetList.tsx`

```typescript
// apps/web/features/data-library/components/GroupedAssetList.tsx
// ~120 LOC

interface GroupedAssetListProps {
  links: NodeDataLinkWithAsset[];
  onAssetClick?: (asset: DataAssetWithFolder) => void;
}

// 按 linkType 分组: input | output | reference
// 使用 CollapseToggle 或本地 state 做折叠；空分组默认隐藏，可切换显示
```

**Key Implementation:**
- 使用原生 `reduce` 按 `link.linkType` 分组（避免引入 lodash）
- 每组用 `CollapseToggle` 或本地 state 实现折叠
- Header 显示图标 (Download/Upload/Paperclip) + 名称 + Badge

#### [MODIFY] `DataLibraryDrawerContent.tsx`

- 当 `orgView` 为 `pbs/task` 且已选中节点且未开启“包含子节点”时：右侧使用 `GroupedAssetList`
- 调用 `fetchNodeAssetLinks(nodeId)` 获取带 linkType 的关联（API 已有）

---

### Phase 2: useContextAwareUpload Hook

#### [NEW] `useContextAwareUpload.ts`

```typescript
// apps/web/features/data-library/hooks/useContextAwareUpload.ts
// ~80 LOC

interface UseContextAwareUploadOptions {
  orgView: 'pbs' | 'task' | 'folder';
  selectedPbsId: string | null;
  selectedTaskId: string | null;
  selectedFolderId: string | null;
}

type UploadMode = 'folder' | 'node-link' | 'unlinked';

interface UploadConfig {
  mode: UploadMode;
  nodeId?: string;
  folderId?: string;
  defaultLinkType?: DataLinkType;
}

export function useContextAwareUpload(options: UseContextAwareUploadOptions): UploadConfig {
  const { orgView, selectedPbsId, selectedTaskId, selectedFolderId } = options;

  return useMemo(() => {
    if (orgView === 'folder') {
      return { mode: 'folder', folderId: selectedFolderId ?? undefined };
    }
    if (orgView === 'task' && selectedTaskId) {
      return { mode: 'node-link', nodeId: selectedTaskId, defaultLinkType: 'output' };
    }
    if (orgView === 'pbs' && selectedPbsId) {
      return { mode: 'node-link', nodeId: selectedPbsId, defaultLinkType: 'reference' };
    }
    return { mode: 'unlinked' };
  }, [orgView, selectedPbsId, selectedTaskId, selectedFolderId]);
}
```

---

### Phase 3: UploadTypeDropdown 组件

#### [NEW] `UploadTypeDropdown.tsx`

```typescript
// apps/web/features/data-library/components/UploadTypeDropdown.tsx
// ~80 LOC

interface UploadTypeDropdownProps {
  value: DataLinkType;
  defaultValue: DataLinkType;
  onChange: (type: DataLinkType) => void;

  // batch-only UI
  fileCount?: number;
  applyToAll?: boolean;
  onApplyToAllChange?: (next: boolean) => void;
}

// 使用 @cdm/ui 的 Select + 原生 <input type="checkbox" />
// data-testid="upload-type-dropdown" / "batch-apply-checkbox"
```

---

### Phase 4: QuickTypePicker 组件（批量逐个选择）

#### [NEW] `QuickTypePicker.tsx`

```typescript
// apps/web/features/data-library/components/QuickTypePicker.tsx
// ~120 LOC

interface QuickTypePickerProps {
  open: boolean;
  files: File[];
  onPick: (fileIndex: number, linkType: DataLinkType) => void;
  onClose: () => void;
}

// 轻量 Modal：createPortal + overlay + 3 buttons（Input/Output/Reference）
// data-testid="quick-type-picker"
```

---

### Phase 5: 集成与状态管理

#### [NEW] `ContextAwareUploadButton.tsx`

- 组合现有 `UploadButton.tsx` + `UploadTypeDropdown.tsx` + `QuickTypePicker.tsx`
- 负责 orchestration：`upload → (optional) createNodeAssetLink → invalidateQueries → refresh UI`
- `mode === 'unlinked'` 时弹出确认：取消 / 上传到未关联

#### [MODIFY] `DataLibraryDrawerToolbar.tsx`

- 用 `ContextAwareUploadButton` 替换当前 `UploadButton`
- 仅在 `pbs/task` 且节点已选中时显示 `UploadTypeDropdown`

#### [MODIFY] `DataLibraryDrawer.tsx`

- 将 `orgView + selectedPbsId + selectedTaskId + selectedFolderId` 下发给 toolbar
- 在 Drawer 层管理 `selectedLinkType`（Tab 切换 / Drawer 关闭时重置为默认值）
- 上传完成后刷新对应查询（分组面板 links:detail、文件夹树 data-folders、资产列表 data-assets）

#### [MODIFY] `useDataUpload.ts`

- 上传成功后同时 invalidation：`['data-assets', graphId]` + `['data-folders', graphId]`

---

## Verification Plan

### Automated Tests

#### Unit Tests

运行命令:
```bash
cd /Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL
pnpm test --filter=@cdm/web -- --testPathPattern="data-library" --watch=false
```

| Test File | Cases | Coverage |
|-----------|-------|----------|
| `useContextAwareUpload.test.ts` | 12 | 状态组合矩阵（orgView × selection） |
| `GroupedAssetList.test.tsx` | 6 | 分组显示、空分组隐藏、徽章数量 |
| `UploadTypeDropdown.test.tsx` | 6 | 默认值、切换、批量复选框 |
| `QuickTypePicker.test.tsx` | 6 | 进度、逐个选择、完成关闭 |

**状态组合矩阵 (useContextAwareUpload):**

| orgView | selectedPbsId | selectedTaskId | selectedFolderId | Expected mode |
|--------|---------------|----------------|------------------|---------------|
| folder | - | - | 有 | `folder` |
| folder | - | - | 无 | `folder` (root) |
| task | - | 有 | - | `node-link` |
| task | - | 无 | - | `unlinked` |
| pbs | 有 | - | - | `node-link` |
| pbs | 无 | - | - | `unlinked` |

#### E2E Tests

运行命令:
```bash
cd /Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL
pnpm test:e2e --filter=@cdm/web -- --grep="data-library"
```

扩展 `apps/web/e2e/data-library-views.spec.ts`:

- AC1: PBS 视图选中节点后右侧按 linkType 分组显示
- AC2: 文件夹视图上传成功后徽章数量 +1
- AC3: 任务视图上传自动关联为 output
- AC3-extra: 任务视图类型下拉切换后关联正确类型
- AC4: PBS 视图默认 Reference；切换类型后关联正确
- AC4-extra: PBS 批量上传逐个选择类型（QuickTypePicker）
- AC5: 未选中节点上传显示提示
- Tab 切换: selectedLinkType 重置验证

### Manual Verification

> [!NOTE]
> 以下步骤需要开发完成后在本地环境执行

1. **启动开发服务器**: `pnpm dev`
2. **打开 Data Library Drawer**
3. **测试 PBS 视图上传**:
   - 切换到 PBS Tab
   - 选中任意 PBS 节点
   - 验证上传旁类型下拉默认值为 Reference
   - 选择"输入"类型并上传
   - 验证右侧面板"输入"分组显示新资产
4. **测试任务视图上传**:
   - 切换到任务 Tab
   - 选中任意任务
   - 验证上传按钮旁有类型下拉 (默认"输出")
   - 上传文件，验证自动关联为 Output
   - 切换类型下拉为"参考"，再次上传，验证关联类型正确
5. **测试 Tab 切换重置**:
   - 在 PBS Tab 将类型下拉切换为"输入"
   - 切换到任务 Tab
   - 切回 PBS Tab，验证类型下拉重置为默认值（Reference）

---

## Additional Context

### Dependencies

| Package | Usage |
|---------|-------|
| `@cdm/ui` | Select, Button, Badge, CollapseToggle, ConfirmDialogProvider |
| `lucide-react` | Download, Upload, Paperclip icons |
| `@tanstack/react-query` | Query invalidation |

### File Structure

```text
apps/web/features/data-library/
├── components/
│   ├── GroupedAssetList.tsx          # [NEW] ~120 LOC
│   ├── UploadTypeDropdown.tsx        # [NEW] ~80 LOC
│   ├── QuickTypePicker.tsx           # [NEW] ~120 LOC
│   ├── ContextAwareUploadButton.tsx  # [NEW] ~120 LOC
│   ├── UploadButton.tsx              # [KEEP] (底层上传能力)
│   └── data-library-drawer/
│       ├── DataLibraryDrawerToolbar.tsx # [MODIFY] +40 LOC
│       └── DataLibraryDrawerContent.tsx # [MODIFY] +40 LOC
├── hooks/
│   ├── useContextAwareUpload.ts      # [NEW] ~80 LOC
│   └── useDataUpload.ts              # [MODIFY] +20 LOC
└── __tests__/
    ├── GroupedAssetList.test.tsx     # [NEW]
    ├── UploadTypeDropdown.test.tsx   # [NEW]
    ├── QuickTypePicker.test.tsx      # [NEW]
    └── useContextAwareUpload.test.ts # [NEW]
```

### LOC Budget

| Component | Estimated LOC | Budget (≤300) |
|-----------|---------------|---------------|
| GroupedAssetList.tsx | 120 | ✅ |
| UploadTypeDropdown.tsx | 80 | ✅ |
| QuickTypePicker.tsx | 120 | ✅ |
| ContextAwareUploadButton.tsx | 120 | ✅ |
| useContextAwareUpload.ts | 80 | ✅ |
| **Total New Code** | ~520 | - |
| **Modifications** | ~100 | - |

---

## Notes

### Risk Mitigations (Pre-mortem)

| Risk | Mitigation |
|------|------------|
| Tab 切换后配置残留 | `switchTab()` 函数重置所有选中状态 |
| 批量上传性能 | 顺序上传 + 单次关联，可后续优化为批量 API |
| 用户找不到关联 | Toast 提示"已关联到 [节点名]" |

### Future Iterations

- [ ] 批量关联 API (`POST /api/data-assets/links:batch`)
- [ ] 已关联资产类型修改功能
- [ ] Dropdown 选中状态 localStorage 持久化
