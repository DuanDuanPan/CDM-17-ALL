/**
 * Story 9.8: AssetCard selection + delete UI
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataAssetWithFolder } from '@cdm/types';
import { AssetCard } from '../components/AssetCard';

const mockAsset: DataAssetWithFolder = {
  id: 'asset-1',
  name: '卫星总体结构',
  description: null,
  format: 'STEP',
  fileSize: 1024,
  storagePath: '/api/files/file-1',
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

describe('AssetCard', () => {
  it('renders selection checkbox when selectable=true', async () => {
    const user = userEvent.setup();
    const onSelectChange = vi.fn();

    render(
      <AssetCard
        asset={mockAsset}
        selectable
        selected={false}
        onSelectChange={onSelectChange}
      />
    );

    const checkbox = screen.getByTestId('asset-select-checkbox');
    await user.click(checkbox);
    expect(onSelectChange).toHaveBeenCalledWith(true);
  });

  it('renders delete button and calls onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onClick = vi.fn();

    render(<AssetCard asset={mockAsset} onDelete={onDelete} onClick={onClick} />);

    const deleteButton = screen.getByTestId('delete-button');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});

