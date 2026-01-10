'use client';

import { useState, useRef } from 'react';
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
import { cn } from '@cdm/ui';
import type { DataFolderTreeNode } from '@cdm/types';

interface FolderTreeItemProps {
  folder: DataFolderTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  editingId: string | null;
  dropTargetId: string | null;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  onStartRename: (id: string) => void;
  onConfirmRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
  onStartCreate: (parentId: string) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onDragEnter: (folderId: string | null) => void;
  onDragLeave: () => void;
  level: number;
}

export function FolderTreeItem({
  folder,
  selectedId,
  expandedIds,
  editingId,
  dropTargetId,
  onSelect,
  onToggle,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
  onStartCreate,
  onDrop,
  onDragEnter,
  onDragLeave,
  level,
}: FolderTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const isEditing = editingId === folder.id;
  const isDropTarget = dropTargetId === folder.id;

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
        data-testid={`folder-tree-node-${folder.id}`}
        className={cn(
          'group flex items-center gap-1 h-8 px-2 cursor-pointer rounded transition-colors duration-150',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
          isDropTarget && 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onDrop={(e) => onDrop(e, folder.id)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => onDragEnter(folder.id)}
        onDragLeave={onDragLeave}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            onClick={handleToggle}
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
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
          <span className="text-sm truncate flex-1">{folder.name}</span>
        )}

        {!isEditing && (
          <div className="relative">
            <button
              type="button"
              className={cn(
                'w-6 h-6 flex items-center justify-center rounded',
                'opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700',
                showMenu && 'opacity-100'
              )}
              onClick={handleMenuToggle}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <FolderContextMenu
                onRename={() => {
                  setShowMenu(false);
                  onStartRename(folder.id);
                }}
                onDelete={() => {
                  setShowMenu(false);
                  onDelete(folder.id);
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
              dropTargetId={dropTargetId}
              onSelect={onSelect}
              onToggle={onToggle}
              onStartRename={onStartRename}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              onDelete={onDelete}
              onStartCreate={onStartCreate}
              onDrop={onDrop}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              level={level + 1}
            />
          ))}
        </div>
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
      <div className="fixed inset-0 z-10" onClick={onClose} />

      <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl py-1 min-w-[160px] w-max whitespace-nowrap">
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

