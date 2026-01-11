'use client';

/**
 * useOnline3DViewer Hook
 *
 * Story 9.3: Core hook for Online3DViewer integration.
 * Story 9.4 Task 0.1: Refactored to comply with 300-line limit.
 * Story 9.4 Task 1.1: Added renderMode support (solid/wireframe).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmbeddedViewer, Model } from 'online-3d-viewer';
import {
  loadExternalLibrary,
  getRequiredLibraryForFormat,
} from '../utils/externalLibraryLoader';
import { isMeshUserDataInNodeSubtree } from '../utils/meshHighlight';
import { useViewerEnhancement } from './useViewerEnhancement';

/** Render mode for mesh display */
export type RenderMode = 'solid' | 'wireframe';

export interface UseOnline3DViewerOptions {
  modelUrl: string;
  showEdges?: boolean;
  backgroundColor?: { r: number; g: number; b: number; a: number };
}

export interface UseOnline3DViewerResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: Error | null;
  model: Model | null;
  edgesEnabled: boolean;
  toggleEdges: () => void;
  resetView: () => void;
  highlightNode: (nodeId: number) => void;
  clearHighlight: () => void;
  /** Story 9.4 AC#2: Current render mode (solid/wireframe) */
  renderMode: RenderMode;
  /** Story 9.4 AC#2: Set render mode */
  setRenderMode: (mode: RenderMode) => void;
  /** Story 9.4 AC#2: Toggle between solid and wireframe */
  toggleRenderMode: () => void;
}

// Store OV module reference
let ovModule: typeof import('online-3d-viewer') | null = null;

