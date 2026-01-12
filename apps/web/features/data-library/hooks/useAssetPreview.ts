'use client';

/**
 * useAssetPreview Hook
 *
 * Story 9.4 Task 0.2: Extracted from DataLibraryDrawer.tsx for preview state management.
 * Manages asset preview state for both ModelViewer (mesh/CAD) and ContourViewer (VTK).
 */

import { useState, useCallback } from 'react';
import type { DataAssetWithFolder } from '@cdm/types';

/** Type of preview to show based on asset format */
export type PreviewType = 'model' | 'contour' | null;

export interface UseAssetPreviewResult {
    /** Current asset being previewed */
    previewAsset: DataAssetWithFolder | null;
    /** Type of preview (model for mesh/CAD, contour for VTK, null if none) */
    previewType: PreviewType;
    /** Request to preview an asset */
    handleAssetPreview: (asset: DataAssetWithFolder) => void;
    /** Close the preview */
    handleClosePreview: () => void;
}

/**
 * Determine the preview type based on asset format and file extension.
 * Story 9.4 AC#3: Detect VTK/VTP/VTU/VTI and JSON scalar fields.
 */
export function getAssetPreviewType(asset: DataAssetWithFolder): PreviewType {
    const format = asset.format?.toUpperCase();
    // Uploaded assets often have storagePath like `/api/files/:id` (no extension).
    // Use both storagePath and name to infer preview type.
    const pathCandidates = [asset.storagePath, asset.name].filter(Boolean).map((v) => String(v).toLowerCase());
    const tags = asset.tags?.map((t) => t.toUpperCase()) ?? [];

    // Mesh formats (Story 9.4): Use ModelViewer
    // Note: STL/OBJ are checked first as explicit mesh types
    if (format === 'STL' || format === 'OBJ') {
        return 'model';
    }

    // CAD formats (Story 9.3): Use ModelViewer
    // Note: These are file-extension based formats supported by Online3DViewer,
    // not necessarily all values from DataAssetFormat Prisma enum
    const cadFormats = ['STEP', 'IGES', 'GLTF', 'GLB', 'FBX', '3DS', 'PLY', 'OFF', '3DM', 'DAE', 'IFC', 'BIM'];
    if (cadFormats.includes(format ?? '')) {
        return 'model';
    }

    // VTK formats (Story 9.4 AC#3): Use ContourViewer
    const vtkExtensions = ['.vtk', '.vtp', '.vtu', '.vti'];
    if (pathCandidates.some((p) => vtkExtensions.some((ext) => p.endsWith(ext)))) {
        return 'contour';
    }

    // JSON Scalar field (Story 9.4 AC#3): *.scalar.json or *.contour.json or tags contain CONTOUR
    if (format === 'JSON') {
        if (pathCandidates.some((p) => p.endsWith('.scalar.json') || p.endsWith('.contour.json'))) {
            return 'contour';
        }
        if (tags.includes('CONTOUR')) {
            return 'contour';
        }
    }

    // OTHER format with VTK-like patterns in path
    if (format === 'OTHER') {
        if (pathCandidates.some((p) => vtkExtensions.some((ext) => p.endsWith(ext)))) {
            return 'contour';
        }
        if (tags.includes('CONTOUR')) {
            return 'contour';
        }
    }

    // No supported preview type
    return null;
}

/**
 * Hook for managing asset preview state (model or contour).
 */
export function useAssetPreview(): UseAssetPreviewResult {
    const [previewAsset, setPreviewAsset] = useState<DataAssetWithFolder | null>(null);
    const [previewType, setPreviewType] = useState<PreviewType>(null);

    const handleAssetPreview = useCallback((asset: DataAssetWithFolder) => {
        const type = getAssetPreviewType(asset);
        if (type) {
            setPreviewAsset(asset);
            setPreviewType(type);
        }
    }, []);

    const handleClosePreview = useCallback(() => {
        setPreviewAsset(null);
        setPreviewType(null);
    }, []);

    return {
        previewAsset,
        previewType,
        handleAssetPreview,
        handleClosePreview,
    };
}
