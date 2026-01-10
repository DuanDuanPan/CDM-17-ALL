/**
 * Story 9.1: Data Library API Client
 * Fetches data assets from the backend API
 */

import type {
  DataAssetListResponse,
  DataAssetQueryDto,
  DataAssetFormat,
} from '@cdm/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001').replace(/\/$/, '');

/**
 * Fetch data assets with optional filtering
 */
export async function fetchDataAssets(
  params: DataAssetQueryDto
): Promise<DataAssetListResponse> {
  const searchParams = new URLSearchParams();

  // Required param
  searchParams.set('graphId', params.graphId);

  // Optional params
  if (params.search) searchParams.set('search', params.search);
  if (params.format) searchParams.set('format', params.format);
  if (params.folderId) searchParams.set('folderId', params.folderId);
  if (params.tags && params.tags.length > 0) {
    searchParams.set('tags', params.tags.join(','));
  }
  if (params.createdAfter) searchParams.set('createdAfter', params.createdAfter);
  if (params.createdBefore) searchParams.set('createdBefore', params.createdBefore);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await fetch(
    `${API_BASE}/api/data-assets?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch data assets');
  }

  return response.json();
}

/**
 * Options for fetching data assets
 */
export interface FetchDataAssetsOptions {
  graphId: string;
  search?: string;
  format?: DataAssetFormat;
  folderId?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}
