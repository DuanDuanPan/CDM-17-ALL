'use client';

/**
 * useViewerEnhancement - PBR Environment Enhancement Hook
 *
 * Story 9.4 Task 0.1: Extracted from useOnline3DViewer.ts to comply with 300-line limit.
 * Provides PBR material enhancement for Online3DViewer-based viewers.
 */

import { useRef, useCallback } from 'react';
import type { EmbeddedViewer } from 'online-3d-viewer';

export interface UseViewerEnhancementResult {
    /**
     * Enhance PBR appearance for a loaded model.
     * Brightens built-in lights and applies RoomEnvironment for metallic/roughness materials.
     */
    enhancePbrAppearance: (viewer: EmbeddedViewer) => void;
    /**
     * Dispose any created environment resources (PMREM render target).
     */
    disposeEnvironment: () => void;
}

/**
 * Hook that provides PBR environment map enhancement for Online3DViewer.
 * Improves appearance of metallic/roughness materials by applying RoomEnvironment.
 */
export function useViewerEnhancement(): UseViewerEnhancementResult {
    // PMREM render target (from three) tied to the viewer's WebGL context
    const environmentRenderTargetRef = useRef<unknown>(null);
    // Track current viewer instance to abort stale async operations
    const currentViewerRef = useRef<EmbeddedViewer | null>(null);

    /**
     * Enhance PBR appearance for the given viewer.
     * - Brightens built-in lights for visibility even without env maps.
     * - Applies RoomEnvironment if Physical shading is active and no environment exists.
     */
    const enhancePbrAppearance = useCallback(async (viewer: EmbeddedViewer) => {
        // Track current viewer to detect if destroyed/switched during async ops
        currentViewerRef.current = viewer;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const innerViewer = viewer.GetViewer() as any;
            if (!innerViewer) return;

            // Abort guard: check if still the active viewer
            const isStale = () => currentViewerRef.current !== viewer;

            // Brighten built-in lights (no extra deps) so materials are visible even without env maps.
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const shadingModel = innerViewer.shadingModel as any;
                if (shadingModel?.ambientLight?.color?.set) {
                    shadingModel.ambientLight.color.set(0x555555);
                }
                if (shadingModel?.directionalLight?.color?.set) {
                    shadingModel.directionalLight.color.set(0xffffff);
                }
                innerViewer.Render?.();
            } catch (lightAdjustErr) {
                console.warn('[useViewerEnhancement] Failed to adjust built-in lights:', lightAdjustErr);
            }

            // Check if Physical shading is active
            const OV = await import('online-3d-viewer');
            if (isStale()) return; // Abort if viewer changed during import
            const shadingType = innerViewer.GetShadingType?.();
            if (shadingType !== OV.ShadingType?.Physical) return;

            // If an environment is already present, don't override it.
            if (innerViewer.scene?.environment) return;

            // Try to create a simple environment using RoomEnvironment (improves metallic/roughness appearance).
            try {
                const THREE = await import('three');
                const { RoomEnvironment } = await import(
                    'three/examples/jsm/environments/RoomEnvironment.js'
                );
                const renderer = innerViewer.renderer as unknown;
                const scene = innerViewer.scene as unknown;
                if (!renderer || !scene) return;

                // Dispose previous environment if exists
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (environmentRenderTargetRef.current as any)?.dispose?.();
                } catch {
                    // Ignore disposal errors
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pmrem = new (THREE as any).PMREMGenerator(renderer);
                const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
                pmrem.dispose();

                // Abort if viewer changed during PMREM generation
                if (isStale()) {
                    envRT?.dispose?.();
                    return;
                }

                environmentRenderTargetRef.current = envRT;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (scene as any).environment = envRT.texture;

                innerViewer.Render?.();
                // Use debug level for non-critical info logging
                if (process.env.NODE_ENV === 'development') {
                    console.debug('[useViewerEnhancement] Default environment applied for PBR materials');
                }
            } catch (envErr) {
                console.warn('[useViewerEnhancement] Could not create environment map:', envErr);
            }
        } catch (enhanceErr) {
            console.warn('[useViewerEnhancement] Could not enhance PBR appearance:', enhanceErr);
        }
    }, []);

    /**
     * Dispose any created environment resources.
     */
    const disposeEnvironment = useCallback(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (environmentRenderTargetRef.current as any)?.dispose?.();
        } catch (disposeErr) {
            console.warn('[useViewerEnhancement] Failed to dispose environment target:', disposeErr);
        }
        environmentRenderTargetRef.current = null;
    }, []);

    return {
        enhancePbrAppearance,
        disposeEnvironment,
    };
}
