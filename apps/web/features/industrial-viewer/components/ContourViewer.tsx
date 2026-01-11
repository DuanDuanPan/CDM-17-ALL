'use client';

import * as React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { useContourViewer } from '../hooks/useContourViewer';
import type { ColorMapType } from './ColorBar';

export interface ContourViewerProps {
  dataUrl: string;
  colorMap?: ColorMapType;
  className?: string;
  onControlsReady?: (controls: ContourViewerControls) => void;
  onError?: (error: Error) => void;
}

export interface ContourViewerControls {
  colorMap: ColorMapType;
  setColorMap: (map: ColorMapType) => void;
  range: { min: number; max: number };
  setRange: (min: number, max: number) => void;
  scalarName: string | null;
  unit: string | null;
}

export function ContourViewer({
  dataUrl,
  colorMap: initialColorMap = 'rainbow',
  className,
  onControlsReady,
  onError,
}: ContourViewerProps) {
  const { containerRef, isLoading, error, colorMap, setColorMap, range, setRange, scalarName, unit } = useContourViewer({
    dataUrl,
    colorMap: initialColorMap,
  });

  React.useEffect(() => {
    if (!isLoading && !error) onControlsReady?.({ colorMap, setColorMap, range, setRange, scalarName, unit });
  }, [colorMap, error, isLoading, onControlsReady, range, scalarName, setColorMap, setRange, unit]);

  React.useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  return (
    <div className={cn('relative w-full h-full min-h-[400px]', className)} data-testid="contour-viewer-container">
      <div ref={containerRef} className="w-full h-full" data-testid="vtk-canvas" />

      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/80" data-testid="loading-state">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" data-testid="loading-spinner" />
          <p className="mt-4 text-sm text-gray-400">加载云图数据...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-900/30" data-testid="error-state">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-100">加载失败</h3>
          <p className="mt-2 text-sm text-gray-400 max-w-md text-center px-4">{error.message || '无法加载云图数据'}</p>
          <Button
            variant="outline"
            className="mt-6 border-red-400 text-red-400 hover:bg-red-900/50"
            onClick={() => window.location.reload()}
          >
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
