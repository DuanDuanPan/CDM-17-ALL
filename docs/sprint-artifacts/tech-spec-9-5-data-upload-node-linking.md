# Tech-Spec: Story 9.5 - 数据上传与节点关联

**Created:** 2026-01-11
**Status:** Ready for Development

## Overview

### Problem Statement

Story 9.1-9.4 已构建完整的数据资源库基础设施，但当前系统缺少：
1. **数据上传能力** - 无法将新文件导入 DataAsset 系统
2. **节点关联 UI** - 后端 API 已就绪，但前端缺少关联交互界面
3. **节点详情面板集成** - 无法在节点详情中查看/管理关联资产

### Solution

扩展现有 `data-management` 模块，添加：
1. **上传端点** - `POST /api/data-assets:upload` (multipart/form-data)
2. **格式检测** - 基于扩展名自动识别 DataAssetFormat
3. **节点关联详情查询** - 新增 `GET /api/data-assets/links:detail?nodeId=...`（避免破坏 Story 9.2 依赖的 `GET /api/data-assets/links`）
4. **类型对齐** - 将 `DataLinkType` 对齐为 `input/output/reference`（并同步 DTO 校验常量）
5. **前端组件** - UploadButton、LinkAssetDialog、LinkedAssetsSection（集成到 PropertyPanel）

### Scope (In/Out)

**In Scope:**
- ✅ 文件上传 + 格式自动识别
- ✅ 资产-节点关联 Dialog
- ✅ 节点详情面板关联资产区域
- ✅ 解除关联功能

**Out of Scope:**
- ❌ 批量上传进度条
- ❌ 文件分片上传
- ❌ 权限/密级控制

---

## Context for Development

### Codebase Patterns

**Backend Upload Pattern（参考 `file.controller.ts`，但路由与校验策略不同）:**
```typescript
// 参考模式 - apps/api/src/modules/file/file.controller.ts
// 注意：在 Nest/Express 中 ":" 通常表示 path param，需要转义成字面量路由
@Post('data-assets\\:upload')
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
async uploadAsset(/* file + graphId */) {
  // 复用 FileService.storeFile(file) 获取 fileId
  // 创建 DataAsset：graphId 必填，storagePath 建议为 `/api/files/:fileId`
  // 校验策略：以扩展名映射为主（不要复用 file.controller.ts 的 MIME allowlist）
}
```

**前端 Hook 模式 (遵守 project-context.md):**
```typescript
// hooks 封装所有 API 逻辑
const { upload, isUploading, error } = useDataUpload();
const { linkAsset, unlinkAsset, isLinking } = useAssetLinks();
```

### Files to Reference

| 文件                                                              | 用途          |
| ----------------------------------------------------------------- | ------------- |
| `apps/api/src/modules/file/file.controller.ts`                    | 上传模式参考  |
| `apps/api/src/modules/file/file.service.ts`                       | 文件存储复用  |
| `apps/api/src/modules/data-management/data-asset.controller.ts`   | 扩展上传端点  |
| `apps/api/src/modules/data-management/data-asset.service.ts`      | 添加上传逻辑  |
| `apps/api/src/modules/data-management/node-data-link.service.ts`  | links:detail 返回 linkType |
| `apps/web/features/data-library/hooks/useDataAssets.ts`           | Hook 模式参考 |
| `apps/web/features/data-library/components/DataLibraryDrawer.tsx` | 集成入口      |
| `apps/web/components/layout/RightSidebar.tsx`                     | PropertyPanel 集成入口 |
| `apps/web/components/PropertyPanel/TaskForm.tsx`                  | 节点详情面板落点 |
| `apps/web/components/PropertyPanel/DataForm.tsx`                  | 节点详情面板落点 |

### Technical Decisions

| 决策点   | 选择             | 理由                   |
| -------- | ---------------- | ---------------------- |
| 存储方式 | 复用 FileService | 统一文件存储机制       |
| 格式检测 | 扩展名映射       | 简单可靠，无需解析内容 |
| 关联合约 | 复用 `/api/data-assets/links*` + 新增 `links:detail` | 避免对 Story 9.2 引入破坏性变更 |
| 关联类型 | `input/output/reference`（UI 可展示为 INPUT/OUTPUT/REFERENCE） | 满足追溯语义 |
| 关联 UI  | Modal Dialog     | 一致的 UX 模式         |

---

## Implementation Plan

### Tasks

#### Phase 1: Backend 上传端点

