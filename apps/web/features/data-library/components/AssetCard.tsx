'use client';

/**
 * Story 9.1: Asset Card Component
 * Story 9.3: Added preview support for 3D models
 * Story 9.2: Migrated to @dnd-kit for high-fidelity drag preview
 * Story 9.5: Added link-to-node action button
 * Displays a single data asset in card format (for grid view)
 */

import { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  FileText,
  FileSpreadsheet,
  FileJson,
  FileImage,
  FileVideo,
  File,
  Cuboid,
  Eye,
  Link2,
  Trash2,
} from 'lucide-react';
import { cn } from '@cdm/ui';
import type { DataAssetWithFolder, DataAssetFormat } from '@cdm/types';
import { getAssetPreviewType } from '../hooks/useAssetPreview';
import { formatFileSize } from '../utils/formatFileSize';
import type { AssetDragData } from './dnd';

interface AssetCardProps {
  asset: DataAssetWithFolder;
  onClick?: () => void;
  /** Story 9.3: Preview callback for 3D models */
  onPreview?: () => void;
  /** Story 9.5: Link-to-node callback */
  onLink?: () => void;
  /** Story 9.8: Soft delete callback */
  onDelete?: () => void;
  /** Story 9.8: Batch selection support */
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  /** Story 9.2: Enable drag for folder organization */
  draggable?: boolean;
}

/**
 * Get icon for asset format
 */
function getFormatIcon(format: DataAssetFormat) {
  switch (format) {
    case 'STEP':
    case 'IGES':
    case 'STL':
    case 'OBJ':
    case 'FBX':
    case 'GLTF':
      return Cuboid;
    case 'PDF':
    case 'DOCX':
      return FileText;
    case 'XLSX':
    case 'CSV':
      return FileSpreadsheet;
    case 'JSON':
    case 'XML':
      return FileJson;
    case 'IMAGE':
      return FileImage;
    case 'VIDEO':
      return FileVideo;
    default:
      return File;
  }
}

/**
 * Get color for asset format
 */
function getFormatColor(format: DataAssetFormat): string {
  switch (format) {
    case 'STEP':
    case 'IGES':
      return 'bg-blue-500';
    case 'STL':
    case 'OBJ':
    case 'FBX':
    case 'GLTF':
      return 'bg-purple-500';
    case 'PDF':
      return 'bg-red-500';
    case 'DOCX':
      return 'bg-blue-600';
    case 'XLSX':
    case 'CSV':
      return 'bg-green-500';
    case 'JSON':
    case 'XML':
      return 'bg-amber-500';
    case 'IMAGE':
      return 'bg-pink-500';
    case 'VIDEO':
      return 'bg-indigo-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Inner Asset Card Component (non-draggable version)
 */
interface AssetCardInnerProps {
  asset: DataAssetWithFolder;
  onClick?: () => void;
  onPreview?: () => void;
  onLink?: () => void;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  isDragging?: boolean;
}

const AssetCardInner = forwardRef<HTMLDivElement, AssetCardInnerProps & React.HTMLAttributes<HTMLDivElement>>(
  function AssetCardInner(
    { asset, onClick, onPreview, onLink, onDelete, selectable, selected, onSelectChange, isDragging, className, style, ...props },
    ref
  ) {
    const Icon = getFormatIcon(asset.format);
    const colorClass = getFormatColor(asset.format);
    const canPreview = getAssetPreviewType(asset) !== null && !!asset.storagePath && !!onPreview;

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canPreview) {
        onPreview?.();
      }
    };

    const handlePreviewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canPreview) {
        onPreview?.();
      }
    };

    const handleLinkClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onLink?.();
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group relative flex flex-col bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700 rounded-xl',
          'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600',
          'transition-all duration-200 cursor-pointer overflow-hidden',
          isDragging && 'opacity-50 ring-2 ring-blue-400',
          className
        )}
        style={style}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        data-testid="asset-card"
        {...props}
      >
        {/* Selection Checkbox (Story 9.8) */}
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={selected ? '取消选择' : '选择'}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
              data-testid="asset-select-checkbox"
            />
          </div>
        )}

        {/* Thumbnail Area */}
        <div className="relative h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {asset.thumbnail ? (
            <img
              src={asset.thumbnail}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-16 h-16 ${colorClass} rounded-xl flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
          )}

          {/* Format Badge */}
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 text-white text-xs font-medium rounded">
            {asset.format}
          </div>

          {/* Preview Button (Story 9.3) - shown on hover for 3D formats */}
          {canPreview && (
            <button
              type="button"
              onClick={handlePreviewClick}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-full
                         opacity-0 group-hover:opacity-100 transition-opacity shadow-lg
                         hover:bg-blue-600"
              title="预览"
              data-testid="preview-button"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Link Button (Story 9.5) - shown on hover */}
          {onLink && (
            <button
              type="button"
              onClick={handleLinkClick}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'absolute bottom-2 p-2 bg-green-500 text-white rounded-full',
                'opacity-0 group-hover:opacity-100 transition-opacity shadow-lg',
                'hover:bg-green-600',
                canPreview ? 'right-12' : 'right-2'
              )}
              title="关联到节点"
              data-testid="link-button"
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}

          {/* Delete Button (Story 9.8) - shown on hover */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-2 left-2 p-2 bg-red-500 text-white rounded-full
                         opacity-0 group-hover:opacity-100 transition-opacity shadow-lg
                         hover:bg-red-600"
              title="删除"
              data-testid="delete-button"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
            {asset.name}
          </h3>

          {asset.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
              {asset.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
            <span>{formatFileSize(asset.fileSize)}</span>
            <span>{asset.version}</span>
          </div>

          {/* Tags */}
          {asset.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {asset.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700
                           text-gray-600 dark:text-gray-300 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {asset.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{asset.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

/**
 * Draggable Asset Card Component
 * Uses @dnd-kit for high-fidelity drag preview
 * Original card stays in place, only DragOverlay follows cursor
 */
function DraggableAssetCard({
  asset,
  onClick,
  onPreview,
  onLink,
  onDelete,
  selectable,
  selected,
  onSelectChange,
}: Omit<AssetCardProps, 'draggable'>) {
  const dragData: AssetDragData = {
    type: 'asset',
    asset,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: asset.id,
    data: dragData,
  });

  // Do NOT apply transform - original card stays in place
  // Only show isDragging visual feedback (opacity + ring)
  return (
    <AssetCardInner
      ref={setNodeRef}
      asset={asset}
      onClick={onClick}
      onPreview={onPreview}
      onLink={onLink}
      onDelete={onDelete}
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      isDragging={isDragging}
      {...listeners}
      {...attributes}
    />
  );
}

/**
 * Asset Card Component
 * Story 9.2: Added draggable support for folder organization with @dnd-kit
 * Story 9.3: Added double-click preview and preview button for 3D models
 * Story 9.5: Added link-to-node action button
 */
export function AssetCard({
  asset,
  onClick,
  onPreview,
  onLink,
  onDelete,
  selectable,
  selected,
  onSelectChange,
  draggable = false,
}: AssetCardProps) {
  if (draggable) {
    return (
      <DraggableAssetCard
        asset={asset}
        onClick={onClick}
        onPreview={onPreview}
        onLink={onLink}
        onDelete={onDelete}
        selectable={selectable}
        selected={selected}
        onSelectChange={onSelectChange}
      />
    );
  }

  return (
    <AssetCardInner
      asset={asset}
      onClick={onClick}
      onPreview={onPreview}
      onLink={onLink}
      onDelete={onDelete}
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
    />
  );
}

export default AssetCard;
