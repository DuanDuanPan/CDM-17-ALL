'use client';

import { useState } from 'react';
import {
  LayoutGrid,
  Shapes,
  Type,
  Image,
  Link2,
  ChevronLeft,
  ChevronRight,
  GitBranch, // Story 2.2: Icon for dependency mode
} from 'lucide-react';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'components', icon: <Shapes className="w-5 h-5" />, label: '组件' },
  { id: 'templates', icon: <LayoutGrid className="w-5 h-5" />, label: '模板' },
  { id: 'text', icon: <Type className="w-5 h-5" />, label: '文本' },
  { id: 'media', icon: <Image className="w-5 h-5" />, label: '媒体' },
  { id: 'links', icon: <Link2 className="w-5 h-5" />, label: '链接' },
];

// Story 2.2: Props for dependency mode
export interface LeftSidebarProps {
  /** Whether dependency mode is active */
  isDependencyMode?: boolean;
  /** Callback when dependency mode is toggled */
  onDependencyModeToggle?: () => void;
}

export function LeftSidebar({
  isDependencyMode = false,
  onDependencyModeToggle,
}: LeftSidebarProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeNav, setActiveNav] = useState('components');

  return (
    <aside className="relative flex h-full bg-white/80 backdrop-blur-md border-r border-gray-200/50">
      {/* Icon strip navigation */}
      <nav className="w-14 flex flex-col items-center py-4 border-r border-gray-100">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveNav(item.id);
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 transition-colors ${
              activeNav === item.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        {/* Story 2.2: Dependency mode toggle - separates from other nav items */}
        <div className="flex-1" /> {/* Spacer to push to bottom */}
        <div className="border-t border-gray-100 pt-2 w-full flex flex-col items-center">
          <button
            onClick={onDependencyModeToggle}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              isDependencyMode
                ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={isDependencyMode ? '退出依赖连线模式 (ESC)' : '依赖连线模式'}
          >
            <GitBranch className="w-5 h-5" />
          </button>
          {isDependencyMode && (
            <span className="text-[10px] text-orange-600 mt-1 text-center leading-tight">
              连线中
            </span>
          )}
        </div>
      </nav>

      {/* Expandable panel */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? 'w-56' : 'w-0'
        }`}
      >
        <div className="w-56 h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-800">组件库</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Placeholder for draggable components */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">拖拽组件到画布</p>
            <div className="grid grid-cols-2 gap-2">
              {['主题', '子主题', '备注', '链接'].map((item) => (
                <div
                  key={item}
                  className="p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-600 cursor-grab hover:bg-gray-100 transition-colors border border-gray-200"
                  draggable
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expand button when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-14 top-1/2 -translate-y-1/2 w-4 h-8 bg-white border border-gray-200 rounded-r flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </aside>
  );
}
