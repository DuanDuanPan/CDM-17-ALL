/**
 * Story 9.1: Data Library (数据资源库)
 * Type definitions for data assets, folders, and node links
 */

// ========================================
// Enums
// ========================================

/**
 * Supported data asset formats
 */
export type DataAssetFormat =
  | 'STEP'
  | 'IGES'
  | 'STL'
  | 'OBJ'
  | 'FBX'
  | 'GLTF'
  | 'VTK'
  | 'PDF'
  | 'DOCX'
  | 'XLSX'
  | 'JSON'
  | 'XML'
  | 'CSV'
  | 'IMAGE'
  | 'VIDEO'
  | 'OTHER';

/**
 * Link type between node and data asset
 * Story 9.5: Updated to support input/output/reference for data traceability
 */
export type DataLinkType = 'input' | 'output' | 'reference';

/**
 * Secret level for classification
 */
export type SecretLevel = 'public' | 'internal' | 'confidential' | 'secret';

// ========================================
// Data Folder Types
// ========================================

/**
 * Data folder for organizing assets
 */
export interface DataFolder {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  graphId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a folder
 */
export interface CreateDataFolderDto {
  name: string;
  description?: string;
  parentId?: string;
  graphId: string;
}

// ========================================
// Data Asset Types
// ========================================

/**
 * Data asset entity
 */
export interface DataAsset {
  id: string;
  name: string;
  description?: string | null;
  format: DataAssetFormat;
  fileSize?: number | null;
  storagePath?: string | null;
  thumbnail?: string | null;
  version: string;
  tags: string[];
  graphId: string;
  folderId?: string | null;
  creatorId?: string | null;
  secretLevel: SecretLevel;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data asset with folder info (for list display)
 */
export interface DataAssetWithFolder extends DataAsset {
  folder?: DataFolder | null;
}

/**
 * DTO for creating a data asset
 */
export interface CreateDataAssetDto {
  name: string;
  description?: string;
  format?: DataAssetFormat;
  fileSize?: number;
  storagePath?: string;
  thumbnail?: string;
  version?: string;
  tags?: string[];
  graphId: string;
  folderId?: string;
  secretLevel?: SecretLevel;
}

/**
 * DTO for updating a data asset
 */
export interface UpdateDataAssetDto {
  name?: string;
  description?: string;
  format?: DataAssetFormat;
  tags?: string[];
  folderId?: string | null;
  secretLevel?: SecretLevel;
}

// ========================================
// Node Data Link Types
// ========================================

/**
 * Link between node and data asset
 */
export interface NodeDataLink {
  id: string;
  nodeId: string;
  assetId: string;
  linkType: DataLinkType;
  note?: string | null;
  createdAt: string;
}

/**
 * Story 9.5: Link with asset details for node property panel
 * Used by GET /data-assets/links:detail endpoint
 */
export interface NodeDataLinkWithAsset extends NodeDataLink {
  asset: DataAssetWithFolder;
}

/**
 * DTO for creating a link
 */
export interface CreateNodeDataLinkDto {
  nodeId: string;
  assetId: string;
  linkType?: DataLinkType;
  note?: string;
}

// ========================================
// Query & Response Types
// ========================================

/**
 * Query filters for listing data assets
 * Story 9.9: Added linkStatus for filtering unlinked assets
 */
export interface DataAssetQueryDto {
  graphId: string;
  search?: string;       // Search by name
  format?: DataAssetFormat; // Filter by format
  folderId?: string;     // Filter by folder
  tags?: string[];       // Filter by tags
  createdAfter?: string; // Filter by date (ISO string)
  createdBefore?: string;
  /** Story 9.9: Filter by link status - 'unlinked' returns assets with no NodeDataLink */
  linkStatus?: 'unlinked';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'format' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response for data assets
 */
export interface DataAssetListResponse {
  assets: DataAssetWithFolder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Response for single data asset
 */
export interface DataAssetResponse {
  asset: DataAssetWithFolder;
}

/**
 * Response for folder tree
 */
export interface DataFolderTreeResponse {
  folders: DataFolderTreeNode[];
}

/**
 * Folder tree node with children
 */
export interface DataFolderTreeNode extends DataFolder {
  children?: DataFolderTreeNode[];
  assetCount?: number;
}

// ========================================
// API Response Types
// ========================================

/**
 * Generic success response
 */
export interface DataLibrarySuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * Create asset response
 */
export interface CreateDataAssetResponse {
  success: boolean;
  asset: DataAsset;
}

/**
 * Link response
 */
export interface CreateNodeDataLinkResponse {
  success: boolean;
  link: NodeDataLink;
}
