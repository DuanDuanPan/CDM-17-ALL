/**
 * Story 9.2: Folder Tree View Component
 * Displays folder tree structure with CRUD operations and drag-drop support
 * AC#3: View 3 allows folder creation, rename, delete
 * AC#4: Drag-drop to move assets into folders
 */

'use client';

import { useState, useCallback } from 'react';
import { Folder, FolderPlus, FolderTree } from 'lucide-react';
import { cn } from '@cdm/ui';
import { useDataFolders } from '../hooks/useDataFolders';
import { FolderTreeItem } from './folder-tree/FolderTreeItem';
import { NewFolderInput } from './folder-tree/NewFolderInput';

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
  /** Callback when an asset is dropped on a folder */
  onAssetDrop?: (assetId: string, folderId: string | null) => void;
}

/**
 * Folder Tree View - displays folder hierarchy with CRUD operations
 */
export function FolderTreeView({
  graphId,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  onAssetDrop,
}: FolderTreeViewProps) {
  const {
    folders,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    isCreating,
    deleteError,
  } = useDataFolders({ graphId });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(
    undefined
  );
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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
    async (id: string) => {
      if (window.confirm('确定要删除此文件夹吗？')) {
        try {
          await deleteFolder(id);
          if (selectedId === id) {
            onSelect(null);
          }
        } catch {
          // Error is displayed via deleteError
        }
      }
    },
    [deleteFolder, selectedId, onSelect]
  );

  // Handle drop on folder
  const handleDrop = useCallback(
    (e: React.DragEvent, folderId: string | null) => {
      e.preventDefault();
      setDropTargetId(null);

      const assetId = e.dataTransfer.getData('text/plain');
      if (assetId && onAssetDrop) {
        onAssetDrop(assetId, folderId);
      }
    },
    [onAssetDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((folderId: string | null) => {
    setDropTargetId(folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

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
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          onClick={() => handleStartCreate()}
        >
          <FolderPlus className="w-4 h-4" />
          新建文件夹
        </button>
      </div>
    );
  }

  return (
    <div data-testid="folder-tree" className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500">文件夹</span>
        <button
          type="button"
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          onClick={() => handleStartCreate()}
          title="新建文件夹"
          disabled={isCreating}
        >
          <FolderPlus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Delete error toast */}
      {deleteError && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs">
          {deleteError}
        </div>
      )}

      {/* Root drop zone */}
      <div
        className={cn(
          'px-3 py-2 cursor-pointer transition-colors duration-150',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          selectedId === null && 'bg-blue-50 dark:bg-blue-900/30',
          dropTargetId === 'root' && 'ring-2 ring-blue-400 ring-inset'
        )}
        onClick={() => onSelect(null)}
        onDrop={(e) => handleDrop(e, null)}
        onDragOver={handleDragOver}
        onDragEnter={() => handleDragEnter('root')}
        onDragLeave={handleDragLeave}
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
            dropTargetId={dropTargetId}
            onSelect={onSelect}
            onToggle={onToggleExpand}
            onStartRename={handleStartRename}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
            onDelete={handleDelete}
            onStartCreate={handleStartCreate}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
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
