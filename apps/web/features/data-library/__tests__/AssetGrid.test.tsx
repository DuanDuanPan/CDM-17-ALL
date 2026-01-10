'use client';

/**
 * Story 9.1: Data Library - AssetGrid Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetGrid } from '../components/AssetGrid';
import type { DataAssetWithFolder } from '@cdm/types';

const mockAsset: DataAssetWithFolder = {
  id: 'asset-1',
  name: '卫星总体结构',
  description: null,
  format: 'STEP',
  fileSize: 1024,
  storagePath: '/cad/satellite.step',
  thumbnail: null,
  version: 'v1.0.0',
  tags: ['卫星'],
  graphId: 'graph-1',
  folderId: null,
  creatorId: null,
  secretLevel: 'internal',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  folder: null,
};

describe('AssetGrid', () => {
  it('renders assets in a grid container', () => {
    render(<AssetGrid assets={[mockAsset]} />);
    expect(screen.getByTestId('asset-grid')).toBeDefined();
    expect(screen.getByText(mockAsset.name)).toBeDefined();
  });

  it('calls onAssetClick when an asset is clicked', async () => {
    const user = userEvent.setup();
    const onAssetClick = vi.fn();

    render(<AssetGrid assets={[mockAsset]} onAssetClick={onAssetClick} />);
    await user.click(screen.getByText(mockAsset.name));

    expect(onAssetClick).toHaveBeenCalledTimes(1);
    expect(onAssetClick).toHaveBeenCalledWith(mockAsset);
  });
});

