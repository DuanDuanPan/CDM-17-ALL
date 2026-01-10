'use client';

/**
 * Story 9.1: Asset Grid Component
 * Displays data assets in a grid layout
 * AC#3: Grid view for data assets
 */

import { AssetCard } from './AssetCard';
import type { DataAssetWithFolder } from '@cdm/types';

interface AssetGridProps {
  assets: DataAssetWithFolder[];
  onAssetClick?: (asset: DataAssetWithFolder) => void;
}

/**
 * Asset Grid Component
 */
export function AssetGrid({ assets, onAssetClick }: AssetGridProps) {
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
        />
      ))}
    </div>
  );
}

export default AssetGrid;
