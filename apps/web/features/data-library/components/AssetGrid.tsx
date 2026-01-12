'use client';

/**
 * Story 9.1: Asset Grid Component
 * Displays data assets in a grid layout
 * AC#3: Grid view for data assets
 * Story 9.2: Added draggable support for folder organization
 * Story 9.3: Added preview callback for 3D models
 * Story 9.5: Added link-to-node action
 */

import { AssetCard } from './AssetCard';
import type { DataAssetWithFolder } from '@cdm/types';

interface AssetGridProps {
  assets: DataAssetWithFolder[];
  onAssetClick?: (asset: DataAssetWithFolder) => void;
  /** Story 9.3: Preview callback for 3D models */
  onAssetPreview?: (asset: DataAssetWithFolder) => void;
  /** Story 9.5: Link-to-node callback */
  onAssetLink?: (asset: DataAssetWithFolder) => void;
  /** Story 9.2: Enable drag for folder organization */
  draggable?: boolean;
}

/**
 * Asset Grid Component
 * Story 9.5: Added link-to-node action
 */
export function AssetGrid({ assets, onAssetClick, onAssetPreview, onAssetLink, draggable = false }: AssetGridProps) {
  return (
    <div
      data-testid="asset-grid"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onClick={() => onAssetClick?.(asset)}
          onPreview={onAssetPreview ? () => onAssetPreview(asset) : undefined}
          onLink={onAssetLink ? () => onAssetLink(asset) : undefined}
          draggable={draggable}
        />
      ))}
    </div>
  );
}

export default AssetGrid;
