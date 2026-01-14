/**
 * Story 9.1: Data Library API Client
 * Fetches data assets from the backend API
 * Story 9.2: Extended with folder update, batch node assets query
 */

import type {
  DataAssetListResponse,
  DataAssetQueryDto,
  DataAssetFormat,
  DataAssetWithFolder,
  DataFolderTreeResponse,
  DataFolder,
  DataAsset,
  NodeDataLinkWithAsset,
  DataLinkType,
} from '@cdm/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001').replace(/\/$/, '');

type ParsedApiError = { code?: string; message: string };

function parseMaybeNestedApiError(payload: unknown): ParsedApiError {
  if (!payload || typeof payload !== 'object') {
    return { message: '请求失败' };
  }

  const obj = payload as Record<string, unknown>;
  const code = typeof obj.code === 'string' ? obj.code : undefined;

  // Nest default often uses { statusCode, message, error }
  const messageValue = obj.message;
  if (typeof messageValue === 'string') {
    return { code, message: messageValue };
  }

  // message can be an object if HttpException was constructed with an object
  if (messageValue && typeof messageValue === 'object') {
    const nested = messageValue as Record<string, unknown>;
    const nestedCode = typeof nested.code === 'string' ? nested.code : undefined;
    const nestedMessage =
      typeof nested.message === 'string' ? nested.message : JSON.stringify(nested);

    return { code: nestedCode ?? code, message: nestedMessage };
  }

  // message can be an array of strings for validation errors
  if (Array.isArray(messageValue)) {
    const items = messageValue.filter((v): v is string => typeof v === 'string');
    if (items.length > 0) return { code, message: items.join('; ') };
  }

  // Fallback: stringify payload (best-effort)
  try {
    return { code, message: JSON.stringify(payload) };
  } catch {
    return { code, message: '请求失败' };
  }
}

async function readApiError(response: Response): Promise<ParsedApiError> {
  try {
    const payload = await response.json();
    return parseMaybeNestedApiError(payload);
  } catch {
    return { message: `请求失败 (${response.status})` };
  }
}

/**
 * Fetch data assets with optional filtering
 * Story 9.9: Added linkStatus for unlinked assets
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
  // Story 9.9: linkStatus filter
  if (params.linkStatus) searchParams.set('linkStatus', params.linkStatus);
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
    const error = await readApiError(response);
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

// ========================================
// Story 9.2: Folder API Functions
// ========================================

/**
 * Fetch folder tree for a graph
 */
export async function fetchDataFolders(graphId: string): Promise<DataFolderTreeResponse> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/folders?graphId=${encodeURIComponent(graphId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch folders');
  }

  return response.json();
}

/**
 * Create a new folder
 */
export async function createDataFolder(data: {
  graphId: string;
  name: string;
  parentId?: string;
}): Promise<{ success: boolean; folder: DataFolder }> {
  const response = await fetch(`${API_BASE}/api/data-assets/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to create folder');
  }

  return response.json();
}

/**
 * Update/rename a folder
 */
export async function updateDataFolder(data: {
  id: string;
  name?: string;
  description?: string;
}): Promise<{ success: boolean; folder: DataFolder }> {
  const { id, ...body } = data;
  const response = await fetch(
    `${API_BASE}/api/data-assets/folders:update?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to update folder');
  }

  return response.json();
}

/**
 * Delete a folder (must be empty)
 */
export async function deleteDataFolder(id: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/folders:destroy?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    const message =
      error.code === 'FOLDER_NOT_EMPTY'
        ? error.message || '无法删除非空文件夹'
        : error.message || 'Failed to delete folder';
    throw new Error(message);
  }

  return response.json();
}

// ========================================
// Story 9.2: Asset Update API
// ========================================

/**
 * Update a data asset (e.g., move to folder)
 */
export async function updateDataAsset(data: {
  id: string;
  folderId?: string | null;
  name?: string;
}): Promise<{ asset: DataAssetWithFolder }> {
  const { id, ...body } = data;
  const response = await fetch(
    `${API_BASE}/api/data-assets:update?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to update asset');
  }

  return response.json();
}

// ========================================
// Story 9.2: Node-Asset Link API Functions
// ========================================

/**
 * Fetch assets linked to a single node
 */
export async function fetchNodeAssets(nodeId: string): Promise<{ assets: DataAssetWithFolder[] }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/links?nodeId=${encodeURIComponent(nodeId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch node assets');
  }

  return response.json();
}

/**
 * Fetch assets linked to multiple nodes (batch query)
 * Used for PBS "include sub-nodes" and Task batch asset queries
 */
export async function fetchNodeAssetsByNodes(nodeIds: string[]): Promise<{ assets: DataAssetWithFolder[] }> {
  // 防御性检查：空数组直接返回，避免后端 400 错误
  if (!nodeIds || nodeIds.length === 0) {
    return { assets: [] };
  }

  const response = await fetch(`${API_BASE}/api/data-assets/links:byNodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeIds }),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch node assets');
  }

  return response.json();
}

