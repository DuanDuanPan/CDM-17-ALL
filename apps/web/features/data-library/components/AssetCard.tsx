'use client';

/**
 * Story 9.1: Asset Card Component
 * Displays a single data asset in card format (for grid view)
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
import { formatFileSize } from '../utils/formatFileSize';

interface AssetCardProps {
  asset: DataAssetWithFolder;
  onClick?: () => void;
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
 * Asset Card Component
 * Story 9.2: Added draggable support for folder organization
 */
export function AssetCard({ asset, onClick, draggable = false }: AssetCardProps) {
  const Icon = getFormatIcon(asset.format);
  const colorClass = getFormatColor(asset.format);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', asset.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="group relative flex flex-col bg-white dark:bg-gray-800
                 border border-gray-200 dark:border-gray-700 rounded-xl
                 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600
                 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
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

export default AssetCard;
