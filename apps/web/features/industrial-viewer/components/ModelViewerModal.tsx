'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { ModelViewer, type ModelViewerControls } from './ModelViewer';
import { ViewerToolbar } from './ViewerToolbar';
import { ModelStructureTree } from './ModelStructureTree';
import type { Model } from 'online-3d-viewer';

export interface ModelViewerModalProps {
  assetUrl: string;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ModelViewerModal({
  assetUrl,
  assetName,
  isOpen,
  onClose,
}: ModelViewerModalProps) {
  const [model, setModel] = React.useState<Model | null>(null);
  const [controls, setControls] = React.useState<ModelViewerControls | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [isTreePanelOpen, setIsTreePanelOpen] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fullscreen toggle
  const toggleFullscreen = React.useCallback(() => {
    if (!modalRef.current) return;
    if (!isFullscreen) {
      modalRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle node selection
  const handleNodeSelect = React.useCallback(
    (nodeId: number) => {
      setSelectedNodeId(nodeId);
      controls?.highlightNode(nodeId);
    },
    [controls]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm isolate"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="model-viewer-modal"
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden',
          'border border-gray-200 dark:border-gray-800',
          'flex flex-col',
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-[80vw] h-[80vh] max-w-[1200px] max-h-[800px]'
        )}
      >
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 relative z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTreePanelOpen((prev) => !prev)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              title={isTreePanelOpen ? '隐藏结构树' : '显示结构树'}
              data-testid="toggle-structure-tree"
            >
              {isTreePanelOpen ? (
                <PanelLeftClose className="w-4 h-4 text-gray-500" />
              ) : (
                <PanelLeft className="w-4 h-4 text-gray-500" />
              )}
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[300px]">
              {assetName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Structure Tree Panel */}
          {isTreePanelOpen && (
            <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  模型结构
                </span>
              </div>
              <ModelStructureTree
                model={model}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                className="flex-1"
              />
            </div>
          )}

          {/* 3D Viewer */}
          <div className="flex-1 min-w-0 relative">
            <ModelViewer
              assetUrl={assetUrl}
              onModelLoaded={setModel}
              onControlsReady={setControls}
            />
            {controls && (
              <ViewerToolbar
                edgesEnabled={controls.edgesEnabled}
                isFullscreen={isFullscreen}
                onToggleEdges={controls.toggleEdges}
                onResetView={controls.resetView}
                onToggleFullscreen={toggleFullscreen}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to body
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
