/**
 * Story 9.4: getAssetPreviewType Utility Tests
 * 
 * Task 4.2.6: Tests for STL/OBJ/VTP/VTK/VTU/VTI/JSON/tags/STEP/glTF/unsupported.
 */

import { describe, it, expect } from 'vitest';
import { getAssetPreviewType } from '../hooks/useAssetPreview';
import type { DataAssetWithFolder, DataAssetFormat } from '@cdm/types';

// Helper to create mock asset with proper types
const createMockAsset = (overrides: {
    id?: string;
    name?: string;
    format?: DataAssetFormat;
    storagePath?: string | null;
    tags?: string[];
    description?: string | null;
    graphId?: string;
    folderId?: string | null;
    folder?: null;
}): DataAssetWithFolder => ({
    id: overrides.id ?? 'test-id',
    name: overrides.name ?? 'test-asset',
    format: overrides.format ?? 'OTHER',
    storagePath: overrides.storagePath ?? null,
    tags: overrides.tags ?? [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    graphId: overrides.graphId ?? 'test-graph',
    description: overrides.description ?? null,
    folderId: overrides.folderId ?? null,
    folder: overrides.folder ?? null,
    version: 'v1.0.0',
    secretLevel: 'internal',
});

describe('getAssetPreviewType', () => {
    // === Mesh formats (STL/OBJ) → 'model' ===

    it('returns "model" for STL files', () => {
        const asset = createMockAsset({ format: 'STL', name: 'mesh.stl' });
        expect(getAssetPreviewType(asset)).toBe('model');
    });

    it('returns "model" for OBJ files', () => {
        const asset = createMockAsset({ format: 'OBJ', name: 'mesh.obj' });
        expect(getAssetPreviewType(asset)).toBe('model');
    });

    // === VTK formats → 'contour' ===

    it('returns "contour" for .vtp files', () => {
        const asset = createMockAsset({ format: 'OTHER', storagePath: '/data/thermal.vtp' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    it('returns "contour" for .vtk files', () => {
        const asset = createMockAsset({ format: 'OTHER', storagePath: '/data/stress.vtk' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    it('returns "contour" for .vtu files', () => {
        const asset = createMockAsset({ format: 'OTHER', storagePath: '/data/mesh.vtu' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    it('returns "contour" for .vti files', () => {
        const asset = createMockAsset({ format: 'OTHER', storagePath: '/data/volume.vti' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    // === JSON Scalar Field → 'contour' ===

    it('returns "contour" for .scalar.json files', () => {
        const asset = createMockAsset({ format: 'JSON', storagePath: '/data/stress.scalar.json' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    it('returns "contour" for .contour.json files', () => {
        const asset = createMockAsset({ format: 'JSON', storagePath: '/data/thermal.contour.json' });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    it('returns "contour" for files with CONTOUR tag', () => {
        const asset = createMockAsset({ format: 'JSON', name: 'data.json', tags: ['CONTOUR', 'SIMULATION'] });
        expect(getAssetPreviewType(asset)).toBe('contour');
    });

    // === CAD formats (Story 9.3) → 'model' ===

    it('returns "model" for STEP files', () => {
        const asset = createMockAsset({ format: 'STEP', name: 'satellite.step' });
        expect(getAssetPreviewType(asset)).toBe('model');
    });

    it('returns "model" for glTF files', () => {
        const asset = createMockAsset({ format: 'GLTF', name: 'model.gltf' });
        expect(getAssetPreviewType(asset)).toBe('model');
    });

    it('returns "model" for FBX files (as GLB substitute)', () => {
        // Note: GLB is not in DataAssetFormat enum, using FBX as another CAD format
        const asset = createMockAsset({ format: 'FBX', name: 'model.fbx' });
        expect(getAssetPreviewType(asset)).toBe('model');
    });

    // === Unsupported formats → null ===

    it('returns null for unsupported formats', () => {
        const asset = createMockAsset({ format: 'PDF', name: 'document.pdf' });
        expect(getAssetPreviewType(asset)).toBeNull();
    });

    it('returns null for plain JSON without scalar/contour extension or tag', () => {
        const asset = createMockAsset({ format: 'JSON', name: 'config.json', tags: [] });
        expect(getAssetPreviewType(asset)).toBeNull();
    });

    it('returns null for OTHER format without VTK extension', () => {
        const asset = createMockAsset({ format: 'OTHER', name: 'unknown.xyz' });
        expect(getAssetPreviewType(asset)).toBeNull();
    });
});
