'use client';

/**
 * Story 9.1: Data Library Drawer Content
 * Story 9.7: Added GroupedAssetList for linkType grouping
 * Story 9.8: Added NodeTreeView for merged PBS+Task view
 */

import { useCallback, useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { AssetGrid } from '../AssetGrid';
import { AssetList } from '../AssetList';
import { AssetCard } from '../AssetCard';
import { FolderTreeView } from '../FolderTreeView';
import { GroupedAssetList } from '../GroupedAssetList';
import { OrganizationTabs, type OrganizationView } from '../OrganizationTabs';
import { AssetProvenance, DualSearch, NodeBreadcrumb, NodeTreeView, type SearchMode } from '../node-tree';
import { DataLibraryDndProvider } from '../dnd';
import { useAssetLinks } from '../../hooks/useAssetLinks';
import { useNodeTreeProjection } from '../../hooks/useNodeTreeProjection';
import { useSelectedNodesAssets } from '../../hooks/useSelectedNodesAssets';
import { NodeType, type DataAssetWithFolder, type TaskStatus } from '@cdm/types';
import type { ViewMode } from './types';
import { Badge, cn } from '@cdm/ui';
import { ChevronDown, ChevronRight, Download, Eye, EyeOff, Paperclip, Upload } from 'lucide-react';

export interface DataLibraryDrawerContentProps {
  showOrgPanel: boolean;

  orgView: OrganizationView;
  onOrgViewChange: (next: OrganizationView) => void;

  graphId: string;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;

  // Story 9.8: Merged node view state
  activeNodeId: string | null;
  onActiveNodeChange: (nodeId: string | null) => void;
  selectedNodeIds: Set<string>;
  onSelectedNodeIdsChange: (ids: Set<string>) => void;
  nodeExpandedIds: Set<string>;
  onToggleNodeExpand: (nodeId: string) => void;

  // Legacy PBS/Task props for backward compatibility
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

interface SelectedNodesGroupedAssetListProps {
  groupedAssets: ReturnType<typeof useSelectedNodesAssets>['groupedAssets'];
  onAssetPreview?: (asset: DataAssetWithFolder) => void;
  onAssetLink?: (asset: DataAssetWithFolder) => void;
  onAssetDelete?: (asset: DataAssetWithFolder) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onAssetSelectChange?: (asset: DataAssetWithFolder, selected: boolean) => void;
  onNodeClick?: (nodeId: string) => void;
}

type LinkTypeConfig = {
  type: 'input' | 'output' | 'reference';
  label: string;
  icon: typeof Download;
  headerClass: string;
};

const LINK_TYPE_CONFIGS: LinkTypeConfig[] = [
  {
    type: 'input',
    label: '输入',
    icon: Download,
    headerClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    type: 'output',
    label: '输出',
    icon: Upload,
    headerClass: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    type: 'reference',
    label: '参考',
    icon: Paperclip,
    headerClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

function SelectedNodesGroupedAssetList({
  groupedAssets,
  onAssetPreview,
  onAssetLink,
  onAssetDelete,
  selectable,
  selectedIds,
  onAssetSelectChange,
  onNodeClick,
}: SelectedNodesGroupedAssetListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<LinkTypeConfig['type']>>(new Set());
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);

  const toggleGroup = useCallback((type: LinkTypeConfig['type']) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          role="switch"
          aria-pressed={showEmptyGroups}
          aria-label={showEmptyGroups ? '隐藏空分组' : '显示空分组'}
          onClick={() => setShowEmptyGroups((prev) => !prev)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors',
            showEmptyGroups
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          )}
        >
          {showEmptyGroups ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          <span>{showEmptyGroups ? '隐藏空分组' : '显示空分组'}</span>
        </button>
      </div>

      {LINK_TYPE_CONFIGS.map((config) => {
        const assets = groupedAssets[config.type];
        const count = assets.length;
        const isCollapsed = collapsedGroups.has(config.type);
        const isEmpty = count === 0;

        if (isEmpty && !showEmptyGroups) return null;

        const Icon = config.icon;

        return (
          <div
            key={config.type}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleGroup(config.type)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 transition-colors',
                config.headerClass
              )}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              <Badge
                variant={count > 0 ? 'default' : 'secondary'}
                className="min-w-[24px] justify-center"
              >
                {count}
              </Badge>
            </button>

            {!isCollapsed && (
              <div className="p-4 bg-white dark:bg-gray-900">
                {isEmpty ? (
                  <div className="text-center text-sm text-gray-400 py-6">
                    暂无{config.label}资产
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {assets.map((item) => (
                      <div key={item.asset.id} className="flex flex-col gap-2">
                        <AssetCard
                          asset={item.asset}
                          onPreview={onAssetPreview ? () => onAssetPreview(item.asset) : undefined}
                          onLink={onAssetLink ? () => onAssetLink(item.asset) : undefined}
                          onDelete={onAssetDelete ? () => onAssetDelete(item.asset) : undefined}
                          selectable={selectable}
                          selected={!!selectedIds?.has(item.asset.id)}
                          onSelectChange={
                            onAssetSelectChange
                              ? (selected) => onAssetSelectChange(item.asset, selected)
                              : undefined
                          }
                        />
                        <AssetProvenance
                          assetId={item.asset.id}
                          sourceNodeIds={item.sourceNodeIds}
                          onNodeClick={onNodeClick}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DataLibraryDrawerContent({
  showOrgPanel,
  orgView,
  onOrgViewChange,
  graphId,
  searchQuery,
  onSearchQueryChange,
  searchMode,
  onSearchModeChange,
  // Story 9.8: Merged node view state
  activeNodeId,
  onActiveNodeChange,
  selectedNodeIds,
  onSelectedNodeIdsChange,
  nodeExpandedIds,
  onToggleNodeExpand,
  // Legacy props (still used for folder view compatibility)
  selectedPbsId: _selectedPbsId,
  onSelectPbs: _onSelectPbs,
  pbsExpandedIds: _pbsExpandedIds,
  onTogglePbsExpand: _onTogglePbsExpand,
  pbsIncludeSubNodes: _pbsIncludeSubNodes,
  onPbsIncludeSubNodesChange: _onPbsIncludeSubNodesChange,
  selectedTaskId: _selectedTaskId,
  onSelectTask: _onSelectTask,
  taskExpandedGroups: _taskExpandedGroups,
  onToggleTaskGroup: _onToggleTaskGroup,
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
  const isNodeView = orgView === 'node';
  const isNodeSearchMode = isNodeView && searchMode === 'node';
  const hasSelectedNodes = selectedNodeIds.size > 0;

  const { getNodeType } = useNodeTreeProjection();
  const handleNodeNavigate = useCallback(
    (nodeId: string) => {
      const nodeType = getNodeType(nodeId);
      if (nodeType === NodeType.PBS || nodeType === NodeType.TASK) {
        onActiveNodeChange(nodeId);
      }
    },
    [getNodeType, onActiveNodeChange]
  );

  // Story 9.8: Determine if we should use grouped view
  // Use grouped view when: Node view with active node selected and no multi-selection
  const shouldUseGroupedView = isNodeView && isNodeSearchMode && !!activeNodeId && !hasSelectedNodes;

  // Story 9.8: Get node ID for grouped view (use activeNodeId for merged view)
  const selectedNodeIdForLinks = shouldUseGroupedView ? activeNodeId : null;

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

  const selectedNodesAssets = useSelectedNodesAssets(selectedNodeIds);

  // Determine loading/error states for grouped view
  const groupedViewLoading = shouldUseGroupedView && linksLoading;
  const groupedViewError = shouldUseGroupedView ? linksError : null;

  // Render content for the right side panel
  const renderAssetContent = () => {
    if (isNodeView && isNodeSearchMode && hasSelectedNodes) {
      if (selectedNodesAssets.isLoading) {
        return (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-gray-300 animate-spin" />
          </div>
        );
      }

      if (selectedNodesAssets.error) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p className="text-sm font-medium">加载失败: {selectedNodesAssets.error}</p>
            <button
              onClick={() => selectedNodesAssets.refetch()}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              重试
            </button>
          </div>
        );
      }

      if (selectedNodesAssets.totalCount === 0) {
        return (
          <div className="text-center text-sm text-gray-400 py-10">
            所选节点暂无关联资产
          </div>
        );
      }

      return (
        <SelectedNodesGroupedAssetList
          groupedAssets={selectedNodesAssets.groupedAssets}
          onAssetPreview={onAssetPreview}
          onAssetLink={onAssetLink}
          onAssetDelete={onAssetDelete}
          selectable={selectable}
          selectedIds={selectedIds}
          onAssetSelectChange={onAssetSelectChange}
          onNodeClick={handleNodeNavigate}
        />
      );
    }

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

    // Story 9.8: Use grouped view for Node view with active node selected
    if (shouldUseGroupedView) {
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

    // Story 9.8: Node view in node-search mode with no active node selected
    if (isNodeView && isNodeSearchMode && !activeNodeId) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-medium">请选择一个节点查看关联资产</p>
        </div>
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
            {orgView === 'node' && (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <DualSearch
                    mode={searchMode}
                    onModeChange={onSearchModeChange}
                    query={searchQuery}
                    onQueryChange={onSearchQueryChange}
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <NodeTreeView
                    activeNodeId={activeNodeId}
                    onActiveNodeChange={onActiveNodeChange}
                    selectedNodeIds={selectedNodeIds}
                    onSelectedNodeIdsChange={onSelectedNodeIdsChange}
                    expandedIds={nodeExpandedIds}
                    onToggleExpand={onToggleNodeExpand}
                    searchQuery={isNodeSearchMode ? searchQuery : ''}
                  />
                </div>
              </div>
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
        {isNodeView && isNodeSearchMode && activeNodeId && (
          <div className="mb-4">
            <NodeBreadcrumb activeNodeId={activeNodeId} onNodeClick={handleNodeNavigate} />
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
