'use client';

/**
 * Story 9.2: Folder Tree Item Component
 * Migrated to @dnd-kit useDroppable for high-fidelity drag preview support
 */

import { useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, Button } from '@cdm/ui';
import type { DataFolderTreeNode } from '@cdm/types';
import { NewFolderInput } from './NewFolderInput';
import type { FolderDropData } from '../dnd';

interface FolderTreeItemProps {
  folder: DataFolderTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  editingId: string | null;
  isCreatingNew: boolean;
  newFolderParentId?: string;
  onConfirmCreate: (name: string) => void;
  onCancelCreate: () => void;
  isCreating: boolean;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  onStartRename: (id: string) => void;
  onConfirmRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
  onStartCreate: (parentId: string) => void;
  level: number;
}

export function FolderTreeItem({
  folder,
  selectedId,
  expandedIds,
  editingId,
  isCreatingNew,
  newFolderParentId,
  onConfirmCreate,
  onCancelCreate,
  isCreating,
  onSelect,
  onToggle,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
  onStartCreate,
  level,
}: FolderTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const isEditing = editingId === folder.id;
  const isCreatingChildHere = isCreatingNew && newFolderParentId === folder.id;
  const assetCount = folder.assetCount ?? 0;
  const canDelete = !hasChildren && assetCount === 0;

  // @dnd-kit droppable setup
  const dropData: FolderDropData = {
    type: 'folder',
    folderId: folder.id,
  };

  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: dropData,
  });

  const handleClick = () => {
    if (!isEditing) {
      onSelect(isSelected ? null : folder.id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(folder.id);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div>
      <div
        ref={setNodeRef}
        data-testid={`folder-tree-node-${folder.id}`}
        className={cn(
          'group flex items-center gap-1 h-8 px-2 cursor-pointer rounded transition-colors duration-150',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
          isOver && 'ring-2 ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-900/30'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-4 h-4 p-0 text-gray-400 hover:text-gray-600"
            onClick={handleToggle}
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        ) : (
          <span className="w-4" />
        )}

        <FolderIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />

        {isEditing ? (
          <EditInput
            defaultValue={folder.name}
            onConfirm={(name) => {
              const nextName = name.trim();
              if (!nextName || nextName === folder.name) {
                onCancelRename();
                return;
              }
              onConfirmRename(folder.id, nextName);
            }}
            onCancel={onCancelRename}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm truncate">{folder.name}</span>
            {assetCount > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 flex-shrink-0">
                {assetCount}
              </span>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-6 h-6 p-0',
                'opacity-0 group-hover:opacity-100',
                showMenu && 'opacity-100'
              )}
              onClick={handleMenuToggle}
              aria-label="更多操作"
              data-testid={`folder-tree-menu-${folder.id}`}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </Button>

            {showMenu && (
              <FolderContextMenu
                onRename={() => {
                  setShowMenu(false);
                  onStartRename(folder.id);
                }}
                onDelete={() => {
                  setShowMenu(false);
                  if (!canDelete) {
                    if (hasChildren) {
                      toast.error('无法删除：文件夹包含子文件夹，请先删除子文件夹');
                    } else {
                      toast.error(`无法删除：文件夹非空（包含 ${assetCount} 个资产），请先移出资产`);
                    }
                    return;
                  }
                  // 使用 requestAnimationFrame 确保菜单关闭后再触发确认框
                  // 避免菜单遮罩层与确认框的 z-index 竞争
                  requestAnimationFrame(() => {
                    onDelete(folder.id);
                  });
                }}
                onCreateSub={() => {
                  setShowMenu(false);
                  onStartCreate(folder.id);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div data-testid={`folder-tree-children-${folder.id}`}>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              editingId={editingId}
              isCreatingNew={isCreatingNew}
              newFolderParentId={newFolderParentId}
              onConfirmCreate={onConfirmCreate}
              onCancelCreate={onCancelCreate}
              isCreating={isCreating}
              onSelect={onSelect}
              onToggle={onToggle}
              onStartRename={onStartRename}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              onDelete={onDelete}
              onStartCreate={onStartCreate}
              level={level + 1}
            />
          ))}

          {isCreatingChildHere && (
            <NewFolderInput
              onConfirm={onConfirmCreate}
              onCancel={onCancelCreate}
              isLoading={isCreating}
              level={level + 1}
            />
          )}
        </div>
      )}

      {!hasChildren && isCreatingChildHere && (
        <NewFolderInput
          onConfirm={onConfirmCreate}
          onCancel={onCancelCreate}
          isLoading={isCreating}
          level={level + 1}
        />
      )}
    </div>
  );
}

interface FolderContextMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onCreateSub: () => void;
  onClose: () => void;
}

function FolderContextMenu({
  onRename,
  onDelete,
  onCreateSub,
  onClose,
}: FolderContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0" style={{ zIndex: 10 }} onClick={onClose} />

      <div
        className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl py-1 min-w-[160px] w-max whitespace-nowrap"
        style={{ zIndex: 20 }}
      >
        {/* Context menu items use native button - Button component base styles conflict with menu layout */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onCreateSub}
        >
          <FolderPlus className="w-4 h-4" />
          新建子文件夹
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onRename}
        >
          <Edit2 className="w-4 h-4" />
          重命名
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      </div>
    </>
  );
}

interface EditInputProps {
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function EditInput({ defaultValue, onConfirm, onCancel }: EditInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canceledRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(inputRef.current?.value ?? defaultValue);
    } else if (e.key === 'Escape') {
      canceledRef.current = true;
      onCancel();
    }
  };

  const handleBlur = () => {
    if (canceledRef.current) return;
    onConfirm(inputRef.current?.value ?? defaultValue);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={defaultValue}
      className="flex-1 text-sm px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-800"
      autoFocus
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