- [ ] **Task 1.1**: 添加上传端点到 `data-asset.controller.ts`
  - 新增 `POST /data-assets:upload` 路由（Nest 字面量：`data-assets\\:upload`）
  - 使用 `@UseInterceptors(FileInterceptor('file'))` + `ParseFilePipe`（MAX_FILE_SIZE）
  - DataManagementModule import `FileModule`，复用 `FileService.storeFile`
  - 创建 DataAsset：`graphId` 必填；`storagePath` 设为可访问 URL（推荐 `/api/files/:fileId`）

- [ ] **Task 1.2**: 创建格式检测工具
  - 新建 `apps/api/src/modules/data-management/utils/format-detection.ts`
  - 实现 `getDataAssetFormatFromFilename(filename: string): DataAssetFormat`

- [ ] **Task 1.3**: 扩展 DataAssetService
  - 添加 `uploadAsset(file, graphId, creatorId)` 方法
  - 调用 FileService + 格式检测 + 创建 DataAsset

- [ ] **Task 1.4**: 对齐关联类型枚举（Type + DTO）
  - 更新 `packages/types/src/data-library-types.ts`：`DataLinkType` → `input/output/reference`
  - 更新 `apps/api/src/modules/data-management/dto/constants.ts`：`DATA_LINK_TYPES` 同步

- [ ] **Task 1.5**: 节点关联详情查询（links:detail）
  - 新增 `GET /api/data-assets/links:detail?nodeId=...`（Nest 字面量：`data-assets/links\\:detail`）
  - 返回 `links: [{ id, nodeId, assetId, linkType, asset }]`（用于节点详情面板；不要破坏既有 `GET /links`）

#### Phase 2: Frontend 上传组件

- [ ] **Task 2.1**: 创建 `useDataUpload.ts` hook
  - 封装 FormData 构建 + fetch 上传
  - 返回 `{ upload, isUploading, error, reset }`

- [ ] **Task 2.2**: 创建 `UploadButton.tsx` 组件
  - 使用 `@cdm/ui` Button + hidden file input
  - 集成 useDataUpload hook
  - 上传成功触发 `onUploadComplete` 回调

- [ ] **Task 2.3**: 集成到 DataLibraryDrawer
  - 在顶部工具栏添加 UploadButton
  - 上传成功后刷新资产列表

#### Phase 3: 关联 Dialog

- [ ] **Task 3.1**: 创建 `useAssetLinks.ts` hook
  - 封装 POST/DELETE 关联 API
  - 返回 `{ linkAsset, unlinkAsset, isLinking }`

- [ ] **Task 3.2**: 创建 `LinkAssetDialog.tsx` 组件
  - 节点搜索/选择列表
  - 关联类型 Radio（输入/输出/参考 → `input/output/reference`）
  - 确认/取消按钮

- [ ] **Task 3.3**: 添加触发入口
  - AssetCard 右键菜单 "关联到节点"
  - AssetList 右键菜单 "关联到节点"

#### Phase 4: 节点详情集成

- [ ] **Task 4.1**: 创建 `LinkedAssetsSection.tsx`
  - 显示关联资产列表 (名称、格式、类型)
  - 预览按钮 → 打开 ModelViewerModal/ContourViewerModal
  - 解除关联按钮

- [ ] **Task 4.2**: 集成到 RightSidebar
  - 集成到 `PropertyPanel`（`TaskForm.tsx` / `DataForm.tsx`）
  - 调用 `GET /api/data-assets/links:detail?nodeId=...`（返回 `asset + linkType`）

#### Phase 5: 测试

- [ ] **Task 5.1**: 后端单元测试
  - `format-detection.test.ts` - 格式检测
  - `data-asset.controller.spec.ts` - 上传端点

- [ ] **Task 5.2**: 前端单元测试
  - `useDataUpload.test.ts`
  - `UploadButton.test.tsx`
  - `LinkAssetDialog.test.tsx`
  - `LinkedAssetsSection.test.tsx`

- [ ] **Task 5.3**: E2E 测试
  - 扩展 `apps/web/e2e/data-library.spec.ts`

---

## Acceptance Criteria

- [ ] **AC1**: Given Drawer 已打开, When 点击上传并选择文件, Then 文件上传成功并出现在列表中
- [ ] **AC2**: Given 上传的文件, When 上传完成, Then 格式正确识别（`DataAssetFormat`；VTK 系列存为 `OTHER` 但必须可打开 ContourViewerModal）
- [ ] **AC3**: Given 选中资产, When 点击"关联到节点", Then 可选择节点并设置关联类型
- [ ] **AC4**: Given 选中节点, When 查看详情面板, Then 显示关联资产列表可预览
- [ ] **AC5**: Given 详情面板有关联, When 点击解除关联, Then 关联移除资产保留

