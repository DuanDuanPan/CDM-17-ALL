'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyColorMap } from '../constants/colorMaps';
import { loadContourData } from '../utils/loadContourData';
import type { ColorMapType } from '../components/ColorBar';
import type { UseContourViewerOptions, UseContourViewerResult, VtkRefs } from '../types/contour';
function isTraverseTypeError(error: unknown) {
  return error instanceof TypeError && typeof error.message === 'string' && error.message.includes('traverse');
}
export function useContourViewer(options: UseContourViewerOptions): UseContourViewerResult {
  const { dataUrl, colorMap: initialColorMap = 'rainbow', initialMin, initialMax } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initIdRef = useRef(0);
  const vtkRefs = useRef<VtkRefs>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [colorMap, setColorMapState] = useState<ColorMapType>(initialColorMap);
  const [range, setRangeState] = useState({ min: initialMin ?? 0, max: initialMax ?? 1 });
  const [scalarName, setScalarName] = useState<string | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const cleanupViewer = useCallback(() => {
    try {
      vtkRefs.current.fullScreenRenderer?.delete();
    } catch { /* ignore */ }
    vtkRefs.current = {};
    const container = containerRef.current;
    if (container) container.innerHTML = '';
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !dataUrl) return;
    const initId = ++initIdRef.current;
    const isStale = () => initIdRef.current !== initId;
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        cleanupViewer();
        const loaded = await loadContourData(dataUrl);
        const data = loaded.data;
        let detectedScalarName: string | null = loaded.scalarName ?? null;
        const detectedUnit: string | null = loaded.unit ?? null;
        let scalarRange: [number, number] = loaded.scalarRange ?? [0, 1];
        if (isStale()) return;
        const scalars = (data as any)?.getPointData?.()?.getScalars?.();
        if (scalars?.getRange) scalarRange = scalars.getRange();
        if (scalars?.getName) detectedScalarName = detectedScalarName ?? scalars.getName();
        const min = initialMin ?? scalarRange[0], max = initialMax ?? scalarRange[1];
        try {
          await import('@kitware/vtk.js/Rendering/Profiles/Geometry');
          const [
            { default: vtkFullScreenRenderWindow },
            { default: vtkMapper },
            { default: vtkActor },
            { default: vtkColorTransferFunction },
          ] = await Promise.all([
            import('@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow'),
            import('@kitware/vtk.js/Rendering/Core/Mapper'),
            import('@kitware/vtk.js/Rendering/Core/Actor'),
            import('@kitware/vtk.js/Rendering/Core/ColorTransferFunction'),
          ]);
          if (isStale()) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let fullScreenRenderer: any = null;
          try {
            fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({ container, background: [0.1, 0.1, 0.15] });
            const renderer = fullScreenRenderer.getRenderer();
            const renderWindow = fullScreenRenderer.getRenderWindow();
            const lut = vtkColorTransferFunction.newInstance();
            applyColorMap(lut, colorMap, min, max);
            const mapper = vtkMapper.newInstance();
            mapper.setInputData(data);
            mapper.setLookupTable(lut);
            mapper.setScalarRange(min, max);
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            (renderer as any).addActor(actor);
            (renderer as any).resetCamera();
            (renderWindow as any).render();
            vtkRefs.current = { fullScreenRenderer, renderer, renderWindow, mapper, lut };
          } catch (err) {
            try {
              fullScreenRenderer?.delete?.();
            } catch { /* ignore */ }
            container.innerHTML = '';
            throw err;
          }
        } catch (renderError) {
          if (!isTraverseTypeError(renderError)) throw renderError;
          console.warn('[useContourViewer] VTK render failed (controls still available):', renderError);
        }
        setRangeState({ min, max });
        setScalarName(detectedScalarName);
        setUnit(detectedUnit);
        setIsLoading(false);
      } catch (err) {
        if (isStale()) return;
        const nextError = err instanceof Error ? err : new Error('Failed to load contour data');
        setError(nextError);
        setIsLoading(false);
      }
    };
    void init();
    return () => {
      initIdRef.current++;
      cleanupViewer();
    };
  }, [cleanupViewer, dataUrl, initialMax, initialMin]);
  const setColorMap = useCallback((map: ColorMapType) => {
    setColorMapState(map);
    const { lut, renderWindow } = vtkRefs.current;
    if (!lut || !renderWindow) return;
    applyColorMap(lut, map, range.min, range.max);
    renderWindow.render();
  }, [range.max, range.min]);

  const setRange = useCallback((min: number, max: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return;
    setRangeState({ min, max });
    const { lut, mapper, renderWindow } = vtkRefs.current;
    if (!lut || !mapper || !renderWindow) return;
    applyColorMap(lut, colorMap, min, max);
    mapper.setScalarRange(min, max);
    renderWindow.render();
  }, [colorMap]);

  return { containerRef, isLoading, error, colorMap, setColorMap, range, setRange, scalarName, unit };
}
