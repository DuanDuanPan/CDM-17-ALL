/**
 * Story 9.5: Data Upload & Node Linking
 * Format detection utility for data assets
 *
 * Determines DataAssetFormat from file extension (case-insensitive)
 */

import * as path from 'path';
import type { DataAssetFormat } from '@cdm/types';

/**
 * Mapping of file extensions to DataAssetFormat
 * Extensions are lowercase, matching is case-insensitive
 */
const FORMAT_MAPPING: Record<string, DataAssetFormat> = {
  // CAD Formats
  '.step': 'STEP',
  '.stp': 'STEP',
  '.iges': 'IGES',
  '.igs': 'IGES',
  '.stl': 'STL',
  '.obj': 'OBJ',
  '.fbx': 'FBX',
  '.gltf': 'GLTF',
  '.glb': 'GLTF',

  // VTK Scientific Visualization Formats
  '.vtk': 'VTK',
  '.vtp': 'VTK',
  '.vtu': 'VTK',
  '.vti': 'VTK',

  // Document Formats
  '.pdf': 'PDF',
  '.doc': 'DOCX',
  '.docx': 'DOCX',
  '.xls': 'XLSX',
  '.xlsx': 'XLSX',

  // Data Formats
  '.json': 'JSON',
  '.xml': 'XML',
  '.csv': 'CSV',

  // Image Formats
  '.png': 'IMAGE',
  '.jpg': 'IMAGE',
  '.jpeg': 'IMAGE',
  '.webp': 'IMAGE',
  '.svg': 'IMAGE',

  // Video Formats
  '.mp4': 'VIDEO',
  '.mov': 'VIDEO',
};

/**
 * Get DataAssetFormat from filename based on extension
 *
 * @param filename - The filename to analyze (e.g., "model.step", "data.json")
 * @returns DataAssetFormat - Mapped format or 'OTHER' if unknown
 *
 * @example
 * getDataAssetFormatFromFilename('model.STEP') // 'STEP'
 * getDataAssetFormatFromFilename('data.vtk')   // 'VTK'
 * getDataAssetFormatFromFilename('noext')      // 'OTHER'
 */
export function getDataAssetFormatFromFilename(filename: string): DataAssetFormat {
  const ext = path.extname(filename).toLowerCase();
  return FORMAT_MAPPING[ext] ?? 'OTHER';
}
