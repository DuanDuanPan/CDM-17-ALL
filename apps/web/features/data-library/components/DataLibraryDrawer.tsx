'use client';

/**
 * Story 9.1: Data Library Drawer Component
 * Story 9.2: Multi-Dimensional Organization Views
 * Story 9.9: Toolbar Redesign with separated AssetFilterBar
 * 
 * AC1: Toolbar精简 - 只保留操作类控件
 * AC2: Asset Filter Bar - 独立的资产筛选栏
 * AC3: Scope Selector - 搜索范围选择器
 * AC4: Filter State Behavior - 筛选状态行为
 * AC5: Node Search Enhancement - 节点搜索增强
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useOrganizationView } from './OrganizationTabs';
import { DataLibraryDrawerView } from './data-library-drawer/DataLibraryDrawerView';
import { filterAssets } from './data-library-drawer/filterAssets';
import { getDataLibraryEmptyStateMessage } from './data-library-drawer/emptyState';
import { useDrawerResize } from './data-library-drawer/useDrawerResize';
import { LinkAssetDialog } from './LinkAssetDialog';
import { useDataAssets } from '../hooks/useDataAssets';
import { useDataFolders } from '../hooks/useDataFolders';
import { useAssetPreview } from '../hooks/useAssetPreview';
import { useDataLibraryDrawerOrgState } from '../hooks/useDataLibraryDrawerOrgState';
import { useContextAwareUpload } from '../hooks/useContextAwareUpload';
import { useAssetDelete } from '../hooks/useAssetDelete';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useNodeTreeProjection } from '../hooks/useNodeTreeProjection';
import { useNodeAssetUnlink } from '../hooks/useNodeAssetUnlink';
import { useAssetFilterState } from '../hooks/useAssetFilterState';
import type { DataAssetFormat, DataAssetWithFolder } from '@cdm/types';
import type { ViewMode } from './data-library-drawer/types';
import { TrashDrawer } from './TrashDrawer';

// Story 9.3: Lazy load ModelViewerModal to avoid SSR issues with Online3DViewer
const ModelViewerModal = dynamic(
  () => import('@/features/industrial-viewer').then((mod) => mod.ModelViewerModal),
  { ssr: false }
);

// Story 9.4: Lazy load ContourViewerModal for VTK.js
const ContourViewerModal = dynamic(
  () => import('@/features/industrial-viewer').then((mod) => mod.ContourViewerModal),
  { ssr: false }
);

interface DataLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
}

/**
 * Data Library Drawer Component
 * Story 9.9: Redesigned with separated toolbar and filter bar
 */
