'use client';

import * as React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { useOnline3DViewer } from '../hooks/useOnline3DViewer';
import type { Model } from 'online-3d-viewer';
import type { RenderMode } from '../hooks/useOnline3DViewer';

export interface ModelViewerProps {
  assetUrl: string;
  className?: string;
  showEdges?: boolean;
  onModelLoaded?: (model: Model) => void;
  onError?: (error: Error) => void;
  onControlsReady?: (controls: ModelViewerControls) => void;
}

export interface ModelViewerControls {
  toggleEdges: () => void;
  resetView: () => void;
  highlightNode: (nodeId: number) => void;
  clearHighlight: () => void;
  edgesEnabled: boolean;
  /** Story 9.4 AC#2 */
  renderMode: RenderMode;
  /** Story 9.4 AC#2 */
  toggleRenderMode: () => void;
}

export function ModelViewer({
  assetUrl,
  className,
  showEdges = true,
  onModelLoaded,
  onError,
  onControlsReady,
}: ModelViewerProps) {
  const {
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
    toggleRenderMode,
  } = useOnline3DViewer({
    modelUrl: assetUrl,
    showEdges,
  });

  // Notify parent when model loads
  React.useEffect(() => {
    if (model && onModelLoaded) {
      onModelLoaded(model);
    }
  }, [model, onModelLoaded]);

  // Notify parent on error
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Provide controls to parent
  React.useEffect(() => {
    if (onControlsReady && !isLoading && !error) {
      onControlsReady({
        toggleEdges,
        resetView,
        highlightNode,
        clearHighlight,
        edgesEnabled,
        renderMode,
        toggleRenderMode,
      });
    }
  }, [
    onControlsReady,
    isLoading,
    error,
    toggleEdges,
    resetView,
    highlightNode,
    clearHighlight,
    edgesEnabled,
    renderMode,
    toggleRenderMode,
  ]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn('relative w-full h-full min-h-[400px]', className)}
      data-testid="model-viewer-container"
    >
      {/* 3D Viewer Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        data-testid="viewer-canvas"
      />

      {/* Loading State */}
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-900/80"
          data-testid="loading-state"
        >
          <Loader2
            className="w-8 h-8 text-blue-500 animate-spin"
            data-testid="loading-spinner"
          />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            加载中...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/90 dark:bg-red-900/30"
          data-testid="error-state"
        >
          <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            加载失败
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md text-center px-4">
            {error.message || '无法加载模型文件，请检查文件格式或网络连接'}
          </p>
          <Button
            variant="outline"
            className="mt-6 border-red-300 text-red-600 hover:bg-red-50"
            onClick={handleRetry}
          >
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
