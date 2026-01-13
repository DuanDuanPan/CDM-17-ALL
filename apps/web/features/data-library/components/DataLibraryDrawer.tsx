'use client';

/**
 * Story 9.1: Data Library Drawer Component
 * AC#1: Drawer opens from right, 60-70% viewport width, supports drag resize
 * AC#2: Closes on backdrop click, close button, or ESC
 * AC#3: Supports grid/list view toggle and search/filter
 *
 * Story 9.2: Multi-Dimensional Organization Views
 * AC#1-3: PBS, Task, and Folder organization views
 * AC#4: Drag-drop assets to folders
 * AC#5: State persistence
 *
 * Story 9.4: Contour viewer integration
 *
 * Story 9.5: Upload button integration, Link-to-node dialog
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useOrganizationView } from './OrganizationTabs';
import type { SearchMode } from './node-tree';
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
 * AC#1: Maximized drawer (60-70% width) with drag-to-resize
 * AC#2: Multiple close mechanisms
 * AC#3: View toggle and search/filter
 * Story 9.2: Multi-dimensional organization views
 */
export function DataLibraryDrawer({
  isOpen,
  onClose,
  graphId,
}: DataLibraryDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('node');
  const [formatFilter, setFormatFilter] = useState<DataAssetFormat | ''>('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const { drawerWidth, isResizing, handleResizeStart } = useDrawerResize();

  // Story 9.2: Organization view state with persistence
  const [orgView, setOrgView] = useOrganizationView(graphId);
  const [showOrgPanel, setShowOrgPanel] = useState(true);

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

  // Debounce search to avoid request storms when typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const effectiveSearchMode: SearchMode = orgView === 'folder' ? 'asset' : searchMode;
  const shouldFetchGlobalAssets =
    orgView === 'folder' || (orgView === 'node' && effectiveSearchMode === 'asset');

  // Data fetching hook
  const {
    assets,
    isLoading,
    error,
    refetch,
  } = useDataAssets({
    graphId,
    search: shouldFetchGlobalAssets ? debouncedSearchQuery : undefined,
    format: shouldFetchGlobalAssets ? (formatFilter || undefined) : undefined,
    folderId: orgView === 'folder' && selectedFolderId ? selectedFolderId : undefined,
    createdAfter: shouldFetchGlobalAssets ? (createdAfter || undefined) : undefined,
    createdBefore: shouldFetchGlobalAssets ? (createdBefore || undefined) : undefined,
    enabled: isOpen && shouldFetchGlobalAssets,
  });

  const baseAssets = shouldFetchGlobalAssets ? assets : [];

  const visibleAssets = filterAssets(baseAssets, {
    search: shouldFetchGlobalAssets ? debouncedSearchQuery : '',
    format: shouldFetchGlobalAssets ? formatFilter : '',
    createdAfter: shouldFetchGlobalAssets ? createdAfter : '',
    createdBefore: shouldFetchGlobalAssets ? createdBefore : '',
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

  if (!isOpen || !mounted) return null;

  const emptyStateMessage =
    ((searchQuery && shouldFetchGlobalAssets) || formatFilter || createdAfter || createdBefore)
      ? '无匹配资产'
      : getDataLibraryEmptyStateMessage({ orgView, activeNodeId, selectedPbsId, selectedTaskId, selectedFolderId });

  return (
    <>
      <DataLibraryDrawerView
        drawerWidth={drawerWidth}
        isResizing={isResizing}
        onResizeStart={handleResizeStart}
        onClose={onClose}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        formatFilter={formatFilter}
        onFormatFilterChange={setFormatFilter}
        createdAfter={createdAfter}
        onCreatedAfterChange={setCreatedAfter}
        createdBefore={createdBefore}
        onCreatedBeforeChange={setCreatedBefore}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        showOrgPanel={showOrgPanel}
        onToggleOrgPanel={() => setShowOrgPanel((prev) => !prev)}
        orgView={orgView}
        onOrgViewChange={setOrgView}
        graphId={graphId}
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