---

## Additional Context

### Dependencies

| 依赖                       | 版本 | 用途                            |
| -------------------------- | ---- | ------------------------------- |
| `@nestjs/platform-express` | -    | Multer 文件上传                 |
| `@cdm/ui`                  | -    | Button, Dialog, Input           |
| `lucide-react`             | -    | Upload, Link2, Eye, Trash2 图标 |

### API Endpoints

```bash
# 新增端点
POST   /api/data-assets:upload                # multipart/form-data {file, graphId}

# 节点关联（复用 + 扩展）
POST   /api/data-assets/links                 # 创建关联（{ nodeId, assetId, linkType }）
GET    /api/data-assets/links?nodeId=:id      # 已有：仅返回 assets（Story 9.2 依赖）
GET    /api/data-assets/links:detail?nodeId=:id # [NEW] 返回 links（asset + linkType），供节点详情面板
POST   /api/data-assets/links:byNodes         # 已有：批量查询（Story 9.2 依赖）
DELETE /api/data-assets/links:destroy?nodeId=:nodeId&assetId=:assetId # 解除关联

# 已有端点 (复用)
GET    /api/data-assets                       # 列表
GET    /api/data-assets:get?filterByTk=:id    # 获取单个
DELETE /api/data-assets:destroy?filterByTk=:id
```

### Format Detection Mapping

```typescript
const FORMAT_MAPPING: Record<string, DataAssetFormat> = {
  '.step': 'STEP', '.stp': 'STEP',
  '.iges': 'IGES', '.igs': 'IGES',
  '.stl': 'STL',
  '.obj': 'OBJ',
  '.fbx': 'FBX',
  '.gltf': 'GLTF', '.glb': 'GLTF',
  '.pdf': 'PDF',
  '.doc': 'DOCX', '.docx': 'DOCX',
  '.xls': 'XLSX', '.xlsx': 'XLSX',
  '.json': 'JSON',
  '.xml': 'XML',
  '.csv': 'CSV',
  '.png': 'IMAGE', '.jpg': 'IMAGE', '.jpeg': 'IMAGE', '.webp': 'IMAGE', '.svg': 'IMAGE',
  '.mp4': 'VIDEO', '.mov': 'VIDEO',
};
// Default: 'OTHER'

// NOTE:
// - `.vtk/.vtp/.vtu/.vti` 统一存为 format='OTHER'，但必须保留 storagePath 的扩展名以触发 ContourViewerModal 预览
```

### File Structure

```text
apps/api/src/modules/data-management/
├── utils/
│   └── format-detection.ts       # [NEW] 格式识别 util (后端)
├── data-management.module.ts     # [MODIFY] import FileModule
├── data-asset.controller.ts      # [MODIFY] 添加 upload + links:detail 端点
├── data-asset.service.ts         # [MODIFY] 添加 uploadAsset 方法
├── node-data-link.service.ts     # [MODIFY] 返回 links:detail（带 linkType）
└── dto/
    ├── upload-asset.dto.ts       # [NEW]
    └── create-node-data-link.dto.ts # [EXISTING] 复用（创建关联）

apps/web/features/data-library/
├── components/
│   ├── UploadButton.tsx          # [NEW]
│   ├── LinkAssetDialog.tsx       # [NEW]
│   ├── AssetCard.tsx             # [MODIFY] 添加右键菜单
│   ├── AssetList.tsx             # [MODIFY] 添加右键菜单
│   └── DataLibraryDrawer.tsx     # [MODIFY] 集成 UploadButton
└── hooks/
    ├── useDataUpload.ts          # [NEW]
    └── useAssetLinks.ts          # [NEW]

apps/web/components/PropertyPanel/
├── LinkedAssetsSection.tsx       # [NEW]
├── TaskForm.tsx                  # [MODIFY]
└── DataForm.tsx                  # [MODIFY]
```

### Testing Strategy

| 测试类型 | 覆盖率目标 | 关键场景                |
| -------- | ---------- | ----------------------- |
| 单元测试 | 80%        | 格式检测、Hook 状态管理 |
| E2E 测试 | AC 全覆盖  | 上传、关联、预览、解除  |

### Notes

- 上传大小限制：10MB（与 file.controller.ts 保持一致）
- MIME 校验：不要复用 `file.controller.ts` 的 MIME allowlist（工业格式可能为 `application/octet-stream`）；建议以扩展名映射为主，未知扩展存 `OTHER`
- 节点详情面板需考虑任务节点和数据节点两种情况
