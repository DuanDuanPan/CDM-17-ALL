/**
 * Story 9.2: Folder Tree View Component
 * Displays folder tree structure with CRUD operations and drag-drop support
 * AC#3: View 3 allows folder creation, rename, delete
 * AC#4: Drag-drop to move assets into folders (migrated to @dnd-kit)
 */

'use client';

import { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Folder, FolderPlus, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { cn, Button, useConfirmDialog } from '@cdm/ui';
import { useDataFolders } from '../hooks/useDataFolders';
import { FolderTreeItem } from './folder-tree/FolderTreeItem';
import { NewFolderInput } from './folder-tree/NewFolderInput';
import type { FolderDropData } from './dnd';

interface FolderTreeViewProps {
  /** Graph ID for context */
  graphId: string;
  /** Currently selected folder ID */
  selectedId: string | null;
  /** Callback when a folder is selected */
  onSelect: (id: string | null) => void;
  /** Expanded folder IDs (AC#5) */
  expandedIds: Set<string>;
  /** Toggle expand/collapse for a folder (AC#5) */
  onToggleExpand: (folderId: string) => void;
}

/**
 * Folder Tree View - displays folder hierarchy with CRUD operations
 * Story 9.2: Migrated to @dnd-kit for high-fidelity drag preview
 */
export function FolderTreeView({
  graphId,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: FolderTreeViewProps) {
  const {
    folders,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    isCreating,
  } = useDataFolders({ graphId });

  const { showConfirm } = useConfirmDialog();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(
    undefined
  );

  // @dnd-kit droppable for root "All Assets" zone
  const rootDropData: FolderDropData = {
    type: 'folder',
    folderId: null,
  };

  const { isOver: isOverRoot, setNodeRef: setRootNodeRef } = useDroppable({
    id: 'folder-root',
    data: rootDropData,
  });

  // Start creating a new folder
  const handleStartCreate = useCallback((parentId?: string) => {
    setNewFolderParentId(parentId);
    setIsCreatingNew(true);
    if (parentId) {
      if (!expandedIds.has(parentId)) {
        onToggleExpand(parentId);
      }
    }
  }, [expandedIds, onToggleExpand]);

  // Confirm create folder
  const handleConfirmCreate = useCallback(
    async (name: string) => {
      if (!name.trim()) {
        setIsCreatingNew(false);
        return;
      }
      await createFolder(name.trim(), newFolderParentId);
      setIsCreatingNew(false);
      setNewFolderParentId(undefined);
    },
    [createFolder, newFolderParentId]
  );

  // Cancel create
  const handleCancelCreate = useCallback(() => {
    setIsCreatingNew(false);
    setNewFolderParentId(undefined);
  }, []);

  // Start renaming
  const handleStartRename = useCallback((folderId: string) => {
    setEditingId(folderId);
  }, []);

  // Confirm rename
  const handleConfirmRename = useCallback(
    async (id: string, name: string) => {
      if (!name.trim()) {
        setEditingId(null);
        return;
      }
      await renameFolder(id, name.trim());
      setEditingId(null);
    },
    [renameFolder]
  );

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  // Delete folder
  const handleDelete = useCallback(
    (id: string) => {
      showConfirm({
        title: '删除文件夹',
        description: '确定要删除此文件夹吗？（仅支持删除空文件夹）',
        confirmText: '删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await deleteFolder(id);
            if (selectedId === id) {
              onSelect(null);
            }
            toast.success('已删除文件夹');
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            toast.error(message);
          }
        },
      });
    },
    [showConfirm, deleteFolder, selectedId, onSelect]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  // Empty state
  if (folders.length === 0 && !isCreatingNew) {
    return (
      <div
        data-testid="empty-state-folder"
        className="flex flex-col items-center justify-center h-full py-12 text-gray-400"
      >
        <FolderTree className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">暂无文件夹</p>
        <p className="text-xs mt-1 text-gray-400 mb-4">
          创建文件夹来组织您的数据资产
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600"
          onClick={() => handleStartCreate()}
        >
          <FolderPlus className="w-4 h-4" />
          新建文件夹
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="folder-tree" className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500">文件夹</span>
        <Button
          variant="ghost"
          size="icon"
          className="p-1"
          onClick={() => handleStartCreate()}
          title="新建文件夹"
          disabled={isCreating}
        >
          <FolderPlus className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      {/* Root drop zone - "All Assets" */}
      <div
        ref={setRootNodeRef}
        className={cn(
          'px-3 py-2 cursor-pointer transition-colors duration-150',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          selectedId === null && 'bg-blue-50 dark:bg-blue-900/30',
          isOverRoot && 'ring-2 ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-900/30'
        )}
        onClick={() => onSelect(null)}
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Folder className="w-4 h-4" />
          <span>全部资产</span>
        </div>
      </div>

      {/* Folder tree content */}
      <div className="flex-1 overflow-y-auto py-1">
        {folders.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            selectedId={selectedId}
            expandedIds={expandedIds}
            editingId={editingId}
            isCreatingNew={isCreatingNew}
            newFolderParentId={newFolderParentId}
            onConfirmCreate={handleConfirmCreate}
            onCancelCreate={handleCancelCreate}
            isCreating={isCreating}
            onSelect={onSelect}
            onToggle={onToggleExpand}
            onStartRename={handleStartRename}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
            onDelete={handleDelete}
            onStartCreate={handleStartCreate}
            level={0}
          />
        ))}

        {/* New folder input at root level */}
        {isCreatingNew && !newFolderParentId && (
          <NewFolderInput
            onConfirm={handleConfirmCreate}
            onCancel={handleCancelCreate}
            isLoading={isCreating}
            level={0}
          />
        )}
      </div>
    </div>
  );
}
