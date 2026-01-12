import type { DataAssetFormat, DataLinkType, SecretLevel } from '@cdm/types';

export const DATA_ASSET_FORMATS: readonly DataAssetFormat[] = [
  'STEP',
  'IGES',
  'STL',
  'OBJ',
  'FBX',
  'GLTF',
  'PDF',
  'DOCX',
  'XLSX',
  'JSON',
  'XML',
  'CSV',
  'IMAGE',
  'VIDEO',
  'OTHER',
] as const;

export const SECRET_LEVELS: readonly SecretLevel[] = [
  'public',
  'internal',
  'confidential',
  'secret',
] as const;

export const DATA_LINK_TYPES: readonly DataLinkType[] = [
  'input',
  'output',
  'reference',
] as const;

