'use client';

/**
 * Story 9.2: Asset Drag Preview Component
 * High-fidelity drag preview for DragOverlay
 * Displays a compact, styled card following the cursor during drag
 */

import {
  FileText,
  FileSpreadsheet,
  FileJson,
  FileImage,
  FileVideo,
  File,
  Cuboid,
} from 'lucide-react';
import type { DataAssetWithFolder, DataAssetFormat } from '@cdm/types';
import { formatFileSize } from '../../utils/formatFileSize';

interface AssetDragPreviewProps {
  asset: DataAssetWithFolder;
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
 * Get icon background color for asset format
 */
function getFormatIconBg(format: DataAssetFormat): string {
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
 * Asset Drag Preview Component
 * Compact, high-fidelity preview shown during drag operations
 */
export function AssetDragPreview({ asset }: AssetDragPreviewProps) {
  const Icon = getFormatIcon(asset.format);
  const iconBgClass = getFormatIconBg(asset.format);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800
                 border border-gray-200 dark:border-gray-700
                 rounded-xl shadow-2xl
                 min-w-[200px] max-w-[280px]
                 pointer-events-none select-none
                 transform rotate-2 scale-105"
      data-testid="asset-drag-preview"
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {asset.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{asset.format}</span>
          <span>•</span>
          <span>{formatFileSize(asset.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}

export default AssetDragPreview;