export function DataLibraryDrawer({
  isOpen,
  onClose,
  graphId,
}: DataLibraryDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Story 9.9: Use new asset filter state hook (AC4)
  const assetFilter = useAssetFilterState();

  // Story 9.9: Legacy search state for node search (AC5 - kept separate)
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');

  const { drawerWidth, isResizing, handleResizeStart } = useDrawerResize();

  // Story 9.2: Organization view state with persistence
  const [orgView, setOrgView] = useOrganizationView(graphId);
  const [showOrgPanel, setShowOrgPanel] = useState(true);

  // Track previous orgView for AC4 (filter reset on view change)
  const prevOrgViewRef = useRef(orgView);

  const {
    selectedPbsId,
    setSelectedPbsId,
    selectedTaskId,
    setSelectedTaskId,
    selectedFolderId,
    setSelectedFolderId,
    pbsIncludeSubNodes,
    setPbsIncludeSubNodes,
    pbsExpandedIds,
    togglePbsExpand,
    taskExpandedGroups,
    toggleTaskGroup,
    folderExpandedIds,
    toggleFolderExpand,
    nodeExpandedIds,
    toggleNodeExpand,
  } = useDataLibraryDrawerOrgState(graphId);

  // Story 9.4: Preview state using useAssetPreview hook
  const { previewAsset, previewType, handleAssetPreview, handleClosePreview } = useAssetPreview();

  // Story 9.7: Context-aware upload configuration
  // Story 9.8: Updated for merged node view with active node from legacy state
  const activeNodeId = selectedPbsId ?? selectedTaskId;
  const { getNodeType } = useNodeTreeProjection();
  const activeNodeType = activeNodeId ? getNodeType(activeNodeId) : null;
  const uploadConfig = useContextAwareUpload({
    orgView,
    activeNodeId,
    activeNodeType,
    selectedFolderId,
    // Legacy props for backward compatibility
    selectedPbsId,
    selectedTaskId,
  });

  // Story 9.8: Node view multi-selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const handleActiveNodeChange = useCallback((nodeId: string | null) => {
    // When active node changes in the merged view, update appropriate legacy state
    if (nodeId) {
      // For now, treat all as PBS-like selection (backward compatibility)
      setSelectedPbsId(nodeId);
      setSelectedTaskId(null);
    } else {
      setSelectedPbsId(null);
      setSelectedTaskId(null);
    }
  }, [setSelectedPbsId, setSelectedTaskId]);

  const handleSelectedNodeIdsChange = useCallback((ids: Set<string>) => {
    setSelectedNodeIds(ids);
  }, []);

  // Story 9.5: Link-to-node dialog state
  const [linkingAsset, setLinkingAsset] = useState<DataAssetWithFolder | null>(null);

  // Story 9.8: Trash drawer state
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Story 9.8: Batch selection + delete hooks
  const selection = useAssetSelection();
  const assetDelete = useAssetDelete(graphId);
  const nodeAssetUnlink = useNodeAssetUnlink();

  // Story 9.2: Folder operations hook
  const { moveAsset, isMovingAsset } = useDataFolders({ graphId, enabled: isOpen });

  // Story 9.9: AC4 - Reset filters when org view changes (node <-> folder)
  useEffect(() => {
    if (prevOrgViewRef.current !== orgView) {
      assetFilter.resetOnViewChange();
      toast.info('筛选已重置');
      prevOrgViewRef.current = orgView;
    }
  }, [orgView, assetFilter]);

  // Story 9.9: Determine data source based on searchScope (AC3)
  const isFolderView = orgView === 'folder';
  const isNodeView = orgView === 'node';
  const searchScope = assetFilter.filterState.searchScope;
  const assetSearchQuery = assetFilter.filterState.assetSearchQuery;

  const disableCurrentNodeScope = isNodeView && !activeNodeId && selectedNodeIds.size === 0;

  // Should fetch global assets when:
  // - In folder view
  // - In node view with scope = 'all' or 'unlinked'
  const shouldFetchGlobalAssets =
    isFolderView ||
    (isNodeView && (searchScope === 'all' || searchScope === 'unlinked'));

  // Data fetching hook
  const {
    assets,
    isLoading,
    error,
    refetch,
  } = useDataAssets({
    graphId,
    search: shouldFetchGlobalAssets ? assetSearchQuery : undefined,
    format: shouldFetchGlobalAssets ? (assetFilter.filterState.formatFilter as DataAssetFormat || undefined) : undefined,
    folderId: isFolderView && selectedFolderId ? selectedFolderId : undefined,
    createdAfter: shouldFetchGlobalAssets ? (assetFilter.filterState.createdAfter || undefined) : undefined,
    createdBefore: shouldFetchGlobalAssets ? (assetFilter.filterState.createdBefore || undefined) : undefined,
    linkStatus: isNodeView && searchScope === 'unlinked' ? 'unlinked' : undefined,
    enabled: isOpen && shouldFetchGlobalAssets,
  });

  const baseAssets = shouldFetchGlobalAssets ? assets : [];

  const visibleAssets = filterAssets(baseAssets, {
    search: shouldFetchGlobalAssets ? assetSearchQuery : '',
    format: shouldFetchGlobalAssets ? assetFilter.filterState.formatFilter : '',
    createdAfter: shouldFetchGlobalAssets ? assetFilter.filterState.createdAfter : '',
    createdBefore: shouldFetchGlobalAssets ? assetFilter.filterState.createdBefore : '',
  });

  // Story 9.2: Handle asset drop to folder
  const handleAssetDrop = useCallback(
    async (assetId: string, folderId: string | null) => {
      try {
        await moveAsset(assetId, folderId);
        refetch();
        toast.success(folderId ? '已移动到文件夹' : '已移出文件夹');
      } catch (err) {
        const message = err instanceof Error ? err.message : '移动失败';
        toast.error(message);
      }
    },
    [moveAsset, refetch]
  );

  // Story 9.5: Handle asset link button click
  const handleAssetLink = useCallback((asset: DataAssetWithFolder) => {
    setLinkingAsset(asset);
  }, []);

  // Story 9.5: Handle successful link creation
  const handleLinkSuccess = useCallback(() => {
    setLinkingAsset(null);
    toast.success('已关联到节点');
  }, []);

  // Mount effect for portal
  useEffect(() => setMounted(true), []);

  // Refetch on open
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  // Close nested trash drawer when parent closes
  useEffect(() => {
    if (!isOpen) setIsTrashOpen(false);
  }, [isOpen]);

  // AC#2: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAssetSelectChange = useCallback(
    (asset: DataAssetWithFolder, selected: boolean) => {
      selection.setSelected(asset.id, selected);
    },
    [selection.setSelected]
  );

  const handleAssetDelete = useCallback(
    (asset: DataAssetWithFolder) => {
      if (orgView === 'node') {
        if (!activeNodeId) {
          toast.error('请先选择一个节点');
          return;
        }

        const nodeIds = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [activeNodeId];

        void nodeAssetUnlink
          .batchUnlink({ nodeIds, assetIds: [asset.id] })
          .then(() => selection.remove([asset.id]))
          .catch(() => {
            // Error toast is handled inside hook
          });

        return;
      }

      assetDelete.confirmSoftDelete(asset, {
        onSuccess: () => selection.remove([asset.id]),
      });
    },
    [activeNodeId, assetDelete, nodeAssetUnlink, orgView, selectedNodeIds, selection.remove]
  );

  // Story 9.9: AC6 - Batch delete uses unlink in node view
  const handleBatchDelete = useCallback(() => {
    if (selection.selectedIdList.length === 0) return;

    if (orgView === 'node') {
      if (!activeNodeId) {
        toast.error('请先选择一个节点');
        return;
      }

      const nodeIds = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [activeNodeId];

      void nodeAssetUnlink
        .batchUnlink({ nodeIds, assetIds: selection.selectedIdList })
        .then(() => selection.clearSelection())
        .catch(() => {
          // Error toast is handled inside hook
        });

      return;
    }

    assetDelete.confirmSoftDeleteBatch(selection.selectedIdList, {
      onSuccess: selection.clearSelection,
    });
  }, [activeNodeId, assetDelete, nodeAssetUnlink, orgView, selectedNodeIds, selection.selectedIdList, selection.clearSelection]);

  // Story 9.9: Handle date range change
  const handleDateRangeChange = useCallback((after: string, before: string) => {
    assetFilter.setDateRange(after, before);
  }, [assetFilter]);

  if (!isOpen || !mounted) return null;

  const hasAssetFilters =
    !!assetSearchQuery ||
    !!assetFilter.filterState.formatFilter ||
    !!assetFilter.filterState.createdAfter ||
    !!assetFilter.filterState.createdBefore;

  const emptyStateMessage =
    hasAssetFilters && shouldFetchGlobalAssets
      ? '无匹配资产'
      : isFolderView
        ? getDataLibraryEmptyStateMessage({ orgView, activeNodeId, selectedPbsId, selectedTaskId, selectedFolderId })
        : isNodeView && searchScope === 'unlinked'
          ? '暂无未关联资产'
          : isNodeView && searchScope === 'all'
            ? '暂无数据资产'
            : getDataLibraryEmptyStateMessage({ orgView, activeNodeId, selectedPbsId, selectedTaskId, selectedFolderId });

  return (
    <>
      <DataLibraryDrawerView
        drawerWidth={drawerWidth}
        isResizing={isResizing}
        onResizeStart={handleResizeStart}
        onClose={onClose}

        // Story 9.9: Asset filter bar props (AC2)
        assetSearchQuery={assetFilter.filterState.assetSearchQuery}
        onAssetSearchQueryChange={assetFilter.setAssetSearchQuery}
        searchScope={assetFilter.filterState.searchScope}
        onSearchScopeChange={assetFilter.setSearchScope}
        formatFilter={assetFilter.filterState.formatFilter as DataAssetFormat | ''}
        onFormatFilterChange={assetFilter.setFormatFilter}
        createdAfter={assetFilter.filterState.createdAfter}
        createdBefore={assetFilter.filterState.createdBefore}
        onDateRangeChange={handleDateRangeChange}
        activeFilterCount={assetFilter.activeFilterCount}
        onClearFilters={assetFilter.clearAllFilters}
        isFolderView={isFolderView}
        disableCurrentNodeScope={disableCurrentNodeScope}

        // Toolbar props (AC1 - simplified)
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showOrgPanel={showOrgPanel}
        onToggleOrgPanel={() => setShowOrgPanel((prev) => !prev)}

        // Content props
        orgView={orgView}
        onOrgViewChange={setOrgView}
        graphId={graphId}

        // Story 9.9: Node search stays separate (AC5)
        searchQuery={nodeSearchQuery}
        onSearchQueryChange={setNodeSearchQuery}
        searchMode="node" // Always node mode now
        onSearchModeChange={() => { }} // No-op, mode is fixed

        // Story 9.8: New node view props
        activeNodeId={activeNodeId}
        onActiveNodeChange={handleActiveNodeChange}
        selectedNodeIds={selectedNodeIds}
        onSelectedNodeIdsChange={handleSelectedNodeIdsChange}
        nodeExpandedIds={nodeExpandedIds}
        onToggleNodeExpand={toggleNodeExpand}

        // Legacy props for backward compatibility
        selectedPbsId={selectedPbsId}
        onSelectPbs={setSelectedPbsId}
        pbsExpandedIds={pbsExpandedIds}
        onTogglePbsExpand={togglePbsExpand}
        pbsIncludeSubNodes={pbsIncludeSubNodes}
        onPbsIncludeSubNodesChange={setPbsIncludeSubNodes}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        taskExpandedGroups={taskExpandedGroups}
        onToggleTaskGroup={toggleTaskGroup}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        folderExpandedIds={folderExpandedIds}
        onToggleFolderExpand={toggleFolderExpand}
        onAssetDrop={handleAssetDrop}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        visibleAssets={visibleAssets}
        baseAssetCount={baseAssets.length}
        emptyStateMessage={emptyStateMessage}
        isMovingAsset={isMovingAsset}
        draggableAssets={orgView === 'folder'}
        onAssetPreview={handleAssetPreview}
        onAssetLink={handleAssetLink}
        onAssetDelete={handleAssetDelete}
        selectable
        selectedIds={selection.selectedIds}
        onAssetSelectChange={handleAssetSelectChange}
        uploadConfig={uploadConfig}
        onUploadSuccess={refetch}
        selectedCount={selection.selectedCount}
        onBatchDelete={handleBatchDelete}
        onOpenTrash={() => setIsTrashOpen(true)}
      />

      {/* Story 9.5: Link-to-node dialog */}
      {linkingAsset && (
        <LinkAssetDialog
          assetId={linkingAsset.id}
          assetName={linkingAsset.name}
          onClose={() => setLinkingAsset(null)}
          onSuccess={handleLinkSuccess}
        />
      )}

      <TrashDrawer
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        graphId={graphId}
      />

      {/* Story 9.3/9.4: Preview modals based on asset type */}
      {previewAsset && previewAsset.storagePath && previewType === 'model' && (
        <ModelViewerModal
          isOpen={!!previewAsset}
          onClose={handleClosePreview}
          assetUrl={previewAsset.storagePath}
          assetName={previewAsset.name}
        />
      )}

      {/* Story 9.4: Contour preview modal for VTK/JSON scalar field */}
      {previewAsset && previewAsset.storagePath && previewType === 'contour' && (
        <ContourViewerModal
          isOpen={!!previewAsset}
          onClose={handleClosePreview}
          assetUrl={previewAsset.storagePath}
          assetName={previewAsset.name}
        />
      )}
    </>
  );
}

export default DataLibraryDrawer;
