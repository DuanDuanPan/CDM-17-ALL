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
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useOrganizationView } from './OrganizationTabs';
import { DataLibraryDrawerView } from './data-library-drawer/DataLibraryDrawerView';
import { filterAssets } from './data-library-drawer/filterAssets';
import { getDataLibraryEmptyStateMessage } from './data-library-drawer/emptyState';
import { useDrawerResize } from './data-library-drawer/useDrawerResize';
import { useDataAssets } from '../hooks/useDataAssets';
import { usePbsNodes } from '../hooks/usePbsNodes';
import { usePbsAssets } from '../hooks/usePbsAssets';
import { useTaskAssets } from '../hooks/useTaskAssets';
import { useDataFolders } from '../hooks/useDataFolders';
import { useAssetPreview } from '../hooks/useAssetPreview';
import { useDataLibraryDrawerOrgState } from '../hooks/useDataLibraryDrawerOrgState';
import type { DataAssetFormat } from '@cdm/types';
import type { ViewMode } from './data-library-drawer/types';

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
  } = useDataLibraryDrawerOrgState();

  // Story 9.4: Preview state using useAssetPreview hook
  const { previewAsset, previewType, handleAssetPreview, handleClosePreview } = useAssetPreview();

  // Story 9.2: PBS nodes hook for descendant IDs
  const { getDescendantIds } = usePbsNodes();

  // Story 9.2: PBS assets hook
  const {
    assets: pbsAssets,
    isLoading: pbsAssetsLoading,
    error: pbsAssetsError,
    refetch: refetchPbsAssets,
  } = usePbsAssets({
    selectedNodeId: selectedPbsId,
    includeSubNodes: pbsIncludeSubNodes,
    getDescendantIds,
  });

  // Story 9.2: Task assets hook
  const {
    assets: taskAssets,
    isLoading: taskAssetsLoading,
    error: taskAssetsError,
    refetch: refetchTaskAssets,
  } = useTaskAssets({
    selectedTaskId,
  });

  // Story 9.2: Folder operations hook
  const { moveAsset, isMovingAsset } = useDataFolders({ graphId, enabled: isOpen });

  // Debounce search to avoid request storms when typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSelectionScopedView =
    (orgView === 'pbs' && !!selectedPbsId) || (orgView === 'task' && !!selectedTaskId);

  // Data fetching hook
  const {
    assets,
    isLoading,
    error,
    refetch,
  } = useDataAssets({
    graphId,
    search: debouncedSearchQuery,
    format: formatFilter || undefined,
    folderId: orgView === 'folder' && selectedFolderId ? selectedFolderId : undefined,
    createdAfter: createdAfter || undefined,
    createdBefore: createdBefore || undefined,
    enabled: isOpen && !isSelectionScopedView,
  });

  const baseAssets =
    orgView === 'pbs' && selectedPbsId
      ? pbsAssets
      : orgView === 'task' && selectedTaskId
        ? taskAssets
        : assets;

  const visibleAssets = filterAssets(baseAssets, {
    search: debouncedSearchQuery,
    format: formatFilter,
    createdAfter,
    createdBefore,
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

  // Story 9.2: Check if assets are loading from organization hooks
  const orgAssetsLoading = Boolean(
    (orgView === 'pbs' && selectedPbsId && pbsAssetsLoading) ||
    (orgView === 'task' && selectedTaskId && taskAssetsLoading)
  );

  const activeError =
    orgView === 'pbs' && selectedPbsId
      ? pbsAssetsError
      : orgView === 'task' && selectedTaskId
        ? taskAssetsError
        : error;

  const activeRefetch =
    orgView === 'pbs' && selectedPbsId
      ? refetchPbsAssets
      : orgView === 'task' && selectedTaskId
        ? refetchTaskAssets
        : refetch;

  // Mount effect for portal
  useEffect(() => setMounted(true), []);

  // Refetch on open
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

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

  if (!isOpen || !mounted) return null;

  const emptyStateMessage =
    searchQuery || formatFilter || createdAfter || createdBefore
      ? '无匹配资产'
      : getDataLibraryEmptyStateMessage({ orgView, selectedPbsId, selectedTaskId, selectedFolderId });

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
        showOrgPanel={showOrgPanel}
        onToggleOrgPanel={() => setShowOrgPanel((prev) => !prev)}
        orgView={orgView}
        onOrgViewChange={setOrgView}
        graphId={graphId}
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
        isLoading={isLoading || orgAssetsLoading}
        error={activeError}
        onRetry={activeRefetch}
        visibleAssets={visibleAssets}
        baseAssetCount={baseAssets.length}
        emptyStateMessage={emptyStateMessage}
        isMovingAsset={isMovingAsset}
        draggableAssets={orgView === 'folder'}
        onAssetPreview={handleAssetPreview}
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