// ========================================
// Story 9.5: Upload & Link API Functions
// ========================================

/**
 * Upload a file and create data asset
 * AC#1: Upload file to server, create DataAsset with auto-detected format
 */
export async function uploadDataAsset(
  file: File,
  graphId: string,
  folderId?: string
): Promise<{ success: boolean; asset: DataAsset }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('graphId', graphId);
  if (folderId) {
    formData.append('folderId', folderId);
  }

  const response = await fetch(`${API_BASE}/api/data-assets:upload`, {
    method: 'POST',
    body: formData,
    // Note: Do NOT set Content-Type header - browser will set it with boundary
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to upload asset');
  }

  return response.json();
}

/**
 * Fetch links with full asset details for node property panel
 * AC#4: Returns links including asset + linkType
 */
export async function fetchNodeAssetLinks(
  nodeId: string
): Promise<{ links: NodeDataLinkWithAsset[] }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/links:detail?nodeId=${encodeURIComponent(nodeId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch node asset links');
  }

  return response.json();
}

/**
 * Story 9.8: Fetch link details for multiple nodes (batch)
 * Returns links including nodeId + asset + linkType for union/provenance UI.
 */
export async function fetchNodeAssetLinksByNodes(
  nodeIds: string[]
): Promise<{ links: NodeDataLinkWithAsset[] }> {
  if (!nodeIds || nodeIds.length === 0) {
    return { links: [] };
  }

  const response = await fetch(`${API_BASE}/api/data-assets/links:detailByNodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeIds }),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch node asset links');
  }

  return response.json();
}

/**
 * Story 9.8: Batch unlink nodes and assets.
 * Only removes NodeDataLink records; does NOT delete the DataAsset entity.
 */
export async function deleteNodeAssetLinksByNodes(data: {
  nodeIds: string[];
  assetIds: string[];
}): Promise<{ success: boolean; unlinked: Array<{ nodeId: string; assetId: string; linkType: DataLinkType }> }> {
  if (!data.nodeIds?.length || !data.assetIds?.length) {
    return { success: true, unlinked: [] };
  }

  const response = await fetch(`${API_BASE}/api/data-assets/links:destroyByNodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to batch unlink node asset links');
  }

  return response.json();
}

/**
 * Create link between node and asset
 * AC#3: Link asset to node with linkType
 */
export async function createNodeAssetLink(data: {
  nodeId: string;
  assetId: string;
  linkType?: DataLinkType;
  note?: string;
}): Promise<{ success: boolean; link: { id: string; nodeId: string; assetId: string; linkType: DataLinkType; createdAt: string } }> {
  const response = await fetch(`${API_BASE}/api/data-assets/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to create link');
  }

  return response.json();
}

/**
 * Delete link between node and asset
 * AC#5: Unlink asset from node
 */
export async function deleteNodeAssetLink(
  nodeId: string,
  assetId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/links:destroy?nodeId=${encodeURIComponent(nodeId)}&assetId=${encodeURIComponent(assetId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to delete link');
  }

  return response.json();
}

// ========================================
// Story 9.8: Soft Delete / Trash API Functions
// ========================================

export type TrashAsset = DataAssetWithFolder & { linkedNodeCount: number };

/**
 * Soft delete a single data asset (move to trash)
 */
export async function softDeleteDataAsset(id: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets:soft-delete?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to delete asset');
  }

  return response.json();
}

/**
 * Soft delete multiple data assets (move to trash)
 */
export async function softDeleteDataAssets(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  const response = await fetch(`${API_BASE}/api/data-assets:soft-delete-batch`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to delete assets');
  }

  return response.json();
}

/**
 * Restore a soft-deleted data asset
 */
export async function restoreDataAsset(id: string): Promise<{ success: boolean; asset: DataAssetWithFolder }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets:restore?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to restore asset');
  }

  return response.json();
}

/**
 * Fetch trash assets for a graph
 */
export async function fetchTrashAssets(graphId: string): Promise<{ assets: TrashAsset[] }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/trash?graphId=${encodeURIComponent(graphId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to fetch trash assets');
  }

  return response.json();
}

/**
 * Hard delete a data asset (permanent)
 */
export async function hardDeleteDataAsset(id: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets:hard-delete?filterByTk=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to permanently delete asset');
  }

  return response.json();
}

/**
 * Empty trash for a graph (permanent delete all soft-deleted assets)
 */
export async function emptyTrash(graphId: string): Promise<{ success: boolean; deletedCount: number }> {
  const response = await fetch(
    `${API_BASE}/api/data-assets/trash:empty?graphId=${encodeURIComponent(graphId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message || 'Failed to empty trash');
  }

  return response.json();
}
