'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmbeddedViewer, Model } from 'online-3d-viewer';
import {
  loadExternalLibrary,
  getRequiredLibraryForFormat,
} from '../utils/externalLibraryLoader';

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
}

// Store OV module reference
let ovModule: typeof import('online-3d-viewer') | null = null;

export function useOnline3DViewer(
  options: UseOnline3DViewerOptions
): UseOnline3DViewerResult {
  const { modelUrl, showEdges = true, backgroundColor } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<EmbeddedViewer | null>(null);
  // PMREM render target (from three) tied to the viewer's WebGL context
  const environmentRenderTargetRef = useRef<unknown>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [edgesEnabled, setEdgesEnabled] = useState(showEdges);

  // Track destroyed state across async operations
  const destroyedRef = useRef(false);

  // Initialize viewer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !modelUrl) return;

    destroyedRef.current = false;

    const initViewer = async () => {
      console.log('[UseOnline3DViewer] Starting initialization', { modelUrl });
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        console.log('[UseOnline3DViewer] Importing OV module...');
        const OV = await import('online-3d-viewer');
        ovModule = OV;
        console.log('[UseOnline3DViewer] OV module imported');

        // Pre-load external library if needed for this format (offline support)
        const fileExtension = modelUrl.split('.').pop()?.toLowerCase() || '';
        const requiredLibrary = getRequiredLibraryForFormat(fileExtension);
        if (requiredLibrary) {
          console.log(`[UseOnline3DViewer] Pre-loading external library: ${requiredLibrary}`);
          try {
            await loadExternalLibrary(requiredLibrary);
          } catch (libErr) {
            console.warn(`[UseOnline3DViewer] External library load failed (may not be needed): ${requiredLibrary}`, libErr);
            // Continue anyway - library may not be needed for this specific file
          }
        }

        if (destroyedRef.current) {
          console.log('[UseOnline3DViewer] Component destroyed, aborting init');
          return;
        }

        // Clean up previous viewer
        if (viewerRef.current) {
          console.log('[UseOnline3DViewer] Destroying previous viewer');
          viewerRef.current.Destroy();
          viewerRef.current = null;
        }

        // Dispose previously generated environment map (if any)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (environmentRenderTargetRef.current as any)?.dispose?.();
        } catch (disposeErr) {
          console.warn('[UseOnline3DViewer] Failed to dispose previous environment target:', disposeErr);
        }
        environmentRenderTargetRef.current = null;

        // Clear container children (EmbeddedViewer doesn't remove its canvas on Destroy)
        // This prevents multiple canvases from accumulating when re-initializing.
        container.replaceChildren();

        // Ensure URL is absolute if relative
        const absoluteUrl = modelUrl.startsWith('http')
          ? modelUrl
          : new URL(modelUrl, window.location.origin).href;

        // Create viewer with settings and callbacks
        // Note: callbacks must be passed to constructor, not LoadModelFromUrlList
        console.log('[UseOnline3DViewer] Creating new EmbeddedViewer');
        const bgColor = backgroundColor ?? { r: 245, g: 245, b: 245, a: 255 };
        const viewer = new OV.EmbeddedViewer(container, {
          backgroundColor: new OV.RGBAColor(
            bgColor.r,
            bgColor.g,
            bgColor.b,
            bgColor.a
          ),
          defaultColor: new OV.RGBColor(200, 200, 200),
          edgeSettings: new OV.EdgeSettings(
            edgesEnabled,
            new OV.RGBColor(0, 0, 0),
            1
          ),
          onModelLoaded: () => {
            console.log('[UseOnline3DViewer] Model loaded successfully');
            if (destroyedRef.current) return;

            setIsLoading(false);
            setModel(viewer.GetModel());

            // Improve PBR appearance: Online3DViewer switches to Physical shading which expects an environment map.
            // We apply a safe fallback (brighten built-in lights), and then try to generate a PMREM environment.
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const innerViewer = viewer.GetViewer() as any;
              if (!innerViewer) return;

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
                console.warn('[UseOnline3DViewer] Failed to adjust built-in lights:', lightAdjustErr);
              }

              const shadingType = innerViewer.GetShadingType?.();
              if (shadingType !== OV.ShadingType?.Physical) return;

              // If an environment is already present, don't override it.
              if (innerViewer.scene?.environment) return;

              // Try to create a simple environment using RoomEnvironment (improves metallic/roughness appearance).
              import('three')
                .then(async (THREE) => {
                  try {
                    const { RoomEnvironment } = await import(
                      'three/examples/jsm/environments/RoomEnvironment.js'
                    );
                    const renderer = innerViewer.renderer as unknown;
                    const scene = innerViewer.scene as unknown;
                    if (!renderer || !scene) return;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pmrem = new (THREE as any).PMREMGenerator(renderer);
                    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
                    pmrem.dispose();

                    environmentRenderTargetRef.current = envRT;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (scene as any).environment = envRT.texture;

                    innerViewer.Render?.();
                    console.log('[UseOnline3DViewer] Default environment applied for PBR materials');
                  } catch (envErr) {
                    console.warn('[UseOnline3DViewer] Could not create environment map:', envErr);
                  }
                })
                .catch((threeErr) => {
                  console.warn('[UseOnline3DViewer] Could not import three.js:', threeErr);
                });
            } catch (enhanceErr) {
              console.warn('[UseOnline3DViewer] Could not enhance PBR appearance:', enhanceErr);
            }
          },
          onModelLoadFailed: () => {
            console.error('[UseOnline3DViewer] Model load failed');
            if (destroyedRef.current) return;
            setIsLoading(false);
            setError(new Error('Failed to load model'));
          },
        });

        viewerRef.current = viewer;

        // Load model (no callbacks parameter - they're in the constructor)
        console.log('[UseOnline3DViewer] Calling LoadModelFromUrlList', absoluteUrl);
        viewer.LoadModelFromUrlList([absoluteUrl]);
      } catch (err) {
        console.error('[UseOnline3DViewer] Initialization exception:', err);
        if (destroyedRef.current) return;
        setIsLoading(false);
        setError(
          err instanceof Error ? err : new Error('Failed to initialize viewer')
        );
      }
    };

    initViewer();

    // ResizeObserver for responsive sizing
    const resizeObserver = new ResizeObserver(() => {
      viewerRef.current?.Resize();
    });
    resizeObserver.observe(container);

    return () => {
      destroyedRef.current = true;
      resizeObserver.disconnect();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (environmentRenderTargetRef.current as any)?.dispose?.();
      } catch (disposeErr) {
        console.warn('[UseOnline3DViewer] Failed to dispose environment target on cleanup:', disposeErr);
      }
      environmentRenderTargetRef.current = null;
      if (viewerRef.current) {
        viewerRef.current.Destroy();
        viewerRef.current = null;
      }
      // Remove any canvases/progress divs inserted by EmbeddedViewer
      container.replaceChildren();
    };
  }, [modelUrl, backgroundColor]);

  // Toggle edges (updates viewer in place)
  const toggleEdges = useCallback(() => {
    setEdgesEnabled((prev) => {
      const next = !prev;
      const embeddedViewer = viewerRef.current;
      const OV = ovModule;
      if (!embeddedViewer || !OV) {
        return next;
      }

      try {
        const innerViewer = embeddedViewer.GetViewer();
        innerViewer?.SetEdgeSettings?.(
          new OV.EdgeSettings(next, new OV.RGBColor(0, 0, 0), 1)
        );
      } catch (err) {
        console.warn('[UseOnline3DViewer] Failed to toggle edges:', err);
      }
      return next;
    });
  }, []);

  // Reset view to fit model
  const resetView = useCallback(() => {
    const embeddedViewer = viewerRef.current;
    const OV = ovModule;
    if (!embeddedViewer || !OV) return;

    const loadedModel = embeddedViewer.GetModel();
    if (!loadedModel) return;

    const innerViewer = embeddedViewer.GetViewer();
    if (!innerViewer) return;

    try {
      const boundingSphere = innerViewer.GetBoundingSphere(() => true);
      if (!boundingSphere) return;

      // Restore default up vector and refit (matches EmbeddedViewer initial behavior)
      innerViewer.SetUpVector?.(OV.Direction.Y, false);
      innerViewer.AdjustClippingPlanesToSphere?.(boundingSphere);
      innerViewer.FitSphereToWindow(boundingSphere, true);
      innerViewer.Render?.();
    } catch (err) {
      console.warn('[UseOnline3DViewer] Failed to reset view:', err);
    }
  }, []);

  // Highlight a node (and its subtree) in the viewer using Online3DViewer's mesh userdata mapping.
  const highlightNode = useCallback((nodeId: number) => {
    const embeddedViewer = viewerRef.current;
    const OV = ovModule;
    if (!embeddedViewer || !OV) return;

    const innerViewer = embeddedViewer.GetViewer();
    if (!innerViewer) return;

    try {
      innerViewer.SetMeshesHighlight?.(
        new OV.RGBColor(255, 200, 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meshUserData: any) => {
          // Mesh userData contains the originalMeshInstance (see threeconverter.js in online-3d-viewer)
          let node = meshUserData?.originalMeshInstance?.GetNode?.();
          while (node) {
            if (node.GetId?.() === nodeId) return true;
            node = node.GetParent?.();
          }
          return false;
        }
      );
    } catch (err) {
      console.warn('[UseOnline3DViewer] Failed to highlight node:', err);
    }
  }, []);

  // Clear all highlights
  const clearHighlight = useCallback(() => {
    const embeddedViewer = viewerRef.current;
    const OV = ovModule;
    if (!embeddedViewer || !OV) return;

    const innerViewer = embeddedViewer.GetViewer();
    if (!innerViewer) return;

    try {
      innerViewer.SetMeshesHighlight?.(
        new OV.RGBColor(255, 200, 0),
        () => false
      );
    } catch (err) {
      console.warn('[UseOnline3DViewer] Failed to clear highlight:', err);
    }
  }, []);

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
  };
}
