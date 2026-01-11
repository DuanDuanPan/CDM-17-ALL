/**
 * Story 9.2: FolderTreeItem Component Tests
 * Updated for @dnd-kit migration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { toast } from 'sonner';
import { FolderTreeItem } from '../folder-tree/FolderTreeItem';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Wrapper with DndContext for @dnd-kit hooks
function DndWrapper({ children }: { children: React.ReactNode }) {
  return <DndContext>{children}</DndContext>;
}

describe('FolderTreeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks deleting non-empty folder and shows a toast', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DndWrapper>
        <FolderTreeItem
          folder={{
            id: 'folder-1',
            name: '结构设计',
            description: null,
            parentId: null,
            graphId: 'graph-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            children: [],
            assetCount: 2,
          }}
          selectedId={null}
          expandedIds={new Set()}
          editingId={null}
          isCreatingNew={false}
          newFolderParentId={undefined}
          onConfirmCreate={vi.fn()}
          onCancelCreate={vi.fn()}
          isCreating={false}
          onSelect={vi.fn()}
          onToggle={vi.fn()}
          onStartRename={vi.fn()}
          onConfirmRename={vi.fn()}
          onCancelRename={vi.fn()}
          onDelete={onDelete}
          onStartCreate={vi.fn()}
          level={0}
        />
      </DndWrapper>
    );

    await user.click(screen.getByTestId('folder-tree-menu-folder-1'));
    await user.click(screen.getByRole('button', { name: '删除' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('allows deleting empty folder and calls onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DndWrapper>
        <FolderTreeItem
          folder={{
            id: 'folder-2',
            name: '空文件夹',
            description: null,
            parentId: null,
            graphId: 'graph-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
            children: [],
            assetCount: 0,
          }}
          selectedId={null}
          expandedIds={new Set()}
          editingId={null}
          isCreatingNew={false}
          newFolderParentId={undefined}
          onConfirmCreate={vi.fn()}
          onCancelCreate={vi.fn()}
          isCreating={false}
          onSelect={vi.fn()}
          onToggle={vi.fn()}
          onStartRename={vi.fn()}
          onConfirmRename={vi.fn()}
          onCancelRename={vi.fn()}
          onDelete={onDelete}
          onStartCreate={vi.fn()}
          level={0}
        />
      </DndWrapper>
    );

    await user.click(screen.getByTestId('folder-tree-menu-folder-2'));
    await user.click(screen.getByRole('button', { name: '删除' }));

    // Delete is triggered in requestAnimationFrame to avoid z-index competition with the menu overlay.
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    expect(onDelete).toHaveBeenCalledWith('folder-2');
  });
});
