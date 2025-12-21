# 归档确认对话框 UI 改造方案

**问题**: 当前使用原生 `window.confirm()` 对话框，样式不符合系统 UI 规范  
**位置**: `apps/web/components/PropertyPanel/index.tsx:62-66`  
**优先级**: 🟡 MEDIUM (UX 改进)

## 当前问题

### 1. 原生确认框的缺陷
```tsx
const confirmed = window.confirm(
  nextIsArchived
    ? '确认归档该节点？归档后将从画布隐藏，可在"归档箱"中恢复。'
    : '确认恢复该节点？'
);
```

**问题**:
- ❌ 样式无法定制，使用浏览器/操作系统原生样式
- ❌ 不符合应用的 Tailwind + 毛玻璃美学
- ❌ 在现代 Web 应用中显得格格不入
- ❌ 移动端体验差
- ❌ 无法添加图标、动画等增强元素

## 改造方案

### 方案 A: 使用行内确认模式 (推荐)

**优势**: 最轻量，无需新增组件  
**实现**: 在 PropertyPanel 中添加确认状态

```tsx
// PropertyPanel/index.tsx
export function PropertyPanel({
  nodeId,
  nodeData,
  onClose,
  onTypeChange,
  onPropsUpdate,
  onTagsUpdate,
  onArchiveToggle,
}: PropertyPanelProps) {
  const [isArchiveConfirming, setIsArchiveConfirming] = useState(false);

  const handleArchiveToggle = () =\u003e {
    if (!onArchiveToggle) return;
    const nextIsArchived = !nodeData.isArchived;
    
    if (nextIsArchived \u0026\u0026 !isArchiveConfirming) {
      // First click: show inline confirmation
      setIsArchiveConfirming(true);
      return;
    }
    
    // Second click or unarchive: execute
    onArchiveToggle(nodeId, nextIsArchived);
    setIsArchiveConfirming(false);
  };

  const handleCancelArchive = () =\u003e {
    setIsArchiveConfirming(false);
  };

  return (
    \u003caside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-gray-200/50 flex flex-col shadow-lg"\u003e
      {/* ... existing header ... */}

      {/* Scrollable Content */}
      \u003cdiv className="flex-1 overflow-y-auto"\u003e
        \u003cdiv className="p-4 space-y-6"\u003e
          {/* ... existing CommonHeader, Type Selector, Form ... */}
        \u003c/div\u003e
      \u003c/div\u003e

      {/* Footer with Archive Actions */}
      \u003cdiv className="p-4 border-t border-gray-200 bg-gray-50/50"\u003e
        {isArchiveConfirming ? (
          // Confirmation state
          \u003cdiv className="space-y-3"\u003e
            \u003cdiv className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"\u003e
              \u003csvg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"\u003e
                \u003cpath strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /\u003e
              \u003c/svg\u003e
              \u003cdiv className="flex-1"\u003e
                \u003cp className="font-medium"\u003e确认归档节点？\u003c/p\u003e
                \u003cp className="text-xs mt-1 text-amber-700"\u003e
                  归档后将从画布隐藏，但可在\"归档箱\"中随时恢复。
                \u003c/p\u003e
              \u003c/div\u003e
            \u003c/div\u003e
            \u003cdiv className="flex gap-2"\u003e
              \u003cbutton
                onClick={handleCancelArchive}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              \u003e
                取消
              \u003c/button\u003e
              \u003cbutton
                onClick={handleArchiveToggle}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
              \u003e
                确认归档
              \u003c/button\u003e
            \u003c/div\u003e
          \u003c/div\u003e
        ) : (
          // Normal state
          \u003cbutton
            onClick={handleArchiveToggle}
            className={cn(
              "w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              nodeData.isArchived
                ? "text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                : "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
            )}
          \u003e
            {nodeData.isArchived ? '📦 从归档箱恢复' : '📥 归档节点'}
          \u003c/button\u003e
        )}
      \u003c/div\u003e
    \u003c/aside\u003e
  );
}
```

**效果**:
1. 第一次点击 "归档节点" → 按钮区域变成黄色警告卡片
2. 显示确认信息和 "取消" / "确认归档" 两个按钮
3. 点击 "确认归档" → 执行归档
4. 点击 "取消" → 恢复为普通按钮状态

---

### 方案 B: 创建通用 ConfirmDialog 组件

**优势**: 可复用，符合组件化设计  
**实现**: 在 `@cdm/ui` 包中新增组件

#### 1. 创建 `packages/ui/src/confirm-dialog.tsx`

```tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from './utils';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () =\u003e void | Promise\u003cvoid\u003e;
  onCancel?: () =\u003e void;
}

interface ConfirmDialogContextType {
  showConfirm: (options: ConfirmDialogOptions) =\u003e void;
}

const ConfirmDialogContext = createContext\u003cConfirmDialogContextType | undefined\u003e(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogOptions, setDialogOptions] = useState\u003cConfirmDialogOptions | null\u003e(null);
  const [isLoading, setIsLoading] = useState(false);

  const showConfirm = useCallback((options: ConfirmDialogOptions) =\u003e {
    setDialogOptions(options);
  }, []);

  const handleConfirm = async () =\u003e {
    if (!dialogOptions) return;
    
    setIsLoading(true);
    try {
      await dialogOptions.onConfirm();
      setDialogOptions(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () =\u003e {
    if (dialogOptions?.onCancel) {
      dialogOptions.onCancel();
    }
    setDialogOptions(null);
  };

  const variantStyles = {
    danger: {
      icon: (
        \u003csvg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"\u003e
          \u003cpath strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /\u003e
        \u003c/svg\u003e
      ),
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: (
        \u003csvg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"\u003e
          \u003cpath strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /\u003e
        \u003c/svg\u003e
      ),
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      icon: (
        \u003csvg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"\u003e
          \u003cpath strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /\u003e
        \u003c/svg\u003e
      ),
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const variant = dialogOptions?.variant || 'warning';
  const styles = variantStyles[variant];

  return (
    \u003cConfirmDialogContext.Provider value={{ showConfirm }}\u003e
      {children}
      
      {dialogOptions \u0026\u0026 (
        \u003cdiv className="fixed inset-0 z-50 flex items-center justify-center"\u003e
          {/* Backdrop */}
          \u003cdiv 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          /\u003e
          
          {/* Dialog */}
          \u003cdiv className="relative bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200/50 animate-in zoom-in-95 duration-200"\u003e
            \u003cdiv className="flex gap-4"\u003e
              \u003cdiv className={cn("flex-shrink-0 p-2 rounded-lg", styles.bgColor, styles.borderColor, "border")}\u003e
                \u003cdiv className={styles.iconColor}\u003e
                  {styles.icon}
                \u003c/div\u003e
              \u003c/div\u003e
              
              \u003cdiv className="flex-1"\u003e
                \u003ch3 className="text-lg font-semibold text-gray-900 mb-2"\u003e
                  {dialogOptions.title}
                \u003c/h3\u003e
                {dialogOptions.description \u0026\u0026 (
                  \u003cp className="text-sm text-gray-600"\u003e
                    {dialogOptions.description}
                  \u003c/p\u003e
                )}
              \u003c/div\u003e
            \u003c/div\u003e
            
            \u003cdiv className="flex gap-3 mt-6"\u003e
              \u003cbutton
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              \u003e
                {dialogOptions.cancelText || '取消'}
              \u003c/button\u003e
              \u003cbutton
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors",
                  styles.buttonColor
                )}
              \u003e
                {isLoading ? '处理中...' : (dialogOptions.confirmText || '确认')}
              \u003c/button\u003e
            \u003c/div\u003e
          \u003c/div\u003e
        \u003c/div\u003e
      )}
    \u003c/ConfirmDialogContext.Provider\u003e
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
}
```

#### 2. 导出组件 `packages/ui/src/index.ts`

```ts
// Utility functions
export { cn } from './utils';

// Toast notifications
export { ToastProvider, useToast } from './toast';
export type { Toast, ToastType } from './toast';

// Confirm dialog
export { ConfirmDialogProvider, useConfirmDialog } from './confirm-dialog';
export type { ConfirmDialogOptions } from './confirm-dialog';
```

#### 3. 在 Provider 中注册 `apps/web/app/providers.tsx`

```tsx
'use client';

import { ToastProvider, ConfirmDialogProvider } from '@cdm/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    \u003cToastProvider\u003e
      \u003cConfirmDialogProvider\u003e
        {children}
      \u003c/ConfirmDialogProvider\u003e
    \u003c/ToastProvider\u003e
  );
}
```

#### 4. 使用新组件 `apps/web/components/PropertyPanel/index.tsx`

```tsx
import { useConfirmDialog } from '@cdm/ui';

export function PropertyPanel({
  nodeId,
  nodeData,
  // ... other props
}: PropertyPanelProps) {
  const { showConfirm } = useConfirmDialog();

  const handleArchiveToggle = () =\u003e {
    if (!onArchiveToggle) return;
    const nextIsArchived = !nodeData.isArchived;
    
    if (nextIsArchived) {
      // Show confirmation for archive action
      showConfirm({
        title: '确认归档节点？',
        description: '归档后将从画布隐藏，但可在"归档箱"中随时恢复。',
        confirmText: '确认归档',
        cancelText: '取消',
        variant: 'warning',
        onConfirm: () =\u003e onArchiveToggle(nodeId, nextIsArchived),
      });
    } else {
      // No confirmation needed for unarchive
      onArchiveToggle(nodeId, nextIsArchived);
    }
  };

  return (
    // ... PropertyPanel UI
    \u003cbutton onClick={handleArchiveToggle}\u003e
      {nodeData.isArchived ? '恢复节点' : '归档节点'}
    \u003c/button\u003e
  );
}
```

---

## 推荐实施路径

### 短期 (立即可做)
✅ **方案 A: 行内确认模式**
- 改动最小，只修改 PropertyPanel 组件
- 用户体验清晰，UI 一致性好
- 无需新增依赖或组件

### 中期 (项目迭代时)
✅ **方案 B: 通用 ConfirmDialog**
- 创建可复用组件，未来删除节点、清空数据等操作都可使用
- 符合组件库建设思路
- 更好的可维护性

### UI 设计规范

两种方案都遵循系统 UI 规范:
- ✅ Tailwind CSS 样式
- ✅ 毛玻璃效果 `backdrop-blur-md`
- ✅ 柔和边框 `border-gray-200/50`
- ✅ 流畅动画 `transition-colors`
- ✅ 语义化颜色
  - 归档: `amber` (琥珀色/警告色)
  - 恢复: `blue` (蓝色/信息色)
  - 删除: `red` (红色/危险色)

---

**建议**:  
立即实施**方案 A**，快速改善用户体验。  
在下一个 Sprint 中实施**方案 B**，提升系统可复用性。
