'use client';

/**
 * Story 9.1: Asset List Component
 * Displays data assets in a list/table layout
 * AC#3: List view for data assets
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
import { format } from 'date-fns';
import { formatFileSize } from '../utils/formatFileSize';

interface AssetListProps {
  assets: DataAssetWithFolder[];
  onAssetClick?: (asset: DataAssetWithFolder) => void;
}

/**
 * Get icon for asset format
 */
function getFormatIcon(assetFormat: DataAssetFormat) {
  switch (assetFormat) {
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
function getFormatColor(assetFormat: DataAssetFormat): string {
  switch (assetFormat) {
    case 'STEP':
    case 'IGES':
      return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    case 'STL':
    case 'OBJ':
    case 'FBX':
    case 'GLTF':
      return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
    case 'PDF':
      return 'text-red-500 bg-red-100 dark:bg-red-900/30';
    case 'DOCX':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'XLSX':
    case 'CSV':
      return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    case 'JSON':
    case 'XML':
      return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
    case 'IMAGE':
      return 'text-pink-500 bg-pink-100 dark:bg-pink-900/30';
    case 'VIDEO':
      return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30';
    default:
      return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
  }
}

/**
 * Asset List Component
 */
export function AssetList({ assets, onAssetClick }: AssetListProps) {
  return (
    <div data-testid="asset-list" className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <div className="col-span-5">名称</div>
        <div className="col-span-2">格式</div>
        <div className="col-span-2">大小</div>
        <div className="col-span-2">更新时间</div>
        <div className="col-span-1">版本</div>
      </div>

      {/* Rows */}
      {assets.map((asset) => {
        const Icon = getFormatIcon(asset.format);
        const colorClass = getFormatColor(asset.format);

        return (
          <div
            key={asset.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 items-center
                     bg-white dark:bg-gray-800 rounded-lg
                     border border-gray-100 dark:border-gray-700
                     hover:border-blue-300 dark:hover:border-blue-600
                     hover:shadow-md transition-all cursor-pointer"
            onClick={() => onAssetClick?.(asset)}
          >
            {/* Name Column */}
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 ${colorClass} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {asset.name}
                </h3>
                {asset.folder && (
                  <p className="text-xs text-gray-400 truncate">
                    📁 {asset.folder.name}
                  </p>
                )}
              </div>
            </div>

            {/* Format Column */}
            <div className="col-span-2">
              <span className={`inline-flex px-2 py-0.5 ${colorClass} text-xs font-medium rounded`}>
                {asset.format}
              </span>
            </div>

            {/* Size Column */}
            <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(asset.fileSize)}
            </div>

            {/* Updated Column */}
            <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(asset.updatedAt), 'yyyy-MM-dd')}
            </div>

            {/* Version Column */}
            <div className="col-span-1 text-sm text-gray-500 dark:text-gray-400">
              {asset.version}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AssetList;
