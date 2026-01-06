'use client';

import { GitBranch, AlignLeft, Move, Grid3X3, Network } from 'lucide-react';
import { LayoutMode } from '@cdm/types';

export interface LayoutSwitcherProps {
  currentMode?: LayoutMode;
  onModeChange?: (mode: LayoutMode) => void;
  onGridToggle?: (enabled: boolean) => void;
  gridEnabled?: boolean;
  isLoading?: boolean;
}

/**
 * LayoutSwitcher - UI component for switching between layout modes
 *
 * Provides:
 * - Mindmap layout (radial/tree structure)
 * - Logic layout (strict left-to-right)
 * - Free mode (manual positioning)
 * - Grid snapping toggle (only in Free mode)
 *
 * Story: 1.3 - Advanced Layout Control
 */
export function LayoutSwitcher({
  currentMode = 'mindmap',
  onModeChange,
  onGridToggle,
  gridEnabled = false,
  isLoading = false,
}: LayoutSwitcherProps) {
  // Use props directly (fully controlled component)
  const mode = currentMode;
  const isGridEnabled = gridEnabled;

  const handleModeChange = (newMode: LayoutMode) => {
    onModeChange?.(newMode);
  };

  const handleGridToggle = () => {
    const newGridState = !isGridEnabled;
    onGridToggle?.(newGridState);
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"
      data-testid="layout-switcher"
    >
      {/* Mindmap Mode */}
      <button
        onClick={() => handleModeChange('mindmap')}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'mindmap'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="layout-mindmap"
        title="思维导图模式 - 树状/放射状结构"
      >
        <GitBranch className="w-4 h-4" />
        <span className="text-sm font-medium">思维导图</span>
        {isLoading && mode === 'mindmap' && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Logic Mode */}
      <button
        onClick={() => handleModeChange('logic')}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'logic'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="layout-logic"
        title="逻辑图模式 - 垂直树形结构（上到下）"
      >
        <AlignLeft className="w-4 h-4" />
        <span className="text-sm font-medium">逻辑图</span>
        {isLoading && mode === 'logic' && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Free Mode */}
      <button
        onClick={() => handleModeChange('free')}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'free'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="layout-free"
        title="自由模式 - 手动拖拽节点位置"
      >
        <Move className="w-4 h-4" />
        <span className="text-sm font-medium">自由</span>
        {isLoading && mode === 'free' && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Network Mode */}
      <button
        onClick={() => handleModeChange('network')}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'network'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="layout-network"
        title="网络图模式 - 自动优化依赖连线 (Story 2.2)"
      >
        <Network className="w-4 h-4" />
        <span className="text-sm font-medium">网络图</span>
        {isLoading && mode === 'network' && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Grid Snapping Toggle (only visible in Free mode) */}
      {mode === 'free' && (
        <>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            onClick={handleGridToggle}
            className={`
              px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
              ${isGridEnabled
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }
            `}
            data-testid="grid-snap-toggle"
            title="网格吸附 - 对齐节点到网格"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="text-sm font-medium">网格吸附</span>
          </button>
        </>
      )}
    </div>
  );
}
