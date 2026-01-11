'use client';

import * as React from 'react';
import { Home, Maximize2, Minimize2 } from 'lucide-react';
import { Button, cn } from '@cdm/ui';

export interface ViewerToolbarProps {
  edgesEnabled: boolean;
  isFullscreen?: boolean;
  onToggleEdges: () => void;
  onResetView: () => void;
  onToggleFullscreen?: () => void;
  className?: string;
}

export function ViewerToolbar({
  edgesEnabled,
  isFullscreen = false,
  onToggleEdges,
  onResetView,
  onToggleFullscreen,
  className,
}: ViewerToolbarProps) {
  return (
    <div
      className={cn(
        'absolute bottom-6 left-1/2 -translate-x-1/2 z-20',
        'h-10 px-3 bg-gray-900/90 backdrop-blur text-white rounded-full',
        'flex items-center gap-2 shadow-lg',
        className
      )}
      data-testid="viewer-toolbar"
    >
      {/* Reset View Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onResetView}
        className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white"
        title="重置视角"
        data-testid="reset-view-button"
      >
        <Home className="w-4 h-4" />
      </Button>

      <div className="w-px h-5 bg-gray-600" />

      {/* Edge Toggle - Custom switch (Switch component not available in @cdm/ui) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">边线</span>
        <button
          type="button"
          role="switch"
          aria-checked={edgesEnabled}
          onClick={onToggleEdges}
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            edgesEnabled ? 'bg-green-500' : 'bg-gray-600'
          )}
          data-testid="edge-toggle"
          data-state={edgesEnabled ? 'checked' : 'unchecked'}
          title={edgesEnabled ? '隐藏边线' : '显示边线'}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
              edgesEnabled ? 'left-[18px]' : 'left-0.5'
            )}
          />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-600" />

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white"
          title={isFullscreen ? '退出全屏' : '全屏显示'}
          data-testid="fullscreen-toggle"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}
