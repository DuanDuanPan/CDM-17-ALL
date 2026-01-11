'use client';

import { FolderOpen, Loader2 } from 'lucide-react';
import { AssetGrid } from '../AssetGrid';
import { AssetList } from '../AssetList';
import { FolderTreeView } from '../FolderTreeView';
import { OrganizationTabs, type OrganizationView } from '../OrganizationTabs';
import { PbsTreeView } from '../PbsTreeView';
import { TaskGroupView } from '../TaskGroupView';
import { DataLibraryDndProvider } from '../dnd';
import type { DataAssetWithFolder, TaskStatus } from '@cdm/types';
import type { ViewMode } from './types';

export interface DataLibraryDrawerContentProps {
  showOrgPanel: boolean;

  orgView: OrganizationView;
  onOrgViewChange: (next: OrganizationView) => void;

  graphId: string;

  selectedPbsId: string | null;
  onSelectPbs: (next: string | null) => void;
  pbsExpandedIds: Set<string>;
  onTogglePbsExpand: (nodeId: string) => void;
  pbsIncludeSubNodes: boolean;
  onPbsIncludeSubNodesChange: (next: boolean) => void;

  selectedTaskId: string | null;
  onSelectTask: (next: string | null) => void;
  taskExpandedGroups: Set<TaskStatus>;
  onToggleTaskGroup: (status: TaskStatus) => void;

  selectedFolderId: string | null;
  onSelectFolder: (next: string | null) => void;
  folderExpandedIds: Set<string>;
  onToggleFolderExpand: (folderId: string) => void;
  onAssetDrop: (assetId: string, folderId: string | null) => void;

  isLoading: boolean;
  error: string | null;
  onRetry: () => void;

  visibleAssets: DataAssetWithFolder[];
  emptyStateMessage: string;

  viewMode: ViewMode;
  draggableAssets: boolean;

  /** Story 9.3: Preview callback for 3D models */
  onAssetPreview?: (asset: DataAssetWithFolder) => void;
}

export function DataLibraryDrawerContent({
  showOrgPanel,
  orgView,
  onOrgViewChange,
  graphId,
  selectedPbsId,
  onSelectPbs,
  pbsExpandedIds,
  onTogglePbsExpand,
  pbsIncludeSubNodes,
  onPbsIncludeSubNodesChange,
  selectedTaskId,
  onSelectTask,
  taskExpandedGroups,
  onToggleTaskGroup,
  selectedFolderId,
  onSelectFolder,
  folderExpandedIds,
  onToggleFolderExpand,
  onAssetDrop,
  isLoading,
  error,
  onRetry,
  visibleAssets,
  emptyStateMessage,
  viewMode,
  draggableAssets,
  onAssetPreview,
}: DataLibraryDrawerContentProps) {
  const content = (
    <div className="flex-1 min-h-0 flex">
      {showOrgPanel && (
        <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col">
          <OrganizationTabs activeView={orgView} onViewChange={onOrgViewChange} />

          <div className="flex-1 min-h-0 overflow-hidden">
            {orgView === 'pbs' && (
              <PbsTreeView
                selectedId={selectedPbsId}
                onSelect={onSelectPbs}
                expandedIds={pbsExpandedIds}
                onToggleExpand={onTogglePbsExpand}
                includeSubNodes={pbsIncludeSubNodes}
                onIncludeSubNodesChange={onPbsIncludeSubNodesChange}
              />
            )}
            {orgView === 'task' && (
              <TaskGroupView
                selectedId={selectedTaskId}
                onSelect={onSelectTask}
                expandedGroups={taskExpandedGroups}
                onToggleGroup={onToggleTaskGroup}
              />
            )}
            {orgView === 'folder' && (
              <FolderTreeView
                graphId={graphId}
                selectedId={selectedFolderId}
                onSelect={onSelectFolder}
                expandedIds={folderExpandedIds}
                onToggleExpand={onToggleFolderExpand}
              />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p className="text-sm font-medium">加载失败: {error}</p>
            <button
              onClick={() => onRetry()}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              重试
            </button>
          </div>
        ) : visibleAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">{emptyStateMessage}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <AssetGrid assets={visibleAssets} draggable={draggableAssets} onAssetPreview={onAssetPreview} />
        ) : (
          <AssetList assets={visibleAssets} draggable={draggableAssets} onAssetPreview={onAssetPreview} />
        )}
      </div>
    </div>
  );

  // Wrap with DnD provider when draggable assets are enabled (folder view)
  if (draggableAssets) {
    return (
      <DataLibraryDndProvider assets={visibleAssets} onAssetDrop={onAssetDrop}>
        {content}
      </DataLibraryDndProvider>
    );
  }

  return content;
}