export function useOnline3DViewer(
  options: UseOnline3DViewerOptions
): UseOnline3DViewerResult {
  const { modelUrl, showEdges = true, backgroundColor } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<EmbeddedViewer | null>(null);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [edgesEnabled, setEdgesEnabled] = useState(showEdges);
  const [renderMode, setRenderModeState] = useState<RenderMode>('solid');
  const destroyedRef = useRef(false);

  // Story 9.4 Task 0.1: Use extracted PBR enhancement hook
  const { enhancePbrAppearance, disposeEnvironment } = useViewerEnhancement();

  // Initialize viewer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !modelUrl) return;

    destroyedRef.current = false;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const OV = await import('online-3d-viewer');
        ovModule = OV;

        if (destroyedRef.current) return;

        // Pre-load external library if needed
        const fileExtension = modelUrl.split('.').pop()?.toLowerCase() || '';
        const requiredLibrary = getRequiredLibraryForFormat(fileExtension);
        if (requiredLibrary) {
          try {
            await loadExternalLibrary(requiredLibrary);
          } catch {
            // Continue anyway - library may not be needed
          }
        }

        if (destroyedRef.current) return;

        // Cleanup previous viewer
        if (viewerRef.current) {
          viewerRef.current.Destroy();
          viewerRef.current = null;
        }
        const previousHost = viewerHostRef.current;
        if (previousHost?.parentElement === container) {
          container.removeChild(previousHost);
        }
        viewerHostRef.current = null;
        disposeEnvironment();

        // Create host element
        const host = document.createElement('div');
        host.style.cssText = 'width:100%;height:100%';
        host.className = 'w-full h-full';
        container.appendChild(host);
        viewerHostRef.current = host;

        const absoluteUrl = modelUrl.startsWith('http')
          ? modelUrl
          : new URL(modelUrl, window.location.origin).href;

        const bgColor = backgroundColor ?? { r: 245, g: 245, b: 245, a: 255 };
        const viewer = new OV.EmbeddedViewer(host, {
          backgroundColor: new OV.RGBAColor(bgColor.r, bgColor.g, bgColor.b, bgColor.a),
          defaultColor: new OV.RGBColor(200, 200, 200),
          edgeSettings: new OV.EdgeSettings(edgesEnabled, new OV.RGBColor(0, 0, 0), 1),
          onModelLoaded: () => {
            if (destroyedRef.current) return;
            setIsLoading(false);
            setModel(viewer.GetModel());
            // Story 9.4: Apply PBR enhancements using extracted hook
            enhancePbrAppearance(viewer);
          },
          onModelLoadFailed: () => {
            if (destroyedRef.current) return;
            setIsLoading(false);
            setError(new Error('Failed to load model'));
          },
        });

        viewerRef.current = viewer;
        viewer.LoadModelFromUrlList([absoluteUrl]);
      } catch (err) {
        if (destroyedRef.current) return;
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to initialize viewer'));
      }
    };

    initViewer();

    const resizeObserver = new ResizeObserver(() => viewerRef.current?.Resize());
    resizeObserver.observe(container);

    return () => {
      destroyedRef.current = true;
      resizeObserver.disconnect();
      disposeEnvironment();
      viewerRef.current?.Destroy();
      viewerRef.current = null;
      const currentHost = viewerHostRef.current;
      if (currentHost?.parentElement === container) {
        container.removeChild(currentHost);
      }
      viewerHostRef.current = null;
    };
  }, [modelUrl, backgroundColor, enhancePbrAppearance, disposeEnvironment]);

  // Toggle edges
  const toggleEdges = useCallback(() => {
    setEdgesEnabled((prev) => {
      const next = !prev;
      const OV = ovModule;
      const innerViewer = viewerRef.current?.GetViewer();
      if (innerViewer && OV) {
        try {
          innerViewer.SetEdgeSettings?.(new OV.EdgeSettings(next, new OV.RGBColor(0, 0, 0), 1));
        } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    const OV = ovModule;
    const embeddedViewer = viewerRef.current;
    if (!embeddedViewer || !OV) return;
    const innerViewer = embeddedViewer.GetViewer();
    if (!innerViewer || !embeddedViewer.GetModel()) return;
    try {
      const boundingSphere = innerViewer.GetBoundingSphere(() => true);
      if (!boundingSphere) return;
      innerViewer.SetUpVector?.(OV.Direction.Y, false);
      innerViewer.AdjustClippingPlanesToSphere?.(boundingSphere);
      innerViewer.FitSphereToWindow(boundingSphere, true);
      innerViewer.Render?.();
    } catch { /* ignore */ }
  }, []);

  // Highlight node
  const highlightNode = useCallback((nodeId: number) => {
    const OV = ovModule;
    const innerViewer = viewerRef.current?.GetViewer();
    if (!innerViewer || !OV) return;
    try {
      innerViewer.SetMeshesHighlight?.(
        new OV.RGBColor(255, 200, 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meshUserData: any) => isMeshUserDataInNodeSubtree(meshUserData, nodeId)
      );
    } catch { /* ignore */ }
  }, []);

  // Clear highlight
  const clearHighlight = useCallback(() => {
    const OV = ovModule;
    const innerViewer = viewerRef.current?.GetViewer();
    if (!innerViewer || !OV) return;
    try {
      innerViewer.SetMeshesHighlight?.(new OV.RGBColor(255, 200, 0), () => false);
    } catch { /* ignore */ }
  }, []);

  /**
   * Story 9.4 AC#2: Set render mode (solid/wireframe)
   * Implementation: Traverse Three.js meshes and set material.wireframe property.
   * Note: Does NOT use OV.ShadingType.Lines (which doesn't exist).
   */
  const setRenderMode = useCallback((mode: RenderMode) => {
    setRenderModeState(mode);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const innerViewer = viewerRef.current?.GetViewer() as any;
    if (!innerViewer) return;

    try {
      const scene = innerViewer.scene;
      if (!scene) return;

      const isWireframe = mode === 'wireframe';
      // Traverse all meshes and set wireframe mode
      scene.traverse?.((obj: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mesh = obj as any;
        if (mesh.isMesh && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: { wireframe?: boolean }) => {
              mat.wireframe = isWireframe;
            });
          } else {
            mesh.material.wireframe = isWireframe;
          }
        }
      });
      innerViewer.Render?.();
    } catch (err) {
      console.warn('[UseOnline3DViewer] Failed to set render mode:', err);
    }
  }, []);

  // Toggle render mode
  const toggleRenderMode = useCallback(() => {
    setRenderMode(renderMode === 'solid' ? 'wireframe' : 'solid');
  }, [renderMode, setRenderMode]);

  return {
    containerRef,
    isLoading,
    error,
    model,
    edgesEnabled,
    toggleEdges,
    resetView,
    highlightNode,
    clearHighlight,
    renderMode,
    setRenderMode,
    toggleRenderMode,
  };
}
