'use client';

/**
 * Story 9.1: Data Library Drawer Content
 * Story 9.7: Added GroupedAssetList for linkType grouping
 */

import { FolderOpen, Loader2 } from 'lucide-react';
import { AssetGrid } from '../AssetGrid';
import { AssetList } from '../AssetList';
import { FolderTreeView } from '../FolderTreeView';
import { GroupedAssetList } from '../GroupedAssetList';
import { OrganizationTabs, type OrganizationView } from '../OrganizationTabs';
import { PbsTreeView } from '../PbsTreeView';
import { TaskGroupView } from '../TaskGroupView';
import { DataLibraryDndProvider } from '../dnd';
import { useAssetLinks } from '../../hooks/useAssetLinks';
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
  /** Story 9.5: Link-to-node callback */
  onAssetLink?: (asset: DataAssetWithFolder) => void;
  /** Story 9.8: Delete callback */
  onAssetDelete?: (asset: DataAssetWithFolder) => void;
  /** Story 9.8: Selection support */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onAssetSelectChange?: (asset: DataAssetWithFolder, selected: boolean) => void;
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
  onAssetLink,
  onAssetDelete,
  selectable,
  selectedIds,
  onAssetSelectChange,
}: DataLibraryDrawerContentProps) {
  // Story 9.7: Determine if we should use grouped view
  // Use grouped view when: PBS view with node selected (no sub-nodes) OR Task view with node selected
  const shouldUseGroupedView =
    (orgView === 'pbs' && !!selectedPbsId && !pbsIncludeSubNodes) ||
    (orgView === 'task' && !!selectedTaskId);

  // Story 9.7: Get node ID for grouped view
  const selectedNodeIdForLinks =
    orgView === 'pbs' ? selectedPbsId :
      orgView === 'task' ? selectedTaskId : null;

  // Story 9.7: Fetch links with linkType for grouped view
  const {
    links,
    isLoading: linksLoading,
    error: linksError,
    refetch: refetchLinks,
  } = useAssetLinks({
    nodeId: selectedNodeIdForLinks ?? '', // Empty string is unused - hook disabled when null
    enabled: shouldUseGroupedView && !!selectedNodeIdForLinks,
  });

  // Determine loading/error states for grouped view
  const groupedViewLoading = shouldUseGroupedView && linksLoading;
  const groupedViewError = shouldUseGroupedView ? linksError : null;

  // Render content for the right side panel
  const renderAssetContent = () => {
    // Handle grouped view loading/error states
    const currentLoading = shouldUseGroupedView ? groupedViewLoading : isLoading;
    const currentError = shouldUseGroupedView ? groupedViewError : error;
    const retryFn = shouldUseGroupedView ? refetchLinks : onRetry;

    if (currentLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
        </div>
      );
    }

    if (currentError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <p className="text-sm font-medium">加载失败: {currentError}</p>
          <button
            onClick={() => retryFn()}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            重试
          </button>
        </div>
      );
    }

    // Story 9.7: Use grouped view for PBS/Task with selected node
    if (shouldUseGroupedView) {
      // Show message when include-sub-nodes is enabled on PBS view
      // (This case is handled by not showing grouped view, but we add a note)
      return (
        <GroupedAssetList
          links={links}
          onAssetPreview={onAssetPreview}
          onAssetLink={onAssetLink}
          onAssetDelete={onAssetDelete}
          selectable={selectable}
          selectedIds={selectedIds}
          onAssetSelectChange={onAssetSelectChange}
        />
      );
    }

    // Default flat view
    if (visibleAssets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-medium">{emptyStateMessage}</p>
        </div>
      );
    }

    return viewMode === 'grid' ? (
      <AssetGrid
        assets={visibleAssets}
        draggable={draggableAssets}
        onAssetPreview={onAssetPreview}
        onAssetLink={onAssetLink}
        onAssetDelete={onAssetDelete}
        selectable={selectable}
        selectedIds={selectedIds}
        onAssetSelectChange={onAssetSelectChange}
      />
    ) : (
      <AssetList
        assets={visibleAssets}
        draggable={draggableAssets}
        onAssetPreview={onAssetPreview}
        onAssetLink={onAssetLink}
        onAssetDelete={onAssetDelete}
        selectable={selectable}
        selectedIds={selectedIds}
        onAssetSelectChange={onAssetSelectChange}
      />
    );
  };

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
        {/* Story 9.7 AC1: Add "Include Sub-nodes: Grouping disabled" hint for PBS view */}
        {orgView === 'pbs' && selectedPbsId && pbsIncludeSubNodes && (
          <div
            className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded-md"
            data-testid="include-subnodes-hint"
          >
            包含子节点：分组已关闭
          </div>
        )}
        {renderAssetContent()}
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
