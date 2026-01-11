'use client';

/**
 * Story 9.2: Data Library DnD Provider
 * Provides @dnd-kit context for asset drag-and-drop operations
 * Wraps DataLibraryDrawerContent to enable high-fidelity drag preview
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragOverEvent,
} from '@dnd-kit/core';
import type { DataAssetWithFolder } from '@cdm/types';
import { AssetDragPreview } from './AssetDragPreview';

/** Asset drag data passed through dnd-kit */
export interface AssetDragData {
  type: 'asset';
  asset: DataAssetWithFolder;
}

/** Folder drop data for droppable folders */
export interface FolderDropData {
  type: 'folder';
  folderId: string | null;
}

interface DataLibraryDndProviderProps {
  children: React.ReactNode;
  assets: DataAssetWithFolder[];
  onAssetDrop: (assetId: string, folderId: string | null) => void;
}

/**
 * Data Library DnD Provider
 * Provides @dnd-kit context with custom drag overlay that follows the cursor
 */
export function DataLibraryDndProvider({
  children,
  assets,
  onAssetDrop,
}: DataLibraryDndProviderProps) {
  const [activeAsset, setActiveAsset] = useState<DataAssetWithFolder | null>(null);
  // Track mouse position for overlay positioning
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Configure sensors with activation constraints to avoid accidental drags
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8, // 8px movement before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // 200ms hold before drag starts
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Create a lookup map for quick asset retrieval
  const assetMap = useMemo(() => {
    const map = new Map<string, DataAssetWithFolder>();
    assets.forEach((asset) => map.set(asset.id, asset));
    return map;
  }, [assets]);

  // Handle drag start - set active asset for overlay
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const assetId = active.id as string;
      const asset = assetMap.get(assetId);
      if (asset) {
        setActiveAsset(asset);
        // Initialize mouse position from the activation event
        const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent;
        if ('clientX' in activatorEvent) {
          setMousePosition({ x: activatorEvent.clientX, y: activatorEvent.clientY });
        } else if ('touches' in activatorEvent && activatorEvent.touches[0]) {
          setMousePosition({
            x: activatorEvent.touches[0].clientX,
            y: activatorEvent.touches[0].clientY,
          });
        }
      }
    },
    [assetMap]
  );

  // Handle drag move - update mouse position for overlay
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { activatorEvent, delta } = event;
    if (activatorEvent && 'clientX' in activatorEvent) {
      // Calculate current position from initial + delta
      const initialEvent = activatorEvent as MouseEvent;
      setMousePosition({
        x: initialEvent.clientX + delta.x,
        y: initialEvent.clientY + delta.y,
      });
    }
  }, []);

  // Handle drag over - for visual feedback (optional)
  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by useDroppable in folder items
  }, []);

  // Handle drag end - trigger asset move
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveAsset(null);
      setMousePosition(null);

      if (!over) return;

      const assetId = active.id as string;
      const dropData = over.data.current as FolderDropData | undefined;

      if (dropData?.type === 'folder') {
        onAssetDrop(assetId, dropData.folderId);
      }
    },
    [onAssetDrop]
  );

  // Handle drag cancel - clear active asset
  const handleDragCancel = useCallback(() => {
    setActiveAsset(null);
    setMousePosition(null);
  }, []);

  // Render custom drag overlay portal (bypasses DragOverlay positioning issues)
  const dragOverlay =
    mounted && activeAsset && mousePosition
      ? createPortal(
          <div
            style={{
              position: 'fixed',
              left: mousePosition.x + 16,
              top: mousePosition.y + 16,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            data-testid="asset-drag-overlay"
          >
            <AssetDragPreview asset={activeAsset} />
          </div>,
          document.body
        )
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      {dragOverlay}
    </DndContext>
  );
}

export default DataLibraryDndProvider;
